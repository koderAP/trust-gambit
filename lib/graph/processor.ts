import Graph from 'graphology';

export interface DelegationNode {
  userId: string;
  action: 'SOLVE' | 'DELEGATE' | 'PASS';
  answer?: string;
  delegateTo?: string;
  isCorrect?: boolean;
}

export interface CycleInfo {
  nodes: string[];
  length: number;
}

export interface GraphMetrics {
  cycles: CycleInfo[];
  distances: Map<string, number>; // Distance from solvers
  inCycle: Set<string>;
}

export class TrustGraphProcessor {
  private graph: Graph<DelegationNode>;

  constructor() {
    this.graph = new Graph();
  }

  /**
   * Build delegation graph from submissions
   */
  buildGraph(submissions: DelegationNode[]): void {
    this.graph.clear();

    // Add all users as nodes
    submissions.forEach(sub => {
      if (!this.graph.hasNode(sub.userId)) {
        this.graph.addNode(sub.userId, sub);
      }
    });

    // Add delegation edges
    submissions.forEach(sub => {
      if (sub.action === 'DELEGATE' && sub.delegateTo) {
        if (!this.graph.hasNode(sub.delegateTo)) {
          // In case delegateTo user doesn't exist (shouldn't happen)
          this.graph.addNode(sub.delegateTo, { userId: sub.delegateTo, action: 'PASS' });
        }
        this.graph.addDirectedEdge(sub.userId, sub.delegateTo);
      }
    });
  }

  /**
   * Detect cycles using Tarjan's algorithm
   */
  detectCycles(): CycleInfo[] {
    const cycles: CycleInfo[] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): void => {
      if (stack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart);
        cycles.push({
          nodes: cycle,
          length: cycle.length
        });
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      stack.add(node);
      path.push(node);

      const neighbors = this.graph.outNeighbors(node);
      neighbors.forEach(neighbor => dfs(neighbor));

      stack.delete(node);
      path.pop();
    };

    this.graph.forEachNode(node => {
      if (!visited.has(node)) {
        dfs(node);
      }
    });

    return cycles;
  }

  /**
   * Calculate distance from solvers using BFS
   */
  calculateDistances(): Map<string, number> {
    const distances = new Map<string, number>();
    const solvers: string[] = [];

    // Find all solvers
    this.graph.forEachNode(node => {
      const data = this.graph.getNodeAttributes(node) as DelegationNode;
      if (data.action === 'SOLVE') {
        solvers.push(node);
        distances.set(node, 0);
      }
    });

    // BFS from each solver
    const queue: Array<{ node: string; dist: number }> = solvers.map(s => ({
      node: s,
      dist: 0
    }));

    const visited = new Set<string>();

    while (queue.length > 0) {
      const { node, dist } = queue.shift()!;
      
      if (visited.has(node)) continue;
      visited.add(node);

      // Update distance if not set or if we found a shorter path
      if (!distances.has(node) || distances.get(node)! > dist) {
        distances.set(node, dist);
      }

      // Add predecessors (users who delegated to this node)
      const predecessors = this.graph.inNeighbors(node);
      predecessors.forEach(pred => {
        if (!visited.has(pred)) {
          queue.push({ node: pred, dist: dist + 1 });
        }
      });
    }

    return distances;
  }

  /**
   * Get all metrics for scoring
   */
  getMetrics(): GraphMetrics {
    const cycles = this.detectCycles();
    const distances = this.calculateDistances();
    const inCycle = new Set<string>();

    cycles.forEach(cycle => {
      cycle.nodes.forEach(node => inCycle.add(node));
    });

    return {
      cycles,
      distances,
      inCycle
    };
  }

  /**
   * Check if a user is in a cycle
   */
  isInCycle(userId: string, cycles: CycleInfo[]): boolean {
    return cycles.some(cycle => cycle.nodes.includes(userId));
  }

  /**
   * Get delegation chain for a user
   */
  getDelegationChain(userId: string): string[] {
    const chain: string[] = [userId];
    const visited = new Set<string>([userId]);
    let current = userId;

    while (true) {
      const neighbors = this.graph.outNeighbors(current);
      if (neighbors.length === 0) break;

      const next = neighbors[0]; // Should only have one outgoing edge
      if (visited.has(next)) break; // Cycle detected

      chain.push(next);
      visited.add(next);
      current = next;
    }

    return chain;
  }

  /**
   * Calculate trust score for a user based on delegation history
   */
  calculateTrustBonus(
    userId: string,
    correctDelegations: number,
    totalDelegations: number
  ): number {
    if (totalDelegations === 0) return 0;
    
    const accuracy = correctDelegations / totalDelegations;
    return accuracy * 0.1; // 10% bonus for perfect trust history
  }

  /**
   * Export graph for visualization
   */
  exportForVisualization(): {
    nodes: Array<{ id: string; data: DelegationNode }>;
    edges: Array<{ source: string; target: string }>;
  } {
    const nodes: Array<{ id: string; data: DelegationNode }> = [];
    const edges: Array<{ source: string; target: string }> = [];

    this.graph.forEachNode((node, attributes) => {
      nodes.push({
        id: node,
        data: attributes as DelegationNode
      });
    });

    this.graph.forEachEdge((edge, attributes, source, target) => {
      edges.push({ source, target });
    });

    return { nodes, edges };
  }
}
