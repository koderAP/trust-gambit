import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { lobbyId: string } }
) {
  try {
    const rounds = await prisma.round.findMany({
      where: { lobbyId: params.lobbyId },
      orderBy: { roundNumber: 'desc' },
      include: {
        _count: {
          select: {
            submissions: true,
            roundScores: true,
          },
        },
      },
    });

    return NextResponse.json({ rounds });
  } catch (error) {
    console.error('Fetch lobby rounds error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rounds' },
      { status: 500 }
    );
  }
}
