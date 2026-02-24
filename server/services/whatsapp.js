const axios = require('axios');
const WhatsAppLog = require('../models/WhatsAppLog');

// Meta WhatsApp Cloud API credentials from .env
const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WA_ACCESS_TOKEN?.trim();
const API_VERSION = 'v20.0';
const META_API_URL = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

console.log('🚀 WhatsApp Service Initialized: Using Meta Cloud API');
if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
  console.log('⚠️ WhatsApp Warning: Meta Credentials missing in .env');
} else {
  console.log(`📡 WhatsApp Config: Version ${API_VERSION}, Token Length: ${ACCESS_TOKEN.length} chars`);
}


// ─── Core send function ───────────────────────────────────────────────────────
const sendWhatsAppNotification = async (phoneNumber, message, bookingId = null, messageType = 'custom') => {
  // Clean and format phone number to E.164 (e.g. 919876543210)
  let cleaned = phoneNumber.toString().replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  else if (cleaned.length === 11 && cleaned.startsWith('0')) cleaned = '91' + cleaned.substring(1);
  // Remove leading '+' if present (Meta API wants digits only)
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);

  // If Meta credentials are not set, do a mock log
  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    console.log(`[Mock WhatsApp] To: +${cleaned}\nMessage: ${message}`);
    try {
      await WhatsAppLog.create({
        booking: bookingId,
        userPhone: `+${cleaned}`,
        messageType,
        status: 'sent',
        messageSid: 'mock-no-credentials',
        body: message
      });
    } catch (_) { }
    return { success: true, messageSid: 'mock-no-credentials' };
  }

  try {
    const response = await axios.post(
      META_API_URL,
      {
        messaging_product: 'whatsapp',
        to: cleaned,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const msgId = response.data?.messages?.[0]?.id || 'unknown';
    console.log(`✅ WhatsApp Sent to +${cleaned}. ID: ${msgId}`);

    await WhatsAppLog.create({
      booking: bookingId,
      userPhone: `+${cleaned}`,
      messageType,
      status: 'sent',
      messageSid: msgId,
      body: message
    });

    return { success: true, messageSid: msgId };
  } catch (error) {
    const errMsg = error.response?.data?.error?.message || error.message;
    console.error(`❌ WhatsApp Failed to +${cleaned}:`, errMsg);

    await WhatsAppLog.create({
      booking: bookingId,
      userPhone: `+${cleaned}`,
      messageType,
      status: 'failed',
      error: errMsg,
      body: message
    });

    return { success: false, error: errMsg };
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

  let cleaned = userPhone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) cleaned = '91' + cleaned;

  const waLink = `https://wa.me/${cleaned}?text=${encodeURIComponent(`Hello ${userName}, ✅ Your booking for ${slotDate} at ${timeRange} is CONFIRMED! See you on the turf 🏟️`)}`;

  const message =
    `📢 *NEW BOOKING RECEIVED*\n\n` +
    `👤 User: ${userName}\n` +
    `📞 Phone: +${cleaned}\n` +
    `📅 Date: ${slotDate}\n` +
    `⏰ Time: ${timeRange}\n` +
    `💰 Amount: ₹${amount}\n\n` +
    `🔗 Quick WhatsApp reply:\n${waLink}`;

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
