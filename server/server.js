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
const { processCricBotCommand } = require('./services/aiAgent');
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
const matchRoutes = require('./routes/matches');
const teamRoutes = require('./routes/teams');
const tournamentRoutes = require('./routes/tournaments');
const playerRoutes = require('./routes/players');
const aiRoutes = require('./routes/ai');
const leaderboardRoutes = require('./routes/leaderboards');
const formatRoutes = require('./routes/formats');


const seedSettings = require('./utils/settingsSeeder');

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected Successfully');
    await seedSettings();
    const { autoGenerateSlots } = require('./utils/slotGenerator');
    await autoGenerateSlots(30);
  })
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

const app = express();

// Health Check (Part 04)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        version: 'v2.0'
    });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Socket.io for Live Scoring
io.on('connection', (socket) => {
    console.log('🔌 New Client Connected:', socket.id);
    
    socket.on('join_match', (matchId) => {
        socket.join(`match_${matchId}`);
        console.log(`📡 Socket ${socket.id} joined match_${matchId}`);
    });

    socket.on('join:profile', (userId) => {
        socket.join(`profile:${userId}`);
        console.log(`📡 Socket ${socket.id} joined profile:${userId}`);
    });

    socket.on('leave_match', (matchId) => {
        socket.leave(`match_${matchId}`);
        console.log(`📡 Socket ${socket.id} left match_${matchId}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client Disconnected:', socket.id);
    });
});

// Export io for use in routes
app.set('socketio', io);

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
app.use('/api/matches', matchRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/formats', formatRoutes);

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
 * ─── WHATSAPP WEBHOOK (Twilio with CricBot AI) ───────────────────────────────
 */
app.post('/webhook', async (req, res) => {
  const fromFull = req.body.From; // e.g. whatsapp:+91799...
  const from = fromFull.replace('whatsapp:', '');
  const body = req.body.Body.trim();

  console.log(`📱 WhatsApp Message from ${from}: ${body}`);

  try {
    // Call the intelligent CricBot Agent
    const aiResponse = await processCricBotCommand(body, { userPhone: from }, from);

    if (aiResponse.type === 'BOOKING_CONFIRMED') {
      const { generateUPIQRCode } = require('./services/payment');
      const bInfo = aiResponse.bookingInfo;
      const qrRes = await generateUPIQRCode(bInfo.amount || 500, bInfo.bookingId);
      
      const reply = `${aiResponse.reply}\n\n💳 *Payment Details:*\nScan the QR code below or use this link to pay: ${qrRes.upiLink}`;
      await sendWA(from, reply, qrRes.qrCodeDataUrl);
    } else {
      await sendWA(from, aiResponse.reply);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('WhatsApp AI Error:', error);
    await sendWA(from, "🏟️ Sorry, I'm having a bit of trouble. Please try again or call us!");
    res.sendStatus(500);
  }
});

// Background Job: Auto-Release Expired Slot Holds (Every 1 minute)
setInterval(async () => {
    try {
        const now = new Date();
        const expiredHolds = await Slot.updateMany(
            { status: 'hold', holdExpiresAt: { $lt: now } },
            { status: 'free', holdExpiresAt: null }
        );
        if (expiredHolds.modifiedCount > 0) {
            console.log(`🧹 Internal: Released ${expiredHolds.modifiedCount} expired slot holds.`);
        }
    } catch (err) {
        console.error('Auto-Release Error:', err.message);
    }
}, 60000);

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
