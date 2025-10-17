import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const finishStage2Schema = z.object({
  gameId: z.string(),
});

/**
 * POST /api/admin/finish-stage-2
 * Finishes Stage 2 and ends the game
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = finishStage2Schema.parse(body);

    // Get game with Stage 2 lobbies
    const game = await prisma.game.findUnique({
      where: { id: validatedData.gameId },
      include: {
        lobbies: {
          where: { stage: 2 },
          include: {
            users: {
              include: {
                roundScores: true,
              },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.currentStage !== 2) {
      return NextResponse.json(
        { error: 'Game is not in Stage 2' },
        { status: 400 }
      );
    }

    // Check if there are any active rounds
    const activeRounds = await prisma.round.findMany({
      where: {
        gameId: validatedData.gameId,
        status: 'ACTIVE',
      },
    });

    if (activeRounds.length > 0) {
      return NextResponse.json(
        { error: 'There are still active rounds. Please end them first.' },
        { status: 400 }
      );
    }

    // Calculate total scores for all Stage 2 players
    const allPlayers: { userId: string; userName: string; totalScore: number }[] = [];

    for (const lobby of game.lobbies) {
      for (const user of lobby.users) {
        const totalScore = user.roundScores.reduce((sum, score) => sum + score.totalScore, 0);
        allPlayers.push({
          userId: user.id,
          userName: user.name || 'Unknown',
          totalScore,
        });
      }
    }

    // Sort by total score descending to find winner
    const sortedPlayers = allPlayers.sort((a, b) => b.totalScore - a.totalScore);
    const winner = sortedPlayers[0];

    // Update Stage 2 lobbies to COMPLETED status
    await prisma.lobby.updateMany({
      where: {
        gameId: validatedData.gameId,
        stage: 2,
      },
      data: {
        status: 'COMPLETED',
      },
    });

    // Update game to ENDED status
    await prisma.game.update({
      where: { id: validatedData.gameId },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    console.log('Game ended. Winner:', winner);

    return NextResponse.json({
      message: 'Stage 2 and game completed successfully',
      winner: winner || null,
      totalPlayers: allPlayers.length,
      finalStandings: sortedPlayers.slice(0, 10), // Top 10
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Finish Stage 2 error:', error);
    return NextResponse.json(
      { error: 'Failed to finish Stage 2' },
      { status: 500 }
    );
  }
}
