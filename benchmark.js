import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { randomString } from 'k6/x/random';

// --------------------------------------------------------------------------------
// 							CONFIGURATION
// --------------------------------------------------------------------------------

// The base URL of the target system.
// Use an environment variable for flexibility: k6 run -e BASE_URL=http://142.93.213.0 benchmark.js
const BASE_URL = __ENV.BASE_URL || 'http://142.93.213.0';

export const options = {
  // Define test stages for a realistic load profile.
  // This simulates ramping up traffic, holding it, and then ramping down.
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 virtual users over 1 minute
    { duration: '3m', target: 50 },   // Stay at 50 virtual users for 3 minutes
    { duration: '1m', target: 100 },  // Ramp up to 100 virtual users over 1 minute
    { duration: '3m', target: 100 },  // Stay at 100 virtual users for 3 minutes
    { duration: '1m', target: 0 },    // Ramp down to 0 users
  ],
  // Define performance thresholds. If these are not met, the test will fail.
  thresholds: {
    'http_req_failed': ['rate<0.01'],      // HTTP errors should be less than 1%
    'http_req_duration': ['p(95)<800'],    // 95% of requests should be below 800ms
    'group_duration{group:::User Onboarding}': ['p(95)<3000'], // 95% of user onboardings should be under 3s
    'group_duration{group:::Core Gameplay Loop}': ['p(95)<1500'], // 95% of gameplay loops should be under 1.5s
  },
};

// --------------------------------------------------------------------------------
// 							TEST LOGIC
// --------------------------------------------------------------------------------

export default function () {
  // Each Virtual User gets its own cookie jar to manage sessions automatically.
  const jar = http.cookieJar();

  // --- SCENARIO 1: User Onboarding (Runs once per user) ---
  group('User Onboarding', function () {
    // Generate unique credentials for each virtual user.
    const uniqueId = `${__VU}-${__ITER}`;
    const email = `user_${uniqueId}@test.com`;
    const password = `password_${uniqueId}`;
    const name = `Test User ${uniqueId}`;

    // 1. Register a new user
    const registerRes = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        email: email,
        password: password,
        name: name,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'RegisterUser' },
      }
    );

    check(registerRes, {
      'Registration successful (status 2xx)': (r) => r.status >= 200 && r.status < 300,
      'Registration response contains user ID': (r) => r.json('user.id') !== null,
    });
    
    // Note: The docs state login is handled by NextAuth `signIn()`. This usually means
    // the client POSTs to a specific callback URL. We simulate that here.
    // This is a critical assumption - the exact path might need adjustment.
    const loginRes = http.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      {
        email: email,
        password: password,
        redirect: false,
        json: true
      },
      {
        tags: { name: 'Login' }
      }
    );

    check(loginRes, {
        'Login successful (status 200)': (r) => r.status === 200,
    });
    
    // 2. Complete the user profile
    const profilePayload = {
        hostelName: "Benchmark Hostel",
        domainRatings: {
            "ALGORITHMS": Math.floor(Math.random() * 11),
            "FINANCE": Math.floor(Math.random() * 11),
            "ECONOMICS": Math.floor(Math.random() * 11),
            "STATISTICS": Math.floor(Math.random() * 11),
            "PROBABILITY": Math.floor(Math.random() * 11),
            "MACHINE_LEARNING": Math.floor(Math.random() * 11),
            "CRYPTO": Math.floor(Math.random() * 11),
            "BIOLOGY": Math.floor(Math.random() * 11),
            "INDIAN_HISTORY": Math.floor(Math.random() * 11),
            "GAME_THEORY": Math.floor(Math.random() * 11)
        }
    };

    const completeProfileRes = http.post(
        `${BASE_URL}/api/profile/complete`,
        JSON.stringify(profilePayload),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'CompleteProfile' },
        }
    );

    check(completeProfileRes, {
        'Profile completion successful (status 200)': (r) => r.status === 200,
        'Profile completion response is success': (r) => r.json('success') === true,
    });

  });

  // Simulate user think time between onboarding and starting to play.
  sleep(2);

  // --- SCENARIO 2: Core Gameplay Loop (Runs repeatedly) ---
  group('Core Gameplay Loop', function () {
    let lobbyId = null;

    // 1. Get current game state
    const gameStateRes = http.get(`${BASE_URL}/api/game-state`, {
      tags: { name: 'GetGameState' },
    });

    check(gameStateRes, {
      'Get Game State successful (status 200)': (r) => r.status === 200,
      'Game State has a game status': (r) => typeof r.json('game.status') === 'string',
    });
    
    // Try to extract lobbyId and round details from the response
    if (gameStateRes.status === 200) {
        const gameState = gameStateRes.json();
        lobbyId = gameState.lobby ? gameState.lobby.id : null;

        // 2. If a round is active, submit an action
        const currentRound = gameState.currentRound;
        if (currentRound && currentRound.status === 'ACTIVE') {
            const submitActionRes = http.post(
                `${BASE_URL}/api/rounds/start`, // Endpoint from docs for submitting action
                JSON.stringify({
                    action: "SOLVE",
                    answer: "Option A", // A placeholder answer
                    delegateTo: null
                }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    tags: { name: 'SubmitRoundAction' },
                }
            );

            check(submitActionRes, {
                'Submit Action successful (status 200)': (r) => r.status === 200,
                'Submit Action response is success': (r) => r.json('success') === true,
            });
        }
    }

    // 3. Check the leaderboard if we have a lobby ID
    if (lobbyId) {
        const leaderboardRes = http.get(`${BASE_URL}/api/lobbies/${lobbyId}/leaderboard`, {
            tags: { name: 'GetLeaderboard' },
        });

        check(leaderboardRes, {
            'Get Leaderboard successful (status 200)': (r) => r.status === 200,
            'Leaderboard is an array': (r) => Array.isArray(r.json('leaderboard')),
        });
    }
  });

  // Simulate think time between game actions.
  sleep(5);
}