
const axios = require('axios');

async function testLive() {
    try {
        const res = await axios.get('http://localhost:5001/api/matches/live');
        console.log('Status:', res.status);
        console.log('Success:', res.data.success);
        console.log('Count:', res.data.matches?.length || 0);
        console.log('Matches:', res.data.matches?.map(m => m.status));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

testLive();
