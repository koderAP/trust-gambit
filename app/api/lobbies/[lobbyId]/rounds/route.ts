import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

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

    // Security: Remove correctAnswer from ACTIVE rounds to prevent cheating
    const safeRounds = rounds.map(round => {
      if (round.status === 'ACTIVE' || round.status === 'NOT_STARTED') {
        const { correctAnswer, ...roundWithoutAnswer } = round;
        return roundWithoutAnswer;
      }
      return round;
    });

    return NextResponse.json({ rounds: safeRounds }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Fetch lobby rounds error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rounds' },
      { status: 500 }
    );
  }
}
