'use strict';
/**
 * ─── MEMORY MANAGER ──────────────────────────────────────────────────────────
 * Manages 4 tiers of memory for the AI platform:
 *  1. Session Memory    — current conversation (Redis, TTL 24h)
 *  2. Long-Term Memory  — user preferences & facts (MongoDB)
 *  3. Business Memory   — customer history (MongoDB)
 *  4. Interaction Memory— all chats, calls, tickets (MongoDB)
 */

const mongoose = require('mongoose');

// Session Memory prefix in Redis
const SESSION_PREFIX   = 'ai:session:';
const SESSION_TTL_SEC  = 86400; // 24 hours
const MAX_SESSION_MSGS = 50;    // max messages per session window

let redisClient = null;

/**
 * Inject Redis client (called from server.js)
 * @param {object} client — ioredis instance
 */
function setRedisClient(client) {
  redisClient = client;
}

// ─── SESSION MEMORY ──────────────────────────────────────────────────────────

/**
 * Get session context for a user+channel combination
 * @param {string} userId
 * @param {string} channel — 'web'|'whatsapp'|'voice'|'email'|'sms'|'telegram'
 * @returns {Promise<{ messages: Array, context: object, sessionId: string }>}
 */
async function getSession(userId, channel = 'web') {
  const key = `${SESSION_PREFIX}${userId}:${channel}`;

  if (!redisClient) {
    return { messages: [], context: {}, sessionId: key };
  }

  try {
    const raw = await redisClient.get(key);
    if (!raw) return { messages: [], context: {}, sessionId: key };

    const session = JSON.parse(raw);
    return session;
  } catch (err) {
    console.error('[MemoryManager] getSession error:', err.message);
    return { messages: [], context: {}, sessionId: key };
  }
}

/**
 * Append a message to session memory
 * @param {string} userId
 * @param {string} channel
 * @param {{ role: string, content: string, timestamp: Date, intent?: string }} message
 */
async function appendMessage(userId, channel, message) {
  if (!redisClient) return;

  const key = `${SESSION_PREFIX}${userId}:${channel}`;

  try {
    const session = await getSession(userId, channel);

    session.messages = session.messages || [];
    session.messages.push({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp || new Date().toISOString(),
      intent: message.intent || null,
      sentiment: message.sentiment || null,
    });

    // Rolling window — keep last N messages
    if (session.messages.length > MAX_SESSION_MSGS) {
      session.messages = session.messages.slice(-MAX_SESSION_MSGS);
    }

    session.lastActive = new Date().toISOString();
    session.sessionId  = key;

    await redisClient.setex(key, SESSION_TTL_SEC, JSON.stringify(session));
  } catch (err) {
    console.error('[MemoryManager] appendMessage error:', err.message);
  }
}

/**
 * Update session context (arbitrary key-value store per session)
 * @param {string} userId
 * @param {string} channel
 * @param {object} contextUpdate — partial context to merge
 */
async function updateSessionContext(userId, channel, contextUpdate) {
  if (!redisClient) return;

  const key = `${SESSION_PREFIX}${userId}:${channel}`;

  try {
    const session = await getSession(userId, channel);
    session.context = { ...(session.context || {}), ...contextUpdate };
    session.lastActive = new Date().toISOString();

    await redisClient.setex(key, SESSION_TTL_SEC, JSON.stringify(session));
  } catch (err) {
    console.error('[MemoryManager] updateSessionContext error:', err.message);
  }
}

/**
 * Clear a session (e.g., after conversation end)
 * @param {string} userId
 * @param {string} channel
 */
async function clearSession(userId, channel) {
  if (!redisClient) return;

  const key = `${SESSION_PREFIX}${userId}:${channel}`;
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error('[MemoryManager] clearSession error:', err.message);
  }
}

// ─── LONG-TERM MEMORY (MongoDB) ───────────────────────────────────────────────

let AIConversation = null;

function getConversationModel() {
  if (!AIConversation) {
    try {
      AIConversation = mongoose.model('AIConversation');
    } catch {
      // Model not registered yet — return null safely
    }
  }
  return AIConversation;
}

/**
 * Save a completed conversation to MongoDB
 * @param {object} conversationData
 */
async function saveConversation(conversationData) {
  const Model = getConversationModel();
  if (!Model) return null;

  try {
    const conv = new Model({
      userId: conversationData.userId,
      channel: conversationData.channel,
      agentType: conversationData.agentType,
      messages: conversationData.messages || [],
      intent: conversationData.intent,
      resolution: conversationData.resolution,
      sentiment: conversationData.sentiment,
      handedOffToHuman: conversationData.handedOffToHuman || false,
      duration: conversationData.duration,
      metadata: conversationData.metadata || {},
    });

    await conv.save();
    return conv;
  } catch (err) {
    console.error('[MemoryManager] saveConversation error:', err.message);
    return null;
  }
}

/**
 * Retrieve recent conversation history for a user
 * @param {string} userId
 * @param {object} options
 * @returns {Promise<Array>}
 */
async function getUserConversationHistory(userId, options = {}) {
  const Model = getConversationModel();
  if (!Model) return [];

  const { limit = 10, channel = null, agentType = null } = options;

  try {
    const query = { userId };
    if (channel) query.channel = channel;
    if (agentType) query.agentType = agentType;

    return await Model.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  } catch (err) {
    console.error('[MemoryManager] getUserConversationHistory error:', err.message);
    return [];
  }
}

// ─── BUSINESS MEMORY (customer facts, preferences) ────────────────────────────

const businessMemoryCache = new Map(); // In-process LRU for hot data

/**
 * Load user business context (bookings, preferences, lifetime value)
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getBusinessMemory(userId) {
  if (businessMemoryCache.has(userId)) {
    return businessMemoryCache.get(userId);
  }

  try {
    const User    = mongoose.model('User');
    const Booking = mongoose.model('Booking');

    const [user, recentBookings] = await Promise.all([
      User.findById(userId).select('firstName lastName email phone subscription createdAt').lean(),
      Booking.find({ userId }).sort({ createdAt: -1 }).limit(5).lean().catch(() => []),
    ]);

    const memory = {
      userId,
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Guest',
      email: user?.email,
      phone: user?.phone,
      isPremium: user?.subscription?.isPremium || false,
      memberSince: user?.createdAt,
      totalBookings: recentBookings.length,
      recentBookings: recentBookings.map(b => ({
        id: b._id,
        slot: b.slot,
        sport: b.sport,
        status: b.status,
        createdAt: b.createdAt,
      })),
      preferences: {
        preferredSport: recentBookings[0]?.sport || null,
        preferredTime: null,
      },
      loadedAt: Date.now(),
    };

    // Cache for 5 minutes
    businessMemoryCache.set(userId, memory);
    setTimeout(() => businessMemoryCache.delete(userId), 5 * 60 * 1000);

    return memory;
  } catch (err) {
    console.error('[MemoryManager] getBusinessMemory error:', err.message);
    return { userId, name: 'Guest', isPremium: false, totalBookings: 0, recentBookings: [] };
  }
}

// ─── COMBINED CONTEXT BUILDER ─────────────────────────────────────────────────

/**
 * Build full context for the AI Orchestrator
 * @param {string} userId
 * @param {string} channel
 * @returns {Promise<object>}
 */
async function buildContext(userId, channel) {
  const [session, businessMemory] = await Promise.all([
    getSession(userId, channel),
    userId ? getBusinessMemory(userId) : Promise.resolve({}),
  ]);

  return {
    session,
    user: businessMemory,
    channel,
    timestamp: new Date().toISOString(),
    hasHistory: (session.messages || []).length > 0,
  };
}

module.exports = {
  setRedisClient,

  // Session
  getSession,
  appendMessage,
  updateSessionContext,
  clearSession,

  // Long-term
  saveConversation,
  getUserConversationHistory,

  // Business
  getBusinessMemory,

  // Combined
  buildContext,
};
