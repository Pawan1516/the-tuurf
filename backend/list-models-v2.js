require('dotenv').config();
const https = require('https');

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            const body = JSON.parse(data);
            console.log("Status:", res.statusCode);
            const models = body.models.map(m => m.name.replace('models/', ''));
            console.log("Model Names:", JSON.stringify(models, null, 2));
        });
    }).on('error', (err) => {
        console.error("Error:", err.message);
    });
}

listModels();
