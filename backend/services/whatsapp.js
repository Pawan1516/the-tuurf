const twilio = require('twilio');
const WhatsAppLog = require('../models/WhatsAppLog');
const fetch = require('node-fetch');

// ─── Twilio Config ───────────────────────────────────────────────────────────
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_WHATSAPP_FROM; // e.g., 'whatsapp:+19204826360'

let client = null;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
  console.log('🚀 WhatsApp Service: Twilio Ready');
}

// ─── Fast2SMS / Meta Cloud API Config ─────────────────────────────────────────
const fast2smsKey = process.env.FAST2SMS_AUTH_KEY;
const fast2smsPhoneId = process.env.FAST2SMS_PHONE_ID;
const fast2smsVersion = process.env.FAST2SMS_VERSION || 'v21.0';

if (fast2smsKey && fast2smsPhoneId) {
  console.log('🚀 WhatsApp Service: Fast2SMS/Meta Ready');
}

if (!client && !fast2smsKey) {
  console.log('⚠️ WhatsApp Warning: No valid Messaging Provider (Twilio/Fast2SMS) in .env');
}

/**
 * ─── Core send function: WhatsApp first, SMS fallback ──────────────────────────
 */
const sendWhatsAppNotification = async (phoneNumber, message, bookingId = null, messageType = 'custom', mediaUrl = null, options = null) => {
  // 1. Clean and Format recipient number
  let cleanNumber = String(phoneNumber).trim();
  if (cleanNumber.startsWith('whatsapp:')) cleanNumber = cleanNumber.substring(9);
  let digits = cleanNumber.replace(/\D/g, '');
  if (digits.length === 10) digits = '91' + digits; // Default to India prefix

  const toWhatsApp = `whatsapp:+${digits}`; // For Twilio
  const toMeta = `+${digits}`;              // For Fast2SMS / Meta
  const toSMS = `+${digits}`;               // For SMS Fallback

  // ── ATTEMPT: Meta Cloud / Fast2SMS ─────────────────────────────────────
  if (fast2smsKey && fast2smsPhoneId) {
    try {
      const url = `https://www.fast2sms.com/dev/whatsapp/${fast2smsVersion}/${fast2smsPhoneId}/messages`;
      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: toMeta,
        type: (options && options.contentSid) ? "template" : "text",
        ...(options && options.contentSid ? {
          template: {
            name: options.contentSid, // In our app, we map contentSid to template name
            language: { code: "en" },
            components: options.contentVariables ? [
              {
                type: "body",
                parameters: Object.entries(JSON.parse(options.contentVariables)).map(([_, val]) => ({ type: "text", text: String(val) }))
              }
            ] : []
          }
        } : {
          text: { preview_url: true, body: message }
        })
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': fast2smsKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (response.ok && resData.message_id) {
        console.log(`✅ Fast2SMS→ ${toMeta} | ID: ${resData.message_id}`);
        await WhatsAppLog.create({ booking: bookingId, userPhone: toMeta, messageType, status: 'sent', messageSid: resData.message_id, body: `[Meta] ${message}` });
        return { success: true, channel: 'fast2sms', messageSid: resData.message_id };
      } else {
        throw new Error(resData.message || resData.error || 'Fast2SMS dispatch error');
      }
    } catch (fastErr) {
      console.warn(`⚠️ Fast2SMS failed: ${fastErr.message}. ${client ? 'Falling back to Twilio...' : ''}`);
    }
  }

  // ── ATTEMPT: Twilio ───────────────────────────────────────────────────
  if (client) {
    try {
      const from = fromPhone || 'whatsapp:+14155238886';
      const payload = { from, to: toWhatsApp };
      if (options && options.contentSid) {
        payload.contentSid = options.contentSid;
        payload.contentVariables = options.contentVariables;
      } else {
        payload.body = message;
      }
      if (mediaUrl) payload.mediaUrl = [mediaUrl];
      const response = await client.messages.create(payload);
      console.log(`✅ Twilio→ ${toWhatsApp} | SID: ${response.sid}`);
      await WhatsAppLog.create({ booking: bookingId, userPhone: toWhatsApp, messageType, status: 'sent', messageSid: response.sid, body: `[Twilio] ${message}` });
      return { success: true, channel: 'twilio', messageSid: response.sid };
    } catch (waError) {
      const isNotJoined = waError.code === 63007 || waError.code === 63016 || waError.code === 21614;
      console.warn(`⚠️ Twilio WhatsApp failed (Code ${waError.code}) for ${toWhatsApp}. ${isNotJoined ? 'Trying SMS fallback...' : 'No SMS fallback for this error.'}`);
      
      await WhatsAppLog.create({ booking: bookingId, userPhone: toWhatsApp, messageType, status: 'failed', error: `WA Error ${waError.code}: ${waError.message}`, body: message });

      // ── ATTEMPT: SMS Fallback ─────────────────────────────────────────
      const smsFrom = process.env.TWILIO_SMS_FROM;
      if (smsFrom && isNotJoined) {
        try {
          const smsBody = message.replace(/\*/g, '').replace(/_/g, '');
          const smsResponse = await client.messages.create({ body: smsBody, from: smsFrom, to: toSMS });
          console.log(`✅ SMS fallback→ ${toSMS} | SID: ${smsResponse.sid}`);
          await WhatsAppLog.create({ booking: bookingId, userPhone: toSMS, messageType, status: 'sent', messageSid: smsResponse.sid, body: `[SMS] ${smsBody}` });
          return { success: true, channel: 'sms', messageSid: smsResponse.sid };
        } catch (smsError) {
          console.error(`❌ SMS failed for ${toSMS} | Code: ${smsError.code} | Msg: ${smsError.message}`);
          await WhatsAppLog.create({ booking: bookingId, userPhone: toSMS, messageType, status: 'failed', error: `SMS Error ${smsError.code}: ${smsError.message}`, body: message });
        }
      }
    }
  }

  // If both failed or are missing
  console.log(`[Mock WhatsApp] To: ${toWhatsApp}\nMessage: ${message}`);
  try {
    await WhatsAppLog.create({ booking: bookingId, userPhone: toWhatsApp, messageType, status: 'failed', body: message, error: 'All providers failed or missing credentials.' });
  } catch (_) { }
  return { success: false, error: 'No messaging provider configured or all failed.' };
};

// ─── Message helpers ──────────────────────────────────────────────────────────

const sendConfirmationMessage = (phoneNumber, userName, slotDate, timeRange, bookingId, turfLocation = process.env.TURF_LOCATION || 'The Turf Stadium') => {
  const message =
    `🎉 Hello ${userName}!\n\n` +
    `✅ *Your booking at ${turfLocation} is CONFIRMED*\n` +
    `📅 Date: ${slotDate}\n` +
    `⏰ Time: ${timeRange}\n\n` +
    `See you on the turf! 🏟️\n— The Turf`;
  return sendWhatsAppNotification(phoneNumber, message, bookingId, 'confirm', null, {
    contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e',
    contentVariables: JSON.stringify({ "1": String(slotDate), "2": String(timeRange) })
  });
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

const sendAdminNotification = async (userName, userPhone, slotDate, timeRange, totalAmount, bookingId, advanceAmount = null) => {
  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) return;

  let amountStr = `₹${totalAmount}`;
  if (advanceAmount) {
    amountStr = `₹${totalAmount} (Advance: ₹${advanceAmount})`;
  }

  const message =
    `📢 *NEW BOOKING RECEIVED*\n\n` +
    `👤 User: ${userName}\n` +
    `📞 Phone: ${userPhone}\n` +
    `📅 Date: ${slotDate}\n` +
    `⏰ Time: ${timeRange}\n` +
    `💰 Amount: ${amountStr}`;

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
