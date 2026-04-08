const axios = require('axios');

async function testLiveEndpoint() {
    try {
        const res = await axios.get('http://localhost:5001/api/matches/live');
        console.log('SUCCESS:', res.data.success);
        console.log('MATCHES FOUND:', res.data.matches.length);
        if (res.data.matches.length > 0) {
            console.log('MATCH 1:', res.data.matches[0].title, '| Status:', res.data.matches[0].status);
        }
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

testLiveEndpoint();
