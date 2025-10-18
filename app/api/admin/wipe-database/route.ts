import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/wipe-database
 * Completely wipes the database - removes all users, games, lobbies, rounds, scores, submissions, and questions
 * ⚠️ DANGER: This is irreversible! Use only for testing cleanup.
 * Admin user is preserved.
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require confirmation token in request body
    const body = await request.json();
    if (body.confirmation !== 'WIPE_ALL_DATA') {
      return NextResponse.json(
        { error: 'Invalid confirmation. Please send { confirmation: "WIPE_ALL_DATA" }' },
        { status: 400 }
      );
    }

    // Delete in order to respect foreign key constraints
    // Start with dependent tables first, work up to parent tables

    console.log('🗑️ Starting database wipe...');

    // 1. Delete all round scores
    const scoresDeleted = await prisma.roundScore.deleteMany({});
    console.log(`   Deleted ${scoresDeleted.count} round scores`);

    // 2. Delete all submissions
    const submissionsDeleted = await prisma.submission.deleteMany({});
    console.log(`   Deleted ${submissionsDeleted.count} submissions`);

    // 3. Delete all rounds
    const roundsDeleted = await prisma.round.deleteMany({});
    console.log(`   Deleted ${roundsDeleted.count} rounds`);

    // 4. Delete all lobbies
    const lobbiesDeleted = await prisma.lobby.deleteMany({});
    console.log(`   Deleted ${lobbiesDeleted.count} lobbies`);

    // 5. Delete all games
    const gamesDeleted = await prisma.game.deleteMany({});
    console.log(`   Deleted ${gamesDeleted.count} games`);

    // 6. Delete all domain ratings
    const domainRatingsDeleted = await prisma.domainRating.deleteMany({});
    console.log(`   Deleted ${domainRatingsDeleted.count} domain ratings`);

    // 7. Delete all users (except admin)
    const usersDeleted = await prisma.user.deleteMany({});
    console.log(`   Deleted ${usersDeleted.count} users`);

    // 8. Reset all questions to unused
    const questionsReset = await prisma.question.updateMany({
      where: {
        isUsed: true,
      },
      data: {
        isUsed: false,
      },
    });
    console.log(`   Reset ${questionsReset.count} questions to unused`);

    console.log('✅ Database wipe completed successfully!');

    return NextResponse.json({
      message: 'Database wiped successfully',
      deleted: {
        users: usersDeleted.count,
        domainRatings: domainRatingsDeleted.count,
        games: gamesDeleted.count,
        lobbies: lobbiesDeleted.count,
        rounds: roundsDeleted.count,
        submissions: submissionsDeleted.count,
        roundScores: scoresDeleted.count,
      },
      reset: {
        questions: questionsReset.count,
      },
    });
  } catch (error) {
    console.error('Wipe database error:', error);
    return NextResponse.json(
      { error: 'Failed to wipe database' },
      { status: 500 }
    );
  }
}
