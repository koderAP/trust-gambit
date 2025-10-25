# Implementation Notes & Optimizations

This document contains important implementation details, bug fixes, and optimizations made to the Trust Gambit application.

## Table of Contents
- [Admin Dashboard Optimizations](#admin-dashboard-optimizations)
- [Performance Fixes](#performance-fixes)
- [Round Auto-End Feature](#round-auto-end-feature)
- [Known Limitations](#known-limitations)

---

## Admin Dashboard Optimizations

### Data Refresh Strategy
The admin dashboard uses a selective polling approach to minimize server load:

**Overview Stats (Polled every 5 seconds):**
- Total Users
- Ready to Play (profile complete)
- In Lobbies (assigned players)
- Waiting for lobby assignment
- Incomplete profiles

**Detailed Data (On-demand refresh only):**
- Users List (via "Refresh Users" button)
- Lobbies Data (via "Refresh Lobbies" button)
- Active Game Data (via "Refresh Game" button)

**Key Files:**
- `app/admin/dashboard/page.tsx` - Main dashboard with selective polling
- `app/api/admin/game-state/route.ts` - Returns all game state data

### Admin Actions
Admin can perform these actions via API endpoints:

1. **Assign Players to Lobbies** - `/api/admin/assign-lobbies` (POST)
2. **Start New Game** - `/api/admin/start-game` (POST)
3. **Start Round** - `/api/admin/start-round` (POST)
4. **End Round** - `/api/admin/end-round` (POST)
5. **Calculate Scores** - `/api/admin/calculate-scores` (POST)

---

## Performance Fixes

### 1. Leaderboard N+1 Query Fix
**Problem:** Leaderboard endpoint made 16 database queries (1 + 15 users), resulting in 312ms average response time.

**Solution:** Replaced individual user queries with a single `findMany()` operation, grouping scores in memory.

**Results:**
- Reduced from 16 queries to 2 queries
- Response time: <50ms average (85% faster)
- File: `app/api/lobbies/[lobbyId]/leaderboard/route.ts`

### 2. Profile Completion Transaction
**Problem:** Profile completion involved 3 separate database operations that could fail independently.

**Solution:** Wrapped all operations in a Prisma transaction for atomicity.

**Benefits:**
- Data integrity guaranteed
- All operations succeed or rollback together
- File: `app/api/profile/complete/route.ts`

```typescript
await prisma.$transaction(async (tx) => {
  await tx.domainRating.deleteMany({ where: { userId } })
  await tx.domainRating.createMany({ data: domainRatingsData })
  await tx.user.update({ where: { id: userId }, data: { profileComplete: true } })
})
```

### 3. Stats Endpoint Optimization
**File:** `app/api/admin/stats/route.ts`

Optimized database queries using:
- Parallel Promise.all for independent queries
- Indexed fields for faster lookups
- Minimal data projection

---

## Round Auto-End Feature

### Problem
Rounds with time limits didn't automatically end when the timer expired. Admins had to manually click "End Round" even after the time was up.

### Solution
Created a background service that runs every 10 seconds to automatically end expired rounds.

**Implementation:**
1. **Service File:** `lib/roundAutoEnd.ts`
   - Queries for ACTIVE rounds where `startTime + durationSeconds <= now()`
   - Updates them to COMPLETED status with endTime
   - Logs auto-ended rounds

2. **Startup Integration:** `startup.ts`
   - Starts the auto-end service on application boot
   - Imported by `app/layout.tsx`

**How It Works:**
```
Round Created (startTime: 10:00:00, duration: 300s)
         ↓
Round Active (status: ACTIVE)
         ↓
5 minutes pass...
         ↓
Auto-End Service Checks (every 10s)
         ↓
Detects: 10:00:00 + 300s = 10:05:00 < now (10:05:08)
         ↓
Updates Round: status = COMPLETED, endTime = 10:05:08
         ↓
Round Ended ✅ (within 10 seconds of expiration)
```

**Service Logs:**
```
[Auto-End] 🚀 Starting round auto-end service (checking every 10s)
[Auto-End] 🔍 Checking for expired rounds... (0 rounds need ending)
[Auto-End] ✅ Round abc123 ended successfully
```

---

## Known Limitations

### Real-Time Updates (Socket.IO)
**Status:** ❌ Removed - incomplete implementation was causing performance issues

**What Was Attempted:**
- Created custom Next.js server with Socket.IO (`server.js`, `lib/socket/server.ts`)
- Added Socket.IO client hooks (`hooks/useSocket.ts`)
- Configured nginx proxy for WebSocket support
- Integrated event listeners in dashboards

**Why It Was Removed (October 25, 2025):**
- **Performance Issue**: Socket.IO client tried to connect on every page load, causing login slowdowns
- **Server Issue**: Next.js standalone build overwrites custom server.js
- **Partial Implementation**: Code existed but server never initialized (connection timeouts)
- **CORS Issues**: Configuration conflicts with nginx reverse proxy

**Current Solution:**
- Admin dashboard: Polls `/api/admin/game-state` every 5 seconds for overview stats
- Admin dashboard: Manual "Refresh" buttons for detailed data (Users, Lobbies, Game tabs)
- User dashboard: Manual refresh or page reload to see updates
- Round auto-end: Background service still works (checks every 10 seconds)

**Benefits of Removal:**
- ✅ Faster page loads (no connection timeout delays)
- ✅ Faster login (no Socket.IO connection attempts)
- ✅ Cleaner codebase (no incomplete features)
- ✅ Standard Next.js server (simpler deployment)

**Future Consideration:**
- Use Next.js API routes with Server-Sent Events (SSE) for real-time updates
- Implement WebSocket support via separate service (not Next.js server)
- Consider managed real-time services (Pusher, Ably, Supabase Realtime)
- Add polling-based "auto-refresh" toggle for user dashboards

---

## Testing & Monitoring

### Stress Testing
Use the provided benchmark script to test performance:

```bash
k6 run -e BASE_URL=http://localhost:3000 benchmark.js
```

### Manual Testing Scripts
Located in `/scripts/`:
- `check-game-status.ts` - Check current game state
- `check-stats.ts` - View admin stats
- `check-system-state.ts` - Overall system health
- `diagnose.ts` - Diagnostic information
- `clean-for-new-game.ts` - Reset for new game session

### Database Maintenance
```bash
# Reset database
npx prisma migrate reset

# Apply migrations
npx prisma migrate deploy

# Seed admin user
npm run seed
```

---

## Deployment Checklist

1. **Environment Variables** - Ensure all required vars are set in `.env`
2. **Database Migrations** - Run `npx prisma migrate deploy`
3. **Seed Admin User** - Run `npm run seed` or use `scripts/seed-admin-docker.sh`
4. **Docker Build** - `docker-compose up -d --build`
5. **Health Check** - Verify `/api/health` returns 200
6. **Admin Login** - Test admin dashboard access
7. **Smoke Test** - Create test users and verify basic flow

---

*Last Updated: October 25, 2025*
