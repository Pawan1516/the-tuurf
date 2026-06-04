import redis from 'redis';
import { config } from './environment';

const redisClient = redis.createClient({
  url: config.REDIS_URL
});

export async function initializeRedis() {
  try {
    await redisClient.connect();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Redis connection error:', error);
  }
}

export async function cacheGet(key: string) {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function cacheSet(key: string, value: string, expirySeconds?: number) {
  try {
    if (expirySeconds) {
      await redisClient.setEx(key, expirySeconds, value);
    } else {
      await redisClient.set(key, value);
    }
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function cacheDelete(key: string) {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

export { redisClient };
