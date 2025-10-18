# Digital Ocean Deployment Guide

## The Problem

Your logs show:
```
Can't reach database server at `postgres:5432`
```

This happens because `postgres:5432` is a Docker Compose service name that only works when running with `docker-compose`. On Digital Ocean, you need to use the actual database URL.

---

## Solution: Update DATABASE_URL

### Option 1: Digital Ocean Managed Database (Recommended)

1. **Create a PostgreSQL Database**:
   - Go to Digital Ocean Dashboard → Databases
   - Click "Create" → "Database Cluster"
   - Choose PostgreSQL 15
   - Select Basic plan ($15/month) or Pro
   - Choose datacenter region

2. **Get Connection String**:
   - After creation, go to database → "Connection Details"
   - Copy the connection string (use "Connection String" or "Public Network")
   - It will look like:
   ```
   postgresql://doadmin:password@db-postgresql-xxx.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   ```

3. **Update Environment Variables**:
   - In Digital Ocean App Platform: Settings → App-Level Environment Variables
   - Update `DATABASE_URL` with the connection string from step 2

### Option 2: Use Database in Same Droplet

If you're deploying to a Droplet (VM) with Docker Compose:

**Update your `docker-compose.yml`** to expose PostgreSQL:

```yaml
services:
  app:
    # ... existing config
    environment:
      # Use the service name within Docker network
      DATABASE_URL: postgresql://trustgambit:changeme123@postgres:5432/trustgambit
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: trustgambit
      POSTGRES_PASSWORD: changeme123
      POSTGRES_DB: trustgambit
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"  # Expose if needed for external access
```

---

## Digital Ocean App Platform Deployment

### If Using App Platform (Not Docker):

1. **Create Database First**:
   ```
   Digital Ocean Dashboard → Databases → Create Database
   ```

2. **Deploy App**:
   ```
   Digital Ocean Dashboard → Apps → Create App → GitHub
   ```

3. **Configure Environment Variables**:
   
   Go to: Your App → Settings → Environment Variables
   
   **Required variables:**
   ```env
   DATABASE_URL=postgresql://doadmin:PASSWORD@your-db-host.db.ondigitalocean.com:25060/defaultdb?sslmode=require
   NEXTAUTH_URL=https://your-app.ondigitalocean.app
   NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
   AUTH_TRUST_HOST=true
   NODE_ENV=production
   ```

4. **Enable Trusted Sources** (for App Platform + Managed Database):
   - Go to Database → Settings → Trusted Sources
   - Add your App Platform app

---

## Digital Ocean Droplet (VM) Deployment

### Using Docker Compose on a Droplet:

1. **Create a Droplet**:
   - Ubuntu 22.04 LTS
   - Basic plan ($6-12/month)
   - Enable IPv6 and monitoring

2. **SSH into Droplet**:
   ```bash
   ssh root@your-droplet-ip
   ```

3. **Install Docker**:
   ```bash
   # Install Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   
   # Install Docker Compose
   apt-get update
   apt-get install -y docker-compose
   ```

4. **Clone Your Repository**:
   ```bash
   git clone https://github.com/koderAP/trust-gambit.git
   cd trust-gambit
   ```

5. **Create `.env` File**:
   ```bash
   cp .env.docker.example .env
   nano .env
   ```
   
   Update these values:
   ```env
   DATABASE_URL=postgresql://trustgambit:changeme123@postgres:5432/trustgambit
   NEXTAUTH_URL=http://your-droplet-ip:3000
   NEXTAUTH_SECRET=<your-generated-secret>
   AUTH_TRUST_HOST=true
   ```

6. **Deploy**:
   ```bash
   docker-compose up -d
   ```

7. **Check Logs**:
   ```bash
   docker-compose logs -f app
   ```

8. **Access Your App**:
   ```
   http://your-droplet-ip:3000
   ```

---

## Fix Your Current Deployment

### Quick Fix:

1. **Check your deployment method**:
   - Are you using App Platform or a Droplet?
   - Are you using Docker Compose or deploying without Docker?

2. **Update DATABASE_URL**:

   **For App Platform:**
   - Create a managed PostgreSQL database
   - Update `DATABASE_URL` in app settings
   
   **For Droplet with Docker Compose:**
   - Ensure `docker-compose.yml` has both `app` and `postgres` services
   - Use `postgres` as hostname (Docker network name)
   - Make sure containers are on same network

3. **Verify Connection**:
   ```bash
   # If using App Platform
   Check runtime logs for database connection
   
   # If using Droplet
   docker-compose exec app sh -c 'nc -zv postgres 5432'
   ```

---

## Troubleshooting Your Specific Error

### Error Analysis:

```
Can't reach database server at `postgres:5432`
```

**This means:**
- Your app is looking for hostname `postgres`
- This only exists in Docker Compose networks
- On App Platform, you need actual database host

### SSL Error:
```
error:0A00010B:SSL routines:ssl3_get_record:wrong version number
```

**This happens because:**
- The middleware tries to fetch `http://` endpoint
- But your deployment might be forcing HTTPS
- Or there's a protocol mismatch

**Fix the middleware** to not make HTTP requests in production:

---

## Updated Files for Digital Ocean

### 1. Update `middleware.ts`:

Remove the fetch call (it's causing the SSL error):

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Admin initialization is handled by health check endpoint
// No need to trigger it from middleware
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

The `/api/health` endpoint already handles admin initialization, so the middleware fetch is unnecessary and causes issues.

---

## Environment Variable Checklist

For Digital Ocean, you need:

```env
# Database - USE YOUR ACTUAL DATABASE URL
DATABASE_URL=postgresql://user:pass@actual-host:port/dbname?sslmode=require

# Auth - USE YOUR ACTUAL DOMAIN
NEXTAUTH_URL=https://your-actual-domain.com
NEXTAUTH_SECRET=<32-char-random-string>
AUTH_TRUST_HOST=true

# Node
NODE_ENV=production
```

**DO NOT USE:**
- ❌ `postgres:5432` (only for Docker Compose)
- ❌ `localhost` (doesn't work in containers)
- ❌ `http://localhost:3000` for NEXTAUTH_URL in production

---

## Next Steps

1. **Tell me your deployment method**:
   - Digital Ocean App Platform? (serverless)
   - Digital Ocean Droplet with Docker? (VPS)

2. **Update DATABASE_URL**:
   - Get the correct database connection string
   - Update in your deployment settings

3. **I'll help you**:
   - Fix the middleware issue
   - Set up proper environment variables
   - Get your deployment working

**Which deployment method are you using?**
