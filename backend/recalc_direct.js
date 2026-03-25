const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const statsService = require('./services/statsService');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        const res = await statsService.recalculateAllStats();
        console.log('Recalculation successful:', res);
        process.exit(0);
    } catch (err) {
        console.error('Recalculation failed');
        console.error(err);
        process.exit(1);
    }
}

run();
