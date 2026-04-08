const axios = require('axios');

async function test() {
    try {
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date());
        
        const url = 'https://the-tuurf-ufkd.onrender.com/api/slots';
        console.log(`Testing PROD API: ${url} for date: ${today}`);
        const res = await axios.get(`${url}?date=${today}`);
        console.log(`Success! Found ${res.data.length} slots via PROD API.`);
    } catch (err) {
        console.error('PROD API Test Failed:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    }
}
test();
