#!/usr/bin/env node

/**
 * Auto-Answer Script for Trust Gambit
 * Automatically submits answer "1" for all users when answering window is open
 */

const BASE_URL = 'http://localhost:3000';

interface UserSession {
  userId: string;
  email: string;
  name: string;
  lobbyId: string | null;
  currentRound: {
    id: string;
    status: string;
    roundNumber: number;
  } | null;
}

async function loginUser(email: string, password: string): Promise<{ userId: string; success: boolean }> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      return { userId: '', success: false };
    }

    const data = await res.json();
    return { userId: data.userId || data.id, success: true };
  } catch (error) {
    return { userId: '', success: false };
  }
}

async function getUserProfile(userId: string): Promise<UserSession | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/profile/${userId}`);
    if (!res.ok) return null;
    
    const profile = await res.json();
    return {
      userId: profile.id,
      email: profile.email,
      name: profile.name,
      lobbyId: profile.lobbyId,
      currentRound: profile.currentRound,
    };
  } catch (error) {
    return null;
  }
}

async function submitAnswer(userId: string, roundId: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/rounds/${roundId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action: 'SOLVE',
        answer: '1',
      }),
    });

    return res.ok;
  } catch (error) {
    return false;
  }
}

async function autoAnswerForUsers(startPlayer: number, endPlayer: number) {
  console.log('🤖 AUTO-ANSWER SCRIPT STARTING');
  console.log('=' .repeat(50));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Players: ${startPlayer} to ${endPlayer} (Total: ${endPlayer - startPlayer + 1})`);
  console.log('Action: Submit answer "1" if round is ACTIVE\n');

  const totalUsers = endPlayer - startPlayer + 1;
  let loggedIn = 0;
  let inLobbies = 0;
  let activeRounds = 0;
  let submitted = 0;
  let alreadySubmitted = 0;
  let failed = 0;

  console.log('⏳ Processing users...\n');

  for (let i = startPlayer; i <= endPlayer; i++) {
    const email = `player${i}@iitd.ac.in`;
    const password = 'password123';

    // Login
    const { userId, success } = await loginUser(email, password);
    
    if (!success || !userId) {
      process.stdout.write(`❌ ${email.padEnd(30)} - Login failed\n`);
      failed++;
      continue;
    }

    loggedIn++;

    // Get profile to check round status
    const profile = await getUserProfile(userId);
    
    if (!profile) {
      process.stdout.write(`❌ ${email.padEnd(30)} - Profile fetch failed\n`);
      failed++;
      continue;
    }

    // Check if user is in a lobby
    if (!profile.lobbyId) {
      process.stdout.write(`⏸️  ${email.padEnd(30)} - Not in lobby\n`);
      continue;
    }

    inLobbies++;

    // Check if there's an active round
    if (!profile.currentRound || profile.currentRound.status !== 'ACTIVE') {
      process.stdout.write(`⏸️  ${email.padEnd(30)} - No active round (Lobby: ✓)\n`);
      continue;
    }

    activeRounds++;

    // Try to submit answer
    const submitSuccess = await submitAnswer(userId, profile.currentRound.id);
    
    if (submitSuccess) {
      process.stdout.write(`✅ ${email.padEnd(30)} - Submitted "1" for Round ${profile.currentRound.roundNumber}\n`);
      submitted++;
    } else {
      // Check if already submitted
      try {
        const checkRes = await fetch(`${BASE_URL}/api/rounds/${profile.currentRound.id}/submit`);
        const submissions = await checkRes.json();
        const hasSubmitted = submissions.submissions?.some((s: any) => s.userId === userId);
        
        if (hasSubmitted) {
          process.stdout.write(`⏭️  ${email.padEnd(30)} - Already submitted\n`);
          alreadySubmitted++;
        } else {
          process.stdout.write(`❌ ${email.padEnd(30)} - Submit failed\n`);
          failed++;
        }
      } catch {
        process.stdout.write(`❌ ${email.padEnd(30)} - Submit failed\n`);
        failed++;
      }
    }

    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Users:          ${totalUsers}`);
  console.log(`✅ Logged In:         ${loggedIn}`);
  console.log(`🏠 In Lobbies:        ${inLobbies}`);
  console.log(`🎯 Active Rounds:     ${activeRounds}`);
  console.log(`📝 Submitted "1":     ${submitted}`);
  console.log(`⏭️  Already Submitted: ${alreadySubmitted}`);
  console.log(`❌ Failed:            ${failed}`);
  console.log('='.repeat(50));

  if (submitted > 0) {
    console.log(`\n✨ Successfully submitted answer "1" for ${submitted} users!`);
  } else if (activeRounds === 0) {
    console.log('\n⏸️  No active rounds found. Admin needs to start a round first.');
  } else if (alreadySubmitted > 0) {
    console.log('\n⏭️  All users have already submitted for this round.');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: npx tsx scripts/auto-answer.ts <startPlayer> <endPlayer>');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/auto-answer.ts 1 100       # Answer for players 1-100');
  console.log('  npx tsx scripts/auto-answer.ts 1 3000      # Answer for all 3000 players');
  console.log('  npx tsx scripts/auto-answer.ts 501 1000    # Answer for players 501-1000');
  console.log('');
  console.log('Note: This script only submits if:');
  console.log('  1. User is in a lobby');
  console.log('  2. There is an ACTIVE round');
  console.log('  3. User has not already submitted');
  process.exit(1);
}

const startPlayer = parseInt(args[0]);
const endPlayer = parseInt(args[1] || args[0]);

if (isNaN(startPlayer) || isNaN(endPlayer) || startPlayer < 1 || endPlayer < startPlayer) {
  console.error('❌ Invalid player range. Please provide valid numbers.');
  process.exit(1);
}

console.log('Starting in 2 seconds...\n');
setTimeout(() => {
  autoAnswerForUsers(startPlayer, endPlayer).catch(console.error);
}, 2000);
