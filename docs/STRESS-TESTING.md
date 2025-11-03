# Stress Testing Guide - Complete Setup

## 🎯 What You Have

A comprehensive stress testing system that simulates **100 concurrent users** behaving like real browsers:

### Features
- ✅ User registration and login with session management
- ✅ Profile completion
- ✅ Continuous polling (checks for questions every 2 seconds)
- ✅ Random actions: SOLVE (submit answer) or DELEGATE (to another user)
- ✅ Cookie-based authentication (like real browsers)
- ✅ Configurable number of users, poll interval, and duration
- ✅ Graceful shutdown
- ✅ Batch initialization to avoid overwhelming the server

## 🚀 Quick Start

### Option 1: Simple Command (Recommended)

```bash
# Test locally for 5 minutes with 100 users
./scripts/quick-stress-test.sh

# Test production for 10 minutes
./scripts/quick-stress-test.sh https://your-domain.com 100 600

# Test with 50 users for 2 minutes
./scripts/quick-stress-test.sh http://localhost:3000 50 120
```

### Option 2: Manual Control

```bash
# Start the stress test (runs until you press Ctrl+C)
npx tsx scripts/stress-test-100-users.ts http://localhost:3000

# When done, press Ctrl+C to stop gracefully
```

## 📋 Step-by-Step Usage

### 1. Prepare Your Server

```bash
# Start your server (if testing locally)
docker compose up --build

# Or if using npm
npm run dev
```

### 2. Run the Stress Test

```bash
# Local testing
npx tsx scripts/stress-test-100-users.ts http://localhost:3000

# Production testing
npx tsx scripts/stress-test-100-users.ts https://your-production-url.com
```

### 3. Monitor the Test

Watch the console output:

```
================================================================================
🚀 STRESS TEST: 100 Concurrent Users
📍 Target: http://localhost:3000
⏱️  Poll Interval: 2000ms
================================================================================

📝 Creating 100 user instances...
🔐 Initializing users (batch size: 10)...

[User 0] ✅ Registered successfully
[User 0] ✅ Profile completed
...

✅ 100/100 users ready

🔄 Starting polling for 100 users...
Press Ctrl+C to stop

[User 42] 🎯 Question available! Round 1: "What is the capital?"
[User 42] Submitting SOLVE with answer: "Paris"
[User 42] ✅ Submission successful (SOLVE)
...
```

### 4. Monitor Server Performance

Open another terminal and watch:

```bash
# Application logs
docker compose logs -f app

# Database connections
docker exec trustgambit-db psql -U postgres -d trustgambit -c "SELECT count(*) FROM pg_stat_activity;"

# Redis stats
docker exec trustgambit-redis redis-cli INFO stats

# System resources
docker stats

# Total users in database
docker exec trustgambit-db psql -U postgres -d trustgambit -c "SELECT count(*) FROM \"User\" WHERE email LIKE 'stresstest%';"
```

### 5. Stop the Test

Press `Ctrl+C` in the stress test terminal:

```
^C
⏹️  Stopping stress test...
✅ Stress test stopped
```

### 6. Cleanup Test Data

```bash
# Remove all stress test users
npx tsx scripts/cleanup-stress-test-users.ts
```

## 📊 What to Monitor

### Key Metrics

1. **Response Time**
   - Watch for slow responses
   - Check if latency increases over time

2. **Error Rate**
   - Any failed registrations?
   - Submission errors?
   - Database connection errors?

3. **Database Performance**
   - Connection pool usage
   - Query execution time
   - Lock contention

4. **Memory Usage**
   - Does memory keep increasing?
   - Any memory leaks?

5. **CPU Usage**
   - Consistent CPU usage?
   - Any CPU spikes?

6. **Delegation Chains**
   - Are chains forming correctly?
   - Any circular dependencies?

## 🎛️ Configuration

Edit `/scripts/stress-test-100-users.ts` to customize:

```typescript
const NUM_USERS = 100;           // Change to 50, 200, etc.
const POLL_INTERVAL_MS = 2000;   // Change to 1000, 5000, etc.
```

### Test Scenarios

**Light Load (25 users, 5s interval):**
```typescript
const NUM_USERS = 25;
const POLL_INTERVAL_MS = 5000;
```

**Medium Load (100 users, 2s interval):**
```typescript
const NUM_USERS = 100;
const POLL_INTERVAL_MS = 2000;
```

**Heavy Load (200 users, 1s interval):**
```typescript
const NUM_USERS = 200;
const POLL_INTERVAL_MS = 1000;
```

## 🧪 Testing Workflow

### Test 1: Registration Load
**Goal:** Verify registration handles concurrent users

```bash
npx tsx scripts/stress-test-100-users.ts http://localhost:3000
# Wait for all users to initialize
# Press Ctrl+C
```

**Success Criteria:**
- All 100 users register successfully
- No database errors
- Reasonable response times (<2s per registration)

### Test 2: Polling Load
**Goal:** Verify server handles sustained polling

```bash
npx tsx scripts/stress-test-100-users.ts http://localhost:3000
# Let it run for 5 minutes while no questions are available
```

**Success Criteria:**
- Server remains responsive
- Memory usage is stable
- CPU usage is acceptable
- No timeout errors

### Test 3: Submission Burst
**Goal:** Verify concurrent submission handling

```bash
# 1. Start stress test
npx tsx scripts/stress-test-100-users.ts http://localhost:3000

# 2. In another terminal, start a game and create a question
# (Use admin dashboard or API)

# 3. Watch as all 100 users try to submit simultaneously
```

**Success Criteria:**
- All submissions processed successfully
- Delegation graph calculated correctly
- No database deadlocks
- Scores calculated properly

## 🐛 Troubleshooting

### Problem: "Cannot find module 'axios'"
```bash
npm install --save-dev axios axios-cookiejar-support tough-cookie @types/tough-cookie
```

### Problem: "Connection refused"
- Check if server is running: `curl http://localhost:3000`
- Verify port 3000 is not blocked

### Problem: "Too many connections"
- Reduce NUM_USERS
- Increase PostgreSQL max_connections
- Add connection pooling

### Problem: Users fail to initialize
- Check server logs for errors
- Verify database is accessible
- Check if registration endpoint works manually

### Problem: High error rate during polling
- Increase POLL_INTERVAL_MS
- Check rate limiting configuration
- Verify server capacity

## 📝 Files Created

1. **`scripts/stress-test-100-users.ts`** - Main stress test script
2. **`scripts/cleanup-stress-test-users.ts`** - Cleanup script
3. **`scripts/quick-stress-test.sh`** - Quick start script
4. **`scripts/STRESS-TEST-README.md`** - Detailed documentation

## 🎓 Best Practices

1. **Start Small**: Begin with 10-25 users, then scale up
2. **Monitor First**: Watch metrics before increasing load
3. **Clean Up**: Always remove test users after testing
4. **Test Gradually**: Test registration, then polling, then submissions
5. **Use Production Mode**: Test with production builds for accurate results
6. **Check Logs**: Review logs for hidden errors

## 🚨 Warning

- **Don't run against production without permission**
- **Start with low numbers and scale up**
- **Monitor resource usage closely**
- **Clean up test data afterward**

## 📈 Expected Load

With 100 users polling every 2 seconds:
- **Polling**: ~50 requests/second
- **Burst**: 100 concurrent submissions when question appears
- **Database**: High write load during submissions

## ✅ Success Indicators

Your system is performing well if:
- ✅ All users initialize successfully
- ✅ Response times stay under 2 seconds
- ✅ Error rate < 1%
- ✅ Memory usage is stable
- ✅ Database handles concurrent writes
- ✅ Delegation chains form correctly
- ✅ Scores calculate accurately

## 🎯 Next Steps

1. Run the stress test
2. Monitor your metrics
3. Identify bottlenecks
4. Optimize as needed
5. Repeat with higher loads

Good luck! 🚀
