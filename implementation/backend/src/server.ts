import express, { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisClient } from './config/redis';
import { setupMiddleware } from './config/middleware';
import { config } from './config/environment';
import { connectDatabase } from './config/database';
import { setupMatchSocket, setupCommentarySocket, setupNotificationSocket } from './sockets';

// Routes
import bookingsRouter from './routes/bookings';
import matchesRouter from './routes/matches';
import paymentsRouter from './routes/payments';

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.ALLOWED_ORIGINS,
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Initialize Redis adapter
io.adapter(createAdapter(redisClient));

// Setup middleware
setupMiddleware(app);

// API Routes
app.use('/api/bookings', bookingsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/payments', paymentsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Setup Socket.IO namespaces
setupMatchSocket(io);
setupCommentarySocket(io);
setupNotificationSocket(io);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start HTTP server
    httpServer.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export { app, httpServer, io };
