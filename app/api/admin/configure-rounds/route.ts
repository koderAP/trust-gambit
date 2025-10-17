import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for round configuration
const roundConfigSchema = z.object({
  roundNumber: z.number().min(1).max(20),
  stage: z.number().min(1).max(2),
  domain: z.string(),
  question: z.string(),
  correctAnswer: z.string(),
  durationSeconds: z.number().min(10).max(600).default(60),
});

const configureRoundsSchema = z.object({
  gameId: z.string(),
  rounds: z.array(roundConfigSchema),
});

/**
 * POST /api/admin/configure-rounds
 * Configure all rounds for a game (20 for Stage 1, 8 for Stage 2)
 * This should be done during game setup, before rounds actually start
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = configureRoundsSchema.parse(body);

    // Verify game exists
    const game = await prisma.game.findUnique({
      where: { id: validatedData.gameId },
      include: { lobbies: true },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Validate round numbers and stages
    const stage1Rounds = validatedData.rounds.filter(r => r.stage === 1);
    const stage2Rounds = validatedData.rounds.filter(r => r.stage === 2);

    if (stage1Rounds.length > 20) {
      return NextResponse.json(
        { error: 'Stage 1 can have maximum 20 rounds' },
        { status: 400 }
      );
    }

    if (stage2Rounds.length > 8) {
      return NextResponse.json(
        { error: 'Stage 2 can have maximum 8 rounds' },
        { status: 400 }
      );
    }

    // Delete existing round configurations (not active/completed rounds)
    await prisma.round.deleteMany({
      where: {
        gameId: validatedData.gameId,
        status: 'NOT_STARTED',
      },
    });

    // Create round templates for each lobby
    // These will be converted to actual rounds when admin starts them
    const roundTemplates = [];
    
    for (const lobby of game.lobbies) {
      for (const roundConfig of validatedData.rounds) {
        // Only create for lobbies matching the stage
        if (lobby.stage === roundConfig.stage) {
          roundTemplates.push({
            gameId: validatedData.gameId,
            lobbyId: lobby.id,
            roundNumber: roundConfig.roundNumber,
            stage: roundConfig.stage,
            domain: roundConfig.domain,
            question: roundConfig.question,
            correctAnswer: roundConfig.correctAnswer,
            durationSeconds: roundConfig.durationSeconds,
            status: 'NOT_STARTED',
          });
        }
      }
    }

    // Bulk create round templates
    await prisma.round.createMany({
      data: roundTemplates,
      skipDuplicates: true,
    });

    return NextResponse.json({
      message: 'Rounds configured successfully',
      roundsCreated: roundTemplates.length,
      stage1Rounds: stage1Rounds.length,
      stage2Rounds: stage2Rounds.length,
      lobbies: game.lobbies.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Configure rounds error:', error);
    return NextResponse.json(
      { error: 'Failed to configure rounds' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/configure-rounds?gameId=xxx
 * Get configured rounds for a game
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json(
        { error: 'gameId is required' },
        { status: 400 }
      );
    }

    const rounds = await prisma.round.findMany({
      where: { gameId },
      orderBy: [
        { stage: 'asc' },
        { roundNumber: 'asc' },
      ],
      select: {
        id: true,
        roundNumber: true,
        stage: true,
        domain: true,
        question: true,
        correctAnswer: true,
        durationSeconds: true,
        status: true,
        lobbyId: true,
      },
    });

    // Group by round number and stage
    const uniqueRounds = rounds.reduce((acc, round) => {
      const key = `${round.stage}-${round.roundNumber}`;
      if (!acc[key]) {
        acc[key] = {
          roundNumber: round.roundNumber,
          stage: round.stage,
          domain: round.domain,
          question: round.question,
          correctAnswer: round.correctAnswer,
          durationSeconds: round.durationSeconds,
          lobbyCount: 0,
        };
      }
      acc[key].lobbyCount++;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      rounds: Object.values(uniqueRounds),
      totalRounds: Object.keys(uniqueRounds).length,
    });
  } catch (error) {
    console.error('Get configured rounds error:', error);
    return NextResponse.json(
      { error: 'Failed to get configured rounds' },
      { status: 500 }
    );
  }
}
