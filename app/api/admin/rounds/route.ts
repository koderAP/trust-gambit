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
    const includeSubmissions = searchParams.get('includeSubmissions') === 'true' // default false
    const includeScores = searchParams.get('includeScores') === 'true' // default false
    const lobbyId = searchParams.get('lobbyId') // optional filter by lobby

    // Find the active game
    let game
    if (gameId) {
      game = await prisma.game.findUnique({
        where: { id: gameId },
        select: { id: true, status: true, currentRound: true, currentStage: true }
      })
    } else {
      // Get most recent non-completed game
      game = await prisma.game.findFirst({
        where: {
          status: { notIn: ['COMPLETED'] }
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true, currentRound: true, currentStage: true }
      })
    }

    if (!game) {
      return NextResponse.json({
        success: true,
        rounds: [],
        gameId: null
      })
    }

    // Build where clause
    const whereClause: any = { gameId: game.id }
    if (lobbyId) {
      whereClause.lobbyId = lobbyId
    }

    // Fetch rounds with configurable includes
    // IMPORTANT: Always fetch roundScores to check if scores are calculated,
    // but only include full details when requested
    const rounds = await prisma.round.findMany({
      where: whereClause,
      orderBy: { roundNumber: 'desc' },
      include: {
        submissions: includeSubmissions ? {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        } : false,
        roundScores: includeScores ? {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            totalScore: 'desc'
          }
        } : {
          // When not including full scores, just get count for scoresCalculated flag
          select: { id: true }
        }
      }
    })

    // Format response based on what was included
    const roundsData = rounds.map(round => {
      const baseData = {
        id: round.id,
        roundNumber: round.roundNumber,
        stage: round.stage,
        domain: round.domain,
        question: round.question,
        status: round.status,
        lobbyId: round.lobbyId,
        startTime: round.startTime,
        endTime: round.endTime,
        submissionsCount: includeSubmissions ? round.submissions?.length : undefined,
        // ALWAYS include scoresCalculated flag to show "✓ Scored" badge
        scoresCalculated: (round.roundScores?.length ?? 0) > 0
      }

      // Add submissions if requested
      if (includeSubmissions && round.submissions) {
        return {
          ...baseData,
          submissions: round.submissions
        }
      }

      // Add scores if requested
      if (includeScores && round.roundScores) {
        return {
          ...baseData,
          roundScores: round.roundScores
        }
      }

      return baseData
    })

    return NextResponse.json({
      success: true,
      gameId: game.id,
      gameStatus: game.status,
      currentRound: game.currentRound,
      currentStage: game.currentStage,
      rounds: roundsData
    })
  } catch (error: any) {
    console.error('Error fetching rounds:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rounds' },
      { status: 500 }
    )
  }
}
