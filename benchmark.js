import http from 'k6/http';
import { check, sleep, group } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://142.93.213.0';

export const options = {
  stages: [
    { duration: '5m', target: 300 },
    // { duration: '3m', target: 100 },
    // { duration: '1m', target: 200 },
    // { duration: '1m', target: 200 },
    // { duration: '2m', target: 100 },
    // { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    'group_duration{group:::User Onboarding}': ['p(95)<4000'],
    'group_duration{group:::Core Gameplay Loop}': ['p(95)<2000'],
  },
};

const DOMAINS = [
  'Algorithms', 'Finance', 'Economics', 'Statistics', 'Probability',
  'Machine Learning', 'Crypto', 'Biology', 'Indian History', 'Game Theory'
];

export default function () {
  const jar = http.cookieJar();
  const uniqueId = `${__VU}-${__ITER}`;
  const email = `user_${uniqueId}@test.com`;
  const password = `password_${uniqueId}`;
  const name = `Test User ${uniqueId}`;
  const hostelName = `Hostel ${(__VU % 12) + 1}`;
  let userId = null;

  // --------------------- USER ONBOARDING ---------------------
  group('User Onboarding', function () {
    // 1️⃣ Register user
    const registerPayload = JSON.stringify({ name, email, password, hostelName });
    const registerRes = http.post(`${BASE_URL}/api/auth/register`, registerPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'RegisterUser' },
    });

    check(registerRes, {
      'Registration successful (status 2xx)': (r) => r.status >= 200 && r.status < 300,
      'Registration response contains userId': (r) => {
        const id = r.json('userId');
        if (id) {
          userId = id;
          return true;
        }
        return false;
      },
    });

    // 2️⃣ Complete profile if registered successfully
    if (userId) {
      const domainRatings = DOMAINS.map(domain => ({
        domain,
        rating: Math.floor(Math.random() * 10) + 1,
        reason: 'Self-assessed proficiency'
      }));

      const profilePayload = JSON.stringify({ userId, domainRatings });
      const profileRes = http.post(`${BASE_URL}/api/profile/complete`, profilePayload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'CompleteProfile' },
      });

      check(profileRes, {
        'Profile completion successful (status 2xx)': (r) => r.status >= 200 && r.status < 300,
      });
    }
  });

  // --------------------- USER LOGIN ---------------------
  group('User Login', function () {
    const loginPayload = JSON.stringify({ email, password });

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
      jar, // attach cookie jar
    });

    check(loginRes, {
      'Login successful (status 2xx)': (r) => r.status >= 200 && r.status < 300,
    });
  });

  sleep(2);

  // --------------------- CORE GAMEPLAY LOOP ---------------------
  // group('Core Gameplay Loop', function () {
  //   const gameStateRes = http.get(`${BASE_URL}/api/game-state`, {
  //     tags: { name: 'GetGameState' },
  //     jar,
  //   });

  //   check(gameStateRes, {
  //     'Get Game State successful (status 200)': (r) => r.status === 200,
  //   });

  //   if (gameStateRes.status === 200) {
  //     const gameState = gameStateRes.json();
  //     const lobbyId = gameState.lobby ? gameState.lobby.id : null;
  //     const currentRound = gameState.currentRound;

  //     // Submit round action if active
  //     if (currentRound && currentRound.status === 'ACTIVE') {
  //       const actionPayload = JSON.stringify({
  //         action: 'SOLVE',
  //         answer: 'Option A',
  //         delegateTo: null,
  //       });

  //       const submitActionRes = http.post(
  //         `${BASE_URL}/api/rounds/start`,
  //         actionPayload,
  //         {
  //           headers: { 'Content-Type': 'application/json' },
  //           tags: { name: 'SubmitRoundAction' },
  //           jar,
  //         }
  //       );

  //       check(submitActionRes, {
  //         'Submit Action successful (status 200)': (r) => r.status === 200,
  //       });
  //     }

  //     // Check leaderboard
  //     if (lobbyId) {
  //       const leaderboardRes = http.get(`${BASE_URL}/api/lobbies/${lobbyId}/leaderboard`, {
  //         tags: { name: 'GetLeaderboard' },
  //         jar,
  //       });

  //       check(leaderboardRes, {
  //         'Get Leaderboard successful (status 200)': (r) => r.status === 200,
  //       });
  //     }
  //   }
  // });

  sleep(2);
}