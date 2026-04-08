const axios = require('axios');

async function test() {
    try {
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date());
        
        console.log(`Testing /api/slots for date: ${today}`);
        const res = await axios.get(`http://localhost:5001/api/slots?date=${today}`);
        console.log(`Success! Found ${res.data.length} slots via API.`);
    } catch (err) {
        console.error('API Test Failed:', err.message);
    }
}
test();
