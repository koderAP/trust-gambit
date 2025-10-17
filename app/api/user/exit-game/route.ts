import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const exitGameSchema = z.object({
  userId: z.string(),
});

/**
 * POST /api/user/exit-game
 * Allows user to exit the game and return to waiting state
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = exitGameSchema.parse(body);

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove user from lobby and reset lobby request
    await prisma.user.update({
      where: { id: validatedData.userId },
      data: {
        lobbyId: null,
        lobbyRequested: false,
      },
    });

    // If user was in a lobby, decrement the lobby's current user count
    if (user.lobbyId) {
      await prisma.lobby.update({
        where: { id: user.lobbyId },
        data: {
          currentUsers: {
            decrement: 1,
          },
        },
      });
    }

    return NextResponse.json({
      message: 'Successfully exited game',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Exit game error:', error);
    return NextResponse.json(
      { error: 'Failed to exit game' },
      { status: 500 }
    );
  }
}
