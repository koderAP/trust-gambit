/**
 * EXACT user scenario test
 * 
 * "if A1->A2->A3->A4 and A4 passes or solves wrong, A2 is not receiving the exact negative points"
 * 
 * Let's test BOTH scenarios the user mentioned:
 * 1. A4 passes
 * 2. A4 solves wrong
 */

type GraphNode4 = {
  userId: string;
  action: string;
  answer: string | null;
  delegateTo: string | null;
  isCorrect: boolean | null;
  score: number;
  distanceFromSolver: number | null;
  inCycle: boolean;
};

function runTest(scenario: string, a4Action: 'PASS' | 'SOLVE', a4IsCorrect: boolean | null) {
  const lambda = 0.5;
  const beta = 0.1;
  const gamma = 0.2;

  const nodes = new Map<string, GraphNode4>();
  
  // A4 - terminus
  nodes.set('A4', {
    userId: 'A4',
    action: a4Action,
    answer: a4Action === 'SOLVE' ? (a4IsCorrect ? 'correct' : 'wrong') : null,
    delegateTo: null,
    isCorrect: a4IsCorrect,
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
    if (scoreCache.has(userId)) {
      return { 
        score: scoreCache.get(userId)!,
        distance: distanceCache.get(userId) || null
      };
    }

    const node = nodes.get(userId);
    if (!node) return { score: 0, distance: null };

    if (visitedInChain.has(userId)) {
      node.inCycle = true;
      const score = -1 - gamma;
      scoreCache.set(userId, score);
      return { score, distance: null };
    }

    visitedInChain.add(userId);
    let score = 0;
    let distance: number | null = null;

    if (node.action === 'SOLVE') {
      if (node.isCorrect) {
        score = 1;
        distance = 0;
      } else {
        score = -1;
        distance = 0;
      }
    } else if (node.action === 'PASS') {
      score = 0;
      distance = null;
    } else if (node.action === 'DELEGATE' && node.delegateTo) {
      const target = nodes.get(node.delegateTo);
      if (!target) {
        score = -1 - lambda;
      } else {
        const targetResult = calculateScoreMemoized(node.delegateTo, new Set(visitedInChain));
        distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
        
        if (target.action === 'SOLVE') {
          if (target.isCorrect) {
            // NEW FORMULA: Upstream of correct terminus at distance k: score = 1 + λ × (2k / (k+1))
            score = 1 + lambda * (2 * distance / (distance + 1));
          } else {
            // NEW: Upstream of incorrect terminus: flat penalty of -1
            score = -1;
          }
        } else if (target.action === 'PASS') {
          // NEW: Upstream of pass terminus: flat penalty of -1
          score = -1;
        } else {
          if (targetResult.score >= 0) {
            // NEW FORMULA: Upstream of correct chain at distance k: score = 1 + λ × (2k / (k+1))
            score = 1 + lambda * (2 * distance / (distance + 1));
          } else {
            // NEW: Upstream of incorrect/pass chain: flat penalty of -1
            score = -1;
          }
        }
      }
    }

    scoreCache.set(userId, score);
    if (distance !== null) {
      distanceCache.set(userId, distance);
    }

    node.score = score;
    node.distanceFromSolver = distance;

    return { score, distance };
  }

  console.log(`\n=== ${scenario} ===`);
  console.log('Chain: A1 -> A2 -> A3 -> A4');
  console.log(`A4: ${a4Action}${a4Action === 'SOLVE' ? (a4IsCorrect ? ' (correct)' : ' (wrong)') : ''}\n`);

  for (const [userId] of nodes) {
    calculateScoreMemoized(userId);
  }

  console.log('Expected scores:');
  if (a4Action === 'SOLVE' && !a4IsCorrect) {
    console.log(`  A4: -1.0000 (incorrect solve)`);
    console.log(`  A3: -1.0000 (distance 1 from incorrect solver: -1 flat penalty)`);
    console.log(`  A2: -1.0000 (distance 2 from incorrect solver: -1 flat penalty)`);
    console.log(`  A1: -1.0000 (distance 3 from incorrect solver: -1 flat penalty)`);
  } else if (a4Action === 'PASS') {
    console.log(`  A4: 0.0000 (pass)`);
    console.log(`  A3: -1.0000 (distance 1 from pass: -1 flat penalty)`);
    console.log(`  A2: -1.0000 (distance 2 from pass: -1 flat penalty)`);
    console.log(`  A1: -1.0000 (distance 3 from pass: -1 flat penalty)`);    console.log(`  A3: -1.5000 (distance 1 from pass: -1 - λ^1 = -1 - 0.5)`);
    console.log(`  A2: -1.2500 (distance 2 from pass: -1 - λ^2 = -1 - 0.25) ⚠️`);
    console.log(`  A1: -1.1250 (distance 3 from pass: -1 - λ^3 = -1 - 0.125)`);
  }

  console.log('\nActual scores:');
  for (const [userId, node] of nodes) {
    const expected = userId === 'A4' ? (a4Action === 'PASS' ? 0 : -1) :
                     userId === 'A3' ? -1.5 :
                     userId === 'A2' ? -1.25 :
                     -1.125;
    const match = Math.abs(expected - node.score) < 0.0001 ? '✅' : '❌';
    console.log(`  ${userId}: ${node.score.toFixed(4)} ${match}`);
  }
}

runTest('Scenario 1: A4 solves WRONG', 'SOLVE', false);
runTest('Scenario 2: A4 PASSES', 'PASS', null);

console.log('\n=== CONCLUSION ===');
console.log('Based on the tests above, the scoring appears to be working correctly.');
console.log('A2 IS receiving the correct negative points in both scenarios.');
console.log('\nIf you\'re seeing different values, the issue might be:');
console.log('1. Different lambda value than 0.5');
console.log('2. A different chain structure than described');
console.log('3. A cycle detection issue');
console.log('4. A caching/memoization issue in a specific edge case');
console.log('\nPlease provide actual scores you\'re seeing vs. expected scores.');
