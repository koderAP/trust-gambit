import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Fetch active game with all related data (including NOT_STARTED for new games)
    // Get the most recent game that's not COMPLETED
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
        lobbies: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                profileComplete: true,
                domainRatings: {
                  select: {
                    domain: true,
                    rating: true,
                    reason: true
                  }
                }
              }
            }
          },
          orderBy: {
            poolNumber: 'asc'
          }
        },
        rounds: {
          orderBy: {
            roundNumber: 'desc'
          },
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
            },
            roundScores: {
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
            }
          }
        }
      }
    })

    // Fetch all users with their complete profiles
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        profileComplete: true,
        lobbyRequested: true,
        lobbyId: true,
        createdAt: true,
        domainRatings: {
          select: {
            domain: true,
            rating: true,
            reason: true
          }
        },
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

    // Calculate statistics
    const stats = {
      totalUsers: allUsers.length,
      profileCompleteUsers: allUsers.filter(u => u.profileComplete).length,
      profileIncompleteUsers: allUsers.filter(u => !u.profileComplete).length,
      usersInLobbies: allUsers.filter(u => u.lobbyId).length,
      usersWaitingForLobby: allUsers.filter(u => u.profileComplete && !u.lobbyId).length
    }

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
        totalLobbies: activeGame.lobbies.length,
        totalRounds: activeGame.rounds.length,
        rounds: activeGame.rounds.map(round => ({
          id: round.id,
          roundNumber: round.roundNumber,
          stage: round.stage,
          domain: round.domain,
          question: round.question,
          status: round.status,
          lobbyId: round.lobbyId,
          startTime: round.startTime,
          endTime: round.endTime,
          submissionsCount: round.submissions.length,
          scoresCalculated: round.roundScores.length > 0
        })),
        lobbies: activeGame.lobbies.map(lobby => {
          // Get rounds for this specific lobby
          const lobbyRounds = activeGame.rounds.filter(r => r.lobbyId === lobby.id)
          const currentLobbyRound = lobbyRounds.find(r => r.status === 'ACTIVE') || lobbyRounds[lobbyRounds.length - 1] || null
          
          return {
            id: lobby.id,
            name: lobby.name,
            poolNumber: lobby.poolNumber,
            stage: lobby.stage,
            status: lobby.status,
            maxUsers: lobby.maxUsers,
            currentPlayerCount: lobby.users.length,
            players: lobby.users.map(user => ({
              id: user.id,
              name: user.name,
              email: user.email,
              profileComplete: user.profileComplete,
              domainRatings: user.domainRatings
            })),
            currentRound: currentLobbyRound,
            totalRounds: lobbyRounds.length
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      activeGame: gameData,
      allUsers
    })
  } catch (error: any) {
    console.error('Error fetching game state:', error)
    return NextResponse.json(
      { error: 'Failed to fetch game state' },
      { status: 500 }
    )
  }
}
