const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Common API Call Pattern using Gemini directly
 */
async function callAI(systemPrompt, userMessage) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not defined');
    
    const models = [
        "gemini-3.1-flash-live-preview-preview-12-2025",
        "gemini-2.5-flash",
        "gemini-2.0-flash"
    ];
    let lastError = null;

    for (const modelName of models) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            const fullPrompt = `${systemPrompt}\n\nUser:\n${userMessage}`;
            const result = await model.generateContent(fullPrompt);
            return result.response.text();
        } catch(err) {
            console.warn(`⚠️ AI Engine: ${modelName} returned status ${err.status || 'ERROR'}. Attempting fallback...`);
            lastError = err;
            if (err.status !== 404) break; // If it's not a 404 (e.g., quota), don't bother trying other models
        }
    }
    throw new Error(`AI Engine Failure: All models returned 404 or quota errors. ${lastError?.message}`);
}

/**
 * 🧠 1. Cricket Chatbot (AI Specialist)
 */
async function cricketChatbot(matchData, userInput) {
    const SYSTEM_PROMPT = `You are a smart cricket assistant for a turf booking website.
Your responsibilities:
- Answer user questions about live cricket matches
- Help users with slot booking queries
- Provide short, clear, and accurate responses

Rules:
- Use the provided match data
- Do not guess unknown information
- Keep answers under 3 lines
- Be conversational and helpful`;

    const USER_MESSAGE = `Match Data: ${JSON.stringify(matchData)}

User Question: ${userInput}`;

    return await callAI(SYSTEM_PROMPT, USER_MESSAGE);
}

/**
 * 📊 2. Match Prediction Engine
 */
async function matchPredictionEngine(matchData) {
    const SYSTEM_PROMPT = `You are a cricket analytics expert.
Analyze the match data and respond in JSON only with this exact structure:
{"india_pct": <number 0-100>, "australia_pct": <number>, "predicted_winner": "<team>", "key_factor": "<one sentence>", "reasoning": "<2 sentences>"}
No preamble. No markdown. Only valid JSON.`;

    const USER_MESSAGE = `Match Data: ${JSON.stringify(matchData)}`;

    const replyText = await callAI(SYSTEM_PROMPT, USER_MESSAGE);
    return JSON.parse(replyText); // Parse JSON response
}

/**
 * 🤖 3. Slot Booking Agent
 */
async function slotBookingAgent(slots, userPreference) {
    const SYSTEM_PROMPT = `You are a smart slot booking assistant for a cricket turf.
Based on user history, available slots, and crowd levels, suggest:
1. Best slot time
2. Reason for the suggestion
Keep answer to 3 lines max. Be friendly and direct.`;

    const USER_MESSAGE = `Available Slots: ${JSON.stringify(slots)}
User Preference: ${userPreference}
User History: Last booked 6PM slot twice. Prefers weekday evenings.`;

    return await callAI(SYSTEM_PROMPT, USER_MESSAGE);
}

/**
 * 🔔 4. Notification Agent
 */
async function notificationAgent(context, matchName) {
    const SYSTEM_PROMPT = `You are a smart notification generator for a cricket turf booking app.
Generate exactly 3 short, engaging push notifications.
Return JSON only: {"notifications": [{"icon":"<emoji>","title":"<short title>","body":"<under 15 words>"},...]}
No preamble. No markdown.`;

    const USER_MESSAGE = `Context: ${context}
Match: ${matchName}`;

    const replyText = await callAI(SYSTEM_PROMPT, USER_MESSAGE);
    return JSON.parse(replyText); // Parse JSON response
}

/**
 * 📈 5. Revenue / Booking Analyst
 */
async function revenueBookingAnalyst(analysisType, bookingData) {
    const SYSTEM_PROMPT = `You are a business analyst for a cricket turf booking platform.
Analyze the provided data and deliver clear, actionable insights.
Format your response with 3 clear points. Keep each point to 1-2 sentences. Be specific with numbers where possible.`;

    const USER_MESSAGE = `Analysis Request: ${analysisType}
Booking Data: ${JSON.stringify(bookingData)}`;

    return await callAI(SYSTEM_PROMPT, USER_MESSAGE);
}

module.exports = {
    cricketChatbot,
    matchPredictionEngine,
    slotBookingAgent,
    notificationAgent,
    revenueBookingAnalyst
};
