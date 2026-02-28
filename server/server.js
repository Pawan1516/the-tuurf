require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const twilio = require('twilio');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const data = require('./data');
const messages = require('./messages');
const agent = require('./agent');
const { generateBookingPass } = require('./qrgen');
const WhatsAppBooking = require('./models/WhatsAppBooking');
const Booking = require('./models/Booking');
const Slot = require('./models/Slot');
const cors = require('cors');
const { sendWhatsAppNotification } = require('./services/whatsapp');

// original routes
const authRoutes = require('./routes/auth');
const slotRoutes = require('./routes/slots');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payments');
const chatbotRoutes = require('./routes/chatbot');
const whatsappRoutes = require('./routes/whatsapp');

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Mount original routes
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Twilio Client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const ownerPhone = process.env.OWNER_WHATSAPP || process.env.ADMIN_PHONE || '';

/**
 * ─── HELPER: Send WhatsApp (DEPRECATED - Use services/whatsapp) ────
 */
async function sendWA(to, body, mediaUrl = null) {
  return sendWhatsAppNotification(to, body, null, 'custom', mediaUrl);
}

/**
 * ─── WHATSAPP WEBHOOK (Twilio) ───────────────────────────────
 */
app.post('/webhook', async (req, res) => {
  const fromFull = req.body.From; // e.g. whatsapp:+91799...
  const from = fromFull.replace('whatsapp:', '');
  const body = req.body.Body.trim();
  const cmd = body.toLowerCase();

  // 1. Session Management
  let session = data.sessions[from] || { step: 'welcome' };

  // 2. Global Commands
  if (cmd === 'hi' || cmd === 'hello' || cmd === 'menu' || cmd === 'start') {
    session = { step: 'welcome' };
  } else if (cmd === 'pricing') {
    await sendWA(from, messages.pricing(data.sports));
    return res.sendStatus(200);
  } else if (cmd === 'help') {
    await sendWA(from, messages.help());
    return res.sendStatus(200);
  } else if (cmd === 'my bookings') {
    const userBookings = data.bookings.filter(b => b.userPhone === from);
    if (userBookings.length === 0) {
      await sendWA(from, "🏟️ You have no active bookings! Say *Book* to start.");
    } else {
      let info = userBookings.map(b => `🎫 ${b.id}: ${b.sport} | ${b.slot} [${b.status.toUpperCase()}]`).join('\n');
      await sendWA(from, `🎫 *YOUR BOOKINGS:*\n\n${info}`);
    }
    return res.sendStatus(200);
  } else if (cmd === 'book' || cmd === 'slots') {
    session = { step: 'choose_sport' };
  }

  // 3. Main Conversation Flow
  try {
    switch (session.step) {
      case 'welcome':
        await sendWA(from, messages.welcome());
        session.step = 'idle';
        break;

      case 'choose_sport':
        await sendWA(from, messages.sportChoice());
        session.step = 'awaiting_sport';
        break;

      case 'awaiting_sport':
        const sportKey = Object.keys(data.sports).find(k => body.toLowerCase().includes(k));
        if (sportKey) {
          session.sport = data.sports[sportKey];
          await sendWA(from, messages.slotChoice(session.sport.name, data.slots));
          session.step = 'awaiting_slot';
        } else {
          await sendWA(from, "🏟️ Sorry, what sport? (Football, Cricket, Basketball, Badminton)");
        }
        break;

      case 'awaiting_slot':
        const slot = data.slots.find(s => s.id == body);
        if (slot && slot.available) {
          session.slot = slot;
          await sendWA(from, messages.askName());
          session.step = 'awaiting_name';
        } else {
          await sendWA(from, "🏟️ Invalid slot! Pick a number (e.g. 1)");
        }
        break;

      case 'awaiting_name':
        session.name = body;
        await processBooking(from, session);
        session = { step: 'idle' };
        break;

      default:
        if (session.step === 'idle' && !['hi', 'hello', 'menu', 'start', 'book', 'slots'].includes(cmd)) {
          await sendWA(from, "🏟️ Unknown command. Reply *Menu* to see options.");
        }
        break;
    }
  } catch (e) {
    console.error('Bot Flow Error:', e);
  }

  data.sessions[from] = session;
  res.sendStatus(200);
});

async function processBooking(phone, session) {
  const bookingId = `TRF${Math.floor(10000 + Math.random() * 90000)}`;
  const newBooking = {
    id: bookingId,
    userPhone: phone,
    userName: session.name,
    sport: session.sport.name,
    slot: session.slot.time,
    amount: session.sport.price,
    status: 'pending',
    timestamp: new Date(),
    log: [{ time: new Date(), msg: 'Booking request created.' }]
  };

  const booking = new WhatsAppBooking(newBooking);
  await booking.save();
  io.emit('new_booking', booking);

  // AI Agent Analysis
  const result = await agent.analyzeBooking(phone, session.name, session.sport.name, session.slot.id);
  booking.status = result.decision.toLowerCase();
  booking.log.push({ time: new Date(), msg: `Agent decision: ${result.decision} - ${result.reason}` });
  await booking.save();

  if (booking.status === 'confirm') {
    await finalizeBooking(booking);
  } else if (booking.status === 'hold') {
    await sendWA(phone, messages.bookingHold(session.name));
    // Auto-resolve after 15 seconds
    setTimeout(async () => {
      const isConfirmed = Math.random() < 0.65;
      booking.status = isConfirmed ? 'confirmed' : 'rejected';
      booking.log.push({ time: new Date(), msg: `Auto-resolve (15s): ${booking.status.toUpperCase()}` });
      await booking.save();

      if (isConfirmed) await finalizeBooking(booking);
      else await sendWA(phone, messages.bookingRejected(session.name, "Peak hour overflow. Please pick another slot."));

      io.emit('booking_update', booking);
    }, 15000);
  } else {
    await sendWA(phone, messages.bookingRejected(session.name, result.reason));
  }
}

async function finalizeBooking(b) {
  b.status = 'confirmed';
  await b.save();
  const qrFilename = await generateBookingPass(b.id, b.userName, b.sport, b.slot);
  const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
  const mediaUrl = `${publicUrl}/public/qrs/${qrFilename}`;

  await sendWA(b.userPhone, messages.bookingConfirmed(b.id, b.userName, b.sport, b.slot), mediaUrl);

  // Alert Owner
  if (ownerPhone) await sendWA(ownerPhone, messages.adminAlert(b.id, b.userName, b.sport, b.slot, 'confirmed'));

  io.emit('booking_update', b);
}

/**
 * ─── ADMIN API ───────────────────────────────────────────────
 */
app.post('/api/admin/auth', (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) res.sendStatus(200);
  else res.sendStatus(401);
});

const adminAuth = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth === process.env.ADMIN_PASSWORD) next();
  else res.sendStatus(401);
};

app.get('/api/admin/bookings', adminAuth, async (req, res) => {
  const bks = await WhatsAppBooking.find().sort({ timestamp: -1 });
  res.json(bks);
});

app.post('/api/admin/action', adminAuth, async (req, res) => {
  const { id, type, message } = req.body;
  const b = await WhatsAppBooking.findOne({ id });
  if (!b) return res.status(404).send('Booking not found');

  b.log.push({ time: new Date(), msg: `Admin Action: ${type.toUpperCase()}` });

  if (type === 'confirm') {
    await finalizeBooking(b);
  } else if (type === 'hold') {
    b.status = 'hold';
    await sendWA(b.userPhone, `🏟️ *ADMIN NOTE:* Your booking #${b.id} is on hold. ${message || ''}`);
  } else if (type === 'reject') {
    b.status = 'rejected';
    await sendWA(b.userPhone, messages.bookingRejected(b.userName, message || "Cancelled by admin."));
  } else if (type === 'resend') {
    // Re-generate if lost or just send existing
    const qrFilename = await generateBookingPass(b.id, b.userName, b.sport, b.slot);
    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:3000';
    await sendWA(b.userPhone, `🏟️ Re-sending your Digital Pass for #${b.id}:`, `${publicUrl}/public/qrs/${qrFilename}`);
  } else if (type === 'broadcast') {
    await sendWA(b.userPhone, `🏟️ *MESSAGE FROM THE TURF ADMIN:*\n\n${message}`);
  }

  await b.save();
  io.emit('booking_update', b);
  res.sendStatus(200);
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Root redirect
app.get('/', (req, res) => res.redirect('/admin'));

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🏟️ THE TURF — Automachine running on port ${PORT}`);
  console.log(`📡 WEBHOOK: POST /webhook`);
  console.log(`🔑 ADMIN: http://localhost:${PORT}/admin`);
});
