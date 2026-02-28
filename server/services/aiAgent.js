const dotenv = require('dotenv');
dotenv.config();

const { genAI } = require('./aiService');
const { analyzeBookingAndGenerateMessage, getAIInsights } = require('./aiService');
const { checkAvailability, bookSlot } = require('./bookingTools');

// ─── Config ───────────────────────────────────────────────────────────────────
const OPEN_HOUR = parseInt(process.env.TURF_OPEN_HOUR) || 7;
const CLOSE_HOUR = parseInt(process.env.TURF_CLOSE_HOUR) || 23;
const PRICE_DAY = parseInt(process.env.PRICE_DAY) || 500;
const PRICE_NIGHT = parseInt(process.env.PRICE_NIGHT) || 700;
const TRANS_HOUR = parseInt(process.env.PRICE_TRANSITION_HOUR) || 18;

// ─── Tool definitions for Gemini Function Calling ─────────────────────────────
const tools = [
  {
    functionDeclarations: [
      {
        name: 'check_availability',
        description: `Check if a cricket net slot is available for a specific date and time (${OPEN_HOUR} AM–${CLOSE_HOUR % 12 || 12} PM).`,
        parameters: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING', description: 'Date in YYYY-MM-DD format' },
            time: { type: 'STRING', description: 'Time in HH:MM 24-hour format' },
          },
          required: ['date', 'time'],
        },
      },
      {
        name: 'book_slot',
        description: 'Book a confirmed cricket net slot. Requires name, phone, date, and time.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING', description: "Customer's full name" },
            phone: { type: 'STRING', description: "Customer's phone number" },
            date: { type: 'STRING', description: 'Booking date in YYYY-MM-DD format' },
            time: { type: 'STRING', description: 'Start time in HH:MM 24-hour format' },
          },
          required: ['name', 'phone', 'date', 'time'],
        },
      },
    ],
  },
];

const CRICBOT_SYSTEM_PROMPT = `You are CricBot, the highly intelligent and welcoming multi-lingual assistant for ${process.env.TURF_LOCATION || 'The Turf Stadium'}.

CRITICAL PRIORITY:
1. If the user asks ANY question (e.g., location, parking, shoes, rain, pricing), you MUST answer it accurately and helpfully as your very first action.
2. Only after answering the question should you ask for the next piece of booking information (if a booking is in progress).

LANGUAGE SUPPORT:
- You support English, Telugu (తెలుగు), and Hindi (हिन्दी).
- DETECT the user's language automatically and respond in the SAME language.
- Always be polite and professional regardless of the language.

TURF KNOWLEDGE BASE:
- Location: ${process.env.TURF_LOCATION || 'Plot no 491, Madhavapuri Hills, PJR Enclave, PJR Layout, Miyapur, Hyderabad'}.
- Facilities: 6 Premium artificial grass nets, high-lumen floodlights for night matches, chilled drinking water, dedicated change rooms, and free secure parking.
- Footwear Policy: STRICTLY sports shoes only. NO spikes are allowed on the artificial turf to prevent damage.
- Rain Policy: We offer a 100% free reschedule or a full refund if heavy rain prevents play.
- Pricing: ₹${PRICE_DAY}/hr (Daytime) | ₹${PRICE_NIGHT}/hr (Nighttime from ${TRANS_HOUR}:00).
- Operating Hours: ${OPEN_HOUR}:00 AM to ${CLOSE_HOUR}:00 PM daily.

BOOKING PROTOCOL:
- You need: Full Name, 10-digit Phone, Date, and Time.
- Use 'check_availability' to verify a slot before promising it.
- Use 'book_slot' only when the user is ready.
- Always provide a clear summary before final booking.

TONE: Professional, enthusiastic, and concise (WhatsApp style). Use emojis 🏏🏟️✅.`;


// ─── Tier 1: Gemini ───────────────────────────────────────────────────────────
const tryGemini = async (userInput, systemPrompt, history = []) => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    tools: tools,
  });

  // Map history to Gemini format (excluding the very last user message we just pushed)
  const chatHistory = history.slice(0, -1).map(h => ({
    role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
    parts: [{ text: h.content || '' }]
  }));

  const chat = model.startChat({ history: chatHistory });
  let response = await chat.sendMessage(userInput);
  let result = response.response;

  let isBookingConfirmed = false;
  let bookingInfo = null;

  while (result.functionCalls && result.functionCalls() && result.functionCalls().length > 0) {
    const { name, args } = result.functionCalls()[0];
    console.log(`🔧 Gemini Tool Call: ${name}`, args);

    let toolResult;
    try {
      if (name === 'check_availability') toolResult = await checkAvailability(args.date, args.time);
      else if (name === 'book_slot') {
        toolResult = await bookSlot(args.name, args.phone, args.date, args.time);
        if (toolResult.success) { isBookingConfirmed = true; bookingInfo = toolResult; }
      }
    } catch (e) {
      toolResult = { success: false, message: 'Database error, please try again.' };
    }

    response = await chat.sendMessage([{ functionResponse: { name, response: toolResult } }]);
    result = response.response;
  }

  return { type: isBookingConfirmed ? 'BOOKING_CONFIRMED' : 'CHAT_RESPONSE', reply: result.text(), bookingInfo };
};


// ─── Tier 2: OpenAI ───────────────────────────────────────────────────────────
const tryOpenAI = async (userInput, systemPrompt, history = []) => {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const oaTools = [
    {
      type: 'function',
      function: {
        name: 'check_availability',
        description: `Check if a cricket net slot is available (${OPEN_HOUR} AM–${CLOSE_HOUR % 12 || 12} PM).`,
        parameters: { type: 'object', properties: { date: { type: 'string' }, time: { type: 'string' } }, required: ['date', 'time'] }
      }
    },
    {
      type: 'function',
      function: {
        name: 'book_slot',
        description: 'Book a confirmed cricket net slot.',
        parameters: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' } }, required: ['name', 'phone', 'date', 'time'] }
      }
    }
  ];

  // Reconstruct history for OpenAI
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({
      role: h.role === 'model' ? 'assistant' : h.role,
      content: h.content || ''
    }))
  ];

  let isBookingConfirmed = false;
  let bookingInfo = null;

  while (true) {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: oaTools,
      tool_choice: 'auto',
      max_tokens: 300,
    });

    const msg = completion.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { type: isBookingConfirmed ? 'BOOKING_CONFIRMED' : 'CHAT_RESPONSE', reply: msg.content, bookingInfo };
    }

    for (const tc of msg.tool_calls) {
      const { name, arguments: argsStr } = tc.function;
      const args = JSON.parse(argsStr);
      console.log(`🔧 OpenAI Tool Call: ${name}`, args);

      let toolResult;
      try {
        if (name === 'check_availability') toolResult = await checkAvailability(args.date, args.time);
        else if (name === 'book_slot') {
          toolResult = await bookSlot(args.name, args.phone, args.date, args.time);
          if (toolResult.success) { isBookingConfirmed = true; bookingInfo = toolResult; }
        }
      } catch (e) {
        toolResult = { success: false, message: 'Database error.' };
      }

      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) });
    }
  }
};


// ─── Tier 3: Rule-based fallback (always works, no AI needed) ─────────────────
const sessions = {};

const tryRuleBased = async (userInput, context) => {
  const userId = context.userPhone || context.sessionId || 'web';
  if (!sessions[userId]) sessions[userId] = { step: 'greeting', data: {} };
  const session = sessions[userId];
  const text = userInput.trim();
  const lower = text.toLowerCase();

  // ─── FAQ Handling (Ensures answers even when AI is down) ──────────
  if (lower.includes('shoes') || lower.includes('spikes') || lower.includes('footwear')) {
    return { type: 'CHAT_RESPONSE', reply: `👟 *Footwear Policy:* Only sports shoes are allowed on the turf. STRICTLY no spikes or heels, as they damage the artificial grass. Please bring proper sports footwear! 🏏` };
  }
  if (lower.includes('rain') || lower.includes('weather') || lower.includes('refund')) {
    return { type: 'CHAT_RESPONSE', reply: `🌧️ *Rain Policy:* In case of heavy rain during your slot, we offer a 100% free reschedule or a full refund. Your game is safe with us! 🏟️` };
  }
  if (lower.includes('location') || lower.includes('site') || lower.includes('where is')) {
    return { type: 'CHAT_RESPONSE', reply: `📍 *Location:* We are located at Madhavapuri Hills, PJR Enclave, Miyapur, Hyderabad. Search for "The Turf Stadium" on Google Maps! 🗺️` };
  }
  if (lower.includes('parking') || lower.includes('light') || lower.includes('facility')) {
    return { type: 'CHAT_RESPONSE', reply: `🏟️ *Facilities:* We offer 6 premium nets, high-lumen floodlights for night play, free secure parking, drinking water, and change rooms. everything you need for a great match! 💡` };
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('amount') || lower.includes('fee')) {
    return { type: 'CHAT_RESPONSE', reply: `💰 *Pricing:* \n☀️ Day slots: ₹${PRICE_DAY}/hr\n🌙 Night slots: ₹${PRICE_NIGHT}/hr (after ${TRANS_HOUR}:00). \nOnly 1-hour slots are available for booking.` };
  }

  // Reset triggers
  if (['hi', 'hello', 'start', 'restart', 'book'].some(w => lower.includes(w)) && (session.step === 'greeting' || session.step === 'name')) {
    session.step = 'name';
    return { type: 'CHAT_RESPONSE', reply: `🏏 *Welcome to The Turf Stadium Booking Assistant!*\n\nI am CricBot, your dedicated agent for securing cricket net slots. I will help you book a slot in just a few steps. 🙌\n\nTo begin, may I have your *full name*, please?` };
  }

  if (session.step === 'greeting') {
    session.step = 'name';
    return { type: 'CHAT_RESPONSE', reply: `🏏 Welcome! I am CricBot, your booking assistant for *The Turf Stadium*.\n\nCould you please provide your *full name* to start the booking process?` };
  }

  if (session.step === 'name') {
    if (text.length < 2) return { type: 'CHAT_RESPONSE', reply: 'Please provide a valid name to continue.' };
    session.data.name = text;
    session.step = 'phone';
    return { type: 'CHAT_RESPONSE', reply: `Thank you, ${text}! 👋\n\nNext, please share your *10-digit mobile number* so we can send your booking details.` };
  }

  if (session.step === 'phone') {
    const phone = text.replace(/\D/g, '');
    if (phone.length < 10) return { type: 'CHAT_RESPONSE', reply: '❌ That doesn\'t look like a valid 10-digit number. Please try again.' };
    session.data.phone = phone;
    session.step = 'date';
    return { type: 'CHAT_RESPONSE', reply: `Perfect! 📱\n\nOn which date would you like to play? 📅\n\n(Required format: *YYYY-MM-DD*, e.g., ${new Date().toISOString().split('T')[0]})` };
  }

  if (session.step === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { type: 'CHAT_RESPONSE', reply: '❌ Invalid date format. Please use *YYYY-MM-DD* (e.g., 2026-03-01).' };
    const inputDate = new Date(text);
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    if (inputDate < todayMidnight) return { type: 'CHAT_RESPONSE', reply: '❌ We cannot accept bookings for past dates. Please select today or a future date.' };
    session.data.date = text;
    session.step = 'time';
    return { type: 'CHAT_RESPONSE', reply: `📅 Date secured: *${text}*.\n\nWhat time would you like to start your session? ⏰\n\n(Format: *HH:MM*, e.g., 18:00)\n\n🕒 Hours: ${OPEN_HOUR}:00 to ${CLOSE_HOUR}:00\n💰 Rates: ₹${PRICE_DAY}/hr (Day) | ₹${PRICE_NIGHT}/hr (Night after ${TRANS_HOUR}:00)` };
  }

  if (session.step === 'time') {
    if (!/^\d{2}:\d{2}$/.test(text)) return { type: 'CHAT_RESPONSE', reply: '❌ Please enter the time in *HH:MM* format (e.g., 14:00).' };
    const [h] = text.split(':').map(Number);
    if (h < OPEN_HOUR || h >= CLOSE_HOUR) return { type: 'CHAT_RESPONSE', reply: `❌ Our slots are available from ${OPEN_HOUR}:00 to ${CLOSE_HOUR}:00 only.` };
    session.data.time = text;
    session.step = 'confirm';

    // Check availability
    try {
      const avail = await checkAvailability(session.data.date, text);
      if (!avail.available) {
        const alts = avail.alternativeSlots?.length > 0
          ? `\n\n*Suggested available slots:* ${avail.alternativeSlots.join(', ')}`
          : '';
        session.step = 'time';
        return { type: 'CHAT_RESPONSE', reply: `😔 I'm sorry, that specific slot is already reserved.${alts}\n\nWould you like to try a different time? ⏰` };
      }
    } catch (e) { /* DB fallback handled in route */ }

    const price = h < TRANS_HOUR ? PRICE_DAY : PRICE_NIGHT;
    const endH = String(h + 1).padStart(2, '0');
    return { type: 'CHAT_RESPONSE', reply: `✅ *Slot is Available!*\n\n📋 *Booking Review:*\n👤 Name: ${session.data.name}\n📱 Phone: ${session.data.phone}\n📅 Date: ${session.data.date}\n⏰ Time: ${text} – ${endH}:00\n💰 Amount: *₹${price}*\n\nPlease type *CONFIRM* to generate your payment QR code, or *CANCEL* to restart.` };
  }

  if (session.step === 'confirm') {
    if (lower.includes('confirm') || lower === 'yes' || lower === 'ok' || lower === 'book') {
      try {
        const result = await bookSlot(session.data.name, session.data.phone, session.data.date, session.data.time);
        if (result.success) {
          const price = parseInt(session.data.time.split(':')[0]) < TRANS_HOUR ? PRICE_DAY : PRICE_NIGHT;
          sessions[userId] = { step: 'greeting', data: {} };
          return {
            type: 'BOOKING_CONFIRMED',
            reply: `🎉 *Booking Request Initiated!*\n\n✅ ID: ${result.bookingId}\n📅 ${session.data.date} at ${session.data.time}\n\n*Payment Required:* Please use the QR code below to pay *₹${price}* via UPI. Once paid, please share the *UTR/Transaction ID* or a *screenshot* here for verification. 🏏`,
            bookingInfo: { ...result, amount: price }
          };
        } else {
          const errorMsg = result?.message || 'Unknown system error';
          return { type: 'CHAT_RESPONSE', reply: `😔 We encountered an issue during confirmation: *${errorMsg}*.\n\nPlease try again or contact us directly at *+${process.env.ADMIN_PHONE || '91 XXXXXXXXXX'}* for manual assistance.\n\nType "Hi" to restart.` };
        }
      } catch (e) {
        console.error('Booking failed:', e.message);
        return { type: 'CHAT_RESPONSE', reply: `😔 System error: *${e.message}*.\n\nPlease contact us at +${process.env.ADMIN_PHONE} or type "Hi" to restart.` };
      }
    }

    if (lower.includes('cancel') || lower === 'no') {
      session.step = 'greeting';
      session.data = {};
      return { type: 'CHAT_RESPONSE', reply: `No problem! I've cleared your current request. Type "Book" whenever you're ready to start over!` };
    }

    return { type: 'CHAT_RESPONSE', reply: 'Please type *CONFIRM* to proceed with the booking or *CANCEL* to stop.' };
  }

  // Fallback reset
  sessions[userId] = { step: 'name', data: {} };
  return { type: 'CHAT_RESPONSE', reply: `🏏 Hi! I'm CricBot. Let's book your slot!\n\nWhat's your full name?` };
};


// ─── Main Entry Point: 3-Tier Fallback ───────────────────────────────────────
const aiSessions = {}; // Memory for Tier 1 & 2

/**
 * Main AI Agent Entry Point
 * @param {string} userInput - Message from user
 * @param {object} context - Metadata (platform, availableSlots, etc.)
 * @param {string} userId - Unique identifier (phone or IP)
 */
const processCricBotCommand = async (userInput, context = {}, userId = 'default') => {
  // 1. Build context-aware system prompt
  let systemPrompt = CRICBOT_SYSTEM_PROMPT;
  if (context.availableSlots && context.availableSlots.length > 0) {
    const slotsStr = context.availableSlots.map(s => {
      const dateStr = s.date instanceof Date ? s.date.toISOString().split('T')[0] : String(s.date).split('T')[0];
      return `${dateStr} at ${s.startTime}`;
    }).join(', ');
    systemPrompt += `\n\n[CONTEXT] Currently available slots (next 7 days): ${slotsStr}`;
  }

  // 2. Manage Chat History (Memory)
  if (!aiSessions[userId]) aiSessions[userId] = [];
  const history = aiSessions[userId];

  // Keep history concise (last 10 messages)
  if (history.length > 10) history.shift();
  history.push({ role: 'user', content: userInput });

  // Tier 1: Try Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log(`🤖 Agent: Trying Gemini for user ${userId}...`);
      const result = await tryGemini(userInput, systemPrompt, history);
      console.log('✅ Gemini responded.');

      // Update history with bot response
      history.push({ role: 'model', content: result.reply });
      return result;
    } catch (e) {
      if (e.message.includes('429') || e.message.includes('quota') || e.message.includes('Quota')) {
        console.warn('⚠️ Gemini quota exhausted, trying OpenAI...');
      } else {
        console.error('❌ Gemini error:', e.message.substring(0, 100));
      }
    }
  }

  // Tier 2: Try OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log(`🤖 Agent: Trying OpenAI for user ${userId}...`);
      const result = await tryOpenAI(userInput, systemPrompt, history);
      console.log('✅ OpenAI responded.');

      // Update history with bot response
      history.push({ role: 'assistant', content: result.reply });
      return result;
    } catch (e) {
      if (e.message.includes('429') || e.message.includes('quota') || e.message.includes('insufficient')) {
        console.warn('⚠️ OpenAI quota exhausted, falling back to rule-based bot...');
      } else {
        console.error('❌ OpenAI error:', e.message.substring(0, 100));
      }
    }
  }

  // Tier 3: Rule-based fallback (Always works, uses its own session tracking)
  console.log(`🤖 Agent: Using rule-based fallback for user ${userId}.`);
  return tryRuleBased(userInput, { ...context, userId });
};

module.exports = {
  analyzeBookingAndGenerateMessage,
  getAIInsights,
  processCricBotCommand,
  CRICBOT_SYSTEM_PROMPT,
};
