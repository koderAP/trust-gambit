/**
 * COMPREHENSIVE TEST: 15 Players - All Scenarios
 * 
 * This test demonstrates EXACTLY how the scoring mechanism works with:
 * - Component 1 (CYCLE): Players who delegate in a cycle
 * - Component 2 (CORRECT): Players who delegate to a correct solver
 * - Component 3 (INCORRECT): Players who delegate to an incorrect solver
 * - Component 4 (PASS): Players who pass without attempting
 * 
 * Parameters (Phase 1):
 * - λ (lambda) = 0.6 - Delegation decay for correct answers
 * - γ (gamma) = 0.4 - Cycle penalty factor
 * - β (beta) = 0.2 - Trust bonus per delegator
 * 
 * NEW SCORING FORMULAS:
 * 1. Correct solver: +1 + β × (number of delegators)
 * 2. Upstream of correct at distance k: 1 + λ × (2k / (k+1))
 * 3. Incorrect solver: -1
 * 4. Upstream of incorrect/pass at any distance: -1 (flat penalty)
 * 5. Member of cycle: -1 - γ
 * 6. Upstream of cycle at distance k: -1 - γ/(k+1)
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

console.log(`\n${'='.repeat(80)}`);
console.log(`COMPREHENSIVE TEST: 15 Players - All Possible Scenarios`);
console.log(`${'='.repeat(80)}`);
console.log(`\nParameters: λ=${lambda}, γ=${gamma}, β=${beta}\n`);

const nodes = new Map<string, GraphNode>();

console.log(`${'='.repeat(80)}`);
console.log(`COMPONENT 1: CYCLE (5 players)`);
console.log(`${'='.repeat(80)}`);
console.log(`
Structure:
  Player01 → Player02 → Player03 ↔ Player04 (cycle between 03 and 04)
                                     ↑
                                 Player05

Expected Scores:
  - Player03: -1 - γ = -1 - 0.4 = -1.4 (member of cycle)
  - Player04: -1 - γ = -1 - 0.4 = -1.4 (member of cycle)
  - Player05: -1 - γ/(1+1) = -1 - 0.4/2 = -1.2 (upstream of cycle, distance 1)
  - Player02: -1 - γ/(1+1) = -1 - 0.4/2 = -1.2 (upstream of cycle, distance 1)
  - Player01: -1 - γ/(2+1) = -1 - 0.4/3 = -1.133 (upstream of cycle, distance 2)
`);

nodes.set('player01', {
  userId: 'player01',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player02',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player02', {
  userId: 'player02',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player03',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player03', {
  userId: 'player03',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player04',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player04', {
  userId: 'player04',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player03', // Creates cycle with player03
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player05', {
  userId: 'player05',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player04',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

console.log(`${'='.repeat(80)}`);
console.log(`COMPONENT 2: CORRECT ANSWER CHAIN (5 players)`);
console.log(`${'='.repeat(80)}`);
console.log(`
Structure:
  Player06 → Player07 → Player08 → Player09 → Player10 (solves correctly ✅)

Expected Scores:
  - Player10: 1 + β×1 = 1 + 0.2×1 = 1.2 (correct + 1 DIRECT delegator trust bonus)
  - Player09: 1 + λ×(2×1/2) = 1 + 0.6×1 = 1.6 (distance 1 from solver)
  - Player08: 1 + λ×(2×2/3) = 1 + 0.6×1.333 = 1.8 (distance 2 from solver)
  - Player07: 1 + λ×(2×3/4) = 1 + 0.6×1.5 = 1.9 (distance 3 from solver)
  - Player06: 1 + λ×(2×4/5) = 1 + 0.6×1.6 = 1.96 (distance 4 from solver)
  
NOTE: Trust bonus β only applies to DIRECT delegators, not transitive ones!
`);

nodes.set('player06', {
  userId: 'player06',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player07',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player07', {
  userId: 'player07',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player08',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player08', {
  userId: 'player08',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player09',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player09', {
  userId: 'player09',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player10',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player10', {
  userId: 'player10',
  action: 'SOLVE',
  answer: 'Paris', // Correct answer
  delegateTo: null,
  isCorrect: true,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

console.log(`${'='.repeat(80)}`);
console.log(`COMPONENT 3: INCORRECT ANSWER CHAIN (3 players)`);
console.log(`${'='.repeat(80)}`);
console.log(`
Structure:
  Player11 → Player12 → Player13 (solves incorrectly ❌)

Expected Scores:
  - Player13: -1 (incorrect answer)
  - Player12: -1 (upstream of incorrect, flat penalty regardless of distance)
  - Player11: -1 (upstream of incorrect, flat penalty regardless of distance)
`);

nodes.set('player11', {
  userId: 'player11',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player12',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player12', {
  userId: 'player12',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player13',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player13', {
  userId: 'player13',
  action: 'SOLVE',
  answer: 'London', // Wrong answer (correct is Paris)
  delegateTo: null,
  isCorrect: false,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

console.log(`${'='.repeat(80)}`);
console.log(`COMPONENT 4: PASS CHAIN (2 players)`);
console.log(`${'='.repeat(80)}`);
console.log(`
Structure:
  Player14 → Player15 (passes)

Expected Scores:
  - Player15: 0 (pass action gets 0)
  - Player14: -1 (upstream of pass, flat penalty)
`);

nodes.set('player14', {
  userId: 'player14',
  action: 'DELEGATE',
  answer: null,
  delegateTo: 'player15',
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

nodes.set('player15', {
  userId: 'player15',
  action: 'PASS',
  answer: null,
  delegateTo: null,
  isCorrect: null,
  score: 0,
  distanceFromSolver: null,
  inCycle: false,
});

console.log(`\n${'='.repeat(80)}`);
console.log(`STEP 1: DETECT CYCLES`);
console.log(`${'='.repeat(80)}\n`);
console.log(`We use Depth-First Search (DFS) with an "inStack" set to detect cycles:`);
console.log(`- Visit each node and track the current path`);
console.log(`- If we encounter a node already in our current path → CYCLE!`);
console.log(`- Mark all nodes in the cycle with inCycle = true\n`);

const visited = new Set<string>();
const inStack = new Set<string>();

function detectCycle(userId: string, path: string[] = []): boolean {
  if (inStack.has(userId)) {
    console.log(`  🔄 CYCLE FOUND! Path: ${path.join(' → ')} → ${userId}`);
    const cycleStart = path.indexOf(userId);
    const cycleMembers = path.slice(cycleStart);
    console.log(`     Cycle members: [${cycleMembers.join(', ')}]`);
    for (let i = cycleStart; i < path.length; i++) {
      const node = nodes.get(path[i]);
      if (node) {
        node.inCycle = true;
        console.log(`     ✓ Marked ${path[i]} as inCycle = true`);
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

console.log(`\n${'='.repeat(80)}`);
console.log(`STEP 2: BUILD DELEGATOR COUNT MAP (for trust bonus)`);
console.log(`${'='.repeat(80)}\n`);
console.log(`Count how many people delegate TO each player:`);

const delegatorCount = new Map<string, number>();
for (const [userId, node] of nodes) {
  if (node.delegateTo) {
    delegatorCount.set(node.delegateTo, (delegatorCount.get(node.delegateTo) || 0) + 1);
  }
}

for (const [userId, count] of delegatorCount) {
  console.log(`  ${userId}: ${count} delegator(s)`);
}

console.log(`\n${'='.repeat(80)}`);
console.log(`STEP 3: CALCULATE SCORES WITH MEMOIZATION`);
console.log(`${'='.repeat(80)}\n`);
console.log(`We use RECURSIVE calculation with caching to avoid redundant work:`);
console.log(`- For each player, recursively calculate their target's score first`);
console.log(`- Cache results to avoid recalculating same player multiple times`);
console.log(`- Track "leadsTo" to know what type of terminus this chain reaches\n`);

const scoreCache = new Map<string, number>();
const distanceCache = new Map<string, number>();
const leadsToCache = new Map<string, 'cycle' | 'correct' | 'incorrect' | 'pass'>();

function calculateScoreMemoized(userId: string, visitedInChain: Set<string> = new Set(), depth = 0): { 
  score: number, 
  distance: number | null,
  leadsTo: 'cycle' | 'correct' | 'incorrect' | 'pass'
} {
  const indent = '  '.repeat(depth);
  
  // Check cache
  if (scoreCache.has(userId)) {
    console.log(`${indent}[CACHE HIT] ${userId}: score=${scoreCache.get(userId)}, leadsTo=${leadsToCache.get(userId)}`);
    return { 
      score: scoreCache.get(userId)!,
      distance: distanceCache.get(userId) ?? null,
      leadsTo: leadsToCache.get(userId)!
    };
  }

  const node = nodes.get(userId);
  if (!node) return { score: 0, distance: null, leadsTo: 'pass' };

  console.log(`${indent}📊 Calculating ${userId}...`);

  // Detect cycles during recursion (safety check)
  if (visitedInChain.has(userId)) {
    node.inCycle = true;
    const score = -1 - gamma;
    scoreCache.set(userId, score);
    leadsToCache.set(userId, 'cycle');
    console.log(`${indent}   ⚠️  Cycle detected in recursion! Score = ${score}`);
    return { score, distance: null, leadsTo: 'cycle' };
  }

  visitedInChain.add(userId);
  let score = 0;
  let distance: number | null = null;
  let leadsTo: 'cycle' | 'correct' | 'incorrect' | 'pass' = 'pass';

  if (node.inCycle) {
    // CASE 1: Member of cycle
    score = -1 - gamma;
    leadsTo = 'cycle';
    console.log(`${indent}   🔄 In cycle → score = -1 - γ = -1 - ${gamma} = ${score}`);
  } else if (node.action === 'SOLVE') {
    // CASE 2: Direct solver
    if (node.isCorrect) {
      score = 1;
      distance = 0;
      leadsTo = 'correct';
      const delegators = delegatorCount.get(userId) || 0;
      const trustBonus = beta * delegators;
      score += trustBonus;
      console.log(`${indent}   ✅ CORRECT solve!`);
      console.log(`${indent}      Base score: 1`);
      console.log(`${indent}      Delegators: ${delegators}`);
      console.log(`${indent}      Trust bonus: β × ${delegators} = ${beta} × ${delegators} = ${trustBonus}`);
      console.log(`${indent}      Total: ${score}`);
    } else {
      score = -1;
      distance = 0;
      leadsTo = 'incorrect';
      console.log(`${indent}   ❌ INCORRECT solve → score = -1`);
    }
  } else if (node.action === 'PASS') {
    // CASE 3: Pass
    score = 0;
    leadsTo = 'pass';
    console.log(`${indent}   ⏭️  PASS → score = 0`);
  } else if (node.action === 'DELEGATE' && node.delegateTo) {
    // CASE 4: Delegation
    const target = nodes.get(node.delegateTo);
    console.log(`${indent}   ➡️  Delegates to ${node.delegateTo}`);
    
    if (!target) {
      score = -1 - gamma;
      leadsTo = 'cycle';
      console.log(`${indent}      ⚠️  Target not found → score = ${score}`);
    } else {
      // Recursive call
      console.log(`${indent}      Recursing into ${node.delegateTo}...`);
      const targetResult = calculateScoreMemoized(node.delegateTo, new Set(visitedInChain), depth + 1);
      distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
      leadsTo = targetResult.leadsTo;
      
      console.log(`${indent}      ↩️  Back from ${node.delegateTo}: leadsTo=${targetResult.leadsTo}, distance=${distance}`);
      
      if (target.inCycle || targetResult.leadsTo === 'cycle') {
        // CASE 4a: Upstream of cycle
        score = -1 - gamma / (distance + 1);
        leadsTo = 'cycle';
        console.log(`${indent}      🔄 Upstream of CYCLE at distance ${distance}`);
        console.log(`${indent}         Formula: -1 - γ/(k+1) = -1 - ${gamma}/(${distance}+1) = ${score.toFixed(4)}`);
      } else if (targetResult.leadsTo === 'correct') {
        // CASE 4b: Upstream of correct
        score = 1 + lambda * (2 * distance / (distance + 1));
        leadsTo = 'correct';
        console.log(`${indent}      ✅ Upstream of CORRECT at distance ${distance}`);
        console.log(`${indent}         Formula: 1 + λ×(2k/(k+1)) = 1 + ${lambda}×(2×${distance}/(${distance}+1))`);
        console.log(`${indent}                = 1 + ${lambda}×${(2 * distance / (distance + 1)).toFixed(4)} = ${score.toFixed(4)}`);
      } else if (targetResult.leadsTo === 'incorrect') {
        // CASE 4c: Upstream of incorrect
        score = -1;
        leadsTo = 'incorrect';
        console.log(`${indent}      ❌ Upstream of INCORRECT → flat penalty = -1`);
      } else {
        // CASE 4d: Upstream of pass
        score = -1;
        leadsTo = 'pass';
        console.log(`${indent}      ⏭️  Upstream of PASS → flat penalty = -1`);
      }
    }
  }

  // Cache results
  scoreCache.set(userId, score);
  leadsToCache.set(userId, leadsTo);
  if (distance !== null) {
    distanceCache.set(userId, distance);
  }

  node.score = score;
  node.distanceFromSolver = distance;

  console.log(`${indent}   ✓ FINAL: ${userId} → score=${score.toFixed(4)}, distance=${distance}, leadsTo=${leadsTo}\n`);

  return { score, distance, leadsTo };
}

// Calculate all scores
for (const [userId] of nodes) {
  if (!scoreCache.has(userId)) {
    calculateScoreMemoized(userId);
  }
}

console.log(`${'='.repeat(80)}`);
console.log(`STEP 4: VERIFICATION - COMPARE WITH EXPECTED`);
console.log(`${'='.repeat(80)}\n`);

const expectedScores = {
  // Cycle component
  'player01': -1 - gamma / 3,           // -1.133 (upstream of cycle, distance 2)
  'player02': -1 - gamma / 2,           // -1.2 (upstream of cycle, distance 1)
  'player03': -1 - gamma,               // -1.4 (in cycle)
  'player04': -1 - gamma,               // -1.4 (in cycle)
  'player05': -1 - gamma / 2,           // -1.2 (upstream of cycle, distance 1)
  
  // Correct component
  'player06': 1 + lambda * (2 * 4 / 5), // 1.96 (distance 4)
  'player07': 1 + lambda * (2 * 3 / 4), // 1.9 (distance 3)
  'player08': 1 + lambda * (2 * 2 / 3), // 1.8 (distance 2)
  'player09': 1 + lambda * (2 * 1 / 2), // 1.6 (distance 1)
  'player10': 1 + beta * 1,             // 1.2 (solver + 1 DIRECT delegator)
  
  // Incorrect component
  'player11': -1,                       // -1 (upstream of incorrect)
  'player12': -1,                       // -1 (upstream of incorrect)
  'player13': -1,                       // -1 (incorrect solver)
  
  // Pass component
  'player14': -1,                       // -1 (upstream of pass)
  'player15': 0,                        // 0 (pass)
};

let allCorrect = true;
const results = [];

for (const [userId, node] of nodes) {
  const expected = expectedScores[userId as keyof typeof expectedScores];
  const match = Math.abs(node.score - expected) < 0.0001;
  const icon = match ? '✅' : '❌';
  
  results.push({
    userId,
    score: node.score,
    expected,
    distance: node.distanceFromSolver,
    leadsTo: leadsToCache.get(userId),
    inCycle: node.inCycle,
    match
  });
  
  if (!match) allCorrect = false;
}

// Group results by component
console.log(`COMPONENT 1 - CYCLE:`);
for (const r of results.slice(0, 5)) {
  const icon = r.match ? '✅' : '❌';
  console.log(`  ${icon} ${r.userId.padEnd(10)} → score: ${r.score.toFixed(4)} (expected: ${r.expected.toFixed(4)}) | distance: ${r.distance} | leadsTo: ${r.leadsTo}`);
}

console.log(`\nCOMPONENT 2 - CORRECT:`);
for (const r of results.slice(5, 10)) {
  const icon = r.match ? '✅' : '❌';
  console.log(`  ${icon} ${r.userId.padEnd(10)} → score: ${r.score.toFixed(4)} (expected: ${r.expected.toFixed(4)}) | distance: ${r.distance} | leadsTo: ${r.leadsTo}`);
}

console.log(`\nCOMPONENT 3 - INCORRECT:`);
for (const r of results.slice(10, 13)) {
  const icon = r.match ? '✅' : '❌';
  console.log(`  ${icon} ${r.userId.padEnd(10)} → score: ${r.score.toFixed(4)} (expected: ${r.expected.toFixed(4)}) | distance: ${r.distance} | leadsTo: ${r.leadsTo}`);
}

console.log(`\nCOMPONENT 4 - PASS:`);
for (const r of results.slice(13, 15)) {
  const icon = r.match ? '✅' : '❌';
  console.log(`  ${icon} ${r.userId.padEnd(10)} → score: ${r.score.toFixed(4)} (expected: ${r.expected.toFixed(4)}) | distance: ${r.distance} | leadsTo: ${r.leadsTo}`);
}

console.log(`\n${'='.repeat(80)}`);
if (allCorrect) {
  console.log(`✅ ALL 15 PLAYERS SCORED CORRECTLY!`);
} else {
  console.log(`❌ SOME SCORES DON'T MATCH!`);
}
console.log(`${'='.repeat(80)}\n`);

// Summary statistics
console.log(`${'='.repeat(80)}`);
console.log(`SUMMARY STATISTICS`);
console.log(`${'='.repeat(80)}\n`);

const totalScore = Array.from(nodes.values()).reduce((sum, node) => sum + node.score, 0);
const avgScore = totalScore / nodes.size;
const maxScore = Math.max(...Array.from(nodes.values()).map(n => n.score));
const minScore = Math.min(...Array.from(nodes.values()).map(n => n.score));

console.log(`Total players: ${nodes.size}`);
console.log(`Total score: ${totalScore.toFixed(4)}`);
console.log(`Average score: ${avgScore.toFixed(4)}`);
console.log(`Max score: ${maxScore.toFixed(4)} (${Array.from(nodes.values()).find(n => n.score === maxScore)?.userId})`);
console.log(`Min score: ${minScore.toFixed(4)} (${Array.from(nodes.values()).filter(n => n.score === minScore).map(n => n.userId).join(', ')})`);
console.log(`\nBy category:`);
console.log(`  Positive scores (correct chains): ${Array.from(nodes.values()).filter(n => n.score > 0).length} players`);
console.log(`  Zero scores (pass): ${Array.from(nodes.values()).filter(n => n.score === 0).length} players`);
console.log(`  Negative scores (incorrect/cycle): ${Array.from(nodes.values()).filter(n => n.score < 0).length} players`);
console.log();
