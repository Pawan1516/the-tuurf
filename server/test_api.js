
const axios = require('axios');

async function testApi() {
    try {
        const date = '2026-03-21';
        const res = await axios.get(`http://localhost:5001/api/slots?date=${date}`);
        console.log('API Status:', res.status);
        console.log('Count:', res.data.length);
        console.log('First Slot:', res.data[0]?.startTime);
    } catch (err) {
        console.error('API Error:', err.message);
    }
}

testApi();
