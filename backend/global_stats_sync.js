const mongoose = require('mongoose');
const statsService = require('./services/statsService');
require('dotenv').config();

async function fullRecalculation() {
    try {
        console.log('🚀 Starting Global Stats Purge & Recalculation...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        // This method in StatsService:
        // 1. Resets all user stats to 0
        // 2. Unsets 'stats_updated' from all matches
        // 3. Re-runs the stats update for every verified/offline match
        const result = await statsService.recalculateAllStats();
        
        console.log(`✅ Success! Processed ${result.processed} verified matches.`);
        console.log('📊 All player profiles have been updated with ORIGINAL match data only.');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Recalculation failed:', err);
        process.exit(1);
    }
}

fullRecalculation();
