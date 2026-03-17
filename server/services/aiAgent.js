const dotenv = require('dotenv');
dotenv.config();

const { genAI } = require('./aiService');
const { analyzeBookingAndGenerateMessage, getAIInsights } = require('./aiService');
const { checkAvailability, bookSlot, getFreeSlots, getBookedSlots } = require('./bookingTools');

// ─── Config ───────────────────────────────────────────────────────────────────
const OPEN_HOUR = parseInt(process.env.TURF_OPEN_HOUR) || 7;
const CLOSE_HOUR = parseInt(process.env.TURF_CLOSE_HOUR) || 23;
const PRICE_DAY = parseInt(process.env.PRICE_DAY) || 1000;
const PRICE_NIGHT = parseInt(process.env.PRICE_NIGHT) || 1200;
const PRICE_WEEKEND_DAY = parseInt(process.env.PRICE_WEEKEND_DAY) || 1000;
const PRICE_WEEKEND_NIGHT = parseInt(process.env.PRICE_WEEKEND_NIGHT) || 1400;
const TRANS_HOUR = parseInt(process.env.PRICE_TRANSITION_HOUR) || 18;

// ─── Tool definitions for Gemini Function Calling ─────────────────────────────
const tools = [
  {
    functionDeclarations: [
      {
        name: 'get_booked_slots',
        description: 'Fetch a list of all confirmed booked slots for a specific date, including user name and phone. Internal use only.',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING', description: 'Date in YYYY-MM-DD format (use current date if user asks for today)' },
          },
          required: ['date'],
        },
      },
      {
        name: 'get_free_slots',
        description: 'Fetch and neatly format a list of all available free slots for a specific date. Always use this tool when the user asks what slots or timings are available.',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING', description: 'Date in YYYY-MM-DD format (use current date if user asks for today)' },
          },
          required: ['date'],
        },
      },
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
- Pricing: ₹${PRICE_DAY}/hr (Weekday Day) | ₹${PRICE_NIGHT}/hr (Weekday Night after ${TRANS_HOUR}:00) | ₹${PRICE_WEEKEND_DAY}/hr (Weekend Day) | ₹${PRICE_WEEKEND_NIGHT}/hr (Weekend Night).
- Confirmation Policy: To secure a booking, users can choose between 40% advance payment (for confirmation) or 100% full payment (for convenience). If paying advance, the remaining 60% is due at the venue.
- Operating Hours: ${OPEN_HOUR}:00 AM to ${CLOSE_HOUR}:00 PM daily.

BOOKING PROTOCOL:
- You need: Full Name, 10-digit Phone, Date, and Time.
- Use 'check_availability' to verify a slot before promising it.
- Use 'book_slot' only when the user is ready.
- Always provide a clear summary before final booking.

FORMATTING RULES FOR AVAILABLE SLOTS:
When listing available slots to the user, you MUST ALWAYS group them and use EXACTLY this format:

Available Slots for [Date]:
✅ Morning : [e.g., 9:00 AM - 10:00 AM]
✅ Afternoon : [e.g., 12:00 PM - 1:00 PM, 2:00 PM - 3:00 PM]
✅ Evening : [e.g., 6:00 PM - 7:00 PM]

Would you like to book any of these slots? (Please reply YES to proceed or enter a different time)

TONE: Professional, enthusiastic, and concise (WhatsApp style). Use emojis 🏏🏟️✅.`;


// ─── Tier 1: Gemini ───────────────────────────────────────────────────────────
const tryGemini = async (userInput, systemPrompt, history = []) => {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    tools: tools,
  });

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
      else if (name === 'get_free_slots') toolResult = { result: await getFreeSlots(args.date) };
      else if (name === 'get_booked_slots') toolResult = { result: await getBookedSlots(args.date) };
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
    { type: 'function', function: { name: 'get_free_slots', description: 'Fetch free slots.', parameters: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } } },
    { type: 'function', function: { name: 'get_booked_slots', description: 'Fetch booked slots.', parameters: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } } },
    { type: 'function', function: { name: 'check_availability', description: 'Check slot availability.', parameters: { type: 'object', properties: { date: { type: 'string' }, time: { type: 'string' } }, required: ['date', 'time'] } } },
    { type: 'function', function: { name: 'book_slot', description: 'Book a slot.', parameters: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' } }, required: ['name', 'phone', 'date', 'time'] } } }
  ];

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role === 'model' ? 'assistant' : h.role, content: h.content || '' }))
  ];

  let isBookingConfirmed = false;
  let bookingInfo = null;

  while (true) {
    const completion = await client.chat.completions.create({ model: 'gpt-4o-mini', messages, tools: oaTools });
    const msg = completion.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { type: isBookingConfirmed ? 'BOOKING_CONFIRMED' : 'CHAT_RESPONSE', reply: msg.content, bookingInfo };
    }

    for (const tc of msg.tool_calls) {
      const { name, arguments: argsStr } = tc.function;
      const args = JSON.parse(argsStr);
      let toolResult;
      try {
        if (name === 'check_availability') toolResult = await checkAvailability(args.date, args.time);
        else if (name === 'get_free_slots') toolResult = { result: await getFreeSlots(args.date) };
        else if (name === 'get_booked_slots') toolResult = { result: await getBookedSlots(args.date) };
        else if (name === 'book_slot') {
          toolResult = await bookSlot(args.name, args.phone, args.date, args.time);
          if (toolResult.success) { isBookingConfirmed = true; bookingInfo = toolResult; }
        }
      } catch (e) { toolResult = { success: false, message: 'Error.' }; }
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) });
    }
  }
};


// ─── Tier 3: Rule-based fallback ─────────────────────────────────────────────
const sessions = {};

const tryRuleBased = async (userInput, context) => {
  const userId = context.userPhone || context.sessionId || 'web';
  if (!sessions[userId]) sessions[userId] = { step: 'greeting', data: {} };
  const session = sessions[userId];
  const text = userInput.trim();
  const lower = text.toLowerCase();

  // FAQ
  if (lower.includes('shoes')) return { type: 'CHAT_RESPONSE', reply: `👟 *Footwear Policy:* Only sports shoes are allowed on the turf. NO spikes allowed. 🏏` };
  if (lower.includes('rain')) return { type: 'CHAT_RESPONSE', reply: `🌧️ *Rain Policy:* 100% free reschedule or full refund in case of heavy rain. 🏟️` };
  if (lower.includes('location')) return { type: 'CHAT_RESPONSE', reply: `📍 *Location:* Madhavapuri Hills, Miyapur, Hyderabad. 🗺️` };
  if (lower.includes('price')) return { type: 'CHAT_RESPONSE', reply: ` Weekday: ₹${PRICE_DAY}/hr Day, ₹${PRICE_NIGHT}/hr Night. Weekend: ₹${PRICE_WEEKEND_DAY}/hr Day, ₹${PRICE_WEEKEND_NIGHT}/hr Night (after ${TRANS_HOUR}:00). 40% advance required. 🏟️` };

  // Reset/Start
  if (['hi', 'hello', 'start', 'restart', 'book'].some(w => lower.includes(w)) && (session.step === 'greeting' || session.step === 'name')) {
    session.step = 'name';
    return {
      type: 'CHAT_RESPONSE',
      reply: `🏏 *Welcome to The Turf Stadium Booking Assistant!*\n\nHow can I help you? Please provide your *full name* to start.`,
      suggestedActions: [{ label: 'Start Booking 🏏', value: 'Book' }]
    };
  }

  if (session.step === 'greeting') {
    session.step = 'name';
    return { type: 'CHAT_RESPONSE', reply: `🏏 Welcome! Could you please provide your *full name*?` };
  }

  if (session.step === 'name') {
    if (text.length < 2) return { type: 'CHAT_RESPONSE', reply: 'Please provide a valid name.' };
    session.data.name = text;
    session.step = 'phone';
    return { type: 'CHAT_RESPONSE', reply: `Thank you, ${text}! 👋 Next, please share your *10-digit mobile number*.` };
  }

  if (session.step === 'phone') {
    const phone = text.replace(/\D/g, '');
    if (phone.length < 10) return { type: 'CHAT_RESPONSE', reply: '❌ Need a valid 10-digit number.' };
    session.data.phone = phone;
    session.step = 'date';
    return { type: 'CHAT_RESPONSE', reply: `Perfect! 📱 On which date? (YYYY-MM-DD, e.g., ${new Date().toISOString().split('T')[0]})` };
  }

  if (session.step === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { type: 'CHAT_RESPONSE', reply: '❌ Use YYYY-MM-DD format.' };
    session.data.date = text;
    session.step = 'time';
    return {
      type: 'CHAT_RESPONSE',
      reply: `� Date: *${text}*. What time? (HH:MM, e.g., 18:00)`,
      suggestedActions: [{ label: '10:00 AM', value: '10:00' }, { label: '6:00 PM', value: '18:00' }, { label: '9:00 PM', value: '21:00' }]
    };
  }

  if (session.step === 'time') {
    if (!/^\d{2}:\d{2}$/.test(text)) return { type: 'CHAT_RESPONSE', reply: '❌ Use HH:MM format (e.g., 14:00).' };
    const [h] = text.split(':').map(Number);
    if (h < OPEN_HOUR || h >= CLOSE_HOUR) return { type: 'CHAT_RESPONSE', reply: `❌ We are open ${OPEN_HOUR}:00 to ${CLOSE_HOUR}:00 only.` };

    session.data.time = text;
    session.step = 'confirm';

    try {
      const avail = await checkAvailability(session.data.date, text);
      if (!avail.available) {
        session.step = 'time';
        return { type: 'CHAT_RESPONSE', reply: `😔 Slot occupied. Try another time?` };
      }
    } catch (e) { }

    const bookingDate = new Date(session.data.date);
    const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6;
    const isDay = h < TRANS_HOUR;
    const totalPrice = isWeekend ? (isDay ? PRICE_WEEKEND_DAY : PRICE_WEEKEND_NIGHT) : (isDay ? PRICE_DAY : PRICE_NIGHT);
    const advance = Math.ceil(totalPrice * 0.4);

    return {
      type: 'CHAT_RESPONSE',
      reply: `✅ *Slot Available!*\n\nReview: ${session.data.name}, ${session.data.date} at ${text}. Total: ₹${totalPrice}.\n\nChoose payment:\n1️⃣ Advance (40%): ₹${advance}\n2️⃣ Full (100%): ₹${totalPrice}`,
      suggestedActions: [
        { label: `Advance ₹${advance}`, value: 'CONFIRM', color: 'bg-emerald-600' },
        { label: `Full ₹${totalPrice}`, value: 'FULL', color: 'bg-blue-600' },
        { label: 'Cancel', value: 'CANCEL', color: 'bg-gray-200 text-gray-800' }
      ]
    };
  }

  if (session.step === 'confirm') {
    const isFull = lower.includes('full');
    if (lower.includes('confirm') || lower === 'yes' || lower === 'ok' || lower === 'book' || isFull) {
      const paymentType = isFull ? 'full' : 'advance';
      const result = await bookSlot(session.data.name, session.data.phone, session.data.date, session.data.time, paymentType);
      if (result.success) {
        const [h] = session.data.time.split(':').map(Number);
        const bookingDate = new Date(session.data.date);
        const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6;
        const isDay = h < TRANS_HOUR;
        const price = isWeekend ? (isDay ? PRICE_WEEKEND_DAY : PRICE_WEEKEND_NIGHT) : (isDay ? PRICE_DAY : PRICE_NIGHT);
        const payAmt = isFull ? price : Math.ceil(price * 0.4);
        sessions[userId] = { step: 'greeting', data: {} };
        return {
          type: 'BOOKING_CONFIRMED',
          reply: `🎉 *Booking Initiated!*\nID: ${result.bookingId}\nPay *₹${payAmt}* via QR code to confirm.`,
          bookingInfo: { ...result, amount: payAmt }
        };
      }
    }
    if (lower.includes('cancel')) {
      sessions[userId] = { step: 'greeting', data: {} };
      return { type: 'CHAT_RESPONSE', reply: `Cancelled.` };
    }
  }

  sessions[userId] = { step: 'name', data: {} };
  return { type: 'CHAT_RESPONSE', reply: `🏏 Hi! What's your name?` };
};


// ─── Main Entry Point ────────────────────────────────────────────────────────
const aiSessions = {};

const processCricBotCommand = async (userInput, context = {}, userId = 'default') => {
  let systemPrompt = CRICBOT_SYSTEM_PROMPT;
  if (!aiSessions[userId]) aiSessions[userId] = [];
  const history = aiSessions[userId];
  if (history.length > 10) history.shift();
  history.push({ role: 'user', content: userInput });

  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await tryGemini(userInput, systemPrompt, history);
      history.push({ role: 'model', content: result.reply });
      return result;
    } catch (e) { }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await tryOpenAI(userInput, systemPrompt, history);
      history.push({ role: 'assistant', content: result.reply });
      return result;
    } catch (e) { }
  }

  return tryRuleBased(userInput, { ...context, userId });
};

module.exports = {
  analyzeBookingAndGenerateMessage,
  getAIInsights,
  processCricBotCommand,
  CRICBOT_SYSTEM_PROMPT,
};
