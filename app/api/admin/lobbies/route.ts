import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await auth()
    
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const gameId = searchParams.get('gameId')
    const includePlayers = searchParams.get('includePlayers') !== 'false' // default true
    const includeCurrentRound = searchParams.get('includeCurrentRound') !== 'false' // default true

    // Find the active game
    let game
    if (gameId) {
      game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { id: true, status: true }
      })
    } else {
      // Get most recent non-completed game
      game = await prisma.game.findFirst({
        where: {
          status: { notIn: ['COMPLETED'] }
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true }
      })
    }

    if (!game) {
      return NextResponse.json({
        success: true,
        lobbies: [],
        gameId: null
      })
    }

    // Fetch lobbies with configurable includes
    const lobbies = await prisma.lobby.findMany({
      where: { gameId: game.id },
      orderBy: { poolNumber: 'asc' },
      include: {
        users: includePlayers ? {
          select: {
            id: true,
            name: true,
            email: true,
            profileComplete: true
          }
        } : false
      }
    })

    // If includeCurrentRound, fetch round info for each lobby
    let lobbyData = lobbies.map(lobby => ({
      id: lobby.id,
      name: lobby.name,
      poolNumber: lobby.poolNumber,
      stage: lobby.stage,
      status: lobby.status,
      maxUsers: lobby.maxUsers,
      currentPlayerCount: includePlayers ? lobby.users?.length : undefined,
      players: includePlayers ? lobby.users?.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        profileComplete: user.profileComplete
      })) : undefined
    }))

    // Fetch current round info if requested
    if (includeCurrentRound) {
      const lobbyIds = lobbies.map(l => l.id)
      const rounds = await prisma.round.findMany({
        where: {
          lobbyId: { in: lobbyIds },
          status: 'ACTIVE'
        },
        select: {
          id: true,
          roundNumber: true,
          stage: true,
          domain: true,
          question: true,
          status: true,
          lobbyId: true,
          startTime: true,
          endTime: true
        }
      })

      // Also get total rounds count per lobby
      const allRounds = await prisma.round.findMany({
        where: {
          lobbyId: { in: lobbyIds }
        },
        select: {
          lobbyId: true
        }
      })

      const roundCountMap = allRounds.reduce((acc, r) => {
        if (r.lobbyId) {
          acc[r.lobbyId] = (acc[r.lobbyId] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      const roundMap = rounds.reduce((acc, r) => {
        if (r.lobbyId) {
          acc[r.lobbyId] = r
        }
        return acc
      }, {} as Record<string, any>)

      lobbyData = lobbyData.map(lobby => ({
        ...lobby,
        currentRound: roundMap[lobby.id] || null,
        totalRounds: roundCountMap[lobby.id] || 0
      }))
    }

    return NextResponse.json({
      success: true,
      gameId: game.id,
      gameStatus: game.status,
      lobbies: lobbyData
    })
  } catch (error: any) {
    console.error('Error fetching lobbies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lobbies' },
      { status: 500 }
    )
  }
}
