require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Import routes
const authRoutes = require('./routes/auth');
const slotsRoutes = require('./routes/slots');
const bookingsRoutes = require('./routes/bookings');
const paymentsRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const chatbotRoutes = require('./routes/chatbot');
const whatsappRoutes = require('./routes/whatsapp');
const whatsappSimpleRoutes = require('./routes/whatsapp-simple');


// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize Server
const initServer = async () => {
  // Connect to MongoDB
  await connectDB();

  // Auto-generate real slots for the next 30 days in DB
  const { autoGenerateSlots } = require('./utils/slotGenerator');
  const { cleanupExpiredHolds } = require('./utils/slotMaintenance');

  autoGenerateSlots(30);

  // Run maintenance tasks
  setInterval(cleanupExpiredHolds, 1 * 60 * 1000); // Check for expired holds every 1 minute
  setInterval(() => autoGenerateSlots(30), 24 * 60 * 60 * 1000); // Refresh slots daily
};

initServer();

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'https://the-turf-omega.vercel.app',
  'https://the-tuurf.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    const isVercel = origin.endsWith('.vercel.app');
    const isAllowed = allowedOrigins.indexOf(origin) !== -1;

    if (isAllowed || isVercel) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/whatsapp-simple', whatsappSimpleRoutes); // Simple WhatsApp webhook handler


// Health check route
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];

  res.json({
    status: 'Server is running',
    database: {
      state: states[dbState] || 'unknown',
      readyState: dbState,
      hasUri: !!process.env.MONGODB_URI
    }
  });
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'The Turf Backend is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✓ Server started on port ${PORT}`);
  console.log(`✓ Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});
