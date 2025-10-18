import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/create-new-game
 * Creates a fresh new game (after previous game ended)
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

    // Check if there's an active game (not ENDED, NOT_STARTED, or COMPLETED)
    const activeGame = await prisma.game.findFirst({
      where: {
        status: {
          notIn: ['NOT_STARTED', 'ENDED', 'COMPLETED'],
        },
      },
    });

    if (activeGame) {
      return NextResponse.json(
        { error: 'There is already an active game. Please end it first.' },
        { status: 400 }
      );
    }

    // Mark all old games (ENDED, NOT_STARTED) as COMPLETED (archive them)
    await prisma.game.updateMany({
      where: {
        status: {
          in: ['NOT_STARTED', 'ENDED'],
        },
      },
      data: {
        status: 'COMPLETED',
      },
    });

    // IMPORTANT: Reset users BEFORE deleting lobbies (to clear foreign key references)
    await prisma.user.updateMany({
      data: {
        lobbyId: null,
        lobbyRequested: true, // Users ready for new lobby assignment
      },
    });

    // Complete cleanup: Delete all old game data (lobbies, rounds, submissions, scores)
    await prisma.roundScore.deleteMany({});
    await prisma.submission.deleteMany({});
    await prisma.round.deleteMany({});
    await prisma.lobby.deleteMany({});

    // Reset all questions to unused/not asked so they can be used in the new game
    const questionsReset = await prisma.question.updateMany({
      where: {
        isUsed: true,
      },
      data: {
        isUsed: false,
      },
    });

    // Create new game with NOT_STARTED status
    const newGame = await prisma.game.create({
      data: {
        name: 'Trust Gambit Competition',
        status: 'NOT_STARTED',
        currentStage: 0,
        currentRound: 0,
        lambda: 0.5,
        beta: 0.1,
        gamma: 0.2,
      },
    });

    return NextResponse.json({
      message: 'New game created successfully',
      game: {
        id: newGame.id,
        name: newGame.name,
        status: newGame.status,
      },
      questionsReset: questionsReset.count,
    });
  } catch (error) {
    console.error('Create new game error:', error);
    return NextResponse.json(
      { error: 'Failed to create new game' },
      { status: 500 }
    );
  }
}
