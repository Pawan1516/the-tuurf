'use strict';
/**
 * ─── SALES AGENT ─────────────────────────────────────────────────────────────
 * Lead qualification, product discovery, upsell, cross-sell, follow-up
 */

const mongoose = require('mongoose');

let openaiClient = null;
function setClient(client) { openaiClient = client; }

const SYSTEM_PROMPT = `You are an expert Sales Agent for "The Turf" — a premium sports booking platform.
Your goal is to understand what the user needs, match them to the right product/service, and drive conversions.

Products/Services:
1. **Turf Slot Booking** — Cricket, Football, Badminton, Tennis (₹500–₹900/session)
2. **Premium Membership** — ₹999/month, 20% off all bookings + priority access + stats
3. **Tournament Packages** — Group bookings for 8–20 teams (₹5,000–₹50,000)
4. **Corporate Packages** — Team outing packages (₹15,000–₹1,00,000)
5. **Training Sessions** — Coaching with certified trainers (₹300/session)

Approach:
- Ask discovery questions to understand the user's needs
- Match them to the most relevant product
- Highlight value, not just features
- Create urgency with limited availability or offers
- Always end with a clear call-to-action

Tone: Professional, enthusiastic, consultative. Never pushy.`;

async function handle(payload) {
  const { message, intent, context, userId } = payload;
  const userName = context?.user?.name || '';
  const isPremium = context?.user?.isPremium || false;

  if (intent === 'PRICING_INQUIRY') {
    return buildPricingResponse(isPremium);
  }

  if (intent === 'UPGRADE_PLAN' && !isPremium) {
    return buildUpsellResponse(userName);
  }

  if (intent === 'UPGRADE_PLAN' && isPremium) {
    return {
      success: true,
      reply: `🌟 You're already a Premium member, ${userName}! You're enjoying all the exclusive benefits. \n\nWant to explore our **Tournament** or **Corporate packages** for groups? I can put together a custom quote!`,
      suggestions: ['Tournament package', 'Corporate outing', 'Invite friends'],
      actions: [],
    };
  }

  if (intent === 'LEAD_QUALIFICATION') {
    await logLead(userId, message);
  }

  return await generateSalesResponse(message, context, intent);
}

function buildPricingResponse(isPremium) {
  return {
    success: true,
    reply: `## 💰 The Turf — Pricing Guide\n\n` +
      `**🏏 Slot Bookings:**\n` +
      `• Cricket Turf — ₹650/hour\n` +
      `• Football Turf — ₹700/hour\n` +
      `• Badminton Court — ₹250/hour\n` +
      `• Tennis Court — ₹350/hour\n\n` +
      `**⭐ Premium Membership — ₹999/month**\n` +
      `• 20% off all bookings\n` +
      `• Priority slot access\n` +
      `• Advanced player statistics\n` +
      `• Exclusive tournament invites\n\n` +
      `**🏆 Group & Corporate:**\n` +
      `• Tournament packages from ₹5,000\n` +
      `• Corporate team outings from ₹15,000\n\n` +
      `${!isPremium ? '💡 *Pro tip: Premium membership pays for itself after just 2 bookings!*' : '✅ You\'re a Premium member — enjoy 20% off!'}`,
    suggestions: ['Book a slot now', 'Get Premium', 'Tournament package', 'Compare plans'],
    actions: [
      { type: 'LINK', label: '🎯 Book Now', url: '/booking' },
      { type: 'LINK', label: '⭐ Get Premium', url: '/premium' },
    ],
  };
}

function buildUpsellResponse(name) {
  return {
    success: true,
    reply: `Hey ${name || 'there'}! 🌟 Have you considered our **Premium Membership**?\n\n` +
      `For just **₹999/month**, you get:\n` +
      `✅ **20% off** every booking (saves ₹130+ per session)\n` +
      `✅ **Priority access** — book popular slots before others\n` +
      `✅ **Advanced cricket stats** — track your performance\n` +
      `✅ **Exclusive tournament invites** — play with the best\n\n` +
      `💰 *If you book 2 sessions a month, Premium pays for itself!*\n\n` +
      `Want to upgrade now?`,
    suggestions: ['Yes, upgrade me!', 'Tell me more', 'Not now'],
    actions: [
      { type: 'LINK', label: '⭐ Upgrade to Premium', url: '/premium', primary: true },
    ],
  };
}

async function generateSalesResponse(message, context, intent) {
  if (!openaiClient) {
    return buildPricingResponse(context?.user?.isPremium);
  }

  try {
    const userCtx = context?.user ? `User: ${context.user.name}, Premium: ${context.user.isPremium}, Total bookings: ${context.user.totalBookings}` : '';
    const history = (context?.session?.messages || []).slice(-4).map(m => ({ role: m.role, content: m.content }));

    const res = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT + (userCtx ? `\n\nContext: ${userCtx}` : '') },
        ...history,
        { role: 'user', content: message },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    return {
      success: true,
      reply: res.choices[0].message.content,
      suggestions: ['Book a slot', 'Premium membership', 'Tournament package', 'More info'],
      actions: [{ type: 'LINK', label: '🎯 Book Now', url: '/booking' }],
    };
  } catch (err) {
    console.error('[SalesAgent] LLM error:', err.message);
    return buildPricingResponse(false);
  }
}

async function logLead(userId, message) {
  try {
    const AIConversation = mongoose.model('AIConversation');
    // Tag the conversation as a qualified lead
    await AIConversation.findOneAndUpdate(
      { userId, channel: 'web' },
      { $set: { isLead: true, leadNotes: message, leadAt: new Date() } },
      { upsert: true }
    ).catch(() => {});
  } catch { /* non-critical */ }
}

module.exports = { handle, setClient };
