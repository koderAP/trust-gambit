import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const CONCURRENT_USERS = 300; // Simulate 300 concurrent users
const TOTAL_REQUESTS = 3000; // Total requests to make

interface TestResult {
  success: number;
  failed: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errors: string[];
}

async function makeRequest(url: string, options: any = {}): Promise<{ success: boolean; time: number; error?: string }> {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      timeout: 30000, // 30 second timeout
    });
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

async function testEndpoint(name: string, url: string, options: any = {}, concurrency: number = 10): Promise<TestResult> {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   URL: ${url}`);
  console.log(`   Concurrency: ${concurrency}`);
  
  const results: TestResult = {
    success: 0,
    failed: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity,
    errors: [],
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
          if (result.error && !results.errors.includes(result.error)) {
            results.errors.push(result.error);
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
  
  if (results.errors.length > 0) {
    console.log(`   ⚠️  Errors: ${results.errors.join(', ')}`);
  }
  
  return results;
}

async function runStressTests() {
  console.log('🚀 STRESS TEST SUITE FOR TRUST GAMBIT');
  console.log('=====================================\n');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Simulating: ${CONCURRENT_USERS} concurrent users\n`);
  
  const allResults: { name: string; result: TestResult }[] = [];
  
  // Test 1: Home Page Load
  const homePageResult = await testEndpoint(
    'Home Page Load',
    BASE_URL,
    {},
    CONCURRENT_USERS
  );
  allResults.push({ name: 'Home Page', result: homePageResult });
  
  // Test 2: Login Page Load
  const loginPageResult = await testEndpoint(
    'Login Page Load',
    `${BASE_URL}/login`,
    {},
    CONCURRENT_USERS
  );
  allResults.push({ name: 'Login Page', result: loginPageResult });
  
  // Test 3: Register Page Load
  const registerPageResult = await testEndpoint(
    'Register Page Load',
    `${BASE_URL}/register`,
    {},
    CONCURRENT_USERS
  );
  allResults.push({ name: 'Register Page', result: registerPageResult });
  
  // Test 4: Admin Login Endpoint (simulated load)
  const adminLoginResult = await testEndpoint(
    'Admin Login API (Concurrent)',
    `${BASE_URL}/api/admin/game-state`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
    50 // Lower concurrency for API
  );
  allResults.push({ name: 'Admin API', result: adminLoginResult });
  
  // Test 5: Concurrent Logins (simulate multiple users logging in)
  console.log('\n🔐 Testing Concurrent User Logins...');
  const loginPromises = [];
  const loginStart = Date.now();
  
  for (let i = 1; i <= 100; i++) {
    loginPromises.push(
      makeRequest(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `player${i}@iitd.ac.in`,
          password: 'password123',
        }),
      })
    );
  }
  
  const loginResults = await Promise.all(loginPromises);
  const loginTime = Date.now() - loginStart;
  const loginSuccess = loginResults.filter(r => r.success).length;
  
  console.log(`   ✅ ${loginSuccess}/100 logins successful in ${loginTime}ms`);
  console.log(`   ⏱️  Avg: ${(loginTime / 100).toFixed(2)}ms per login`);
  
  // Summary
  console.log('\n📊 STRESS TEST SUMMARY');
  console.log('======================\n');
  
  allResults.forEach(({ name, result }) => {
    const successRate = ((result.success / (result.success + result.failed)) * 100).toFixed(1);
    console.log(`${name}:`);
    console.log(`  Success Rate: ${successRate}%`);
    console.log(`  Avg Response: ${result.avgResponseTime.toFixed(2)}ms`);
    console.log(`  Max Response: ${result.maxResponseTime}ms`);
    console.log('');
  });
  
  // Overall verdict
  const totalSuccess = allResults.reduce((sum, { result }) => sum + result.success, 0);
  const totalRequests = allResults.reduce((sum, { result }) => sum + result.success + result.failed, 0);
  const overallSuccessRate = ((totalSuccess / totalRequests) * 100).toFixed(1);
  
  console.log('🎯 OVERALL VERDICT');
  console.log('==================');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Success Rate: ${overallSuccessRate}%`);
  
  if (parseFloat(overallSuccessRate) >= 95) {
    console.log('✅ PASS - System can handle the load!');
  } else if (parseFloat(overallSuccessRate) >= 85) {
    console.log('⚠️  WARN - System mostly stable but needs optimization');
  } else {
    console.log('❌ FAIL - System needs significant optimization');
  }
}

runStressTests().catch(console.error);
