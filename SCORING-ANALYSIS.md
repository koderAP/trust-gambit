# Trust Gambit Scoring Analysis & Test Cases

## Understanding of Current Scoring Rules

Based on my analysis of the codebase and game documentation, here is my understanding of the scoring mechanism:

### Core Scoring Rules

**1. Terminating Nodes (End of Delegation Chain):**
- **Correct Solve**: +1 base score + β × (number of direct delegators)
- **Incorrect Solve**: -1 
- **Pass (no delegation)**: 0 OR passScore parameter (configurable: -1 or 0)

**2. Upstream of Correct Terminus:**
At distance k from correct solver:
```
score = 1 + λ × (2k / (k+1))
```
Examples with λ = 0.6:
- k=1: 1 + 0.6 × (2/2) = 1.6
- k=2: 1 + 0.6 × (4/3) = 1.8
- k=3: 1 + 0.6 × (6/4) = 1.9
- k→∞: approaches 2

**3. Upstream of Incorrect/Pass Terminus:**
```
score = -1 (flat penalty, regardless of distance)
```

**4. Cycle Participants:**
```
score = -1 - γ
```
With γ = 0.4: score = -1.4

**5. Upstream of Cycle:**
At distance k from cycle:
```
score = -1 - γ/(k+1)
```
Examples with γ = 0.4:
- k=1: -1 - 0.4/2 = -1.2
- k=2: -1 - 0.4/3 = -1.133
- k=3: -1 - 0.4/4 = -1.1

**6. Trust Bonus:**
If you SOLVE correctly and k people directly delegate to you:
```
additional_score = β × k
total_score = 1 + β × k
```

## Issues Found in Current Implementation

### ❌ CRITICAL ISSUE #1: PASS Score Not Using passScore Parameter

**Location**: `lib/calculateDelegationGraph.ts` line 250
```typescript
} else if (node.action === 'PASS') {
  // Pass without delegating: 0
  score = 0;  // ❌ HARDCODED!
```

**Problem**: The code hardcodes PASS score to 0, ignoring the `game.passScore` parameter that was added to the database.

**Expected Behavior**: Should use `round.game.passScore` (which can be -1 or 0)

**Fix Required**: Change line 250 to:
```typescript
} else if (node.action === 'PASS') {
  const passScore = round.game.passScore ?? 0;
  score = passScore;
  console.log(`  ${userId}: Passed, score = ${score}`);
}
```

### ❌ POTENTIAL ISSUE #2: Trust Bonus Calculation Placement

**Location**: `lib/calculateDelegationGraph.ts` line 231
```typescript
const delegators = delegatorCount.get(userId) || 0;
const trustBonus = beta * delegators;
score += trustBonus;
```

**Current Behavior**: Trust bonus is added during score calculation
**Concern**: Trust bonus is only added to the `score` variable but may not be properly stored in the database separately

**Need to verify**: Check if `roundScore.trustScore` is being populated correctly

### ✅ CORRECT: Delegation Chain Score Propagation

**Location**: Lines 252-315
The code correctly implements the new 2025 formulas:
- Upstream of correct: `1 + lambda * (2 * distance / (distance + 1))`
- Upstream of incorrect/pass: `-1` (flat)
- Cycle member: `-1 - gamma`
- Upstream of cycle: `-1 - gamma / (distance + 1)`

## Test Cases for Verification

### Test Case 1: Direct Solve (Correct)
**Setup:**
- Alice: SOLVE, answer = correct
- No delegators

**Expected:**
- Alice: +1

**Parameters**: Any values

---

### Test Case 2: Direct Solve (Incorrect)
**Setup:**
- Bob: SOLVE, answer = incorrect
- No delegators

**Expected:**
- Bob: -1

**Parameters**: Any values

---

### Test Case 3: Pass (No Delegation)
**Setup:**
- Carol: PASS
- passScore = 0

**Expected:**
- Carol: 0

**Setup 2:**
- Carol: PASS
- passScore = -1

**Expected:**
- Carol: -1

**Current Bug**: Always returns 0, ignores passScore

---

### Test Case 4: Single Delegation to Correct Solver
**Setup:**
- Alice: SOLVE, answer = correct
- Bob: DELEGATE → Alice
- λ = 0.6, β = 0.2

**Expected:**
- Alice: 1 + β×1 = 1 + 0.2 = 1.2
- Bob: 1 + 0.6×(2×1/(1+1)) = 1 + 0.6×1 = 1.6

---

### Test Case 5: Two-Hop Chain to Correct Solver
**Setup:**
- Alice: SOLVE, answer = correct
- Bob: DELEGATE → Alice
- Carol: DELEGATE → Bob
- λ = 0.6, β = 0.2

**Expected:**
- Alice: 1 + β×1 = 1.2 (1 direct delegator: Bob)
- Bob: 1 + 0.6×(2×1/2) = 1.6 (distance 1 from Alice)
- Carol: 1 + 0.6×(2×2/3) = 1 + 0.6×1.333 = 1.8 (distance 2 from Alice)

---

### Test Case 6: Multiple Delegators (Trust Bonus)
**Setup:**
- Alice: SOLVE, answer = correct
- Bob: DELEGATE → Alice
- Carol: DELEGATE → Alice
- Dave: DELEGATE → Alice
- β = 0.2

**Expected:**
- Alice: 1 + β×3 = 1 + 0.6 = 1.6 (3 direct delegators)
- Bob: 1.6 (distance 1)
- Carol: 1.6 (distance 1)
- Dave: 1.6 (distance 1)

---

### Test Case 7: Chain to Incorrect Solver
**Setup:**
- Alice: SOLVE, answer = incorrect
- Bob: DELEGATE → Alice
- Carol: DELEGATE → Bob
- λ = 0.6

**Expected:**
- Alice: -1
- Bob: -1 (flat penalty, distance doesn't matter)
- Carol: -1 (flat penalty, distance doesn't matter)

---

### Test Case 8: Chain to Pass
**Setup:**
- Alice: PASS
- Bob: DELEGATE → Alice
- Carol: DELEGATE → Bob
- passScore = 0

**Expected:**
- Alice: 0 (or -1 if passScore = -1)
- Bob: -1 (upstream of pass terminus)
- Carol: -1 (upstream of pass terminus)

**Current Bug**: Alice always gets 0, ignores passScore

---

### Test Case 9: Simple Cycle (3 nodes)
**Setup:**
- Alice: DELEGATE → Bob
- Bob: DELEGATE → Carol
- Carol: DELEGATE → Alice
- γ = 0.4

**Expected:**
- Alice: -1 - 0.4 = -1.4 (in cycle)
- Bob: -1 - 0.4 = -1.4 (in cycle)
- Carol: -1 - 0.4 = -1.4 (in cycle)

---

### Test Case 10: Upstream of Cycle
**Setup:**
- Alice: DELEGATE → Bob
- Bob: DELEGATE → Carol
- Carol: DELEGATE → Bob (cycle: Bob ↔ Carol)
- Dave: DELEGATE → Alice
- γ = 0.4

**Expected:**
- Bob: -1 - 0.4 = -1.4 (in cycle)
- Carol: -1 - 0.4 = -1.4 (in cycle)
- Alice: -1 - 0.4/(1+1) = -1 - 0.2 = -1.2 (distance 1 from cycle)
- Dave: -1 - 0.4/(2+1) = -1 - 0.133 = -1.133 (distance 2 from cycle)

---

### Test Case 11: Mixed Scenario (Complex)
**Setup:**
- Alice: SOLVE, answer = correct
- Bob: DELEGATE → Alice
- Carol: DELEGATE → Bob
- Dave: DELEGATE → Alice
- Eve: SOLVE, answer = incorrect
- Frank: DELEGATE → Eve
- Grace: PASS
- Henry: DELEGATE → Grace
- λ = 0.6, β = 0.2, γ = 0.4, passScore = -1

**Expected:**
- Alice: 1 + β×2 = 1 + 0.4 = 1.4 (2 direct delegators: Bob, Dave)
- Bob: 1 + 0.6×(2×1/2) = 1.6 (distance 1 from Alice)
- Carol: 1 + 0.6×(2×2/3) = 1.8 (distance 2 from Alice)
- Dave: 1 + 0.6×(2×1/2) = 1.6 (distance 1 from Alice)
- Eve: -1 (incorrect solve)
- Frank: -1 (upstream of incorrect)
- Grace: -1 (PASS with passScore=-1)
- Henry: -1 (upstream of pass)

---

### Test Case 12: Self-Loop (Cycle of 1)
**Setup:**
- Alice: DELEGATE → Alice
- γ = 0.4

**Expected:**
- Alice: -1 - 0.4 = -1.4 (in cycle)

---

### Test Case 13: Delegation to Non-Existent User
**Setup:**
- Alice: DELEGATE → "USER_999" (doesn't exist in lobby)

**Expected:**
- Alice: -1 - γ (treated as broken delegation = cycle penalty)

---

### Test Case 14: Everyone Passes (passScore variations)
**Setup:**
- Alice: PASS
- Bob: PASS
- Carol: PASS
- passScore = 0

**Expected:**
- Alice: 0
- Bob: 0
- Carol: 0

**Setup 2:** (passScore = -1)
**Expected:**
- Alice: -1
- Bob: -1
- Carol: -1

**Current Bug**: Always returns 0

---

### Test Case 15: Implicit PASS (User Didn't Submit)
**Setup:**
- Alice (in lobby, didn't submit)
- System auto-creates PASS submission

**Expected:**
- Alice: 0 (or -1 if passScore = -1)
- RoundScore record created with action=PASS

---

## Summary of Issues

### Critical Issues (Must Fix)
1. ❌ **PASS score hardcoded to 0** - ignores `game.passScore` parameter
2. ❌ **Need to verify trustScore is saved** in database separately

### Verification Needed
- Test that implicit PASS submissions work correctly
- Verify that cycle detection handles all edge cases (self-loops, disconnected components)
- Confirm that distance calculations are correct for multi-hop chains

## Recommended Fixes

### Fix 1: Use passScore Parameter
```typescript
// In calculateDelegationGraph.ts around line 250
} else if (node.action === 'PASS') {
  const passScore = round.game.passScore ?? 0;
  score = passScore;
  leadsTo = 'pass';
  console.log(`  ${userId}: Passed, score = ${score}`);
```

### Fix 2: Ensure Trust Bonus is Saved Separately
```typescript
// In the database save section (around line 336)
await prisma.roundScore.upsert({
  where: { roundId_userId: { roundId, userId } },
  create: {
    roundId,
    userId,
    solveScore: node.action === 'SOLVE' ? (node.isCorrect ? 1 : -1) : 0,
    delegateScore: node.action === 'DELEGATE' ? node.score : 0,
    trustScore: node.action === 'SOLVE' && node.isCorrect 
      ? beta * (delegatorCount.get(userId) || 0) 
      : 0,
    totalScore: node.score,
    inCycle: node.inCycle,
    distanceFromSolver: node.distanceFromSolver,
  },
  update: { /* same fields */ }
});
```

## Test Execution Plan

1. Create a test script that sets up each scenario
2. Run `calculateDelegationGraph()` for each test case
3. Verify scores match expected values
4. Test with different parameter values (λ, β, γ, passScore)
5. Ensure database records are created correctly

Would you like me to:
1. Create an automated test suite for these cases?
2. Fix the identified bugs immediately?
3. Add additional edge case tests?
