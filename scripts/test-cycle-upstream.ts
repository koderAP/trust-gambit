/**
 * Test: Cycle with Upstream Delegators
 * 
 * Scenario:
 * - Alice delegates to Bob
 * - Bob delegates to Charlie
 * - Charlie delegates to Bob (creates cycle: Bob ↔ Charlie)
 * 
 * Expected scores (with γ=0.4):
 * - Bob: -1 - γ = -1 - 0.4 = -1.4 (member of cycle)
 * - Charlie: -1 - γ = -1 - 0.4 = -1.4 (member of cycle)
 * - Alice: -1 - γ/(k+1) = -1 - 0.4/(1+1) = -1 - 0.2 = -1.2 (upstream at distance 1)
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
console.log(`TEST: Cycle with Upstream Delegators`);
console.log(`${'='.repeat(60)}`);
console.log(`\nParameters: λ=${lambda}, γ=${gamma}, β=${beta}\n`);

// Setup: Alice → Bob → Charlie → Bob (cycle)
const nodes = new Map<string, GraphNode>();

nodes.set('alice', {
  userId: 'alice',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'bob',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('bob', {
  userId: 'bob',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'charlie',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('charlie', {
  userId: 'charlie',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'bob',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

console.log(`Delegation structure:`);
console.log(`  Alice → Bob → Charlie → Bob (cycle)`);
console.log();

// Detect cycles
const visited = new Set<string>();
const inStack = new Set<string>();

function detectCycle(userId: string, path: string[] = []): boolean {
  if (inStack.has(userId)) {
    // Found a cycle - mark all nodes in the cycle
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

// Detect cycles
for (const [userId] of nodes) {
  if (!visited.has(userId)) {
    detectCycle(userId);
  }
}

console.log(`\nAfter cycle detection:`);
for (const [userId, node] of nodes) {
  console.log(`  ${userId}: inCycle = ${node.inCycle}`);
}

// Calculate scores
const scoreCache = new Map<string, number>();
const distanceCache = new Map<string, number>();

function calculateScoreMemoized(userId: string, visitedInChain: Set<string> = new Set()): { score: number, distance: number | null } {
  // Check cache
  if (scoreCache.has(userId)) {
    return { 
      score: scoreCache.get(userId)!,
      distance: distanceCache.get(userId) ?? null
    };
  }

  const node = nodes.get(userId);
  if (!node) return { score: 0, distance: null };

  // Detect cycles in this calculation path
  if (visitedInChain.has(userId)) {
    node.inCycle = true;
    const score = -1 - gamma;
    scoreCache.set(userId, score);
    console.log(`  [Recursion] ${userId}: Detected in visitedInChain, marking as cycle, score = ${score}`);
    return { score, distance: null };
  }

  visitedInChain.add(userId);
  let score = 0;
  let distance: number | null = null;

  if (node.inCycle) {
    // Nodes in cycles get -1 - γ
    score = -1 - gamma;
    console.log(`  ${userId}: In cycle, score = ${score}`);
  } else if (node.action === 'DELEGATE' && node.delegateTo) {
    const target = nodes.get(node.delegateTo);
    if (!target) {
      score = -1 - gamma;
      console.log(`  ${userId}: Delegates to missing target, score = ${score}`);
    } else {
      // Recursive call with memoization
      const targetResult = calculateScoreMemoized(node.delegateTo, new Set(visitedInChain));
      distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
      
      if (target.inCycle) {
        // Upstream of cycle at distance k: score = -1 - γ/(k+1)
        score = -1 - gamma / (distance + 1);
        console.log(`  ${userId}: Delegates to cycle member '${node.delegateTo}' at distance ${distance}, score = -1 - ${gamma}/(${distance}+1) = ${score}`);
      } else {
        // This shouldn't happen in our test case
        score = -1;
        console.log(`  ${userId}: Delegates to non-cycle member (unexpected), score = ${score}`);
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

console.log(`\n${'='.repeat(60)}`);
console.log(`Score Calculation:`);
console.log(`${'='.repeat(60)}\n`);

// Calculate scores
for (const [userId] of nodes) {
  calculateScoreMemoized(userId);
}

// Display results
console.log(`\n${'='.repeat(60)}`);
console.log(`Final Scores:`);
console.log(`${'='.repeat(60)}\n`);

const expectedScores = {
  'bob': -1 - gamma,
  'charlie': -1 - gamma,
  'alice': -1 - gamma / (1 + 1),
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
