import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/end-game
 * Ends the current game and resets all players to waiting for lobby state
 * Does NOT create a new game - just cleans up the current one
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the current active game
    const activeGame = await prisma.game.findFirst({
      where: {
        status: {
          in: ['LOBBIES_FORMING', 'STAGE_1_ACTIVE', 'STAGE_2_ACTIVE', 'ENDED'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!activeGame) {
      return NextResponse.json(
        { error: 'No active game found' },
        { status: 404 }
      );
    }

    // Mark game as ENDED if not already
    if (activeGame.status !== 'ENDED') {
      await prisma.game.update({
        where: { id: activeGame.id },
        data: {
          status: 'ENDED',
          endedAt: new Date(),
        },
      });
    }

    // Reset all users - remove from lobbies but set lobbyRequested to true
    const result = await prisma.user.updateMany({
      data: {
        lobbyId: null,
        lobbyRequested: true, // Set to waiting for lobby
      },
    });

    // Mark all lobbies as COMPLETED
    await prisma.lobby.updateMany({
      where: {
        gameId: activeGame.id,
      },
      data: {
        status: 'COMPLETED',
      },
    });

    return NextResponse.json({
      message: 'Game ended successfully. All players are now waiting for next lobby assignment.',
      gameId: activeGame.id,
      usersReset: result.count,
      playersWaitingForLobby: result.count,
    });
  } catch (error) {
    console.error('End game error:', error);
    return NextResponse.json(
      { error: 'Failed to end game' },
      { status: 500 }
    );
  }
}
