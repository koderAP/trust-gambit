import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lobby = await prisma.lobby.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            domainRatings: {
              select: {
                domain: true,
                rating: true,
              },
            },
          },
        },
        game: {
          include: {
            rounds: {
              where: { 
                status: 'ACTIVE',
                lobbyId: params.id,
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!lobby) {
      return NextResponse.json(
        { error: 'Lobby not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(lobby);
  } catch (error) {
    console.error('Error fetching lobby:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lobby' },
      { status: 500 }
    );
  }
}
