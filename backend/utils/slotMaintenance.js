const Slot = require('../models/Slot');
const mongoose = require('mongoose');

/**
 * Releases slots that have been on hold longer than the expiry time.
 */
const cleanupExpiredHolds = async () => {
    if (mongoose.connection.readyState !== 1) return;

    try {
        const now = new Date();

        // Find slots with status 'hold' where holdExpiresAt has passed
        const expiredSlots = await Slot.find({
            status: 'hold',
            holdExpiresAt: { $lt: now }
        });

        if (expiredSlots.length > 0) {
            console.log(`🧹 Cleaning up ${expiredSlots.length} expired holds...`);

            for (const slot of expiredSlots) {
                slot.status = 'free';
                slot.holdExpiresAt = null;
                await slot.save();
                console.log(`🔓 Released slot: ${slot.startTime} on ${slot.date.toDateString()}`);
            }
        }
    } catch (error) {
        console.error('❌ Error in hold cleanup:', error.message);
    }
};

/**
 * Marks today's 'free' slots as 'expired' if their start time has already passed.
 * This prevents past slots from appearing as bookable on the public page or chatbot.
 * Runs every minute.
 */
const markPastSlotsExpired = async () => {
    if (mongoose.connection.readyState !== 1) return;

    try {
        // Get today's date in IST (Asia/Kolkata) as a UTC midnight boundary
        const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const todayStr = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD in IST

        // Current hour and minute in IST
        const currentHour = nowIST.getHours();
        const currentMinute = nowIST.getMinutes();
        const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

        // Find today's free slots whose startTime <= current time
        const pastSlots = await Slot.find({
            date: {
                $gte: new Date(`${todayStr}T00:00:00.000Z`),
                $lt: new Date(`${todayStr}T23:59:59.999Z`)
            },
            status: 'free',
            startTime: { $lte: currentTimeStr }
        });

        if (pastSlots.length > 0) {
            const ids = pastSlots.map(s => s._id);
            await Slot.updateMany({ _id: { $in: ids } }, { $set: { status: 'expired' } });
            console.log(`⏰ Auto-expired ${pastSlots.length} past slot(s) for ${todayStr} (current time: ${currentTimeStr} IST)`);
        }
    } catch (error) {
        console.error('❌ Error in markPastSlotsExpired:', error.message);
    }
};

module.exports = { cleanupExpiredHolds, markPastSlotsExpired };
