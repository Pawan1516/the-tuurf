require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Try the classic one first, explicitly
        const result = await model.generateContent("Say hello");
        console.log("Response:", result.response.text());
        console.log("SUCCESS");
    } catch (err) {
        console.error("FAILURE:", err.message);
        console.log("Trying 2.0...");
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent("Say hello");
            console.log("Response 2.0:", result.response.text());
            console.log("SUCCESS 2.0");
        } catch (err2) {
            console.error("FAILURE 2.0:", err2.message);
        }
    }
}

testGemini();
