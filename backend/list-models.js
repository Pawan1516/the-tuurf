require('dotenv').config();
const fetch = require('node-fetch');

async function listGeminiModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        console.log("Using Gemini Key:", apiKey ? "FOUND" : "MISSING");
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error("List Errors:", response.status, response.statusText);
            const body = await response.text();
            console.error("Body:", body);
            return;
        }
        const data = await response.json();
        console.log("Models found:", data.models.length);
        data.models.forEach(m => console.log(m.name));
    } catch (err) {
        console.error("FAILURE:", err);
    }
}

listGeminiModels();
