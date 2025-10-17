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

  // Get scoring parameters
  const lambda = round.game.lambda || 0.5;
  const beta = round.game.beta || 0.1;
  const gamma = round.game.gamma || 0.2;

  console.log(`Scoring parameters: λ=${lambda}, β=${beta}, γ=${gamma}`);

  // Build nodes map (including implicit PASS)
  const nodes = new Map<string, GraphNode>();
  
  // Add explicit submissions
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
  
  // Add implicit PASS for users who didn't submit
  for (const user of implicitPassUsers) {
    nodes.set(user.id, {
      userId: user.id,
      action: 'PASS',
      answer: null,
      delegateTo: null,
      isCorrect: null,
      score: 0,
      distanceFromSolver: null,
      inCycle: false,
    });
    console.log(`  ${user.name} (${user.id}): No submission, treating as PASS`);
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

  // Calculate scores
  for (const [userId, node] of nodes) {
    if (node.inCycle) {
      // Nodes in cycles get -1 - γ
      node.score = -1 - gamma;
      console.log(`  ${userId}: In cycle, score = ${node.score}`);
    } else if (node.action === 'SOLVE') {
      if (node.isCorrect) {
        // Correct answer: +1
        node.score = 1;
        node.distanceFromSolver = 0;
        
        // Add trust bonus (β per direct delegator)
        const delegators = Array.from(nodes.values()).filter(n => n.delegateTo === userId);
        const trustBonus = beta * delegators.length;
        node.score += trustBonus;
        
        console.log(`  ${userId}: Correct solve, base=1, delegators=${delegators.length}, trust bonus=${trustBonus}, total=${node.score}`);
      } else {
        // Incorrect answer: -1
        node.score = -1;
        node.distanceFromSolver = 0;
        console.log(`  ${userId}: Incorrect solve, score = ${node.score}`);
      }
    } else if (node.action === 'PASS') {
      // Pass without delegating: 0
      node.score = 0;
      console.log(`  ${userId}: Passed, score = ${node.score}`);
    } else if (node.action === 'DELEGATE' && node.delegateTo) {
      // Find the end of the delegation chain
      let current = node.delegateTo;
      let distance = 1;
      const chain = [userId, current];
      
      while (current && nodes.has(current)) {
        const target = nodes.get(current)!;
        
        if (target.inCycle) {
          // Delegating to someone in a cycle
          node.score = -1 - Math.pow(gamma, distance + 1);
          console.log(`  ${userId}: Delegates to cycle at distance ${distance}, score = ${node.score}`);
          break;
        }
        
        if (target.action === 'SOLVE') {
          // Reached a solver
          node.distanceFromSolver = distance;
          if (target.isCorrect) {
            // If terminus scored +1: score = 1 + λᵏ
            node.score = 1 + Math.pow(lambda, distance);
          } else {
            // If terminus scored -1: score = -1 - λᵏ
            node.score = -1 - Math.pow(lambda, distance);
          }
          console.log(`  ${userId}: Delegates to ${target.isCorrect ? 'correct' : 'incorrect'} solver at distance ${distance}, score = ${node.score}`);
          break;
        }
        
        if (target.action === 'PASS') {
          // Delegation chain ends in PASS (terminus scored 0): score = -1 - λᵏ
          node.score = -1 - Math.pow(lambda, distance);
          console.log(`  ${userId}: Delegates to pass at distance ${distance}, score = ${node.score}`);
          break;
        }
        
        if (target.action === 'DELEGATE' && target.delegateTo) {
          if (chain.includes(target.delegateTo)) {
            // Cycle detected in chain
            node.inCycle = true;
            node.score = -1 - gamma;
            console.log(`  ${userId}: Found cycle in delegation chain, score = ${node.score}`);
            break;
          }
          current = target.delegateTo;
          distance++;
          chain.push(current);
        } else {
          break;
        }
      }
    }
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
