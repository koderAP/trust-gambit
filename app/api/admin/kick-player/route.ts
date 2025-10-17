import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const kickPlayerSchema = z.object({
  userId: z.string(),
});

/**
 * POST /api/admin/kick-player
 * Remove a user from their lobby and reset their lobby status
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = kickPlayerSchema.parse(body);

    // Get the user with their current lobby
    const user = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      include: { lobby: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.lobbyId) {
      return NextResponse.json(
        { error: 'User is not in a lobby' },
        { status: 400 }
      );
    }

    const lobbyId = user.lobbyId;

    // Remove user from lobby and reset status
    await prisma.user.update({
      where: { id: validatedData.userId },
      data: {
        lobbyId: null,
        lobbyRequested: false,
      },
    });

    // Decrement lobby's current user count
    await prisma.lobby.update({
      where: { id: lobbyId },
      data: {
        currentUsers: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({
      message: 'Player kicked successfully',
      userId: user.id,
      userName: user.name,
      lobbyName: user.lobby?.name,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Kick player error:', error);
    return NextResponse.json(
      { error: 'Failed to kick player' },
      { status: 500 }
    );
  }
}
