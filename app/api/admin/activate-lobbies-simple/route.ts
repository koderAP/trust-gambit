import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const activateLobbiesSchema = z.object({
  gameId: z.string(),
});

/**
 * POST /api/admin/activate-lobbies-simple
 * Simply changes lobby status from WAITING to ACTIVE
 * Does NOT create rounds or change game status
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

    const body = await request.json();
    const validatedData = activateLobbiesSchema.parse(body);

    // Find the game
    const game = await prisma.game.findUnique({
      where: { id: validatedData.gameId },
      include: { lobbies: true },
    });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    // Find lobbies that are WAITING
    const waitingLobbies = game.lobbies.filter(lobby => lobby.status === 'WAITING');

    if (waitingLobbies.length === 0) {
      return NextResponse.json(
        { error: 'No lobbies in WAITING status' },
        { status: 400 }
      );
    }

    // Activate all WAITING lobbies
    const result = await prisma.lobby.updateMany({
      where: {
        gameId: validatedData.gameId,
        status: 'WAITING',
      },
      data: {
        status: 'ACTIVE',
      },
    });

    // Update game status to STAGE_1_ACTIVE if not already
    if (game.status === 'LOBBIES_FORMING' || game.status === 'NOT_STARTED') {
      await prisma.game.update({
        where: { id: validatedData.gameId },
        data: {
          status: 'STAGE_1_ACTIVE',
          currentStage: 1,
          currentRound: 0,
        },
      });
    }

    return NextResponse.json({
      message: 'Lobbies activated and game ready for Stage 1',
      lobbiesActivated: result.count,
      gameStatus: 'STAGE_1_ACTIVE',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Activate lobbies simple error:', error);
    return NextResponse.json(
      { error: 'Failed to activate lobbies' },
      { status: 500 }
    );
  }
}
