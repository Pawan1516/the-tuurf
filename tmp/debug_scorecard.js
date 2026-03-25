require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Match = require('./backend/models/Match');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const match = await Match.findOne({ status: 'Completed', 'live_data.scorecard.batsmen.0': { $exists: true } });
        if (match) {
            console.log('Scorecard Batter Sample:', JSON.stringify(match.live_data.scorecard.batsmen[0], null, 2));
        } else {
            console.log('No matches found with scorecard');
        }
        process.exit();
    } catch(err) {
        process.exit(1);
    }
}
debug();
