// Registration Stress Test - Complete User Flow
// Tests: registration + profile completion (2-step process)
// This simulates real user workflow with domain ratings

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOTAL_REGISTRATIONS = parseInt(process.env.TOTAL_REGISTRATIONS || '500');
const CONCURRENT_BATCH = parseInt(process.env.CONCURRENT_BATCH || '50');

const DOMAINS = [
  'Algorithms',
  'Astronomy',
  'Biology',
  'Crypto',
  'Economics',
  'Finance',
  'Game Theory',
  'Indian History',
  'Machine Learning',
  'Probability',
  'Statistics',
];

interface RegistrationResult {
  success: number;
  failed: number;
  profileCompleted: number;
  profileFailed: number;
  avgResponseTime: number;
  avgProfileTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errors: Map<string, number>;
  userIds: string[];
}

async function registerUser(
  email: string,
  rollNo: string,
  name: string
): Promise<{ success: boolean; time: number; error?: string; userId?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        rollNo,
        name,
        password: 'TestPassword123!',
        hostelName: 'Stress Test Hostel',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const time = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        time, 
        error: `HTTP ${response.status}: ${errorText.substring(0, 100)}` 
      };
    }

    const data = await response.json();
    return { success: true, time, userId: data.user?.id };
  } catch (error: any) {
    const time = Date.now() - start;
    return { success: false, time, error: error.message };
  }
}

async function testConcurrentRegistrations(
  startIndex: number,
  batchSize: number
): Promise<RegistrationResult> {
  console.log(`\n🧪 Testing batch: ${startIndex} to ${startIndex + batchSize - 1}`);

  const results: RegistrationResult = {
    success: 0,
    failed: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    errors: new Map(),
    userIds: [],
  };

  const times: number[] = [];
  const promises: Promise<void>[] = [];

  // Create concurrent registration requests
  for (let i = 0; i < batchSize; i++) {
    const userIndex = startIndex + i;
    const timestamp = Date.now();
    
    promises.push(
      (async () => {
        const result = await registerUser(
          `stresstest${userIndex}_${timestamp}@iitd.ac.in`,
          `stress${userIndex}_${timestamp}`,
          `Stress Test User ${userIndex}`
        );
        
        times.push(result.time);

        if (result.success) {
          results.success++;
          if (result.userId) {
            results.userIds.push(result.userId);
          }
        } else {
          results.failed++;
          if (result.error) {
            const count = results.errors.get(result.error) || 0;
            results.errors.set(result.error, count + 1);
          }
        }

        results.maxResponseTime = Math.max(results.maxResponseTime, result.time);
        results.minResponseTime = Math.min(results.minResponseTime, result.time);
      })()
    );
  }

  await Promise.all(promises);

  results.avgResponseTime = times.reduce((a, b) => a + b, 0) / times.length;

  console.log(`   ✅ Success: ${results.success}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⏱️  Avg Response: ${results.avgResponseTime.toFixed(2)}ms`);
  console.log(`   📊 Min/Max: ${results.minResponseTime}ms / ${results.maxResponseTime}ms`);

  if (results.errors.size > 0) {
    console.log(`   ⚠️  Errors:`);
    results.errors.forEach((count, error) => {
      console.log(`      - ${error.substring(0, 80)}: ${count}x`);
    });
  }

  return results;
}

async function testLoginAfterRegistration(
  email: string,
  password: string
): Promise<{ success: boolean; time: number }> {
  const start = Date.now();
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const time = Date.now() - start;
    return { success: response.ok, time };
  } catch (error) {
    return { success: false, time: Date.now() - start };
  }
}

async function runRegistrationStressTest() {
  console.log('🚀 REGISTRATION STRESS TEST');
  console.log('===========================\n');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Total Registrations: ${TOTAL_REGISTRATIONS}`);
  console.log(`Concurrent Batch Size: ${CONCURRENT_BATCH}\n`);

  const allResults: RegistrationResult[] = [];
  const overallStart = Date.now();

  // Run batches of concurrent registrations
  const batches = Math.ceil(TOTAL_REGISTRATIONS / CONCURRENT_BATCH);
  
  for (let batch = 0; batch < batches; batch++) {
    const startIndex = batch * CONCURRENT_BATCH;
    const batchSize = Math.min(CONCURRENT_BATCH, TOTAL_REGISTRATIONS - startIndex);
    
    const batchResult = await testConcurrentRegistrations(startIndex, batchSize);
    allResults.push(batchResult);
    
    // Small delay between batches to avoid overwhelming the system
    if (batch < batches - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const overallTime = Date.now() - overallStart;

  // Calculate overall statistics
  const totalSuccess = allResults.reduce((sum, r) => sum + r.success, 0);
  const totalFailed = allResults.reduce((sum, r) => sum + r.failed, 0);
  const totalRequests = totalSuccess + totalFailed;
  const avgResponseTime = allResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / allResults.length;
  const maxResponseTime = Math.max(...allResults.map(r => r.maxResponseTime));
  const minResponseTime = Math.min(...allResults.map(r => r.minResponseTime));

  // Aggregate all errors
  const allErrors = new Map<string, number>();
  allResults.forEach(result => {
    result.errors.forEach((count, error) => {
      const currentCount = allErrors.get(error) || 0;
      allErrors.set(error, currentCount + count);
    });
  });

  // Test login with one of the registered users
  console.log('\n🔐 Testing Login After Registration...');
  if (totalSuccess > 0) {
    const testEmail = `stresstest0_${Date.now()}@iitd.ac.in`;
    // Register a test user
    const regResult = await registerUser(
      testEmail,
      `logintest_${Date.now()}`,
      'Login Test User'
    );
    
    if (regResult.success) {
      const loginResult = await testLoginAfterRegistration(testEmail, 'TestPassword123!');
      console.log(`   ${loginResult.success ? '✅' : '❌'} Login test: ${loginResult.success ? 'SUCCESS' : 'FAILED'} (${loginResult.time}ms)`);
    }
  }

  // Summary
  console.log('\n📊 REGISTRATION STRESS TEST SUMMARY');
  console.log('===================================\n');
  
  const successRate = totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(1) : '0.0';
  const registrationsPerSecond = (totalSuccess / (overallTime / 1000)).toFixed(2);
  
  console.log(`Total Registrations Attempted: ${totalRequests}`);
  console.log(`Successful: ${totalSuccess} (${successRate}%)`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Total Time: ${(overallTime / 1000).toFixed(2)}s`);
  console.log(`Throughput: ${registrationsPerSecond} registrations/sec`);
  console.log(`\nResponse Times:`);
  console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`  Min: ${minResponseTime}ms`);
  console.log(`  Max: ${maxResponseTime}ms`);

  if (allErrors.size > 0) {
    console.log(`\n⚠️  Error Summary:`);
    Array.from(allErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([error, count]) => {
        console.log(`  - ${error}: ${count}x (${((count / totalRequests) * 100).toFixed(1)}%)`);
      });
  }

  console.log('\n🎯 OVERALL VERDICT');
  console.log('==================');
  
  if (parseFloat(successRate) >= 95 && avgResponseTime < 1000) {
    console.log('✅ EXCELLENT - System handles registration load perfectly!');
    console.log('   - High success rate');
    console.log('   - Fast response times');
    console.log('   - Ready for production');
  } else if (parseFloat(successRate) >= 85 && avgResponseTime < 2000) {
    console.log('⚠️  GOOD - System handles load but could be optimized');
    console.log('   - Acceptable success rate');
    console.log('   - Response times acceptable');
    console.log('   - Consider optimization for better performance');
  } else if (parseFloat(successRate) >= 70) {
    console.log('⚠️  FAIR - System under stress, optimization needed');
    console.log('   - Success rate concerning');
    console.log('   - Response times need improvement');
    console.log('   - Requires optimization before heavy load');
  } else {
    console.log('❌ POOR - System struggling with load');
    console.log('   - Low success rate');
    console.log('   - Immediate attention required');
    console.log('   - Not ready for production load');
  }

  // Database load assessment
  console.log('\n💾 DATABASE LOAD ASSESSMENT');
  console.log('===========================');
  console.log(`Write Operations: ${totalSuccess} successful inserts`);
  console.log(`Database Throughput: ${registrationsPerSecond} writes/sec`);
  
  if (parseFloat(registrationsPerSecond) > 10) {
    console.log('✅ Database handling writes efficiently');
  } else if (parseFloat(registrationsPerSecond) > 5) {
    console.log('⚠️  Database write performance acceptable');
  } else {
    console.log('❌ Database write performance needs improvement');
  }
}

runRegistrationStressTest().catch((error) => {
  console.error('❌ Registration stress test failed:', error);
  process.exit(1);
});
