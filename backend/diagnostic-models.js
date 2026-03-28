require('dotenv').config();
const https = require('https');

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            try {
                const body = JSON.parse(data);
                if (body.models) {
                    console.log("AVAILABLE_MODELS_LOG_START");
                    body.models.forEach(m => console.log(m.name));
                    console.log("AVAILABLE_MODELS_LOG_END");
                } else {
                    console.log("NO_MODELS_FOUND:", data);
                }
            } catch(e) { console.error("PARSE_ERROR", data); }
        });
    }).on('error', (err) => {
        console.error("Error:", err.message);
    });
}

listModels();
