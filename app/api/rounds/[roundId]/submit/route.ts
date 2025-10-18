import { NextRequest, NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/prisma';
import { z } from 'zod';
import { withRateLimit, SUBMISSION_RATE_LIMIT } from '@/lib/rateLimit';
import { isDuplicateRequest } from '@/lib/redis';

const submissionSchema = z.object({
  userId: z.string(),
  action: z.enum(['SOLVE', 'DELEGATE', 'PASS']),
  answer: z.string().optional(),
  delegateTo: z.string().optional(),
  idempotencyKey: z.string().optional(), // For deduplication
});

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

async function handleSubmit(
  request: NextRequest,
  { params }: { params: { roundId: string } }
) {
  try {
    const body = await request.json();
    const validatedData = submissionSchema.parse(body);

    // Idempotency check - prevent duplicate submissions
    if (validatedData.idempotencyKey) {
      const isDuplicate = await isDuplicateRequest(
        `submission:${validatedData.userId}:${params.roundId}:${validatedData.idempotencyKey}`,
        300 // 5 minutes
      );
      
      if (isDuplicate) {
        // Check if submission already exists
        const existing = await prisma.submission.findUnique({
          where: {
            roundId_userId: {
              roundId: params.roundId,
              userId: validatedData.userId,
            },
          },
        });
        
        if (existing) {
          return NextResponse.json({
            submission: existing,
            message: 'Submission already exists',
          });
        }
      }
    }

    // Check if round is active with retry logic
    const round = await withRetry(() =>
      prisma.round.findUnique({
        where: { id: params.roundId },
        select: {
          id: true,
          status: true,
          endTime: true,
        },
      })
    );

    if (!round || round.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Round is not active' },
        { status: 400 }
      );
    }

    // Check if round has ended
    if (round.endTime && new Date() > round.endTime) {
      return NextResponse.json(
        { error: 'Round has ended' },
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

    // Prevent self-delegation
    if (validatedData.action === 'DELEGATE' && validatedData.delegateTo === validatedData.userId) {
      return NextResponse.json(
        { error: 'Cannot delegate to yourself' },
        { status: 400 }
      );
    }

    // Use upsert to handle race conditions
    // If another request created the submission, this will just return it
    const submission = await withRetry(() =>
      prisma.submission.upsert({
        where: {
          roundId_userId: {
            roundId: params.roundId,
            userId: validatedData.userId,
          },
        },
        create: {
          roundId: params.roundId,
          userId: validatedData.userId,
          action: validatedData.action,
          answer: validatedData.answer,
          delegateTo: validatedData.delegateTo,
        },
        update: {
          // If already exists, don't update (first submission wins)
        },
      })
    );

    // Get submission count efficiently (cached in production)
    const submissionCount = await prisma.submission.count({
      where: { roundId: params.roundId },
    });

    return NextResponse.json({
      submission,
      submissionCount,
      message: 'Submission successful',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    // Handle unique constraint violation (race condition)
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'Submission already exists for this round' },
        { status: 409 }
      );
    }

    console.error('Submission error:', error);
    return NextResponse.json(
      { error: 'Submission failed', message: 'Please try again' },
      { status: 500 }
    );
  }
}

// Apply rate limiting to prevent abuse
export const POST = withRateLimit(handleSubmit, SUBMISSION_RATE_LIMIT);

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
            email: true,
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
