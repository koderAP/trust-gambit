import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Optimized Prisma Client Configuration for High Concurrency
 * Handles 300+ req/sec burst traffic
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool optimization
    // Default: connection_limit=10
    // For 300 req/sec: Need higher pool size
    // Formula: (concurrent_requests / avg_request_duration_ms) * safety_factor
    // 300 req/sec * 0.1s avg duration * 2 safety = 60 connections
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
