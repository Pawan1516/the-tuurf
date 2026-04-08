const Booking = require('../models/Booking');
const Slot = require('../models/Slot');
const { analyzeBookingAndGenerateMessage } = require('./aiService');
const { sendConfirmationMessage } = require('./whatsapp');
const mongoose = require('mongoose');

/**
 * Shared logic to create a booking (used by Admin and Chatbot)
 */
const createBookingEntry = async ({ slotId, userName, userPhone, amount, date, startTime, endTime, platform = 'admin', paymentType = 'advance' }) => {
    if (!userName || !userPhone || !amount) {
        throw new Error('Missing required customer fields');
    }

    let slot;
    if (slotId && mongoose.Types.ObjectId.isValid(slotId)) {
        slot = await Slot.findByIdAndUpdate(
            slotId,
            {
                startTime: startTime || undefined,
                endTime: endTime || undefined,
                status: 'booked',
                price: amount || undefined,
                updatedAt: new Date()
            },
            { new: true }
        );
    } else if (date && startTime && endTime) {
        // Normalize date to UTC midnight across all timezones
        const d = new Date(date);
        const normalizedDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

        const timeToMinutes = (t) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        const startM = timeToMinutes(startTime);
        const endM = timeToMinutes(endTime);
        const duration = endM - startM;

        if (duration <= 0) throw new Error('Invalid window. Start must be before End.');
        if (startM < 7 * 60 || endM > 23 * 60) throw new Error('Operational window violation. Slots must be between 07:00 AM and 11:00 PM.');

        // Check for overlaps
        const overlaps = await Slot.find({
            date: normalizedDate,
            _id: { $ne: slotId },
            $or: [
                {
                    $and: [
                        { startTime: { $lt: endTime } },
                        { endTime: { $gt: startTime } }
                    ]
                }
            ],
            status: { $in: ['booked', 'hold'] }
        });

        if (overlaps.length > 0) {
            const conflict = overlaps[0];
            throw new Error(`Temporal conflict detected with existing reservation (${conflict.startTime} – ${conflict.endTime})`);
        }

        slot = await Slot.findOneAndUpdate(
            { date: normalizedDate, startTime, status: 'free' },
            {
                status: 'booked',
                endTime,
                price: amount || Math.max(200, Math.ceil((duration / 60) * 1000)),
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!slot) {
            // Check if it exists with another status before trying to create it
            const existingAnyStatus = await Slot.findOne({ date: normalizedDate, startTime });
            if (existingAnyStatus) {
                throw new Error('This temporal segment is already reserved or occupied.');
            }

            slot = new Slot({
                date: normalizedDate,
                startTime,
                endTime,
                status: 'booked',
                price: amount || Math.max(200, Math.ceil((duration / 60) * 1000))
            });
            await slot.save();
        }
    }

    if (!slot) throw new Error('Slot not found or invalid parameters');

    const slotPrice = amount || (slot ? slot.price : 1000);
    const confirmationAmount = (paymentType === 'full') ? slotPrice : Math.ceil(slotPrice * 0.4);

    // [MODIFIED] Populate new fields for robust user dashboard matching
    const cleanMobile = userPhone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    
    // Find turfId if possible (matching location)
    let turfId = null;
    let userId = null;
    try {
        const Turf = require('../models/Turf');
        const User = require('../models/User');
        const loc = process.env.TURF_LOCATION || 'The Turf Stadium';
        const [turf, matchedUser] = await Promise.all([
            Turf.findOne({ location: { $regex: loc, $options: 'i' } }),
            User.findOne({ phone: cleanMobile })
        ]);
        if (turf) turfId = turf._id;
        if (matchedUser) userId = matchedUser._id;
    } catch (e) {
        console.error('Lookup error during manual booking:', e);
    }

    const booking = new Booking({
        userName,
        name: userName, // Added for schema consistency
        userPhone,
        mobileNumber: cleanMobile, // Added for dashboard search
        userId, // Link to detected user
        user: userId, // Backwards compatibility
        turfLocation: process.env.TURF_LOCATION || 'The Turf Stadium',
        turfId: turfId, // Added for analytics
        slot: slot._id,
        date: slot.date, // Added for direct query
        timeSlot: `${slot.startTime} – ${slot.endTime}`, // Added for display
        amount: confirmationAmount,
        totalAmount: slotPrice,
        paymentType: platform === 'admin' ? (paymentType || 'full') : paymentType,
        bookingStatus: platform === 'admin' ? 'confirmed' : 'pending',
        status: platform === 'admin' ? 'confirmed' : 'pending', // Keep in sync
        paymentStatus: platform === 'admin' ? 'verified' : 'pending',
        confirmedAt: platform === 'admin' ? Date.now() : null,
        whatsappNotified: false
    });

    await booking.save();

    // AI Analysis (Risk assessment)
    try {
        const historyData = await Booking.aggregate([
            { $match: { userPhone } },
            {
                $group: {
                    _id: null,
                    past_bookings: { $sum: 1 },
                    no_show_count: { $sum: { $cond: [{ $eq: ["$bookingStatus", "no-show"] }, 1, 0] } },
                    cancellations: { $sum: { $cond: [{ $eq: ["$bookingStatus", "cancelled"] }, 1, 0] } }
                }
            }
        ]);
        const userHistory = historyData.length > 0 ? historyData[0] : { past_bookings: 0, no_show_count: 0, cancellations: 0 };

        // Format time for AI
        const formatTime12h = (t) => {
            if (!t) return '';
            const [h, m] = t.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
        };
        const timeRange = `${formatTime12h(slot.startTime)} – ${formatTime12h(slot.endTime)}`;

        const aiRecommendation = await analyzeBookingAndGenerateMessage({
            userName,
            date: new Date(slot.date).toLocaleDateString(),
            time: timeRange,
            location: booking.turfLocation,
            booking_id: booking._id
        }, userHistory);

        if (aiRecommendation) {
            booking.aiRiskLevel = aiRecommendation.risk_level;
            await booking.save();
        }
    } catch (error) {
        console.error('AI Risk Analysis Error:', error);
    }

    // Notify Admin (for all non-admin platforms)
    if (platform !== 'admin') {
        try {
            const slotDateStr = new Date(slot.date).toLocaleDateString();
            const formatTime12h = (t) => {
                if (!t) return '';
                const [h, m] = t.split(':').map(Number);
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
            };
            const timeRange = `${formatTime12h(slot.startTime)} – ${formatTime12h(slot.endTime)}`;

            const { sendAdminNotification } = require('./whatsapp');
            await sendAdminNotification(userName, userPhone, slotDateStr, timeRange, slotPrice, booking._id, confirmationAmount);
        } catch (err) {
            console.error('Admin Notification Error:', err.message);
        }
    }

    // Send WhatsApp to User (Confirmation for admin, Pending for others if preferred)
    if (platform === 'admin') {
        try {
            const slotDateStr = new Date(slot.date).toLocaleDateString();
            const formatTime12h = (t) => {
                if (!t) return '';
                const [h, m] = t.split(':').map(Number);
                const ampm = h >= 12 ? 'PM' : 'AM';
                const h12 = h % 12 || 12;
                return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
            };
            const timeRange = `${formatTime12h(slot.startTime)} – ${formatTime12h(slot.endTime)}`;

            await sendConfirmationMessage(userPhone, userName, slotDateStr, timeRange, booking._id, booking.turfLocation);
            booking.whatsappNotified = true;
            await booking.save();
        } catch (err) {
            console.error('WhatsApp Notification Error:', err.message);
        }
    }

    return booking;
};

module.exports = {
    createBookingEntry
};
