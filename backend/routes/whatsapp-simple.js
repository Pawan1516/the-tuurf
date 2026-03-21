const express = require('express');
const router = express.Router();
const axios = require('axios');

const WA_PHONE_ID = process.env.WA_PHONE_NUMBER_ID;
const WA_TOKEN = process.env.WA_ACCESS_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Simple conversation state
const sessions = {};

// Initialize user session
function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      name: '',
      phone: '',
      date: '',
      time: '',
      stage: 0
    };
  }
  return sessions[userId];
}

// WhatsApp Webhook (POST)
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('📱 WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Handle status updates
    if (body.entry?.[0]?.changes?.[0]?.value?.statuses) {
      console.log('📊 Status update (ignoring)');
      return res.status(200).send('OK');
    }

    // Extract message
    if (!body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      return res.status(200).send('OK');
    }

    const msg = body.entry[0].changes[0].value.messages[0];
    const userId = msg.from;
    const userText = msg.text?.body || '';

    console.log(`💬 From ${userId}: ${userText}`);

    // Get response
    const reply = await handleMessage(userText, userId);
    console.log(`📤 Reply: ${reply}`);

    // Send reply
    await sendWhatsApp(userId, reply);

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// WhatsApp Webhook (GET - for verification)
router.get('/webhook', (req, res) => {
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔐 Webhook verification:', { token, challenge });

  if (token === 'cricket_booking_token') {
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Unauthorized');
  }
});

// Handle message and get response
async function handleMessage(text, userId) {
  const session = getSession(userId);
  const msg = text.toLowerCase().trim();

  // Stage 0: Greeting
  if (session.stage === 0 && (msg === 'hi' || msg === 'hello' || msg.includes('book'))) {
    session.stage = 1;
    return '🏏 Welcome to The Turf Cricket Booking!\n\nWhat is your name?';
  }

  // Stage 1: Get name
  if (session.stage === 1 && text.length > 0) {
    session.name = text;
    session.stage = 2;
    return `Hi ${session.name}! 👋\n\nWhat is your phone number? (10 digits)`;
  }

  // Stage 2: Get phone
  if (session.stage === 2) {
    if (/^\d{10}$/.test(text)) {
      session.phone = text;
      session.stage = 3;
      return `Great! 📱\n\nWhat date would you like? (YYYY-MM-DD)`;
    } else {
      return '❌ Please enter a valid 10-digit phone number.';
    }
  }

  // Stage 3: Get date
  if (session.stage === 3) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const bookDate = new Date(text);
      const today = new Date();
      if (bookDate > today) {
        session.date = text;
        session.stage = 4;
        return `Noted! 📅\n\nWhat time? (HH:MM, like 14:30)`;
      } else {
        return '❌ Please choose a future date.';
      }
    } else {
      return '❌ Invalid format. Use YYYY-MM-DD';
    }
  }

  // Stage 4: Get time
  if (session.stage === 4) {
    if (/^\d{2}:\d{2}$/.test(text)) {
      const [h, m] = text.split(':').map(Number);
      if (h >= 7 && h < 23 && m >= 0 && m < 60) {
        session.time = text;
        const bookingId = 'CRK' + Date.now();
        
        const confirmation = `✅ Booking Confirmed!\n\nName: ${session.name}\nPhone: ${session.phone}\nDate: ${session.date}\nTime: ${session.time}\nBooking ID: ${bookingId}\n\nThank you for booking! 🏏`;
        
        // Reset for next booking
        sessions[userId] = { name: '', phone: '', date: '', time: '', stage: 0 };
        
        return confirmation;
      } else {
        return '❌ Time must be between 07:00 and 23:00.';
      }
    } else {
      return '❌ Invalid format. Use HH:MM (24-hour)';
    }
  }

  // Default: restart or ask to say hi
  if (msg === 'start' || msg === 'restart') {
    sessions[userId] = { name: '', phone: '', date: '', time: '', stage: 0 };
    return '🏏 Welcome to The Turf!\n\nReady to book a cricket slot? Say "Hi" to start!';
  }

  return 'I didn\'t understand. Say "hi" to book a cricket slot!';
}

// Send WhatsApp message
async function sendWhatsApp(to, text) {
  try {
    const url = `https://graph.facebook.com/v21.0/${WA_PHONE_ID}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp message sent successfully');
    return response.data;
  } catch (error) {
    console.error('❌ Error sending WhatsApp:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = router;
