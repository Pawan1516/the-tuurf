const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
    genAI
};
