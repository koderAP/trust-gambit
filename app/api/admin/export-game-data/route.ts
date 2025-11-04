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
    
    if (!gameId) {
      return NextResponse.json(
        { error: 'gameId is required' },
        { status: 400 }
      )
    }

    console.log(`📥 Exporting game data for game: ${gameId}`)

    // 1. Get Game Info
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        lobbies: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                profileComplete: true,
                lobbyRequested: true,
                createdAt: true
              }
            }
          }
        },
        rounds: {
          include: {
            submissions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // 2. Get all users (including those not in lobbies yet)
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        hostelName: true,
        profileComplete: true,
        lobbyRequested: true,
        lobbyId: true,
        createdAt: true,
        updatedAt: true,
        domainRatings: {
          select: {
            domain: true,
            rating: true,
            reason: true
          }
        },
        roundScores: {
          where: {
            round: {
              gameId: gameId
            }
          },
          include: {
            round: {
              select: {
                roundNumber: true,
                stage: true,
                domain: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // 3. Get all submissions for this game
    const allSubmissions = await prisma.submission.findMany({
      where: {
        round: {
          gameId: gameId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        round: {
          select: {
            id: true,
            roundNumber: true,
            stage: true,
            domain: true,
            question: true,
            correctAnswer: true
          }
        }
      },
      orderBy: [
        { round: { roundNumber: 'asc' } },
        { submittedAt: 'asc' }
      ]
    })

    // Get delegated user info separately (delegateTo is just an ID)
    const delegateUserIds = allSubmissions
      .filter(s => s.delegateTo !== null)
      .map(s => s.delegateTo as string)
    
    const delegateUsers = await prisma.user.findMany({
      where: { id: { in: delegateUserIds } },
      select: { id: true, name: true, email: true }
    })
    
    const delegateUsersMap = delegateUsers.reduce((acc, user) => {
      acc[user.id] = user
      return acc
    }, {} as Record<string, typeof delegateUsers[0]>)

    // 4. Get all round scores for this game
    const allRoundScores = await prisma.roundScore.findMany({
      where: {
        round: {
          gameId: gameId
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        round: {
          select: {
            id: true,
            roundNumber: true,
            stage: true,
            domain: true
          }
        }
      },
      orderBy: [
        { round: { roundNumber: 'asc' } },
        { totalScore: 'desc' }
      ]
    })

    // 5. Calculate some useful statistics
    const stats = {
      totalUsers: allUsers.length,
      completedProfiles: allUsers.filter(u => u.profileComplete).length,
      requestedLobbies: allUsers.filter(u => u.lobbyRequested).length,
      totalLobbies: game.lobbies.length,
      stage1Lobbies: game.lobbies.filter(l => l.stage === 1).length,
      stage2Lobbies: game.lobbies.filter(l => l.stage === 2).length,
      totalRounds: game.rounds.length,
      stage1Rounds: game.rounds.filter(r => r.stage === 1).length,
      stage2Rounds: game.rounds.filter(r => r.stage === 2).length,
      totalSubmissions: allSubmissions.length,
      delegatedSubmissions: allSubmissions.filter(s => s.delegateTo !== null).length,
      directSubmissions: allSubmissions.filter(s => s.delegateTo === null).length,
    }

    // 6. Build the complete export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      game: {
        id: game.id,
        name: game.name,
        status: game.status,
        currentStage: game.currentStage,
        currentRound: game.currentRound,
        allowProfileEdits: game.allowProfileEdits,
        lambda: game.lambda,
        beta: game.beta,
        gamma: game.gamma,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt
      },
      statistics: stats,
      lobbies: game.lobbies.map(lobby => ({
        id: lobby.id,
        name: lobby.name,
        poolNumber: lobby.poolNumber,
        stage: lobby.stage,
        maxUsers: lobby.maxUsers,
        currentUsers: lobby.currentUsers,
        status: lobby.status,
        createdAt: lobby.createdAt,
        users: lobby.users.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          profileComplete: u.profileComplete,
          lobbyRequested: u.lobbyRequested,
          createdAt: u.createdAt
        }))
      })),
      users: allUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        hostelName: user.hostelName,
        profileComplete: user.profileComplete,
        lobbyRequested: user.lobbyRequested,
        lobbyId: user.lobbyId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        domainRatings: user.domainRatings,
        roundScores: user.roundScores.map(rs => ({
          roundNumber: rs.round.roundNumber,
          stage: rs.round.stage,
          domain: rs.round.domain,
          solveScore: rs.solveScore,
          delegateScore: rs.delegateScore,
          trustScore: rs.trustScore,
          totalScore: rs.totalScore,
          inCycle: rs.inCycle,
          distanceFromSolver: rs.distanceFromSolver
        }))
      })),
      rounds: game.rounds.map(round => ({
        id: round.id,
        roundNumber: round.roundNumber,
        stage: round.stage,
        domain: round.domain,
        question: round.question,
        correctAnswer: round.correctAnswer,
        imageUrl: round.imageUrl,
        status: round.status,
        startTime: round.startTime,
        endTime: round.endTime,
        durationSeconds: round.durationSeconds,
        lobbyId: round.lobbyId,
        createdAt: round.createdAt,
        submissions: round.submissions.map(sub => ({
          id: sub.id,
          userId: sub.user.id,
          userName: sub.user.name,
          userEmail: sub.user.email,
          action: sub.action,
          answer: sub.answer,
          isCorrect: sub.isCorrect,
          delegateToId: sub.delegateTo,
          delegateToName: sub.delegateTo ? delegateUsersMap[sub.delegateTo]?.name : null,
          delegateToEmail: sub.delegateTo ? delegateUsersMap[sub.delegateTo]?.email : null,
          submittedAt: sub.submittedAt
        }))
      })),
      submissions: allSubmissions.map(sub => ({
        id: sub.id,
        roundId: sub.round.id,
        roundNumber: sub.round.roundNumber,
        stage: sub.round.stage,
        domain: sub.round.domain,
        userId: sub.user.id,
        userName: sub.user.name,
        userEmail: sub.user.email,
        action: sub.action,
        answer: sub.answer,
        isCorrect: sub.isCorrect,
        delegateToId: sub.delegateTo,
        delegateToName: sub.delegateTo ? delegateUsersMap[sub.delegateTo]?.name : null,
        delegateToEmail: sub.delegateTo ? delegateUsersMap[sub.delegateTo]?.email : null,
        submittedAt: sub.submittedAt
      })),
      roundScores: allRoundScores.map(rs => ({
        userId: rs.user.id,
        userName: rs.user.name,
        userEmail: rs.user.email,
        roundId: rs.round.id,
        roundNumber: rs.round.roundNumber,
        stage: rs.round.stage,
        domain: rs.round.domain,
        solveScore: rs.solveScore,
        delegateScore: rs.delegateScore,
        trustScore: rs.trustScore,
        totalScore: rs.totalScore,
        inCycle: rs.inCycle,
        distanceFromSolver: rs.distanceFromSolver
      }))
    }

    console.log(`✅ Exported game data: ${stats.totalUsers} users, ${stats.totalLobbies} lobbies, ${stats.totalRounds} rounds, ${stats.totalSubmissions} submissions`)

    // Return as JSON (can be saved to a file on the client side)
    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="trust-gambit-game-${gameId}-${new Date().toISOString()}.json"`
      }
    })

  } catch (error: any) {
    console.error('❌ Error exporting game data:', error)
    return NextResponse.json(
      { error: 'Failed to export game data', details: error.message },
      { status: 500 }
    )
  }
}
