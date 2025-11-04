#!/usr/bin/env python3
"""
Trust Gambit - Trust Network Simulation

Loads exported game JSON and simulates trust dynamics across all rounds:
- Delegation chains and paths
- Trust network graph construction
- Cycle detection
- Score propagation (λ, β, γ parameters)
- Network metrics and visualizations

Usage:
    python trust-simulation.py path/to/trust-gambit-export.json
    python trust-simulation.py path/to/trust-gambit-export.json --stage 1
    python trust-simulation.py path/to/trust-gambit-export.json --visualize
"""

import json
import sys
import argparse
from collections import defaultdict, deque
from typing import Dict, List, Set, Tuple, Optional
import math

class TrustSimulation:
    def __init__(self, game_data: dict):
        self.game_data = game_data
        self.game = game_data['game']
        self.users = {u['id']: u for u in game_data['users']}
        self.submissions = game_data['submissions']
        self.rounds = game_data['rounds']
        self.lobbies = {l['id']: l for l in game_data['lobbies']}
        
        # Game parameters
        self.lambda_ = self.game['lambda']  # Chain propagation
        self.beta = self.game['beta']       # Trust bonus
        self.gamma = self.game['gamma']     # Cycle penalty
        
        # Simulation results
        self.round_results = {}
        self.trust_edges = defaultdict(lambda: defaultdict(int))  # from_user -> to_user -> count
        self.user_scores = defaultdict(lambda: defaultdict(float))  # user_id -> round_num -> score
        
    def simulate_all_rounds(self, stage_filter: Optional[int] = None):
        """Simulate trust dynamics for all rounds (or filtered by stage)"""
        print(f"\n{'='*80}")
        print(f"🎮 TRUST GAMBIT SIMULATION")
        print(f"{'='*80}")
        print(f"Game: {self.game['name']}")
        print(f"Status: {self.game['status']}")
        print(f"Current Stage: {self.game['currentStage']}")
        print(f"Parameters: λ={self.lambda_}, β={self.beta}, γ={self.gamma}")
        print(f"{'='*80}\n")
        
        # Filter rounds by stage if requested
        rounds_to_simulate = self.rounds
        if stage_filter:
            rounds_to_simulate = [r for r in self.rounds if r['stage'] == stage_filter]
            print(f"📊 Filtering to Stage {stage_filter} rounds only")
        
        # Sort by round number
        rounds_to_simulate = sorted(rounds_to_simulate, key=lambda r: r['roundNumber'])
        
        for round_data in rounds_to_simulate:
            self.simulate_round(round_data)
        
        return self.round_results
    
    def simulate_round(self, round_data: dict):
        """Simulate a single round"""
        round_id = round_data['id']
        round_num = round_data['roundNumber']
        stage = round_data['stage']
        domain = round_data['domain']
        
        print(f"\n{'─'*80}")
        print(f"🎯 Round {round_num} (Stage {stage}) - {domain}")
        print(f"{'─'*80}")
        
        # Get submissions for this round
        round_submissions = [s for s in self.submissions if s['roundId'] == round_id]
        
        if not round_submissions:
            print(f"⚠️  No submissions found for round {round_num}")
            return
        
        print(f"📝 Total Submissions: {len(round_submissions)}")
        
        # Build delegation graph for this round
        delegation_graph = self.build_delegation_graph(round_submissions)
        
        # Analyze actions
        actions = defaultdict(int)
        for sub in round_submissions:
            actions[sub['action']] += 1
        
        print(f"   SOLVE: {actions['SOLVE']}, DELEGATE: {actions['DELEGATE']}, PASS: {actions['PASS']}")
        
        # Find solvers (users who answered correctly)
        solvers = [s['userId'] for s in round_submissions if s['action'] == 'SOLVE' and s['isCorrect']]
        print(f"✅ Correct Solvers: {len(solvers)}")
        
        # Find cycles
        cycles = self.detect_cycles(delegation_graph)
        if cycles:
            print(f"🔄 Delegation Cycles Detected: {len(cycles)}")
            for i, cycle in enumerate(cycles[:3], 1):  # Show first 3
                cycle_names = [self.users[uid]['name'] for uid in cycle]
                print(f"   Cycle {i}: {' → '.join(cycle_names)} → {cycle_names[0]}")
        
        # Calculate scores for this round
        round_scores = self.calculate_round_scores(round_submissions, delegation_graph, solvers, cycles)
        
        # Update trust edges
        for sub in round_submissions:
            if sub['action'] == 'DELEGATE' and sub['delegateToId']:
                self.trust_edges[sub['userId']][sub['delegateToId']] += 1
        
        # Store results
        self.round_results[round_num] = {
            'round_id': round_id,
            'stage': stage,
            'domain': domain,
            'submissions': len(round_submissions),
            'solvers': len(solvers),
            'delegations': actions['DELEGATE'],
            'passes': actions['PASS'],
            'cycles': len(cycles),
            'delegation_graph': delegation_graph,
            'scores': round_scores,
        }
        
        # Show top scorers
        sorted_scores = sorted(round_scores.items(), key=lambda x: x[1]['totalScore'], reverse=True)
        print(f"\n🏆 Top 5 Scorers:")
        for i, (user_id, score_data) in enumerate(sorted_scores[:5], 1):
            user = self.users[user_id]
            print(f"   {i}. {user['name']}: {score_data['totalScore']:.2f} "
                  f"(solve: {score_data['solveScore']:.2f}, "
                  f"delegate: {score_data['delegateScore']:.2f}, "
                  f"trust: {score_data['trustScore']:.2f})")
    
    def build_delegation_graph(self, submissions: List[dict]) -> Dict[str, str]:
        """Build delegation graph: user_id -> delegated_to_id"""
        graph = {}
        for sub in submissions:
            if sub['action'] == 'DELEGATE' and sub['delegateToId']:
                graph[sub['userId']] = sub['delegateToId']
        return graph
    
    def detect_cycles(self, delegation_graph: Dict[str, str]) -> List[List[str]]:
        """Detect all cycles in delegation graph using DFS"""
        cycles = []
        visited = set()
        rec_stack = set()
        
        def dfs(node, path):
            if node in rec_stack:
                # Found a cycle
                cycle_start = path.index(node)
                cycle = path[cycle_start:]
                cycles.append(cycle)
                return
            
            if node in visited:
                return
            
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            if node in delegation_graph:
                next_node = delegation_graph[node]
                dfs(next_node, path)
            
            path.pop()
            rec_stack.remove(node)
        
        for node in delegation_graph:
            if node not in visited:
                dfs(node, [])
        
        return cycles
    
    def find_path_to_solver(self, user_id: str, delegation_graph: Dict[str, str], 
                           solvers: List[str]) -> Tuple[Optional[str], int]:
        """
        Find if user's delegation chain leads to a solver.
        Returns (solver_id, distance) or (None, -1)
        """
        visited = set()
        current = user_id
        distance = 0
        
        while current in delegation_graph:
            next_user = delegation_graph[current]
            
            if next_user in visited:
                # Cycle detected
                return (None, -1)
            
            visited.add(current)
            current = next_user
            distance += 1
            
            if current in solvers:
                return (current, distance)
        
        # Check if current user is a solver
        if current in solvers:
            return (current, distance)
        
        return (None, -1)
    
    def calculate_round_scores(self, submissions: List[dict], 
                               delegation_graph: Dict[str, str],
                               solvers: List[str], 
                               cycles: List[List[str]]) -> Dict[str, dict]:
        """
        Calculate scores for all users in this round using Trust Gambit formula:
        
        Score(u) = λ^d * I(solved) + β * |delegators| - γ * I(in_cycle)
        
        where:
        - λ^d: Chain propagation (λ = lambda, d = distance from solver)
        - β * |delegators|: Trust bonus (β = beta, |delegators| = number who delegated to u)
        - γ: Cycle penalty (γ = gamma)
        """
        scores = {}
        cycle_users = set()
        
        # Identify all users in cycles
        for cycle in cycles:
            cycle_users.update(cycle)
        
        # Count delegators for each user
        delegators_count = defaultdict(int)
        for user_id, delegated_to in delegation_graph.items():
            delegators_count[delegated_to] += 1
        
        # Calculate scores for each user
        for sub in submissions:
            user_id = sub['userId']
            action = sub['action']
            
            solve_score = 0.0
            delegate_score = 0.0
            trust_score = 0.0
            in_cycle = user_id in cycle_users
            distance_from_solver = None
            
            # 1. Solve score (λ^d component)
            if action == 'SOLVE' and sub['isCorrect']:
                # Direct solver: d = 0, so λ^0 = 1
                solve_score = 1.0
                distance_from_solver = 0
            elif action == 'DELEGATE':
                # Check if delegation chain leads to solver
                solver_id, distance = self.find_path_to_solver(user_id, delegation_graph, solvers)
                if solver_id:
                    solve_score = math.pow(self.lambda_, distance)
                    distance_from_solver = distance
            
            # 2. Delegate score (β * |delegators| component)
            num_delegators = delegators_count.get(user_id, 0)
            delegate_score = self.beta * num_delegators
            
            # 3. Trust/Cycle penalty (−γ if in cycle)
            if in_cycle:
                trust_score = -self.gamma
            
            # Total score
            total_score = solve_score + delegate_score + trust_score
            
            scores[user_id] = {
                'solveScore': solve_score,
                'delegateScore': delegate_score,
                'trustScore': trust_score,
                'totalScore': total_score,
                'inCycle': in_cycle,
                'distanceFromSolver': distance_from_solver,
                'delegatorsCount': num_delegators,
                'action': action,
            }
            
            # Update cumulative user scores
            self.user_scores[user_id][sub['roundNumber']] = total_score
        
        return scores
    
    def analyze_trust_network(self):
        """Analyze overall trust network across all rounds"""
        print(f"\n{'='*80}")
        print(f"🕸️  TRUST NETWORK ANALYSIS")
        print(f"{'='*80}\n")
        
        # Find most trusted users (most delegations received)
        trust_received = defaultdict(int)
        trust_given = defaultdict(int)
        
        for from_user, to_users in self.trust_edges.items():
            for to_user, count in to_users.items():
                trust_received[to_user] += count
                trust_given[from_user] += count
        
        print("🎯 Most Trusted Users (received most delegations):")
        sorted_trusted = sorted(trust_received.items(), key=lambda x: x[1], reverse=True)
        for i, (user_id, count) in enumerate(sorted_trusted[:10], 1):
            user = self.users[user_id]
            print(f"   {i}. {user['name']}: {count} delegations received")
        
        print("\n🤝 Most Trusting Users (gave most delegations):")
        sorted_trusting = sorted(trust_given.items(), key=lambda x: x[1], reverse=True)
        for i, (user_id, count) in enumerate(sorted_trusting[:10], 1):
            user = self.users[user_id]
            print(f"   {i}. {user['name']}: {count} delegations given")
        
        # Analyze trust relationships
        print("\n💫 Strongest Trust Pairs:")
        all_pairs = []
        for from_user, to_users in self.trust_edges.items():
            for to_user, count in to_users.items():
                all_pairs.append((from_user, to_user, count))
        
        sorted_pairs = sorted(all_pairs, key=lambda x: x[2], reverse=True)
        for i, (from_id, to_id, count) in enumerate(sorted_pairs[:10], 1):
            from_user = self.users[from_id]['name']
            to_user = self.users[to_id]['name']
            print(f"   {i}. {from_user} → {to_user}: {count} times")
    
    def calculate_leaderboard(self):
        """Calculate overall leaderboard across all rounds"""
        print(f"\n{'='*80}")
        print(f"🏆 FINAL LEADERBOARD")
        print(f"{'='*80}\n")
        
        total_scores = defaultdict(float)
        round_counts = defaultdict(int)
        
        for user_id, rounds in self.user_scores.items():
            total_scores[user_id] = sum(rounds.values())
            round_counts[user_id] = len(rounds)
        
        sorted_leaderboard = sorted(total_scores.items(), key=lambda x: x[1], reverse=True)
        
        print(f"{'Rank':<6} {'Name':<30} {'Total Score':<15} {'Rounds':<10} {'Avg/Round'}")
        print(f"{'─'*6} {'─'*30} {'─'*15} {'─'*10} {'─'*10}")
        
        for i, (user_id, total_score) in enumerate(sorted_leaderboard[:20], 1):
            user = self.users[user_id]
            num_rounds = round_counts[user_id]
            avg_score = total_score / num_rounds if num_rounds > 0 else 0
            print(f"{i:<6} {user['name']:<30} {total_score:<15.2f} {num_rounds:<10} {avg_score:.2f}")
    
    def export_visualization_data(self, output_file: str = "trust-network.json"):
        """Export data for visualization tools"""
        # Build nodes and edges for network visualization
        nodes = []
        edges = []
        
        for user_id, user in self.users.items():
            total_score = sum(self.user_scores.get(user_id, {}).values())
            nodes.append({
                'id': user_id,
                'name': user['name'],
                'email': user['email'],
                'totalScore': total_score,
                'roundsPlayed': len(self.user_scores.get(user_id, {})),
            })
        
        for from_user, to_users in self.trust_edges.items():
            for to_user, count in to_users.items():
                edges.append({
                    'source': from_user,
                    'target': to_user,
                    'weight': count,
                })
        
        viz_data = {
            'nodes': nodes,
            'edges': edges,
            'gameInfo': {
                'name': self.game['name'],
                'status': self.game['status'],
                'lambda': self.lambda_,
                'beta': self.beta,
                'gamma': self.gamma,
            }
        }
        
        with open(output_file, 'w') as f:
            json.dump(viz_data, f, indent=2)
        
        print(f"\n📊 Visualization data exported to: {output_file}")
        print(f"   Nodes: {len(nodes)}, Edges: {len(edges)}")


def main():
    parser = argparse.ArgumentParser(description='Simulate Trust Gambit trust dynamics')
    parser.add_argument('json_file', help='Path to exported game JSON file')
    parser.add_argument('--stage', type=int, choices=[1, 2], help='Filter by stage (1 or 2)')
    parser.add_argument('--visualize', action='store_true', help='Export visualization data')
    parser.add_argument('--output', default='trust-network.json', help='Output file for visualization data')
    
    args = parser.parse_args()
    
    # Load game data
    print(f"📂 Loading game data from: {args.json_file}")
    try:
        with open(args.json_file, 'r') as f:
            game_data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File not found: {args.json_file}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON file: {e}")
        sys.exit(1)
    
    # Create simulation
    sim = TrustSimulation(game_data)
    
    # Run simulation
    sim.simulate_all_rounds(stage_filter=args.stage)
    
    # Analyze trust network
    sim.analyze_trust_network()
    
    # Calculate leaderboard
    sim.calculate_leaderboard()
    
    # Export visualization data if requested
    if args.visualize:
        sim.export_visualization_data(args.output)
    
    print(f"\n{'='*80}")
    print(f"✅ Simulation Complete!")
    print(f"{'='*80}\n")


if __name__ == '__main__':
    main()
