/**
 * Test: PASS Chain Scoring
 * Rule: If a chain ends in PASS, everyone in that chain gets -1 (flat penalty)
 * 
 * Test Cases:
 * 1. Direct PASS → passScore (0 or -1 based on game setting)
 * 2. A → PASS → A gets -1
 * 3. A → B → PASS → Both A and B get -1
 * 4. A → B → C → PASS → All get -1
 * 5. Long chain (5 people) → PASS → All get -1
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TestCase {
  name: string;
  description: string;
  delegations: { from: string; to: string }[];
  passes: string[];
  expectedScores: { [userId: string]: number };
}

async function runTests() {
  console.log('\n🧪 PASS Chain Scoring Tests\n');
  console.log('=' .repeat(80));
  
  // Get or create test game
  const game = await prisma.game.findFirst({
    where: { status: 'ACTIVE' },
    include: { rounds: { orderBy: { roundNumber: 'desc' } } }
  });

  if (!game || game.rounds.length === 0) {
    console.error('❌ No active game or rounds found. Please create a game first.');
    return;
  }

  const round = game.rounds[0];
  const passScore = game.passScore ?? 0;

  console.log(`📊 Game ID: ${game.id}`);
  console.log(`📊 Round: ${round.roundNumber}`);
  console.log(`📊 Pass Score Setting: ${passScore}`);
  console.log(`📊 Lambda (λ): ${game.lambda}`);
  console.log(`📊 Beta (β): ${game.beta}`);
  console.log(`📊 Gamma (γ): ${game.gamma}\n`);

  // Test cases
  const testCases: TestCase[] = [
    {
      name: 'Test 1: Direct PASS',
      description: 'User passes directly (no delegation)',
      delegations: [],
      passes: ['user1'],
      expectedScores: {
        'user1': passScore  // Should use passScore parameter
      }
    },
    {
      name: 'Test 2: Simple Chain → PASS (Length 2)',
      description: 'A → B, B passes',
      delegations: [
        { from: 'user1', to: 'user2' }
      ],
      passes: ['user2'],
      expectedScores: {
        'user1': -1,  // Delegates to PASS
        'user2': passScore   // Direct PASS
      }
    },
    {
      name: 'Test 3: Chain → PASS (Length 3)',
      description: 'A → B → C, C passes',
      delegations: [
        { from: 'user1', to: 'user2' },
        { from: 'user2', to: 'user3' }
      ],
      passes: ['user3'],
      expectedScores: {
        'user1': -1,  // Distance 2 from PASS
        'user2': -1,  // Distance 1 from PASS
        'user3': passScore   // Direct PASS
      }
    },
    {
      name: 'Test 4: Chain → PASS (Length 4)',
      description: 'A → B → C → D, D passes',
      delegations: [
        { from: 'user1', to: 'user2' },
        { from: 'user2', to: 'user3' },
        { from: 'user3', to: 'user4' }
      ],
      passes: ['user4'],
      expectedScores: {
        'user1': -1,  // Distance 3 from PASS
        'user2': -1,  // Distance 2 from PASS
        'user3': -1,  // Distance 1 from PASS
        'user4': passScore   // Direct PASS
      }
    },
    {
      name: 'Test 5: Long Chain → PASS (Length 6)',
      description: 'A → B → C → D → E → F, F passes',
      delegations: [
        { from: 'user1', to: 'user2' },
        { from: 'user2', to: 'user3' },
        { from: 'user3', to: 'user4' },
        { from: 'user4', to: 'user5' },
        { from: 'user5', to: 'user6' }
      ],
      passes: ['user6'],
      expectedScores: {
        'user1': -1,  // Distance 5 from PASS
        'user2': -1,  // Distance 4 from PASS
        'user3': -1,  // Distance 3 from PASS
        'user4': -1,  // Distance 2 from PASS
        'user5': -1,  // Distance 1 from PASS
        'user6': passScore   // Direct PASS
      }
    },
    {
      name: 'Test 6: Multiple Independent PASS Chains',
      description: 'Chain 1: A → B (B passes), Chain 2: C → D → E (E passes)',
      delegations: [
        { from: 'user1', to: 'user2' },
        { from: 'user3', to: 'user4' },
        { from: 'user4', to: 'user5' }
      ],
      passes: ['user2', 'user5'],
      expectedScores: {
        'user1': -1,  // Delegates to PASS
        'user2': passScore,  // Direct PASS
        'user3': -1,  // Distance 2 from PASS
        'user4': -1,  // Distance 1 from PASS
        'user5': passScore   // Direct PASS
      }
    },
    {
      name: 'Test 7: Mixed - PASS chain and Correct solve',
      description: 'A → B (B passes), C solves correct',
      delegations: [
        { from: 'user1', to: 'user2' }
      ],
      passes: ['user2'],
      expectedScores: {
        'user1': -1,  // Delegates to PASS
        'user2': passScore,  // Direct PASS
        'user3': 1   // Correct solve (no delegators)
      }
    }
  ];

  let passedTests = 0;
  let failedTests = 0;

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log(`Description: ${testCase.description}`);
    console.log('-'.repeat(80));

    try {
      // Clear existing actions for test users
      const userIds = Object.keys(testCase.expectedScores);
      await prisma.roundAction.deleteMany({
        where: {
          roundId: round.id,
          userId: { in: userIds }
        }
      });

      await prisma.roundScore.deleteMany({
        where: {
          roundId: round.id,
          userId: { in: userIds }
        }
      });

      // Create delegations
      for (const delegation of testCase.delegations) {
        await prisma.roundAction.create({
          data: {
            roundId: round.id,
            userId: delegation.from,
            action: 'DELEGATE',
            delegateTo: delegation.to
          }
        });
        console.log(`  ✓ Created: ${delegation.from} → ${delegation.to}`);
      }

      // Create PASS actions
      for (const userId of testCase.passes) {
        await prisma.roundAction.create({
          data: {
            roundId: round.id,
            userId: userId,
            action: 'PASS'
          }
        });
        console.log(`  ✓ Created: ${userId} → PASS`);
      }

      // Create solve actions (if any)
      for (const userId of Object.keys(testCase.expectedScores)) {
        const isDelegating = testCase.delegations.some(d => d.from === userId);
        const isPassing = testCase.passes.includes(userId);
        
        if (!isDelegating && !isPassing) {
          // This must be a solver
          await prisma.roundAction.create({
            data: {
              roundId: round.id,
              userId: userId,
              action: 'SOLVE',
              answer: round.correctAnswer,
              isCorrect: true
            }
          });
          console.log(`  ✓ Created: ${userId} → SOLVE (correct)`);
        }
      }

      // Import and run calculation
      const { calculateDelegationGraph } = await import('../lib/calculateDelegationGraph');
      await calculateDelegationGraph(round.id);

      // Fetch results
      const scores = await prisma.roundScore.findMany({
        where: {
          roundId: round.id,
          userId: { in: userIds }
        }
      });

      console.log('\n  Results:');
      let testPassed = true;

      for (const userId of userIds) {
        const score = scores.find(s => s.userId === userId);
        const actualScore = score?.totalScore ?? 0;
        const expectedScore = testCase.expectedScores[userId];

        const match = Math.abs(actualScore - expectedScore) < 0.001;
        const icon = match ? '✅' : '❌';
        
        console.log(`  ${icon} ${userId}: Expected ${expectedScore}, Got ${actualScore}`);
        
        if (!match) {
          testPassed = false;
          console.log(`     ⚠️  MISMATCH! Difference: ${actualScore - expectedScore}`);
          if (score) {
            console.log(`     Details: solve=${score.solveScore}, delegate=${score.delegateScore}, trust=${score.trustScore}`);
          }
        }
      }

      if (testPassed) {
        console.log(`\n  ✅ ${testCase.name} PASSED`);
        passedTests++;
      } else {
        console.log(`\n  ❌ ${testCase.name} FAILED`);
        failedTests++;
      }

    } catch (error) {
      console.log(`\n  ❌ ${testCase.name} FAILED (Error)`);
      console.error(`  Error: ${error}`);
      failedTests++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Test Summary:`);
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📝 Total: ${passedTests + failedTests}`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All PASS chain tests passed!\n');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the implementation.\n');
  }

  await prisma.$disconnect();
}

runTests().catch(console.error);
