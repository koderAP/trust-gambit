import { prisma } from '../lib/prisma';

type SubmissionNode = {
  userId: string;
  action: string;
  answer: string | null;
  delegateTo: string | null;
  isCorrect: boolean | null;
};

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

export async function calculateDelegationGraph(roundId: string) {
  console.log(`\nCalculating delegation graph for round ${roundId}...`);
  
  // Get round data
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: {
      submissions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      game: true,
    },
  });

  if (!round) {
    throw new Error('Round not found');
  }

  // Get all users in the lobby
  let lobbyUsers: Array<{ id: string; name: string }> = [];
  if (round.lobbyId) {
    const lobby = await prisma.lobby.findUnique({
      where: { id: round.lobbyId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    lobbyUsers = lobby?.users || [];
  }
  
  const submittedUserIds = new Set(round.submissions.map(sub => sub.userId));
  
  // Create implicit PASS submissions for users who didn't submit
  const implicitPassUsers = lobbyUsers.filter(user => !submittedUserIds.has(user.id));
  
  console.log(`Total lobby users: ${lobbyUsers.length}`);
  console.log(`Explicit submissions: ${round.submissions.length}`);
  console.log(`Implicit PASS (no submission): ${implicitPassUsers.length}`);

  // ✅ FIX: Create actual database Submission records for users who didn't submit
  if (implicitPassUsers.length > 0) {
    console.log(`Creating PASS submissions for ${implicitPassUsers.length} users who didn't submit...`);
    
    const passSubmissions = await prisma.submission.createMany({
      data: implicitPassUsers.map(user => ({
        userId: user.id,
        roundId: round.id,
        action: 'PASS',
        answer: null,
        delegateTo: null,
        submittedAt: new Date(),
      })),
      skipDuplicates: true, // In case some were created in a race condition
    });
    
    console.log(`✅ Created ${passSubmissions.count} PASS submissions`);
    
    // Reload round.submissions to include the newly created PASS submissions
    const updatedRound = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        submissions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        game: true,
      },
    });
    
    if (updatedRound) {
      round.submissions = updatedRound.submissions;
    }
  }

  // Get scoring parameters
  const lambda = round.game.lambda || 0.5;
  const beta = round.game.beta || 0.1;
  const gamma = round.game.gamma || 0.2;

  console.log(`Scoring parameters: λ=${lambda}, β=${beta}, γ=${gamma}`);

  // Build nodes map from all submissions (now includes auto-created PASS submissions)
  const nodes = new Map<string, GraphNode>();
  
  // Add all submissions (explicit + auto-created PASS)
  for (const sub of round.submissions) {
    const isCorrect = sub.action === 'SOLVE' && sub.answer
      ? sub.answer.trim().toLowerCase() === round.correctAnswer.trim().toLowerCase()
      : null;
    
    nodes.set(sub.userId, {
      userId: sub.userId,
      action: sub.action,
      answer: sub.answer,
      delegateTo: sub.delegateTo,
      isCorrect,
      score: 0,
      distanceFromSolver: null,
      inCycle: false,
    });
  }

  // Detect cycles and calculate distances
  const visited = new Set<string>();
  const inStack = new Set<string>();
  
  function detectCycle(userId: string, path: string[] = []): boolean {
    if (inStack.has(userId)) {
      // Found a cycle - mark all nodes in the cycle
      const cycleStart = path.indexOf(userId);
      for (let i = cycleStart; i < path.length; i++) {
        const node = nodes.get(path[i]);
        if (node) node.inCycle = true;
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

  // ✅ OPTIMIZED: Build delegator count map once (O(n) instead of O(n²))
  const delegatorCount = new Map<string, number>();
  for (const [userId, node] of nodes) {
    if (node.delegateTo) {
      delegatorCount.set(node.delegateTo, (delegatorCount.get(node.delegateTo) || 0) + 1);
    }
  }

  // ✅ OPTIMIZED: Memoization for score calculation
  const scoreCache = new Map<string, number>();
  const distanceCache = new Map<string, number>();
  const leadsToCache = new Map<string, 'cycle' | 'correct' | 'incorrect' | 'pass'>();

  function calculateScoreMemoized(userId: string, visitedInChain: Set<string> = new Set()): { 
    score: number, 
    distance: number | null,
    leadsTo: 'cycle' | 'correct' | 'incorrect' | 'pass'
  } {
    // Check cache
    if (scoreCache.has(userId)) {
      return { 
        score: scoreCache.get(userId)!,
        distance: distanceCache.get(userId) ?? null,
        leadsTo: leadsToCache.get(userId)!
      };
    }

    const node = nodes.get(userId);
    if (!node) return { score: 0, distance: null, leadsTo: 'pass' };

    // Detect cycles in this calculation path
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
      // Nodes in cycles get -1 - γ
      score = -1 - gamma;
      leadsTo = 'cycle';
      console.log(`  ${userId}: In cycle, score = ${score}`);
    } else if (node.action === 'SOLVE') {
      if (node.isCorrect) {
        // Correct answer: +1
        score = 1;
        distance = 0;
        leadsTo = 'correct';
        
        // ✅ OPTIMIZED: Use pre-calculated delegator count (O(1) instead of O(n))
        const delegators = delegatorCount.get(userId) || 0;
        const trustBonus = beta * delegators;
        score += trustBonus;
        
        console.log(`  ${userId}: Correct solve, base=1, delegators=${delegators}, trust bonus=${trustBonus}, total=${score}`);
      } else {
        // Incorrect answer: -1
        score = -1;
        distance = 0;
        leadsTo = 'incorrect';
        console.log(`  ${userId}: Incorrect solve, score = ${score}`);
      }
    } else if (node.action === 'PASS') {
      // Pass without delegating: 0
      score = 0;
      leadsTo = 'pass';
      console.log(`  ${userId}: Passed, score = ${score}`);
    } else if (node.action === 'DELEGATE' && node.delegateTo) {
      // ✅ OPTIMIZED: Use recursion with memoization
      const target = nodes.get(node.delegateTo);
      if (!target) {
        score = -1 - gamma;
        leadsTo = 'cycle';
      } else {
        // Recursive call with memoization
        const targetResult = calculateScoreMemoized(node.delegateTo, new Set(visitedInChain));
        distance = (targetResult.distance !== null) ? targetResult.distance + 1 : 1;
        
        // NEW: Propagate leadsTo from target
        leadsTo = targetResult.leadsTo;
        
        if (target.inCycle || targetResult.leadsTo === 'cycle') {
          // Upstream of cycle at distance k: score = -1 - γ/(k+1)
          score = -1 - gamma / (distance + 1);
          leadsTo = 'cycle';
          console.log(`  ${userId}: Delegates to cycle at distance ${distance}, score = ${score}`);
        } else if (target.action === 'SOLVE') {
          if (target.isCorrect) {
            // NEW FORMULA: Upstream of correct terminus at distance k: score = 1 + λ × (2k / (k+1))
            score = 1 + lambda * (2 * distance / (distance + 1));
            leadsTo = 'correct';
          } else {
            // Upstream of incorrect terminus: flat penalty of -1
            score = -1;
            leadsTo = 'incorrect';
          }
          console.log(`  ${userId}: Delegates to ${target.isCorrect ? 'correct' : 'incorrect'} solver at distance ${distance}, score = ${score}`);
        } else if (target.action === 'PASS') {
          // Upstream of pass terminus: flat penalty of -1
          score = -1;
          leadsTo = 'pass';
          console.log(`  ${userId}: Delegates to pass at distance ${distance}, score = ${score}`);
        } else {
          // Delegation chain - check what the target leads to
          if (targetResult.leadsTo === 'correct') {
            // NEW FORMULA: Upstream of correct chain at distance k: score = 1 + λ × (2k / (k+1))
            score = 1 + lambda * (2 * distance / (distance + 1));
            leadsTo = 'correct';
            console.log(`  ${userId}: Delegates to correct chain at distance ${distance}, score = ${score}`);
          } else if (targetResult.leadsTo === 'incorrect') {
            // Upstream of incorrect chain: flat penalty of -1
            score = -1;
            leadsTo = 'incorrect';
            console.log(`  ${userId}: Delegates to incorrect chain at distance ${distance}, score = ${score}`);
          } else if (targetResult.leadsTo === 'pass') {
            // Upstream of pass chain: flat penalty of -1
            score = -1;
            leadsTo = 'pass';
            console.log(`  ${userId}: Delegates to pass chain at distance ${distance}, score = ${score}`);
          } else {
            // targetResult.leadsTo === 'cycle' - already handled above
            score = -1 - gamma / (distance + 1);
            leadsTo = 'cycle';
            console.log(`  ${userId}: Delegates to cycle chain at distance ${distance}, score = ${score}`);
          }
        }
      }
    }

    // Cache the results
    scoreCache.set(userId, score);
    leadsToCache.set(userId, leadsTo);
    if (distance !== null) {
      distanceCache.set(userId, distance);
    }

    node.score = score;
    node.distanceFromSolver = distance;

    return { score, distance, leadsTo };
  }

  // Calculate scores with memoization
  for (const [userId] of nodes) {
    calculateScoreMemoized(userId);
  }

  // Save scores to database
  for (const [userId, node] of nodes) {
    await prisma.roundScore.upsert({
      where: {
        roundId_userId: {
          roundId,
          userId,
        },
      },
      create: {
        roundId,
        userId,
        solveScore: node.action === 'SOLVE' ? (node.isCorrect ? 1 : -1) : 0,
        delegateScore: node.action === 'DELEGATE' ? node.score : 0,
        trustScore: 0, // Will be calculated separately for trust bonus
        totalScore: node.score,
        inCycle: node.inCycle,
        distanceFromSolver: node.distanceFromSolver,
      },
      update: {
        solveScore: node.action === 'SOLVE' ? (node.isCorrect ? 1 : -1) : 0,
        delegateScore: node.action === 'DELEGATE' ? node.score : 0,
        totalScore: node.score,
        inCycle: node.inCycle,
        distanceFromSolver: node.distanceFromSolver,
      },
    });
  }

  // Create delegation graph JSON
  const graphData = {
    nodes: Array.from(nodes.entries()).map(([userId, node]) => ({
      userId,
      action: node.action,
      score: node.score,
      inCycle: node.inCycle,
      distanceFromSolver: node.distanceFromSolver,
    })),
    edges: Array.from(nodes.values())
      .filter(n => n.delegateTo)
      .map(n => ({
        from: n.userId,
        to: n.delegateTo!,
      })),
  };

  console.log(`\nDelegation graph calculated with ${graphData.nodes.length} nodes and ${graphData.edges.length} edges`);
  
  return graphData;
}
