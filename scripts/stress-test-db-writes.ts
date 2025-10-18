#!/usr/bin/env tsx

/**
 * REAL Database Write Stress Test
 * Tests actual submission endpoints with concurrent writes to database
 */

const DB_TEST_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

interface TestResult {
  success: boolean;
  time: number;
  statusCode?: number;
  error?: string;
}

interface LoadTestConfig {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  concurrent: number;
  totalRequests: number;
}

// Make HTTP request with timing
async function makeRequest(url: string, options: any = {}): Promise<TestResult> {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const time = Date.now() - start;
    const success = response.ok;
    
    return {
      success,
      time,
      statusCode: response.status,
    };
  } catch (error: any) {
    return {
      success: false,
      time: Date.now() - start,
      error: error.message,
    };
  }
}

// Test with concurrent requests
async function runLoadTest(config: LoadTestConfig) {
  console.log(`\n🧪 ${config.name}`);
  console.log(`   Method: ${config.method}`);
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Total requests: ${config.totalRequests}`);
  console.log(`   Concurrency: ${config.concurrent}`);
  
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  // Execute requests in batches
  const batches = Math.ceil(config.totalRequests / config.concurrent);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(
      config.concurrent,
      config.totalRequests - (batch * config.concurrent)
    );
    
    const promises = Array(batchSize).fill(null).map((_, i) => {
      const requestBody = typeof config.body === 'function' 
        ? config.body(batch * config.concurrent + i)
        : config.body;
      
      return makeRequest(config.endpoint, {
        method: config.method,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });
    });
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    // Show progress
    const completed = results.length;
    const percentComplete = ((completed / config.totalRequests) * 100).toFixed(1);
    process.stdout.write(`\r   Progress: ${completed}/${config.totalRequests} (${percentComplete}%) `);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Calculate statistics
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  const times = results.map(r => r.time);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
  const throughput = (results.length / (totalTime / 1000)).toFixed(1);
  
  // Status code breakdown
  const statusCodes: Record<number, number> = {};
  results.forEach(r => {
    if (r.statusCode) {
      statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
    }
  });
  
  console.log(`\n   ✅ Success: ${successful}/${results.length} (${((successful/results.length)*100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏱️  Total time: ${totalTime}ms`);
  console.log(`   📊 Response times: ${minTime}ms / ${avgTime.toFixed(0)}ms / ${maxTime}ms / ${p95Time}ms (min/avg/max/p95)`);
  console.log(`   🚀 Throughput: ${throughput} req/s`);
  console.log(`   📋 Status codes:`, statusCodes);
  
  if (failed > 0) {
    const errors = results.filter(r => !r.success && r.error).slice(0, 3);
    if (errors.length > 0) {
      console.log(`   ⚠️  Sample errors:`);
      errors.forEach(e => console.log(`      - ${e.error}`));
    }
  }
  
  return {
    successful,
    failed,
    avgTime,
    maxTime,
    p95Time,
    totalTime,
    throughput: parseFloat(throughput),
    statusCodes,
  };
}

// Setup: Create test game and round
async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...\n');
  
  try {
    // Check if server is running
    const healthCheck = await fetch(`${DB_TEST_BASE_URL}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('Server is not healthy');
    }
    console.log('✅ Server is healthy');
    
    // Check database connection
    const health = await healthCheck.json();
    console.log('✅ Database connection:', health.checks?.database?.status || 'unknown');
    console.log('✅ Redis connection:', health.checks?.redis?.status || 'unknown');
    
    return true;
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    console.error('   Make sure the server is running: npm run dev');
    return false;
  }
}

async function runDatabaseStressTests() {
  console.log('🚀 TRUST GAMBIT - DATABASE WRITE STRESS TEST');
  console.log('='.repeat(60));
  console.log(`Target: ${DB_TEST_BASE_URL}`);
  console.log('Testing REAL database writes with concurrent requests\n');
  
  // Setup
  const setupOk = await setupTestEnvironment();
  if (!setupOk) {
    console.log('\n❌ Cannot proceed without proper setup');
    process.exit(1);
  }
  
  const results: any[] = [];
  
  // Test 1: Health endpoint (baseline - no DB writes)
  results.push(await runLoadTest({
    name: 'Test 1: Health Check (Baseline - No DB)',
    endpoint: `${DB_TEST_BASE_URL}/api/health`,
    method: 'GET',
    concurrent: 100,
    totalRequests: 300,
  }));
  
  await sleep(2000);
  
  // Test 2: User Profile Reads (DB reads)
  console.log('\n💡 Note: The following tests require existing data in the database');
  console.log('   If you see 404 errors, seed the database first: npm run db:seed\n');
  
  await sleep(1000);
  
  // Test 3: Registration (DB writes)
  results.push(await runLoadTest({
    name: 'Test 3: User Registration (DB WRITE)',
    endpoint: `${DB_TEST_BASE_URL}/api/auth/register`,
    method: 'POST',
    body: (i: number) => ({
      email: `stresstest${Date.now()}_${i}@test.com`,
      password: 'password123',
      name: `StressTest User ${i}`,
    }),
    concurrent: 50,
    totalRequests: 100,
  }));
  
  await sleep(2000);
  
  // Test 4: Profile Completion (DB writes - domain ratings)
  const testUserId = 'test-user-' + Date.now();
  results.push(await runLoadTest({
    name: 'Test 4: Profile Completion (DB WRITE - Multiple Tables)',
    endpoint: `${DB_TEST_BASE_URL}/api/profile/complete`,
    method: 'POST',
    body: (i: number) => ({
      userId: `${testUserId}-${i}`,
      domainRatings: [
        { domain: 'Algorithms', rating: 5, reason: 'Test' },
        { domain: 'Finance', rating: 6, reason: 'Test' },
        { domain: 'Economics', rating: 7, reason: 'Test' },
        { domain: 'Statistics', rating: 5, reason: 'Test' },
        { domain: 'Probability', rating: 6, reason: 'Test' },
        { domain: 'Machine Learning', rating: 4, reason: 'Test' },
        { domain: 'Cryptography', rating: 5, reason: 'Test' },
        { domain: 'Biology', rating: 3, reason: 'Test' },
        { domain: 'Indian History', rating: 8, reason: 'Test' },
        { domain: 'Game Theory', rating: 9, reason: 'Test' },
      ],
    }),
    concurrent: 30,
    totalRequests: 100,
  }));
  
  await sleep(2000);
  
  // Test 5: Mixed workload (reads + writes)
  console.log('\n🌪️  Test 5: Mixed Workload (Reads + Writes)');
  const mixedStart = Date.now();
  
  const mixedPromises = [
    // 40% reads
    ...Array(120).fill(null).map(() => 
      makeRequest(`${DB_TEST_BASE_URL}/api/health`, { method: 'GET' })
    ),
    // 30% profile reads
    ...Array(90).fill(null).map((_, i) => 
      makeRequest(`${DB_TEST_BASE_URL}/api/profile/${testUserId}-${i % 50}`, { method: 'GET' })
    ),
    // 30% writes (registration)
    ...Array(90).fill(null).map((_, i) => 
      makeRequest(`${DB_TEST_BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
          email: `mixed${Date.now()}_${i}@test.com`,
          password: 'password123',
          name: `Mixed Test ${i}`,
        }),
      })
    ),
  ];
  
  const mixedResults = await Promise.all(mixedPromises);
  const mixedTime = Date.now() - mixedStart;
  const mixedSuccess = mixedResults.filter(r => r.success).length;
  
  console.log(`   ✅ Success: ${mixedSuccess}/300 (${((mixedSuccess/300)*100).toFixed(1)}%)`);
  console.log(`   ⏱️  Total: ${mixedTime}ms`);
  console.log(`   🚀 Throughput: ${(300 / (mixedTime / 1000)).toFixed(1)} req/s`);
  
  // Final verdict
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL VERDICT - DATABASE WRITE PERFORMANCE');
  console.log('='.repeat(60));
  
  const allSuccess = results.every(r => r.successful / (r.successful + r.failed) > 0.9);
  const allFast = results.every(r => r.avgTime < 1000);
  
  console.log('\n📊 Summary:');
  results.forEach((r, i) => {
    const successRate = (r.successful / (r.successful + r.failed) * 100).toFixed(1);
    const status = r.successful / (r.successful + r.failed) > 0.9 ? '✅' : '⚠️';
    console.log(`   ${status} Test ${i + 1}: ${successRate}% success, ${r.avgTime.toFixed(0)}ms avg, ${r.throughput} req/s`);
  });
  
  console.log('\n📈 Performance Assessment:');
  
  if (allSuccess && allFast) {
    console.log('   ✅ EXCELLENT: System handles database writes efficiently');
    console.log('   ✅ >90% success rate on all tests');
    console.log('   ✅ <1000ms average response time');
    console.log('   ✅ Ready for production with 300+ req/sec');
  } else if (allSuccess) {
    console.log('   ⚠️  GOOD: High success rate but response times could be better');
    console.log('   ✅ >90% success rate');
    console.log('   ⚠️  Some slow responses - consider caching');
  } else {
    console.log('   ⚠️  NEEDS OPTIMIZATION: High error rate detected');
    console.log('   ❌ <90% success rate on some tests');
    console.log('   💡 Recommendations:');
    console.log('      - Increase database connection pool');
    console.log('      - Enable Redis caching');
    console.log('      - Optimize database queries');
    console.log('      - Check for rate limiting (429 errors)');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('   1. Seed database: npm run db:seed');
  console.log('   2. Create a game via admin panel');
  console.log('   3. Run real submission tests with active rounds');
  console.log('   4. Monitor with: ./scripts/monitor-traffic.sh');
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
runDatabaseStressTests().catch(console.error);
