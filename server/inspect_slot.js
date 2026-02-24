require('dotenv').config();
const mongoose = require('mongoose');
const Slot = require('./models/Slot');

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI);
    const slot = await Slot.findOne();
    console.log('--- SAMPLE SLOT ---');
    console.log(JSON.stringify(slot, null, 2));
    console.log('Date Type:', typeof slot.date);
    console.log('Date Value:', slot.date);
    process.exit(0);
}
debug();
