# Platform Deployment Quick Reference

## Admin User - How It Works Everywhere

**TL;DR**: Admin user (`admin` / `admin@123`) is **automatically created** when anyone first visits your site. No manual action needed!

---

## Docker (Current Setup)

```bash
docker-compose up -d
# Admin created automatically during health check
# Access: http://localhost:3000/admin/login
```

**Verify:**
```bash
curl http://localhost:3000/api/health
# Should show: "adminInitialized": true
```

---

## Railway (Docker-based)

```bash
railway login
railway init
railway up
# Admin created automatically on first request
```

Similar to Docker but always-on (no cold starts).

---

## Key Points

### You DON'T Need To:
- ❌ Manually run database seeds
- ❌ SSH into servers to create admin
- ❌ Run special initialization scripts
- ❌ Call `/api/init` manually (though you can if you want)

### You DO Need To:
- ✅ Set up environment variables (DATABASE_URL, NEXTAUTH_SECRET, etc.)
- ✅ Deploy the application
- ✅ Visit your site (or wait for first user to visit)
- ✅ **Change the default password after first login!**

---

## Environment Variables

### Required for ALL platforms:

```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="<generate-with: openssl rand -base64 32>"
AUTH_TRUST_HOST="true"
```

### Optional:

```env
# Custom admin password (instead of default admin@123)
ADMIN_PASSWORD="your_secure_password"

# Redis for Socket.io (production only)
REDIS_URL="redis://..."
```

---

## Troubleshooting

### "How do I know admin was created?"

**Check health endpoint:**
```bash
curl https://your-domain.com/api/health
```

Look for: `"adminInitialized": true`

### "Admin login not working"

1. Visit `/api/health` to trigger initialization
2. Try default credentials: `admin` / `admin@123`
3. Check deployment logs for errors
4. Verify DATABASE_URL is correct

### "Which platform should I use?"

| Platform | Best For | Cost | Setup Time |
|----------|----------|------|------------|
| **Digital Ocean** | Production, Full control | $5-10/mo | 30 min |
| **Railway** | Production, WebSockets | $5/mo | 10 min |
| **Docker (VPS)** | Full control | $5-10/mo | 30 min |

---

## Quick Deploy Commands

### Digital Ocean
```bash
./scripts/deploy-to-droplet.sh
```

### Railway CLI
```bash
npm i -g railway
railway login
railway up
```

### Docker
```bash
docker-compose up -d
```

---

## Documentation Index

- 📘 [DIGITAL-OCEAN-DEPLOYMENT.md](DIGITAL-OCEAN-DEPLOYMENT.md) - Digital Ocean deployment
- 📗 [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md) - Docker setup
- 📙 [ADMIN-AUTO-SEED.md](ADMIN-AUTO-SEED.md) - Admin seeding details
- 📕 [QUICKSTART.md](QUICKSTART.md) - Local development
- 📔 [DOCUMENTATION.md](DOCUMENTATION.md) - Complete docs

---

**Questions?** Check the troubleshooting sections in the platform-specific guides above.
