import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';
import { cacheGet, cacheSet } from '@/lib/redis';
import { withRateLimit, API_RATE_LIMIT } from '@/lib/rateLimit';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/game-state
 * Fetch current game state with aggressive caching
 * This endpoint is polled frequently by the admin dashboard
 */
async function handleGetGameState(request: NextRequest) {
  try {
    // Cache for 5 seconds - balance between real-time and performance
    const cacheKey = 'game:state';
    const cached = await cacheGet(cacheKey);
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
        },
      });
    }

    // Fetch game state
    const game = await withRetry(() =>
      prisma.game.findFirst({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          status: true,
          currentStage: true,
          currentRound: true,
          lambda: true,
          beta: true,
          gamma: true,
          startedAt: true,
          endedAt: true,
          _count: {
            select: {
              lobbies: true,
              rounds: true,
            },
          },
        },
      })
    );

    if (!game) {
      return NextResponse.json(
        { error: 'No game found' },
        { status: 404 }
      );
    }

    // Get lobby statistics
    const lobbyStats = await withRetry(() =>
      prisma.lobby.groupBy({
        by: ['status'],
        where: { gameId: game.id },
        _count: true,
      })
    );

    // Get active round info
    let activeRound = null;
    if (game.status === 'STAGE_1_ACTIVE' || game.status === 'STAGE_2_ACTIVE') {
      activeRound = await withRetry(() =>
        prisma.round.findFirst({
          where: {
            gameId: game.id,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            roundNumber: true,
            stage: true,
            startTime: true,
            endTime: true,
            _count: {
              select: {
                submissions: true,
              },
            },
          },
        })
      );
    }

    const response = {
      game,
      lobbyStats: lobbyStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {} as Record<string, number>),
      activeRound,
    };

    // Cache for 5 seconds
    await cacheSet(cacheKey, response, 5);

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Game state fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handleGetGameState, {
  interval: 10000, // 10 seconds
  uniqueTokenPerInterval: 100,
  tokensPerInterval: 20, // Allow 20 requests per 10 seconds (2 req/sec per user)
});
