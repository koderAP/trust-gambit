#!/usr/bin/env node

// Fast user seeding with Node.js for better parallel execution
const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node seed-users.js <server-url> [number-of-users] [parallel-requests]');
  console.log('Example: node seed-users.js http://142.93.213.0:3000 3000 50');
  process.exit(1);
}

const SERVER_URL = args[0];
const NUM_USERS = parseInt(args[1]) || 3000;
const PARALLEL = parseInt(args[2]) || 50;
const TIMESTAMP = Date.now();

console.log(`🚀 Seeding ${NUM_USERS} users to ${SERVER_URL}`);
console.log(`⚡ Using ${PARALLEL} parallel requests`);
console.log(`📧 Email prefix: player${TIMESTAMP}-`);
console.log('');

const DOMAINS = [
  'Algorithms', 'Astronomy', 'Biology', 'Crypto', 'Economics',
  'Finance', 'Game Theory', 'Indian History', 'Machine Learning',
  'Probability', 'Statistics'
];

let successCount = 0;
let failedCount = 0;
let completedCount = 0;

function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: body });
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function createUser(i) {
  const email = `player${TIMESTAMP}-${i}@trustgambit.com`;
  const name = `Player ${i}`;
  const password = 'password123';
  const hostelName = `Hostel ${(i % 12) + 1}`;
  
  try {
    // Step 1: Register
    const registerData = JSON.stringify({ name, email, password, hostelName });
    const registerResp = await makeRequest(`${SERVER_URL}/api/auth/register`, 'POST', registerData);
    
    if (!registerResp.userId) {
      failedCount++;
      return { success: false, email, error: 'Registration failed' };
    }
    
    const userId = registerResp.userId;
    
    // Step 2: Complete profile
    const domainRatings = DOMAINS.map(domain => ({
      domain,
      rating: Math.floor(Math.random() * 10) + 1,
      reason: 'Self-assessed proficiency'
    }));
    
    const profileData = JSON.stringify({ userId, domainRatings });
    const profileResp = await makeRequest(`${SERVER_URL}/api/profile/complete`, 'POST', profileData);
    
    if (profileResp.error) {
      failedCount++;
      return { success: false, email, error: 'Profile completion failed' };
    }
    
    successCount++;
    return { success: true, email, userId };
    
  } catch (error) {
    failedCount++;
    return { success: false, email, error: error.message };
  } finally {
    completedCount++;
    if (completedCount % 100 === 0 || completedCount === NUM_USERS) {
      const percent = Math.floor((completedCount / NUM_USERS) * 100);
      process.stdout.write(`\r⏳ Progress: ${completedCount}/${NUM_USERS} (${percent}%) | ✓ ${successCount} | ✗ ${failedCount}`);
    }
  }
}

async function seedUsers() {
  const startTime = Date.now();
  
  // Create batches
  const batches = [];
  for (let i = 1; i <= NUM_USERS; i += PARALLEL) {
    const batch = [];
    for (let j = i; j < i + PARALLEL && j <= NUM_USERS; j++) {
      batch.push(createUser(j));
    }
    batches.push(batch);
  }
  
  // Process batches sequentially, but users in batch are parallel
  for (const batch of batches) {
    await Promise.all(batch);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n\n============================================');
  console.log('📊 Seeding Complete!');
  console.log('============================================');
  console.log(`Total attempted: ${NUM_USERS}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log('');
  console.log(`📧 Email pattern: player${TIMESTAMP}-N@trustgambit.com`);
  console.log(`🔑 Password (all users): password123`);
  console.log(`📍 Hostels: Distributed across Hostel 1-12`);
    console.log(`✅ Successfully seeded ${successCount}/${TOTAL} users in ${elapsed}ms (${avgTime}ms avg)`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log('');
  console.log(`📊 Domain ratings: Random 1-10 for all 11 domains`);
  console.log(`🏢 Hostel: Aravali, Kumaon, Nilgiri, or Satpura (random)`);
  console.log(`🔗 Server: ${SERVER_URL}`);
  console.log('');
  console.log('✨ All users have completed profiles!');
  console.log('🎮 Ready to assign to lobbies and start game!');
  console.log('============================================');
}

seedUsers().catch(console.error);
