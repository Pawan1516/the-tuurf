require('dotenv').config();
const OpenAI = require("openai");

async function testOpenAI() {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        console.log("Using OpenAI Key:", apiKey ? "FOUND" : "MISSING");
        const openai = new OpenAI({ apiKey: apiKey });
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "Say hello" }],
            model: "gpt-3.5-turbo",
        });
        console.log("Response:", completion.choices[0].message.content);
        console.log("SUCCESS");
    } catch (err) {
        console.error("FAILURE:", err);
    }
}

testOpenAI();
