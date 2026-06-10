'use strict';
/**
 * ─── CUSTOMER SUPPORT AGENT ──────────────────────────────────────────────────
 * Handles: Bookings, Complaints, Refunds, Account Issues, FAQs, Escalations
 */

const mongoose = require('mongoose');
const OpenAI   = require('openai');

let openaiClient = null;
function setClient(client) { openaiClient = client; }

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a friendly and professional Customer Support Agent for "The Turf" — 
a premium sports turf booking and cricket management platform in India.

Your responsibilities:
- Help users book, modify, or cancel sports turf slots
- Handle complaints with empathy and professionalism  
- Process refund requests (acknowledge and escalate to humans for payment processing)
- Resolve account and login issues
- Provide information about bookings, pricing, and platform features
- Search knowledge base for answers to common questions

Personality: Warm, efficient, solution-focused. Always acknowledge the user's concern first.
Language: Support Hindi-English (Hinglish) naturally.
Response style: Concise, actionable, with clear next steps.

When you cannot resolve something, clearly say you're escalating to a human agent.
Always end with: "Is there anything else I can help you with?"`;

// ─── Quick-resolution templates ────────────────────────────────────────────────
const AUTO_RESPONSES = {
  GREETING:       (name) => `Namaste ${name || 'there'}! 👋 Welcome to The Turf support. How can I assist you today?`,
  FAREWELL:       () => `Thank you for reaching out to The Turf! Have a great day. 🏏`,
  PASSWORD_RESET: () => `I can help you reset your password! Please visit the login page and click **"Forgot Password"**, then enter your registered phone number or email. You'll receive an OTP to create a new password. If you still face issues, I'll escalate to our technical team.`,
  HELP:           () => `I can help you with:\n\n📅 **Booking Management** — Book, modify, or cancel slots\n💳 **Payments & Refunds** — Check payment status, raise refund requests\n🔐 **Account Issues** — Login problems, profile updates\n🏏 **Match & Scoring** — Help with live scoring features\n📋 **General Queries** — Pricing, policies, turf information\n\nWhat would you like help with?`,
};

/**
 * Main handler for Customer Support Agent
 * @param {object} payload — { message, intent, context, userId, channel }
 * @returns {Promise<object>}
 */
async function handle(payload) {
  const { message, intent, context, userId, channel } = payload;
  const userName = context?.user?.name || '';

  // ── Quick wins (no LLM needed) ───────────────────────────────────────────
  if (intent === 'GREETING') {
    return {
      success: true,
      reply: AUTO_RESPONSES.GREETING(userName),
      suggestions: ['Book a slot', 'Check my booking', 'Pricing', 'Report an issue'],
      actions: [],
    };
  }

  if (intent === 'FAREWELL') {
    return { success: true, reply: AUTO_RESPONSES.FAREWELL(), suggestions: [], actions: [] };
  }

  if (intent === 'PASSWORD_RESET') {
    return {
      success: true,
      reply: AUTO_RESPONSES.PASSWORD_RESET(),
      suggestions: ['Still having issues?', 'Contact support'],
      actions: [{ type: 'LINK', label: 'Go to Login', url: '/login' }],
    };
  }

  if (intent === 'HELP') {
    return {
      success: true,
      reply: AUTO_RESPONSES.HELP(),
      suggestions: ['Book a slot', 'Refund request', 'Account issue', 'Pricing'],
      actions: [],
    };
  }

  // ── Booking status lookup ─────────────────────────────────────────────────
  if (intent === 'BOOKING_STATUS' && userId !== 'anonymous') {
    const bookingInfo = await getRecentBooking(userId);
    if (bookingInfo) {
      return {
        success: true,
        reply: `Your most recent booking:\n\n📋 **Booking ID:** ${bookingInfo.id}\n🏟️ **Sport:** ${bookingInfo.sport}\n⏰ **Slot:** ${bookingInfo.slot}\n✅ **Status:** ${bookingInfo.status}\n\nNeed to make any changes?`,
        data: bookingInfo,
        suggestions: ['Cancel this booking', 'Modify timing', 'Another question'],
        actions: [],
      };
    }
  }

  // ── Refund requests — acknowledge + flag for human ───────────────────────
  if (intent === 'REFUND_REQUEST') {
    await createSupportTicket(userId, 'refund', message, channel);
    return {
      success: true,
      reply: `I understand you'd like a refund. I've raised a support ticket for you (Reference: TKT-${Date.now().toString(36).toUpperCase()}).\n\nOur finance team will review your request within **24–48 hours** and process the refund to your original payment method.\n\nIs there anything else I can help you with?`,
      requiresHandoff: true,
      handoffReason: 'Refund request requires human verification',
      suggestions: ['Check ticket status', 'Contact us directly'],
      actions: [{ type: 'TICKET_CREATED', label: 'View Ticket' }],
    };
  }

  // ── Complaint handling ────────────────────────────────────────────────────
  if (intent === 'COMPLAINT') {
    await createSupportTicket(userId, 'complaint', message, channel);
    return {
      success: true,
      reply: `I'm really sorry to hear about your experience — that's not the standard we hold ourselves to. 🙏\n\nI've logged your complaint and assigned it priority status (Reference: TKT-${Date.now().toString(36).toUpperCase()}). Our team will reach out to you within **2 hours** via ${channel === 'whatsapp' ? 'WhatsApp' : 'email'}.\n\nIs there anything immediate I can do to help?`,
      requiresHandoff: true,
      suggestions: ['Speak to a manager', 'Something else'],
      actions: [{ type: 'ESCALATE', label: 'Connect to Human', priority: 'high' }],
    };
  }

  // ── LLM-powered response for everything else ───────────────────────────────
  return await generateLLMResponse(message, context, intent);
}

async function generateLLMResponse(message, context, intent) {
  if (!openaiClient) {
    return {
      success: true,
      reply: "Thank you for reaching out! Our team will get back to you shortly. In the meantime, you can visit our Help Center for common answers.",
      suggestions: ['Book a slot', 'Check my booking', 'Pricing'],
      actions: [],
    };
  }

  try {
    // Build conversation history
    const history = (context?.session?.messages || []).slice(-6).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Add user context
    let contextNote = '';
    if (context?.user?.name) {
      contextNote = `\nUser: ${context.user.name}${context.user.isPremium ? ' (Premium member)' : ''}`;
      if (context.user.recentBookings?.length) {
        contextNote += `\nRecent booking: ${context.user.recentBookings[0]?.sport} — ${context.user.recentBookings[0]?.status}`;
      }
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT + contextNote },
      ...history,
      { role: 'user', content: message },
    ];

    const res = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 400,
      temperature: 0.7,
    });

    const reply = res.choices[0].message.content;

    return {
      success: true,
      reply,
      suggestions: generateSuggestions(intent),
      actions: [],
    };
  } catch (err) {
    console.error('[CustomerSupportAgent] LLM error:', err.message);
    return {
      success: true,
      reply: "I'm having trouble connecting to our AI system right now. Let me connect you with a human agent who can help immediately.",
      requiresHandoff: true,
      suggestions: [],
      actions: [{ type: 'ESCALATE', label: 'Connect to Human' }],
    };
  }
}

function generateSuggestions(intent) {
  const suggestionMap = {
    BOOK_SLOT:          ['Book cricket turf', 'Book football turf', 'Check availability'],
    CANCEL_BOOKING:     ['Refund policy', 'Reschedule instead', 'Other questions'],
    PRICING_INQUIRY:    ['Book now', 'Premium membership', 'Compare plans'],
    GENERAL_SUPPORT:    ['Book a slot', 'My bookings', 'Pricing', 'Contact us'],
  };
  return suggestionMap[intent] || ['Book a slot', 'My bookings', 'Help', 'Contact us'];
}

async function getRecentBooking(userId) {
  try {
    const Booking = mongoose.model('Booking');
    const b = await Booking.findOne({ userId }).sort({ createdAt: -1 }).lean();
    if (!b) return null;
    return {
      id: b._id?.toString().slice(-6).toUpperCase(),
      sport: b.sport || 'Cricket',
      slot: b.slot || 'N/A',
      status: b.status || 'confirmed',
      createdAt: b.createdAt,
    };
  } catch { return null; }
}

async function createSupportTicket(userId, type, message, channel) {
  try {
    const SupportTicket = mongoose.model('SupportTicket');
    await new SupportTicket({
      userId,
      type,
      message,
      channel,
      status: 'open',
      priority: type === 'complaint' ? 'high' : 'medium',
    }).save();
  } catch (err) {
    console.error('[CustomerSupportAgent] createSupportTicket error:', err.message);
  }
}

module.exports = { handle, setClient };
