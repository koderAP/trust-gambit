import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateGameParamsSchema = z.object({
  gameId: z.string(),
  lambda: z.number().min(0).max(1).optional(),
  beta: z.number().min(0).max(1).optional(),
  gamma: z.number().min(0).max(1).optional(),
});

/**
 * POST /api/admin/update-game-params
 * Update scoring parameters for an existing game
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateGameParamsSchema.parse(body);

    // Verify game exists
    const game = await prisma.game.findUnique({
      where: { id: validatedData.gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Update game parameters
    const updateData: any = {};
    if (validatedData.lambda !== undefined) updateData.lambda = validatedData.lambda;
    if (validatedData.beta !== undefined) updateData.beta = validatedData.beta;
    if (validatedData.gamma !== undefined) updateData.gamma = validatedData.gamma;

    const updatedGame = await prisma.game.update({
      where: { id: validatedData.gameId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'Game parameters updated successfully',
      gameId: updatedGame.id,
      lambda: updatedGame.lambda,
      beta: updatedGame.beta,
      gamma: updatedGame.gamma,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Update game params error:', error);
    return NextResponse.json(
      { error: 'Failed to update game parameters' },
      { status: 500 }
    );
  }
}
