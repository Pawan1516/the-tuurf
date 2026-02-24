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

module.exports = { cleanupExpiredHolds };
