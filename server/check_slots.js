require('dotenv').config();
const mongoose = require('mongoose');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Slot = require('./models/Slot');

        const counts = await Slot.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        console.log('--- SLOT STATUS COUNTS ---');
        counts.forEach(c => console.log(`${c._id}: ${c.count}`));

        const holds = await Slot.find({ status: 'hold' }).limit(10);
        if (holds.length > 0) {
            console.log('\n--- RECENT HOLDS ---');
            holds.forEach(h => {
                console.log(`ID: ${h._id}, Expires: ${h.holdExpiresAt}, Date: ${h.date}, Time: ${h.startTime}`);
            });
        }

        process.exit(0);
    } catch (err) { console.error(err); process.exit(1); }
};

run();
