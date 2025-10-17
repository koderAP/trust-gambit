#!/usr/bin/env node

/**
 * Stress Test Suite for Trust Gambit
 * Tests system performance with 3000 players simulation
 */

const BASE_URL = 'http://localhost:3000';

async function makeRequest(url: string, options: any = {}): Promise<{ success: boolean; time: number; status?: number }> {
  const start = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });
    const time = Date.now() - start;
    return { success: response.ok, time, status: response.status };
  } catch (error) {
    const time = Date.now() - start;
    return { success: false, time };
  }
}

async function testConcurrentRequests(name: string, url: string, options: any, count: number) {
  console.log(`\n🧪 ${name}`);
  console.log(`   Concurrent requests: ${count}`);
  
  const start = Date.now();
  const promises = Array(count).fill(null).map(() => makeRequest(url, options));
  const results = await Promise.all(promises);
  const totalTime = Date.now() - start;
  
  const successful = results.filter(r => r.success).length;
  const failed = count - successful;
  const avgTime = results.reduce((sum, r) => sum + r.time, 0) / count;
  const maxTime = Math.max(...results.map(r => r.time));
  const minTime = Math.min(...results.map(r => r.time));
  
  console.log(`   ✅ Success: ${successful}/${count} (${((successful/count)*100).toFixed(1)}%)`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   ⏱️  Total time: ${totalTime}ms`);
  console.log(`   📊 Response times: ${minTime}ms / ${avgTime.toFixed(0)}ms / ${maxTime}ms (min/avg/max)`);
  console.log(`   🚀 Throughput: ${(count / (totalTime / 1000)).toFixed(1)} req/s`);
  
  return { successful, failed, avgTime, maxTime, totalTime };
}

async function runStressTests() {
  console.log('🚀 TRUST GAMBIT STRESS TEST SUITE');
  console.log('==================================\n');
  console.log(`Target: ${BASE_URL}`);
  console.log('Testing for 300+ concurrent users (3000 player capacity)\n');
  
  // Test 1: Home Page (300 concurrent)
  await testConcurrentRequests(
    'Test 1: Home Page Load (300 concurrent)',
    BASE_URL,
    {},
    300
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Cool down
  
  // Test 2: Login Page (300 concurrent)
  await testConcurrentRequests(
    'Test 2: Login Page Load (300 concurrent)',
    `${BASE_URL}/login`,
    {},
    300
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: API - Game State (100 concurrent)
  await testConcurrentRequests(
    'Test 3: Admin API - Game State (100 concurrent)',
    `${BASE_URL}/api/admin/game-state`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
    100
  );
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 4: Multiple Sequential Logins
  console.log('\n🔐 Test 4: Simulating User Logins (100 users)');
  const loginStart = Date.now();
  const loginPromises = [];
  
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
  
  console.log(`   ✅ ${loginSuccess}/100 successful`);
  console.log(`   ⏱️  Total: ${loginTime}ms (${(loginTime / 100).toFixed(1)}ms per login)`);
  console.log(`   🚀 Throughput: ${(100 / (loginTime / 1000)).toFixed(1)} logins/s`);
  
  // Test 5: Mixed Load (simulating real usage)
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('\n🌪️  Test 5: Mixed Load Test (50 concurrent, mixed endpoints)');
  
  const mixedStart = Date.now();
  const mixedPromises = [
    ...Array(20).fill(null).map(() => makeRequest(BASE_URL, {})),
    ...Array(20).fill(null).map(() => makeRequest(`${BASE_URL}/login`, {})),
    ...Array(10).fill(null).map(() => makeRequest(`${BASE_URL}/register`, {})),
  ];
  
  const mixedResults = await Promise.all(mixedPromises);
  const mixedTime = Date.now() - mixedStart;
  const mixedSuccess = mixedResults.filter(r => r.success).length;
  
  console.log(`   ✅ ${mixedSuccess}/50 successful (${((mixedSuccess/50)*100).toFixed(1)}%)`);
  console.log(`   ⏱️  Total: ${mixedTime}ms`);
  console.log(`   🚀 Throughput: ${(50 / (mixedTime / 1000)).toFixed(1)} req/s`);
  
  // Final Verdict
  console.log('\n' + '='.repeat(50));
  console.log('🎯 FINAL VERDICT');
  console.log('='.repeat(50));
  
  console.log('\n✅ If you see >95% success rates and <2000ms avg response times,');
  console.log('   your system can handle 300+ concurrent users.');
  console.log('\n⚠️  If response times >3000ms or success rate <90%,');
  console.log('   consider optimizing database queries and adding caching.');
  console.log('\n💡 Recommendations for Event Day:');
  console.log('   • Use connection pooling (already configured in Prisma)');
  console.log('   • Monitor server resources (CPU, Memory, DB connections)');
  console.log('   • Consider adding Redis for session caching');
  console.log('   • Set up load balancer if expecting >1000 concurrent users');
  console.log('   • Have database indexes on frequently queried fields');
}

console.log('Starting stress tests in 3 seconds...\n');
setTimeout(() => {
  runStressTests().catch(console.error);
}, 3000);
