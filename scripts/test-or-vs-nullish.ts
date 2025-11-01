/**
 * Test the || vs ?? bug
 */

console.log('\n=== Testing || vs ?? with distance cache ===\n');

// Simulate the bug
const distanceCache = new Map<string, number>();

// A solver has distance 0
distanceCache.set('solver', 0);

// Using || (current buggy code)
const buggyDistance = distanceCache.get('solver') || null;
console.log(`Using ||: distanceCache.get('solver') || null = ${buggyDistance}`);

// Using ?? (correct code)
const correctDistance = distanceCache.get('solver') ?? null;
console.log(`Using ??: distanceCache.get('solver') ?? null = ${correctDistance}`);

// For undefined
console.log(`\nFor undefined key:`);
console.log(`Using ||: distanceCache.get('unknown') || null = ${distanceCache.get('unknown') || null}`);
console.log(`Using ??: distanceCache.get('unknown') ?? null = ${distanceCache.get('unknown') ?? null}`);

// Impact on scoring
console.log(`\n=== Impact on delegation chain scoring ===`);

function testScoring(cachedDistance: number | null, lambda: number) {
  if (cachedDistance !== null) {
    const distance = cachedDistance + 1;
    const score = -1 - Math.pow(lambda, distance);
    return { distance, score };
  } else {
    const distance = 1;
    const score = -1 - Math.pow(lambda, distance);
    return { distance, score };
  }
}

console.log(`\nIf solver's cached distance is 0 (using ||, becomes null):`);
const buggyResult = testScoring(buggyDistance as any, 0.5);
console.log(`  Distance from delegator: ${buggyResult.distance}`);
console.log(`  Score: ${buggyResult.score.toFixed(4)}`);

console.log(`\nIf solver's cached distance is 0 (using ??, stays 0):`);
const correctResult = testScoring(correctDistance, 0.5);
console.log(`  Distance from delegator: ${correctResult.distance}`);
console.log(`  Score: ${correctResult.score.toFixed(4)}`);

console.log(`\n❌ BUG: When someone delegates directly to a solver, the distance`);
console.log(`   should be 1, but both give distance=1, so no problem YET.`);
console.log(`\n✅ Actually, this specific bug might not cause issues in practice`);
console.log(`   because the distance calculation logic handles it. But it's still`);
console.log(`   technically incorrect and could cause issues in edge cases.`);
