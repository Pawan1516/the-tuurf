const mongoose = require('mongoose');
require('dotenv').config();
const { autoGenerateSlots } = require('./utils/slotGenerator');

async function run() {
    console.log('🔄 Manually triggering slot generation...');
    await mongoose.connect(process.env.MONGODB_URI);
    await autoGenerateSlots(30);
    console.log('✅ Done.');
    process.exit(0);
}
run();
