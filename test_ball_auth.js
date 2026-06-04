require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Session = require('./backend/models/Session');
const Match = require('./backend/models/Match');
const http = require('http');

async function testApi() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find a valid match
    const match = await Match.findOne({ status: 'Scheduled' }) || await Match.findOne({});
    if (!match) {
        console.log("No match found");
        process.exit(1);
    }
    const matchId = match._id.toString();

    // Find a valid session token (simulate frontend)
    // Wait, the JWT token itself is NOT in the Session model. The Session model just has `userId`.
    // Let's sign a new token!
    const jwt = require('jsonwebtoken');
    const session = await Session.findOne({ isValid: true });
    if (!session) {
        console.log("No valid session found");
        process.exit(1);
    }
    const token = jwt.sign({ id: session.userId, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log("Testing POST against matchId:", matchId);
    
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
        port: 3001,
        path: `/api/matches/${matchId}/ball`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'Authorization': `Bearer ${token}`
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
testApi();
