/**
 * Test script to verify delegation chain scoring
 * 
 * Scenario: A1 -> A2 -> A3 -> A4
 * Where A4 solves incorrectly
 * 
 * Expected scores (with λ=0.5):
 * - A4: -1 (incorrect solver)
 * - A3: -1 - λ^1 = -1 - 0.5 = -1.5
 * - A2: -1 - λ^2 = -1 - 0.25 = -1.25
 * - A1: -1 - λ^3 = -1 - 0.125 = -1.125
 */

type GraphNode = {
  userId: string;
  action: string;
  answer: string | null;
  delegateTo: string | null;
  isCorrect: boolean | null;
  score: number;
  distanceFromSolver: number | null;
  inCycle: boolean;
};

function testDelegationChainScoring() {
  const lambda = 0.5;
  const beta = 0.1;
  const gamma = 0.2;

  // Create test nodes
  const nodes = new Map<string, GraphNode>();
  
  // A4 - solves incorrectly
  nodes.set('A4', {
    userId: 'A4',
    action: 'SOLVE',
    answer: 'wrong',
    delegateTo: null,
    isCorrect: false,
    score: 0,
    distanceFromSolver: null,
    inCycle: false,
  });
  
  // A3 - delegates to A4
  nodes.set('A3', {
    userId: 'A3',
    action: 'DELEGATE',
    answer: null,
    delegateTo: 'A4',
    isCorrect: null,
    score: 0,
    distanceFromSolver: null,
    inCycle: false,
  });
  
  // A2 - delegates to A3
  nodes.set('A2', {
    userId: 'A2',
    action: 'DELEGATE',
    answer: null,
    delegateTo: 'A3',
    isCorrect: null,
    score: 0,
    distanceFromSolver: null,
    inCycle: false,
  });
  
  // A1 - delegates to A2
  nodes.set('A1', {
    userId: 'A1',
    action: 'DELEGATE',
    answer: null,
    delegateTo: 'A2',
    isCorrect: null,
    score: 0,
    distanceFromSolver: null,
    inCycle: false,
  });

  const scoreCache = new Map<string, number>();
  const distanceCache = new Map<string, number>();

  function calculateScoreMemoized(userId: string, visitedInChain: Set<string> = new Set()): { score: number, distance: number | null } {
    // Check cache
    if (scoreCache.has(userId)) {
      return { 
        score: scoreCache.get(userId)!,
        distance: distanceCache.get(userId) || null
      };
    }

    const node = nodes.get(userId);
    if (!node) return { score: 0, distance: null };

    // Detect cycles in this calculation path
    if (visitedInChain.has(userId)) {
      node.inCycle = true;
      const score = -1 - gamma;
      scoreCache.set(userId, score);
      return { score, distance: null };
    }

    visitedInChain.add(userId);
    let score = 0;
    let distance: number | null = null;

    if (node.inCycle) {
      score = -1 - gamma;
      console.log(`  ${userId}: In cycle, score = ${score}`);
    } else if (node.action === 'SOLVE') {
      if (node.isCorrect) {
        score = 1;
        distance = 0;
        console.log(`  ${userId}: Correct solve, score = ${score}`);
      } else {
        score = -1;
        distance = 0;
        console.log(`  ${userId}: Incorrect solve, score = ${score}`);
      }
    } else if (node.action === 'PASS') {
      score = 0;
      console.log(`  ${userId}: Passed, score = ${score}`);
    } else if (node.action === 'DELEGATE' && node.delegateTo) {
      const target = nodes.get(node.delegateTo);
      if (!target) {
        score = -1 - lambda;
      } else {
        // Recursive call with memoization
        const targetResult = calculateScoreMemoized(node.delegateTo, new Set(visitedInChain));
        distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
        
        if (target.inCycle) {
          score = -1 - Math.pow(gamma, distance);
          console.log(`  ${userId}: Delegates to cycle at distance ${distance}, score = ${score}`);
        } else if (target.action === 'SOLVE') {
          if (target.isCorrect) {
            score = 1 + Math.pow(lambda, distance);
          } else {
            score = -1 - Math.pow(lambda, distance);
          }
          console.log(`  ${userId}: Delegates to ${target.isCorrect ? 'correct' : 'incorrect'} solver at distance ${distance}, score = ${score}`);
        } else if (target.action === 'PASS') {
          score = -1 - Math.pow(lambda, distance);
          console.log(`  ${userId}: Delegates to pass at distance ${distance}, score = ${score}`);
        } else {
          // Delegation chain - use the target's score to determine sign
          // If target got positive score (correct chain), propagate positive
          // If target got negative score (wrong/pass chain), propagate negative
          if (targetResult.score >= 0) {
            score = 1 + Math.pow(lambda, distance);
            console.log(`  ${userId}: Delegates to correct chain at distance ${distance}, score = ${score}`);
          } else {
            score = -1 - Math.pow(lambda, distance);
            console.log(`  ${userId}: Delegates to incorrect chain at distance ${distance}, score = ${score}`);
          }
        }
      }
    }

    // Cache the results
    scoreCache.set(userId, score);
    if (distance !== null) {
      distanceCache.set(userId, distance);
    }

    node.score = score;
    node.distanceFromSolver = distance;

    return { score, distance };
  }

  console.log('\n=== Testing Delegation Chain Scoring ===');
  console.log('Chain: A1 -> A2 -> A3 -> A4 (A4 solves incorrectly)');
  console.log(`Parameters: λ=${lambda}, β=${beta}, γ=${gamma}\n`);

  // Calculate scores
  for (const [userId] of nodes) {
    calculateScoreMemoized(userId);
  }

  console.log('\n=== Results ===');
  console.log('Expected vs Actual:\n');
  
  const expected = {
    'A4': -1,
    'A3': -1 - Math.pow(lambda, 1),
    'A2': -1 - Math.pow(lambda, 2),
    'A1': -1 - Math.pow(lambda, 3),
  };

  for (const [userId, node] of nodes) {
    const exp = expected[userId as keyof typeof expected];
    const actual = node.score;
    const match = Math.abs(exp - actual) < 0.0001 ? '✅' : '❌';
    console.log(`${userId}: Expected ${exp.toFixed(4)}, Got ${actual.toFixed(4)} ${match}`);
  }
}

testDelegationChainScoring();
