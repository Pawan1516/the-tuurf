const mongoose = require('mongoose');
const Match = require('./models/Match');
require('dotenv').config();

async function getMatches() {
    await mongoose.connect(process.env.MONGODB_URI);
    const matches = await Match.find({ status: 'Completed' }).sort({ createdAt: -1 }).limit(5);
    matches.forEach(m => {
        console.log(`ID: ${m._id} Teams: ${m.title || 'N/A'} Completed at: ${m.createdAt}`);
        m.innings.forEach(inn => {
            console.log(`Inning ${inn.number}: Score: ${inn.score}/${inn.wickets}`);
            (inn.batsmen || []).forEach(b => {
                 if (b.runs > 0) console.log(`  Batsman: ${b.user_id} (${b.name || '??'}) Runs: ${b.runs} Balls: ${b.balls}`);
            });
        });
    });
    await mongoose.disconnect();
}

getMatches();
