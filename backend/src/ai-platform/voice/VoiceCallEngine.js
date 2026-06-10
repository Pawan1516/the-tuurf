'use strict';
/**
 * ─── VOICE CALL ENGINE ───────────────────────────────────────────────────────
 * Twilio Voice webhooks + TwiML generation for AI voice calls
 * Integrates with CallFlowManager and AI Orchestrator
 */

const twilio   = require('twilio');
const mongoose = require('mongoose');
const CallFlow = require('./CallFlowManager');

let orchestrator  = null;
let twilioClient  = null;
let elevenLabsClient = null;

function init(options) {
  orchestrator     = options.orchestrator;
  twilioClient     = options.twilioClient;
  elevenLabsClient = options.elevenLabsClient || null;
}

// ─── TwiML Helpers ────────────────────────────────────────────────────────────

function buildSayGather(text, actionUrl, hints = '') {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml         = new VoiceResponse();

  const gather = twiml.gather({
    input:          'speech',
    action:         actionUrl,
    method:         'POST',
    speechTimeout:  'auto',
    speechModel:    'phone_call',
    hints,
    language:       'en-IN',
  });

  gather.say({ voice: 'Polly.Aditi', language: 'en-IN' }, text);

  // Fallback if no speech
  twiml.redirect({ method: 'POST' }, actionUrl + '?timeout=1');

  return twiml.toString();
}

function buildSayEnd(text) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml         = new VoiceResponse();
  twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, text);
  twiml.hangup();
  return twiml.toString();
}

// ─── Inbound Call Handler ─────────────────────────────────────────────────────

/**
 * Handle initial inbound call — return greeting TwiML
 * @param {object} req — Express request (Twilio webhook)
 * @param {string} baseUrl — public URL for action callbacks
 * @returns {string} TwiML
 */
async function handleInbound(req, baseUrl) {
  const callSid = req.body.CallSid;
  const from    = req.body.From || 'unknown';
  const to      = req.body.To   || 'unknown';

  // Initialize call state
  await CallFlow.initCall(callSid, { direction: 'inbound', from, to });

  // Greeting
  const greetingText = CallFlow.STAGE_SCRIPTS['greeting'];
  const actionUrl    = `${baseUrl}/api/voice/gather`;

  return buildSayGather(greetingText, actionUrl, 'booking, cancel, support, refund, payment');
}

/**
 * Handle speech input from user during call
 * @param {object} req — Express request (Twilio webhook with SpeechResult)
 * @param {string} baseUrl
 * @returns {string} TwiML
 */
async function handleGather(req, baseUrl) {
  const callSid       = req.body.CallSid;
  const speechResult  = (req.body.SpeechResult || '').trim();
  const confidence    = parseFloat(req.body.Confidence || '0.5');

  if (!speechResult) {
    // No speech — ask again
    const state = CallFlow.getCallState(callSid);
    const stage = state?.stage || 'greeting';
    return buildSayGather(
      "I'm sorry, I didn't hear you clearly. " + (CallFlow.STAGE_SCRIPTS[stage] || "Could you please repeat that?"),
      `${baseUrl}/api/voice/gather`
    );
  }

  // Process through call flow
  const result = await CallFlow.processCallTurn(callSid, speechResult, orchestrator);

  if (result.shouldEnd || result.stage === CallFlow.STAGES.ENDED) {
    await CallFlow.endCall(callSid);
    return buildSayEnd(result.reply);
  }

  const hints = getHintsForStage(result.stage);
  return buildSayGather(result.reply, `${baseUrl}/api/voice/gather`, hints);
}

/**
 * Handle call status callbacks from Twilio
 */
async function handleStatusCallback(req) {
  const { CallSid, CallStatus, CallDuration } = req.body;

  try {
    const VoiceCall = mongoose.model('VoiceCall');
    await VoiceCall.findOneAndUpdate(
      { callSid: CallSid },
      { $set: { status: CallStatus, duration: parseInt(CallDuration || 0) } }
    );

    if (['completed', 'failed', 'busy', 'no-answer'].includes(CallStatus)) {
      await CallFlow.endCall(CallSid);
    }
  } catch (err) {
    console.error('[VoiceCallEngine] status callback error:', err.message);
  }
}

/**
 * Initiate an outbound call
 * @param {object} options
 * @param {string} options.to         — destination phone number
 * @param {string} options.from       — Twilio phone number
 * @param {string} options.baseUrl    — public webhook URL
 * @param {string} options.purpose    — 'appointment_reminder'|'survey'|'lead_qualification' etc
 */
async function initiateOutbound(options) {
  if (!twilioClient) throw new Error('Twilio client not initialized');

  const { to, from, baseUrl, purpose = 'general', userId } = options;

  const call = await twilioClient.calls.create({
    to,
    from,
    url:            `${baseUrl}/api/voice/outbound-start?purpose=${encodeURIComponent(purpose)}&userId=${userId || ''}`,
    statusCallback: `${baseUrl}/api/voice/status`,
    statusCallbackMethod: 'POST',
    record:         true,
    recordingStatusCallback: `${baseUrl}/api/voice/recording`,
  });

  // Persist outbound call
  try {
    const VoiceCall = mongoose.model('VoiceCall');
    await new VoiceCall({
      callSid:   call.sid,
      direction: 'outbound',
      fromNumber: from,
      toNumber:   to,
      status:    'initiated',
      metadata:  { purpose },
      startedAt: new Date(),
    }).save();
  } catch { /* non-critical */ }

  return { callSid: call.sid, status: call.status };
}

function getHintsForStage(stage) {
  const hints = {
    greeting:     'hello, hi, help, support, booking',
    verification: 'my number is, booking ID, my name is',
    intent:       'cancel, book, refund, complaint, payment, appointment',
    resolution:   'yes, no, confirm, cancel, more information',
    action:       'yes confirm, no cancel, go ahead',
    summary:      'yes, no, nothing else, thank you, goodbye',
  };
  return hints[stage] || '';
}

module.exports = { init, handleInbound, handleGather, handleStatusCallback, initiateOutbound };
