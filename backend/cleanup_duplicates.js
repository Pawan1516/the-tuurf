require('dotenv').config();
const mongoose = require('mongoose');
const Slot = require('./models/Slot');

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const allSlots = await Slot.find({ date: { $gte: new Date('2026-03-21') } });
        console.log(`Found ${allSlots.length} slots from March 21 onwards.`);

        const seen = new Map();
        const toDeleteIds = [];

        for (const slot of allSlots) {
            const dateStr = slot.date.toISOString().split('T')[0];
            const key = `${dateStr}_${slot.startTime}`;

            if (seen.has(key)) {
                // Duplicate!
                // Keep the one that is 'booked' or 'hold' if possible
                const existing = seen.get(key);
                if (slot.status === 'free' && (existing.status === 'booked' || existing.status === 'hold')) {
                    toDeleteIds.push(slot._id);
                } else if (existing.status === 'free' && (slot.status === 'booked' || slot.status === 'hold')) {
                    toDeleteIds.push(existing._id);
                    seen.set(key, slot);
                } else {
                    // Both free or both booked? Just delete the newer one
                    toDeleteIds.push(slot._id);
                }
            } else {
                seen.set(key, slot);
            }
        }

        console.log(`Will delete ${toDeleteIds.length} duplicate slots.`);
        
        if (toDeleteIds.length > 0) {
            await Slot.deleteMany({ _id: { $in: toDeleteIds } });
            console.log('Successfully deleted duplicates.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

cleanup();
