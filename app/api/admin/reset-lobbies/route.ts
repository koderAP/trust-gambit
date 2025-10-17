import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/reset-lobbies
 * Resets all lobbies and removes users from them
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all lobbies
    const deletedLobbies = await prisma.lobby.deleteMany({});

    // Delete all rounds
    const deletedRounds = await prisma.round.deleteMany({});

    // Delete all submissions
    const deletedSubmissions = await prisma.submission.deleteMany({});

    // Delete all round scores
    const deletedScores = await prisma.roundScore.deleteMany({});

    // Reset all users - remove them from lobbies and set them to request lobby
    await prisma.user.updateMany({
      data: {
        lobbyId: null,
        lobbyRequested: true, // Set to true so they're ready for next assignment
      },
    });

    // Update all games to NOT_STARTED status
    await prisma.game.updateMany({
      data: {
        status: 'NOT_STARTED',
        currentStage: 0,
        currentRound: 0,
        startedAt: null,
        endedAt: null,
      },
    });

    return NextResponse.json({
      message: 'Lobbies reset successfully',
      lobbiesDeleted: deletedLobbies.count,
      roundsDeleted: deletedRounds.count,
      submissionsDeleted: deletedSubmissions.count,
      scoresDeleted: deletedScores.count,
    });
  } catch (error) {
    console.error('Reset lobbies error:', error);
    return NextResponse.json(
      { error: 'Failed to reset lobbies' },
      { status: 500 }
    );
  }
}
