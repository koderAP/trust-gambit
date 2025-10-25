import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateDelegationGraph } from '@/lib/calculateDelegationGraph';
import { z } from 'zod';
import { getSocketServer } from '@/lib/socket/server';

const endGlobalRoundSchema = z.object({
  gameId: z.string(),
});

/**
 * POST /api/admin/end-current-round
 * Ends ALL currently active rounds across all lobbies in the game simultaneously
 * Triggers delegation graph calculation for each round
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
    const validatedData = endGlobalRoundSchema.parse(body);

    // Get game
    const game = await prisma.game.findUnique({
      where: { id: validatedData.gameId },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Find all active rounds for this game
    const activeRounds = await prisma.round.findMany({
      where: {
        gameId: validatedData.gameId,
        status: 'ACTIVE',
      },
      include: {
        submissions: true,
      },
    });

    if (activeRounds.length === 0) {
      return NextResponse.json(
        { error: 'No active rounds found' },
        { status: 400 }
      );
    }

    // Get lobby information for each round
    const lobbyIds = activeRounds.map(r => r.lobbyId).filter((id): id is string => id !== null);
    const lobbies = await prisma.lobby.findMany({
      where: {
        id: { in: lobbyIds },
      },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    const endTime = new Date();
    
    // End all rounds simultaneously
    const updatePromises = activeRounds.map(round =>
      prisma.round.update({
        where: { id: round.id },
        data: {
          status: 'COMPLETED',
          endTime: endTime,
        },
      })
    );

    await Promise.all(updatePromises);

    // Calculate delegation graphs for all rounds in parallel
    const calculationResults = await Promise.allSettled(
      activeRounds.map(async (round) => {
        try {
          await calculateDelegationGraph(round.id);
          return {
            roundId: round.id,
            lobbyId: round.lobbyId,
            roundNumber: round.roundNumber,
            success: true,
          };
        } catch (error) {
          console.error(`Error calculating graph for round ${round.id}:`, error);
          return {
            roundId: round.id,
            lobbyId: round.lobbyId,
            roundNumber: round.roundNumber,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // Compile statistics
    const successfulCalculations = calculationResults.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;
    
    const failedCalculations = calculationResults.filter(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    );

    const totalSubmissions = activeRounds.reduce(
      (sum, round) => sum + round.submissions.length,
      0
    );

    const lobbyMap = new Map(lobbies.map(l => [l.id, l._count.users]));
    const totalPlayers = activeRounds.reduce(
      (sum, round) => sum + (round.lobbyId ? (lobbyMap.get(round.lobbyId) || 0) : 0),
      0
    );

    // Broadcast round end to all connected clients via Socket.IO
    try {
      const socketServer = getSocketServer()
      
      // Notify each lobby about their round ending
      for (const round of activeRounds) {
        socketServer.notifyRoundEnded(round.id, validatedData.gameId, round.lobbyId, {
          roundNumber: round.roundNumber,
          stage: round.stage,
          endTime: endTime.toISOString(),
          submissionsCount: round.submissions.length,
        })
      }
      
      console.log(`[Socket.IO] Broadcasted round end to ${activeRounds.length} lobbies`)
    } catch (error) {
      console.warn('[Socket.IO] Could not broadcast round end:', error)
    }

    return NextResponse.json({
      message: `All active rounds ended successfully`,
      roundsEnded: activeRounds.length,
      roundNumber: activeRounds[0]?.roundNumber,
      stage: activeRounds[0]?.stage,
      endTime: endTime.toISOString(),
      submissions: {
        total: totalSubmissions,
        perLobby: activeRounds.map(r => ({
          lobbyId: r.lobbyId,
          roundNumber: r.roundNumber,
          submissions: r.submissions.length,
          players: r.lobbyId ? (lobbyMap.get(r.lobbyId) || 0) : 0,
        })),
      },
      scoring: {
        successful: successfulCalculations,
        failed: failedCalculations.length,
        failures: failedCalculations.map(r => 
          r.status === 'fulfilled' ? r.value : { error: 'Rejected' }
        ),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('End global round error:', error);
    return NextResponse.json(
      { error: 'Failed to end rounds' },
      { status: 500 }
    );
  }
}
