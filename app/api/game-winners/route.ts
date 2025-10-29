import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/game-winners
 * Fetch top 10 winners from the ended game
 */
// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Find the most recent ended game
    const endedGame = await prisma.game.findFirst({
      where: { status: 'ENDED' },
      orderBy: { endedAt: 'desc' },
      include: {
        lobbies: {
          where: { stage: 2 },
          include: {
            users: {
              include: {
                roundScores: {
                  where: {
                    round: {
                      stage: 2,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!endedGame) {
      return NextResponse.json({ winners: null, gameEnded: false });
    }

    // Calculate total scores for all Stage 2 players
    const allPlayers: { userId: string; userName: string; totalScore: number }[] = [];

    for (const lobby of endedGame.lobbies) {
      for (const user of lobby.users) {
        const totalScore = user.roundScores.reduce((sum, score) => sum + score.totalScore, 0);
        allPlayers.push({
          userId: user.id,
          userName: user.name || 'Unknown',
          totalScore,
        });
      }
    }

    // Sort by total score descending and get top 10
    const top10 = allPlayers
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10);

    return NextResponse.json({
      gameEnded: true,
      winners: top10,
      endedAt: endedGame.endedAt,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Fetch winners error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch winners' },
      { status: 500 }
    );
  }
}
