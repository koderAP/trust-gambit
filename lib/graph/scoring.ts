import { TrustGraphProcessor, DelegationNode, GraphMetrics } from './processor';

export interface ScoringParams {
  lambda: number;  // Weight for solving correctly (default: 0.5)
  beta: number;    // Weight for delegating to correct solver (default: 0.3)
  gamma: number;   // Weight for trust relationships (default: 0.2)
}

export interface UserScore {
  userId: string;
  solveScore: number;      // λ component
  delegateScore: number;   // β component
  trustScore: number;      // γ component
  totalScore: number;
  inCycle: boolean;
  distanceFromSolver?: number;
}

export class ScoringEngine {
  private params: ScoringParams;
  private processor: TrustGraphProcessor;

  constructor(params: ScoringParams = { lambda: 0.5, beta: 0.3, gamma: 0.2 }) {
    this.params = params;
    this.processor = new TrustGraphProcessor();
  }

  /**
   * Calculate scores for all users in a round
   */
  calculateRoundScores(
    submissions: DelegationNode[],
    correctAnswer: string
  ): UserScore[] {
    // Build graph
    this.processor.buildGraph(submissions);
    
    // Get metrics
    const metrics = this.processor.getMetrics();
    
    // Calculate scores for each user
    const scores: UserScore[] = [];

    for (const submission of submissions) {
      const score = this.calculateUserScore(
        submission,
        submissions,
        correctAnswer,
        metrics
      );
      scores.push(score);
    }

    return scores;
  }

  /**
   * Calculate score for a single user
   */
  private calculateUserScore(
    submission: DelegationNode,
    allSubmissions: DelegationNode[],
    correctAnswer: string,
    metrics: GraphMetrics
  ): UserScore {
    const { lambda, beta, gamma } = this.params;
    const userId = submission.userId;

    let solveScore = 0;
    let delegateScore = 0;
    let trustScore = 0;

    const inCycle = metrics.inCycle.has(userId);
    const distance = metrics.distances.get(userId);

    // If user is in a cycle, they get 0 score
    if (inCycle) {
      return {
        userId,
        solveScore: 0,
        delegateScore: 0,
        trustScore: 0,
        totalScore: 0,
        inCycle: true,
        distanceFromSolver: undefined
      };
    }

    // Calculate solve score (λ)
    if (submission.action === 'SOLVE') {
      if (submission.answer?.trim().toLowerCase() === correctAnswer.trim().toLowerCase()) {
        solveScore = lambda;
      } else {
        solveScore = 0; // Wrong answer gets 0
      }
    }

    // Calculate delegate score (β)
    if (submission.action === 'DELEGATE') {
      const delegateTarget = submission.delegateTo;
      if (delegateTarget) {
        // Check if delegation chain leads to correct answer
        const chain = this.processor.getDelegationChain(userId);
        const finalUser = chain[chain.length - 1];
        const finalSubmission = allSubmissions.find(s => s.userId === finalUser);

        if (finalSubmission?.action === 'SOLVE' && finalSubmission.isCorrect) {
          // Delegation successful - score decreases with distance
          const distanceFromSolver = distance || 0;
          delegateScore = beta * Math.pow(0.9, distanceFromSolver);
        }
      }
    }

    // Calculate trust score (γ)
    // Users who delegated correctly get trust bonus
    if (submission.action === 'DELEGATE' && delegateScore > 0) {
      trustScore = gamma;
    }

    // Users who were delegated TO and solved correctly get trust bonus
    if (submission.action === 'SOLVE' && submission.isCorrect) {
      const delegationsToThisUser = allSubmissions.filter(
        s => s.action === 'DELEGATE' && s.delegateTo === userId
      );
      if (delegationsToThisUser.length > 0) {
        trustScore += gamma * Math.min(delegationsToThisUser.length / 10, 1);
      }
    }

    const totalScore = solveScore + delegateScore + trustScore;

    return {
      userId,
      solveScore,
      delegateScore,
      trustScore,
      totalScore,
      inCycle,
      distanceFromSolver: distance
    };
  }

  /**
   * Calculate cumulative scores across multiple rounds
   */
  calculateCumulativeScores(
    roundScores: UserScore[][]
  ): Map<string, number> {
    const cumulativeScores = new Map<string, number>();

    for (const roundScore of roundScores) {
      for (const userScore of roundScore) {
        const current = cumulativeScores.get(userScore.userId) || 0;
        cumulativeScores.set(userScore.userId, current + userScore.totalScore);
      }
    }

    return cumulativeScores;
  }

  /**
   * Calculate trust bonus based on historical accuracy
   */
  calculateTrustBonus(
    userId: string,
    roundScores: UserScore[][]
  ): number {
    let correctDelegations = 0;
    let totalDelegations = 0;

    for (const roundScore of roundScores) {
      const userScore = roundScore.find(s => s.userId === userId);
      if (userScore) {
        if (userScore.delegateScore > 0) {
          correctDelegations++;
          totalDelegations++;
        } else if (userScore.solveScore === 0 && userScore.delegateScore === 0 && !userScore.inCycle) {
          // User delegated but it was wrong
          totalDelegations++;
        }
      }
    }

    return this.processor.calculateTrustBonus(
      userId,
      correctDelegations,
      totalDelegations
    );
  }

  /**
   * Get final leaderboard with trust bonuses
   */
  getFinalScores(
    roundScores: UserScore[][],
    users: Array<{ userId: string; name: string; domain: string }>
  ): Array<{
    userId: string;
    name: string;
    domain: string;
    baseScore: number;
    trustBonus: number;
    finalScore: number;
    rank: number;
  }> {
    const baseScores = this.calculateCumulativeScores(roundScores);
    
    const results = users.map(user => {
      const baseScore = baseScores.get(user.userId) || 0;
      const trustBonus = this.calculateTrustBonus(user.userId, roundScores);
      const finalScore = baseScore + trustBonus;

      return {
        userId: user.userId,
        name: user.name,
        domain: user.domain,
        baseScore,
        trustBonus,
        finalScore
      };
    });

    // Sort by final score descending
    results.sort((a, b) => b.finalScore - a.finalScore);

    // Add ranks
    return results.map((result, index) => ({
      ...result,
      rank: index + 1
    }));
  }
}
