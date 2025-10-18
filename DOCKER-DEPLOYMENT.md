# Docker Deployment Guide for Trust Gambit

## 🐳 Quick Start

### 1. Install Dependencies (Fix NextAuth Conflict)
```bash
# Remove the conflicting package
npm uninstall @next-auth/prisma-adapter

# Install fresh dependencies
npm install
```

### 2. Create Environment File
```bash
cp .env.example .env.docker
```

Edit `.env.docker`:
```env
# Database
DATABASE_URL=postgresql://trustgambit:changeme123@postgres:5432/trustgambit
POSTGRES_PASSWORD=changeme123

# NextAuth (CHANGE THESE IN PRODUCTION!)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-secure-random-string-here

# Optional: Redis for Socket.io
REDIS_URL=redis://redis:6379
```

### 3. Build and Run with Docker Compose
```bash
# Build and start all services
docker-compose up -d --build

# Check logs
docker-compose logs -f app

# Access the app
open http://localhost:3000
```

### 4. Run Database Migrations
```bash
# This runs automatically in docker-compose.yml
# But you can run manually if needed:
docker-compose exec app npx prisma migrate deploy
```

### 5. Seed Initial Data (Optional)
```bash
# Create admin user
docker-compose exec app npx tsx prisma/seed.ts
```

---

## 🔧 Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Just the database
docker-compose logs -f postgres
```

### Stop Services
```bash
docker-compose down
```

### Stop and Remove Volumes (Clean Slate)
```bash
docker-compose down -v
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build app
```

### Access Database
```bash
docker-compose exec postgres psql -U trustgambit -d trustgambit
```

### Run Prisma Studio
```bash
docker-compose exec app npx prisma studio
```

---

## 🚀 Production Deployment

### Generate Secure Keys
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

### Environment Variables for Production
```env
DATABASE_URL=postgresql://user:pass@your-db-host:5432/trustgambit
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-generated-secret-here
POSTGRES_PASSWORD=strong-password-here
```

### Deploy to Cloud Platforms

#### Option 1: Docker on VPS (DigitalOcean, AWS EC2, etc.)
```bash
# On your server
git clone your-repo
cd TrustGambit
cp .env.example .env
# Edit .env with production values
docker-compose up -d --build
```

#### Option 2: Kubernetes
Convert docker-compose to k8s manifests or use Helm charts.

#### Option 3: Cloud Run / ECS / Azure Container Instances
Push image to registry and deploy.

---

## 🐛 Troubleshooting

### Error: "Prisma Client not found"
```bash
docker-compose exec app npx prisma generate
docker-compose restart app
```

### Error: "Database connection failed"
```bash
# Check if postgres is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify connection
docker-compose exec postgres pg_isready -U trustgambit
```

### Error: "Port 3000 already in use"
```bash
# Change port in docker-compose.yml
ports:
  - "8080:3000"  # Map to port 8080 instead
```

### Rebuild from Scratch
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

---

## 📊 Performance Optimization

### Production Best Practices
1. **Use environment variables** for all configs
2. **Enable Redis** for Socket.io scaling
3. **Use CDN** for static assets
4. **Enable gzip compression** (already enabled)
5. **Set up database connection pooling**
6. **Use reverse proxy** (nginx) for SSL termination

### Scale with Multiple Replicas
```yaml
# In docker-compose.yml
app:
  deploy:
    replicas: 3
```

---

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Generate strong NEXTAUTH_SECRET
- [ ] Use HTTPS in production
- [ ] Restrict database access
- [ ] Enable firewall rules
- [ ] Regular backups of postgres volume
- [ ] Update dependencies regularly

---

## 📝 Notes

- **Standalone Output**: Next.js builds in standalone mode for smaller Docker images
- **Multi-stage Build**: Optimized for production with minimal image size
- **Health Checks**: Automatic health monitoring for all services
- **Volumes**: Data persists even after container restart

---

## 🆘 Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Ensure ports are not in use
4. Try rebuilding: `docker-compose up -d --build`
