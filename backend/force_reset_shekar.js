const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function forceResetStats() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ phone: '7702715890' }); // SHEKAR's number from previous context
    if (user) {
        console.log(`Resetting stats for ${user.name}...`);
        user.stats = {
            batting: { matches: 0, innings: 0, runs: 0, balls_faced: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, high_score: 0, not_outs: 0, average: 0, strike_rate: 0 },
            bowling: { matches: 0, wickets: 0, overs: 0, balls_bowled: 0, runs_conceded: 0, economy: 0, five_wicket_hauls: 0, three_wicket_hauls: 0, best_bowling: { wickets: 0, runs: 0 } },
            fielding: { catches: 0, run_outs: 0, stumpings: 0 }
        };
        await user.save();
        console.log('✅ Stats have been reset to 0.');
    } else {
        console.log('User not found');
    }
    await mongoose.disconnect();
}

forceResetStats();
