require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const twilio = require('twilio');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// 🚀 global fetch is natively supported in Node 18+
// if (!global.fetch) {
//     global.fetch = require('node-fetch');
// }

const data = require('./data');
const messages = require('./messages');
const agent = require('./agent');
const { generateBookingPass } = require('./qrgen');
const WhatsAppBooking = require('./models/WhatsAppBooking');
const Booking = require('./models/Booking');
const Slot = require('./models/Slot');
const { processCricBotCommand } = require('./services/aiAgent');
const { runBookingOptimizer } = require('./services/bookingOptimizer');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { securityHeaders, globalLimiter, authLimiter } = require('./middleware/security');
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
const turfRoutes = require('./routes/turfs');
const matchmakingRoutes = require('./routes/matchmaking');
const receiptRoutes = require('./routes/receipts');
const agMatchRoutes = require('./routes/agMatch');
const agChatbotRoutes = require('./routes/agChatbot');
const seedSettings = require('./utils/settingsSeeder');

// Database Connection with auto-reconnect
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env');
    return;
  }
  
  if (mongoose.connection.readyState === 1) return; // Already connected

  try {
    console.log('🔄 Initializing system-wide database connection...');
    // Connection Event Handlers
    mongoose.connection.on('connected', () => {
      console.log('✅ [DATABASE] Mongoose connected to MongoDB Atlas');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ [DATABASE] Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [DATABASE] Mongoose disconnected');
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 20000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('🛡️ [DATABASE] Secure tunnel established to identity cluster.');
    
    // Seed and generate in the background
    seedSettings().catch(e => console.error('Seed settings error:', e));
    const { autoGenerateSlots } = require('./utils/slotGenerator');
    autoGenerateSlots(30).catch(e => console.error('Slot generation error:', e));
  } catch (err) {
    console.error('❌ Cluster Synchronization Critical Error:', err.message);
    console.log('💡 Diagnostics: Verify Atlas Whitelist (0.0.0.0/0) and Credentials');
    console.log('🔄 Re-syncing in 10s...');
    setTimeout(connectDB, 10000);
  }
};

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected!');
});

connectDB();


const app = express();

// Trust Proxy (Required for express-rate-limit behind proxies)
app.set('trust proxy', 1);

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
  maxAge: 86400
}));

// Health Check (Part 04)
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        node_env: process.env.NODE_ENV || 'development'
    });
});

const server = http.createServer(app);
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173" // Vite default
].filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3001", "http://localhost:3000", "http://localhost:5173", process.env.FRONTEND_URL, process.env.CLIENT_URL].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
  }
});

// Favicon 500 Error Fix
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Socket.io for Live Scoring
io.on('connection', (socket) => {
    console.log('🔌 New Client Connected:', socket.id);
    
    socket.on('join_match', (matchId) => {
        const id = String(matchId);
        socket.join(`match_${id}`);
        console.log(`📡 Socket ${socket.id} joined match_${id}`);
    });

    // Alias for join_match to support colon version
    socket.on('join:match', (matchId) => {
        const id = String(matchId);
        socket.join(`match_${id}`);
        console.log(`📡 Socket ${socket.id} joined match_${id} (via alias)`);
    });

    socket.on('join_match', (matchId) => {
        const id = String(matchId);
        socket.join(`match_${id}`);
        console.log(`📡 Socket ${socket.id} joined match_${id}`);
        
        // Broadcast spectator count
        const roomSize = io.sockets.adapter.rooms.get(`match_${id}`)?.size || 0;
        io.to(`match_${id}`).emit('spectator_count', { count: roomSize });
    });

    socket.on('score:update', async (data, callback) => {
        const { matchId, eventId, type, payload } = data;
        console.log("📥 EVENT RECEIVED:", data);

        try {
            // Here we could handle the scoring logic directly, 
            // but usually we rely on the REST API for database persistence.
            // If the REST API is used, this socket listener might just be for 
            // immediate broadcasting before/after DB update.
            
            // For now, let's acknowledge
            if (callback) callback({ success: true });
        } catch (err) {
            console.error("❌ Scoring Sync Error:", err);
            if (callback) callback({ success: false, error: err.message });
        }
    });

    // ─── BLUEPRINT SOCKET LISTENERS ─────────────────────────────────────
    socket.on('toss', ({ matchId, winner, decision }) => {
        const id = String(matchId);
        console.log(`🪙 Toss Update for match_${id}: Winner=${winner}, Decision=${decision}`);
        io.to(`match_${id}`).emit('toss_update', { winner, decision });
    });

    socket.on('start_match', (matchId) => {
        const id = String(matchId);
        console.log(`🚀 Match Started: match_${id}`);
        io.to(`match_${id}`).emit('match_started', { status: 'live', timestamp: new Date() });
    });

    socket.on('ball_update', (data) => {
        const id = String(data.matchId);
        
        // Build enriched live_feed payload for spectators (LiveScoreView)
        const overNum = data.overs ?? data.overNum ?? 0;
        const ballInOver = data.balls ?? data.ballInOver ?? 0;
        const runs = data.runs ?? 0;
        const wickets = data.wickets ?? 0;
        const totalBalls = overNum * 6 + ballInOver;
        const crr = totalBalls > 0 ? (runs / (totalBalls / 6)).toFixed(2) : '0.00';

        const liveFeedPayload = {
            runs,
            wickets,
            overNum,
            ballInOver,
            overs: `${overNum}.${ballInOver}`,
            run_rate: crr,
            newBall: true,
            recent_balls: data.recent_balls || [],
            batting_team: data.striker?.team || 'A',
            striker: data.striker ? {
                name: data.striker,
                runs: 0,
                balls: 0
            } : null,
            bowler: data.bowler ? {
                name: data.bowler,
                w: 0,
                r: 0
            } : null,
            inningsNum: data.inningsNum || 1,
            target: data.target || null,
            matchId: id,
            timestamp: Date.now()
        };

        // Broadcast to all room members
        io.to(`match_${id}`).emit('score_update', data);
        io.to(`match_${id}`).emit('live_feed', liveFeedPayload);  // For LiveScoreView
        
        if (data.type === 'wicket') {
            io.to(`match_${id}`).emit('wicket_update', data);
        }
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client Disconnected:', socket.id);
    });
});

// Export io for use in routes
app.set('socketio', io);

// Live Scoring events are now handled in separate route controllers (e.g. routes/matches.js)
// which emit 'match:update' and 'match:ball' for real-time engagement.

// Global Middleware (Part 06)
// Using merged CORS from Part 05 above

// Apply Security Headers
app.use(securityHeaders);

// Apply Global Rate Limiter
app.use('/api', globalLimiter);

// Cookie Parser for secure refresh tokens
app.use(cookieParser());

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'accelerometer=(self "https://api.razorpay.com"), gyroscope=(self "https://api.razorpay.com"), payment=(self "https://api.razorpay.com")');
  next();
});

app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Mount original routes
const pageConfigRoutes = require('./routes/pageConfig');
app.use('/api/config', pageConfigRoutes);
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
app.use('/api/admin-booking', require('./routes/adminBooking'));
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/formats', formatRoutes);
app.use('/api/turfs', turfRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/ag-match', agMatchRoutes);
app.use('/api/ag-chat', agChatbotRoutes);
// Serve React frontend in production
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuildPath));
// Catch-all to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// ─── Autonomous Booking Optimizer Endpoint ────────────────────────────────────
app.post('/api/optimizer/run', async (req, res) => {
  try {
    const result = await runBookingOptimizer();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/optimizer/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'Booking Optimizer is active. Runs every 60 minutes.',
    nextRun: new Date(Date.now() + (60 - new Date().getMinutes() % 60) * 60000).toISOString()
  });
});

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
  const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5001';
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
    const publicUrl = process.env.PUBLIC_URL || 'http://localhost:5001';
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🏟️ THE TURF — Automachine running on port ${PORT}`);
  console.log(`📡 WEBHOOK: POST /webhook`);
  console.log(`🔑 ADMIN: http://localhost:${PORT}/admin`);

  // ─── Autonomous Booking Optimizer Scheduler ───────────────────────────────
  // Run once 30 seconds after startup (after DB connects), then every 60 mins
  setTimeout(async () => {
    console.log('🤖 Running initial Booking Optimization pass...');
    // await runBookingOptimizer().catch(e => console.error('Optimizer startup run failed:', e.message));
  }, 30000);

  setInterval(async () => {
    await runBookingOptimizer().catch(e => console.error('Optimizer scheduled run failed:', e.message));
  }, 60 * 60 * 1000); // Every 60 minutes

  console.log('🤖 Booking Optimizer: Scheduled (every 60 min)');
});

// Global error handlers to aid debugging in development
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason && reason.stack ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err && err.stack ? err.stack : err);
  // In production you might want to exit the process: process.exit(1)
});

// Express error handler (returns stack in development)
app.use((err, req, res, next) => {
  console.error('CRITICAL ERROR:', err);
  if (err.stack) console.error(err.stack);
  
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({ success: false, message: err.message, stack: err.stack });
  } else {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});
 
