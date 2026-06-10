const socketIO = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const logger = require('../utils/logger');

let io;
let pubClient;
let subClient;

// Initialize Socket.IO with Redis adapter
const initializeSocket = async (server) => {
  try {
    // Create Redis clients
    pubClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      url: process.env.REDIS_URL,
    });

    subClient = pubClient.duplicate();

    // Connect Redis clients
    await Promise.all([pubClient.connect(), subClient.connect()]);
    logger.info('✅ Redis connected for Socket.IO');

    // Initialize Socket.IO
    io = socketIO(server, {
      cors: {
        origin: process.env.SOCKET_IO_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Configure Redis adapter
    io.adapter(createAdapter(pubClient, subClient));

    // Connection handling
    io.on('connection', (socket) => {
      logger.info(`✅ Client connected: ${socket.id}`);

      // Join match room
      socket.on('join-match', (matchId) => {
        socket.join(`match-${matchId}`);
        logger.info(`Client ${socket.id} joined match room: ${matchId}`);
      });

      // Leave match room
      socket.on('leave-match', (matchId) => {
        socket.leave(`match-${matchId}`);
        logger.info(`Client ${socket.id} left match room: ${matchId}`);
      });

      // Join tournament leaderboard room
      socket.on('join-tournament', (tournamentId) => {
        socket.join(`tournament-${tournamentId}`);
        logger.info(`Client ${socket.id} joined tournament room: ${tournamentId}`);
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        logger.info(`✅ Client disconnected: ${socket.id}`);
      });

      // Error handler
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}: ${error.message}`);
      });
    });

    logger.info('✅ Socket.IO initialized successfully');
    return io;
  } catch (error) {
    logger.error('❌ Socket.IO initialization failed:', error);
    throw error;
  }
};

// Get Socket.IO instance
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

// Emit to specific room
const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

// Emit to all connected clients
const emitToAll = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

// Disconnect Socket.IO and Redis
const disconnectSocket = async () => {
  try {
    if (io) {
      io.close();
    }
    if (pubClient) {
      await pubClient.disconnect();
    }
    if (subClient) {
      await subClient.disconnect();
    }
    logger.info('✅ Socket.IO and Redis disconnected');
  } catch (error) {
    logger.error('❌ Error disconnecting Socket.IO:', error);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToRoom,
  emitToAll,
  disconnectSocket,
};
