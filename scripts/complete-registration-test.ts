// Complete Registration Stress Test
// Tests full user flow: registration → profile completion
// This is the REAL registration workflow

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOTAL_USERS = parseInt(process.env.TOTAL_USERS || '200');
const CONCURRENT_BATCH = parseInt(process.env.CONCURRENT_BATCH || '10');

const DOMAINS = [
  'Algorithms',
  'Finance',
  'Economics',
  'Statistics',
  'Probability',
  'Machine Learning',
  'Crypto',
  'Biology',
  'Indian History',
  'Game Theory',
];

interface TestResult {
  registrationSuccess: number;
  registrationFailed: number;
  profileSuccess: number;
  profileFailed: number;
  avgRegTime: number;
  avgProfileTime: number;
  avgTotalTime: number;
  maxTime: number;
  minTime: number;
  errors: Map<string, number>;
}

// Step 1: Register user
async function registerUser(
  email: string,
  rollNo: string,
  name: string
): Promise<{ success: boolean; time: number; userId?: string; error?: string }> {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        rollNo,
        name,
        password: 'TestPass123!',
        hostelName: 'Test Hostel',
      }),
    });

    const time = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, time, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, time, userId: data.userId };
  } catch (error: any) {
    return { success: false, time: Date.now() - start, error: error.message };
  }
}

// Step 2: Complete profile with domain ratings
async function completeProfile(
  userId: string
): Promise<{ success: boolean; time: number; error?: string }> {
  const start = Date.now();
  try {
    // Generate realistic domain ratings
    const domainRatings = DOMAINS.map(domain => ({
      domain,
      rating: Math.floor(Math.random() * 5) + 1, // 1-5 rating
      reason: `Experience with ${domain}`,
    }));

    const response = await fetch(`${BASE_URL}/api/profile/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        domainRatings,
      }),
    });

    const time = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, time, error: `HTTP ${response.status}` };
    }

    return { success: true, time };
  } catch (error: any) {
    return { success: false, time: Date.now() - start, error: error.message };
  }
}

// Complete user flow: register + complete profile
async function completeUserRegistration(
  userIndex: number,
  timestamp: number
): Promise<{
  success: boolean;
  regTime: number;
  profileTime: number;
  totalTime: number;
  error?: string;
}> {
  const overallStart = Date.now();

  // Step 1: Register
  const regResult = await registerUser(
    `fulltest${userIndex}_${timestamp}@iitd.ac.in`,
    `full${userIndex}_${timestamp}`,
    `Full Test User ${userIndex}`
  );

  if (!regResult.success || !regResult.userId) {
    return {
      success: false,
      regTime: regResult.time,
      profileTime: 0,
      totalTime: Date.now() - overallStart,
      error: regResult.error || 'Registration failed',
    };
  }

  // Step 2: Complete Profile
  const profileResult = await completeProfile(regResult.userId);

  const totalTime = Date.now() - overallStart;

  return {
    success: profileResult.success,
    regTime: regResult.time,
    profileTime: profileResult.time,
    totalTime,
    error: profileResult.error,
  };
}

async function testBatch(startIndex: number, batchSize: number): Promise<TestResult> {
  console.log(`\n🧪 Testing batch: ${startIndex} to ${startIndex + batchSize - 1}`);

  const result: TestResult = {
    registrationSuccess: 0,
    registrationFailed: 0,
    profileSuccess: 0,
    profileFailed: 0,
    avgRegTime: 0,
    avgProfileTime: 0,
    avgTotalTime: 0,
    maxTime: 0,
    minTime: Infinity,
    errors: new Map(),
  };

  const regTimes: number[] = [];
  const profileTimes: number[] = [];
  const totalTimes: number[] = [];
  const timestamp = Date.now();

  const promises = [];
  for (let i = 0; i < batchSize; i++) {
    promises.push(
      (async () => {
        const userResult = await completeUserRegistration(startIndex + i, timestamp);

        regTimes.push(userResult.regTime);
        if (userResult.profileTime > 0) {
          profileTimes.push(userResult.profileTime);
        }
        totalTimes.push(userResult.totalTime);

        if (userResult.regTime > 0) {
          result.registrationSuccess++;
        } else {
          result.registrationFailed++;
        }

        if (userResult.success) {
          result.profileSuccess++;
        } else {
          result.profileFailed++;
          if (userResult.error) {
            const count = result.errors.get(userResult.error) || 0;
            result.errors.set(userResult.error, count + 1);
          }
        }

        result.maxTime = Math.max(result.maxTime, userResult.totalTime);
        result.minTime = Math.min(result.minTime, userResult.totalTime);
      })()
    );
  }

  await Promise.all(promises);

  result.avgRegTime = regTimes.reduce((a, b) => a + b, 0) / regTimes.length;
  result.avgProfileTime = profileTimes.length > 0 
    ? profileTimes.reduce((a, b) => a + b, 0) / profileTimes.length 
    : 0;
  result.avgTotalTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;

  console.log(`   📝 Registration: ${result.registrationSuccess}/${batchSize} success`);
  console.log(`   ✅ Profile Complete: ${result.profileSuccess}/${result.registrationSuccess} success`);
  console.log(`   ⏱️  Avg Times: Reg=${result.avgRegTime.toFixed(0)}ms, Profile=${result.avgProfileTime.toFixed(0)}ms, Total=${result.avgTotalTime.toFixed(0)}ms`);
  console.log(`   📊 Min/Max Total: ${result.minTime}ms / ${result.maxTime}ms`);

  if (result.errors.size > 0) {
    console.log(`   ⚠️  Errors:`);
    result.errors.forEach((count, error) => {
      console.log(`      - ${error}: ${count}x`);
    });
  }

  return result;
}

async function runCompleteRegistrationTest() {
  console.log('🚀 COMPLETE REGISTRATION STRESS TEST');
  console.log('====================================\n');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Total Users: ${TOTAL_USERS}`);
  console.log(`Concurrent Batch: ${CONCURRENT_BATCH}`);
  console.log(`Workflow: Registration → Profile Completion\n`);

  const allResults: TestResult[] = [];
  const overallStart = Date.now();

  const batches = Math.ceil(TOTAL_USERS / CONCURRENT_BATCH);

  for (let batch = 0; batch < batches; batch++) {
    const startIndex = batch * CONCURRENT_BATCH;
    const batchSize = Math.min(CONCURRENT_BATCH, TOTAL_USERS - startIndex);

    const batchResult = await testBatch(startIndex, batchSize);
    allResults.push(batchResult);

    // Delay between batches
    if (batch < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const overallTime = Date.now() - overallStart;

  // Aggregate results
  const totalRegSuccess = allResults.reduce((sum, r) => sum + r.registrationSuccess, 0);
  const totalRegFailed = allResults.reduce((sum, r) => sum + r.registrationFailed, 0);
  const totalProfileSuccess = allResults.reduce((sum, r) => sum + r.profileSuccess, 0);
  const totalProfileFailed = allResults.reduce((sum, r) => sum + r.profileFailed, 0);

  const avgRegTime = allResults.reduce((sum, r) => sum + r.avgRegTime, 0) / allResults.length;
  const avgProfileTime = allResults.reduce((sum, r) => sum + r.avgProfileTime, 0) / allResults.length;
  const avgTotalTime = allResults.reduce((sum, r) => sum + r.avgTotalTime, 0) / allResults.length;
  const maxTime = Math.max(...allResults.map(r => r.maxTime));
  const minTime = Math.min(...allResults.map(r => r.minTime));

  const allErrors = new Map<string, number>();
  allResults.forEach(result => {
    result.errors.forEach((count, error) => {
      const currentCount = allErrors.get(error) || 0;
      allErrors.set(error, currentCount + count);
    });
  });

  // Summary
  console.log('\n📊 COMPLETE REGISTRATION TEST SUMMARY');
  console.log('=====================================\n');

  const totalAttempted = totalRegSuccess + totalRegFailed;
  const regSuccessRate = totalAttempted > 0 ? ((totalRegSuccess / totalAttempted) * 100).toFixed(1) : '0';
  const profileSuccessRate = totalRegSuccess > 0 ? ((totalProfileSuccess / totalRegSuccess) * 100).toFixed(1) : '0';
  const overallSuccessRate = totalAttempted > 0 ? ((totalProfileSuccess / totalAttempted) * 100).toFixed(1) : '0';

  const throughput = (totalProfileSuccess / (overallTime / 1000)).toFixed(2);

  console.log('Registration Phase:');
  console.log(`  Attempted: ${totalAttempted}`);
  console.log(`  Success: ${totalRegSuccess} (${regSuccessRate}%)`);
  console.log(`  Failed: ${totalRegFailed}`);
  console.log(`  Avg Time: ${avgRegTime.toFixed(0)}ms`);
  console.log('');

  console.log('Profile Completion Phase:');
  console.log(`  Attempted: ${totalRegSuccess}`);
  console.log(`  Success: ${totalProfileSuccess} (${profileSuccessRate}%)`);
  console.log(`  Failed: ${totalProfileFailed}`);
  console.log(`  Avg Time: ${avgProfileTime.toFixed(0)}ms`);
  console.log('');

  console.log('Overall Results:');
  console.log(`  Complete Registrations: ${totalProfileSuccess}/${totalAttempted} (${overallSuccessRate}%)`);
  console.log(`  Total Time: ${(overallTime / 1000).toFixed(2)}s`);
  console.log(`  Throughput: ${throughput} complete users/sec`);
  console.log(`  Avg Total Time per User: ${avgTotalTime.toFixed(0)}ms`);
  console.log(`  Min/Max Time: ${minTime}ms / ${maxTime}ms`);

  if (allErrors.size > 0) {
    console.log(`\n⚠️  Error Summary:`);
    Array.from(allErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        console.log(`  - ${error}: ${count}x (${((count / totalAttempted) * 100).toFixed(1)}%)`);
      });
  }

  console.log('\n🎯 OVERALL VERDICT');
  console.log('==================');

  const overallRate = parseFloat(overallSuccessRate);
  const avgTime = avgTotalTime;

  if (overallRate >= 95 && avgTime < 2000) {
    console.log('✅ EXCELLENT - Complete registration flow working perfectly!');
    console.log('   - 95%+ users completing full registration');
    console.log('   - Fast response times (<2s)');
    console.log('   - Production ready');
  } else if (overallRate >= 85 && avgTime < 3000) {
    console.log('✅ GOOD - System handling registration well');
    console.log('   - 85%+ users completing registration');
    console.log('   - Acceptable response times');
    console.log('   - Minor optimizations recommended');
  } else if (overallRate >= 70) {
    console.log('⚠️  FAIR - Registration flow under stress');
    console.log('   - Success rate concerning');
    console.log('   - Optimization needed before production');
  } else {
    console.log('❌ POOR - Critical registration issues');
    console.log('   - Low success rate');
    console.log('   - Immediate fixes required');
  }

  console.log('\n💾 DATABASE IMPACT');
  console.log('==================');
  const dbWrites = (totalProfileSuccess * 12); // 1 user + 10 domain ratings + 1 update
  const dbWritesPerSec = (dbWrites / (overallTime / 1000)).toFixed(2);
  console.log(`Total DB Writes: ${dbWrites}`);
  console.log(`  - User records: ${totalProfileSuccess}`);
  console.log(`  - Domain ratings: ${totalProfileSuccess * 10}`);
  console.log(`  - Profile updates: ${totalProfileSuccess}`);
  console.log(`Write Throughput: ${dbWritesPerSec} writes/sec`);

  if (parseFloat(dbWritesPerSec) > 50) {
    console.log('✅ Excellent database write performance');
  } else if (parseFloat(dbWritesPerSec) > 25) {
    console.log('✅ Good database write performance');
  } else if (parseFloat(dbWritesPerSec) > 10) {
    console.log('⚠️  Moderate database write performance');
  } else {
    console.log('❌ Database writes need optimization');
  }
}

runCompleteRegistrationTest().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
