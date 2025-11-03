# Stress Testing - 100 Concurrent Users

This guide explains how to run comprehensive stress tests simulating 100 concurrent users.

## Overview

The stress test script (`stress-test-100-users.ts`) simulates realistic user behavior:

1. **Registration & Login** - Each user registers and logs in with credentials
2. **Profile Completion** - Completes their profile
3. **Continuous Polling** - Checks every 2 seconds if a question is available
4. **Random Actions** - When a question appears, randomly chooses to:
   - **SOLVE** - Submit a random answer
   - **DELEGATE** - Delegate to another random user
5. **Browser Simulation** - Uses cookies and sessions like a real browser

## Prerequisites

```bash
# Install required dependencies (already done)
npm install --save-dev axios axios-cookiejar-support tough-cookie @types/tough-cookie
```

## Usage

### Local Testing

```bash
# Test against local development server
npx tsx scripts/stress-test-100-users.ts http://localhost:3000
```

### Production Testing

```bash
# Test against production server
npx tsx scripts/stress-test-100-users.ts https://your-domain.com
```

### Custom Configuration

```bash
# Default uses http://localhost:3000 if no URL provided
npx tsx scripts/stress-test-100-users.ts
```

## What to Expect

### Console Output

```
================================================================================
🚀 STRESS TEST: 100 Concurrent Users
📍 Target: http://localhost:3000
⏱️  Poll Interval: 2000ms
================================================================================

📝 Creating 100 user instances...

🔐 Initializing users (batch size: 10)...
[User 0] Registering: stresstest0@test.com
[User 1] Registering: stresstest1@test.com
...
[User 0] ✅ Registered successfully (ID: abc123...)
[User 0] ✅ Profile completed
Batch 1: 10/10 users initialized
...

✅ 100/100 users ready

🔄 Starting polling for 100 users...
Press Ctrl+C to stop

[User 0] 🔄 Started polling for questions...
[User 1] 🔄 Started polling for questions...
...
[User 42] 🎯 Question available! Round 1: "What is the capital of France?"
[User 42] Submitting SOLVE with answer: "Paris"
[User 42] ✅ Submission successful (SOLVE)
[User 15] 🎯 Question available! Round 1: "What is the capital of France?"
[User 15] Submitting DELEGATE to user: def456...
[User 15] ✅ Submission successful (DELEGATE)
```

## Test Scenarios

### Scenario 1: Load Testing
Test how the system handles 100 concurrent users polling every 2 seconds:
- **Expected Load**: 50 requests/second during polling
- **Purpose**: Verify server can handle sustained load

### Scenario 2: Submission Burst
When a new question appears, all 100 users will try to submit within seconds:
- **Expected Load**: 100 concurrent submissions
- **Purpose**: Test database write performance and race condition handling

### Scenario 3: Delegation Chains
Random delegation creates complex chains:
- **Purpose**: Verify delegation graph calculation performance

## Monitoring

While the stress test runs, monitor:

1. **Server Resources**
   ```bash
   # On production server
   htop
   docker stats
   ```

2. **Database Performance**
   ```bash
   # Check database connections
   docker exec trustgambit-db psql -U postgres -d trustgambit -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **Redis Performance**
   ```bash
   # Check Redis info
   docker exec trustgambit-redis redis-cli INFO stats
   ```

4. **Application Logs**
   ```bash
   docker compose logs -f app
   ```

## Configuration

Edit the script to customize:

```typescript
const NUM_USERS = 100;           // Number of concurrent users
const POLL_INTERVAL_MS = 2000;   // Polling interval (milliseconds)
const MAX_DELEGATION_DEPTH = 3;  // Maximum delegation chain depth
```

## Stopping the Test

Press `Ctrl+C` to gracefully stop all users:

```
^C
⏹️  Stopping stress test...
✅ Stress test stopped
```

## Cleanup

After testing, you may want to remove test users:

```bash
# Connect to database
docker exec -it trustgambit-db psql -U postgres -d trustgambit

# Remove stress test users
DELETE FROM "User" WHERE email LIKE 'stresstest%@test.com';
```

Or use the cleanup script:

```typescript
// scripts/cleanup-stress-test-users.ts
import { prisma } from '../lib/prisma';

async function cleanup() {
  const result = await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'stresstest',
      },
    },
  });
  
  console.log(`Deleted ${result.count} stress test users`);
}

cleanup();
```

## Performance Metrics

The stress test helps identify:

- ✅ **Response Time**: How fast the server responds under load
- ✅ **Throughput**: Requests handled per second
- ✅ **Error Rate**: Failed requests under stress
- ✅ **Database Performance**: Query execution time with concurrent writes
- ✅ **Memory Usage**: Memory consumption patterns
- ✅ **CPU Usage**: CPU utilization under load

## Troubleshooting

### "Connection refused" errors
- Ensure the server is running at the specified URL
- Check firewall settings

### "Too many connections" errors
- Increase PostgreSQL max_connections
- Add connection pooling

### "Rate limit exceeded" errors
- Adjust POLL_INTERVAL_MS to reduce load
- Review rate limiting configuration

### Users fail to initialize
- Check server logs for errors
- Verify registration endpoint is working
- Ensure database is accessible

## Advanced Usage

### Test Specific Scenarios

```typescript
// Modify submitAnswer() to test specific behaviors:

// 1. All users SOLVE (no delegation)
const action = 'SOLVE';

// 2. All users DELEGATE (maximum chains)
const action = 'DELEGATE';

// 3. 80% delegate, 20% solve
const action = Math.random() < 0.8 ? 'DELEGATE' : 'SOLVE';
```

### Simulate Different Answer Quality

```typescript
// Mix of correct and incorrect answers
function getRandomAnswer(correctAnswer: string): string {
  // 30% chance of correct answer
  if (Math.random() < 0.3) {
    return correctAnswer;
  }
  return domainAnswers['general'][Math.floor(Math.random() * 8)];
}
```

## Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Stress Test
  run: |
    npm run build
    docker compose up -d
    sleep 10
    npx tsx scripts/stress-test-100-users.ts http://localhost:3000 &
    STRESS_PID=$!
    sleep 60  # Run for 1 minute
    kill $STRESS_PID
```

## Results Analysis

Monitor these key metrics:
- Response time p50, p95, p99
- Error rate percentage
- Successful submissions vs failures
- Delegation chain depth distribution
- Database query performance

Good luck with your stress testing! 🚀
