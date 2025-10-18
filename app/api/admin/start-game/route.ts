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

    // Create or find the game (look for NOT_STARTED or REGISTRATION_OPEN)
    let game = await prisma.game.findFirst({
      where: {
        status: {
          in: ['NOT_STARTED', 'REGISTRATION_OPEN'],
        },
      },
    })

    if (!game) {
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
    } else {
      // Update game status to STAGE_1_ACTIVE (ready to start rounds)
      game = await prisma.game.update({
        where: { id: game.id },
        data: { 
          status: 'STAGE_1_ACTIVE',
          currentStage: 1,
          currentRound: 0,
          startedAt: new Date(),
          lambda: params.lambda,
          beta: params.beta,
          gamma: params.gamma,
        },
      })
    }

    // Create lobbies and assign users (ACTIVE status - ready for rounds)
    for (let i = 0; i < totalLobbies; i++) {
      const lobbyUsers = shuffledUsers.slice(i * LOBBY_SIZE, (i + 1) * LOBBY_SIZE)
      
      // Create lobby with current user count and ACTIVE status
      const lobby = await prisma.lobby.create({
        data: {
          name: `Pool ${i + 1}`,
          poolNumber: i + 1,
          stage: 1,
          maxUsers: LOBBY_SIZE,
          currentUsers: lobbyUsers.length,
          status: 'ACTIVE', // Set to ACTIVE immediately
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
      message: 'Game started successfully',
      gameId: game.id,
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
