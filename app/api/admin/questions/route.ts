import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const questionSchema = z.object({
  id: z.string().optional(), // For updates
  stage: z.number().min(1).max(2),
  domain: z.string().min(1),
  question: z.string().min(1),
  correctAnswer: z.string().min(1),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

/**
 * GET /api/admin/questions
 * Get all global questions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const questions = await prisma.question.findMany({
      orderBy: [{ stage: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/questions
 * Create or update a question
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received question data:', body);
    const validatedData = questionSchema.parse(body);
    console.log('Validated data:', validatedData);

    let question;

    if (validatedData.id) {
      // Update existing question
      const existingQuestion = await prisma.question.findUnique({
        where: { id: validatedData.id },
      });

      if (!existingQuestion) {
        return NextResponse.json(
          { error: 'Question not found' },
          { status: 404 }
        );
      }

      // Check if the question has been used
      if (existingQuestion.isUsed) {
        return NextResponse.json(
          { error: 'Cannot modify question - it has already been used in a game' },
          { status: 400 }
        );
      }

      question = await prisma.question.update({
        where: { id: validatedData.id },
        data: {
          stage: validatedData.stage,
          domain: validatedData.domain,
          question: validatedData.question,
          correctAnswer: validatedData.correctAnswer,
          imageUrl: validatedData.imageUrl || null,
        },
      });
    } else {
      // Create new question
      question = await prisma.question.create({
        data: {
          stage: validatedData.stage,
          domain: validatedData.domain,
          question: validatedData.question,
          correctAnswer: validatedData.correctAnswer,
          imageUrl: validatedData.imageUrl || null,
        },
      });
    }

    return NextResponse.json({
      message: validatedData.id ? 'Question updated' : 'Question created',
      question,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Create/update question error:', error);
    return NextResponse.json(
      { error: 'Failed to save question' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/questions?questionId=xxx
 * Delete a question
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json({ error: 'questionId is required' }, { status: 400 });
    }

    // Check if the question has been used
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    if (question.isUsed) {
      return NextResponse.json(
        { error: 'Cannot delete question - round has already started' },
        { status: 400 }
      );
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
