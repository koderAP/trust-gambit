import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const round = await prisma.round.findUnique({
      where: { id: params.roundId },
      include: {
        submissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        roundScores: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!round) {
      return NextResponse.json(
        { error: 'Round not found' },
        { status: 404 }
      );
    }

    // Build user score map
    const userScores = new Map();
    round.roundScores.forEach(score => {
      userScores.set(score.userId, {
        userId: score.userId,
        name: score.user.name,
        score: score.totalScore,
        inCycle: score.inCycle,
        distanceFromSolver: score.distanceFromSolver,
      });
    });

    // Build delegation graph nodes from submissions
    const submissionNodes = round.submissions.map(sub => ({
      id: sub.userId,
      name: sub.user.name,
      action: sub.action,
      answer: sub.action === 'SOLVE' ? sub.answer : null,
      delegateTo: sub.delegateTo,
      isCorrect: sub.action === 'SOLVE' && sub.answer
        ? sub.answer.trim().toLowerCase() === round.correctAnswer.trim().toLowerCase()
        : null,
      score: userScores.get(sub.userId)?.score || 0,
      inCycle: userScores.get(sub.userId)?.inCycle || false,
      isCurrentUser: sub.userId === userId,
    }));

    // Add nodes for users who have scores but no submissions (implicit PASS)
    const submittedUserIds = new Set(round.submissions.map(s => s.userId));
    const implicitPassNodes = Array.from(userScores.values())
      .filter(score => !submittedUserIds.has(score.userId))
      .map(score => ({
        id: score.userId,
        name: score.name,
        action: 'PASS',
        answer: null,
        delegateTo: null,
        isCorrect: null,
        score: score.score,
        inCycle: score.inCycle,
        isCurrentUser: score.userId === userId,
      }));

    // Combine all nodes
    const nodes = [...submissionNodes, ...implicitPassNodes];

    const edges = round.submissions
      .filter(sub => sub.delegateTo)
      .map(sub => ({
        from: sub.userId,
        to: sub.delegateTo!,
      }));

    return NextResponse.json({
      round: {
        id: round.id,
        roundNumber: round.roundNumber,
        domain: round.domain,
        question: round.question,
        correctAnswer: round.correctAnswer,
        status: round.status,
      },
      graph: {
        nodes,
        edges,
      },
      userScore: userId ? userScores.get(userId) : null,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error('Fetch round results error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch round results' },
      { status: 500 }
    );
  }
}
