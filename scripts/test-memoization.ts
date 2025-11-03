/**
 * Test potential cycle detection issue
 * 
 * What if the memoization interferes with cycle detection?
 */

type GraphNode5 = {
  userId: string;
  action: string;
  answer: string | null;
  delegateTo: string | null;
  isCorrect: boolean | null;
  score: number;
  distanceFromSolver: number | null;
  inCycle: boolean;
};

const lambda = 0.5;
const beta = 0.1;
const gamma = 0.2;

console.log('\n=== Test: Memoization + visitedInChain interaction ===\n');

// Scenario: B delegates to A, and we calculate B's score twice
// to see if the visitedInChain is properly handled

const nodes1 = new Map<string, GraphNode5>();

nodes1.set('A', {
  userId: 'A',
  action: 'SOLVE',
  answer: 'wrong',
  delegateTo: null,
  isCorrect: false,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes1.set('B', {
  userId: 'B',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'A',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

const scoreCache1 = new Map<string, number>();
const distanceCache1 = new Map<string, number>();

function calculateScoreMemoized1(userId: string, visitedInChain: Set<string> = new Set()): { score: number, distance: number | null } {
  console.log(`  Calculating ${userId}, visitedInChain=${Array.from(visitedInChain).join(',')}`);
  
  if (scoreCache1.has(userId)) {
    console.log(`    → Cache hit! Returning score=${scoreCache1.get(userId)}`);
    return { 
      score: scoreCache1.get(userId)!,
      distance: distanceCache1.get(userId) || null
    };
  }

  const node = nodes1.get(userId);
  if (!node) return { score: 0, distance: null };

  if (visitedInChain.has(userId)) {
    console.log(`    → Cycle detected!`);
    node.inCycle = true;
    const score = -1 - gamma;
    scoreCache1.set(userId, score);
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
    console.log(`    → SOLVE (${node.isCorrect ? 'correct' : 'wrong'}): score=${score}`);
  } else if (node.action === 'DELEGATE' && node.delegateTo) {
    console.log(`    → DELEGATE to ${node.delegateTo}`);
    const target = nodes1.get(node.delegateTo);
    if (target) {
      console.log(`    → Recursing with new Set...`);
      const targetResult = calculateScoreMemoized1(node.delegateTo, new Set(visitedInChain));
      distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
      
      if (target.action === 'SOLVE') {
        if (target.isCorrect) {
          // NEW FORMULA: Upstream of correct terminus at distance k: score = 1 + λ × (2k / (k+1))
          score = 1 + lambda * (2 * distance / (distance + 1));
        } else {
          // NEW: Upstream of incorrect terminus: flat penalty of -1
          score = -1;
        }
      }
      console.log(`    → score=${score}, distance=${distance}`);
    }
  }

  scoreCache1.set(userId, score);
  if (distance !== null) {
    distanceCache1.set(userId, distance);
  }

  node.score = score;
  node.distanceFromSolver = distance;

  return { score, distance };
}

console.log('First calculation of B:');
calculateScoreMemoized1('B');

console.log('\nSecond calculation of B (should use cache):');
calculateScoreMemoized1('B');

console.log('\n\n=== Test: Real chain calculation order ===\n');

const nodes2 = new Map<string, GraphNode5>();

nodes2.set('A4', {
  userId: 'A4',
  action: 'SOLVE',
  answer: 'wrong',
  delegateTo: null,
  isCorrect: false,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes2.set('A3', {
  userId: 'A3',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'A4',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes2.set('A2', {
  userId: 'A2',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'A3',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes2.set('A1', {
  userId: 'A1',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'A2',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

const scoreCache2 = new Map<string, number>();
const distanceCache2 = new Map<string, number>();

function calculateScoreMemoized2(userId: string, visitedInChain: Set<string> = new Set()): { score: number, distance: number | null } {
  if (scoreCache2.has(userId)) {
    return { 
      score: scoreCache2.get(userId)!,
      distance: distanceCache2.get(userId) || null
    };
  }

  const node = nodes2.get(userId);
  if (!node) return { score: 0, distance: null };

  if (visitedInChain.has(userId)) {
    node.inCycle = true;
    const score = -1 - gamma;
    scoreCache2.set(userId, score);
    return { score, distance: null };
  }

  visitedInChain.add(userId);
  let score = 0;
  let distance: number | null = null;

  if (node.action === 'SOLVE') {
    score = node.isCorrect ? 1 : -1;
    distance = 0;
  } else if (node.action === 'DELEGATE' && node.delegateTo) {
    const target = nodes2.get(node.delegateTo);
    if (target) {
      const targetResult = calculateScoreMemoized2(node.delegateTo, new Set(visitedInChain));
      distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
      
      // NEW FORMULA: Upstream of correct terminus = 1 + λ × (2k / (k+1)), incorrect/pass = -1
      if (target.action === 'SOLVE') {
        score = target.isCorrect ? 1 + lambda * (2 * distance / (distance + 1)) : -1;
      } else {
        score = targetResult.score >= 0 ? 1 + lambda * (2 * distance / (distance + 1)) : -1;
      }
    }
  }

  scoreCache2.set(userId, score);
  if (distance !== null) {
    distanceCache2.set(userId, distance);
  }

  node.score = score;
  node.distanceFromSolver = distance;

  return { score, distance };
}

// Calculate in REVERSE order (like the actual code does - iterates over map)
console.log('Calculating A1 first (will recursively calculate A2, A3, A4):');
calculateScoreMemoized2('A1');
console.log(`A1: ${nodes2.get('A1')!.score.toFixed(4)}`);
console.log(`A2: ${nodes2.get('A2')!.score.toFixed(4)}`);
console.log(`A3: ${nodes2.get('A3')!.score.toFixed(4)}`);
console.log(`A4: ${nodes2.get('A4')!.score.toFixed(4)}`);

console.log('\nNow calculating others (should all use cache):');
calculateScoreMemoized2('A2');
calculateScoreMemoized2('A3');
calculateScoreMemoized2('A4');

console.log('\nFinal scores:');
console.log(`A1: ${nodes2.get('A1')!.score.toFixed(4)} ✅`);
console.log(`A2: ${nodes2.get('A2')!.score.toFixed(4)} ✅`);
console.log(`A3: ${nodes2.get('A3')!.score.toFixed(4)} ✅`);
console.log(`A4: ${nodes2.get('A4')!.score.toFixed(4)} ✅`);
