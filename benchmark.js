import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://142.93.213.0/';

// Custom metrics
const registrationErrorRate = new Rate('registration_errors');
const loginErrorRate = new Rate('login_errors');
const profileCompletionTime = new Trend('profile_completion_time');

export const options = {
  stages: [

    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users

  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],              // Less than 5% errors
    http_req_duration: ['p(95)<2000', 'p(99)<3000'], // 95th percentile under 2s, 99th under 3s
    'group_duration{group:::User Onboarding}': ['p(95)<5000'],
    'group_duration{group:::User Login}': ['p(95)<1500'],
    'registration_errors': ['rate<0.05'],
    'login_errors': ['rate<0.05'],
  },
};

const DOMAINS = [
  'Algorithms', 'Astronomy', 'Biology', 'Crypto', 'Economics',
  'Finance', 'Game Theory', 'Indian History', 'Machine Learning',
  'Probability', 'Statistics'
];

export default function () {
  const jar = http.cookieJar();
  const uniqueId = `${__VU}-${__ITER}-${Date.now()}`;
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

    const registrationSuccess = check(registerRes, {
      'Registration successful (status 2xx)': (r) => r.status >= 200 && r.status < 300,
      'Registration response contains userId': (r) => {
        try {
          const id = r.json('userId');
          if (id) {
            userId = id;
            return true;
          }
        } catch (e) {
          console.error(`Registration JSON parse error: ${e}`);
        }
        return false;
      },
    });

    registrationErrorRate.add(!registrationSuccess);

    // 2️⃣ Complete profile if registered successfully
    if (userId) {
      const domainRatings = DOMAINS.map(domain => ({
        domain,
        rating: Math.floor(Math.random() * 10) + 1,
        reason: 'Self-assessed proficiency'
      }));

      const profilePayload = JSON.stringify({ userId, domainRatings });
      const profileStart = Date.now();
      const profileRes = http.post(`${BASE_URL}/api/profile/complete`, profilePayload, {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'CompleteProfile' },
      });

      profileCompletionTime.add(Date.now() - profileStart);

      check(profileRes, {
        'Profile completion successful (status 2xx)': (r) => r.status >= 200 && r.status < 300,
      });
    }
  });

  sleep(1);

  // --------------------- USER LOGIN ---------------------
  group('User Login', function () {
    const loginPayload = JSON.stringify({ email, password });

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
      jar, // attach cookie jar
    });

    const loginSuccess = check(loginRes, {
      'Login successful (status 2xx)': (r) => r.status >= 200 && r.status < 300,
    });

    loginErrorRate.add(!loginSuccess);
  });

  sleep(1);

  // --------------------- HEALTH CHECK ---------------------
  group('Health Check', function () {
    const healthRes = http.get(`${BASE_URL}/api/health`, {
      tags: { name: 'HealthCheck' },
    });

    check(healthRes, {
      'Health check successful (status 200)': (r) => r.status === 200,
    });
  });

  sleep(2);
}