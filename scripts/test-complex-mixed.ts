/**
 * Test: Complex Mixed Scenario
 * 
 * Scenario:
 * - Alice solves correctly
 * - Bob delegates to Alice (correct chain)
 * - Carol delegates to Bob (correct chain, distance 2)
 * - David solves incorrectly
 * - Eve delegates to David (incorrect chain)
 * - Frank delegates to Grace
 * - Grace delegates to Frank (cycle)
 * - Henry delegates to Frank (upstream of cycle)
 * 
 * Expected scores (with λ=0.6, γ=0.4, β=0.2):
 * - Alice: 1 + 0.2*1 = 1.2 (correct + 1 delegator trust bonus)
 * - Bob: 1 + 0.6 * (2*1 / 2) = 1 + 0.6 = 1.6 (upstream of correct at distance 1)
 * - Carol: 1 + 0.6 * (2*2 / 3) = 1 + 0.8 = 1.8 (upstream of correct at distance 2)
 * - David: -1 (incorrect solve)
 * - Eve: -1 (upstream of incorrect at distance 1)
 * - Frank: -1.4 (member of cycle)
 * - Grace: -1.4 (member of cycle)
 * - Henry: -1 - 0.4/2 = -1.2 (upstream of cycle at distance 1)
 */

interface GraphNode {
  userId: string;
  action: 'SOLVE' | 'DELEGATE' | 'PASS';
  answer: string | null;
  delegateTo: string | null;
  isCorrect: boolean | null;
  score: number;
  distanceFromSolver: number | null;
  inCycle: boolean;
}

const lambda = 0.6;
const gamma = 0.4;
const beta = 0.2;

console.log(`\n${'='.repeat(60)}`);
console.log(`TEST: Complex Mixed Scenario`);
console.log(`${'='.repeat(60)}`);
console.log(`\nParameters: λ=${lambda}, γ=${gamma}, β=${beta}\n`);

const nodes = new Map<string, GraphNode>();

// Correct chain: Carol → Bob → Alice (correct)
nodes.set('alice', {
  userId: 'alice',
  action: 'SOLVE',
  answer: 'correct',
  delegateTo: null,
  isCorrect: true,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('bob', {
  userId: 'bob',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'alice',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('carol', {
  userId: 'carol',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'bob',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

// Incorrect chain: Eve → David (incorrect)
nodes.set('david', {
  userId: 'david',
  action: 'SOLVE',
  answer: 'wrong',
  delegateTo: null,
  isCorrect: false,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('eve', {
  userId: 'eve',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'david',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

// Cycle: Henry → Frank ↔ Grace
nodes.set('frank', {
  userId: 'frank',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'grace',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('grace', {
  userId: 'grace',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'frank',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('henry', {
  userId: 'henry',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'frank',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

console.log(`Delegation structure:`);
console.log(`  Correct chain: Carol → Bob → Alice (✅)`);
console.log(`  Incorrect chain: Eve → David (❌)`);
console.log(`  Cycle: Henry → Frank ↔ Grace (🔄)`);
console.log();

// Detect cycles
const visited = new Set<string>();
const inStack = new Set<string>();

function detectCycle(userId: string, path: string[] = []): boolean {
  if (inStack.has(userId)) {
    console.log(`\n🔄 Cycle detected! Path: ${path.join(' → ')} → ${userId}`);
    const cycleStart = path.indexOf(userId);
    console.log(`  Cycle members (from index ${cycleStart}): ${path.slice(cycleStart).join(', ')}`);
    for (let i = cycleStart; i < path.length; i++) {
      const node = nodes.get(path[i]);
      if (node) {
        node.inCycle = true;
        console.log(`    Marked ${path[i]} as inCycle`);
      }
    }
    return true;
  }
  
  if (visited.has(userId)) return false;
  
  visited.add(userId);
  inStack.add(userId);
  path.push(userId);
  
  const node = nodes.get(userId);
  if (node?.delegateTo && nodes.has(node.delegateTo)) {
    detectCycle(node.delegateTo, path);
  }
  
  inStack.delete(userId);
  return false;
}

for (const [userId] of nodes) {
  if (!visited.has(userId)) {
    detectCycle(userId);
  }
}

// Calculate delegator counts for trust bonus
const delegatorCount = new Map<string, number>();
for (const [userId, node] of nodes) {
  if (node.delegateTo) {
    delegatorCount.set(node.delegateTo, (delegatorCount.get(node.delegateTo) || 0) + 1);
  }
}

// Calculate scores
const scoreCache = new Map<string, number>();
const distanceCache = new Map<string, number>();
const leadsToCache = new Map<string, 'cycle' | 'correct' | 'incorrect' | 'pass'>();

function calculateScoreMemoized(userId: string, visitedInChain: Set<string> = new Set()): { 
  score: number, 
  distance: number | null,
  leadsTo: 'cycle' | 'correct' | 'incorrect' | 'pass'
} {
  if (scoreCache.has(userId)) {
    return { 
      score: scoreCache.get(userId)!,
      distance: distanceCache.get(userId) ?? null,
      leadsTo: leadsToCache.get(userId)!
    };
  }

  const node = nodes.get(userId);
  if (!node) return { score: 0, distance: null, leadsTo: 'pass' };

  if (visitedInChain.has(userId)) {
    node.inCycle = true;
    const score = -1 - gamma;
    scoreCache.set(userId, score);
    leadsToCache.set(userId, 'cycle');
    return { score, distance: null, leadsTo: 'cycle' };
  }

  visitedInChain.add(userId);
  let score = 0;
  let distance: number | null = null;
  let leadsTo: 'cycle' | 'correct' | 'incorrect' | 'pass' = 'pass';

  if (node.inCycle) {
    score = -1 - gamma;
    leadsTo = 'cycle';
  } else if (node.action === 'SOLVE') {
    if (node.isCorrect) {
      score = 1;
      distance = 0;
      leadsTo = 'correct';
      const delegators = delegatorCount.get(userId) || 0;
      const trustBonus = beta * delegators;
      score += trustBonus;
    } else {
      score = -1;
      distance = 0;
      leadsTo = 'incorrect';
    }
  } else if (node.action === 'DELEGATE' && node.delegateTo) {
    const target = nodes.get(node.delegateTo);
    if (!target) {
      score = -1 - gamma;
      leadsTo = 'cycle';
    } else {
      const targetResult = calculateScoreMemoized(node.delegateTo, new Set(visitedInChain));
      distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
      leadsTo = targetResult.leadsTo;
      
      if (target.inCycle || targetResult.leadsTo === 'cycle') {
        score = -1 - gamma / (distance + 1);
        leadsTo = 'cycle';
      } else if (targetResult.leadsTo === 'correct') {
        score = 1 + lambda * (2 * distance / (distance + 1));
        leadsTo = 'correct';
      } else if (targetResult.leadsTo === 'incorrect') {
        score = -1;
        leadsTo = 'incorrect';
      } else {
        score = -1;
        leadsTo = 'pass';
      }
    }
  }

  scoreCache.set(userId, score);
  leadsToCache.set(userId, leadsTo);
  if (distance !== null) {
    distanceCache.set(userId, distance);
  }

  node.score = score;
  node.distanceFromSolver = distance;

  return { score, distance, leadsTo };
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Score Calculation:`);
console.log(`${'='.repeat(60)}\n`);

for (const [userId] of nodes) {
  const result = calculateScoreMemoized(userId);
  console.log(`  ${userId}: score=${result.score.toFixed(4)}, distance=${result.distance}, leadsTo=${result.leadsTo}`);
}

// Display results
console.log(`\n${'='.repeat(60)}`);
console.log(`Final Scores:`);
console.log(`${'='.repeat(60)}\n`);

const expectedScores = {
  'alice': 1 + beta * 1, // 1.2
  'bob': 1 + lambda * (2 * 1 / 2), // 1.6
  'carol': 1 + lambda * (2 * 2 / 3), // 1.8
  'david': -1,
  'eve': -1,
  'frank': -1 - gamma, // -1.4
  'grace': -1 - gamma, // -1.4
  'henry': -1 - gamma / 2, // -1.2
};

let allCorrect = true;

for (const [userId, node] of nodes) {
  const expected = expectedScores[userId as keyof typeof expectedScores];
  const match = Math.abs(node.score - expected) < 0.0001;
  const icon = match ? '✅' : '❌';
  
  console.log(`${icon} ${userId}:`);
  console.log(`   Score: ${node.score.toFixed(4)} (expected: ${expected.toFixed(4)})`);
  console.log(`   Distance: ${node.distanceFromSolver}`);
  console.log(`   In Cycle: ${node.inCycle}`);
  console.log();
  
  if (!match) {
    allCorrect = false;
    console.log(`   ⚠️  MISMATCH! Expected ${expected.toFixed(4)}, got ${node.score.toFixed(4)}`);
    console.log();
  }
}

console.log(`${'='.repeat(60)}`);
if (allCorrect) {
  console.log(`✅ ALL TESTS PASSED!`);
} else {
  console.log(`❌ SOME TESTS FAILED!`);
}
console.log(`${'='.repeat(60)}\n`);
