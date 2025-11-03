/**
 * Debugging script for delegation chain scoring issues
 * 
 * Usage: npx tsx scripts/debug-delegation-scoring.ts <roundId>
 * 
 * This script will:
 * 1. Fetch the round data from the database
 * 2. Show all submissions in the round
 * 3. Trace through the score calculation for each user
 * 4. Compare expected vs actual scores
 */

import { prisma } from '../lib/prisma';

async function debugRoundScoring(roundId: string) {
  console.log(`\n=== Debugging Round ${roundId} ===\n`);

  // Get round data
  const round = await prisma.round.findUnique({
    where: { id: roundId },
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
    },
  });

  if (!round) {
    console.error('❌ Round not found!');
    return;
  }

  // Get game info and scores separately
  const game = await prisma.game.findUnique({
    where: { id: round.gameId },
  });

  const scores = await prisma.roundScore.findMany({
    where: { roundId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!round) {
    console.error('❌ Round not found!');
    return;
  }

  console.log(`Round ${round.roundNumber} in Game ${game?.id || round.gameId}`);
  console.log(`Correct Answer: "${round.correctAnswer}"`);
  console.log(`Scoring Parameters: λ=${game?.lambda || 0.5}, β=${game?.beta || 0.1}, γ=${game?.gamma || 0.2}\n`);

  console.log(`=== Submissions (${round.submissions.length}) ===\n`);

  // Build a map of submissions
  const submissions = new Map();
  for (const sub of round.submissions) {
    submissions.set(sub.userId, {
      userId: sub.userId,
      userName: sub.user.name,
      action: sub.action,
      answer: sub.answer,
      delegateTo: sub.delegateTo,
      isCorrect: sub.action === 'SOLVE' && sub.answer
        ? sub.answer.trim().toLowerCase() === round.correctAnswer.trim().toLowerCase()
        : null,
    });
  }

  // Print all submissions
  for (const [userId, sub] of submissions) {
    const delegateTo = sub.delegateTo ? ` → ${submissions.get(sub.delegateTo)?.userName || sub.delegateTo}` : '';
    const correctness = sub.isCorrect !== null ? ` (${sub.isCorrect ? '✓ CORRECT' : '✗ WRONG'})` : '';
    console.log(`  ${sub.userName} (${userId.slice(0, 8)}): ${sub.action}${correctness}${delegateTo}`);
  }

  console.log(`\n=== Delegation Chains ===\n`);

  // Build delegation chains
  for (const [userId, sub] of submissions) {
    if (sub.action === 'DELEGATE') {
      const chain = [sub.userName];
      let current = sub.delegateTo;
      const visited = new Set([userId]);
      
      while (current && !visited.has(current)) {
        visited.add(current);
        const target = submissions.get(current);
        if (!target) break;
        
        chain.push(target.userName);
        if (target.action === 'DELEGATE') {
          current = target.delegateTo;
        } else {
          break;
        }
      }
      
      console.log(`  ${chain.join(' → ')}`);
    }
  }

  console.log(`\n=== Scores from Database ===\n`);

  for (const score of scores) {
    const sub = submissions.get(score.userId);
    console.log(`  ${score.user.name} (${score.userId.slice(0, 8)}):`);
    console.log(`    Action: ${sub?.action || 'UNKNOWN'}`);
    console.log(`    Total Score: ${score.totalScore}`);
    console.log(`    Distance from Solver: ${score.distanceFromSolver}`);
    console.log(`    In Cycle: ${score.inCycle}`);
    console.log(``);
  }

  console.log(`\n=== Expected Scores (Recalculating) ===\n`);

  const lambda = game?.lambda || 0.5;
  const gamma = game?.gamma || 0.2;

  // Simple score calculation (no memoization)
  function calculateExpectedScore(userId: string, visited: Set<string> = new Set()): { score: number, distance: number | null } {
    const sub = submissions.get(userId);
    if (!sub) return { score: 0, distance: null };

    if (visited.has(userId)) {
      return { score: -1 - gamma, distance: null }; // Cycle
    }

    visited.add(userId);

    if (sub.action === 'SOLVE') {
      return {
        score: sub.isCorrect ? 1 : -1,
        distance: 0,
      };
    }

    if (sub.action === 'PASS') {
      return { score: 0, distance: null };
    }

    if (sub.action === 'DELEGATE' && sub.delegateTo) {
      const target = submissions.get(sub.delegateTo);
      if (!target) {
        return { score: -1 - lambda, distance: 1 };
      }

      const targetResult = calculateExpectedScore(sub.delegateTo, new Set(visited));
      const distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;

      let score: number;

      // NEW FORMULA: Upstream of correct terminus = 1 + λ × (2k / (k+1)), incorrect/pass = -1
      if (target.action === 'SOLVE') {
        score = target.isCorrect ? 1 + lambda * (2 * distance / (distance + 1)) : -1;
      } else if (target.action === 'PASS') {
        score = -1;
      } else {
        score = targetResult.score >= 0 ? 1 + lambda * (2 * distance / (distance + 1)) : -1;
      }

      return { score, distance };
    }

    return { score: 0, distance: null };
  }

  for (const [userId, sub] of submissions) {
    const expected = calculateExpectedScore(userId);
    const actual = scores.find((s: any) => s.userId === userId);

    const match = actual && Math.abs(expected.score - actual.totalScore) < 0.0001 ? '✅' : '❌';
    
    console.log(`  ${sub.userName}:`);
    console.log(`    Expected: ${expected.score.toFixed(4)} (distance: ${expected.distance})`);
    console.log(`    Actual:   ${actual?.totalScore.toFixed(4) || 'N/A'} (distance: ${actual?.distanceFromSolver}) ${match}`);
    
    if (actual && Math.abs(expected.score - actual.totalScore) >= 0.0001) {
      console.log(`    ⚠️  MISMATCH! Difference: ${(actual.totalScore - expected.score).toFixed(4)}`);
    }
    console.log(``);
  }
}

// Get roundId from command line
const roundId = process.argv[2];

if (!roundId) {
  console.error('Usage: npx tsx scripts/debug-delegation-scoring.ts <roundId>');
  process.exit(1);
}

debugRoundScoring(roundId)
  .then(() => {
    console.log('\n✅ Debug complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
