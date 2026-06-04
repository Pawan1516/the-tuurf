const axios = require('axios');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key-at-least-32-characters-long-change-this';
const token = jwt.sign({ id: '60d0fe4f5311236168a109ca', role: 'user' }, JWT_SECRET, { expiresIn: '1d' });

async function test() {
    try {
        const res = await axios.get('http://localhost:3001/api/matches/latest');
        const match = res.data.match;
        console.log('Match ID:', match._id);
        
        const payload = {
            inningsNum: 1,
            batsmanId: null,
            nonStrikerId: null,
            bowlerId: null,
            runsOffBat: 1,
            extraType: null,
            extraRuns: 0,
            isWicket: false,
            isFreeHit: false,
            commentary: null,
            newBatsmanId: null
        };
        const ballRes = await axios.post(`http://localhost:3001/api/matches/${match._id}/ball`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(ballRes.data);
    } catch (e) {
        if (e.response) {
            console.log(e.response.status, e.response.data);
        } else {
            console.log(e);
        }
    }
}
test();
