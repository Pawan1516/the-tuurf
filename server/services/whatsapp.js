const twilio = require('twilio');
const WhatsAppLog = require('../models/WhatsAppLog');

// Twilio Credentials from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_WHATSAPP_FROM; // e.g., 'whatsapp:+19204826360'

let client = null;

if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
  console.log('🚀 WhatsApp Service Initialized: Using Twilio API');
} else {
  console.log('⚠️ WhatsApp Warning: Twilio Credentials missing in .env');
}

/**
 * ─── Core send function: WhatsApp first, SMS fallback ──────────────────────────
 */
const sendWhatsAppNotification = async (phoneNumber, message, bookingId = null, messageType = 'custom', mediaUrl = null) => {
  // 1. Clean and Format recipient number
  let cleanNumber = String(phoneNumber).trim();
  if (cleanNumber.startsWith('whatsapp:')) cleanNumber = cleanNumber.substring(9);
  let digits = cleanNumber.replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits; // Default to India prefix

  const toWhatsApp = `whatsapp:+${digits}`;
  const toSMS = `+${digits}`;
  const from = fromPhone || 'whatsapp:+14155238886';

  // If Twilio client is not set, do a mock log
  if (!client) {
    console.log(`[Mock WhatsApp] To: ${toWhatsApp}\nMessage: ${message}`);
    try {
      await WhatsAppLog.create({ booking: bookingId, userPhone: toWhatsApp, messageType, status: 'sent', messageSid: 'mock-no-credentials', body: message });
    } catch (_) { }
    return { success: true, messageSid: 'mock-no-credentials' };
  }

  // ── ATTEMPT 1: WhatsApp ─────────────────────────────────────────────────
  try {
    const payload = { body: message, from, to: toWhatsApp };
    if (mediaUrl) payload.mediaUrl = [mediaUrl];
    const response = await client.messages.create(payload);
    console.log(`✅ WhatsApp→ ${toWhatsApp} | SID: ${response.sid}`);
    await WhatsAppLog.create({ booking: bookingId, userPhone: toWhatsApp, messageType, status: 'sent', messageSid: response.sid, body: `[WA] ${message}` });
    return { success: true, channel: 'whatsapp', messageSid: response.sid };
  } catch (waError) {
    // Codes 63007, 63016 = "user not in sandbox" / "not opted in"
    const isNotJoined = waError.code === 63007 || waError.code === 63016 || waError.code === 21614;
    console.warn(`⚠️ WhatsApp failed (Code ${waError.code}) for ${toWhatsApp}. ${isNotJoined ? 'Trying SMS fallback...' : 'No SMS fallback for this error.'}`);

    await WhatsAppLog.create({ booking: bookingId, userPhone: toWhatsApp, messageType, status: 'failed', error: `WA Error ${waError.code}: ${waError.message}`, body: message });

    // ── ATTEMPT 2: SMS Fallback ─────────────────────────────────────────
    const smsFrom = process.env.TWILIO_SMS_FROM;
    if (smsFrom) {
      try {
        // Strip WhatsApp-specific formatting (bold, italic markers)
        const smsBody = message.replace(/\*/g, '').replace(/_/g, '');
        const smsResponse = await client.messages.create({ body: smsBody, from: smsFrom, to: toSMS });
        console.log(`✅ SMS fallback→ ${toSMS} | SID: ${smsResponse.sid}`);
        await WhatsAppLog.create({ booking: bookingId, userPhone: toSMS, messageType, status: 'sent', messageSid: smsResponse.sid, body: `[SMS] ${smsBody}` });
        return { success: true, channel: 'sms', messageSid: smsResponse.sid };
      } catch (smsError) {
        console.error(`❌ SMS also failed for ${toSMS} | Code: ${smsError.code} | Msg: ${smsError.message}`);
        await WhatsAppLog.create({ booking: bookingId, userPhone: toSMS, messageType, status: 'failed', error: `SMS Error ${smsError.code}: ${smsError.message}`, body: message });
      }
    }

    return { success: false, error: waError.message };
  }
};

// ─── Message helpers ──────────────────────────────────────────────────────────

const sendConfirmationMessage = (phoneNumber, userName, slotDate, timeRange, bookingId, turfLocation = process.env.TURF_LOCATION || 'The Turf Stadium') => {
  const message =
    `🎉 Hello ${userName}!\n\n` +
    `✅ *Your booking at ${turfLocation} is CONFIRMED*\n` +
    `📅 Date: ${slotDate}\n` +
    `⏰ Time: ${timeRange}\n\n` +
    `See you on the turf! 🏟️\n— The Turf`;
  return sendWhatsAppNotification(phoneNumber, message, bookingId, 'confirm');
};

const sendRejectionMessage = (phoneNumber, userName, slotDate, timeRange, bookingId, turfLocation = process.env.TURF_LOCATION || 'The Turf Stadium') => {
  const message =
    `Hello ${userName},\n\n` +
    `❌ *Your booking at ${turfLocation} has been REJECTED*\n` +
    `📅 Date: ${slotDate}\n` +
    `⏰ Time: ${timeRange}\n\n` +
    `Please contact us if you have any questions.\n— The Turf`;
  return sendWhatsAppNotification(phoneNumber, message, bookingId, 'reject');
};

const sendHoldMessage = (phoneNumber, userName, slotDate, timeRange, bookingId, turfLocation = process.env.TURF_LOCATION || 'The Turf Stadium') => {
  const message =
    `Hello ${userName},\n\n` +
    `⏳ *Your booking at ${turfLocation} is on HOLD*\n` +
    `📅 Date: ${slotDate}\n` +
    `⏰ Time: ${timeRange}\n\n` +
    `We will confirm it shortly. Stay tuned!\n— The Turf`;
  return sendWhatsAppNotification(phoneNumber, message, bookingId, 'hold');
};

const sendPendingMessage = (phoneNumber, userName, slotDate, timeRange, bookingId, turfLocation = process.env.TURF_LOCATION || 'The Turf Stadium') => {
  const message =
    `Hello ${userName},\n\n` +
    `🏟️ *Booking Request Recieved for ${turfLocation}*\n` +
    `📅 Date: ${slotDate}\n` +
    `⏰ Time: ${timeRange}\n\n` +
    `Please complete the payment to confirm your slot.\n— The Turf`;
  return sendWhatsAppNotification(phoneNumber, message, bookingId, 'pending');
};

const sendAdminNotification = async (userName, userPhone, slotDate, timeRange, amount, bookingId) => {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) return;

  const message =
    `📢 *NEW BOOKING RECEIVED*\n\n` +
    `👤 User: ${userName}\n` +
    `📞 Phone: ${userPhone}\n` +
    `📅 Date: ${slotDate}\n` +
    `⏰ Time: ${timeRange}\n` +
    `💰 Amount: ₹${amount}`;

  return sendWhatsAppNotification(adminPhone, message, bookingId, 'admin');
};

const sendWorkerNotification = (workerPhone, workerName, userName, slotDate, timeRange, bookingId) => {
  const message =
    `👋 Hi ${workerName},\n\n` +
    `📋 *New Booking Assigned!*\n` +
    `👤 User: ${userName}\n` +
    `📅 Date: ${slotDate}\n` +
    `⏰ Time: ${timeRange}\n\n` +
    `Please be ready at the turf. 🏆\n— The Turf Admin`;
  return sendWhatsAppNotification(workerPhone, message, bookingId, 'worker');
};

module.exports = {
  sendWhatsAppNotification,
  sendConfirmationMessage,
  sendRejectionMessage,
  sendHoldMessage,
  sendPendingMessage,
  sendAdminNotification,
  sendWorkerNotification
};
