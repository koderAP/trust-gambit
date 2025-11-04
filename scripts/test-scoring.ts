/**
 * Trust Gambit Scoring Test Suite
 * 
 * This file contains comprehensive test cases to verify the scoring mechanism
 * matches the game rules documented in docs/game.md
 * 
 * Run with: npx ts-node scripts/test-scoring.ts
 */

import { PrismaClient } from '@prisma/client';
import { calculateDelegationGraph } from '../lib/calculateDelegationGraph';

const prisma = new PrismaClient();

interface TestCase {
  name: string;
  description: string;
  setup: {
    lambda: number;
    beta: number;
    gamma: number;
    passScore: number;
    correctAnswer: string;
    users: Array<{
      id: string;
      name: string;
      action: 'SOLVE' | 'DELEGATE' | 'PASS';
      answer?: string;
      delegateTo?: string;
    }>;
  };
  expected: {
    [userId: string]: {
      score: number;
      inCycle?: boolean;
      distanceFromSolver?: number | null;
      trustScore?: number;
    };
  };
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Test 1: Direct Solve (Correct)',
    description: 'Alice solves correctly with no delegators',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'alice', name: 'Alice', action: 'SOLVE', answer: 'ANSWER' },
      ],
    },
    expected: {
      alice: { score: 1.0, distanceFromSolver: 0, trustScore: 0 },
    },
  },

  {
    name: 'Test 2: Direct Solve (Incorrect)',
    description: 'Bob solves incorrectly',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'bob', name: 'Bob', action: 'SOLVE', answer: 'WRONG' },
      ],
    },
    expected: {
      bob: { score: -1.0, distanceFromSolver: 0 },
    },
  },

  {
    name: 'Test 3a: Pass (passScore = 0)',
    description: 'Carol passes, passScore is 0',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'carol', name: 'Carol', action: 'PASS' },
      ],
    },
    expected: {
      carol: { score: 0, distanceFromSolver: null },
    },
  },

  {
    name: 'Test 3b: Pass (passScore = -1)',
    description: 'Carol passes, passScore is -1',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: -1,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'carol', name: 'Carol', action: 'PASS' },
      ],
    },
    expected: {
      carol: { score: -1, distanceFromSolver: null },
    },
  },

  {
    name: 'Test 4: Single Delegation to Correct Solver',
    description: 'Bob delegates to Alice who solves correctly',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'alice', name: 'Alice', action: 'SOLVE', answer: 'ANSWER' },
        { id: 'bob', name: 'Bob', action: 'DELEGATE', delegateTo: 'alice' },
      ],
    },
    expected: {
      alice: { score: 1.2, distanceFromSolver: 0, trustScore: 0.2 }, // 1 + β×1
      bob: { score: 1.6, distanceFromSolver: 1 }, // 1 + 0.6×(2×1/2)
    },
  },

  {
    name: 'Test 5: Two-Hop Chain to Correct Solver',
    description: 'Carol → Bob → Alice (Alice solves correctly)',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'alice', name: 'Alice', action: 'SOLVE', answer: 'ANSWER' },
        { id: 'bob', name: 'Bob', action: 'DELEGATE', delegateTo: 'alice' },
        { id: 'carol', name: 'Carol', action: 'DELEGATE', delegateTo: 'bob' },
      ],
    },
    expected: {
      alice: { score: 1.2, distanceFromSolver: 0, trustScore: 0.2 }, // 1 + β×1 (Bob delegates directly)
      bob: { score: 1.6, distanceFromSolver: 1 }, // 1 + 0.6×(2×1/2)
      carol: { score: 1.8, distanceFromSolver: 2 }, // 1 + 0.6×(2×2/3) = 1 + 0.6×1.333
    },
  },

  {
    name: 'Test 6: Multiple Direct Delegators (Trust Bonus)',
    description: 'Bob, Carol, Dave all delegate to Alice who solves correctly',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'alice', name: 'Alice', action: 'SOLVE', answer: 'ANSWER' },
        { id: 'bob', name: 'Bob', action: 'DELEGATE', delegateTo: 'alice' },
        { id: 'carol', name: 'Carol', action: 'DELEGATE', delegateTo: 'alice' },
        { id: 'dave', name: 'Dave', action: 'DELEGATE', delegateTo: 'alice' },
      ],
    },
    expected: {
      alice: { score: 1.6, distanceFromSolver: 0, trustScore: 0.6 }, // 1 + β×3
      bob: { score: 1.6, distanceFromSolver: 1 },
      carol: { score: 1.6, distanceFromSolver: 1 },
      dave: { score: 1.6, distanceFromSolver: 1 },
    },
  },

  {
    name: 'Test 7: Chain to Incorrect Solver',
    description: 'Carol → Bob → Alice (Alice solves incorrectly)',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'alice', name: 'Alice', action: 'SOLVE', answer: 'WRONG' },
        { id: 'bob', name: 'Bob', action: 'DELEGATE', delegateTo: 'alice' },
        { id: 'carol', name: 'Carol', action: 'DELEGATE', delegateTo: 'bob' },
      ],
    },
    expected: {
      alice: { score: -1, distanceFromSolver: 0 },
      bob: { score: -1, distanceFromSolver: 1 }, // Flat penalty
      carol: { score: -1, distanceFromSolver: 2 }, // Flat penalty
    },
  },

  {
    name: 'Test 8: Chain to Pass (passScore = 0)',
    description: 'Bob → Alice (Alice passes)',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'alice', name: 'Alice', action: 'PASS' },
        { id: 'bob', name: 'Bob', action: 'DELEGATE', delegateTo: 'alice' },
      ],
    },
    expected: {
      alice: { score: 0, distanceFromSolver: null },
      bob: { score: -1, distanceFromSolver: 1 }, // Upstream of pass terminus
    },
  },

  {
    name: 'Test 9: Simple 3-Node Cycle',
    description: 'Alice → Bob → Carol → Alice',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'alice', name: 'Alice', action: 'DELEGATE', delegateTo: 'bob' },
        { id: 'bob', name: 'Bob', action: 'DELEGATE', delegateTo: 'carol' },
        { id: 'carol', name: 'Carol', action: 'DELEGATE', delegateTo: 'alice' },
      ],
    },
    expected: {
      alice: { score: -1.4, inCycle: true, distanceFromSolver: null }, // -1 - γ
      bob: { score: -1.4, inCycle: true, distanceFromSolver: null },
      carol: { score: -1.4, inCycle: true, distanceFromSolver: null },
    },
  },

  {
    name: 'Test 10: Upstream of Cycle',
    description: 'Dave → Alice → (Bob ↔ Carol)',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'bob', name: 'Bob', action: 'DELEGATE', delegateTo: 'carol' },
        { id: 'carol', name: 'Carol', action: 'DELEGATE', delegateTo: 'bob' },
        { id: 'alice', name: 'Alice', action: 'DELEGATE', delegateTo: 'bob' },
        { id: 'dave', name: 'Dave', action: 'DELEGATE', delegateTo: 'alice' },
      ],
    },
    expected: {
      bob: { score: -1.4, inCycle: true }, // -1 - γ
      carol: { score: -1.4, inCycle: true },
      alice: { score: -1.2, distanceFromSolver: 1 }, // -1 - γ/(1+1)
      dave: { score: -1.133, distanceFromSolver: 2 }, // -1 - γ/(2+1) ≈ -1.133
    },
  },

  {
    name: 'Test 11: Self-Loop',
    description: 'Alice delegates to herself',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: 0,
      correctAnswer: 'ANSWER',
      users: [
        { id: 'alice', name: 'Alice', action: 'DELEGATE', delegateTo: 'alice' },
      ],
    },
    expected: {
      alice: { score: -1.4, inCycle: true }, // -1 - γ
    },
  },

  {
    name: 'Test 12: Complex Mixed Scenario',
    description: 'Multiple paths: correct solve, incorrect solve, pass, cycle',
    setup: {
      lambda: 0.6,
      beta: 0.2,
      gamma: 0.4,
      passScore: -1,
      correctAnswer: 'ANSWER',
      users: [
        // Correct solve path
        { id: 'alice', name: 'Alice', action: 'SOLVE', answer: 'ANSWER' },
        { id: 'bob', name: 'Bob', action: 'DELEGATE', delegateTo: 'alice' },
        { id: 'carol', name: 'Carol', action: 'DELEGATE', delegateTo: 'bob' },
        { id: 'dave', name: 'Dave', action: 'DELEGATE', delegateTo: 'alice' },
        // Incorrect solve path
        { id: 'eve', name: 'Eve', action: 'SOLVE', answer: 'WRONG' },
        { id: 'frank', name: 'Frank', action: 'DELEGATE', delegateTo: 'eve' },
        // Pass path
        { id: 'grace', name: 'Grace', action: 'PASS' },
        { id: 'henry', name: 'Henry', action: 'DELEGATE', delegateTo: 'grace' },
      ],
    },
    expected: {
      alice: { score: 1.4, distanceFromSolver: 0, trustScore: 0.4 }, // 1 + β×2 (Bob, Dave)
      bob: { score: 1.6, distanceFromSolver: 1 },
      carol: { score: 1.8, distanceFromSolver: 2 },
      dave: { score: 1.6, distanceFromSolver: 1 },
      eve: { score: -1, distanceFromSolver: 0 },
      frank: { score: -1, distanceFromSolver: 1 },
      grace: { score: -1 }, // PASS with passScore=-1
      henry: { score: -1, distanceFromSolver: 1 },
    },
  },
];

async function runTests() {
  console.log('🧪 Starting Trust Gambit Scoring Test Suite\n');
  console.log('=' .repeat(80));

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 ${testCase.name}`);
    console.log(`   ${testCase.description}`);

    try {
      // Create test game
      const game = await prisma.game.create({
        data: {
          name: `Test Game: ${testCase.name}`,
          status: 'STAGE_1_ACTIVE',
          currentStage: 1,
          currentRound: 1,
          lambda: testCase.setup.lambda,
          beta: testCase.setup.beta,
          gamma: testCase.setup.gamma,
          passScore: testCase.setup.passScore,
        },
      });

      // Create test lobby
      const lobby = await prisma.lobby.create({
        data: {
          name: 'Test Lobby',
          gameId: game.id,
          poolNumber: 1,
          stage: 1,
          status: 'ACTIVE',
        },
      });

      // Create test users
      for (const userData of testCase.setup.users) {
        await prisma.user.upsert({
          where: { id: userData.id },
          create: {
            id: userData.id,
            name: userData.name,
            email: `${userData.id}@test.com`,
            profileComplete: true,
            lobbyId: lobby.id,
          },
          update: {
            lobbyId: lobby.id,
          },
        });
      }

      // Create test round
      const round = await prisma.round.create({
        data: {
          gameId: game.id,
          lobbyId: lobby.id,
          roundNumber: 1,
          stage: 1,
          domain: 'Test',
          question: 'Test Question',
          correctAnswer: testCase.setup.correctAnswer,
          status: 'COMPLETED',
        },
      });

      // Create submissions
      for (const userData of testCase.setup.users) {
        await prisma.submission.create({
          data: {
            userId: userData.id,
            roundId: round.id,
            action: userData.action,
            answer: userData.answer || null,
            delegateTo: userData.delegateTo || null,
            submittedAt: new Date(),
          },
        });
      }

      // Run scoring calculation
      await calculateDelegationGraph(round.id);

      // Verify results
      const roundScores = await prisma.roundScore.findMany({
        where: { roundId: round.id },
      });

      let testPassed = true;
      const errors: string[] = [];

      for (const [userId, expected] of Object.entries(testCase.expected)) {
        const actual = roundScores.find((s) => s.userId === userId);

        if (!actual) {
          errors.push(`   ❌ Missing score for ${userId}`);
          testPassed = false;
          continue;
        }

        // Check total score (with small tolerance for floating point)
        const scoreDiff = Math.abs(actual.totalScore - expected.score);
        if (scoreDiff > 0.01) {
          errors.push(
            `   ❌ ${userId}: Expected score ${expected.score}, got ${actual.totalScore}`
          );
          testPassed = false;
        }

        // Check inCycle flag
        if (expected.inCycle !== undefined && actual.inCycle !== expected.inCycle) {
          errors.push(
            `   ❌ ${userId}: Expected inCycle ${expected.inCycle}, got ${actual.inCycle}`
          );
          testPassed = false;
        }

        // Check trust score
        if (expected.trustScore !== undefined) {
          const trustDiff = Math.abs(actual.trustScore - expected.trustScore);
          if (trustDiff > 0.01) {
            errors.push(
              `   ❌ ${userId}: Expected trustScore ${expected.trustScore}, got ${actual.trustScore}`
            );
            testPassed = false;
          }
        }
      }

      if (testPassed) {
        console.log(`   ✅ PASSED`);
        passed++;
      } else {
        console.log(`   ❌ FAILED`);
        errors.forEach((e) => console.log(e));
        failed++;
        failures.push(testCase.name);
      }

      // Cleanup
      await prisma.roundScore.deleteMany({ where: { roundId: round.id } });
      await prisma.submission.deleteMany({ where: { roundId: round.id } });
      await prisma.round.delete({ where: { id: round.id } });
      await prisma.user.deleteMany({ where: { lobbyId: lobby.id } });
      await prisma.lobby.delete({ where: { id: lobby.id } });
      await prisma.game.delete({ where: { id: game.id } });
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
      failed++;
      failures.push(testCase.name);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

  if (failures.length > 0) {
    console.log('Failed tests:');
    failures.forEach((name) => console.log(`  - ${name}`));
    process.exit(1);
  } else {
    console.log('✨ All tests passed!');
    process.exit(0);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .catch((error) => {
      console.error('Test suite error:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { TEST_CASES, runTests };
