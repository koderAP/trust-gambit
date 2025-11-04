# Trust Gambit - Trust Network Simulation

## Overview

Simulates trust dynamics across all rounds of Trust Gambit using exported game data. Analyzes delegation chains, trust networks, cycle detection, and score propagation based on the game's λ, β, γ parameters.

## Features

✅ **Round-by-Round Simulation**
- Simulates each round independently
- Shows delegation patterns, solvers, and cycles
- Calculates scores using the Trust Gambit formula

✅ **Trust Network Analysis**
- Identifies most trusted users (received delegations)
- Identifies most trusting users (gave delegations)
- Shows strongest trust pairs

✅ **Scoring System**
- **Solve Score**: λ^d (where d = distance from solver)
- **Delegate Score**: β × |delegators|
- **Trust Score**: −γ (if in delegation cycle)
- **Total Score**: Sum of all components

✅ **Cycle Detection**
- Detects delegation cycles using DFS
- Shows users involved in cycles
- Applies cycle penalty (−γ)

✅ **Final Leaderboard**
- Cumulative scores across all rounds
- Average score per round
- Total rounds played

✅ **Visualization Export**
- Exports network graph (nodes + edges)
- Compatible with D3.js, Gephi, Cytoscape
- JSON format for easy integration

## Installation

No external dependencies required! Uses only Python standard library:
- `json`, `sys`, `argparse`
- `collections`, `typing`, `math`

Works with Python 3.6+

## Usage

### Basic Simulation

```bash
# Simulate all rounds
python scripts/trust-simulation.py ~/Downloads/trust-gambit-stage-1-formatted.json

# Filter by stage
python scripts/trust-simulation.py ~/Downloads/trust-gambit-stage-2-formatted.json --stage 2

# Export visualization data
python scripts/trust-simulation.py ~/Downloads/trust-gambit-final.json --visualize

# Custom output file
python scripts/trust-simulation.py game-data.json --visualize --output network-viz.json
```

### Example Output

```
================================================================================
🎮 TRUST GAMBIT SIMULATION
================================================================================
Game: Trust Gambit Competition
Status: STAGE_1_COMPLETE
Current Stage: 1
Parameters: λ=0.5, β=0.1, γ=0.2
================================================================================

────────────────────────────────────────────────────────────────────────────────
🎯 Round 1 (Stage 1) - Algorithms
────────────────────────────────────────────────────────────────────────────────
📝 Total Submissions: 45
   SOLVE: 30, DELEGATE: 12, PASS: 3
✅ Correct Solvers: 18
🔄 Delegation Cycles Detected: 2
   Cycle 1: Alice → Bob → Charlie → Alice
   Cycle 2: David → Eve → David

🏆 Top 5 Scorers:
   1. Alice Chen: 1.50 (solve: 1.00, delegate: 0.60, trust: -0.10)
   2. Bob Smith: 1.25 (solve: 0.50, delegate: 0.80, trust: -0.05)
   3. Charlie Wu: 1.10 (solve: 1.00, delegate: 0.10, trust: 0.00)
   ...

================================================================================
🕸️  TRUST NETWORK ANALYSIS
================================================================================

🎯 Most Trusted Users (received most delegations):
   1. Alice Chen: 45 delegations received
   2. Bob Smith: 38 delegations received
   3. Charlie Wu: 32 delegations received
   ...

🤝 Most Trusting Users (gave most delegations):
   1. David Lee: 15 delegations given
   2. Eve Johnson: 12 delegations given
   ...

💫 Strongest Trust Pairs:
   1. David → Alice: 8 times
   2. Eve → Bob: 7 times
   ...

================================================================================
🏆 FINAL LEADERBOARD
================================================================================

Rank   Name                           Total Score     Rounds     Avg/Round
────── ────────────────────────────── ─────────────── ────────── ──────────
1      Alice Chen                     28.50           20         1.43
2      Bob Smith                      26.80           20         1.34
3      Charlie Wu                     24.20           20         1.21
...
```

## Output Files

### Visualization Data (`--visualize`)

Creates a JSON file with network graph data:

```json
{
  "nodes": [
    {
      "id": "user123",
      "name": "Alice Chen",
      "email": "alice@example.com",
      "totalScore": 28.5,
      "roundsPlayed": 20
    }
  ],
  "edges": [
    {
      "source": "user123",
      "target": "user456",
      "weight": 8
    }
  ],
  "gameInfo": {
    "name": "Trust Gambit Competition",
    "status": "ENDED",
    "lambda": 0.5,
    "beta": 0.1,
    "gamma": 0.2
  }
}
```

This can be visualized using:
- **D3.js**: Force-directed graph
- **Gephi**: Network analysis software
- **Cytoscape**: Biological network visualization
- **NetworkX**: Python library for graph analysis

## Understanding the Simulation

### Trust Gambit Scoring Formula

For each round, each user's score is calculated as:

```
Score(u) = λ^d × I(solved) + β × |delegators| − γ × I(in_cycle)
```

Where:
- **λ^d**: Chain propagation score
  - `λ` (lambda): Propagation decay factor (default: 0.5)
  - `d`: Distance from the solver in delegation chain
  - Direct solver: d=0, so λ^0 = 1.0
  - One hop away: d=1, so λ^1 = 0.5
  - Two hops away: d=2, so λ^2 = 0.25

- **β × |delegators|**: Trust bonus
  - `β` (beta): Trust bonus per delegator (default: 0.1)
  - `|delegators|`: Number of users who delegated to you
  - Rewards being trusted by others

- **−γ × I(in_cycle)**: Cycle penalty
  - `γ` (gamma): Cycle penalty (default: 0.2)
  - `I(in_cycle)`: 1 if user is in delegation cycle, 0 otherwise
  - Penalizes circular delegation (gaming the system)

### Example Calculation

**Scenario**: Round with 10 players

1. **Alice** solves correctly → `solveScore = 1.0`
2. **Bob** delegates to Alice (1 hop) → `solveScore = 0.5`
3. **Charlie** delegates to Bob (2 hops) → `solveScore = 0.25`
4. **Alice** receives 5 delegations → `delegateScore = 0.1 × 5 = 0.5`
5. **Bob** is in a cycle → `trustScore = -0.2`

**Alice's Total**: 1.0 + 0.5 + 0.0 = **1.5**
**Bob's Total**: 0.5 + 0.3 - 0.2 = **0.6**
**Charlie's Total**: 0.25 + 0.0 + 0.0 = **0.25**

## Use Cases

### 1. Post-Game Analysis
```bash
# Analyze completed game
python scripts/trust-simulation.py final-game-data.json
```

### 2. Stage Comparison
```bash
# Stage 1 only
python scripts/trust-simulation.py game-data.json --stage 1 > stage1-analysis.txt

# Stage 2 only
python scripts/trust-simulation.py game-data.json --stage 2 > stage2-analysis.txt
```

### 3. Network Visualization
```bash
# Export for D3.js visualization
python scripts/trust-simulation.py game-data.json --visualize --output public/network-data.json
```

### 4. Parameter Tuning
Modify `lambda`, `beta`, `gamma` in the game to see how they affect:
- Trust network density
- Cycle formation
- Score distribution
- Strategic behavior

## Advanced Analysis

### Combining with Other Tools

**Python NetworkX**:
```python
import json
import networkx as nx
import matplotlib.pyplot as plt

# Load visualization data
with open('trust-network.json') as f:
    data = json.load(f)

# Build graph
G = nx.DiGraph()
for node in data['nodes']:
    G.add_node(node['id'], name=node['name'], score=node['totalScore'])
for edge in data['edges']:
    G.add_edge(edge['source'], edge['target'], weight=edge['weight'])

# Analyze
print(f"Nodes: {G.number_of_nodes()}")
print(f"Edges: {G.number_of_edges()}")
print(f"Avg Clustering: {nx.average_clustering(G)}")

# Visualize
nx.draw(G, with_labels=True)
plt.show()
```

**Gephi Import**:
1. Run: `python scripts/trust-simulation.py data.json --visualize`
2. Open Gephi
3. File → Open → Select `trust-network.json`
4. Choose "Directed Graph"
5. Apply ForceAtlas2 layout

## Troubleshooting

### "File not found"
Make sure the JSON file path is correct:
```bash
ls -la ~/Downloads/trust-gambit-*.json
python scripts/trust-simulation.py ~/Downloads/trust-gambit-stage-1-formatted.json
```

### "Invalid JSON"
Ensure the file is properly formatted:
```bash
# Validate JSON
python -m json.tool ~/Downloads/trust-gambit-stage-1-formatted.json
```

### No submissions shown
Check that the game actually has submission data:
```bash
# Check submissions count
cat game-data.json | jq '.statistics.totalSubmissions'
```

## Future Enhancements

Potential additions:
- [ ] Interactive HTML visualization
- [ ] Compare multiple games side-by-side
- [ ] Statistical analysis (mean, median, std dev)
- [ ] Correlation analysis (domain ratings vs scores)
- [ ] PageRank-style trust metrics
- [ ] Community detection in trust network
- [ ] Time-series animation of trust formation

## Questions?

See also:
- `/docs/GAME-DATA-EXPORT.md` - How to export game data
- `/docs/game.md` - Game mechanics and rules
- `/lib/calculateDelegationGraph.ts` - Actual scoring implementation
