import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Schema for game parameters
const startGameSchema = z.object({
  lambda: z.number().min(0).max(1).default(0.5),
  beta: z.number().min(0).max(1).default(0.1),
  gamma: z.number().min(0).max(1).default(0.2),
  defaultDuration: z.number().min(10).max(600).default(60),
})

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await auth()

    // Check if admin
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body for parameters
    const body = await request.json().catch(() => ({}))
    const params = startGameSchema.parse(body)

    // Get all users with complete profiles
    const readyUsers = await prisma.user.findMany({
      where: {
        profileComplete: true,
        lobbyId: null, // Only assign users not already in a lobby
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (readyUsers.length === 0) {
      return NextResponse.json(
        { error: 'No users with complete profiles available' },
        { status: 400 }
      )
    }

    // Shuffle users for random assignment
    const shuffledUsers = readyUsers.sort(() => Math.random() - 0.5)

    // Create lobbies with max 15 players each
    const LOBBY_SIZE = 15
    const totalLobbies = Math.ceil(shuffledUsers.length / LOBBY_SIZE)
    const lobbiesCreated = []

    console.log(`[Lobby Assignment] Processing ${shuffledUsers.length} players, creating ${totalLobbies} lobby/lobbies`)

    // Create or find the game (look for NOT_STARTED, REGISTRATION_OPEN, LOBBIES_FORMING, or STAGE_1_ACTIVE)
    // This allows adding more lobbies to an existing game
    const existingGame = await prisma.game.findFirst({
      where: {
        status: {
          in: ['NOT_STARTED', 'REGISTRATION_OPEN', 'LOBBIES_FORMING', 'STAGE_1_ACTIVE'],
        },
      },
      include: {
        lobbies: {
          orderBy: {
            poolNumber: 'desc'
          },
          take: 1
        }
      }
    })

    // Get the next pool number to continue numbering from existing lobbies
    let nextPoolNumber = 1
    if (existingGame && existingGame.lobbies.length > 0) {
      nextPoolNumber = existingGame.lobbies[0].poolNumber + 1
    }

    let game
    if (!existingGame) {
      // Create new game if none exists
      game = await prisma.game.create({
        data: {
          status: 'LOBBIES_FORMING',
          currentStage: 1,
          startedAt: new Date(),
          lambda: params.lambda,
          beta: params.beta,
          gamma: params.gamma,
        },
      })
    } else if (existingGame.status === 'NOT_STARTED' || existingGame.status === 'REGISTRATION_OPEN') {
      // Update game status only if it's NOT_STARTED or REGISTRATION_OPEN
      game = await prisma.game.update({
        where: { id: existingGame.id },
        data: { 
          status: 'LOBBIES_FORMING',
          currentStage: 1,
          currentRound: 0,
          startedAt: new Date(),
          lambda: params.lambda,
          beta: params.beta,
          gamma: params.gamma,
        },
      })
    } else {
      // If game is already LOBBIES_FORMING or STAGE_1_ACTIVE, use it as-is
      game = existingGame
    }

    // Create lobbies and assign users (WAITING status initially)
    for (let i = 0; i < totalLobbies; i++) {
      const lobbyUsers = shuffledUsers.slice(i * LOBBY_SIZE, (i + 1) * LOBBY_SIZE)
      
      console.log(`[Lobby Assignment] Creating Pool ${nextPoolNumber + i} with ${lobbyUsers.length} players`)
      
      // Create lobby with current user count and WAITING status
      // Admin must manually activate lobbies using activate-lobbies endpoint
      const lobby = await prisma.lobby.create({
        data: {
          name: `Pool ${nextPoolNumber + i}`,
          poolNumber: nextPoolNumber + i,
          stage: 1,
          maxUsers: LOBBY_SIZE,
          currentUsers: lobbyUsers.length,
          status: 'WAITING', // Set to WAITING - admin must activate
          gameId: game.id,
        },
      })

      // Assign users to lobby
      await prisma.user.updateMany({
        where: {
          id: {
            in: lobbyUsers.map(u => u.id),
          },
        },
        data: {
          lobbyId: lobby.id,
        },
      })

      lobbiesCreated.push({
        id: lobby.id,
        name: lobby.name,
        playerCount: lobbyUsers.length,
      })
    }

    return NextResponse.json({
      message: 'Lobbies created successfully. Use "Activate Lobbies" to make them ready for play.',
      gameId: game.id,
      gameStatus: game.status,
      lobbiesCreated: lobbiesCreated.length,
      playersAssigned: shuffledUsers.length,
      lobbies: lobbiesCreated,
    })
  } catch (error) {
    console.error('Start game error:', error)
    return NextResponse.json(
      { error: 'Failed to start game' },
      { status: 500 }
    )
  }
}
