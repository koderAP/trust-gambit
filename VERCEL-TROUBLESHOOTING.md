# Vercel Deployment Issues - Troubleshooting Guide

## Common Issue: Registration/Login Works in Docker but Not on Vercel

### Root Causes

1. **Database Connection Pooling** (Most Common)
2. **NEXTAUTH_URL Configuration**
3. **NEXTAUTH_SECRET Not Set**
4. **Prisma Client Issues**
5. **CORS/Trust Host Issues**

---

## Fix 1: Database Connection (CRITICAL for Vercel)

### Problem
Vercel uses serverless functions that create many database connections. Standard PostgreSQL URLs cause "too many connections" errors.

### Solution: Use Connection Pooling

#### Option A: Supabase (Recommended)
```env
# Use Transaction pooler (port 6543), not Direct connection (port 5432)
DATABASE_URL="postgresql://[user].[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

#### Option B: Neon
```env
# Neon automatically uses pooling
DATABASE_URL="postgresql://[user]:[password]@[host].neon.tech/[db]?sslmode=require"
```

#### Option C: Vercel Postgres
```env
# Vercel Postgres has built-in pooling
POSTGRES_URL="postgres://default:xxx@xxx-pooler.postgres.vercel-storage.com/verceldb?sslmode=require"
DATABASE_URL="${POSTGRES_URL}"
```

#### Option D: Prisma Data Proxy
```bash
# Set up Prisma Data Proxy
npx prisma generate --data-proxy
```
```env
DATABASE_URL="prisma://aws-us-east-1.prisma-data.com/?api_key=xxx"
```

---

## Fix 2: Update Prisma Client for Serverless

### Current Issue
The Prisma client needs special configuration for serverless environments.

### Solution

Update `/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Serverless-friendly connection settings
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pooling for serverless
    ...(process.env.NODE_ENV === 'production' && {
      // Limit connections in serverless environment
      datasources: {
        db: {
          url: process.env.DATABASE_URL + (
            process.env.DATABASE_URL?.includes('?') ? '&' : '?'
          ) + 'connection_limit=1&pool_timeout=10',
        },
      },
    }),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Disconnect on serverless function completion
export async function disconnectPrisma() {
  if (process.env.NODE_ENV === 'production') {
    await prisma.$disconnect()
  }
}
```

---

## Fix 3: NextAuth Configuration

### Check These Environment Variables in Vercel

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

**Required:**
```env
# Must be your actual Vercel URL
NEXTAUTH_URL=https://your-project.vercel.app

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=<your-secret-at-least-32-chars>

# Required for NextAuth v5
AUTH_TRUST_HOST=true

# Your database with connection pooling
DATABASE_URL=postgresql://...
```

### Important Notes:
- ✅ `NEXTAUTH_URL` must match your actual domain (no trailing slash)
- ✅ `NEXTAUTH_SECRET` must be set (not the example value)
- ✅ `AUTH_TRUST_HOST=true` is required for Vercel
- ✅ Use HTTPS in production (Vercel provides this automatically)

---

## Fix 4: Add Missing Environment Variable Check

Create `/lib/validateEnv.ts`:

```typescript
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please set these in your Vercel dashboard under Settings → Environment Variables'
    )
  }

  if (process.env.NEXTAUTH_SECRET === 'your-super-secret-key-change-this-in-production-use-openssl-rand-base64-32') {
    console.warn('⚠️  WARNING: Using default NEXTAUTH_SECRET. Change this in production!')
  }

  console.log('✅ Environment variables validated')
}
```

Update `/app/api/health/route.ts` to check:

```typescript
import { validateEnv } from '@/lib/validateEnv'

export async function GET() {
  try {
    // Validate environment on health check
    validateEnv()
    
    // ... rest of code
  }
}
```

---

## Fix 5: Update Next.js Config for Vercel

Update `/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Optimize for Vercel
  output: 'standalone',
  // Required for NextAuth
  experimental: {
    serverActions: {
      allowedOrigins: [
        process.env.NEXTAUTH_URL,
        '*.vercel.app',
      ].filter(Boolean),
    },
  },
  // Ensure all routes are dynamic for auth
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

---

## Fix 6: Check Prisma Schema

Ensure your `prisma/schema.prisma` has proper configuration:

```prisma
generator client {
  provider = "prisma-client-js"
  // Optimize for serverless
  previewFeatures = ["jsonProtocol"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Enable connection pooling
  directUrl = env("DATABASE_URL")
}
```

---

## Debugging Steps

### 1. Check Vercel Deployment Logs

Vercel Dashboard → Deployments → Select deployment → Runtime Logs

Look for:
- Database connection errors
- Environment variable issues
- Prisma errors

### 2. Test Each Endpoint

```bash
# Test database connection
curl https://your-project.vercel.app/api/health

# Test registration
curl -X POST https://your-project.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "test123"
  }'

# Test login
curl -X POST https://your-project.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

### 3. Check Database

If using Supabase:
- Go to Dashboard → Database → Tables
- Check if users are being created

If using Vercel Postgres:
```bash
vercel env pull .env.local
psql $DATABASE_URL -c "SELECT email FROM \"User\";"
```

### 4. Enable Debug Logging

Add to your API routes temporarily:

```typescript
export async function POST(request: Request) {
  console.log('🔍 Request received:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers),
  })
  
  try {
    const body = await request.json()
    console.log('📦 Request body:', body)
    
    // ... your code
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.error('Stack:', error.stack)
    throw error
  }
}
```

---

## Common Error Messages

### "Too many connections"
**Fix:** Use connection pooling URL (see Fix 1)

### "Invalid credentials" (but password is correct)
**Causes:**
1. User not created in database
2. Password hash comparison failing
3. Different database between local and Vercel

**Debug:**
```typescript
// Add to login route temporarily
console.log('User found:', !!user)
console.log('Password hash:', user?.password?.substring(0, 10))
console.log('Comparing with:', password)
const isValid = await bcrypt.compare(password, user.password)
console.log('Password valid:', isValid)
```

### "NEXTAUTH_URL is not set"
**Fix:** Add to Vercel environment variables

### "Prisma Client initialization failed"
**Fixes:**
1. Ensure `postinstall` script in package.json
2. Redeploy to trigger fresh build
3. Check DATABASE_URL format

---

## Checklist Before Deploying to Vercel

- [ ] Database URL uses connection pooling
- [ ] `NEXTAUTH_URL` set to Vercel domain
- [ ] `NEXTAUTH_SECRET` generated and set
- [ ] `AUTH_TRUST_HOST=true` set
- [ ] `postinstall` script in package.json
- [ ] All environment variables added to Vercel
- [ ] Prisma schema optimized for serverless
- [ ] Tested registration endpoint
- [ ] Tested login endpoint
- [ ] Checked Vercel logs for errors

---

## Quick Fix Commands

### Regenerate Prisma Client
```bash
vercel env pull .env.local
npx prisma generate
git add -A
git commit -m "fix: regenerate prisma client"
git push
```

### Trigger Redeploy
```bash
vercel --prod
```

### Check Environment Variables
```bash
vercel env ls
```

---

## Still Not Working?

1. **Export logs from Vercel** and check for specific errors
2. **Test locally with production environment**:
   ```bash
   NODE_ENV=production npm run build
   NODE_ENV=production npm start
   ```
3. **Compare working Docker vs Vercel**:
   - Check if same DATABASE_URL format
   - Verify NEXTAUTH_URL matches
   - Ensure all env vars present

4. **Try alternative deployment** (Railway/Render) to isolate if it's Vercel-specific

---

## Contact & Support

If issue persists:
1. Share Vercel runtime logs
2. Share environment variables (redact secrets)
3. Share error messages from browser console
4. Test if admin login works (to isolate auth vs database issue)
