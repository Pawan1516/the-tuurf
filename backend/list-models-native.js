require('dotenv').config();
const https = require('https');

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log("Status:", res.statusCode);
            console.log("Body:", data);
        });
    }).on('error', (err) => {
        console.error("Error:", err.message);
    });
}

listModels();
