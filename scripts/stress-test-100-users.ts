/**
 * Comprehensive Stress Test: 100 Concurrent Users
 * 
 * This script simulates 100 users who:
 * 1. Register and login
 * 2. Complete their profiles
 * 3. Continuously poll for available questions
 * 4. Randomly choose to SOLVE or DELEGATE when a question appears
 * 5. Maintain browser-like behavior with cookies and sessions
 * 
 * Usage:
 *   npx tsx scripts/stress-test-100-users.ts [baseUrl]
 * 
 * Example:
 *   npx tsx scripts/stress-test-100-users.ts http://localhost:3000
 *   npx tsx scripts/stress-test-100-users.ts https://your-domain.com
 */

import axios, { AxiosInstance } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const NUM_USERS = 100;
const POLL_INTERVAL_MS = 2000; // Check every 2 seconds
const MAX_DELEGATION_DEPTH = 3; // Maximum chain depth
const BATCH_SIZE = 20; // Process users in batches for parallel initialization

interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  client: AxiosInstance;
  cookieJar: CookieJar;
  userId?: string;
  currentRoundId?: string;
  hasSubmitted: boolean;
  isPolling: boolean;
  hasLoggedWaiting?: boolean;
}

interface RoundStatus {
  round: {
    id: string;
    status: string;
    question: string;
    roundNumber: number;
  };
  hasSubmitted: boolean;
}

// Generate random names
const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

function getRandomName(index: number): string {
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
  return `${firstName} ${lastName} ${index}`;
}

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Possible answers for different domains
const domainAnswers: { [key: string]: string[] } = {
  'general': ['Paris', 'London', 'Tokyo', 'New York', 'Berlin', 'Rome', 'Madrid', 'Beijing'],
  'science': ['Oxygen', 'Carbon', 'Hydrogen', 'Nitrogen', 'Water', 'DNA', 'Atom', 'Electron'],
  'math': ['42', '7', '10', '100', '3.14', '2.71', '1', '0'],
  'history': ['1776', '1492', '1945', '2000', 'Napoleon', 'Caesar', 'Lincoln', 'Washington'],
};

function getRandomAnswer(domain: string = 'general'): string {
  const answers = domainAnswers[domain] || domainAnswers['general'];
  return getRandomElement(answers);
}

async function createUser(index: number): Promise<User> {
  const cookieJar = new CookieJar();
  const client = wrapper(axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    jar: cookieJar,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
    maxRedirects: 5,
  }));

  return {
    id: index,
    email: `stresstest${index}@test.com`,
    password: `Password${index}!`,
    name: getRandomName(index),
    client,
    cookieJar,
    hasSubmitted: false,
    isPolling: false,
  };
}

async function registerUser(user: User): Promise<void> {
  try {
    console.log(`[User ${user.id}] Registering: ${user.email}`);
    
    const response = await user.client.post('/api/auth/register', {
      email: user.email,
      password: user.password,
      name: user.name,
    });

    if (response.data.userId) {
      user.userId = response.data.userId;
      console.log(`[User ${user.id}] ✅ Registered successfully (ID: ${user.userId})`);
    }
  } catch (error: any) {
    if (error.response?.status === 409 || error.response?.status === 400) {
      console.log(`[User ${user.id}] Already registered, attempting login...`);
      await loginUser(user);
    } else {
      console.error(`[User ${user.id}] ❌ Registration failed:`, error.response?.data || error.message);
      throw error;
    }
  }
}

async function loginUser(user: User): Promise<void> {
  try {
    console.log(`[User ${user.id}] Logging in: ${user.email}`);
    
    const response = await user.client.post('/api/auth/login', {
      email: user.email,
      password: user.password,
    });

    if (response.data.userId) {
      user.userId = response.data.userId;
      console.log(`[User ${user.id}] ✅ Logged in successfully (ID: ${user.userId})`);
    }
  } catch (error: any) {
    console.error(`[User ${user.id}] ❌ Login failed:`, error.response?.data || error.message);
    throw error;
  }
}

async function completeProfile(user: User): Promise<void> {
  try {
    console.log(`[User ${user.id}] Completing profile for userId: ${user.userId}`);
    
    // Generate random domain ratings (1-10 scale)
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

    const domainRatings = DOMAINS.map(domain => ({
      domain,
      rating: Math.floor(Math.random() * 10) + 1, // Random rating 1-10
      reason: `Interest level ${Math.floor(Math.random() * 10) + 1}`,
    }));
    
    const payload = {
      userId: user.userId,
      domainRatings,
    };
    
    await user.client.post('/api/profile/complete', payload);

    console.log(`[User ${user.id}] ✅ Profile completed`);
  } catch (error: any) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already completed')) {
      console.log(`[User ${user.id}] Profile already completed`);
    } else {
      console.error(`[User ${user.id}] ❌ Profile completion failed:`, error.response?.data || error.message);
    }
  }
}

// Utility: Sleep with jitter
async function sleep(ms: number, jitter: number = 0): Promise<void> {
  const actualMs = jitter > 0 ? ms + Math.random() * jitter - jitter / 2 : ms;
  return new Promise(resolve => setTimeout(resolve, actualMs));
}

// Utility: Exponential backoff retry
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.response?.status === 429) {
        const retryAfter = error.response.data?.retryAfter || Math.pow(2, attempt);
        const delay = retryAfter * 1000;
        
        if (attempt < maxRetries - 1) {
          await sleep(delay);
          continue;
        }
      }
      throw error;
    }
  }
  return null;
}

async function checkRoundStatus(user: User): Promise<any> {
  try {
    // Use the profile endpoint which includes currentRound info
    const response = await user.client.get(`/api/profile/${user.userId}`);
    const profile = response.data;
    
    // Check if there's an active round for this user
    if (profile.currentRound && profile.currentRound.status === 'ACTIVE') {
      // Check if this is a new round
      const isNewRound = user.currentRoundId !== profile.currentRound.id;
      
      return {
        round: profile.currentRound,
        hasSubmitted: isNewRound ? false : user.hasSubmitted,
      };
    }
    
    return null;
  } catch (error: any) {
    // Only log non-rate-limit errors
    if (error.response?.status !== 429 && error.response?.status !== 404) {
      console.error(`[User ${user.id}] Error checking round:`, error.response?.data || error.message);
    }
    return null;
  }
}

async function getOtherUsers(user: User, roundId: string): Promise<string[]> {
  try {
    const response = await user.client.get(`/api/rounds/${roundId}/results?userId=${user.userId}`);
    
    if (response.data.graph && response.data.graph.nodes) {
      return response.data.graph.nodes
        .filter((node: any) => node.id !== user.userId && !node.isCurrentUser)
        .map((node: any) => node.id);
    }
    
    return [];
  } catch (error) {
    return [];
  }
}

async function submitAnswer(user: User, roundId: string, allUsers: User[]): Promise<void> {
  try {
    const actions: ('SOLVE' | 'DELEGATE')[] = ['SOLVE', 'DELEGATE'];
    const action = getRandomElement(actions);
    
    let submission: any = {
      userId: user.userId,
      action,
      idempotencyKey: `${user.userId}-${roundId}-${Date.now()}`,
    };

    if (action === 'SOLVE') {
      // Get random answer based on round domain (if available)
      submission.answer = getRandomAnswer();
      console.log(`[User ${user.id}] Submitting SOLVE with answer: "${submission.answer}"`);
    } else {
      // DELEGATE - pick a random other user
      const otherUserIds = await getOtherUsers(user, roundId);
      
      if (otherUserIds.length === 0) {
        // Fallback: pick from all users except self
        const otherUsers = allUsers.filter(u => u.userId && u.userId !== user.userId);
        if (otherUsers.length > 0) {
          const targetUser = getRandomElement(otherUsers);
          submission.delegateTo = targetUser.userId;
        } else {
          // No one to delegate to, solve instead
          submission.action = 'SOLVE';
          submission.answer = getRandomAnswer();
          console.log(`[User ${user.id}] No delegation targets, switching to SOLVE`);
        }
      } else {
        submission.delegateTo = getRandomElement(otherUserIds);
      }
      
      if (submission.delegateTo) {
        console.log(`[User ${user.id}] Submitting DELEGATE to user: ${submission.delegateTo.slice(0, 8)}...`);
      }
    }

    // Use retry with exponential backoff for rate limit handling
    await retryWithBackoff(async () => {
      return await user.client.post(`/api/rounds/${roundId}/submit`, submission);
    }, 5, 1000);
    
    user.hasSubmitted = true;
    console.log(`[User ${user.id}] ✅ Submission successful (${submission.action})`);
  } catch (error: any) {
    // Only log if it's not a rate limit error (those are handled by retry)
    if (error.response?.status !== 429) {
      console.error(`[User ${user.id}] ❌ Submission failed:`, error.response?.data || error.message);
    } else {
      console.log(`[User ${user.id}] ⚠️  Rate limited after retries, will try again next poll`);
    }
  }
}

async function pollForQuestions(user: User, allUsers: User[]): Promise<void> {
  user.isPolling = true;
  
  console.log(`[User ${user.id}] 🔄 Started polling for questions...`);
  
  // Add random initial delay to spread out requests (0-2000ms jitter)
  const initialJitter = Math.random() * 2000;
  await new Promise(resolve => setTimeout(resolve, initialJitter));
  
  while (user.isPolling) {
    try {
      const roundStatus = await checkRoundStatus(user);
      
      // Check if there's an active round with valid data
      if (roundStatus && roundStatus.round && roundStatus.round.id) {
        const currentRound = roundStatus.round;
        
        // Check if this is a new round
        if (user.currentRoundId !== currentRound.id) {
          // New round detected!
          user.currentRoundId = currentRound.id;
          user.hasSubmitted = false;
          user.hasLoggedWaiting = false;
          console.log(`[User ${user.id}] 🎯 New question! Round ${currentRound.roundNumber}: "${currentRound.question}"`);
        }
        
        // Submit if we haven't submitted yet for this round
        if (!user.hasSubmitted) {
          // Staggered submission delay based on user ID (0-10 seconds spread)
          // This prevents all 100 users from submitting simultaneously
          const staggerDelay = (user.id * 100); // 0ms, 100ms, 200ms, ... up to 9900ms
          await new Promise(resolve => setTimeout(resolve, staggerDelay));
          
          // Additional random thinking time (1-3 seconds)
          const thinkingTime = Math.random() * 2000 + 1000;
          await new Promise(resolve => setTimeout(resolve, thinkingTime));
          
          await submitAnswer(user, currentRound.id, allUsers);
        }
      } else {
        // No active round - just waiting
        if (!user.hasLoggedWaiting) {
          console.log(`[User ${user.id}] ⏳ Waiting for round to start...`);
          user.hasLoggedWaiting = true;
        }
      }
      
      // Wait before next poll with jitter (±500ms) to spread requests
      const jitter = Math.random() * 1000 - 500; // -500ms to +500ms
      const pollDelay = Math.max(500, POLL_INTERVAL_MS + jitter); // Minimum 500ms
      await new Promise(resolve => setTimeout(resolve, pollDelay));
    } catch (error: any) {
      console.error(`[User ${user.id}] Polling error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS * 2));
    }
  }
}

async function initializeUser(user: User): Promise<boolean> {
  try {
    await registerUser(user);
    await completeProfile(user);
    return true;
  } catch (error) {
    console.error(`[User ${user.id}] ❌ Initialization failed`);
    return false;
  }
}

async function main() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 STRESS TEST: ${NUM_USERS} Concurrent Users`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`⏱️  Poll Interval: ${POLL_INTERVAL_MS}ms`);
  console.log(`🔧 Batch Size: ${BATCH_SIZE} (parallel initialization)`);
  console.log(`${'='.repeat(80)}\n`);

  // Create all users
  console.log(`📝 Creating ${NUM_USERS} user instances...`);
  const users: User[] = [];
  for (let i = 0; i < NUM_USERS; i++) {
    users.push(await createUser(i));
  }

  // Initialize users in batches with parallelization for speed
  console.log(`\n🔐 Initializing users in parallel batches of ${BATCH_SIZE}...`);
  
  const startTime = Date.now();
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(users.length / BATCH_SIZE);
    
    console.log(`\n📦 Batch ${batchNum}/${totalBatches} (users ${i}-${i + batch.length - 1})...`);
    
    const results = await Promise.allSettled(batch.map(user => initializeUser(user)));
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;
    
    console.log(`✅ ${successful}/${batch.length} successful${failed > 0 ? `, ❌ ${failed} failed` : ''}`);
    
    // Minimal delay between batches (100ms instead of 1000ms)
    if (i + BATCH_SIZE < users.length) {
      await sleep(100);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const initializedUsers = users.filter(u => u.userId);
  console.log(`\n✅ ${initializedUsers.length}/${NUM_USERS} users ready in ${elapsed}s`);

  if (initializedUsers.length === 0) {
    console.error('❌ No users initialized successfully. Exiting.');
    process.exit(1);
  }

  // Start polling for all users
  console.log(`\n🔄 Starting polling for ${initializedUsers.length} users...`);
  console.log(`Press Ctrl+C to stop\n`);

  const pollingPromises = initializedUsers.map(user => pollForQuestions(user, initializedUsers));

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⏹️  Stopping stress test...');
    initializedUsers.forEach(user => user.isPolling = false);
    setTimeout(() => {
      console.log('✅ Stress test stopped');
      process.exit(0);
    }, 2000);
  });

  // Keep the script running
  await Promise.race(pollingPromises);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
