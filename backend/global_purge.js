const mongoose = require('mongoose');
const Match = require('./models/Match');
const User = require('./models/User');
const statsService = require('./services/statsService');
require('dotenv').config();

async function purgeMockData() {
    try {
        console.log('🚮 Starting Global Mock Data Purge...');
        await mongoose.connect(process.env.MONGODB_URI);

        // 1. Delete all matches with 'Seed' or 'Demo' in title
        const matchRes = await Match.deleteMany({ 
            $or: [
                { title: /Seed/i },
                { title: /Demo/i },
                { title: /Test/i },
                { title: /Quick Match/i } // Many quick matches were added as mock tests
            ]
        });
        console.log(`✅ Deleted ${matchRes.deletedCount} mock matches.`);

        // 2. Delete all seeded users (e.g. from playerSeed.js which used @example.com)
        const userRes = await User.deleteMany({ email: /@example\.com/i });
        console.log(`✅ Deleted ${userRes.deletedCount} seeded mock users.`);

        // 3. Reset stats for EVERY surviving player to 0 (Fresh baseline)
        console.log('🔄 Resetting all profile stats to zero...');
        await User.updateMany({}, {
            $set: {
                'stats.batting': { matches: 0, innings: 0, runs: 0, balls_faced: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, high_score: 0, not_outs: 0, average: 0, strike_rate: 0 },
                'stats.bowling': { matches: 0, wickets: 0, overs: 0, balls_bowled: 0, runs_conceded: 0, economy: 0, five_wicket_hauls: 0, three_wicket_hauls: 0, best_bowling: { wickets: 0, runs: 0 } },
                'stats.fielding': { catches: 0, run_outs: 0, stumpings: 0 }
            }
        });

        // 4. Run stats recalculator for whatever REAL matches are left
        console.log('📊 Recalculating stats from remaining legitimate matches...');
        const syncResult = await statsService.recalculateAllStats();
        console.log(`✅ Recalculation complete. Processed ${syncResult.processed} real matches.`);

        console.log('🚀 SYSTEM CLEANED. Only original match data and real users remain.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Purge failed:', err);
        process.exit(1);
    }
}

purgeMockData();
