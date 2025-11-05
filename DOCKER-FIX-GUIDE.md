# Docker Compose 'ContainerConfig' Error - Fix Guide

## Problem
When deploying on Digital Ocean (http://142.93.213.0), you encounter this error:
```
KeyError: 'ContainerConfig'
ERROR: for trustgambit-db  'ContainerConfig'
ERROR: for trustgambit-redis  'ContainerConfig'
```

## Root Cause
This error occurs due to:
1. **Old Docker Compose version** (v1.29.2) incompatibility with newer Docker Engine
2. **Cached container metadata** from previous deployments
3. Docker Compose V1 trying to read container configs that no longer match the expected schema

## Solutions (In Order of Preference)

### ✅ Solution 1: Quick Fix Script (Recommended)

Upload and run the quick fix script:

```bash
# On your Digital Ocean server
cd ~/trust-gambit

# Make script executable
chmod +x scripts/quick-fix-deploy.sh

# Run the script
sudo ./scripts/quick-fix-deploy.sh
```

This script:
- Stops containers properly
- Cleans old container metadata (the key fix!)
- Rebuilds and restarts services
- **Preserves your database and volumes**

---

### ✅ Solution 2: Upgrade to Docker Compose V2 (Best Long-term Fix)

The root cause is using legacy `docker-compose` (V1). Upgrade to V2:

```bash
# On Digital Ocean server
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Verify installation
docker compose version

# Now use 'docker compose' (with space) instead of 'docker-compose'
cd ~/trust-gambit
docker compose down --remove-orphans
docker container prune -f
docker compose up --build -d
```

**Benefits:**
- Native Docker integration
- Better performance
- Active maintenance
- Fixes the ContainerConfig error permanently

---

### ✅ Solution 3: Manual Fix (If Scripts Don't Work)

Run these commands manually:

```bash
cd ~/trust-gambit

# Stop containers
docker-compose down --remove-orphans

# Clean old metadata (this is the critical step)
docker container prune -f

# Optional: clean images to save space
docker image prune -f

# Rebuild and start
docker-compose up --build -d
```

---

### ❌ Solution 4: Nuclear Option (Last Resort)

Only use this if you need to completely reset:

```bash
docker compose down --rmi all --volumes --remove-orphans && \
docker builder prune -af && \
docker volume prune -f && \
docker compose build --no-cache && \
docker compose up --build
```

**⚠️ WARNING:** This will:
- Delete ALL your database data
- Delete ALL Redis data
- Delete ALL images
- Require re-seeding the database

---

## Why This Happens

1. **Version Mismatch**: Docker Compose 1.29.2 (released in 2021) doesn't fully support newer Docker Engine API versions
2. **Metadata Cache**: When containers are stopped but not properly cleaned, old metadata remains
3. **Schema Change**: The container config structure changed between Docker versions

## Preventing This Issue

### Option A: Use Docker Compose V2 (Recommended)
```bash
# Install Docker Compose V2 plugin
sudo apt-get update
sudo apt-get install -y docker-compose-plugin

# Use 'docker compose' (V2) instead of 'docker-compose' (V1)
```

### Option B: Always Clean Metadata Before Deploy
Add this to your deployment workflow:
```bash
docker container prune -f
```

### Option C: Use the Deployment Scripts
We've created automated scripts:
- `scripts/deploy-fixed.sh` - Full deployment with upgrade
- `scripts/quick-fix-deploy.sh` - Quick fix without wiping data

---

## Deployment Workflow (Best Practice)

### For Regular Updates:
```bash
cd ~/trust-gambit

# Pull latest code
git pull origin main

# Quick fix deploy
sudo ./scripts/quick-fix-deploy.sh
```

### For First-Time Setup:
```bash
cd ~/trust-gambit

# Full deployment with upgrade
sudo ./scripts/deploy-fixed.sh
```

---

## Verification

After deployment, verify everything is working:

```bash
# Check service status
docker compose ps

# All services should show "healthy" or "running"

# Check logs
docker compose logs -f app

# Test the app
curl http://142.93.213.0/api/health

# Should return: {"status":"ok"}
```

---

## Common Commands

### Using Docker Compose V2:
```bash
docker compose up -d              # Start services
docker compose down               # Stop services
docker compose ps                 # View status
docker compose logs -f app        # View logs
docker compose restart app        # Restart app
```

### Using Docker Compose V1:
```bash
docker-compose up -d              # Start services
docker-compose down               # Stop services
docker-compose ps                 # View status
docker-compose logs -f app        # View logs
docker-compose restart app        # Restart app
```

---

## File Reference

- `/scripts/quick-fix-deploy.sh` - Quick deployment fix script
- `/scripts/deploy-fixed.sh` - Full deployment with upgrade
- `/docker-compose.yml` - Service configuration
- `/Dockerfile` - App container configuration

---

## Troubleshooting

### If services won't start:
```bash
# Check detailed logs
docker compose logs --tail=100

# Check specific service
docker compose logs postgres
docker compose logs redis
docker compose logs app
```

### If database connection fails:
```bash
# Verify postgres is healthy
docker compose ps postgres

# Check database logs
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U trustgambit -d trustgambit -c "SELECT 1;"
```

### If app shows errors:
```bash
# Check environment variables
docker compose config

# Restart just the app
docker compose restart app

# Rebuild app only
docker compose up --build -d app
```

---

## Summary

**Quick Fix (No Data Loss):**
```bash
docker container prune -f
docker-compose up --build -d
```

**Long-term Solution:**
```bash
sudo apt-get install -y docker-compose-plugin
docker compose up --build -d
```

**Use our scripts:**
```bash
sudo ./scripts/quick-fix-deploy.sh
```

The key is to clean old container metadata with `docker container prune -f` before deploying!
