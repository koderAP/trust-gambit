import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

/**
 * Rate Limiter using Token Bucket Algorithm with LRU Cache
 * Handles 300 req/sec burst traffic with configurable limits per endpoint
 */

interface RateLimitOptions {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max unique tokens (IPs) to track
  tokensPerInterval: number; // Max requests per interval per token
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const tokenCaches = new Map<string, LRUCache<string, TokenBucket>>();

/**
 * Create or get a rate limiter for a specific endpoint
 */
function getRateLimiter(endpoint: string, options: RateLimitOptions) {
  if (!tokenCaches.has(endpoint)) {
    tokenCaches.set(
      endpoint,
      new LRUCache<string, TokenBucket>({
        max: options.uniqueTokenPerInterval,
        ttl: options.interval,
      })
    );
  }
  return tokenCaches.get(endpoint)!;
}

/**
 * Check if request is within rate limit
 * Returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  options: RateLimitOptions = {
    interval: 60000, // 1 minute
    uniqueTokenPerInterval: 1000, // Track 1000 unique IPs/users
    tokensPerInterval: 60, // 60 requests per minute per user
  }
): {
  allowed: boolean;
  remaining: number;
  reset: number;
} {
  const cache = getRateLimiter(endpoint, options);
  const now = Date.now();
  
  let bucket = cache.get(identifier);
  
  if (!bucket) {
    // First request from this identifier
    bucket = {
      tokens: options.tokensPerInterval - 1,
      lastRefill: now,
    };
    cache.set(identifier, bucket);
    
    return {
      allowed: true,
      remaining: bucket.tokens,
      reset: now + options.interval,
    };
  }
  
  // Calculate tokens to add based on time elapsed
  const timePassed = now - bucket.lastRefill;
  const tokensToAdd = Math.floor(
    (timePassed / options.interval) * options.tokensPerInterval
  );
  
  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(
      options.tokensPerInterval,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;
  }
  
  // Check if we have tokens available
  if (bucket.tokens > 0) {
    bucket.tokens--;
    cache.set(identifier, bucket);
    
    return {
      allowed: true,
      remaining: bucket.tokens,
      reset: bucket.lastRefill + options.interval,
    };
  }
  
  // Rate limited
  return {
    allowed: false,
    remaining: 0,
    reset: bucket.lastRefill + options.interval,
  };
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options?: Partial<RateLimitOptions>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    // Use IP address or user ID as identifier
    const identifier =
      req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.ip ||
      'anonymous';
    
    const endpoint = req.nextUrl.pathname;
    
    const rateLimitOptions: RateLimitOptions = {
      interval: options?.interval || 60000, // 1 minute default
      uniqueTokenPerInterval: options?.uniqueTokenPerInterval || 1000,
      tokensPerInterval: options?.tokensPerInterval || 60,
    };
    
    const { allowed, remaining, reset } = checkRateLimit(
      identifier,
      endpoint,
      rateLimitOptions
    );
    
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitOptions.tokensPerInterval.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    // Add rate limit headers to successful responses
    const response = await handler(req, context);
    
    response.headers.set('X-RateLimit-Limit', rateLimitOptions.tokensPerInterval.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());
    
    return response;
  };
}

/**
 * Aggressive rate limiter for submission endpoints
 * Allows higher burst but prevents abuse
 */
export const SUBMISSION_RATE_LIMIT: RateLimitOptions = {
  interval: 10000, // 10 seconds
  uniqueTokenPerInterval: 5000, // Track 5000 users
  tokensPerInterval: 5, // Max 5 submissions per 10 seconds per user
};

/**
 * Moderate rate limiter for general API endpoints
 */
export const API_RATE_LIMIT: RateLimitOptions = {
  interval: 60000, // 1 minute
  uniqueTokenPerInterval: 2000,
  tokensPerInterval: 100, // 100 requests per minute per user
};

/**
 * Strict rate limiter for admin endpoints
 */
export const ADMIN_RATE_LIMIT: RateLimitOptions = {
  interval: 60000, // 1 minute
  uniqueTokenPerInterval: 50,
  tokensPerInterval: 30, // 30 requests per minute per admin
};
