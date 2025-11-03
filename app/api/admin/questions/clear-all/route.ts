import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/admin/questions/clear-all
 * Delete ALL questions from the database
 * WARNING: This is a destructive operation
 */
export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all questions
    const result = await prisma.question.deleteMany({});

    return NextResponse.json({ 
      message: 'All questions deleted successfully',
      deletedCount: result.count
    });
  } catch (error) {
    console.error('Clear all questions error:', error);
    return NextResponse.json(
      { error: 'Failed to delete questions' },
      { status: 500 }
    );
  }
}
