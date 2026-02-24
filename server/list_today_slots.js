require('dotenv').config();
const mongoose = require('mongoose');
const Slot = require('./models/Slot');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);

    const start = new Date('2026-02-24');
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date('2026-02-24');
    end.setUTCHours(23, 59, 59, 999);

    console.log('Querying for:', start.toISOString(), 'to', end.toISOString());

    const slots = await Slot.find({
        date: { $gte: start, $lte: end }
    }).sort({ startTime: 1 });

    console.log(`Found ${slots.length} slots for today.`);
    slots.forEach(s => {
        console.log(`${s.startTime} - ${s.status} (${s._id})`);
    });

    process.exit(0);
}
check();
