import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const startGlobalRoundSchema = z.object({
  gameId: z.string(),
  roundNumber: z.number().min(1),
  stage: z.number().min(1).max(2).optional(), // If not provided, use game's currentStage
  durationSeconds: z.number().min(10).max(600).optional(), // Optional override for round duration
});

/**
 * POST /api/admin/start-round
 * Starts a specific round number across ALL lobbies in the game simultaneously
 * Uses pre-configured round data from configure-rounds
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = startGlobalRoundSchema.parse(body);

    // Get game with lobbies
    const game = await prisma.game.findUnique({
      where: { id: validatedData.gameId },
      include: {
        lobbies: {
          where: {
            status: 'ACTIVE',
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

    if (game.lobbies.length === 0) {
      return NextResponse.json(
        { error: 'No active lobbies found' },
        { status: 400 }
      );
    }

    const stage = validatedData.stage || game.currentStage;

    // Check if there are any active rounds already
    const activeRounds = await prisma.round.findMany({
      where: {
        gameId: validatedData.gameId,
        status: 'ACTIVE',
      },
    });

    if (activeRounds.length > 0) {
      return NextResponse.json(
        {
          error: `There are already ${activeRounds.length} active rounds. Please end them first.`,
          activeRounds: activeRounds.map(r => ({
            id: r.id,
            roundNumber: r.roundNumber,
            lobbyId: r.lobbyId,
          })),
        },
        { status: 400 }
      );
    }

    // Find pre-configured rounds for this round number and stage
    let configuredRounds = await prisma.round.findMany({
      where: {
        gameId: validatedData.gameId,
        roundNumber: validatedData.roundNumber,
        stage: stage,
        status: 'NOT_STARTED',
        lobbyId: {
          in: game.lobbies.map(l => l.id),
        },
      },
    });

    // Try to find an unused global question for this stage
    const unusedQuestion = await prisma.question.findFirst({
      where: {
        stage: stage,
        isUsed: false,
      },
      orderBy: {
        createdAt: 'asc', // Use oldest first
      },
    });

    // If no pre-configured rounds exist, create them dynamically
    if (configuredRounds.length === 0) {
      let domain: string;
      let question: string;
      let correctAnswer: string;
      let imageUrl: string | null = null;

      if (unusedQuestion) {
        // Use an unused global question
        console.log(`Using global unused question (ID: ${unusedQuestion.id}) for Round ${validatedData.roundNumber}, Stage ${stage}`);
        domain = unusedQuestion.domain;
        question = unusedQuestion.question;
        correctAnswer = unusedQuestion.correctAnswer;
        imageUrl = unusedQuestion.imageUrl;
      } else {
        // Fall back to dummy questions
        console.log(`No unused questions found. Creating dummy question for Round ${validatedData.roundNumber}`);
        const domains = ['Algorithms', 'Finance', 'Economics', 'Statistics', 'Probability', 
                        'Machine Learning', 'Crypto', 'Biology', 'Indian History', 'Game Theory'];
        const domainIndex = (validatedData.roundNumber - 1) % domains.length;
        domain = domains[domainIndex];
        question = `Dummy Round ${validatedData.roundNumber} question - ${domain}`;
        correctAnswer = 'Dummy answer';
      }
      
      const roundCreates = game.lobbies.map(lobby =>
        prisma.round.create({
          data: {
            gameId: validatedData.gameId,
            lobbyId: lobby.id,
            roundNumber: validatedData.roundNumber,
            stage: stage,
            domain: domain,
            question: question,
            correctAnswer: correctAnswer,
            imageUrl: imageUrl,
            durationSeconds: validatedData.durationSeconds || 60,
            status: 'NOT_STARTED',
          },
        })
      );
      
      configuredRounds = await Promise.all(roundCreates);

      // Mark the global question as used
      if (unusedQuestion) {
        await prisma.question.update({
          where: { id: unusedQuestion.id },
          data: { isUsed: true },
        });
      }
    }

    if (configuredRounds.length !== game.lobbies.length) {
      return NextResponse.json(
        {
          error: `Mismatch: Found ${configuredRounds.length} configured rounds but ${game.lobbies.length} active lobbies`,
        },
        { status: 400 }
      );
    }

    // Start all rounds simultaneously
    const startTime = new Date();
    
    const updatePromises = configuredRounds.map(round =>
      prisma.round.update({
        where: { id: round.id },
        data: {
          status: 'ACTIVE',
          startTime: startTime,
          // Apply duration override if provided
          ...(validatedData.durationSeconds && { durationSeconds: validatedData.durationSeconds }),
        },
      })
    );

    await Promise.all(updatePromises);

    // Update game current round
    await prisma.game.update({
      where: { id: validatedData.gameId },
      data: {
        currentRound: validatedData.roundNumber,
        currentStage: stage,
      },
    });

    return NextResponse.json({
      message: `Round ${validatedData.roundNumber} started across all lobbies`,
      roundNumber: validatedData.roundNumber,
      stage: stage,
      lobbiesAffected: game.lobbies.length,
      roundsStarted: configuredRounds.length,
      startTime: startTime.toISOString(),
      durationSeconds: configuredRounds[0].durationSeconds,
      domain: configuredRounds[0].domain,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Start global round error:', error);
    return NextResponse.json(
      { error: 'Failed to start round' },
      { status: 500 }
    );
  }
}
