import Redis from 'ioredis';

/**
 * Redis client for caching and rate limiting
 * Falls back gracefully if Redis is unavailable
 */

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('REDIS_URL not configured, caching disabled');
    return null;
  }
  
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
    
    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
    
    // Attempt to connect
    redis.connect().catch((err) => {
      console.error('Failed to connect to Redis:', err);
      redis = null;
    });
    
    return redis;
  } catch (error) {
    console.error('Error initializing Redis:', error);
    return null;
  }
}

/**
 * Cache wrapper with fallback to no-cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;
  
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
}

/**
 * Set cache with TTL
 */
export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 300
): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
}

/**
 * Delete cache key
 */
export async function cacheDelete(key: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  
  try {
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
}

/**
 * Invalidate cache by pattern
 */
export async function cacheInvalidatePattern(pattern: string): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;
    
    await client.del(...keys);
    return keys.length;
  } catch (error) {
    console.error('Redis pattern invalidation error:', error);
    return 0;
  }
}

/**
 * Increment counter (for rate limiting)
 */
export async function incrementCounter(
  key: string,
  ttlSeconds: number = 60
): Promise<number> {
  const client = getRedis();
  if (!client) return 0;
  
  try {
    const count = await client.incr(key);
    if (count === 1) {
      // First increment, set TTL
      await client.expire(key, ttlSeconds);
    }
    return count;
  } catch (error) {
    console.error('Redis INCR error:', error);
    return 0;
  }
}

/**
 * Get remaining TTL for a key
 */
export async function getTTL(key: string): Promise<number> {
  const client = getRedis();
  if (!client) return -1;
  
  try {
    return await client.ttl(key);
  } catch (error) {
    console.error('Redis TTL error:', error);
    return -1;
  }
}

/**
 * Distributed lock implementation
 */
export async function acquireLock(
  lockKey: string,
  ttlSeconds: number = 10
): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  
  try {
    const result = await client.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch (error) {
    console.error('Redis lock acquisition error:', error);
    return false;
  }
}

/**
 * Release distributed lock
 */
export async function releaseLock(lockKey: string): Promise<boolean> {
  const client = getRedis();
  if (!client) return false;
  
  try {
    await client.del(lockKey);
    return true;
  } catch (error) {
    console.error('Redis lock release error:', error);
    return false;
  }
}

/**
 * Check if request is duplicate (idempotency)
 */
export async function isDuplicateRequest(
  idempotencyKey: string,
  ttlSeconds: number = 300
): Promise<boolean> {
  const client = getRedis();
  if (!client) return false; // Allow through if Redis unavailable
  
  try {
    const exists = await client.exists(idempotencyKey);
    if (exists) return true;
    
    await client.setex(idempotencyKey, ttlSeconds, '1');
    return false;
  } catch (error) {
    console.error('Redis duplicate check error:', error);
    return false; // Allow through on error
  }
}

export default getRedis;
