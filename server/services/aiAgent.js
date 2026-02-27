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

const CRICBOT_SYSTEM_PROMPT = `You are CricBot, a friendly assistant for ${process.env.TURF_LOCATION || 'The Turf Stadium'} cricket net booking.

Your job:
- Greet the user warmly
- Collect: Full Name, Phone Number, Date (YYYY-MM-DD), Time (HH:MM, 24h)
- Validate: date must be today or future, time must be ${OPEN_HOUR}:00–${CLOSE_HOUR}:00
- Use check_availability tool to check the slot
- If available: use book_slot tool to confirm it
- If not available: apologize and suggest 2–3 alternative times from the tool response

Pricing:
- Day slots (${OPEN_HOUR}:00–${TRANS_HOUR}:00): ₹${PRICE_DAY}/hr
- Night slots (${TRANS_HOUR}:00–${CLOSE_HOUR}:00): ₹${PRICE_NIGHT}/hr
- Only 1-hour slots available

Rules:
- Short, friendly, WhatsApp-style messages
- Ask only one question at a time  
- Never assume missing info — always ask
- Use emojis sparingly ✅ 📅 ⏰ 🏏
- After booking, tell user a UPI payment link will be sent

Operating hours: ${OPEN_HOUR} AM to ${CLOSE_HOUR % 12 || 12} PM daily.
Today's date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;


// ─── Tier 1: Gemini ───────────────────────────────────────────────────────────
const tryGemini = async (userInput, systemPrompt) => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    tools,
  });

  const chat = model.startChat({ history: [] });
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
const tryOpenAI = async (userInput, systemPrompt) => {
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

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput }
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

  // Reset triggers
  if (['hi', 'hello', 'start', 'restart', 'book'].some(w => lower.includes(w)) && session.step === 'greeting') {
    session.step = 'name';
    return { type: 'CHAT_RESPONSE', reply: `🏏 Hey! Welcome to *The Turf* cricket booking!\n\nI'm CricBot — let's get you a slot 🙌\n\nFirst, what's your full name?` };
  }

  if (session.step === 'greeting') {
    session.step = 'name';
    return { type: 'CHAT_RESPONSE', reply: `🏏 Hi! I'm CricBot, your booking assistant.\n\nWhat's your full name?` };
  }

  if (session.step === 'name') {
    if (text.length < 2) return { type: 'CHAT_RESPONSE', reply: 'Please enter your full name.' };
    session.data.name = text;
    session.step = 'phone';
    return { type: 'CHAT_RESPONSE', reply: `Nice to meet you, ${text}! 👋\n\nWhat's your phone number? (10 digits)` };
  }

  if (session.step === 'phone') {
    const phone = text.replace(/\D/g, '');
    if (phone.length < 10) return { type: 'CHAT_RESPONSE', reply: '❌ Please enter a valid 10-digit phone number.' };
    session.data.phone = phone;
    session.step = 'date';
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    return { type: 'CHAT_RESPONSE', reply: `Got it! 📱\n\nWhat date would you like to book? 📅\n\n(Format: YYYY-MM-DD, e.g. ${new Date().toISOString().split('T')[0]})` };
  }

  if (session.step === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { type: 'CHAT_RESPONSE', reply: '❌ Please use the format YYYY-MM-DD (e.g. 2026-03-01)' };
    const inputDate = new Date(text);
    const todayMidnight = new Date(); todayMidnight.setHours(0, 0, 0, 0);
    if (inputDate < todayMidnight) return { type: 'CHAT_RESPONSE', reply: '❌ That date has already passed. Please choose today or a future date.' };
    session.data.date = text;
    session.step = 'time';
    return { type: 'CHAT_RESPONSE', reply: `📅 ${text} — noted!\n\nWhat time would you like? ⏰\n\n(Format: HH:MM, e.g. 18:00)\nAvailable: ${OPEN_HOUR}:00 to ${CLOSE_HOUR}:00\n💰 Day rate (before ${TRANS_HOUR}:00): ₹${PRICE_DAY}/hr | Night rate: ₹${PRICE_NIGHT}/hr` };
  }

  if (session.step === 'time') {
    if (!/^\d{2}:\d{2}$/.test(text)) return { type: 'CHAT_RESPONSE', reply: '❌ Please use HH:MM format (e.g. 14:00)' };
    const [h] = text.split(':').map(Number);
    if (h < OPEN_HOUR || h >= CLOSE_HOUR) return { type: 'CHAT_RESPONSE', reply: `❌ We're open from ${OPEN_HOUR}:00 to ${CLOSE_HOUR}:00. Please choose a time within that range.` };
    session.data.time = text;
    session.step = 'confirm';

    // Check availability
    try {
      const avail = await checkAvailability(session.data.date, text);
      if (!avail.available) {
        const alts = avail.alternativeSlots?.length > 0
          ? `\n\nAvailable nearby times: ${avail.alternativeSlots.join(', ')}`
          : '';
        session.step = 'time';
        return { type: 'CHAT_RESPONSE', reply: `😔 That slot is already booked.${alts}\n\nPlease choose another time ⏰` };
      }
    } catch (e) { /* DB not connected, skip check */ }

    const price = h < TRANS_HOUR ? PRICE_DAY : PRICE_NIGHT;
    const endH = String(h + 1).padStart(2, '0');
    return { type: 'CHAT_RESPONSE', reply: `✅ *Slot Available!*\n\n📋 Booking Summary:\n👤 Name: ${session.data.name}\n📱 Phone: ${session.data.phone}\n📅 Date: ${session.data.date}\n⏰ Time: ${text} – ${endH}:00\n💰 Amount: ₹${price}\n\nType *confirm* to book or *cancel* to pick a different time.` };
  }

  if (session.step === 'confirm') {
    if (lower.includes('confirm') || lower === 'yes' || lower === 'ok') {
      try {
        const result = await bookSlot(session.data.name, session.data.phone, session.data.date, session.data.time);
        sessions[userId] = { step: 'greeting', data: {} }; // Reset
        if (result.success) {
          return {
            type: 'BOOKING_CONFIRMED',
            reply: `🎉 *Booking Confirmed!*\n\n✅ ID: ${result.bookingId}\n👤 ${session.data.name}\n📅 ${session.data.date} at ${session.data.time}\n\nA UPI payment link will be sent shortly. Please complete payment to confirm your slot! 🏏`,
            bookingInfo: result
          };
        }
      } catch (e) {
        console.error('Booking failed:', e.message);
      }
      sessions[userId] = { step: 'greeting', data: {} };
      return { type: 'CHAT_RESPONSE', reply: `😔 We couldn't complete the booking right now. Please try again or call us directly.\n\nType "hi" to restart.` };
    }
    if (lower.includes('cancel') || lower === 'no') {
      session.step = 'time';
      return { type: 'CHAT_RESPONSE', reply: `No problem! What time would you prefer? (${OPEN_HOUR}:00–${CLOSE_HOUR}:00)` };
    }
    return { type: 'CHAT_RESPONSE', reply: 'Please type *confirm* to book or *cancel* to go back.' };
  }

  // Fallback reset
  sessions[userId] = { step: 'name', data: {} };
  return { type: 'CHAT_RESPONSE', reply: `🏏 Hi! I'm CricBot. Let's book your slot!\n\nWhat's your full name?` };
};


// ─── Main Entry Point: 3-Tier Fallback ───────────────────────────────────────
const processCricBotCommand = async (userInput, context = {}) => {
  // Build slot-aware system prompt
  let systemPrompt = CRICBOT_SYSTEM_PROMPT;
  if (context.availableSlots && context.availableSlots.length > 0) {
    const slotsStr = context.availableSlots.map(s => {
      const dateStr = s.date instanceof Date ? s.date.toISOString().split('T')[0] : String(s.date).split('T')[0];
      return `${dateStr} at ${s.startTime}`;
    }).join(', ');
    systemPrompt += `\n\nCurrently available slots: ${slotsStr}`;
  }

  // Tier 1: Try Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('🤖 Trying Gemini...');
      const result = await tryGemini(userInput, systemPrompt);
      console.log('✅ Gemini responded.');
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
      console.log('🤖 Trying OpenAI...');
      const result = await tryOpenAI(userInput, systemPrompt);
      console.log('✅ OpenAI responded.');
      return result;
    } catch (e) {
      if (e.message.includes('429') || e.message.includes('quota') || e.message.includes('insufficient')) {
        console.warn('⚠️ OpenAI quota exhausted, falling back to rule-based bot...');
      } else {
        console.error('❌ OpenAI error:', e.message.substring(0, 100));
      }
    }
  }

  // Tier 3: Rule-based fallback (always works)
  console.log('🤖 Using rule-based fallback bot.');
  return tryRuleBased(userInput, context);
};


module.exports = {
  analyzeBookingAndGenerateMessage,
  getAIInsights,
  processCricBotCommand,
  CRICBOT_SYSTEM_PROMPT,
};
