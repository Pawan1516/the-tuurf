const mongoose = require('mongoose');
require('dotenv').config({ path: 'backend/.env' });
const statsService = require('../backend/services/statsService');

async function run() {
    try {
        console.log('Connecting to URI:', process.env.MONGODB_URI?.substring(0, 15) + '...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB successfully');
        console.log('Starting recalculation...');
        const res = await statsService.recalculateAllStats();
        console.log('Recalculation finished!');
        console.log('Final Result:', JSON.stringify(res, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR DURING RECALC:');
        console.error(err);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    }
}

run();
