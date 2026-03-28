require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const result = await model.generateContent("Say hello");
        console.log("Response:", result.response.text());
        console.log("SUCCESS");
    } catch (err) {
        console.error("FAILURE:", err.message);
        if (err.status) console.error("Status:", err.status);
    }
}

testGemini();
