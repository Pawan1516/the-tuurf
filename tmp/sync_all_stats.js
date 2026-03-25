const mongoose = require('mongoose');
require('dotenv').config();
const statsService = require('../backend/services/statsService');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
        
        const result = await statsService.recalculateAllStats();
        console.log("Recalculation result:", result);
        
        process.exit(0);
    } catch (e) {
        console.error("❌ Recalculation failed with error:", e.message);
        console.error("Stack trace:", e.stack);
        process.exit(1);
    }
};

run();
