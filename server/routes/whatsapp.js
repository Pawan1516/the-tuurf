const express = require('express');
const router = express.Router();
const { processCricBotCommand } = require('../services/aiAgent');
const { sendWhatsAppNotification } = require('../services/whatsapp');
const { generateUPIQRCode } = require('../services/payment');
const Booking = require('../models/Booking');
const Slot = require('../models/Slot');

/**
 * @route   GET /api/whatsapp/webhook
 * @desc    Verify WhatsApp Webhook (Meta requirement)
 */
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || 'cricket_booking_token';

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('✅ WhatsApp Webhook Verified');
        return res.status(200).send(challenge);
    } else {
        console.warn('❌ WhatsApp Webhook Verification Failed');
        return res.sendStatus(403);
    }
});

/**
 * @route   POST /api/whatsapp/webhook
 * @desc    Receive WhatsApp Messages
 */
router.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        if (
            body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0].value.messages &&
            body.entry[0].changes[0].value.messages[0]
        ) {
            const msg = body.entry[0].changes[0].value.messages[0];
            const from = msg.from; // Sender's phone number
            const text = msg.text ? msg.text.body : '';

            if (!text) return res.sendStatus(200);

            console.log(`💬 WhatsApp Received from ${from}: "${text}"`);

            try {
                // 1. Check for UTR / Transaction ID (Simple keyword matching for immediate receipt)
                if ((text.length >= 10 && /\d{10,}/.test(text) || text.toLowerCase().includes('utr') || text.toLowerCase().includes('trans')) && require('mongoose').connection.readyState === 1) {
                    // Find the latest pending booking for this user
                    const lastBooking = await Booking.findOne({ userPhone: from, paymentStatus: 'pending' }).sort({ createdAt: -1 });
                    if (lastBooking) {
                        lastBooking.paymentStatus = 'submitted';
                        lastBooking.transactionId = text.match(/\d{10,}/)?.[0] || text;
                        await lastBooking.save();

                        await sendWhatsAppNotification(from, "✅ *Payment Received & Submitted!* \n\nOur team is verifying your Transaction ID/UTR. You will receive a final confirmation message shortly. 👋🏏");
                        return res.sendStatus(200);
                    }
                }

                // 2. Process message using CricBot AI
                const aiResponse = await processCricBotCommand(text, {
                    platform: 'whatsapp',
                    userPhone: from,
                    chatHistory: [] // Future: Load from WhatsAppLog
                });

                if (!aiResponse) return res.sendStatus(200);

                // 3. Handle Booking Confirmation
                if (aiResponse.type === 'BOOKING_CONFIRMED') {
                    const bookingInfo = aiResponse.bookingInfo;

                    // Send AI's reply first
                    await sendWhatsAppNotification(from, aiResponse.reply);

                    // Generate and send UPI details
                    const qrResult = await generateUPIQRCode(bookingInfo.amount || 500, bookingInfo.bookingId);
                    if (qrResult.success) {
                        const paymentMsg = `💳 *Payment Required to Confirm:* \n\n` +
                            `Please pay *₹${bookingInfo.amount || 500}* via UPI to lock your slot.\n\n` +
                            `🔗 *UPI Link:* ${qrResult.upiLink}\n\n` +
                            `ID: ${bookingInfo.bookingId}\n\n` +
                            `⚠️ Slot held for *15 minutes*.\n` +
                            `Reply with *UTR number* or *screenshot* after paying! ✅`;

                        await sendWhatsAppNotification(from, paymentMsg);
                    }
                } else {
                    // Regular Chat Response
                    await sendWhatsAppNotification(from, aiResponse.reply);
                }

            } catch (err) {
                console.error('❌ WhatsApp Process Error:', err.message);
            }
        }
        return res.sendStatus(200);
    } else {
        return res.sendStatus(404);
    }
});

module.exports = router;
