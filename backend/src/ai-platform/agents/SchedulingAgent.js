'use strict';
/**
 * ─── SCHEDULING AGENT ────────────────────────────────────────────────────────
 * Meeting scheduling, appointment booking, calendar management, reminders
 */
let openaiClient = null;
function setClient(client) { openaiClient = client; }

async function handle(payload) {
  const { message, intent, context } = payload;
  const userName = context?.user?.name || 'there';

  if (intent === 'SCHEDULE_MEETING') {
    return await handleMeetingRequest(message, userName);
  }

  // General scheduling help
  if (openaiClient) {
    try {
      const res = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: `You are a scheduling assistant for The Turf platform. Help users schedule meetings, appointments, set reminders, and manage their calendar. Be helpful and ask for specifics (date, time, purpose) if not provided.` },
          { role: 'user', content: message },
        ],
        max_tokens: 300, temperature: 0.6,
      });
      return {
        success: true,
        reply: res.choices[0].message.content,
        suggestions: ['Schedule a meeting', 'Book a turf slot', 'Set reminder', 'View my calendar'],
      };
    } catch { /* fall through */ }
  }

  return {
    success: true,
    reply: `Hi ${userName}! I can help you with:\n\n📅 **Scheduling Options:**\n• Book a turf slot for your team\n• Schedule a review/consultation meeting\n• Set booking reminders\n• Manage recurring sessions\n\nWhat would you like to schedule?`,
    suggestions: ['Book a turf slot', 'Schedule a meeting', 'Set a reminder'],
  };
}

async function handleMeetingRequest(message, userName) {
  // Extract time hints from message
  const timeHints = extractTimeHints(message);

  return {
    success: true,
    reply: `📅 I'd be happy to help schedule that for you, ${userName}!\n\n${timeHints.found ? `I noticed you mentioned **${timeHints.raw}**. Let me check availability.\n\n` : ''}To confirm the scheduling, I need a few details:\n\n1. **Date & Time** — When works best for you?\n2. **Duration** — How long do you need?\n3. **Purpose** — What's this for? (Turf booking / Team meeting / Consultation)\n4. **Participants** — Anyone else to include?\n\nOnce confirmed, I'll send calendar invites and reminders automatically!`,
    suggestions: ['Today evening', 'This weekend', 'Next Monday', 'I\'ll specify date'],
    actions: [{ type: 'CALENDAR', label: '📅 Open Calendar', url: '/booking' }],
    data: { timeHints },
  };
}

function extractTimeHints(message) {
  const patterns = [
    /\b(today|tomorrow|this (weekend|week|saturday|sunday|monday|tuesday|wednesday|thursday|friday))\b/i,
    /\b(morning|afternoon|evening|night)\b/i,
    /\b(\d{1,2}(:\d{2})?\s*(am|pm))\b/i,
    /\b(\d{1,2}[\/-]\d{1,2}([\/-]\d{2,4})?)\b/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return { found: true, raw: match[0] };
  }

  return { found: false };
}

module.exports = { handle, setClient };
