import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Optimized Prisma Client Configuration for High Concurrency
 * Handles 300+ req/sec burst traffic
 */

// ✅ Configure connection pool in DATABASE_URL
function getOptimizedDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';
  
  // Parse URL to add connection pool parameters
  try {
    const url = new URL(baseUrl);
    
    // Add connection pool settings if not already present
    if (!url.searchParams.has('connection_limit')) {
      // 20 connections per app instance
      // With 5 instances: 5 × 20 = 100 total connections
      // Leaves 100 connections for admin/migrations (PostgreSQL max: 200)
      url.searchParams.set('connection_limit', '20');
    }
    
    if (!url.searchParams.has('pool_timeout')) {
      // Wait up to 10 seconds for a connection from the pool
      url.searchParams.set('pool_timeout', '10');
    }
    
    if (!url.searchParams.has('connect_timeout')) {
      // Wait up to 10 seconds to establish initial connection
      url.searchParams.set('connect_timeout', '10');
    }
    
    return url.toString();
  } catch (error) {
    // If URL parsing fails, return original
    console.warn('Failed to parse DATABASE_URL, using original:', error);
    return baseUrl;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: getOptimizedDatabaseUrl(),
      },
    },
  })

// Optimize for serverless and high concurrency
if (process.env.NODE_ENV === 'production') {
  // Set connection pool timeout to handle bursts
  prisma.$connect().catch((err) => {
    console.error('Failed to connect to database:', err)
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Helper to disconnect Prisma in serverless environments
export async function disconnectPrisma() {
  if (process.env.NODE_ENV === 'production') {
    await prisma.$disconnect()
  }
}

/**
 * Execute query with retry logic for transient failures
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Retry on connection errors, deadlocks, or timeout
      const shouldRetry =
        error.code === 'P1001' || // Connection error
        error.code === 'P2034' || // Transaction conflict
        error.code === 'P1008' || // Timeout
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ETIMEDOUT');
      
      if (!shouldRetry || attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
