# Week 1: Foundation Setup Guide (MongoDB Edition)

## Overview
This guide covers setting up the database (MongoDB), project structure, and core configuration files for The Turf cricket tournament platform.

---

## 1. Install Dependencies

### Backend Dependencies
```bash
cd backend
npm install express dotenv cors jsonwebtoken bcrypt
npm install @prisma/client prisma
npm install socket.io socket.io-redis
npm install redis
npm install express-validator
npm install multer sharp
npm install axios
npm install joi
```

### Development Dependencies
```bash
npm install --save-dev nodemon
npm install --save-dev jest supertest
npm install --save-dev eslint prettier
```

### Create .env file
```bash
cp .env.example .env
# Edit .env with your configuration
```

---

## 2. Database Setup (MongoDB)

### Option A: Using Docker (Recommended)

```bash
# Start MongoDB and Redis containers
docker-compose up -d

# Verify containers are running
docker ps

# Access MongoDB CLI
docker exec -it the_turf_db mongosh

# Access MongoDB Express (Web UI)
# Open browser: http://localhost:8081
# Username: admin
# Password: admin123

# Access Redis
docker exec -it the_turf_cache redis-cli
```

**MongoDB Credentials (Docker):**
- Username: `turf_user`
- Password: `turf_secure_password_123`
- Database: `the_turf`
- Connection String: `mongodb://turf_user:turf_secure_password_123@localhost:27017/the_turf`

**Redis Credentials:**
- Password: `redis_secure_password_123`
- Host: `localhost:6379`

### Option B: Manual Installation

1. Install MongoDB Community Edition (v7+)
2. Install Redis (v7+)
3. Create database user:
   ```bash
   mongosh
   use admin
   db.createUser({
     user: "turf_user",
     pwd: "turf_secure_password_123",
     roles: [{role: "dbOwner", db: "the_turf"}]
   })
   use the_turf
   ```

---

## 3. Prisma Setup (MongoDB)

### Initialize Prisma
```bash
# The schema.prisma is already configured for MongoDB
# Generate Prisma Client
npx prisma generate
```

### Verify MongoDB Connection
```bash
# Test connection
npx prisma db execute --stdin < init-mongo.js

# View database with Prisma Studio
npx prisma studio  # Opens at http://localhost:5555
```

---

## 4. Environment Variables

Update `.env` file with MongoDB values:

```env
# Database (MongoDB - Docker)
DATABASE_URL="mongodb://turf_user:turf_secure_password_123@localhost:27017/the_turf?authSource=admin"

# Database (MongoDB - Atlas Cloud)
# DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/the_turf?retryWrites=true&w=majority"

# Database (MongoDB - Local Manual)
# DATABASE_URL="mongodb://localhost:27017/the_turf"

# JWT
JWT_SECRET="change-this-to-a-strong-secret-key-in-production"
JWT_REFRESH_SECRET="change-this-to-a-strong-refresh-secret"
JWT_EXPIRE="1h"
JWT_REFRESH_EXPIRE="7d"

# Redis
REDIS_URL="redis://default:redis_secure_password_123@localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT=6379

# Server
NODE_ENV="development"
PORT=5000
BACKEND_URL="http://localhost:5000"
FRONTEND_URL="http://localhost:3000"

# Session
SESSION_SECRET="your-session-secret-key"
```

---

## 5. File Structure Verification

```
backend/
├── config/
│   ├── database.js ✅
│   ├── socketConfig.js ✅
│   └── redisCache.js ✅
├── middleware/
│   ├── auth.js ✅
│   └── errorHandler.js ✅
├── utils/
│   ├── logger.js ✅
│   ├── responseHandler.js ✅
│   └── validators.js ✅
├── services/
│   └── sessionService.js (existing)
├── routes/
├── controllers/
├── socket/
├── tests/
├── package.json
└── server.js (needs update for new config)

prisma/
├── schema.prisma ✅
└── migrations/
    └── (auto-generated after migration)
```

---

## 6. Update Backend Entry Point

Create/update `backend/server.js`:

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const logger = require('./utils/logger');
const { initializeSocket, disconnectSocket } = require('./config/socketConfig');
const { initializeRedis, cache } = require('./config/redisCache');
const prisma = require('./config/database');
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(req.method, req.path, res.statusCode, duration);
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes (to be added)
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));
// etc.

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error Handler
app.use(errorHandler);

// Initialize server
const startServer = async () => {
  try {
    // Initialize database
    await prisma.$connect();
    logger.info('✅ Database connected');

    // Initialize Redis
    await initializeRedis();
    logger.info('✅ Redis initialized');

    // Initialize Socket.IO
    await initializeSocket(server);
    logger.info('✅ Socket.IO initialized');

    // Start server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectSocket();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectSocket();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

module.exports = app;
```

---

## 7. Update package.json

Add/update scripts in `backend/package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "prisma migrate dev",
    "migrate:prod": "prisma migrate deploy",
    "studio": "prisma studio",
    "seed": "node prisma/seed.js",
    "test": "jest",
    "lint": "eslint ."
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

---

## 8. Verify Setup

### Run all checks:
```bash
# Test MongoDB connection via Prisma
npx prisma db execute --stdin < init-mongo.js

# Generate Prisma Client
npx prisma generate

# View database with Prisma Studio
npx prisma studio

# Verify MongoDB collections
docker exec -it the_turf_db mongosh --username turf_user --password turf_secure_password_123 --authenticationDatabase admin the_turf --eval "db.getCollectionNames()"

# Start development server
npm run dev

# Check health endpoint
curl http://localhost:5000/health
```

### Expected Output:
```json
{
  "status": "ok",
  "timestamp": "2024-06-15T10:30:00.000Z",
  "uptime": 5.234
}
```

---

## 9. Troubleshooting

### MongoDB Connection Issues
```bash
# Verify MongoDB is running
docker logs the_turf_db

# Check MongoDB connection
docker exec -it the_turf_db mongosh --username turf_user --password turf_secure_password_123 --authenticationDatabase admin the_turf

# Reset MongoDB (careful!)
docker exec -it the_turf_db mongosh --username turf_user --password turf_secure_password_123 --authenticationDatabase admin the_turf --eval "db.dropDatabase()"
```

### Prisma Issues
```bash
# Clear Prisma cache
rm -rf node_modules/.prisma

# Regenerate client
npx prisma generate

# Check database connection
npx prisma db execute --stdin
# Then type: db.runCommand({ ping: 1 })
```

### Redis Connection Issues
```bash
# Verify Redis is running
docker logs the_turf_cache

# Test Redis connection
redis-cli -h localhost -p 6379 -a redis_secure_password_123 ping
```

---

## 10. Summary

✅ **Week 1 Completed:**
- [x] Prisma schema created with 30+ models
- [x] Environment variables configured
- [x] Database connection setup
- [x] Redis cache configured
- [x] Socket.IO configured
- [x] Authentication middleware created
- [x] Error handling setup
- [x] Logger utility created
- [x] Input validators created
- [x] Response handlers created
- [x] Docker Compose setup

**Next: Week 2 - Authentication & User Management APIs**
