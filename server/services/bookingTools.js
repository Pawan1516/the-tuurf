const Slot = require('../models/Slot');
const { createBookingEntry } = require('./bookingService');

/**
 * Check if a cricket slot is available for a specific date and time 
 * between 7 AM and 11 PM. Returns availability status and alternative slots if unavailable.
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format
 */
const checkAvailability = async (date, time) => {
    try {
        const [hours, minutes] = time.split(':').map(Number);

        // Check operating hours from config
        const openHour = parseInt(process.env.TURF_OPEN_HOUR) || 7;
        const closeHour = parseInt(process.env.TURF_CLOSE_HOUR) || 23;

        if (hours < openHour || hours >= closeHour) {
            return {
                available: false,
                message: `Requested time is outside operating hours (${openHour} AM - ${closeHour % 12 || 12} PM)`,
                alternativeSlots: []
            };
        }

        // Check for ANY booked slots or holds that overlap with this 1-hour window
        const endHour = hours + 1;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        const existingBooking = await Slot.findOne({
            date,
            $or: [
                {
                    $and: [
                        { startTime: { $lt: endTime } },
                        { endTime: { $gt: time } }
                    ]
                }
            ],
            status: { $in: ['booked', 'hold'] }
        });

        if (!existingBooking) {
            return {
                available: true,
                message: `Slot is available on ${date} at ${time}`,
                date,
                time
            };
        }

        // Generate alternatives (next 3 available slots)
        const alternatives = [];
        const startHour = hours;

        for (let h = openHour; h < closeHour; h++) {
            if (h === startHour) continue;
            const t = `${String(h).padStart(2, '0')}:00`;
            const booked = await Slot.findOne({
                date,
                startTime: t,
                status: { $in: ['booked', 'hold'] }
            });
            if (!booked) {
                alternatives.push(t);
            }
            if (alternatives.length >= 3) break;
        }

        return {
            available: false,
            message: `Sorry, that time is already booked.`,
            alternativeSlots: alternatives
        };
    } catch (error) {
        console.error('Error in checkAvailability tool:', error);
        throw error;
    }
};

/**
 * Book a confirmed cricket slot.
 * @param {string} name - Full Name
 * @param {string} phone - Phone Number
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Time in HH:MM format
 */
const bookSlot = async (name, phone, date, time) => {
    try {
        // Calculate end time (default 1 hour)
        const [h, m] = time.split(':').map(Number);
        const endH = h + 1;
        const endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        // Calculate amount based on config
        const transitionHour = parseInt(process.env.PRICE_TRANSITION_HOUR) || 18;
        const priceDay = parseInt(process.env.PRICE_DAY) || 500;
        const priceNight = parseInt(process.env.PRICE_NIGHT) || 700;

        const amount = h < transitionHour ? priceDay : priceNight;

        const booking = await createBookingEntry({
            userName: name,
            userPhone: phone,
            amount,
            date,
            startTime: time,
            endTime,
            platform: 'whatsapp'
        });

        return {
            success: true,
            bookingId: booking._id,
            message: `Booking created successfully. ID: ${booking._id}`
        };
    } catch (error) {
        console.error('Error in bookSlot tool:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

module.exports = {
    checkAvailability,
    bookSlot
};
