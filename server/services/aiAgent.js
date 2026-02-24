const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const { checkAvailability, bookSlot } = require('./bookingTools');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── Tool definitions for Gemini Function Calling ─────────────────────────────
const tools = [
  {
    functionDeclarations: [
      {
        name: 'check_availability',
        description: 'Check if a cricket net slot is available for a specific date and time (7 AM–11 PM). Returns availability and alternative slots if unavailable.',
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
        description: 'Book a confirmed cricket net slot. Requires name, phone, date, and time. Returns booking confirmation with ID.',
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

const CRICBOT_SYSTEM_PROMPT = `You are CricBot, a friendly WhatsApp assistant for ${process.env.TURF_LOCATION || 'The Turf Stadium'} cricket net booking.

Your job:
- Greet the user warmly
- Collect: Full Name, Phone Number, Date (YYYY-MM-DD), Time (HH:MM, 24h)
- Validate: date must be today or future, time must be 07:00–23:00
- Use check_availability tool to check the slot
- If available: use book_slot tool to confirm it
- If not available: apologize and suggest 2–3 alternative times from the tool response

Pricing:
- Day slots (07:00–18:00): ₹800/hr
- Night slots (18:00–23:00): ₹1200/hr
- Only 1-hour and 2-hour slots available

Rules:
- Short, friendly, WhatsApp-style messages
- Ask only one question at a time
- Never assume missing info — always ask
- Use emojis sparingly ✅ 📅 ⏰ 🏏
- After booking, tell user a UPI payment link will be sent

Operating hours: 7 AM to 11 PM daily.
Today's date/time context: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}.`;

/**
 * Process a WhatsApp/chatbot message using Gemini with function calling
 */
const processCricBotCommand = async (userInput, context = {}) => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('AI Agent: GEMINI_API_KEY is missing.');
    return { type: 'CHAT_RESPONSE', reply: "I'm sorry, I'm having trouble connecting right now. Please try again later." };
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: CRICBOT_SYSTEM_PROMPT,
      tools,
    });

    // Build history from context
    const history = (context.chatHistory || []).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });

    let response = await chat.sendMessage(userInput);
    let result = response.response;

    // Handle function calls in a loop (Gemini may chain multiple)
    let isBookingConfirmed = false;
    let bookingInfo = null;

    while (result.functionCalls() && result.functionCalls().length > 0) {
      const functionCall = result.functionCalls()[0];
      const { name, args } = functionCall;

      console.log(`🔧 Gemini Tool Call: ${name}`, args);

      let toolResult;
      if (name === 'check_availability') {
        toolResult = await checkAvailability(args.date, args.time);
      } else if (name === 'book_slot') {
        toolResult = await bookSlot(args.name, args.phone, args.date, args.time);
        if (toolResult.success) {
          isBookingConfirmed = true;
          bookingInfo = toolResult;
        }
      }

      console.log(`✅ Tool Result for ${name}:`, toolResult);

      // Send the tool result back to Gemini
      response = await chat.sendMessage([
        {
          functionResponse: {
            name,
            response: toolResult,
          },
        },
      ]);
      result = response.response;
    }

    const finalReply = result.text();

    return {
      type: isBookingConfirmed ? 'BOOKING_CONFIRMED' : 'CHAT_RESPONSE',
      reply: finalReply,
      bookingInfo: isBookingConfirmed ? bookingInfo : null,
    };

  } catch (error) {
    console.error('Error in processCricBotCommand (Gemini):', error.message);
    return { type: 'CHAT_RESPONSE', reply: "Oops! I ran into an error. Could you say that again?" };
  }
};

// ─── Legacy helpers (used by booking notifications) ───────────────────────────

/**
 * Analyze a booking and generate a personalized confirmation message using Gemini
 */
const analyzeBookingAndGenerateMessage = async (bookingData, userHistory) => {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a Booking Confirmation Agent. Analyze this booking and predict no-show risk.

Booking: ${JSON.stringify(bookingData)}
User History: ${JSON.stringify(userHistory)}

Respond ONLY with valid JSON:
{
  "risk_level": "LOW | MEDIUM | HIGH",
  "channel_recommendation": "SMS | WHATSAPP | EMAIL",
  "message": "personalized confirmation message"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini analyzeBooking error:', error.message);
    return null;
  }
};

/**
 * Get AI insights about a user's booking patterns
 */
const getAIInsights = async (userHistory) => {
  if (!process.env.GEMINI_API_KEY) return null;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(
      `Analyze this user booking history and give a brief executive summary (under 60 words) with one Smart Action recommendation:\n${JSON.stringify(userHistory)}`
    );
    return result.response.text();
  } catch (error) {
    console.error('Gemini getAIInsights error:', error.message);
    return null;
  }
};

module.exports = {
  analyzeBookingAndGenerateMessage,
  getAIInsights,
  processCricBotCommand,
  CRICBOT_SYSTEM_PROMPT,
};
