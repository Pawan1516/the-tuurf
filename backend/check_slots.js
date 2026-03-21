
require('dotenv').config();
const mongoose = require('mongoose');
const Slot = require('./models/Slot');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const count = await Slot.countDocuments({ date: today });
    console.log('Slots for today (UTC 00:00):', count);
    const all = await Slot.find({ date: today }).limit(3);
    console.log('Segments:', all.map(s => s.startTime));
    process.exit(0);
}

check();
