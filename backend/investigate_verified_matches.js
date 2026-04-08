const mongoose = require('mongoose');
const Match = require('./models/Match');
require('dotenv').config();

async function checkMatches() {
    await mongoose.connect(process.env.MONGODB_URI);
    const matches = await Match.find({ 
        $or: [
           { 'verification.status': 'VERIFIED' },
           { is_offline_match: true }
        ],
        status: 'Completed'
    });
    console.log(`Found ${matches.length} verified/offline completed matches.`);
    matches.forEach(m => {
        console.log(`Match ID: ${m._id} Title: ${m.title}`);
        m.innings.forEach(inn => {
            (inn.batsmen || []).forEach(b => {
                if (b.runs > 0) console.log(`  Batted: ${b.user_id} (${b.name}) Runs: ${b.runs}`);
            });
        });
    });
    await mongoose.disconnect();
}

checkMatches();
