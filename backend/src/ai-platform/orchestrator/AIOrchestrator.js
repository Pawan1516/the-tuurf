'use strict';
/**
 * ─── AI ORCHESTRATOR ─────────────────────────────────────────────────────────
 * The central brain of the AI platform.
 *
 * Flow:
 *   User Request
 *     → Intent Detection
 *     → Context Loading (Memory Manager)
 *     → Agent Routing
 *     → Agent Execution
 *     → Response Enrichment
 *     → Memory Update
 *     → Response Delivery
 */

const { detectIntent, INTENTS }     = require('./IntentDetector');
const { buildContext, appendMessage, saveConversation, updateSessionContext } = require('./MemoryManager');
const { routeToAgent, executeAgent, getAgentStatuses } = require('./AgentRouter');

let openaiClient = null;

/**
 * Inject OpenAI client (called from server.js after initialization)
 */
function setOpenAIClient(client) {
  openaiClient = client;
}

/**
 * Main orchestration entry point
 * @param {object} request
 * @param {string} request.message   — user's input text
 * @param {string} request.userId    — authenticated user ID (or 'anonymous')
 * @param {string} request.channel   — 'web'|'whatsapp'|'voice'|'email'|'sms'|'telegram'
 * @param {string} request.sessionId — optional override for session key
 * @param {object} request.metadata  — extra channel-specific data
 * @returns {Promise<OrchestratorResponse>}
 */
async function orchestrate(request) {
  const startTime = Date.now();
  const {
    message,
    userId      = 'anonymous',
    channel     = 'web',
    metadata    = {},
  } = request;

  // ── 1. Detect Intent ──────────────────────────────────────────────────────
  let intentResult;
  try {
    intentResult = await detectIntent(message, {
      llmClient: openaiClient,
      threshold: 0.70,
    });
  } catch (err) {
    console.error('[Orchestrator] Intent detection failed:', err.message);
    intentResult = { intent: INTENTS.UNKNOWN, agent: 'customer_support', confidence: 0.3, method: 'error' };
  }

  // ── 2. Build Context ──────────────────────────────────────────────────────
  const context = await buildContext(userId, channel);

  // ── 3. Route to Agent ─────────────────────────────────────────────────────
  const routing = routeToAgent(intentResult, context);

  // ── 4. Save user message to session ──────────────────────────────────────
  await appendMessage(userId, channel, {
    role: 'user',
    content: message,
    intent: intentResult.intent,
    timestamp: new Date().toISOString(),
  });

  // ── 5. Execute Agent ──────────────────────────────────────────────────────
  const agentPayload = {
    message,
    intent: intentResult.intent,
    confidence: intentResult.confidence,
    context,
    userId,
    channel,
    metadata,
    routing,
  };

  let agentResponse;
  if (routing.requiresHandoff) {
    agentResponse = await buildHandoffResponse(agentPayload, routing);
  } else {
    agentResponse = await executeAgent(routing.agentType, agentPayload);
  }

  // ── 6. Save AI reply to session ───────────────────────────────────────────
  const replyText = agentResponse.reply || agentResponse.message || '';
  await appendMessage(userId, channel, {
    role: 'assistant',
    content: replyText,
    timestamp: new Date().toISOString(),
  });

  // ── 7. Update session context with latest state ───────────────────────────
  await updateSessionContext(userId, channel, {
    lastIntent: intentResult.intent,
    lastAgent: routing.agentType,
    lastInteraction: new Date().toISOString(),
  });

  // ── 8. Assemble final response ────────────────────────────────────────────
  const processingTime = Date.now() - startTime;

  const response = {
    success:        true,
    reply:          replyText,
    intent:         intentResult.intent,
    agent:          routing.agentType,
    confidence:     intentResult.confidence,
    channel,
    requiresHandoff: routing.requiresHandoff || agentResponse.requiresHandoff || false,
    handoffReason:  routing.handoffReason || agentResponse.handoffReason || null,
    suggestions:    agentResponse.suggestions || [],
    actions:        agentResponse.actions || [],
    data:           agentResponse.data || null,
    processingTime,
    metadata: {
      intentMethod: intentResult.method,
      agentType: routing.agentType,
      sessionHasHistory: context.hasHistory,
    },
  };

  return response;
}

/**
 * Build a human handoff response with a graceful message
 */
async function buildHandoffResponse(payload, routing) {
  // Still try to give a helpful preliminary response
  const { intent } = payload;

  const messages = {
    [INTENTS.REFUND_REQUEST]: "I understand you're requesting a refund. I'm connecting you with our specialized support team who can process this securely for you.",
    [INTENTS.COMPLAINT]:      "I'm sorry to hear about your experience. Let me escalate this to our customer care team right away.",
    [INTENTS.FRAUD_ALERT]:    "This looks like a security-sensitive matter. I'm immediately connecting you with our security team.",
    [INTENTS.ACCOUNT_ISSUE]:  "For account security issues, I'm connecting you with a human agent who can verify and assist you safely.",
  };

  return {
    success: true,
    reply: messages[intent] || "I'm connecting you with a human agent who can better assist you with this request.",
    requiresHandoff: true,
    handoffReason: routing.handoffReason,
    suggestions: [],
    actions: [{ type: 'HANDOFF', label: 'Connect to Human Agent', priority: 'high' }],
  };
}

/**
 * Get platform health and agent status
 */
async function getPlatformStatus() {
  return {
    status: 'operational',
    agents: getAgentStatuses(),
    timestamp: new Date().toISOString(),
    llmConnected: !!openaiClient,
  };
}

/**
 * Process a batch of messages (useful for async/queue processing)
 */
async function orchestrateBatch(requests) {
  return Promise.allSettled(requests.map(req => orchestrate(req)));
}

module.exports = {
  orchestrate,
  orchestrateBatch,
  getPlatformStatus,
  setOpenAIClient,
};
