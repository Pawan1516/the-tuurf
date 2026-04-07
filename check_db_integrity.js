const mongoose = require('mongoose');
const Match = require('./backend/models/Match');
require('dotenv').config({ path: './backend/.env' });

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        const matches = await Match.find({}).sort({ updatedAt: -1 }).limit(5);
        
        matches.forEach(m => {
            console.log(`--- Match ID: ${m._id} ---`);
            console.log(`Status: ${m.status}`);
            console.log(`Live Runs: ${m.live_data?.runs}`);
            
            m.innings.forEach((inn, idx) => {
                const ballSum = (inn.balls || []).reduce((acc, b) => acc + (b.runs_off_bat || 0) + (b.extra_runs || 0), 0);
                console.log(`Inning ${idx + 1}: Score=${inn.score}, Ball Sum=${ballSum}, Ball Count=${inn.balls?.length}`);
                
                if (inn.score !== ballSum) {
                    console.warn(`[WARNING] Inning ${idx+1} Score Mismatch: Score ${inn.score} vs Ball Sum ${ballSum}`);
                }
            });
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkData();
