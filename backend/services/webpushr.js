const axios = require('axios');

const WEBPUSHR_KEY = process.env.WEBPUSHR_KEY;
const WEBPUSHR_AUTH_TOKEN = process.env.WEBPUSHR_AUTH_TOKEN;

/**
 * 🔔 Webpushr Notification Service
 * Requirement: Instant alerts for Match Start, Boundaries, Wickets, and Results.
 */
const sendNotification = async (title, message, targetUrl = null) => {
    if (!WEBPUSHR_KEY || !WEBPUSHR_AUTH_TOKEN) {
        console.warn('⚠️ Webpushr credentials missing. Notification skipped.');
        return;
    }

    try {
        const response = await axios.post('https://api.webpushr.com/v1/notification/send/all', {
            title: title,
            message: message,
            target_url: targetUrl || process.env.FRONTEND_URL
        }, {
            headers: {
                'webpushrKey': WEBPUSHR_KEY,
                'webpushrAuthToken': WEBPUSHR_AUTH_TOKEN,
                'Content-Type': 'application/json'
            }
        });
        console.log(`🔔 Webpushr Success: ${title}`);
        return response.data;
    } catch (err) {
        console.error('❌ Webpushr Error:', err.response?.data || err.message);
    }
};

module.exports = { sendNotification };
