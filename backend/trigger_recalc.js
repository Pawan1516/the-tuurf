const mongoose = require('mongoose');
const statsService = require('./services/statsService');
const Match = require('./models/Match');
require('dotenv').config();

async function trigger() {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI.substring(0, 30) + "...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        // MARK ALL COMPLETED MATCHES AS VERIFIED SO THEY COUNT
        const res = await Match.updateMany(
            { status: 'Completed', 'verification.status': { $ne: 'VERIFIED' } },
            { $set: { 'verification.status': 'VERIFIED' } }
        );
        console.log(`Verified ${res.modifiedCount} matches that were completed but unverified.`);

        await statsService.recalculateAllStats();
        console.log("Success.");
        process.exit(0);
    } catch (err) {
        console.error("Trigger Failed:", err);
        process.exit(1);
    }
}
trigger();
