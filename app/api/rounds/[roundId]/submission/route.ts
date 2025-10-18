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

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const submission = await prisma.submission.findUnique({
      where: {
        roundId_userId: {
          roundId: params.roundId,
          userId,
        },
      },
    });

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Submission check error:', error);
    return NextResponse.json(
      { error: 'Failed to check submission' },
      { status: 500 }
    );
  }
}
