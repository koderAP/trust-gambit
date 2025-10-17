import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/lobbies/[lobbyId]/leaderboard
 * Get leaderboard with cumulative scores for all players in a lobby
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { lobbyId: string } }
) {
  try {
    const lobby = await prisma.lobby.findUnique({
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
    });

    if (!lobby) {
      return NextResponse.json(
        { error: 'Lobby not found' },
        { status: 404 }
      );
    }

    // Get all round scores for users in this lobby
    const userScores = await Promise.all(
      lobby.users.map(async (user) => {
        // Get all scores for this user in rounds belonging to this lobby
        const scores = await prisma.roundScore.findMany({
          where: {
            userId: user.id,
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
        });

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
      })
    );

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
