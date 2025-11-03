/**
 * Debug test: Check if distance propagation works correctly
 * when there's a PASS node involved
 * 
 * Chain: A1 -> A2 -> A3 (A3 passes)
 */

type GraphNode3 = {
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

const nodes = new Map<string, GraphNode3>();

nodes.set('A3', {
  userId: 'A3',
  action: 'PASS',
  answer: null,
  delegateTo: null,
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

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
    console.log(`    [CACHE HIT] ${userId}: score=${scoreCache.get(userId)}, distance=${distanceCache.get(userId) || null}`);
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

  console.log(`  [CALC] ${userId} (action=${node.action})`);

  if (node.action === 'SOLVE') {
    if (node.isCorrect) {
      score = 1;
      distance = 0;
    } else {
      score = -1;
      distance = 0;
    }
    console.log(`    → SOLVE: score=${score}, distance=${distance}`);
  } else if (node.action === 'PASS') {
    score = 0;
    distance = null;
    console.log(`    → PASS: score=${score}, distance=${distance}`);
  } else if (node.action === 'DELEGATE' && node.delegateTo) {
    const target = nodes.get(node.delegateTo);
    console.log(`    → Delegates to ${node.delegateTo} (target.action=${target?.action})`);
    
    if (!target) {
      score = -1 - lambda;
    } else {
      console.log(`    → Recursing into ${node.delegateTo}...`);
      const targetResult = calculateScoreMemoized(node.delegateTo, new Set(visitedInChain));
      console.log(`    → Back from ${node.delegateTo}: targetResult.score=${targetResult.score}, targetResult.distance=${targetResult.distance}`);
      
      distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
      console.log(`    → Calculated distance = ${distance}`);
      
      if (target.action === 'SOLVE') {
        if (target.isCorrect) {
          // NEW FORMULA: Upstream of correct terminus at distance k: score = 1 + λ × (2k / (k+1))
          score = 1 + lambda * (2 * distance / (distance + 1));
          console.log(`    → Target is CORRECT SOLVE: score = 1 + λ × (2×${distance} / (${distance}+1)) = ${score}`);
        } else {
          // NEW: Upstream of incorrect terminus: flat penalty of -1
          score = -1;
          console.log(`    → Target is INCORRECT SOLVE: score = -1 (flat penalty)`);
        }
      } else if (target.action === 'PASS') {
        // NEW: Upstream of pass terminus: flat penalty of -1
        score = -1;
        console.log(`    → Target is PASS: score = -1 (flat penalty)`);
      } else {
        // Delegation chain
        if (targetResult.score >= 0) {
          // NEW FORMULA: Upstream of correct chain at distance k: score = 1 + λ × (2k / (k+1))
          score = 1 + lambda * (2 * distance / (distance + 1));
          console.log(`    → Target is DELEGATE (positive chain): score = 1 + λ × (2×${distance} / (${distance}+1)) = ${score}`);
        } else {
          // NEW: Upstream of incorrect/pass chain: flat penalty of -1
          score = -1;
          console.log(`    → Target is DELEGATE (negative chain): score = -1 (flat penalty)`);
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

console.log('\n=== Debugging Distance Propagation ===');
console.log('Chain: A1 -> A2 -> A3 (A3 passes)\n');
console.log('Expected:');
console.log('  A3: score=0, distance=null (PASS)');
console.log('  A2: score=-1.5, distance=1 (delegates to PASS)');
console.log('  A1: score=-1.25, distance=2 (delegates to someone who delegates to PASS)\n');

for (const [userId] of nodes) {
  calculateScoreMemoized(userId);
}

console.log('\n=== Final Results ===');
for (const [userId, node] of nodes) {
  console.log(`${userId}: score=${node.score.toFixed(4)}, distance=${node.distanceFromSolver}`);
}
