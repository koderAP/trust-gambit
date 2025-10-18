import { NextRequest, NextResponse } from 'next/server';
import { ensureAdminExists } from '@/lib/initAdmin';
import { validateEnv, getEnvInfo } from '@/lib/validateEnv';
import { prisma } from '@/lib/prisma';
import { getRedis } from '@/lib/redis';
import {
  databaseCircuitBreaker,
  redisCircuitBreaker,
} from '@/lib/circuitBreaker';

/**
 * Health check endpoint for Docker container monitoring
 * Also ensures admin user exists on first health check
 * Enhanced with circuit breaker status and detailed checks
 */
// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

let adminInitialized = false;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

  try {
    // Validate environment variables
    validateEnv();
    
    // Initialize admin on first health check
    if (!adminInitialized) {
      await ensureAdminExists();
      adminInitialized = true;
    }

    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      adminInitialized,
      envInfo: getEnvInfo(),
      checks: {},
    };

    let isHealthy = true;

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.checks.database = {
        status: 'healthy',
        circuitBreaker: databaseCircuitBreaker.getStatus(),
      };
    } catch (error) {
      isHealthy = false;
      checks.checks.database = {
        status: 'unhealthy',
        error: (error as Error).message,
        circuitBreaker: databaseCircuitBreaker.getStatus(),
      };
    }

    // Check Redis connection (optional)
    const redis = getRedis();
    if (redis) {
      try {
        await redis.ping();
        checks.checks.redis = {
          status: 'healthy',
          circuitBreaker: redisCircuitBreaker.getStatus(),
        };
      } catch (error) {
        checks.checks.redis = {
          status: 'degraded',
          error: (error as Error).message,
          circuitBreaker: redisCircuitBreaker.getStatus(),
        };
        // Redis failure is not critical
      }
    } else {
      checks.checks.redis = {
        status: 'not_configured',
      };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    checks.checks.memory = {
      status: 'healthy',
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    };

    // Detailed checks (if requested)
    if (detailed) {
      try {
        // Database pool status
        const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT count(*) FROM pg_stat_activity 
          WHERE datname = current_database()
        `;
        const activeConnections = Number(result[0]?.count || 0);
        checks.checks.database.activeConnections = activeConnections;

        // Game state
        const game = await prisma.game.findFirst({
          orderBy: { createdAt: 'desc' },
          select: {
            status: true,
            currentStage: true,
            currentRound: true,
            _count: {
              select: {
                lobbies: true,
                rounds: true,
              },
            },
          },
        });

        const userCount = await prisma.user.count();
        const activeRoundCount = await prisma.round.count({
          where: { status: 'ACTIVE' },
        });

        checks.checks.game = {
          status: 'healthy',
          gameStatus: game?.status || 'NOT_STARTED',
          userCount,
          lobbyCount: game?._count.lobbies || 0,
          roundCount: game?._count.rounds || 0,
          activeRounds: activeRoundCount,
        };
      } catch (error) {
        checks.checks.detailedInfo = {
          status: 'failed',
          error: (error as Error).message,
        };
      }
    }

    // Overall status
    checks.status = isHealthy ? 'healthy' : 'unhealthy';
    
    return NextResponse.json(checks, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
