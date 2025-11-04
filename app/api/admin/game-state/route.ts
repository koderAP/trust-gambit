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

    // Get query parameters for selective data fetching
    const searchParams = request.nextUrl.searchParams
    const includeLobbies = searchParams.get('includeLobbies') !== 'false' // default true
    const includeRounds = searchParams.get('includeRounds') !== 'false' // default true
    const includeUsers = searchParams.get('includeUsers') !== 'false' // default true
    const includeSubmissions = searchParams.get('includeSubmissions') === 'true' // default false
    const includeScores = searchParams.get('includeScores') === 'true' // default false

    // Fetch active game with conditional includes
    const activeGame = await prisma.game.findFirst({
      where: {
        status: {
          notIn: ['COMPLETED']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        lobbies: includeLobbies ? {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                profileComplete: true
              }
            }
          },
          orderBy: {
            poolNumber: 'asc'
          }
        } : false,
        rounds: includeRounds ? {
          orderBy: {
            roundNumber: 'desc'
          },
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
        } : false
      }
    })

    // Fetch all users with their complete profiles (only if requested)
    let allUsers = []
    if (includeUsers) {
      allUsers = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          profileComplete: true,
          lobbyRequested: true,
          lobbyId: true,
          createdAt: true,
          lobby: {
            select: {
              id: true,
              name: true,
              poolNumber: true,
              stage: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Fetch domain ratings separately for better performance
      const allRatings = await prisma.domainRating.findMany({
        where: {
          userId: { in: allUsers.map(u => u.id) }
        },
        select: {
          userId: true,
          domain: true,
          rating: true,
          reason: true
        }
      })

      const domainRatingsMap = allRatings.reduce((acc, rating) => {
        if (!acc[rating.userId]) {
          acc[rating.userId] = []
        }
        acc[rating.userId].push({
          domain: rating.domain,
          rating: rating.rating,
          reason: rating.reason
        })
        return acc
      }, {} as Record<string, any[]>)

      // Add domain ratings to users
      allUsers = allUsers.map((user: any) => ({
        ...user,
        domainRatings: domainRatingsMap[user.id] || []
      }))
    }

    // Calculate statistics (always included as they're lightweight)
    const stats = {
      totalUsers: includeUsers ? allUsers.length : await prisma.user.count(),
      profileCompleteUsers: includeUsers 
        ? allUsers.filter((u: any) => u.profileComplete).length 
        : await prisma.user.count({ where: { profileComplete: true } }),
      profileIncompleteUsers: 0, // will be calculated below
      usersInLobbies: includeUsers
        ? allUsers.filter((u: any) => u.lobbyId).length
        : await prisma.user.count({ where: { lobbyId: { not: null } } }),
      usersWaitingForLobby: 0 // will be calculated below
    }
    stats.profileIncompleteUsers = stats.totalUsers - stats.profileCompleteUsers
    stats.usersWaitingForLobby = stats.profileCompleteUsers - stats.usersInLobbies

    // Format active game data
    let gameData = null
    if (activeGame) {
      gameData = {
        id: activeGame.id,
        status: activeGame.status,
        currentStage: activeGame.currentStage,
        currentRound: activeGame.currentRound,
        startedAt: activeGame.startedAt,
        lambda: activeGame.lambda,
        beta: activeGame.beta,
        gamma: activeGame.gamma,
        passScore: activeGame.passScore,
        allowProfileEdits: activeGame.allowProfileEdits,
        totalLobbies: includeLobbies ? (activeGame.lobbies as any[])?.length ?? 0 : undefined,
        totalRounds: includeRounds ? (activeGame.rounds as any[])?.length ?? 0 : undefined,
        ...(includeRounds && activeGame.rounds && {
          rounds: (activeGame.rounds as any[]).map((round: any) => ({
            id: round.id,
            roundNumber: round.roundNumber,
            stage: round.stage,
            domain: round.domain,
            question: round.question,
            status: round.status,
            lobbyId: round.lobbyId,
            startTime: round.startTime,
            endTime: round.endTime,
            submissionsCount: includeSubmissions ? round.submissions?.length ?? 0 : undefined,
            // ALWAYS include scoresCalculated flag to show "✓ Scored" badge
            scoresCalculated: (round.roundScores?.length ?? 0) > 0
          }))
        }),
        ...(includeLobbies && activeGame.lobbies && {
          lobbies: (activeGame.lobbies as any[]).map((lobby: any) => {
            // Get rounds for this specific lobby (only if rounds are included)
            let currentLobbyRound = null
            let totalRounds = 0
            
            if (includeRounds && activeGame.rounds) {
              const lobbyRounds = (activeGame.rounds as any[]).filter((r: any) => r.lobbyId === lobby.id)
              currentLobbyRound = lobbyRounds.find((r: any) => r.status === 'ACTIVE') || lobbyRounds[lobbyRounds.length - 1] || null
              totalRounds = lobbyRounds.length
            }
            
            return {
              id: lobby.id,
              name: lobby.name,
              poolNumber: lobby.poolNumber,
              stage: lobby.stage,
              status: lobby.status,
              maxUsers: lobby.maxUsers,
              currentPlayerCount: lobby.users?.length ?? 0,
              players: lobby.users?.map((user: any) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                profileComplete: user.profileComplete
              })) ?? [],
              currentRound: currentLobbyRound,
              totalRounds: totalRounds
            }
          })
        })
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      activeGame: gameData,
      ...(includeUsers && { allUsers })
    })
  } catch (error: any) {
    console.error('Error fetching game state:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    )
  }
}
