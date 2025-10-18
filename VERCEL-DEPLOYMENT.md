# Vercel Deployment Guide

## Overview

Trust Gambit can be deployed on Vercel with automatic admin user creation. This guide covers Vercel-specific setup.

## Prerequisites

1. GitHub repository with Trust Gambit code
2. Vercel account (free tier works)
3. PostgreSQL database (Vercel Postgres, Supabase, or Neon)

## Deployment Steps

### 1. Database Setup

Choose a PostgreSQL provider:

**Option A: Vercel Postgres** (Recommended)
```bash
# In Vercel dashboard
# Storage → Create Database → PostgreSQL
# Copy the DATABASE_URL
```

**Option B: Supabase** (Free tier available)
```bash
# Sign up at supabase.com
# Create project → Copy connection string
# Use "connection pooling" URL for serverless
```

**Option C: Neon** (Generous free tier)
```bash
# Sign up at neon.tech
# Create project → Copy connection string
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project settings

### 3. Environment Variables

Add these in Vercel dashboard (Settings → Environment Variables):

```env
# Database
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Authentication
NEXTAUTH_URL="https://your-project.vercel.app"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_TRUST_HOST="true"

# Optional: Custom admin password
ADMIN_PASSWORD="your_secure_password"
```

**Generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 4. Deploy

```bash
# Push to GitHub triggers auto-deployment
git push origin main

# Or use Vercel CLI
npm i -g vercel
vercel --prod
```

## Admin Initialization on Vercel

### Automatic (Recommended)

Admin user is created automatically when the first request hits your app. Simply visit your site after deployment:

```bash
# Visit your site
https://your-project.vercel.app

# Or explicitly trigger initialization
curl https://your-project.vercel.app/api/init
```

### Verification

Check if admin was created:

```bash
# Visit health endpoint
curl https://your-project.vercel.app/api/health
```

Response should include:
```json
{
  "status": "healthy",
  "adminInitialized": true
}
```

### Login

Access admin dashboard at:
```
https://your-project.vercel.app/admin/login
```

**Default credentials:**
- Username: `admin`
- Password: `admin@123` (or your ADMIN_PASSWORD env var)

## Database Migration

Vercel builds run `prisma generate` automatically. For migrations:

### Option 1: Automatic (Recommended)
Add to `package.json`:

```json
{
  "scripts": {
    "build": "prisma generate && prisma db push && next build",
    "vercel-build": "prisma generate && prisma db push && next build"
  }
}
```

### Option 2: Manual via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Run migrations
vercel env pull .env.local
npx prisma db push
```

## Troubleshooting

### Admin Not Created

1. **Check deployment logs**
   - Vercel Dashboard → Deployments → Select deployment → View logs
   - Look for "✅ Admin user created" or error messages

2. **Manually trigger initialization**
   ```bash
   curl https://your-project.vercel.app/api/init
   ```

3. **Check database connection**
   ```bash
   # Add to your repo temporarily
   curl https://your-project.vercel.app/api/health
   ```

### Database Connection Issues

**Error: `prepared statement already exists`**
- Use connection pooling URL (Supabase/Neon provide this)
- Add `?pgbouncer=true` to DATABASE_URL

**Error: `too many connections`**
- Use connection pooler (PgBouncer)
- Upgrade database plan
- Use Vercel Postgres (built-in pooling)

### Build Failures

**Prisma errors:**
```bash
# Ensure postinstall script exists in package.json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

**TypeScript errors:**
- Already configured to ignore: `next.config.js` has `ignoreBuildErrors: true`

## Performance Optimization

### 1. Connection Pooling

For serverless, always use connection pooling:

```env
# Supabase pooler URL
DATABASE_URL="postgres://[user]:[pass]@[host]:6543/postgres?pgbouncer=true"

# Or use Prisma Data Proxy
DATABASE_URL="prisma://aws-us-east-1.prisma-data.com/?api_key=xxx"
```

### 2. Cold Starts

Vercel functions may have cold starts. First request after inactivity might be slow.

**Solutions:**
- Upgrade to Pro plan (keeps functions warm)
- Use external uptime monitor (ping every 5 minutes)
- Consider Railway/Render for always-on deployment

### 3. Redis (Optional)

For production with many concurrent users:

```bash
# Upstash Redis (serverless-friendly)
# Sign up at upstash.com
# Add to environment variables:
REDIS_URL="redis://default:xxx@xxx.upstash.io:6379"
```

## Custom Domain

1. Vercel Dashboard → Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Update environment variable:
   ```env
   NEXTAUTH_URL="https://yourdomain.com"
   ```

## Monitoring

### Application Monitoring

```bash
# Add health check to uptime monitor
https://your-project.vercel.app/api/health
```

Recommended services:
- UptimeRobot (free)
- Better Stack
- Vercel Analytics (built-in)

### Database Monitoring

Check your database provider's dashboard for:
- Connection count
- Query performance
- Storage usage

## Security Checklist

- [ ] Change default admin password after first login
- [ ] Use strong NEXTAUTH_SECRET (32+ characters)
- [ ] Enable HTTPS only (Vercel does this automatically)
- [ ] Set up custom domain with SSL
- [ ] Regular database backups
- [ ] Monitor error logs
- [ ] Keep dependencies updated

## Cost Estimate

**Free Tier (Hobby):**
- Vercel: Free (limited to personal projects)
- Database: Free tier from Supabase/Neon
- Redis: Optional (Upstash free tier: 10K requests/day)

**Production (Pro):**
- Vercel Pro: $20/month (keeps functions warm, better performance)
- Database: $5-25/month depending on provider
- Redis: $10/month for production load

## Comparison: Vercel vs Docker

| Feature | Vercel | Docker (VPS/Railway) |
|---------|--------|---------------------|
| Setup Time | 5 minutes | 15-30 minutes |
| Auto-scaling | ✅ Yes | ⚠️ Manual |
| Cost (small) | Free | $5-10/month |
| Cold starts | ⚠️ Yes | ✅ No |
| Persistent connections | ❌ No | ✅ Yes |
| WebSockets | ⚠️ Limited | ✅ Full support |
| Best for | MVP, demos | Production, real-time |

## Alternative: Railway (Docker-based)

If you need always-on deployment with WebSockets:

```bash
# Deploy Docker container to Railway
railway login
railway init
railway up
```

Railway automatically:
- Detects Dockerfile
- Runs migrations
- Provides PostgreSQL
- Gives you a URL

Cost: ~$5/month with free trial

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test database connection
4. Check `/api/health` endpoint
5. Review Prisma logs

For WebSocket/real-time features, consider:
- Railway (Docker-friendly)
- Render (similar to Railway)
- DigitalOcean App Platform
- AWS ECS/Fargate
