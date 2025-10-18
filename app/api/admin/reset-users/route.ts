import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/reset-users
 * Removes all users from lobbies and resets their lobby request status
 * Should be used after game ends to prepare for next game
 */
// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if there's an ended game
    const endedGame = await prisma.game.findFirst({
      where: {
        status: 'ENDED',
      },
      orderBy: {
        endedAt: 'desc',
      },
    });

    if (!endedGame) {
      return NextResponse.json(
        { error: 'No ended game found. Please finish the current game first.' },
        { status: 400 }
      );
    }

    // Reset all users - remove them from lobbies
    const result = await prisma.user.updateMany({
      data: {
        lobbyId: null,
        lobbyRequested: false,
      },
    });

    return NextResponse.json({
      message: 'All users reset successfully',
      usersReset: result.count,
      gameId: endedGame.id,
    });
  } catch (error) {
    console.error('Reset users error:', error);
    return NextResponse.json(
      { error: 'Failed to reset users' },
      { status: 500 }
    );
  }
}
