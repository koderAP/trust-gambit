import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cacheInvalidatePattern } from '@/lib/redis';
import { z } from 'zod';

const startRoundSchema = z.object({
  lobbyId: z.string(),
  roundNumber: z.number().min(1),
  domain: z.string(),
  question: z.string(),
  correctAnswer: z.string(),
  durationSeconds: z.number().default(60),
});

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = startRoundSchema.parse(body);

    // Check if lobby exists
    const lobby = await prisma.lobby.findUnique({
      where: { id: validatedData.lobbyId },
      include: { game: true },
    });

    if (!lobby) {
      return NextResponse.json(
        { error: 'Lobby not found' },
        { status: 404 }
      );
    }

    // Check if there's already an active round for this lobby
    const activeRound = await prisma.round.findFirst({
      where: {
        lobbyId: validatedData.lobbyId,
        status: 'ACTIVE',
      },
    });

    if (activeRound) {
      return NextResponse.json(
        { error: 'There is already an active round for this lobby' },
        { status: 400 }
      );
    }

    // Create the new round
    const round = await prisma.round.create({
      data: {
        gameId: lobby.gameId,
        lobbyId: validatedData.lobbyId,
        roundNumber: validatedData.roundNumber,
        stage: lobby.stage,
        domain: validatedData.domain,
        question: validatedData.question,
        correctAnswer: validatedData.correctAnswer,
        status: 'ACTIVE',
        startTime: new Date(),
        durationSeconds: validatedData.durationSeconds,
      },
    });

    // Invalidate profile cache for all users in the lobby (parallel for performance)
    const lobbyUsers = await prisma.user.findMany({
      where: { lobbyId: validatedData.lobbyId },
      select: { id: true }
    });
    
    // Use Promise.all for parallel invalidation instead of sequential
    await Promise.all(
      lobbyUsers.map(user => cacheInvalidatePattern(`profile:${user.id}*`))
    );

    return NextResponse.json({
      message: 'Round started successfully',
      round,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Start round error:', error);
    return NextResponse.json(
      { error: 'Failed to start round' },
      { status: 500 }
    );
  }
}
