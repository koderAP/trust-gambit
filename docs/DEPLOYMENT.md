# Deployment Guide

Complete guide for deploying Trust Gambit in development and production environments.

## Table of Contents

- [Quick Start (Local)](#quick-start-local)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Horizontal Scaling](#horizontal-scaling)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## Quick Start (Local)

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+ running locally
- Redis 7+ (optional)

### Installation

```bash
# Clone repository
git clone https://github.com/koderAP/trust-gambit.git
cd trust-gambit

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed questions (optional)
npx prisma db seed

# Start development server
npm run dev
```

Visit `http://localhost:3000`

---

## Docker Deployment

### Single Instance (Development)

```bash
# Build and start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Services Included

- **app**: Next.js application (port 3000)
- **postgres**: PostgreSQL 15 (port 5432)
- **redis**: Redis 7 (port 6379)
- **nginx**: Load balancer (port 80)

### Container Health Checks

```bash
# Check health endpoint
curl http://localhost/api/health

# Check specific container
docker logs trustgambit-app-1

# Check database
docker exec -it trustgambit-db psql -U trustgambit
```

---

## Production Deployment

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    nginx (Load Balancer)                     │
│          Rate Limiting, SSL, Static Files                    │
│                      Port 80/443                             │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─────┬─────┬─────┬─────┐
       ▼     ▼     ▼     ▼     ▼
    ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
    │App│ │App│ │App│ │App│ │App│  Next.js 14 Standalone
    │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │  512MB RAM, 1 CPU each
    └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘  WebSocket support
      │     │     │     │     │
      └─────┴─────┴─────┴─────┘
              │         │
              ▼         ▼
        ┌──────────┐ ┌───────┐
        │PostgreSQL│ │ Redis │  Shared resources
        │  15-alpine│ │7-alpine│  Connection pooling
        └──────────┘ └───────┘
```

### Multi-Instance Deployment (Recommended)

```bash
# Build images
docker-compose build app

# Start with 5 app instances
docker-compose up -d --scale app=5

# Verify all instances running
docker-compose ps

# Expected output:
# trustgambit-app-1     running
# trustgambit-app-2     running
# trustgambit-app-3     running
# trustgambit-app-4     running
# trustgambit-app-5     running
# trustgambit-db        running (healthy)
# trustgambit-redis     running (healthy)
# trustgambit-nginx     running (healthy)
```

### Why 5 Instances?

- **Single instance**: 3-4 registrations/second (CPU-bound bcrypt)
- **5 instances**: 16-17 registrations/second sustained
- **Linear scaling**: More instances = more throughput
- **Diminishing returns**: Beyond 10 instances, database becomes bottleneck

### Load Balancing Strategy

nginx uses **least connections** algorithm:
- Tracks active connections per instance
- Routes new requests to least busy instance
- Handles instance failures gracefully

**Configuration** (`nginx.conf`):
```nginx
upstream app_cluster {
    least_conn;
    server trustgambit-app-1:3000;
    server trustgambit-app-2:3000;
    server trustgambit-app-3:3000;
    server trustgambit-app-4:3000;
    server trustgambit-app-5:3000;
}
```

---

## Environment Configuration

### Required Environment Variables

Create `.env` file in project root:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trustgambit?schema=public"

# NextAuth Authentication
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_TRUST_HOST="true"

# Redis (optional but recommended for production)
REDIS_URL="redis://localhost:6379"

# Game Configuration
GAME_STAGE_1_ROUNDS=20
GAME_STAGE_2_ROUNDS=8

# Node Environment
NODE_ENV="production"
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Docker Environment Variables

For Docker deployment, set in `docker-compose.yml`:

```yaml
services:
  app:
    environment:
      - DATABASE_URL=postgresql://trustgambit:${DB_PASSWORD}@postgres:5432/trustgambit
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_TRUST_HOST=true
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
```

Then create `.env.docker` for sensitive values:
```bash
DB_PASSWORD=your_secure_password
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=https://yourdomain.com
```

Load with:
```bash
docker-compose --env-file .env.docker up -d --scale app=5
```

---

## Database Setup

### Initial Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed questions
npx prisma db seed
```

### Database Migrations (Production)

```bash
# Create migration
npx prisma migrate dev --name description_of_changes

# Deploy to production
npx prisma migrate deploy

# Reset database (DESTRUCTIVE - dev only)
npx prisma migrate reset
```

### Connection Pooling

PostgreSQL configuration (`docker-compose.yml`):
```yaml
postgres:
  image: postgres:15-alpine
  environment:
    - POSTGRES_DB=trustgambit
    - POSTGRES_USER=trustgambit
    - POSTGRES_PASSWORD=${DB_PASSWORD}
  command:
    - "postgres"
    - "-c"
    - "max_connections=200"  # 5 instances × 40 connections each
    - "-c"
    - "shared_buffers=256MB"
    - "-c"
    - "effective_cache_size=1GB"
```

App configuration (`lib/prisma.ts`):
```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
});

// Connection pooling (60 connections per instance)
prisma.$connect();
```

### Database Backup

```bash
# Backup database
docker exec trustgambit-db pg_dump -U trustgambit trustgambit > backup.sql

# Restore database
docker exec -i trustgambit-db psql -U trustgambit trustgambit < backup.sql

# Backup with compression
docker exec trustgambit-db pg_dump -U trustgambit trustgambit | gzip > backup.sql.gz

# Restore compressed backup
gunzip -c backup.sql.gz | docker exec -i trustgambit-db psql -U trustgambit trustgambit
```

---

## Horizontal Scaling

### How It Works

1. **Load Balancer (nginx)**: Distributes requests across instances
2. **Multiple App Instances**: Each runs independent Node.js process
3. **Shared Database**: All instances connect to same PostgreSQL
4. **Shared Cache**: Redis used for rate limiting and caching

### Scaling Up

```bash
# Scale to 10 instances
docker-compose up -d --scale app=10

# Verify
docker-compose ps | grep app
```

### Scaling Down

```bash
# Scale down to 3 instances
docker-compose up -d --scale app=3

# Gracefully stops and removes extra instances
```

### Instance Limits

| Instances | Throughput | Database Connections | Memory Usage |
|-----------|------------|---------------------|--------------|
| 1         | 3-4 reg/s  | 60                  | 512MB        |
| 5         | 16-17 reg/s| 300 (pooled to ~100)| 2.5GB        |
| 10        | 30-32 reg/s| 600 (pooled to ~150)| 5GB          |
| 20        | DB limited | 1200 (hits limit)   | 10GB         |

**Recommendation**: Start with 5 instances, scale as needed based on traffic.

### Sticky Sessions (WebSocket)

For WebSocket support, nginx must route to same instance:

```nginx
upstream app_cluster {
    least_conn;
    server trustgambit-app-1:3000;
    server trustgambit-app-2:3000;
    # ...
    
    # Enable sticky sessions based on IP
    ip_hash;
}
```

Already configured in `nginx.conf`.

---

## Monitoring & Maintenance

### Health Monitoring

```bash
# Check system health
curl http://localhost/api/health | jq

# Expected response:
{
  "status": "healthy",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy" },
    "redis": { "status": "healthy" },
    "memory": { "status": "healthy", "heapUsed": "45MB" }
  }
}
```

### Container Logs

```bash
# All containers
docker-compose logs -f

# Specific service
docker-compose logs -f app

# Follow specific instance
docker logs -f trustgambit-app-1

# Last 100 lines
docker logs --tail 100 trustgambit-app-1

# Filter for errors
docker logs trustgambit-app-1 2>&1 | grep -i error
```

### Resource Monitoring

```bash
# Real-time resource usage
docker stats

# Container resource limits
docker inspect trustgambit-app-1 | jq '.[0].HostConfig.Memory'

# Database connections
docker exec trustgambit-db psql -U trustgambit -c "SELECT count(*) FROM pg_stat_activity;"
```

### Traffic Monitoring

```bash
# nginx access logs
docker logs trustgambit-nginx | tail -100

# Request rate per endpoint
docker logs trustgambit-nginx | grep "POST /api/auth/register" | wc -l

# Active connections
docker exec trustgambit-nginx cat /var/log/nginx/access.log | tail -20
```

### Automated Monitoring Script

```bash
#!/bin/bash
# monitor.sh - Health check script

while true; do
    echo "=== $(date) ==="
    
    # Health check
    curl -s http://localhost/api/health | jq '.status'
    
    # Instance count
    echo "Instances: $(docker ps | grep trustgambit-app | wc -l)"
    
    # Database connections
    DB_CONN=$(docker exec trustgambit-db psql -U trustgambit -t -c "SELECT count(*) FROM pg_stat_activity;")
    echo "DB Connections: $DB_CONN"
    
    # Memory usage
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep trustgambit
    
    echo "---"
    sleep 30
done
```

Run with: `./monitor.sh`

---

## Troubleshooting

### Common Issues

#### 1. Containers Won't Start

```bash
# Check logs
docker-compose logs app

# Common causes:
# - DATABASE_URL not set correctly
# - PostgreSQL not ready (wait for health check)
# - Port 3000/80 already in use

# Solution: Check environment variables
docker-compose config | grep DATABASE_URL
```

#### 2. Database Connection Errors

```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection from app
docker exec trustgambit-app-1 nc -zv postgres 5432

# Check database logs
docker logs trustgambit-db --tail 50

# Common fix: Restart database
docker-compose restart postgres
```

#### 3. 502 Bad Gateway from nginx

```bash
# Check app instances are running
docker-compose ps app

# Check nginx upstream configuration
docker exec trustgambit-nginx nginx -t

# Check nginx can reach app instances
docker exec trustgambit-nginx nc -zv trustgambit-app-1 3000

# Solution: Restart nginx
docker-compose restart nginx
```

#### 4. High Memory Usage

```bash
# Check memory per instance
docker stats --no-stream | grep trustgambit-app

# Solution: Reduce number of instances or increase memory limit
# In docker-compose.yml:
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1024M  # Increase from 512M
```

#### 5. Database Connection Pool Exhausted

```bash
# Check active connections
docker exec trustgambit-db psql -U trustgambit -c "
  SELECT count(*), state 
  FROM pg_stat_activity 
  GROUP BY state;
"

# Solution: Increase max_connections or reduce connection pool per instance
# In docker-compose.yml:
postgres:
  command:
    - "postgres"
    - "-c"
    - "max_connections=300"  # Increase from 200
```

#### 6. Slow Round Start with 700+ Players

```bash
# Check logs for timing
docker logs trustgambit-app-1 | grep "Starting.*rounds"

# Should see:
# 🚀 Starting 49 rounds across 49 lobbies...
# ✅ Bulk started 49 rounds in 1ms

# If timeout errors, check maxDuration is set
grep -r "maxDuration" app/api/admin/start-round/route.ts

# Should see: export const maxDuration = 60;
```

### Performance Tuning

#### Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_lobby_game_active 
ON "Lobby" ("gameId", "isActive");

CREATE INDEX IF NOT EXISTS idx_round_lobby_status 
ON "Round" ("lobbyId", "status");

CREATE INDEX IF NOT EXISTS idx_submission_round_user 
ON "Submission" ("roundId", "userId");

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

#### Redis Cache Optimization

```bash
# Check Redis memory usage
docker exec trustgambit-redis redis-cli INFO memory

# Check cache hit rate
docker exec trustgambit-redis redis-cli INFO stats | grep keyspace

# Clear cache if needed
docker exec trustgambit-redis redis-cli FLUSHDB
```

#### nginx Optimization

```nginx
# Increase worker connections (nginx.conf)
events {
    worker_connections 2048;  # Default 1024
}

# Enable gzip compression
gzip on;
gzip_types text/plain application/json;
```

### Emergency Procedures

#### Full System Restart

```bash
# Stop all containers
docker-compose down

# Clear volumes (DESTRUCTIVE - loses data)
docker-compose down -v

# Rebuild and restart
docker-compose build
docker-compose up -d --scale app=5

# Verify health
curl http://localhost/api/health
```

#### Database Recovery

```bash
# Restore from backup
docker exec -i trustgambit-db psql -U trustgambit trustgambit < backup.sql

# Run migrations to ensure schema is current
docker exec trustgambit-app-1 npx prisma migrate deploy
```

#### Reset Game for New Competition

```bash
# Use admin wipe endpoint
curl -X POST http://localhost/api/admin/wipe-database \
  -H "Cookie: session-token" \
  -H "Content-Type: application/json"

# Or manually via database
docker exec trustgambit-db psql -U trustgambit -c "
  DELETE FROM \"Submission\";
  DELETE FROM \"Round\";
  DELETE FROM \"Lobby\";
  DELETE FROM \"Game\";
"

# Seed new questions
docker exec trustgambit-app-1 npx prisma db seed
```

---

## Security Considerations

### Production Checklist

- [ ] Use strong `NEXTAUTH_SECRET` (32+ bytes)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall (only 80/443 exposed)
- [ ] Use strong database passwords
- [ ] Enable PostgreSQL SSL connections
- [ ] Configure rate limiting appropriately
- [ ] Disable debug logs in production
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Enable Docker secrets for sensitive data

### SSL Configuration (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://app_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Database Security

```yaml
# docker-compose.yml - Production settings
postgres:
  environment:
    - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
  secrets:
    - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

## Performance Benchmarks

### Expected Performance (5 Instances)

| Metric | Value |
|--------|-------|
| Registration Rate | 16-17/sec sustained |
| API Throughput | 100 req/sec per instance |
| Database Connections | ~100 active (pooled) |
| Round Start (50 lobbies) | < 100ms |
| Memory per Instance | ~250-300MB average |
| CPU per Instance | ~15-30% under load |

### Load Testing

```bash
# Run stress test
ts-node scripts/stress-test-full-registration.ts

# Results:
# Target: 15 reg/sec
# Actual: 14.47 reg/sec
# Success Rate: 100%
# Average Time: 2.1s
```

---

## Support & Resources

- **Documentation**: [docs/](../README.md)
- **API Reference**: [API.md](./API.md)
- **Game Mechanics**: [game.md](./game.md)
- **GitHub Issues**: [trust-gambit/issues](https://github.com/koderAP/trust-gambit/issues)
- **Email**: support@trustgambit.com

---

**Last Updated**: October 2025
