# The Trust Gambit: Strategy, Reputation, and Risk

### TechGC Problem Statement by IGTS
### October 11, 2025

## Competition Theme

The Trust Gambit is a strategic game where brilliant problem-solving is only a part of the path to victory. Reputation and the strategy of trust are just as vital. Will you risk your score to bet on another's expertise, or will you gamble on your own skills?

## 1 Introduction

Traditional competitions reward those who can solve the most problems alone. But real-world success—in academia, organizations, or markets—also depends on networks of trust, skillful delegation, and predicting where true expertise lies. The Trust Gambit simulates this landscape across diverse domains, forcing choices that blend logic with strategic risk.

## 2 Setup

- Participants compete individually.
- Each participant submits a self-rating from 0 to 10 across 11 domains: **Algorithms, Astronomy, Biology, Crypto, Economics, Finance, Game Theory, Indian History, Machine Learning, Probability, Statistics**. Each domain features 2 questions.
- The game is played in 2 stages:
    - **Stage 1**: 120 participants are divided into 8 pools of 15 people each (random division). The top 2 people from each pool qualify for Stage 2. Each question is considered a "round".
    - **Stage 2**: 16 participants compete for 3 positions, facing questions in 4 domains: Algorithms, Probability, Economics, Machine Learning. Each question is considered a "round".

## 3 Game Rules

**R1. Choice of Action** (for each question Qt, i.e., each round): Each participant i chooses one of:

- **Solve**: Attempt the problem directly.
- **Delegate**: Point to another participant j most likely to know the answer (a directed trust edge i→j for this round).
- **Pass**: Abstain.

**R2. Per-round scoring by delegation graph outcome** (applies only to the current question Qt, i.e., the current round):

- **Terminating node** (end of a chain): a participant whose incoming chain ends at them because they either:
    - (a) **Solved correctly**: score +1
    - (b) **Solved incorrectly**: score -1
    - (c) **Passed**: score 0

- **Linear chain propagation**: For any node at graph-distance k ≥ 1 upstream from a terminating node:
    - **NEW FORMULA (2025)**: If terminus scored +1 (correct):
        ```
        score = 1 + λ × (2k / (k+1))
        ```
        This rewards delegation with diminishing returns as distance increases.
    
    - If terminus scored 0 or -1 (pass/incorrect):
        ```
        score = -1  (flat penalty, regardless of distance)
        ```

- **Cycles** (no terminating solver/pass inside the cycle):
    - Every node that lies in the cycle scores: **-1 - γ**
    - **NEW FORMULA (2025)**: Any node at distance k ≥ 1 upstream from the cycle scores:
        ```
        score = -1 - γ/(k+1)
        ```
        The penalty decreases with distance from the cycle.

- **Pass without delegating** and not on any chain: score 0.

**R3. Trust bonus** (direct in-degree): If k participants directly delegate to you in this round (i.e., you have in-degree k in the per-round delegation graph), and you yourself solved correctly (action=Solve, not via delegation), then you receive an additional trust bonus of **+β × k** for this round.

**R4. Visibility**: After each question (each round), the per-round delegation graph and per-round scores are revealed. Cumulative totals are tracked across all rounds (questions).

## 4 Worked Examples (Per-Round, i.e., Per-Question)

**Example 1: Direct Solve**
- Alice attempts and solves correctly ⇒ **+1** (no delegation edges).

**Example 2: Single delegation, correct terminus** (with λ = 0.6)
- Bob → Alice, and Alice solves correctly.
- Bob is at distance k = 1 from the terminus
- Score = 1 + λ × (2k / (k+1)) = 1 + 0.6 × (2×1 / 2) = 1 + 0.6 × 1 = **1.6**

**Example 3: Two-step chain, correct terminus** (with λ = 0.6)
- Carol → Dave → Eve, Eve answers correctly.
- Dave is at k = 1 ⇒ 1 + 0.6 × (2×1 / 2) = **1.6**
- Carol is at k = 2 ⇒ 1 + 0.6 × (2×2 / 3) = 1 + 0.6 × 1.333 = **1.8**

**Example 4: Chain ending in incorrect answer**
- Frank → Grace → Henry, Henry answers incorrectly.
- Henry: **-1** (incorrect solve)
- Grace is at k = 1 upstream ⇒ **-1** (flat penalty)
- Frank is at k = 2 upstream ⇒ **-1** (flat penalty)
- Note: Distance doesn't matter for incorrect chains—everyone gets -1

**Example 5: Chain ending in pass**
- Ivy → Jack, Jack passes.
- Jack: **0** (pass)
- Ivy is at k = 1 upstream of a pass terminus ⇒ **-1** (flat penalty)

**Example 6: Cycle of three** (with γ = 0.4)
- Kate → Leo → Maya → Kate (no one solves/passes in the cycle).
- Kate, Leo, Maya each score: **-1 - γ = -1 - 0.4 = -1.4**
- If Nina delegates to Kate (distance k = 1 from the cycle):
  - Nina scores: -1 - γ/(k+1) = -1 - 0.4/2 = **-1.2**
- If Omar delegates to Nina (distance k = 2 from the cycle):
  - Omar scores: -1 - γ/(k+1) = -1 - 0.4/3 = **-1.133**

**Example 7: Trust bonus** (with β = 0.2)
- 3 players directly delegate to Paul; Paul solves correctly himself.
- Paul receives: +1 (correct solve) + β × 3 = +1 + 0.2 × 3 = **+1.6**
- The 3 delegators each receive upstream-of-correct scores based on their distance.

## 5 Scoring Summary (Per Question)

| Action / Position | Score (this round) |
|------------------|-------------------|
| Solve correctly (no delegation) | +1 |
| Solve incorrectly (no delegation) | -1 |
| Pass (no delegation) | 0 |
| **Upstream of correct terminus at distance k** | **1 + λ × (2k / (k+1))** |
| Upstream of incorrect/pass terminus (any distance) | -1 (flat) |
| Member of a cycle | -1 - γ |
| **Upstream of cycle at distance k** | **-1 - γ/(k+1)** |
| Trust bonus (solved correctly; k direct delegators) | +β × k |

## 6 Strategy Insights

- **Per-round thinking**: Only the current round's graph matters for scoring; prior totals do not affect delegation payoffs.
- **Avoid bad termini**: Delegating into chains that end in an incorrect solver or pass gives you a flat -1 penalty, regardless of distance.
- **Delegation diminishing returns**: In correct chains, being closer to the solver is better. Distance k=1 gives 1.6, k=2 gives 1.8, k=3 gives 1.9, etc., approaching but never exceeding 2.
- **Cycle traps**: Cycles penalize everyone involved, but the penalty decreases for upstream delegators. Break or avoid cycles when possible.
- **Earn direct trust**: Correct self-solves plus many direct delegations yield the β-bonus, which can significantly boost your score.
- **Know your strengths**: Use domain ratings wisely—solve when confident, delegate when uncertain.

## 7 Parameters

The game uses different parameter values across three phases to vary the strategic landscape:

### Phase 1 (Early Rounds)
- λ = 0.6 (moderate delegation reward for correct chains)
- γ = 0.4 (moderate cycle penalty decay)
- β = 0.2 (moderate trust bonus)

### Phase 2 (Middle Rounds)
- λ = 0.4 (lower delegation reward—encourages self-solving)
- γ = 0.3 (lower cycle penalty decay)
- β = 0.1 (lower trust bonus)

### Phase 3 (Final Rounds)
- λ = 0.9 (high delegation reward—encourages trust networks)
- γ = 0.7 (high cycle penalty decay)
- β = 0.2 (moderate trust bonus)

## 8 Key Formula Changes (2025 Update)

The scoring mechanism was updated to better balance delegation strategies:

**OLD Formulas:**
- Upstream of correct: 1 + λᵏ (exponential decay)
- Upstream of incorrect: -1 - λᵏ (exponential penalty)
- Upstream of cycle: -1 - γᵏ (exponential penalty)

**NEW Formulas (Current):**
- Upstream of correct: **1 + λ × (2k / (k+1))** (linear with diminishing returns)
- Upstream of incorrect/pass: **-1** (flat penalty)
- Upstream of cycle: **-1 - γ/(k+1)** (linear penalty with diminishing returns)

**Why the change?**
- The new formulas create more balanced scoring across delegation chains
- Removes excessive penalties for being far from incorrect solvers
- Makes delegation distance matter more strategically for correct chains
- Simplifies calculation while maintaining strategic depth

## 9 Conclusion

The Trust Gambit rewards insight, credibility, and graph-savvy play. Victory flows from both knowing—and knowing whom to trust—each round (each question). The game consists of two stages, with multiple rounds (questions) in each stage. Master the art of delegation, build your reputation, and climb to the top!`
## 5 Strategy Insights

- Per-round thinking: Only the current round's (i.e., current question's) graph matters for scoring; prior totals do not
    affect delegation payoffs.here brilliant problem-solving is only a part of the path to victory.
Reputation and the strategy of trust are just as vital.
Will you risk your score to bet on another’s expertise, or will you gamble on your own skills?

## 1 Introduction

Traditional competitions reward those who can solve the most problems alone. But real-world
success—in academia, organizations, or markets—also depends on networks of trust, skillful dele-
gation, and predicting where true expertise lies. The Trust Gambit simulates this landscape across
diverse domains, forcing choices that blend logic with strategic risk.

## 2 Setup

- Participants compete individually.
- Each participant submits a self-rating from 0 to 10 across 11 domains (Algorithms, Astronomy,
    Biology, Crypto, Economics, Finance, Game Theory, Indian History, Machine Learning,
    Probability, Statistics). Each domain features 2 questions
- The game is played in 2 stages;
    - Stage 1: 120 participants are divided into 8 pools of 15 people each (random division).
       The top 2 people from each team qualify for Stage 2. Each question is considered a "round".
    - Stage 2: 16 participants compete for 3 positions, facing questions in 4 domains: Algorithms,
       Probability, Economics, Machine Learning. Each question is considered a "round".

## 3 Game Rules

R1. Choice of Action (for each question Qt, i.e., each round): Each participant i chooses one of:

- Solve: Attempt the problem directly.
- Delegate: Point to another participant j most likely to know the answer (a directed trust edge
    i→j for this round).


- Pass: Abstain.

R2. Per-round scoring by delegation graph outcome (applies only to the current ques-
tion Qt, i.e., the current round):

- Terminating node (end of a chain): a participant whose incoming chain ends at them
    because they either
       (a) Solved correctly: score +1,
(b) Solved incorrectly: score −1,
(c) Passed: score 0.
- Linear chain propagation: For any node at graph-distance k≥ 1 upstream from a terminating
    node:

```
if terminus scored +1, score = 1 + λk; if terminus scored 0 or −1, score = −1 − λk.
```
- Cycles (no terminating solver/pass inside the cycle):
    - Every node that lies in the cycle scores − 1 − γ.
    - Any node at distance k≥ 0 upstream from the cycle scores − 1 − γk+1.
- Pass without delegating and not on any chain: score 0.

R3. Trust bonus (direct in-degree): If k participants directly delegate to you in this round
(i.e., you have in-degree k in the per-round delegation graph), and you yourself solved correctly
(action=Solve, not via delegation), then you receive an additional trust bonus of +β k for this
round.
R4. Visibility: After each question (each round), the per-round delegation graph and per-round scores are
revealed. Cumulative totals are tracked across all rounds (questions).

## 4 Worked Examples (Per-Round, i.e., Per-Question)

- Direct Solve: Alice attempts and solves correctly ⇒ +1 (no delegation edges).
- Single delegation, correct terminus: Bob→ Alice, and Alice solves correctly. With λ = 0.5:
    Bob is at distance k = 1 from the terminus ⇒ Bob scores 1 + λ^1 = 1 + 0.5 = 1.5.
- Two-step chain, incorrect terminus: Carol → Dave → Eve, Eve answers incorrectly. Dave
    is at k = 1⇒ −1 − λ = −1.5; Carol is at k = 2⇒ −1 − λ^2 = −1.25.
- Chain ending in pass: Frank → Grace, Grace passes. Frank is at k = 1 upstream of a 0
    terminus ⇒ Frank scores −1 − λ = −1.5.
- Cycle of three: Henry → Ivy → Jack → Henry (no one solves/passes in the cycle). Each of
    Henry, Ivy, Jack scores −1 − γ. If Leo delegates to Henry (distance k = 1 from the cycle), Leo
    scores −1 − γ^2.
- Trust bonus: k = 3 players directly delegate to Maya; Maya solves correctly herself. She
    receives +1 for correct solve plus +β· 3 as trust bonus (in addition to any upstream propagation
    others receive).



## 5 Strategy Insights

- Per-round thinking: Only the current round’s graph matters for scoring; prior totals do not
    affect delegation payoffs.
- Avoid bad termini: Delegating into chains that end in an incorrect solver is costly (− 1 −λk).
- Cycle traps: Cycles penalize everyone involved and those upstream; break or avoid cycles.
- Earn direct trust: Correct self-solves plus many direct delegations yield the β-bonus.

## 6 Parameters

- Linear decay (chain): λ with 0 < λ < 1; e.g., λ = 0.5.
- Trust bonus weight: β > 0; e.g., β = 0.3.
- Cycle penalty decay: γ with 0 < γ < 1; e.g., γ = 0.7.

## 7 Conclusion

The Trust Gambit rewards insight, credibility, and graph-savvy play. Victory flows from both
knowing—and knowing whom to trust—each round (each question). The game consists of two stages,
with multiple rounds (questions) in each stage.


