import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const submissionSchema = z.object({
  userId: z.string(),
  action: z.enum(['SOLVE', 'DELEGATE', 'PASS']),
  answer: z.string().optional(),
  delegateTo: z.string().optional(),
});

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  try {
    const body = await request.json();
    const validatedData = submissionSchema.parse(body);

    // Check if round is active
    const round = await prisma.round.findUnique({
      where: { id: params.roundId },
    });

    if (!round || round.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Round is not active' },
        { status: 400 }
      );
    }

    // Check if user already submitted
    const existing = await prisma.submission.findUnique({
      where: {
        roundId_userId: {
          roundId: params.roundId,
          userId: validatedData.userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Already submitted for this round' },
        { status: 400 }
      );
    }

    // Validate submission based on action
    if (validatedData.action === 'SOLVE' && !validatedData.answer) {
      return NextResponse.json(
        { error: 'Answer required for SOLVE action' },
        { status: 400 }
      );
    }

    if (validatedData.action === 'DELEGATE' && !validatedData.delegateTo) {
      return NextResponse.json(
        { error: 'Delegation target required for DELEGATE action' },
        { status: 400 }
      );
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        roundId: params.roundId,
        userId: validatedData.userId,
        action: validatedData.action,
        answer: validatedData.answer,
        delegateTo: validatedData.delegateTo,
      },
    });

    // Count total submissions
    const submissionCount = await prisma.submission.count({
      where: { roundId: params.roundId },
    });

    return NextResponse.json({
      submission,
      submissionCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Submission failed' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  try {
    const submissions = await prisma.submission.findMany({
      where: { roundId: params.roundId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            domain: true,
          },
        },
      },
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}
