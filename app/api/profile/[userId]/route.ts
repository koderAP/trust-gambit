import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet } from '@/lib/redis'

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Try cache first (5 second TTL for balance between freshness and performance)
    const cacheKey = `profile:${userId}`;
    const cached = await cacheGet(cacheKey);
    
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Cache': 'HIT',
        }
      });
    }

    // Cache miss - fetch from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        domainRatings: {
          orderBy: {
            rating: 'desc',
          },
        },
        lobby: {
          include: {
            users: {
              select: { id: true, name: true }
            }
          }
        }
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Don't send password to client
    const { password, ...userWithoutPassword } = user

    // Attach lobby info and current round if assigned
    let lobbyInfo = null
    let currentRound = null
    if (user.lobby) {
      lobbyInfo = {
        id: user.lobby.id,
        name: user.lobby.name,
        poolNumber: user.lobby.poolNumber,
        stage: user.lobby.stage,
        status: user.lobby.status,
        users: user.lobby.users,
      }
      // Fetch current active round for this lobby
      const round = await prisma.round.findFirst({
        where: { lobbyId: user.lobby.id, status: 'ACTIVE' },
        orderBy: { roundNumber: 'desc' }
      })
      if (round) currentRound = round
    }

    const response = {
      ...userWithoutPassword,
      lobby: lobbyInfo,
      currentRound,
    };

    // Cache for 5 seconds (balance between freshness and performance)
    // Important: Shorter TTL = better UX (faster updates)
    // With smart cache invalidation, critical changes are instant anyway
    await cacheSet(cacheKey, response, 5);

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Cache': 'MISS',
      }
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    )
  }
}
