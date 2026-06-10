'use strict';
/**
 * ─── AGENT ROUTER ────────────────────────────────────────────────────────────
 * Routes incoming requests to the correct specialized agent based on:
 * - Detected intent
 * - User role/tier
 * - Agent availability
 * - Confidence threshold for human handoff
 */

const AGENT_TYPES = {
  EXECUTIVE:        'executive',
  CUSTOMER_SUPPORT: 'customer_support',
  SALES:            'sales',
  OPERATIONS:       'operations',
  ANALYTICS:        'analytics',
  SECURITY:         'security',
  SCHEDULING:       'scheduling',
};

// Roles that can access executive / analytics agents
const PRIVILEGED_ROLES = ['admin', 'super-admin', 'owner', 'manager'];

// Minimum confidence to handle without human handoff
const HANDOFF_THRESHOLD = 0.35;

// Sensitive topics that always require human option
const SENSITIVE_INTENTS = [
  'REFUND_REQUEST',
  'COMPLAINT',
  'FRAUD_ALERT',
  'SECURITY_ISSUE',
  'ACCOUNT_ISSUE',
];

// Agent registry — will hold loaded agent instances
const agentRegistry = {};

/**
 * Register an agent instance into the router
 * @param {string} type — one of AGENT_TYPES values
 * @param {object} agent — agent instance with .handle() method
 */
function registerAgent(type, agent) {
  agentRegistry[type] = agent;
}

/**
 * Determine which agent should handle a request
 * @param {object} intentResult  — { intent, agent, confidence }
 * @param {object} context       — { user, session, channel }
 * @returns {{ agentType: string, requiresHandoff: boolean, handoffReason: string|null }}
 */
function routeToAgent(intentResult, context = {}) {
  const { intent, agent: suggestedAgent, confidence } = intentResult;
  const userRole = context.user?.role || 'player';
  const isPremium = context.user?.isPremium || false;

  // 1. Low confidence → human handoff
  if (confidence < HANDOFF_THRESHOLD) {
    return {
      agentType: suggestedAgent || AGENT_TYPES.CUSTOMER_SUPPORT,
      requiresHandoff: true,
      handoffReason: `Low confidence (${(confidence * 100).toFixed(0)}%) — routing to human agent`,
    };
  }

  // 2. Executive/Analytics agents require privileged role
  const isPrivilegedAgent = [AGENT_TYPES.EXECUTIVE, AGENT_TYPES.ANALYTICS, AGENT_TYPES.SECURITY].includes(suggestedAgent);
  if (isPrivilegedAgent && !PRIVILEGED_ROLES.includes(userRole)) {
    return {
      agentType: AGENT_TYPES.CUSTOMER_SUPPORT,
      requiresHandoff: false,
      handoffReason: null,
      downgradeReason: `${suggestedAgent} requires admin role`,
    };
  }

  // 3. Sensitive intents get human handoff flag (but AI still handles first)
  const isSensitive = SENSITIVE_INTENTS.includes(intent);

  return {
    agentType: suggestedAgent || AGENT_TYPES.CUSTOMER_SUPPORT,
    requiresHandoff: isSensitive && !isPremium && confidence < 0.6,
    handoffReason: isSensitive ? 'Sensitive topic detected — human escalation available' : null,
  };
}

/**
 * Execute routing — call the selected agent
 * @param {string} agentType
 * @param {object} payload  — { message, intent, context, userId, channel }
 * @returns {Promise<object>} — agent response
 */
async function executeAgent(agentType, payload) {
  const agent = agentRegistry[agentType] || agentRegistry[AGENT_TYPES.CUSTOMER_SUPPORT];

  if (!agent) {
    return {
      success: false,
      reply: "I'm still getting set up. Please try again shortly.",
      agentType,
      error: 'Agent not registered',
    };
  }

  try {
    const result = await agent.handle(payload);
    return { ...result, agentType };
  } catch (err) {
    console.error(`[AgentRouter] ${agentType} agent error:`, err.message);
    return {
      success: false,
      reply: "I encountered an issue while processing your request. Let me connect you with our support team.",
      agentType,
      error: err.message,
      requiresHandoff: true,
    };
  }
}

/**
 * Get status of all registered agents
 * @returns {Array<{ type: string, registered: boolean, status: string }>}
 */
function getAgentStatuses() {
  return Object.values(AGENT_TYPES).map(type => ({
    type,
    registered: !!agentRegistry[type],
    status: agentRegistry[type] ? 'active' : 'offline',
    displayName: getAgentDisplayName(type),
    icon: getAgentIcon(type),
  }));
}

function getAgentDisplayName(type) {
  const names = {
    [AGENT_TYPES.EXECUTIVE]:        'Executive Agent',
    [AGENT_TYPES.CUSTOMER_SUPPORT]: 'Customer Support Agent',
    [AGENT_TYPES.SALES]:            'Sales Agent',
    [AGENT_TYPES.OPERATIONS]:       'Operations Agent',
    [AGENT_TYPES.ANALYTICS]:        'Analytics Agent',
    [AGENT_TYPES.SECURITY]:         'Security Agent',
    [AGENT_TYPES.SCHEDULING]:       'Scheduling Agent',
  };
  return names[type] || type;
}

function getAgentIcon(type) {
  const icons = {
    [AGENT_TYPES.EXECUTIVE]:        '👔',
    [AGENT_TYPES.CUSTOMER_SUPPORT]: '🎧',
    [AGENT_TYPES.SALES]:            '💼',
    [AGENT_TYPES.OPERATIONS]:       '⚙️',
    [AGENT_TYPES.ANALYTICS]:        '📊',
    [AGENT_TYPES.SECURITY]:         '🛡️',
    [AGENT_TYPES.SCHEDULING]:       '📅',
  };
  return icons[type] || '🤖';
}

module.exports = {
  AGENT_TYPES,
  registerAgent,
  routeToAgent,
  executeAgent,
  getAgentStatuses,
};
