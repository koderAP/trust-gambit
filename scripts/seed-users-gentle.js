#!/usr/bin/env node

// Gentle user seeding with rate limiting and retries
const https = require('https');
const http = require('http');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node seed-users-gentle.js <server-url> [number-of-users] [delay-ms]');
  console.log('Example: node seed-users-gentle.js http://142.93.213.0:3000 3000 200');
  process.exit(1);
}

const SERVER_URL = args[0];
const NUM_USERS = parseInt(args[1]) || 3000;
const DELAY_MS = parseInt(args[2]) || 200; // Delay between requests
const TIMESTAMP = Date.now();

console.log(`🚀 Gently seeding ${NUM_USERS} users to ${SERVER_URL}`);
console.log(`⏱️  Delay between requests: ${DELAY_MS}ms`);
console.log(`📧 Email prefix: player${TIMESTAMP}-`);
console.log('');

const DOMAINS = [
  'Algorithms', 'Finance', 'Economics', 'Statistics', 'Probability',
  'Machine Learning', 'Crypto', 'Biology', 'Indian History', 'Game Theory'
];

let successCount = 0;
let failedCount = 0;
let retryCount = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRequest(url, method, data, retries = 3) {
  return new Promise(async (resolve, reject) => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await makeRequestOnce(url, method, data);
        resolve(result);
        return;
      } catch (error) {
        if (attempt === retries) {
          reject(error);
        } else {
          retryCount++;
          await sleep(1000 * attempt); // Exponential backoff
        }
      }
    }
  });
}

function makeRequestOnce(url, method, data) {
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
      },
      timeout: 10000 // 10 second timeout
    };
    
    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(parsed.error || body));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          resolve({ error: body });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
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
    
    // Small delay between registration and profile completion
    await sleep(100);
    
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
  }
}

async function seedUsers() {
  const startTime = Date.now();
  
  console.log('Starting sequential seeding with rate limiting...\n');
  
  for (let i = 1; i <= NUM_USERS; i++) {
    const result = await createUser(i);
    
    if (result.success) {
      process.stdout.write(`✓ ${i}/${NUM_USERS} `);
    } else {
      process.stdout.write(`✗ ${i}/${NUM_USERS} `);
    }
    
    // Progress line break every 50 users
    if (i % 50 === 0) {
      const percent = Math.floor((i / NUM_USERS) * 100);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = (i / (Date.now() - startTime) * 1000).toFixed(1);
      console.log(`\n📊 Progress: ${i}/${NUM_USERS} (${percent}%) | ✓ ${successCount} ✗ ${failedCount} | ${rate} users/sec | ${elapsed}s elapsed`);
    }
    
    // Rate limiting - delay between requests
    if (i < NUM_USERS) {
      await sleep(DELAY_MS);
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgRate = (successCount / (Date.now() - startTime) * 1000).toFixed(2);
  
  console.log('\n\n============================================');
  console.log('📊 Seeding Complete!');
  console.log('============================================');
  console.log(`Total attempted: ${NUM_USERS}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`🔄 Retries: ${retryCount}`);
  console.log(`⏱️  Total duration: ${duration}s`);
  console.log(`📈 Average rate: ${avgRate} users/sec`);
  console.log('');
  console.log(`📧 Email pattern: player${TIMESTAMP}-N@trustgambit.com`);
  console.log(`🔑 Password (all users): password123`);
  console.log(`📍 Hostels: Distributed across Hostel 1-12`);
  console.log(`📊 Domain ratings: Random 1-10 for all 11 domains`);
  console.log('');
  console.log('✨ All successful users have completed profiles!');
  console.log('🎮 Ready to assign to lobbies and start game!');
  console.log('============================================');
}

seedUsers().catch(console.error);
