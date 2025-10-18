# The Trust Gambit: Strategy, Reputation, and Risk

### TechGC Problem Statement by IGTS

### October 11, 2025

## Competition Theme

The Trust G### Scoring Summary (Per Question, i.e., Per Round)

```
Action / Position Score (this round)
Solve correctly (no delegation) +1
Solve incorrectly (no delegation) −1
Pass (no delegation) 0
Upstream of terminus with score +1 at distance k 1 + λk
Upstream of terminus with score 0 or −1 at distance k −1 − λk
Member of a cycle (no solver/pass inside) −1 − γ
Upstream of a cycle at distance k −1 − γk+1
Trust bonus (you solved correctly; k direct delegators) +β k
```
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
- Each participant submits a self-rating from 0 to 10 across 10 domains (Algorithms, Finance,
    Economics, Statistics, Probability, Machine Learning, Crypto, Biology, Indian History, Game
    Theory). Each domain features 2 questions
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


### Visuals

Trust Chain Example (Qualitative)

```
Eve Frank Grace
```
```
delegate delegate
```
```
solves
```
Cycle Example (Qualitative)

```
Henry Ivy
```
```
Jack
```
### Linear Chain Scoring Mechanism

```
λk× score λ^2 × score λ× score score ∈{ 0 , +1}
```
```
− 1 − λk −^1 − λ^2 −^1 − λ −^1
```
```
k is distance
from terminating
node
```

### Linear Chain with Cycle Scoring Mechanism

```
− 1 − γk
```
```
− 1 − γ^3
```
```
− 1 − γ^2
```
```
− 1 − γ
```
```
− 1 − γ − 1 − γ
```
```
− 1 − γ
```
```
where (k− 1) is distance
from the cycle
```

### Scoring Summary (Per Question)

```
Action / Position Score (this round)
Solve correctly (no delegation) +1
Solve incorrectly (no delegation) −1
Pass (no delegation) 0
Upstream of terminus with score +1 at distance k 1 + λk
Upstream of terminus with score 0 or −1 at distance k −1 − λk
Member of a cycle (no solver/pass inside) −1 − γ
Upstream of a cycle at distance k −1 − γk+1
Trust bonus (you solved correctly; k direct delegators) +β k
```
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


