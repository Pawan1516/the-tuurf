const dotenv = require('dotenv');
dotenv.config();

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { checkAvailability, bookSlot, getFreeSlots, getBookedSlots, cancelBooking, rescheduleBooking, initiateHandoff, getPricingInfo, lockSlot } = require('./bookingTools');
const AIService = require('./aiService');
const Match = require('../models/Match');
const Setting = require('../models/Setting');

// Initialize Gemini AI client directly
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Helpers ───────────────────────────────────────────────────────────────────
const getLatestSettings = async () => {
  try {
    const settings = await Setting.find();
    const config = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    return {
      OPEN_HOUR: config.TURF_OPEN_HOUR ?? parseInt(process.env.TURF_OPEN_HOUR) ?? 7,
      CLOSE_HOUR: config.TURF_CLOSE_HOUR ?? parseInt(process.env.TURF_CLOSE_HOUR) ?? 23,
      PRICE_DAY: config.PRICE_DAY ?? parseInt(process.env.PRICE_DAY) ?? 1000,
      PRICE_NIGHT: config.PRICE_NIGHT ?? parseInt(process.env.PRICE_NIGHT) ?? 1200,
      PRICE_WEEKEND_DAY: config.PRICE_WEEKEND_DAY ?? parseInt(process.env.PRICE_WEEKEND_DAY) ?? 1000,
      PRICE_WEEKEND_NIGHT: config.PRICE_WEEKEND_NIGHT ?? parseInt(process.env.PRICE_WEEKEND_NIGHT) ?? 1400,
      TRANS_HOUR: config.PRICE_TRANSITION_HOUR ?? parseInt(process.env.PRICE_TRANSITION_HOUR) ?? 18,
      LOCATION: process.env.TURF_LOCATION || 'Plot no 491, Madhavapuri Hills, PJR Enclave, PJR Layout, Miyapur, Hyderabad'
    };
  } catch (e) {
    return {
      OPEN_HOUR: parseInt(process.env.TURF_OPEN_HOUR) || 7,
      CLOSE_HOUR: parseInt(process.env.TURF_CLOSE_HOUR) || 23,
      PRICE_DAY: parseInt(process.env.PRICE_DAY) || 1000,
      PRICE_NIGHT: parseInt(process.env.PRICE_NIGHT) || 1200,
      PRICE_WEEKEND_DAY: parseInt(process.env.PRICE_WEEKEND_DAY) || 1000,
      PRICE_WEEKEND_NIGHT: parseInt(process.env.PRICE_WEEKEND_NIGHT) || 1400,
      TRANS_HOUR: parseInt(process.env.PRICE_TRANSITION_HOUR) || 18,
      LOCATION: process.env.TURF_LOCATION || 'Plot no 491, Madhavapuri Hills, PJR Enclave, PJR Layout, Miyapur, Hyderabad'
    };
  }
};

const getDynamicTools = (cfg) => [
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
        description: `Check if a cricket net slot is available for a specific date and time (${cfg.OPEN_HOUR}:00 AM–${cfg.CLOSE_HOUR % 12 || 12}:00 PM).`,
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
        name: 'lock_slot',
        description: 'Temporarily lock/reserve a slot for 2 minutes to prevent others from booking it while the user is completing details. Use this when the user picks a time.',
        parameters: {
          type: 'OBJECT',
          properties: {
            date: { type: 'STRING', description: 'Date in YYYY-MM-DD' },
            time: { type: 'STRING', description: 'Time in HH:MM' },
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
            date: { type: 'STRING', description: 'Booking date in YYYY-MM-DD format (use current date if user asks for today)' },
            time: { type: 'STRING', description: 'Start time in HH:MM 24-hour format' },
          },
          required: ['name', 'phone', 'date', 'time'],
        },
      },
      {
        name: 'reschedule_booking',
        description: 'Reschedule an existing booking to a new time. Requires phone, original date/time, and new date/time.',
        parameters: {
          type: 'OBJECT',
          properties: {
            phone: { type: 'STRING', description: "Customer's registered phone number" },
            old_date: { type: 'STRING', description: 'Original date in YYYY-MM-DD' },
            old_time: { type: 'STRING', description: 'Original time in HH:MM' },
            new_date: { type: 'STRING', description: 'New date in YYYY-MM-DD' },
            new_time: { type: 'STRING', description: 'New time in HH:MM' },
          },
          required: ['phone', 'old_date', 'old_time', 'new_date', 'new_time'],
        },
      },
      {
        name: 'initiate_handoff',
        description: 'Escalate the conversation to a human support agent when the user is angry, frustrated, or has an unresolvable query.',
        parameters: {
          type: 'OBJECT',
          properties: {
            reason: { type: 'STRING', description: 'Brief reason for handoff' },
          },
          required: ['reason'],
        },
      },
      {
        name: 'cancel_booking',
        description: 'Cancel a slot booking for a user. Requires phone number, date, and time.',
        parameters: {
          type: 'OBJECT',
          properties: {
            phone: { type: 'STRING', description: "Customer's registered phone number" },
            date: { type: 'STRING', description: 'Booking date in YYYY-MM-DD format' },
            time: { type: 'STRING', description: 'Start time in HH:MM 24-hour format' },
          },
          required: ['phone', 'date', 'time'],
        },
      },
      {
        name: 'get_pricing',
        description: 'Get current pricing information for the turf booking facility.',
        parameters: {
          type: 'OBJECT',
          properties: {},
        },
      },
      {
        name: 'predict_match',
        description: 'Provide a real-time AI prediction for a live cricket match. Use this when the user asks who will win or what is the match prediction.',
        parameters: {
          type: 'OBJECT',
          properties: {
            match_id: { type: 'STRING', description: 'ID of the match to predict (if known, otherwise ignore)' },
          },
        },
      },
    ],
  },
];

const buildSystemPrompt = (cfg) => `You are a professional multi-lingual turf booking assistant for The Turf Arena. 🏏⚽🏟️

Your tasks:
- Help users check availability for slots and suggest timings.
- Book slots for users (requires Name, Phone, Date, and Time).
- Answer pricing and location questions reliably.
- Handle cancellations and rescheduling.
- Provide live match predictions using 'predict_match'.
- Detect customer frustration/anger and escalate to a human agent.

CORE RULES:
- When a user picks a specific time, immediately use 'lock_slot' to reserve it for 2 minutes while you collect their Name/Phone.
- Always check availability for slots.
- When suggesting slots, provide a range of options (Morning, Afternoon, Evening).
- Confirm details before calling 'book_slot'.
- Be short, friendly, and helpful (WhatsApp style).
- If you are unsure or don't know something or need help → call 'initiate_handoff' immediately.
- If the user is angry or uses bad language → call 'initiate_handoff' immediately.
- Today is ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

TURF INFO:
- Location: ${cfg.LOCATION}.
- Pricing: Use 'get_pricing' for current rates.
- Facilities: Premium artificial grass, high-lumen lights, drinking water, change rooms, parking.
- Rules: Sports shoes ONLY (No spikes). 100% refund for heavy rain.

REQUIRED FORMAT FOR SLOTS:
Available Slots for [Date]:
✅ Morning : [e.g., 9:00 AM - 10:00 AM]
✅ Afternoon : [e.g., 12:00 PM - 1:00 PM]
✅ Evening : [e.g., 6:00 PM - 7:00 PM]

Would you like to book any of these slots? (Please reply YES or enter a different time)

TONE: Enthusiastic, Concise, Professional. Use emojis ⚽🏏✅.`;

// ─── Tier 1: Gemini ───────────────────────────────────────────────────────────
const tryGemini = async (userInput, context, cfg, history = []) => {
  const models = [
    'gemini-3.1-flash-live-preview-preview-12-2025',
    'gemini-2.5-flash',
    'gemini-2.0-flash'
  ];
  let lastError = null;
  let model;



  let result;
  let chat;
  const chatHistory = history.slice(0, -1).map(h => ({
    role: h.role === 'assistant' || h.role === 'model' ? 'model' : 'user',
    parts: [{ text: h.content || '' }]
  }));

  for (const modelName of models) {
    try {
      model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: buildSystemPrompt(cfg),
        tools: getDynamicTools(cfg),
      });
      chat = model.startChat({ history: chatHistory });
      const response = await chat.sendMessage(userInput);
      result = response.response;
      break; // Success! 
    } catch(err) {
      console.warn(`⚠️ CricBot Fallback: ${modelName} failed, trying next...`);
      lastError = err;
      if (err.status !== 404) break; 
    }
  }

  if (!result) throw lastError || new Error("CricBot Engine Failure.");

  let isBookingConfirmed = false;
  let bookingInfo = null;

  while (result.functionCalls && result.functionCalls().length > 0) {
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
      else if (name === 'lock_slot') toolResult = await lockSlot(args.date, args.time);
      else if (name === 'cancel_booking') toolResult = await cancelBooking(args.phone, args.date, args.time);
      else if (name === 'reschedule_booking') toolResult = await rescheduleBooking(args.phone, args.old_date, args.old_time, args.new_date, args.new_time);
      else if (name === 'initiate_handoff') toolResult = await initiateHandoff(context.userPhone || context.userId || 'web', args.reason);
      else if (name === 'get_pricing') toolResult = await getPricingInfo();
      else if (name === 'predict_match') {
          // Find the most recent live match if ID is not provided
          let matchId = args.match_id;
          if (!matchId || matchId === 'undefined') {
              const liveMatch = await Match.findOne({ status: 'In Progress' }).sort({ updatedAt: -1 });
              if (liveMatch) matchId = liveMatch._id;
          }
          
          if (matchId) {
              const match = await Match.findById(matchId).populate('team_a.team_id team_b.team_id');
              if (match) {
                  const predictionContext = {
                      title: match.title,
                      teams: { 
                          a: { name: match.team_a.team_id?.name || 'Team A', score: match.team_a.score },
                          b: { name: match.team_b.team_id?.name || 'Team B', score: match.team_b.score }
                      },
                      live: match.live_data
                  };
                  toolResult = await AIService.generateMatchPrediction(predictionContext);
              } else {
                  toolResult = { message: "Match not found to predict." };
              }
          } else {
              toolResult = { message: "No live matches available for prediction right now." };
          }
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
const tryOpenAI = async (userInput, context, cfg, history = []) => {
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 });

  const oaTools = [
    { type: 'function', function: { name: 'get_free_slots', description: 'Fetch free slots.', parameters: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } } },
    { type: 'function', function: { name: 'get_booked_slots', description: 'Fetch booked slots.', parameters: { type: 'object', properties: { date: { type: 'string' } }, required: ['date'] } } },
    { type: 'function', function: { name: 'check_availability', description: 'Check slot availability.', parameters: { type: 'object', properties: { date: { type: 'string' }, time: { type: 'string' } }, required: ['date', 'time'] } } },
    { type: 'function', function: { name: 'book_slot', description: 'Book a slot.', parameters: { type: 'object', properties: { name: { type: 'string' }, phone: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' } }, required: ['name', 'phone', 'date', 'time'] } } },
    { type: 'function', function: { name: 'cancel_booking', description: 'Cancel a booking.', parameters: { type: 'object', properties: { phone: { type: 'string' }, date: { type: 'string' }, time: { type: 'string' } }, required: ['phone', 'date', 'time'] } } },
    { type: 'function', function: { name: 'reschedule_booking', description: 'Reschedule a booking.', parameters: { type: 'object', properties: { phone: { type: 'string' }, old_date: { type: 'string' }, old_time: { type: 'string' }, new_date: { type: 'string' }, new_time: { type: 'string' } }, required: ['phone', 'old_date', 'old_time', 'new_date', 'new_time'] } } },
    { type: 'function', function: { name: 'initiate_handoff', description: 'Hand off to human.', parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'] } } },
    { type: 'function', function: { name: 'get_pricing', description: 'Get pricing info.', parameters: { type: 'object', properties: {} } } },
    { type: 'function', function: { name: 'predict_match', description: 'Get AI match prediction.', parameters: { type: 'object', properties: { match_id: { type: 'string' } } } } }
  ];

  const messages = [
    { role: 'system', content: buildSystemPrompt(cfg) },
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
        else if (name === 'lock_slot') toolResult = await lockSlot(args.date, args.time);
        else if (name === 'cancel_booking') toolResult = await cancelBooking(args.phone, args.date, args.time);
        else if (name === 'reschedule_booking') toolResult = await rescheduleBooking(args.phone, args.old_date, args.old_time, args.new_date, args.new_time);
        else if (name === 'initiate_handoff') toolResult = await initiateHandoff(context.userPhone || context.userId || 'web', args.reason);
        else if (name === 'get_pricing') toolResult = await getPricingInfo();
        else if (name === 'predict_match') {
            let matchId = args.match_id;
            if (!matchId) {
                const liveMatch = await Match.findOne({ status: 'In Progress' }).sort({ updatedAt: -1 });
                if (liveMatch) matchId = liveMatch._id;
            }
            if (matchId) {
                const match = await Match.findById(matchId).populate('team_a.team_id team_b.team_id');
                if (match) {
                    const predictionContext = {
                        title: match.title,
                        teams: { 
                            a: { name: match.team_a.team_id?.name || 'Team A', score: match.team_a.score },
                            b: { name: match.team_b.team_id?.name || 'Team B', score: match.team_b.score }
                        },
                        live: match.live_data
                    };
                    toolResult = await AIService.generateMatchPrediction(predictionContext);
                } else toolResult = { error: "Match not found." };
            } else toolResult = { error: "No live matches." };
        }
      } catch (e) { toolResult = { success: false, message: 'Error.' }; }
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(toolResult) });
    }
  }
};

const sessions = {};

const tryRuleBased = async (userInput, context, cfg) => {
  const userId = context.userPhone || context.sessionId || 'web';
  if (!sessions[userId]) sessions[userId] = { step: 'greeting', data: {} };
  const session = sessions[userId];
  const text = userInput.trim();
  const lower = text.toLowerCase();

  // FAQ
  if (lower.includes('shoes')) return { type: 'CHAT_RESPONSE', reply: `👟 *Footwear Policy:* Only sports shoes are allowed on the turf. NO spikes allowed. 🏏` };
  if (lower.includes('rain')) return { type: 'CHAT_RESPONSE', reply: `🌧️ *Rain Policy:* 100% free reschedule or full refund in case of heavy rain. 🏟️` };
  if (lower.includes('location')) return { type: 'CHAT_RESPONSE', reply: `📍 *Location:* ${cfg.LOCATION}. 🗺️` };
  if (lower.includes('price')) return { type: 'CHAT_RESPONSE', reply: ` Weekday: ₹${cfg.PRICE_DAY}/hr Day, ₹${cfg.PRICE_NIGHT}/hr Night. Weekend: ₹${cfg.PRICE_WEEKEND_DAY}/hr Day, ₹${cfg.PRICE_WEEKEND_NIGHT}/hr Night. 40% advance required. 🏟️` };

  // If user explicitly types a greeting or restart keyword, restart flow
  if (['hi', 'hello', 'start', 'book', 'reset', 'restart'].includes(lower)) {
      session.step = 'name';
      session.data = {};
      return { type: 'CHAT_RESPONSE', reply: `🏏 Welcome! Could you please provide your *full name*?` };
  }

  if (session.step === 'greeting') {
      session.step = 'name';
      return { type: 'CHAT_RESPONSE', reply: `🏏 Welcome! Could you please provide your *full name*?` };
  }

  if (session.step === 'name') {
      session.data.name = text;
      session.step = 'date';
      return { type: 'CHAT_RESPONSE', reply: `Thanks, ${text}! 📅 What *date* would you like to book? (e.g., today, tomorrow, or YYYY-MM-DD)` };
  }

  if (session.step === 'date') {
      let dateStr = text;
      if (lower === 'today') {
          dateStr = new Date().toISOString().split('T')[0];
      } else if (lower === 'tomorrow') {
          let d = new Date();
          d.setDate(d.getDate() + 1);
          dateStr = d.toISOString().split('T')[0];
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
           return { type: 'CHAT_RESPONSE', reply: `Please provide a valid date like YYYY-MM-DD, 'today', or 'tomorrow'.` };
      }

      session.data.date = dateStr;
      try {
          const slotsResult = await getFreeSlots(dateStr);
          if (slotsResult.includes('No available slots')) {
              return { type: 'CHAT_RESPONSE', reply: `Sorry, there are no available slots on ${dateStr}. Please choose another date.` };
          }
          session.step = 'time';
          return { type: 'CHAT_RESPONSE', reply: `Great! Here are the available slots for ${dateStr}:\n\n${slotsResult}\n\n⏰ What *time* would you like to book? (e.g., 18:00 or 06:00 PM)` };
      } catch (e) {
          return { type: 'CHAT_RESPONSE', reply: `Error checking slots. Please try again or call us.` };
      }
  }

  if (session.step === 'time') {
      let timeStr = text;
      
      const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
      if (timeMatch) {
          let hr = parseInt(timeMatch[1]);
          let min = parseInt(timeMatch[2] || '0');
          const ampm = timeMatch[3];

          if (ampm === 'pm' && hr < 12) hr += 12;
          if (ampm === 'am' && hr === 12) hr = 0;
          
          timeStr = `${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      }

      try {
          const isAvail = await checkAvailability(session.data.date, timeStr);
          if (isAvail && isAvail.available) {
              await lockSlot(session.data.date, timeStr);
              session.data.time = timeStr;
              session.step = 'phone';
              return { type: 'CHAT_RESPONSE', reply: `Slot ${timeStr} is available! 📱 Please provide your *phone number* to confirm the booking.` };
          } else {
              return { type: 'CHAT_RESPONSE', reply: `Sorry, ${timeStr} is not available. Please choose another time.` };
          }
      } catch(e) {
          return { type: 'CHAT_RESPONSE', reply: `Error checking availability. Please try a different time.` };
      }
  }

  if (session.step === 'phone') {
      session.data.phone = text;
      try {
          const result = await bookSlot(session.data.name, session.data.phone, session.data.date, session.data.time);
          if (result.success) {
              session.step = 'greeting'; // Reset
              return { 
                  type: 'BOOKING_CONFIRMED', 
                  reply: `✅ Booking Confirmed for ${session.data.name} on ${session.data.date} at ${session.data.time}!\n\nThank you for choosing The Turf Arena! 🏏⚽`,
                  bookingInfo: result
              };
          } else {
              return { type: 'CHAT_RESPONSE', reply: `Booking failed: ${result.message || 'Unknown error. Please try again.'}` };
          }
      } catch(e) {
          return { type: 'CHAT_RESPONSE', reply: `Error booking slot. Please try again.` };
      }
  }

  return { type: 'CHAT_RESPONSE', reply: "I didn't understand that. You can say 'hi' to restart the booking process." };
};

// ─── Main Entry Point ────────────────────────────────────────────────────────
const aiSessions = {};

const processCricBotCommand = async (userInput, context = {}, userId = 'default') => {
  const cfg = await getLatestSettings();
  if (!aiSessions[userId]) aiSessions[userId] = [];
  const history = aiSessions[userId];
  if (history.length > 10) history.shift();
  history.push({ role: 'user', content: userInput });

  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await tryOpenAI(userInput, { ...context, userId }, cfg, history);
      history.push({ role: 'assistant', content: result.reply });
      return result;
    } catch (e) { console.error('OpenAI Error:', e); }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const result = await tryGemini(userInput, { ...context, userId }, cfg, history);
      history.push({ role: 'model', content: result.reply });
      return result;
    } catch (e) { console.error('Gemini Error:', e); }
  }

  return tryRuleBased(userInput, { ...context, userId }, cfg);
};

module.exports = {
  processCricBotCommand,
  buildSystemPrompt,
};
