const Slot = require('../models/Slot');
const Setting = require('../models/Setting');
const mongoose = require('mongoose');

/**
 * Helper to fetch settings with fallback
 */
const getSetting = async (key, fallback) => {
    try {
        const setting = await Setting.findOne({ key });
        return setting ? setting.value : fallback;
    } catch (e) {
        return fallback;
    }
};

/**
 * Ensures that slots for the next X days exist in the database.
 * If they don't, it creates them.
 */
const autoGenerateSlots = async (daysAhead = 30) => {
    if (mongoose.connection.readyState !== 1) return;

    try {
        console.log(`🔄 Maintenance: Syncing slots for the next ${daysAhead} days...`);

        // Fetch prices from settings or env
        const priceDay = await getSetting('PRICE_DAY', parseInt(process.env.PRICE_DAY) || 1000);
        const priceNight = await getSetting('PRICE_NIGHT', parseInt(process.env.PRICE_NIGHT) || 1200);
        const priceWeekendDay = await getSetting('PRICE_WEEKEND_DAY', parseInt(process.env.PRICE_WEEKEND_DAY) || 1000);
        const priceWeekendNight = await getSetting('PRICE_WEEKEND_NIGHT', parseInt(process.env.PRICE_WEEKEND_NIGHT) || 1400);
        const transitionHour = await getSetting('PRICE_TRANSITION_HOUR', parseInt(process.env.PRICE_TRANSITION_HOUR) || 18);
        const openHour = await getSetting('TURF_OPEN_HOUR', parseInt(process.env.TURF_OPEN_HOUR) || 7);
        const closeHour = await getSetting('TURF_CLOSE_HOUR', parseInt(process.env.TURF_CLOSE_HOUR) || 23);

        // 1. Cleanup: Delete slots from previous days
        const yesterday = new Date();
        yesterday.setUTCHours(0, 0, 0, 0);
        const deleted = await Slot.deleteMany({ date: { $lt: yesterday }, status: 'free' });
        if (deleted.deletedCount > 0) {
            console.log(`🧹 Cleaned up ${deleted.deletedCount} past slots.`);
        }

        // 2. Generation Loop (ensure full coverage starting from LOCAL TODAY)
        const now = new Date();
        const kolkataDateStr = new Intl.DateTimeFormat('en-CA', { 
            timeZone: 'Asia/Kolkata', 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
        }).format(now);
        
        console.log(`[Generator] Targeting start date: ${kolkataDateStr} (Kolkata)`);

        for (let i = 0; i < daysAhead; i++) {
            const date = new Date(`${kolkataDateStr}T00:00:00.000Z`);
            date.setDate(date.getDate() + i);
            
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);

            // Fetch existing start times for this specific day
            const existingSlots = await Slot.find({
                date: { $gte: date, $lt: nextDay }
            }, 'startTime');
            const existingStarts = new Set(existingSlots.map(s => s.startTime));

            const newSlots = [];

            for (let hour = openHour; hour < closeHour; hour++) {
                const startTime = `${hour.toString().padStart(2, '0')}:00`;
                const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

                if (!existingStarts.has(startTime)) {
                    newSlots.push({
                        date: date,
                        startTime,
                        endTime,
                        price: (() => {
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            const isDay = hour < transitionHour;
                            if (isWeekend) {
                                return isDay ? priceWeekendDay : priceWeekendNight;
                            } else {
                                return isDay ? priceDay : priceNight;
                            }
                        })(),
                        status: 'free'
                    });
                }
            }

            if (newSlots.length > 0) {
                try {
                    const result = await Slot.insertMany(newSlots, { ordered: false });
                    console.log(`✅ Synced ${result.length} missing segments for ${date.toDateString()}`);
                } catch (insertErr) {
                    // Ignore duplicate key errors (11000) — slot already exists
                    if (insertErr.code !== 11000 && (!insertErr.writeErrors || insertErr.writeErrors.some(e => e.code !== 11000))) {
                        throw insertErr;
                    }
                    const inserted = insertErr.insertedDocs?.length ?? (newSlots.length - (insertErr.writeErrors?.length ?? 0));
                    if (inserted > 0) console.log(`✅ Synced ${inserted} new slots for ${date.toDateString()} (skipped duplicates)`);
                }
            }
        }

        // 3. Retroactive Price Update for existing FREE slots
        const allFreeSlots = await Slot.find({ status: 'free' });
        const bulkOps = [];
        
        for (const slot of allFreeSlots) {
            if (!slot.startTime || !slot.date) continue;
            const hour = parseInt(slot.startTime.split(':')[0], 10);
            
            // Re-calculate the correct price based on NEW settings
            const isWeekend = slot.date.getDay() === 0 || slot.date.getDay() === 6;
            const isDay = hour < transitionHour;
            let expectedPrice = 0;
            
            if (isWeekend) {
                expectedPrice = isDay ? priceWeekendDay : priceWeekendNight;
            } else {
                expectedPrice = isDay ? priceDay : priceNight;
            }

            // Only queue update if the price has changed
            if (slot.price !== expectedPrice) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: slot._id },
                        update: { price: expectedPrice }
                    }
                });
            }
        }

        if (bulkOps.length > 0) {
            await Slot.bulkWrite(bulkOps);
            console.log(`✅ Synchronized prices for ${bulkOps.length} existing free slots.`);
        }

    } catch (error) {
        console.error('❌ Generator Error:', error.message);
    }
};

module.exports = { autoGenerateSlots };
