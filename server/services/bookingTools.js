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
const bookSlot = async (name, phone, date, time, paymentType = 'advance') => {
    try {
        // Calculate end time (default 1 hour)
        const [h, m] = time.split(':').map(Number);
        const endH = h + 1;
        const endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        // Calculate amount based on config
        const transitionHour = parseInt(process.env.PRICE_TRANSITION_HOUR) || 18;
        const priceDay = parseInt(process.env.PRICE_DAY) || 1000;
        const priceNight = parseInt(process.env.PRICE_NIGHT) || 1200;
        const priceWeekendDay = parseInt(process.env.PRICE_WEEKEND_DAY) || 1000;
        const priceWeekendNight = parseInt(process.env.PRICE_WEEKEND_NIGHT) || 1400;

        const bookingDate = new Date(date);
        const isWeekend = bookingDate.getDay() === 0 || bookingDate.getDay() === 6;
        const isDay = h < transitionHour;

        let amount;
        if (isWeekend) {
            amount = isDay ? priceWeekendDay : priceWeekendNight;
        } else {
            amount = isDay ? priceDay : priceNight;
        }

        const booking = await createBookingEntry({
            userName: name,
            userPhone: phone,
            amount,
            date,
            startTime: time,
            endTime,
            paymentType,
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

/**
 * Fetch and format free slots from the database for a given date
 * @param {string} targetDate - Date in YYYY-MM-DD format
 */
const getFreeSlots = async (targetDate) => {
    try {
        const slots = await Slot.find({
            date: targetDate,
            status: 'free'
        }).sort({ startTime: 1 });

        if (!slots || slots.length === 0) {
            return `No free slots available for ${targetDate}.`;
        }

        const morning = [];
        const afternoon = [];
        const evening = [];

        slots.forEach(slot => {
            const [h, m] = slot.startTime.split(':').map(Number);
            const start12 = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
            // Find end time string
            const endH = h + 1;
            const end12 = `${endH % 12 || 12}:00 ${endH >= 12 ? 'PM' : 'AM'}`;
            const timeRange = `${start12} - ${end12}`;

            if (h < 12) morning.push(timeRange);
            else if (h < 17) afternoon.push(timeRange);
            else evening.push(timeRange);
        });

        let output = `Available Slots for ${targetDate}:\n`;
        if (morning.length > 0) output += `✅ Morning : ${morning.join(', ')}\n`;
        if (afternoon.length > 0) output += `✅ Afternoon : ${afternoon.join(', ')}\n`;
        if (evening.length > 0) output += `✅ Evening : ${evening.join(', ')}\n`;

        return output;
    } catch (error) {
        console.error('Error fetching free slots:', error);
        return 'Unable to fetch free slots from the database at this time.';
    }
};

/**
 * Fetch and format confirmed booked slots from the database for a given date
 * @param {string} targetDate - Date in YYYY-MM-DD format
 */
const getBookedSlots = async (targetDate) => {
    try {
        const slots = await Slot.find({
            date: targetDate,
            status: { $in: ['booked', 'hold'] }
        }).sort({ startTime: 1 });

        if (!slots || slots.length === 0) {
            return `No booked slots found for ${targetDate}.`;
        }

        const slotIds = slots.map(s => s._id);
        const mongoose = require('mongoose');
        const Booking = mongoose.models.Booking || require('../models/Booking');

        const bookings = await Booking.find({
            slot: { $in: slotIds },
            bookingStatus: { $in: ['confirmed', 'hold'] }
        }).populate('slot').lean();

        if (!bookings || bookings.length === 0) {
            return `No confirmed/hold bookings found for ${targetDate}.`;
        }

        // Sort by time
        bookings.sort((a, b) => (a.slot?.startTime || '').localeCompare(b.slot?.startTime || ''));

        let output = `Booked Slots for ${targetDate}:\n`;
        bookings.forEach(b => {
            if (b.slot && b.slot.startTime) {
                const [h, m] = b.slot.startTime.split(':').map(Number);
                const start12 = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
                output += `🔴 ${start12} : ${b.userName} (+91 ${b.userPhone}) - [${b.bookingStatus.toUpperCase()}]\n`;
            }
        });

        return output;
    } catch (error) {
        console.error('Error fetching booked slots:', error);
        return 'Unable to fetch booked slots from the database at this time.';
    }
};

module.exports = {
    checkAvailability,
    bookSlot,
    getFreeSlots,
    getBookedSlots
};
