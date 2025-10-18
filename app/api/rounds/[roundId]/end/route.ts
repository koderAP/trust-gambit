import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateDelegationGraph } from '@/lib/calculateDelegationGraph';

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  try {
    const round = await prisma.round.findUnique({
      where: { id: params.roundId },
      include: {
        submissions: true,
      },
    });

    if (!round) {
      return NextResponse.json(
        { error: 'Round not found' },
        { status: 404 }
      );
    }

    if (round.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Round is not active' },
        { status: 400 }
      );
    }

    // Get lobby users count
    let totalPlayers = 0;
    if (round.lobbyId) {
      const lobby = await prisma.lobby.findUnique({
        where: { id: round.lobbyId },
        include: { _count: { select: { users: true } } },
      });
      totalPlayers = lobby?._count.users || 0;
    }

    // End the round
    const updatedRound = await prisma.round.update({
      where: { id: params.roundId },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
      },
    });

    // Calculate delegation graph and scores
    try {
      const graphData = await calculateDelegationGraph(params.roundId);
      console.log('Delegation graph calculated successfully');
    } catch (calcError) {
      console.error('Error calculating delegation graph:', calcError);
      // Don't fail the request if calculation fails
    }

    return NextResponse.json({
      message: 'Round ended successfully',
      round: updatedRound,
      submissionCount: round.submissions.length,
      totalPlayers,
    });
  } catch (error) {
    console.error('End round error:', error);
    return NextResponse.json(
      { error: 'Failed to end round' },
      { status: 500 }
    );
  }
}
