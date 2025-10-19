import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/lobbies/[lobbyId]/leaderboard
 * Get leaderboard with cumulative scores for all players in a lobby
 */
// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { lobbyId: string } }
) {
  try {
    // ✅ OPTIMIZED: Single query to get all data at once
    const [lobby, allScores] = await Promise.all([
      prisma.lobby.findUnique({
        where: { id: params.lobbyId },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      
      // ✅ Fetch ALL scores in a single query instead of N queries
      prisma.roundScore.findMany({
        where: {
          round: {
            lobbyId: params.lobbyId,
            status: 'COMPLETED', // Only count completed rounds
          },
        },
        include: {
          round: {
            select: {
              roundNumber: true,
              status: true,
            },
          },
        },
      }),
    ]);

    if (!lobby) {
      return NextResponse.json(
        { error: 'Lobby not found' },
        { status: 404 }
      );
    }

    // ✅ Group scores by userId in memory (fast!)
    const scoresByUser = new Map<string, typeof allScores>();
    for (const score of allScores) {
      if (!scoresByUser.has(score.userId)) {
        scoresByUser.set(score.userId, []);
      }
      scoresByUser.get(score.userId)!.push(score);
    }

    // ✅ Build leaderboard from grouped data
    const userScores = lobby.users.map((user) => {
      const scores = scoresByUser.get(user.id) || [];
      
      // Calculate cumulative score
      const cumulativeScore = scores.reduce((sum, score) => sum + score.totalScore, 0);
      
      // Count rounds participated
      const roundsPlayed = scores.length;

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        cumulativeScore,
        roundsPlayed,
        scores: scores.map(s => ({
          roundNumber: s.round.roundNumber,
          score: s.totalScore,
          inCycle: s.inCycle,
          distanceFromSolver: s.distanceFromSolver,
        })),
      };
    });

    // Sort by cumulative score (descending)
    const leaderboard = userScores.sort((a, b) => b.cumulativeScore - a.cumulativeScore);

    // Add rank
    const leaderboardWithRank = leaderboard.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

    return NextResponse.json({
      lobby: {
        id: lobby.id,
        name: lobby.name,
        poolNumber: lobby.poolNumber,
        stage: lobby.stage,
      },
      leaderboard: leaderboardWithRank,
      totalPlayers: lobby.users.length,
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}
