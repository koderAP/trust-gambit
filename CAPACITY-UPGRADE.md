# Server Capacity Upgrade Summary

## Target: 250 Simultaneous Users

### Changes Made

#### 1. PostgreSQL Database (docker-compose.yml)
**Before:**
- max_connections: 200
- shared_buffers: 256MB
- effective_cache_size: 1GB
- work_mem: 16MB

**After:**
- max_connections: **600** (3x increase)
- shared_buffers: **512MB** (2x increase)
- effective_cache_size: **2GB** (2x increase)
- work_mem: **8MB** (optimized for more concurrent queries)
- max_worker_processes: **8** (2x increase)
- max_parallel_workers: **8** (2x increase)
- max_wal_size: **2GB** (2x increase)

#### 2. Application Instances (docker-compose.yml)
**Before:**
- CPU limit: 1 core
- Memory limit: 512MB
- Connection limit per app: 60
- Total connections: 5 × 60 = 300 (OVERSUBSCRIBED!)

**After:**
- CPU limit: **2 cores** (2x increase)
- Memory limit: **1024MB** (2x increase)
- Connection limit per app: **100**
- Total connections: 5 × 100 = 500 (safe, under 600 max)

#### 3. Nginx Load Balancer (nginx.conf)
**Before:**
- worker_connections: 1024
- keepalive connections: 32
- Registration rate limit: 200 req/s
- API rate limit: 500 req/s
- Burst: 100

**After:**
- worker_connections: **2048** (2x increase)
- keepalive connections: **128** (4x increase)
- keepalive_requests: **1000**
- keepalive_timeout: **60s**
- Registration rate limit: **300 req/s** (1.5x increase)
- API rate limit: **800 req/s** (1.6x increase)
- Burst: **200** (2x increase)
- Multi-accept: **enabled**
- epoll: **enabled** (better Linux performance)

#### 4. Redis Cache
**Before:**
- maxmemory: 512mb

**After:**
- maxmemory: **1gb** (2x increase)

#### 5. Prisma Client (lib/prisma.ts)
**Before:**
- connection_limit: 50
- Comments mentioned 100-200 max connections

**After:**
- connection_limit: **100**
- Updated comments to reflect 600 max connections
- Pool timeout: 20s (unchanged, already optimized)

---

## Capacity Analysis

### Connection Budget
```
PostgreSQL max_connections: 600
Reserved for admin/migrations: 50
Available for apps: 550

App instances: 5
Connections per app: 100
Total used: 5 × 100 = 500

Remaining buffer: 50 connections (9% safety margin)
```

### User Capacity Calculation
```
Each active user requires ~2 DB connections
Available connections for users: 500
Theoretical max users: 500 / 2 = 250 users

With safety margin (80% utilization):
Safe capacity: 500 × 0.8 / 2 = 200 users

Peak burst capacity: 250+ users
```

### Resource Limits
| Resource | Previous | New | Increase |
|----------|----------|-----|----------|
| PostgreSQL connections | 200 | 600 | +200% |
| App CPU per instance | 1 core | 2 cores | +100% |
| App Memory per instance | 512MB | 1GB | +100% |
| Nginx connections | 1024 | 2048 | +100% |
| Redis memory | 512MB | 1GB | +100% |
| DB connection pool/app | 60 | 100 | +67% |
| API rate limit | 500/s | 800/s | +60% |

### Performance Expectations

**Sustained Load:**
- 200 simultaneous active users
- ~400-600 req/s throughput
- < 500ms average response time

**Peak Burst:**
- 250-300 simultaneous users
- ~800-1000 req/s throughput
- < 1000ms average response time

**Critical Fix:**
The previous configuration had a critical bottleneck where apps requested 300 connections but PostgreSQL only had 200 available. This is now fixed with 500 requested vs 600 available.

---

## Server Requirements

For optimal performance with these settings, ensure host machine has:
- **Minimum:**
  - 4 CPU cores
  - 8GB RAM
  - 50GB SSD storage

- **Recommended:**
  - 8 CPU cores
  - 16GB RAM
  - 100GB SSD storage
  - Good network bandwidth (100+ Mbps)

---

## Testing Recommendations

1. **Load Test with k6:**
   ```bash
   k6 run benchmark.js
   ```
   - Test with 200 VUs sustained
   - Test with 250 VUs burst

2. **Monitor Resources:**
   ```bash
   docker stats
   ```
   - Watch CPU and memory usage
   - Ensure no containers hit limits

3. **Database Monitoring:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```
   - Should stay under 500 connections
   - Monitor for connection pool exhaustion

4. **Nginx Logs:**
   ```bash
   docker logs trustgambit-nginx
   ```
   - Check for 429 (rate limit) errors
   - Verify load balancing distribution

---

## Rollback Instructions

If issues occur, revert to previous settings:

1. PostgreSQL max_connections: 200
2. App connection_limit: 60
3. App CPU/memory: 1 core / 512MB
4. Nginx worker_connections: 1024
5. Redis maxmemory: 512mb

Then restart: `docker-compose down && docker-compose up -d --build`
