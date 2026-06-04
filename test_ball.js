require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Match = require('./backend/models/Match');
const http = require('http');

async function testPost() {
    await mongoose.connect(process.env.MONGODB_URI);
    const match = await Match.findOne({ status: 'Scheduled' });
    if (!match) {
        console.log("No match found");
        process.exit(1);
    }
    const matchId = match._id.toString();
    console.log("Testing against matchId:", matchId);
    
    const payload = JSON.stringify({
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
    });

    const options = {
        hostname: 'localhost',
        port: 5005,
        path: `/api/matches/${matchId}/ball`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            console.log('Response:', data);
            process.exit(0);
        });
    });

    req.on('error', (e) => {
        console.error('Request error:', e);
        process.exit(1);
    });

    req.write(payload);
    req.end();
}
testPost();
