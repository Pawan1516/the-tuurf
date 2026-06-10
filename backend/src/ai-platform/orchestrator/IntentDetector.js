'use strict';
/**
 * ─── INTENT DETECTOR ─────────────────────────────────────────────────────────
 * Classifies user input into structured intents using hybrid approach:
 * 1. Fast keyword heuristics (no LLM cost for obvious intents)
 * 2. LLM-based classification for ambiguous inputs
 */

const INTENTS = {
  // Booking intents
  BOOK_SLOT:         'BOOK_SLOT',
  CANCEL_BOOKING:    'CANCEL_BOOKING',
  MODIFY_BOOKING:    'MODIFY_BOOKING',
  CHECK_AVAILABILITY:'CHECK_AVAILABILITY',
  BOOKING_STATUS:    'BOOKING_STATUS',

  // Support intents
  COMPLAINT:         'COMPLAINT',
  REFUND_REQUEST:    'REFUND_REQUEST',
  ACCOUNT_ISSUE:     'ACCOUNT_ISSUE',
  PASSWORD_RESET:    'PASSWORD_RESET',
  GENERAL_SUPPORT:   'GENERAL_SUPPORT',

  // Sales intents
  PRICING_INQUIRY:   'PRICING_INQUIRY',
  PRODUCT_DISCOVERY: 'PRODUCT_DISCOVERY',
  UPGRADE_PLAN:      'UPGRADE_PLAN',
  LEAD_QUALIFICATION:'LEAD_QUALIFICATION',

  // Business / executive intents
  REVENUE_REPORT:    'REVENUE_REPORT',
  KPI_DASHBOARD:     'KPI_DASHBOARD',
  BUSINESS_INSIGHTS: 'BUSINESS_INSIGHTS',
  GROWTH_ANALYSIS:   'GROWTH_ANALYSIS',

  // Operations
  SCHEDULE_MEETING:  'SCHEDULE_MEETING',
  TASK_MANAGEMENT:   'TASK_MANAGEMENT',
  PROCESS_STATUS:    'PROCESS_STATUS',

  // Analytics
  DATA_ANALYSIS:     'DATA_ANALYSIS',
  TREND_DETECTION:   'TREND_DETECTION',
  FORECAST:          'FORECAST',

  // Security
  FRAUD_ALERT:       'FRAUD_ALERT',
  SECURITY_ISSUE:    'SECURITY_ISSUE',
  ACCESS_CONTROL:    'ACCESS_CONTROL',

  // Voice / call
  CALL_SUPPORT:      'CALL_SUPPORT',
  VOICE_BOOKING:     'VOICE_BOOKING',

  // General
  GREETING:          'GREETING',
  FAREWELL:          'FAREWELL',
  SMALL_TALK:        'SMALL_TALK',
  HELP:              'HELP',
  UNKNOWN:           'UNKNOWN',
};

// Fast keyword patterns (ordered by priority)
const KEYWORD_RULES = [
  { intent: INTENTS.GREETING,          patterns: [/^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaste|hola)/i] },
  { intent: INTENTS.FAREWELL,          patterns: [/\b(bye|goodbye|see you|thanks|thank you|that.?s all)\b/i] },
  { intent: INTENTS.BOOK_SLOT,         patterns: [/\b(book|reserve|want a slot|need a slot|schedule a slot|book turf|book ground)\b/i] },
  { intent: INTENTS.CANCEL_BOOKING,    patterns: [/\b(cancel|cancellation|cancel my booking|cancel slot)\b/i] },
  { intent: INTENTS.MODIFY_BOOKING,    patterns: [/\b(change|modify|reschedule|update my booking)\b/i] },
  { intent: INTENTS.CHECK_AVAILABILITY,patterns: [/\b(available|availability|free slot|open slot|check slot|when is free)\b/i] },
  { intent: INTENTS.BOOKING_STATUS,    patterns: [/\b(booking status|my booking|where is my booking|booking id|order status)\b/i] },
  { intent: INTENTS.REFUND_REQUEST,    patterns: [/\b(refund|money back|return payment|get my money)\b/i] },
  { intent: INTENTS.COMPLAINT,         patterns: [/\b(complaint|complain|not happy|unhappy|bad service|issue with|problem with|frustrated)\b/i] },
  { intent: INTENTS.PASSWORD_RESET,    patterns: [/\b(forgot password|reset password|can.?t login|locked out|otp|account locked)\b/i] },
  { intent: INTENTS.ACCOUNT_ISSUE,     patterns: [/\b(account issue|my account|profile problem|login issue|can.?t access)\b/i] },
  { intent: INTENTS.PRICING_INQUIRY,   patterns: [/\b(price|cost|how much|rate|fee|charges|tariff|pricing)\b/i] },
  { intent: INTENTS.UPGRADE_PLAN,      patterns: [/\b(upgrade|premium|pro plan|subscription|get pro|elite)\b/i] },
  { intent: INTENTS.SCHEDULE_MEETING,  patterns: [/\b(schedule|meeting|appointment|book a call|set up a call|calendar)\b/i] },
  { intent: INTENTS.REVENUE_REPORT,    patterns: [/\b(revenue|earnings|income|sales report|financial report|monthly report)\b/i] },
  { intent: INTENTS.KPI_DASHBOARD,     patterns: [/\b(kpi|dashboard|metrics|performance|conversion rate|analytics)\b/i] },
  { intent: INTENTS.FRAUD_ALERT,       patterns: [/\b(fraud|suspicious|unauthorized|hack|breach|stolen|security alert)\b/i] },
  { intent: INTENTS.FORECAST,          patterns: [/\b(forecast|predict|projection|next month|next quarter|trend)\b/i] },
  { intent: INTENTS.DATA_ANALYSIS,     patterns: [/\b(analyze|analysis|data|report|statistics|stats|numbers)\b/i] },
  { intent: INTENTS.HELP,              patterns: [/^(help|support|assist|what can you do|how do i|what are)\b/i] },
];

// Agent type mapping
const INTENT_TO_AGENT = {
  [INTENTS.BOOK_SLOT]:          'customer_support',
  [INTENTS.CANCEL_BOOKING]:     'customer_support',
  [INTENTS.MODIFY_BOOKING]:     'customer_support',
  [INTENTS.CHECK_AVAILABILITY]: 'customer_support',
  [INTENTS.BOOKING_STATUS]:     'customer_support',
  [INTENTS.COMPLAINT]:          'customer_support',
  [INTENTS.REFUND_REQUEST]:     'customer_support',
  [INTENTS.ACCOUNT_ISSUE]:      'customer_support',
  [INTENTS.PASSWORD_RESET]:     'customer_support',
  [INTENTS.GENERAL_SUPPORT]:    'customer_support',
  [INTENTS.PRICING_INQUIRY]:    'sales',
  [INTENTS.PRODUCT_DISCOVERY]:  'sales',
  [INTENTS.UPGRADE_PLAN]:       'sales',
  [INTENTS.LEAD_QUALIFICATION]: 'sales',
  [INTENTS.REVENUE_REPORT]:     'executive',
  [INTENTS.KPI_DASHBOARD]:      'executive',
  [INTENTS.BUSINESS_INSIGHTS]:  'executive',
  [INTENTS.GROWTH_ANALYSIS]:    'executive',
  [INTENTS.SCHEDULE_MEETING]:   'scheduling',
  [INTENTS.TASK_MANAGEMENT]:    'operations',
  [INTENTS.PROCESS_STATUS]:     'operations',
  [INTENTS.DATA_ANALYSIS]:      'analytics',
  [INTENTS.TREND_DETECTION]:    'analytics',
  [INTENTS.FORECAST]:           'analytics',
  [INTENTS.FRAUD_ALERT]:        'security',
  [INTENTS.SECURITY_ISSUE]:     'security',
  [INTENTS.ACCESS_CONTROL]:     'security',
  [INTENTS.GREETING]:           'customer_support',
  [INTENTS.FAREWELL]:           'customer_support',
  [INTENTS.HELP]:               'customer_support',
  [INTENTS.SMALL_TALK]:         'customer_support',
  [INTENTS.UNKNOWN]:            'customer_support',
};

/**
 * Detect intent from text using keyword heuristics
 * @param {string} text
 * @returns {{ intent: string, confidence: number, method: string }}
 */
function detectByKeywords(text) {
  const lower = text.toLowerCase().trim();

  for (const rule of KEYWORD_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(lower)) {
        return { intent: rule.intent, confidence: 0.85, method: 'keyword' };
      }
    }
  }

  return { intent: INTENTS.UNKNOWN, confidence: 0.3, method: 'keyword' };
}

/**
 * Detect intent using LLM (fallback for ambiguous inputs)
 * @param {string} text
 * @param {object} llmClient  — pre-initialized LLM client
 * @returns {Promise<{ intent: string, confidence: number, method: string }>}
 */
async function detectByLLM(text, llmClient) {
  const intentList = Object.values(INTENTS).join(', ');

  const prompt = `You are an intent classifier for an AI business platform.

Classify the following user message into ONE intent from this list:
${intentList}

User message: "${text}"

Respond with JSON only:
{"intent": "INTENT_NAME", "confidence": 0.0-1.0, "reasoning": "brief reason"}`;

  try {
    let response;
    if (llmClient && llmClient.chat) {
      // OpenAI / Anthropic style
      const res = await llmClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 150,
        temperature: 0.1,
      });
      response = JSON.parse(res.choices[0].message.content);
    } else {
      return { intent: INTENTS.UNKNOWN, confidence: 0.3, method: 'llm_fallback' };
    }

    const intent = Object.values(INTENTS).includes(response.intent)
      ? response.intent
      : INTENTS.UNKNOWN;

    return {
      intent,
      confidence: Math.min(1, Math.max(0, response.confidence || 0.7)),
      method: 'llm',
      reasoning: response.reasoning,
    };
  } catch (err) {
    console.error('[IntentDetector] LLM error:', err.message);
    return { intent: INTENTS.UNKNOWN, confidence: 0.2, method: 'llm_error' };
  }
}

/**
 * Main intent detection — hybrid approach
 * @param {string} text
 * @param {object} options
 * @param {object} options.llmClient    — optional LLM client for fallback
 * @param {number} options.threshold    — min confidence to trust keywords (default 0.7)
 * @returns {Promise<{ intent: string, agent: string, confidence: number, method: string }>}
 */
async function detectIntent(text, options = {}) {
  const { llmClient = null, threshold = 0.7 } = options;

  if (!text || text.trim().length === 0) {
    return { intent: INTENTS.UNKNOWN, agent: 'customer_support', confidence: 0, method: 'empty' };
  }

  // 1. Fast keyword detection
  const keywordResult = detectByKeywords(text);

  // 2. If confident enough, return immediately
  if (keywordResult.confidence >= threshold) {
    return {
      ...keywordResult,
      agent: INTENT_TO_AGENT[keywordResult.intent] || 'customer_support',
    };
  }

  // 3. Fallback to LLM for ambiguous inputs
  if (llmClient) {
    const llmResult = await detectByLLM(text, llmClient);
    return {
      ...llmResult,
      agent: INTENT_TO_AGENT[llmResult.intent] || 'customer_support',
    };
  }

  return {
    ...keywordResult,
    agent: INTENT_TO_AGENT[keywordResult.intent] || 'customer_support',
  };
}

module.exports = {
  detectIntent,
  detectByKeywords,
  detectByLLM,
  INTENTS,
  INTENT_TO_AGENT,
};
