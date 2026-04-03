const express = require('express');
const router = express.Router();
const { processCricBotCommand } = require('../services/aiAgent');
const { sendWhatsAppNotification } = require('../services/whatsapp');
const { generateUPIQRCode } = require('../services/payment');
const Booking = require('../models/Booking');

/**
 * @route   POST /api/whatsapp/webhook
 * @desc    Receive WhatsApp Messages from Twilio
 */
router.post('/webhook', async (req, res) => {
    // Twilio sends data in x-www-form-urlencoded format
    const body = req.body;
    const fromFull = body.From; // e.g. 'whatsapp:+917993962018'
    const text = body.Body || '';
    const numMedia = parseInt(body.NumMedia || '0');

    if (!fromFull) return res.sendStatus(200);

    // Clean 'whatsapp:' prefix for DB lookup/Phone identification if needed
    // However, our new whatsapp.js handles the prefix, so we can pass fromFull as userId
    const userPhone = fromFull.replace('whatsapp:', '');

    console.log(`📡 [Twilio Automachine] WhatsApp Event from ${fromFull}`);

    try {
        // 1. AUTOMATED SCREENSHOT HANDLING
        if (numMedia > 0) {
            console.log(`📸 [Automachine] Media received from ${fromFull}`);
            // Check if it's an image
            const mediaType = body.MediaContentType0 || '';
            if (mediaType.startsWith('image/')) {
                const lastBooking = await Booking.findOne({ userPhone: userPhone, paymentStatus: 'pending' }).sort({ createdAt: -1 });

                if (lastBooking) {
                    lastBooking.paymentStatus = 'submitted';
                    lastBooking.transactionId = `TWILIO_IMG_${body.MessageSid}`;
                    await lastBooking.save();

                    await sendWhatsAppNotification(fromFull, "📸 *Screenshot Received!* \n\nThank you! Our system has automatically received your payment proof. Our team will verify it and send your final confirmation shortly. 🕒🥅");
                } else {
                    await sendWhatsAppNotification(fromFull, "👋 We received your image! If this is a payment screenshot, please make sure you have an active booking request first by typing 'Book'.");
                }
                return res.sendStatus(200);
            }
        }

        // 2. TEXT PROCESSING
        if (!text) return res.sendStatus(200);

        // Automated UTR/Transaction ID detection in text
        if (text.length >= 10 && (/\d{10,}/.test(text) || text.toLowerCase().includes('utr'))) {
            const lastBooking = await Booking.findOne({ userPhone: userPhone, paymentStatus: 'pending' }).sort({ createdAt: -1 });
            if (lastBooking) {
                lastBooking.paymentStatus = 'submitted';
                lastBooking.transactionId = text.match(/\d{10,}/)?.[0] || text;
                await lastBooking.save();

                await sendWhatsAppNotification(fromFull, "✅ *Transaction Details Logged!* \n\nOur system is now verifying your payment. You will receive a notification once the slot is confirmed! 🏏");
                return res.sendStatus(200);
            }
        }

        // 3. AI AGENT AUTOMATION
        // Pass 'fromFull' as userId to maintain session with the 'whatsapp:' prefix
        const aiResponse = await processCricBotCommand(text, {
            platform: 'whatsapp',
            userPhone: userPhone
        }, fromFull);

        if (!aiResponse) return res.sendStatus(200);

        // Handle Automated Booking Confirmation
        if (aiResponse.type === 'BOOKING_CONFIRMED') {
            const bookingInfo = aiResponse.bookingInfo;
            await sendWhatsAppNotification(fromFull, aiResponse.reply);

            const qrResult = await generateUPIQRCode(bookingInfo.amount || 500, bookingInfo.bookingId);
            if (qrResult.success) {
                const paymentMsg = `💳 *Automated Payment Instructions:* \n\n` +
                    `Please pay *₹${bookingInfo.amount || 500}* to lock your slot.\n\n` +
                    `🔗 *Direct UPI Link:* ${qrResult.upiLink}\n\n` +
                    `Booking ID: ${bookingInfo.bookingId}\n` +
                    `Reply with a *Screenshot* or *UTR* to finish! ✅`;
                await sendWhatsAppNotification(fromFull, paymentMsg);
            }
        } else {
            // Standard AI Reply
            await sendWhatsAppNotification(fromFull, aiResponse.reply);
        }

    } catch (err) {
        console.error('❌ [Twilio Automachine] Process Error:', err.message);
    }

    return res.sendStatus(200);
});

/**
 * @route   POST /api/whatsapp/fast2sms
 * @desc    Receive WhatsApp Events from Fast2SMS / Meta Simplified Direct
 */
router.post('/fast2sms', async (req, res) => {
    const { whatsapp_reports } = req.body;
    
    if (!whatsapp_reports || !Array.isArray(whatsapp_reports)) {
        return res.status(400).json({ success: false, message: 'Invalid payload: whatsapp_reports array expected' });
    }

    console.log(`📡 [Fast2SMS Webhook] Processing ${whatsapp_reports.length} report(s)`);

    for (const report of whatsapp_reports) {
        try {
            const { type, from, body, status, recipient_id, message_id, media_url } = report;

            if (type === 'incoming_message') {
                const userPhone = from; // format like "919876543210"
                const formattedPhone = `whatsapp:+${userPhone}`;
                const text = body || '';

                console.log(`📥 [Incoming] ${formattedPhone}: ${text}`);

                // 1. Handle Screenshots (if media_url is present)
                if (media_url) {
                    const lastBooking = await Booking.findOne({ userPhone: userPhone, paymentStatus: 'pending' }).sort({ createdAt: -1 });
                    if (lastBooking) {
                        lastBooking.paymentStatus = 'submitted';
                        lastBooking.transactionId = `WA_IMG_${message_id}`;
                        await lastBooking.save();
                        await sendWhatsAppNotification(formattedPhone, "📸 *Screenshot Received!* \n\nThank you! We've received your payment proof via our automated system. Verification in progress. 🕒🥅");
                    }
                }

                // 2. Handle Text (AI Processing)
                if (text) {
                    // Check for UTR/Transaction ID
                    if (text.length >= 10 && (/\d{10,}/.test(text) || text.toLowerCase().includes('utr'))) {
                        const lastBooking = await Booking.findOne({ userPhone: userPhone, paymentStatus: 'pending' }).sort({ createdAt: -1 });
                        if (lastBooking) {
                            lastBooking.paymentStatus = 'submitted';
                            lastBooking.transactionId = text.match(/\d{10,}/)?.[0] || text;
                            await lastBooking.save();
                            await sendWhatsAppNotification(formattedPhone, "✅ *Transaction Logged!* \n\nOur system is now verifying your payment. Confirmation incoming! 🏏");
                            continue;
                        }
                    }

                    // Process with AI
                    const aiResponse = await processCricBotCommand(text, { platform: 'fast2sms', userPhone: userPhone }, formattedPhone);
                    if (aiResponse) {
                        await sendWhatsAppNotification(formattedPhone, aiResponse.reply);
                        
                        if (aiResponse.type === 'BOOKING_CONFIRMED') {
                            const bInfo = aiResponse.bookingInfo;
                            const qrRes = await generateUPIQRCode(bInfo.amount || 500, bInfo.bookingId);
                            if (qrRes.success) {
                                const payMsg = `💳 *Payment Link:* ${qrRes.upiLink}\n\nScan QR or use link to pay ₹${bInfo.amount || 500}. Reply with Screenshot to finish! ✅`;
                                await sendWhatsAppNotification(formattedPhone, payMsg);
                            }
                        }
                    }
                }
            } else if (type === 'status_update') {
                console.log(`📝 [Status] Msg ${message_id || report.request_id} for ${recipient_id}: ${status}`);
                // Update internal logs if you have a WhatsAppLog model
                const WhatsAppLog = require('../models/WhatsAppLog');
                if (WhatsAppLog) {
                    await WhatsAppLog.findOneAndUpdate(
                        { messageSid: message_id || report.request_id },
                        { status: status.toLowerCase(), status_description: report.status_description },
                        { upsert: false }
                    );
                }
            }
        } catch (err) {
            console.error('❌ [Fast2SMS] Item Error:', err.message);
        }
    }

    res.json({ success: true });
});

module.exports = router;
