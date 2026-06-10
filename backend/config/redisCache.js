const redis = require('redis');
const logger = require('../utils/logger');

let redisClient;

// Initialize Redis
const initializeRedis = async () => {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      url: process.env.REDIS_URL,
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis client error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis cache connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis initialization failed:', error);
    throw error;
  }
};

// Get Redis client
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initializeRedis first.');
  }
  return redisClient;
};

// Cache operations
const cache = {
  // Set cache with TTL (default 1 hour)
  set: async (key, value, ttl = 3600) => {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redisClient.setEx(key, ttl, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Cache SET error for ${key}:`, error);
    }
  },

  // Get cache
  get: async (key) => {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Cache GET error for ${key}:`, error);
      return null;
    }
  },

  // Delete cache
  delete: async (key) => {
    try {
      await redisClient.del(key);
    } catch (error) {
      logger.error(`Cache DELETE error for ${key}:`, error);
    }
  },

  // Clear cache by pattern (e.g., "tournament:*")
  clear: async (pattern) => {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    } catch (error) {
      logger.error(`Cache CLEAR error for pattern ${pattern}:`, error);
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      return await redisClient.exists(key);
    } catch (error) {
      logger.error(`Cache EXISTS error for ${key}:`, error);
      return false;
    }
  },

  // Get TTL
  ttl: async (key) => {
    try {
      return await redisClient.ttl(key);
    } catch (error) {
      logger.error(`Cache TTL error for ${key}:`, error);
      return -1;
    }
  },

  // Increment counter
  increment: async (key, value = 1) => {
    try {
      return await redisClient.incrBy(key, value);
    } catch (error) {
      logger.error(`Cache INCREMENT error for ${key}:`, error);
      return null;
    }
  },

  // Decrement counter
  decrement: async (key, value = 1) => {
    try {
      return await redisClient.decrBy(key, value);
    } catch (error) {
      logger.error(`Cache DECREMENT error for ${key}:`, error);
      return null;
    }
  },

  // List operations
  pushToList: async (key, values, ttl = 3600) => {
    try {
      await redisClient.rPush(key, values);
      if (ttl) {
        await redisClient.expire(key, ttl);
      }
    } catch (error) {
      logger.error(`Cache PUSH error for ${key}:`, error);
    }
  },

  getList: async (key, start = 0, stop = -1) => {
    try {
      return await redisClient.lRange(key, start, stop);
    } catch (error) {
      logger.error(`Cache LRANGE error for ${key}:`, error);
      return [];
    }
  },

  // Hash operations
  setHash: async (key, field, value, ttl = 3600) => {
    try {
      await redisClient.hSet(key, field, JSON.stringify(value));
      if (ttl) {
        await redisClient.expire(key, ttl);
      }
    } catch (error) {
      logger.error(`Cache HSET error for ${key}:`, error);
    }
  },

  getHash: async (key, field) => {
    try {
      const data = await redisClient.hGet(key, field);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Cache HGET error for ${key}:`, error);
      return null;
    }
  },

  getAllHash: async (key) => {
    try {
      const data = await redisClient.hGetAll(key);
      const result = {};
      for (const [field, value] of Object.entries(data)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      logger.error(`Cache HGETALL error for ${key}:`, error);
      return {};
    }
  },

  // Disconnect Redis
  disconnect: async () => {
    try {
      if (redisClient) {
        await redisClient.disconnect();
        logger.info('✅ Redis disconnected');
      }
    } catch (error) {
      logger.error('❌ Error disconnecting Redis:', error);
    }
  },
};

module.exports = {
  initializeRedis,
  getRedisClient,
  cache,
};
