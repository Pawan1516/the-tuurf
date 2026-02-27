const express = require('express');
const router = express.Router();
const { processCricBotCommand } = require('../services/aiAgent');
const Slot = require('../models/Slot');
const { createBookingEntry } = require('../services/bookingService');

/**
 * @route   POST /api/chatbot
 * @desc    Public Chatbot for customers
 * @access  Public
 */
router.post('/', async (req, res) => {
    console.log('🤖 Chatbot Request Received:', req.body.message);
    try {
        const { message, context = {} } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Message is required' });

        // Fetch context: Free slots for the next 7 days (Only if DB is connected)
        console.log('⏳ Checking DB connectivity for context...');
        let freeSlots = [];
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            try {
                freeSlots = await Slot.find({
                    date: {
                        $gte: new Date().toISOString().split('T')[0],
                        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    },
                    status: 'free'
                }).sort({ date: 1, startTime: 1 }).limit(20).lean().maxTimeMS(2000);
                console.log(`✅ Found ${freeSlots.length} free slots for context.`);
            } catch (dbError) {
                console.warn('⚠️ Slot fetch error (skipping context):', dbError.message);
            }
        } else {
            console.warn('⚠️ DB not connected (readyState: ' + mongoose.connection.readyState + '). Skipping slot context.');
        }

        // Process using CricBot System Prompt
        console.log('🧠 Processing command with CricBot AI...');
        const aiResponse = await processCricBotCommand(message, {
            availableSlots: freeSlots,
            platform: 'chatbot',
            ...context
        });

        if (!aiResponse) {
            console.error('❌ AI Response was null');
            return res.status(500).json({ success: false, message: 'CricBot is currently offline. Please try again later.' });
        }

        // Handle automated booking creation if AI detected full details
        if (aiResponse.type === 'CHATBOT_BOOKING' || aiResponse.type === 'MANUAL_BOOKING' || aiResponse.type === 'BOOKING_CONFIRMED') {
            try {
                const { name, phone, date, startTime, duration } = aiResponse.data;

                // Calculate end time and amount
                const hoursToAdd = duration.includes('2') ? 2 : 1;
                const [h, m] = startTime.split(':').map(Number);
                const endH = h + hoursToAdd;
                const endTime = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                let amount = 0;
                const priceDay = parseInt(process.env.PRICE_DAY) || 500;
                const priceNight = parseInt(process.env.PRICE_NIGHT) || 700;
                const transHour = parseInt(process.env.PRICE_TRANSITION_HOUR) || 18;

                if (hoursToAdd === 1) {
                    amount = h < transHour ? priceDay : priceNight;
                } else {
                    // 2 hour slot (simple logic: transition hour boundary)
                    if (h < transHour && endH <= transHour) amount = priceDay * 2;
                    else if (h >= transHour) amount = priceNight * 2;
                    else amount = priceDay + priceNight;
                }

                const booking = await createBookingEntry({
                    userName: name,
                    userPhone: phone,
                    amount,
                    date,
                    startTime,
                    endTime,
                    platform: 'chatbot' // Created as PENDING
                });

                console.log('✅ Pending Booking Created via Chatbot:', booking._id);

                return res.json({
                    success: true,
                    reply: aiResponse.reply,
                    type: 'BOOKING_INITIATED',
                    bookingId: booking._id
                });
            } catch (err) {
                console.error('❌ Failed to create pending booking:', err.message);
                // Fallback to chat response if booking creation fails (e.g. overlap)
            }
        }

        // Chatbot doesn't handle MANUAL_BOOKING directly for users (it should guide them to book)
        // But if the AI returns a booking flow response, we just return the reply.
        console.log('✅ AI Response received:', aiResponse.type);
        res.json({
            success: true,
            reply: aiResponse.reply,
            type: aiResponse.type
        });

    } catch (error) {
        console.error('❌ Chatbot Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
    }
});

module.exports = router;
