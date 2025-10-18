// Stress test for production deployment
// Uses Node.js 18+ built-in fetch

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || '100');

interface TestResult {
  success: number;
  failed: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errors: Map<string, number>;
}

async function makeRequest(
  url: string,
  options: RequestInit = {}
): Promise<{ success: boolean; time: number; error?: string }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const time = Date.now() - start;

    if (!response.ok) {
      return { success: false, time, error: `HTTP ${response.status}` };
    }

    return { success: true, time };
  } catch (error: any) {
    const time = Date.now() - start;
    return { success: false, time, error: error.message };
  }
}

async function testEndpoint(
  name: string,
  url: string,
  options: RequestInit = {},
  concurrency: number = 10
): Promise<TestResult> {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Concurrency: ${concurrency}`);

  const results: TestResult = {
    success: 0,
    failed: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    errors: new Map(),
  };

  const times: number[] = [];
  const promises: Promise<void>[] = [];

  // Create batches of concurrent requests
  for (let i = 0; i < concurrency; i++) {
    promises.push(
      (async () => {
        const result = await makeRequest(url, options);
        times.push(result.time);

        if (result.success) {
          results.success++;
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
      console.log(`      - ${error}: ${count}x`);
    });
  }

  return results;
}

async function runStressTests() {
  console.log('🚀 STRESS TEST SUITE FOR TRUST GAMBIT');
  console.log('=====================================\n');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrent Users: ${CONCURRENT_USERS}\n`);

  const allResults: { name: string; result: TestResult }[] = [];

  // Test 1: Health Check
  const healthResult = await testEndpoint(
    'Health Check',
    `${BASE_URL}/api/health`,
    {},
    50
  );
  allResults.push({ name: 'Health Check', result: healthResult });

  // Test 2: Home Page Load
  const homePageResult = await testEndpoint(
    'Home Page Load',
    BASE_URL,
    {},
    CONCURRENT_USERS
  );
  allResults.push({ name: 'Home Page', result: homePageResult });

  // Test 3: Login Page Load
  const loginPageResult = await testEndpoint(
    'Login Page Load',
    `${BASE_URL}/login`,
    {},
    CONCURRENT_USERS
  );
  allResults.push({ name: 'Login Page', result: loginPageResult });

  // Test 4: Register Page Load
  const registerPageResult = await testEndpoint(
    'Register Page Load',
    `${BASE_URL}/register`,
    {},
    CONCURRENT_USERS
  );
  allResults.push({ name: 'Register Page', result: registerPageResult });

  // Test 5: Dashboard (with auth check)
  const dashboardResult = await testEndpoint(
    'Dashboard Page',
    `${BASE_URL}/dashboard`,
    {},
    50
  );
  allResults.push({ name: 'Dashboard', result: dashboardResult });

  // Test 6: API Load Test
  const apiResult = await testEndpoint(
    'Profile API',
    `${BASE_URL}/api/profile`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
    75
  );
  allResults.push({ name: 'Profile API', result: apiResult });

  // Summary
  console.log('\n📊 STRESS TEST SUMMARY');
  console.log('======================\n');

  allResults.forEach(({ name, result }) => {
    const total = result.success + result.failed;
    const successRate = total > 0 ? ((result.success / total) * 100).toFixed(1) : '0.0';
    console.log(`${name}:`);
    console.log(`  Success Rate: ${successRate}% (${result.success}/${total})`);
    console.log(`  Avg Response: ${result.avgResponseTime.toFixed(2)}ms`);
    console.log(`  Max Response: ${result.maxResponseTime}ms`);
    console.log('');
  });

  // Overall verdict
  const totalSuccess = allResults.reduce((sum, { result }) => sum + result.success, 0);
  const totalRequests = allResults.reduce((sum, { result }) => sum + result.success + result.failed, 0);
  const overallSuccessRate = totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(1) : '0.0';
  const avgResponseTime = allResults.reduce((sum, { result }) => sum + result.avgResponseTime, 0) / allResults.length;

  console.log('🎯 OVERALL VERDICT');
  console.log('==================');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Success Rate: ${overallSuccessRate}%`);
  console.log(`Avg Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log('');

  if (parseFloat(overallSuccessRate) >= 95) {
    console.log('✅ EXCELLENT - System handling load perfectly!');
  } else if (parseFloat(overallSuccessRate) >= 85) {
    console.log('⚠️  GOOD - System mostly stable but could use optimization');
  } else if (parseFloat(overallSuccessRate) >= 70) {
    console.log('⚠️  FAIR - System under stress, optimization needed');
  } else {
    console.log('❌ POOR - System struggling, immediate attention required');
  }

  // Performance rating
  if (avgResponseTime < 500) {
    console.log('⚡ FAST - Response times excellent');
  } else if (avgResponseTime < 1000) {
    console.log('👍 GOOD - Response times acceptable');
  } else if (avgResponseTime < 2000) {
    console.log('🐌 SLOW - Response times need improvement');
  } else {
    console.log('🚨 VERY SLOW - Response times critical');
  }
}

runStressTests().catch((error) => {
  console.error('❌ Stress test failed:', error);
  process.exit(1);
});
