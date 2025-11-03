/**
 * Test edge case: What if A3 passes instead of delegating?
 * 
 * Scenario: A1 -> A2 -> A3 (A3 passes, doesn't delegate)
 * 
 * Expected scores (with λ=0.5):
 * - A3: 0 (pass, no delegation)
 * - A2: -1 - λ^1 = -1.5 (delegates to someone who passed)
 * - A1: -1 - λ^2 = -1.25 (delegates to someone who delegates to pass)
 * 
 * OR
 * 
 * Scenario 2: A1 -> A2 -> A3 -> A4
 * Where A3 passes (but with delegateTo set incorrectly?)
 */

type GraphNode2 = {
  userId: string;
  action: string;
  answer: string | null;
  delegateTo: string | null;
  isCorrect: boolean | null;
  score: number;
  distanceFromSolver: number | null;
  inCycle: boolean;
};

function testEdgeCase() {
  const lambda = 0.5;
  const beta = 0.1;
  const gamma = 0.2;

  console.log('\n=== Test Case 1: Simple chain with PASS terminus ===');
  console.log('Chain: A1 -> A2 -> A3 (A3 passes without delegating)\n');

  // Create test nodes
  const nodes1 = new Map<string, GraphNode2>();
  
  nodes1.set('A3', {
    userId: 'A3',
    action: 'PASS',
    answer: null,
    delegateTo: null,
    isCorrect: null,
    score: 0,
    distanceFromSolver: null,
    inCycle: false,
  });
  
  nodes1.set('A2', {
    userId: 'A2',
    action: 'DELEGATE',
    answer: null,
    delegateTo: 'A3',
    isCorrect: null,
    score: 0,
    distanceFromSolver: null,
    inCycle: false,
  });
  
  nodes1.set('A1', {
    userId: 'A1',
    action: 'DELEGATE',
    answer: null,
    delegateTo: 'A2',
    isCorrect: null,
    score: 0,
    distanceFromSolver: null,
    inCycle: false,
  });

  calculateScores(nodes1, lambda, beta, gamma);

  console.log('\n=== Test Case 2: Mixed chain - delegate through PASS to SOLVE ===');
  console.log('What if A2 PASSES but still has delegateTo set? (shouldn\'t happen but let\'s test)\n');

  const nodes2 = new Map<string, GraphNode2>();
  
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
  
  // A2 PASSES (action=PASS) but has delegateTo set (edge case)
  nodes2.set('A2', {
    userId: 'A2',
    action: 'PASS',
    answer: null,
    delegateTo: 'A3', // This shouldn't happen in normal flow
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

  calculateScores(nodes2, lambda, beta, gamma);
}

function calculateScores(nodes: Map<string, GraphNode2>, lambda: number, beta: number, gamma: number) {
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

    if (node.inCycle) {
      score = -1 - gamma;
      console.log(`  ${userId}: In cycle, score = ${score}`);
    } else if (node.action === 'SOLVE') {
      if (node.isCorrect) {
        score = 1;
        distance = 0;
      } else {
        score = -1;
        distance = 0;
      }
      console.log(`  ${userId}: ${node.isCorrect ? 'Correct' : 'Incorrect'} solve, score = ${score}`);
    } else if (node.action === 'PASS') {
      score = 0;
      distance = null;
      console.log(`  ${userId}: Passed, score = ${score}`);
    } else if (node.action === 'DELEGATE' && node.delegateTo) {
      const target = nodes.get(node.delegateTo);
      if (!target) {
        score = -1 - gamma;
      } else {
        const targetResult = calculateScoreMemoized(node.delegateTo, new Set(visitedInChain));
        distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
        
        if (target.inCycle) {
          // NEW: Upstream of cycle at distance k: score = -1 - γ/(k+1)
          score = -1 - gamma / (distance + 1);
          console.log(`  ${userId}: Delegates to cycle at distance ${distance}, score = ${score}`);
        } else if (target.action === 'SOLVE') {
          if (target.isCorrect) {
            // NEW FORMULA: Upstream of correct terminus at distance k: score = 1 + λ × (2k / (k+1))
            score = 1 + lambda * (2 * distance / (distance + 1));
          } else {
            // NEW: Upstream of incorrect terminus: flat penalty of -1
            score = -1;
          }
          console.log(`  ${userId}: Delegates to ${target.isCorrect ? 'correct' : 'incorrect'} solver at distance ${distance}, score = ${score}`);
        } else if (target.action === 'PASS') {
          // NEW: Upstream of pass terminus: flat penalty of -1
          score = -1;
          console.log(`  ${userId}: Delegates to pass at distance ${distance}, score = ${score}`);
        } else {
          if (targetResult.score >= 0) {
            // NEW FORMULA: Upstream of correct chain at distance k: score = 1 + λ × (2k / (k+1))
            score = 1 + lambda * (2 * distance / (distance + 1));
            console.log(`  ${userId}: Delegates to correct chain at distance ${distance}, score = ${score}`);
          } else {
            // NEW: Upstream of incorrect/pass chain: flat penalty of -1
            score = -1;
            console.log(`  ${userId}: Delegates to incorrect chain at distance ${distance}, score = ${score}`);
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

  for (const [userId] of nodes) {
    calculateScoreMemoized(userId);
  }

  console.log('Results:');
  for (const [userId, node] of nodes) {
    console.log(`  ${userId}: score=${node.score.toFixed(4)}, distance=${node.distanceFromSolver}`);
  }
}

testEdgeCase();
