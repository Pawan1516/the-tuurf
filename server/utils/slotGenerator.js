const Slot = require('../models/Slot');
const mongoose = require('mongoose');

/**
 * Ensures that slots for the next X days exist in the database.
 * If they don't, it creates them.
 */
const autoGenerateSlots = async (daysAhead = 30) => {
    if (mongoose.connection.readyState !== 1) return;

    try {
        console.log(`🔄 Maintenance: Syncing slots for the next ${daysAhead} days...`);

        // 1. Cleanup: Delete slots from previous days
        const yesterday = new Date();
        yesterday.setUTCHours(0, 0, 0, 0);
        const deleted = await Slot.deleteMany({ date: { $lt: yesterday }, status: 'free' });
        if (deleted.deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deleted.deletedCount} past slots.`);
        }

        // 2. Generation Loop (ensure full coverage)
        for (let i = 0; i < daysAhead; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            date.setUTCHours(0, 0, 0, 0);

            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            // Fetch existing start times for this specific day
            const existingSlots = await Slot.find({
                date: { $gte: date, $lt: nextDay }
            }, 'startTime');
            const existingStarts = new Set(existingSlots.map(s => s.startTime));

            const newSlots = [];
            // Target: Configured hours
            const openHour = parseInt(process.env.TURF_OPEN_HOUR) || 7;
            const closeHour = parseInt(process.env.TURF_CLOSE_HOUR) || 23;

            for (let hour = openHour; hour < closeHour; hour++) {
                const startTime = `${hour.toString().padStart(2, '0')}:00`;
                const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

                if (!existingStarts.has(startTime)) {
                    newSlots.push({
                        date: date,
                        startTime,
                        endTime,
                        price: hour < (parseInt(process.env.PRICE_TRANSITION_HOUR) || 18)
                            ? (parseInt(process.env.PRICE_DAY) || 500)
                            : (parseInt(process.env.PRICE_NIGHT) || 700),
                        status: 'free'
                    });
                }
            }

            if (newSlots.length > 0) {
                await Slot.insertMany(newSlots);
                console.log(`✅ Synced ${newSlots.length} missing segments for ${date.toDateString()}`);
            }
        }
    } catch (error) {
        console.error('❌ Generator Error:', error.message);
    }
};

module.exports = { autoGenerateSlots };
