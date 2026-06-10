'use strict';
/**
 * ─── CALL FLOW MANAGER ───────────────────────────────────────────────────────
 * Manages the 6-stage AI voice call flow:
 * Greeting → Verification → Intent → Resolution → Action → Summary
 */

const mongoose = require('mongoose');

const STAGES = {
  GREETING:     'greeting',
  VERIFICATION: 'verification',
  INTENT:       'intent',
  RESOLUTION:   'resolution',
  ACTION:       'action',
  SUMMARY:      'summary',
  ENDED:        'ended',
};

// Stage scripts / prompts
const STAGE_SCRIPTS = {
  [STAGES.GREETING]:     "Hello! Thank you for calling The Turf. I'm your AI assistant. How may I help you today?",
  [STAGES.VERIFICATION]: "To assist you better, could I please have your registered mobile number or booking ID?",
  [STAGES.INTENT]:       "I understand. Could you tell me more about what you need help with?",
  [STAGES.RESOLUTION]:   "Let me help you with that right away.",
  [STAGES.ACTION]:       "I'll take care of that for you.",
  [STAGES.SUMMARY]:      "I've completed your request. Is there anything else I can help you with?",
};

// Per-call state storage (in-memory, backed by VoiceCall model)
const callStates = new Map();

/**
 * Initialize a new call state
 * @param {string} callSid
 * @param {object} meta — { from, to, direction }
 */
async function initCall(callSid, meta) {
  const state = {
    callSid,
    stage: STAGES.GREETING,
    transcript: [],
    detectedIntent: null,
    verifiedPhone: null,
    verifiedUser: null,
    actionsTaken: [],
    followUpTasks: [],
    startedAt: Date.now(),
    meta,
  };

  callStates.set(callSid, state);

  // Persist initial call record
  try {
    const VoiceCall = mongoose.model('VoiceCall');
    await VoiceCall.findOneAndUpdate(
      { callSid },
      { $setOnInsert: { callSid, direction: meta.direction, fromNumber: meta.from, toNumber: meta.to, startedAt: new Date(), status: 'in-progress' } },
      { upsert: true }
    );
  } catch (err) {
    console.error('[CallFlowManager] initCall persist error:', err.message);
  }

  return state;
}

/**
 * Get current call state
 */
function getCallState(callSid) {
  return callStates.get(callSid);
}

/**
 * Advance to next stage and get the AI response for that stage
 * @param {string} callSid
 * @param {string} userInput  — transcribed user speech
 * @param {object} orchestrator — AI Orchestrator instance
 * @returns {Promise<{ reply: string, stage: string, actions: Array, shouldEnd: boolean }>}
 */
async function processCallTurn(callSid, userInput, orchestrator) {
  let state = callStates.get(callSid);
  if (!state) {
    state = await initCall(callSid, { direction: 'inbound', from: 'unknown', to: 'unknown' });
  }

  // Append user turn to transcript
  state.transcript.push({ speaker: 'human', text: userInput, timestamp: Date.now() - state.startedAt });

  let reply = '';
  let nextStage = state.stage;
  let shouldEnd = false;
  let actions = [];

  switch (state.stage) {
    case STAGES.GREETING:
      // First user input after greeting — move to verification
      nextStage = STAGES.VERIFICATION;
      reply = STAGE_SCRIPTS[STAGES.VERIFICATION];
      break;

    case STAGES.VERIFICATION: {
      // Try to extract phone/booking ID from input
      const extracted = extractVerificationData(userInput);
      if (extracted.phone || extracted.bookingId) {
        state.verifiedPhone = extracted.phone;
        const user = await lookupUser(extracted);
        state.verifiedUser = user;
        state.verifiedPhone = extracted.phone;
        nextStage = STAGES.INTENT;
        reply = user
          ? `Thank you, ${user.name}! I've verified your account. ${STAGE_SCRIPTS[STAGES.INTENT]}`
          : `I've noted your details. ${STAGE_SCRIPTS[STAGES.INTENT]}`;
      } else {
        // Ask again
        reply = "I didn't quite catch that. Could you please provide your registered mobile number?";
      }
      break;
    }

    case STAGES.INTENT: {
      // Detect intent from user's problem statement
      const intentResult = await orchestrator.orchestrate({
        message: userInput,
        userId: state.verifiedUser?._id?.toString() || 'anonymous',
        channel: 'voice',
      });

      state.detectedIntent = intentResult.intent;
      nextStage = STAGES.RESOLUTION;

      reply = intentResult.reply || STAGE_SCRIPTS[STAGES.RESOLUTION];

      // Check if resolution was complete or needs action
      if (intentResult.actions && intentResult.actions.length > 0) {
        nextStage = STAGES.ACTION;
        actions   = intentResult.actions;
      }
      break;
    }

    case STAGES.RESOLUTION: {
      // Follow-up questions or additional details
      const res = await orchestrator.orchestrate({
        message: userInput,
        userId: state.verifiedUser?._id?.toString() || 'anonymous',
        channel: 'voice',
      });

      reply = res.reply;

      // After resolution, ask if anything else needed
      const closingPhrases = /\b(no|that.?s all|nothing else|that.?s it|thank you|thanks|bye)\b/i;
      if (closingPhrases.test(userInput)) {
        nextStage = STAGES.SUMMARY;
        reply = buildSummary(state);
      }
      break;
    }

    case STAGES.ACTION: {
      // Confirm and execute actions
      const confirmed = /\b(yes|confirm|ok|okay|sure|proceed|go ahead)\b/i.test(userInput);
      if (confirmed && actions.length > 0) {
        const actionResults = await executeVoiceActions(actions, state);
        state.actionsTaken.push(...actionResults);
        nextStage = STAGES.SUMMARY;
        reply = `${actionResults.map(r => r.message).join(' ')} ${buildSummary(state)}`;
      } else {
        nextStage = STAGES.SUMMARY;
        reply = "No action taken. " + buildSummary(state);
      }
      break;
    }

    case STAGES.SUMMARY: {
      // Check if user wants to end
      const endPhrases = /\b(no|nothing|bye|goodbye|that.?s all|thank you|thanks)\b/i;
      if (endPhrases.test(userInput)) {
        nextStage  = STAGES.ENDED;
        shouldEnd  = true;
        reply = "Thank you for calling The Turf! Have a great day. Goodbye!";
      } else {
        // User has another question — restart from intent
        nextStage = STAGES.INTENT;
        reply = "Of course! " + STAGE_SCRIPTS[STAGES.INTENT];
      }
      break;
    }

    default:
      shouldEnd = true;
      reply = "Thank you for calling. Goodbye!";
  }

  // Update state
  state.stage = nextStage;
  state.transcript.push({ speaker: 'ai', text: reply, timestamp: Date.now() - state.startedAt });

  // Persist to DB
  await persistTranscript(callSid, state);

  return { reply, stage: nextStage, actions, shouldEnd };
}

function buildSummary(state) {
  const duration = Math.round((Date.now() - state.startedAt) / 1000);
  const acted    = state.actionsTaken.length > 0 ? `Actions completed: ${state.actionsTaken.map(a => a.type).join(', ')}.` : 'No actions were needed.';
  return `Is there anything else I can help you with today? ${acted} Call duration: ${duration} seconds.`;
}

function extractVerificationData(text) {
  const phoneMatch   = text.match(/(?:\+91|0)?[6-9]\d{9}/);
  const bookingMatch = text.match(/\b(TRF|BK)\w{4,8}\b/i);
  return {
    phone:     phoneMatch?.[0]?.replace(/[^\d+]/g, '') || null,
    bookingId: bookingMatch?.[0] || null,
  };
}

async function lookupUser(extracted) {
  try {
    const User = mongoose.model('User');
    const query = extracted.phone
      ? { phone: { $regex: extracted.phone.replace(/[^\d]/g, '').slice(-10) } }
      : null;
    if (!query) return null;
    return await User.findOne(query).select('firstName lastName phone email').lean();
  } catch { return null; }
}

async function executeVoiceActions(actions, state) {
  const results = [];
  for (const action of actions) {
    try {
      if (action.type === 'LINK') {
        results.push({ type: action.type, message: `I've sent a link to your phone.` });
      } else if (action.type === 'TICKET_CREATED') {
        results.push({ type: 'ticket', message: 'A support ticket has been created for you.' });
      } else {
        results.push({ type: action.type, message: `Action ${action.type} completed.` });
      }
    } catch { /* non-critical */ }
  }
  return results;
}

async function persistTranscript(callSid, state) {
  try {
    const VoiceCall = mongoose.model('VoiceCall');
    await VoiceCall.findOneAndUpdate(
      { callSid },
      {
        $set: {
          transcript:     state.transcript,
          currentStage:   state.stage,
          detectedIntent: state.detectedIntent,
          verifiedUser:   state.verifiedUser ? true : false,
          actionsTaken:   state.actionsTaken,
        },
      }
    );
  } catch { /* non-critical */ }
}

async function endCall(callSid) {
  const state = callStates.get(callSid);
  if (!state) return null;

  // Build call summary
  const duration = Math.round((Date.now() - state.startedAt) / 1000);
  const summary  = `Call with ${state.verifiedUser?.firstName || 'unknown user'} lasted ${duration}s. Intent: ${state.detectedIntent || 'undetected'}. Actions: ${state.actionsTaken.length}.`;

  try {
    const VoiceCall = mongoose.model('VoiceCall');
    await VoiceCall.findOneAndUpdate(
      { callSid },
      { $set: { status: 'completed', duration, aiSummary: summary, endedAt: new Date() } }
    );
  } catch { /* non-critical */ }

  callStates.delete(callSid);
  return { callSid, duration, summary };
}

module.exports = {
  STAGES,
  STAGE_SCRIPTS,
  initCall,
  getCallState,
  processCallTurn,
  endCall,
};
