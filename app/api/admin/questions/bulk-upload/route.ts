import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const questionSchema = z.object({
  stage: z.number().min(1).max(2),
  domain: z.string().min(1),
  question: z.string().min(1),
  correctAnswer: z.string().min(1),
  imageUrl: z.string().url().optional().or(z.literal('')).nullable(),
});

const bulkQuestionsSchema = z.array(questionSchema);

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/questions/bulk-upload
 * Upload questions in bulk via JSON
 * 
 * Expected JSON format:
 * [
 *   {
 *     "stage": 1,
 *     "domain": "Algorithms",
 *     "question": "What is the time complexity of binary search?",
 *     "correctAnswer": "O(log n)",
 *     "imageUrl": "" // optional
 *   },
 *   ...
 * ]
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate the input
    let questions;
    try {
      questions = bulkQuestionsSchema.parse(body);
    } catch (validationError: any) {
      return NextResponse.json(
        { 
          error: 'Invalid question format', 
          details: validationError.errors 
        },
        { status: 400 }
      );
    }

    // Check for empty array
    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'No questions provided' },
        { status: 400 }
      );
    }

    // Insert questions into database
    const createdQuestions = await prisma.question.createMany({
      data: questions.map(q => ({
        stage: q.stage,
        domain: q.domain,
        question: q.question,
        correctAnswer: q.correctAnswer,
        imageUrl: q.imageUrl || null,
        isUsed: false,
      })),
      skipDuplicates: true, // Skip if duplicate exists
    });

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${createdQuestions.count} questions`,
      count: createdQuestions.count,
      totalProvided: questions.length,
    });
  } catch (error: any) {
    console.error('Bulk upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload questions', details: error.message },
      { status: 500 }
    );
  }
}
