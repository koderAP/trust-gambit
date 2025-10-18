import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/consolidate-lobbies
 * Consolidates small WAITING lobbies by reassigning players to fill lobbies optimally
 * Only works on lobbies in WAITING status to avoid disrupting active games
 */
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: 'gameId is required' }, { status: 400 });
    }

    // Find the game with its WAITING lobbies
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        lobbies: {
          where: { status: 'WAITING' },
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            poolNumber: 'asc',
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.lobbies.length === 0) {
      return NextResponse.json(
        { error: 'No WAITING lobbies found to consolidate' },
        { status: 400 }
      );
    }

    // Collect all players from WAITING lobbies
    const allPlayers = game.lobbies.flatMap((lobby) => lobby.users);

    if (allPlayers.length === 0) {
      return NextResponse.json(
        { error: 'No players in WAITING lobbies' },
        { status: 400 }
      );
    }

    console.log(`[Consolidate] Found ${allPlayers.length} players in ${game.lobbies.length} WAITING lobbies`);

    // Delete all WAITING lobbies (this will unassign the players via foreign key)
    await prisma.user.updateMany({
      where: {
        lobbyId: {
          in: game.lobbies.map((l) => l.id),
        },
      },
      data: {
        lobbyId: null,
      },
    });

    await prisma.lobby.deleteMany({
      where: {
        id: {
          in: game.lobbies.map((l) => l.id),
        },
      },
    });

    // Get the next pool number
    const existingLobbies = await prisma.lobby.findMany({
      where: { gameId },
      orderBy: { poolNumber: 'desc' },
      take: 1,
    });

    let nextPoolNumber = 1;
    if (existingLobbies.length > 0) {
      nextPoolNumber = existingLobbies[0].poolNumber + 1;
    }

    // Shuffle players for random assignment
    const shuffledPlayers = allPlayers.sort(() => Math.random() - 0.5);

    // Create optimally-sized lobbies
    const LOBBY_SIZE = 15;
    const totalLobbies = Math.ceil(shuffledPlayers.length / LOBBY_SIZE);
    const newLobbies = [];

    for (let i = 0; i < totalLobbies; i++) {
      const lobbyPlayers = shuffledPlayers.slice(i * LOBBY_SIZE, (i + 1) * LOBBY_SIZE);

      console.log(`[Consolidate] Creating Pool ${nextPoolNumber + i} with ${lobbyPlayers.length} players`);

      const lobby = await prisma.lobby.create({
        data: {
          name: `Pool ${nextPoolNumber + i}`,
          poolNumber: nextPoolNumber + i,
          stage: 1,
          maxUsers: LOBBY_SIZE,
          currentUsers: lobbyPlayers.length,
          status: 'WAITING',
          gameId: game.id,
        },
      });

      // Assign players to lobby
      await prisma.user.updateMany({
        where: {
          id: {
            in: lobbyPlayers.map((p) => p.id),
          },
        },
        data: {
          lobbyId: lobby.id,
        },
      });

      newLobbies.push({
        id: lobby.id,
        name: lobby.name,
        playerCount: lobbyPlayers.length,
      });
    }

    return NextResponse.json({
      message: 'Lobbies consolidated successfully',
      oldLobbies: game.lobbies.length,
      newLobbies: newLobbies.length,
      totalPlayers: allPlayers.length,
      lobbies: newLobbies,
    });
  } catch (error) {
    console.error('Consolidate lobbies error:', error);
    return NextResponse.json(
      { error: 'Failed to consolidate lobbies' },
      { status: 500 }
    );
  }
}
