# 🚀 Quick Deployment Guide

## The Error You're Seeing

```
ERROR: for trustgambit-db  'ContainerConfig'
ERROR: for trustgambit-redis  'ContainerConfig'
KeyError: 'ContainerConfig'
```

## ⚡ Quick Fix (Choose One)

### Option 1: One-Line Fix (Fastest)
```bash
docker-compose down --remove-orphans && docker container prune -f && docker-compose up --build -d
```
**Or use the script:**
```bash
sudo ./scripts/one-line-fix.sh
```

### Option 2: Quick Fix Script (Recommended)
```bash
sudo ./scripts/quick-fix-deploy.sh
```

### Option 3: Full Deployment with Upgrade
```bash
sudo ./scripts/deploy-fixed.sh
```

## 🔑 The Solution

The error happens because of **cached container metadata**. The fix is simple:

```bash
docker container prune -f
```

This command removes old container metadata that's causing the conflict.

## ✅ What Each Script Does

### `one-line-fix.sh` - Fastest
- Stops containers
- Cleans metadata
- Rebuilds and starts
- **Keeps all your data**

### `quick-fix-deploy.sh` - Recommended
- Same as above + checks for Docker Compose V2
- Better error handling
- Shows service status

### `deploy-fixed.sh` - Most Complete
- Upgrades to Docker Compose V2 if needed
- Full health checks
- Detailed logging
- Best for first-time setup

## 📋 Step-by-Step Instructions

### On Your Digital Ocean Server:

1. **Navigate to your project:**
   ```bash
   cd ~/trust-gambit
   ```

2. **Pull latest code** (if you made changes):
   ```bash
   git pull origin main
   ```

3. **Run the fix:**
   ```bash
   sudo ./scripts/quick-fix-deploy.sh
   ```

4. **Verify it's working:**
   ```bash
   curl http://142.93.213.0/api/health
   ```

   Should return: `{"status":"ok"}`

## 🔄 For Future Deployments

**Every time you deploy, use:**
```bash
sudo ./scripts/quick-fix-deploy.sh
```

**Or the one-liner:**
```bash
docker container prune -f && docker-compose up --build -d
```

## ❌ DON'T Use This (Unless Necessary)

This wipes ALL your data:
```bash
docker compose down --rmi all --volumes --remove-orphans
```

Only use if you need to reset everything completely.

## 📊 Check Service Status

```bash
docker-compose ps
# or
docker compose ps
```

All services should show "healthy" or "running".

## 📝 View Logs

```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

## 🆘 If Problems Persist

1. **Check logs:**
   ```bash
   docker-compose logs --tail=200
   ```

2. **Restart specific service:**
   ```bash
   docker-compose restart app
   ```

3. **Full restart:**
   ```bash
   docker-compose restart
   ```

4. **Ask for help** with the full error logs.

## 🎯 What You Should Know

- ✅ The fix is simple: clean old metadata
- ✅ Your data (database, users) is preserved
- ✅ No need to wipe everything
- ✅ Use the scripts for easy deployment
- ⚠️ Upgrade to Docker Compose V2 for long-term solution

## 📚 More Information

See `DOCKER-FIX-GUIDE.md` for:
- Detailed explanation of the error
- Why it happens
- Multiple solutions
- Troubleshooting guide
- Best practices

---

**TL;DR:** Run `sudo ./scripts/quick-fix-deploy.sh` on your server. Done! ✨
