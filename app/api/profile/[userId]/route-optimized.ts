import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';
import { cacheGet, cacheSet, cacheInvalidatePattern } from '@/lib/redis';
import { withRateLimit, API_RATE_LIMIT } from '@/lib/rateLimit';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/profile/[userId]
 * Get user profile with caching to reduce database load
 */
async function handleGetProfile(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    // Try cache first
    const cacheKey = `profile:${userId}`;
    const cached = await cacheGet(cacheKey);
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
        },
      });
    }

    // Cache miss - fetch from database
    const profile = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          hostelName: true,
          profileComplete: true,
          lobbyRequested: true,
          lobbyId: true,
          lobby: {
            select: {
              id: true,
              name: true,
              poolNumber: true,
              stage: true,
              status: true,
              currentUsers: true,
              maxUsers: true,
            },
          },
          domainRatings: {
            select: {
              domain: true,
              rating: true,
              reason: true,
            },
          },
        },
      })
    );

    if (!profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current round if user is in a lobby
    let currentRound = null;
    if (profile.lobbyId) {
      currentRound = await withRetry(() =>
        prisma.round.findFirst({
          where: {
            lobbyId: profile.lobbyId!,
            status: 'ACTIVE',
          },
          select: {
            id: true,
            roundNumber: true,
            status: true,
            question: true,
            startTime: true,
            endTime: true,
            durationSeconds: true,
          },
        })
      );
    }

    const response = {
      ...profile,
      currentRound,
    };

    // Cache for 30 seconds (balance between freshness and performance)
    await cacheSet(cacheKey, response, 30);

    return NextResponse.json(response, {
      headers: {
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile/[userId]
 * Update user profile and invalidate cache
 */
async function handleUpdateProfile(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const body = await request.json();

    const updatedProfile = await withRetry(() =>
      prisma.user.update({
        where: { id: userId },
        data: body,
        select: {
          id: true,
          email: true,
          name: true,
          hostelName: true,
          profileComplete: true,
          lobbyRequested: true,
        },
      })
    );

    // Invalidate cache
    await cacheInvalidatePattern(`profile:${userId}*`);

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// Apply rate limiting
export const GET = withRateLimit(handleGetProfile, API_RATE_LIMIT);
export const PUT = withRateLimit(handleUpdateProfile, API_RATE_LIMIT);
