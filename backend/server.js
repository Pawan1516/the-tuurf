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
const verifyToken = require('./middleware/verifyToken');
const requirePro = require('./middleware/requirePro');

// ── AI Platform routes
const aiPlatformRoutes = require('./routes/aiPlatform');
const voiceRoutes      = require('./routes/voice');

// Database Connection with auto-reconnect
let mongoServer = null;

const connectDB = async () => {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env');
    return;
  }
  
  if (mongoose.connection.readyState === 1) return; // Already connected

  try {
    console.log('🔄 Initializing system-wide database connection...');
    // Connection Event Handlers
    mongoose.connection.on('connected', () => {
      console.log('✅ [DATABASE] Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ [DATABASE] Mongoose connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ [DATABASE] Mongoose disconnected');
    });

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('🛡️ [DATABASE] Connected successfully.');
    
    // Seed and generate in the background
    seedSettings().catch(e => console.error('Seed settings error:', e));
    const { autoGenerateSlots } = require('./utils/slotGenerator');
    autoGenerateSlots(30).catch(e => console.error('Slot generation error:', e));
  } catch (err) {
    // If localhost MongoDB fails, try mongodb-memory-server
    if (uri.includes('localhost') && !mongoServer) {
      console.warn('⚠️ Local MongoDB not available, starting in-memory MongoDB for development...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        const memoryUri = mongoServer.getUri();
        console.log('✅ In-memory MongoDB started');
        
        // Reconnect with in-memory URI
        setTimeout(() => {
          process.env.MONGODB_URI = memoryUri;
          connectDB().catch(e => console.error('Failed to connect to memory server:', e));
        }, 1000);
      } catch (memErr) {
        console.error('❌ Failed to start memory MongoDB:', memErr.message);
        console.log('💡 Please install MongoDB locally or configure MongoDB Atlas in .env');
        console.log('🔄 Re-syncing in 10s...');
        setTimeout(connectDB, 10000);
      }
    } else {
      console.error('❌ Database Connection Error:', err.message);
      console.log('💡 Diagnostics: Verify MongoDB Atlas Whitelist (0.0.0.0/0) and Credentials');
      console.log('🔄 Re-syncing in 10s...');
      setTimeout(connectDB, 10000);
    }
  }
};

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected!');
});

connectDB();

// ── Auto-Logout Feature: Initialize session cleanup job ────────────────────
// Run cleanup every 30 minutes to remove expired sessions
const sessionService = require('./services/sessionService');
setInterval(async () => {
  try {
    const cleaned = await sessionService.cleanupExpiredSessions();
    if (cleaned > 0) {
      console.log(`✅ Session cleanup completed: ${cleaned} expired sessions removed`);
    }
  } catch (error) {
    console.error('❌ Session cleanup error:', error.message);
  }
}, 30 * 60 * 1000); // Run every 30 minutes


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

// Build a runtime list of allowed origins for socket.io (supports comma-separated env)
const corsAllowed = (process.env.CORS_ORIGINS || `${process.env.FRONTEND_URL || ''},${process.env.CLIENT_URL || ''}`)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .concat(["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]);

const jwt = require('jsonwebtoken');
const User = require('./models/User');
const crypto = require('crypto');

// Debug: print a fingerprint of the JWT secret so we can verify deployed vs local
try {
  const secretPresent = !!process.env.JWT_SECRET;
  const fingerprint = secretPresent ? crypto.createHash('sha256').update(process.env.JWT_SECRET).digest('hex') : 'NOT_SET';
  console.log('🔐 JWT_SECRET present:', secretPresent ? 'yes' : 'no');
  console.log('🔐 JWT secret fingerprint (sha256):', fingerprint);
} catch (e) {
  console.warn('🔐 Unable to compute JWT secret fingerprint:', e && e.message);
}

// Socket.io CORS already configured above in io creation
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // allow non-browser clients (no origin) and allowed origins
      if (!origin) return callback(null, true);
      if (corsAllowed.indexOf(origin) !== -1) return callback(null, true);
      // deny others
      return callback(new Error('CORS origin denied'), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"]
  }
});

// --- Socket authentication + Pro gating ---
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || (socket.handshake.headers && (socket.handshake.headers.authorization || socket.handshake.headers.Authorization)) || null;
    let raw = null;
    if (!token) return next(); // allow anonymous sockets where allowed

    if (typeof token === 'string' && token.startsWith('Bearer ')) raw = token.split(' ')[1];
    else raw = token;

    if (!raw) return next(new Error('unauthenticated'));

    if (!process.env.JWT_SECRET) return next(new Error('server_misconfigured'));

    const decoded = jwt.verify(raw, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('unauthenticated'));

    // attach user document
    socket.user = user;

    // If this connection is intended for Pro-only features, validate subscription now.
    // We'll deny connection with 'pro_required' error when not subscribed.
    const wantsPro = socket.handshake.query && socket.handshake.query.pro === '1';
    if (wantsPro) {
      const isPro = (user.subscription && user.subscription.isPremium) || user.checkPremiumStatus();
      if (!isPro) return next(new Error('pro_required'));
    }

    return next();
  } catch (err) {
    console.error('Socket auth error:', err && err.stack ? err.stack : err);
    return next(err);
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
const activityTracker = require('./middleware/activityTracker');

app.use('/api/config', pageConfigRoutes);
app.use('/api/auth', authRoutes);

// Apply activity tracker middleware to protected routes (after auth)
// This will update session activity on every authenticated request
app.use('/api', verifyToken, activityTracker);
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
app.use('/api/analytics', verifyToken, requirePro, require('./routes/analytics'));
app.use('/api/ag-match', agMatchRoutes);
app.use('/api/ag-chat', agChatbotRoutes);

// ── AI Platform & Voice routes ────────────────────────────────────────────
app.use('/api/ai-platform', aiPlatformRoutes);
app.use('/api/voice',       voiceRoutes);
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
const hasValidTwilioCredentials = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith('AC') && process.env.TWILIO_AUTH_TOKEN;
let twilioClient = null;
if (hasValidTwilioCredentials) {
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('🚀 Twilio Client initialized in server startup');
  } catch (err) {
    console.warn('⚠️ Twilio Client initialization failed:', err.message || err);
    twilioClient = null;
  }
} else {
  console.warn('⚠️ Twilio Client disabled: invalid or missing TWILIO_ACCOUNT_SID/AUTH_TOKEN');
}
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

  // ─── AI Platform Initialization ───────────────────────────────────────────
  setTimeout(async () => {
    try {
      // Initialize OpenAI client if key is present
      let openaiClient = null;
      if (process.env.OPENAI_API_KEY) {
        const { OpenAI } = require('openai');
        openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        console.log('🤖 [AI Platform] OpenAI client initialized');
      } else {
        console.warn('⚠️ [AI Platform] OPENAI_API_KEY not set — running in degraded mode (heuristic only)');
      }

      // Wire OpenAI into all agents and engines
      const orchestrator = require('./src/ai-platform/orchestrator/AIOrchestrator');
      orchestrator.setOpenAIClient(openaiClient);

      const KnowledgeBase = require('./src/ai-platform/knowledge/KnowledgeBase');
      KnowledgeBase.setClient(openaiClient);

      const RAGEngine = require('./src/ai-platform/knowledge/RAGEngine');
      RAGEngine.setClient(openaiClient);

      // Wire agents
      ['SalesAgent','AnalyticsAgent','SecurityAgent','OperationsAgent','SchedulingAgent'].forEach(name => {
        try {
          const agent = require(`./src/ai-platform/agents/${name}`);
          if (agent.setClient) agent.setClient(openaiClient);
        } catch { /* skip missing agents */ }
      });

      // Register workflow templates
      const WorkflowEngine = require('./src/ai-platform/workflows/WorkflowEngine');
      const { registerAllTemplates } = require('./src/ai-platform/workflows/WorkflowTemplates');
      registerAllTemplates(WorkflowEngine);

      // Initialize Voice Engine if Twilio is configured
      if (hasValidTwilioCredentials) {
        try {
          const VoiceEngine = require('./src/ai-platform/voice/VoiceCallEngine');
          const voiceTwilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
          VoiceEngine.init({ orchestrator: { orchestrate: orchestrator.orchestrate }, twilioClient: voiceTwilioClient });
          console.log('📞 [Voice Engine] Twilio Voice AI initialized');
        } catch (err) {
          console.warn('⚠️ [Voice Engine] Twilio Voice AI disabled due to invalid credentials:', err.message || err);
        }
      } else {
        console.warn('⚠️ [Voice Engine] Twilio credentials not set — voice calls disabled');
      }

      // AI Platform Socket.IO namespace
      const aiNamespace = io.of('/ai-platform');
      aiNamespace.on('connection', (socket) => {
        console.log('🤖 [AI Platform] Socket connected:', socket.id);
        socket.on('chat', async (data) => {
          try {
            const result = await orchestrator.orchestrate({
              message: data.message,
              userId:  data.userId  || 'anonymous',
              channel: data.channel || 'web',
            });
            socket.emit('reply', result);
          } catch (err) {
            socket.emit('reply', { success: false, reply: 'An error occurred.', intent: 'GENERAL' });
          }
        });
      });

      console.log('✅ [AI Platform] Fully initialized — all agents online');
    } catch (err) {
      console.error('❌ [AI Platform] Initialization failed:', err.message);
    }
  }, 5000); // 5 seconds after server start
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
 
