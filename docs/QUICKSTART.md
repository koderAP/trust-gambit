# 🚀 Trust Gambit - Quick Start Guide

## ✅ Docker Deployment - WORKING!

Your Docker deployment is now fully operational!

---

## 🌐 Access Your Application

### **Local Development:**
- **App URL**: http://localhost:3000
- **Admin Login**: http://localhost:3000/admin/login
- **Player Login**: http://localhost:3000/login
- **Health Check**: http://localhost:3000/api/health

### **Production (After Deployment):**
Replace `localhost:3000` with your domain:
- **Your Domain**: https://yourdomain.com
- **Admin Panel**: https://yourdomain.com/admin/login

---

## 🔑 Default Credentials

### **Admin Login:**
```
Username: admin
Password: admin123
```

**⚠️ IMPORTANT:** Change the default password after first login in production!

---

## 📦 Database Seeding

### **Seed Admin User**

**Quick Method (Use This):**
```bash
# Run the seed script
./scripts/seed-admin-docker.sh

# Or manually:
docker-compose exec postgres psql -U trustgambit -d trustgambit -c "
UPDATE \"Admin\" SET password = '\$2a\$12\$Nr.Vyu.RBFkrrTS3mp8.4eyXWWnlkWwGYf9v10z5cWus7C7cVyvhy' 
WHERE username = 'admin';
"

# Then restart the app
docker-compose restart app
```

**Default Credentials:**
- Username: `admin`
- Password: `admin123`

### **To Create Additional Admins:**
```bash
# Generate password hash locally first
cd /path/to/TrustGambit
node -e "require('bcryptjs').hash('yourpassword', 12).then(h => console.log(h))"

# Then insert with the generated hash
docker-compose exec postgres psql -U trustgambit -d trustgambit -c "
INSERT INTO \"Admin\" (id, username, password, \"createdAt\") 
VALUES ('admin-2', 'admin2', 'YOUR_GENERATED_HASH_HERE', NOW()) 
ON CONFLICT (username) DO NOTHING;
"
```

### **Create Dummy Players for Testing:**
```bash
# Option 1: Run seed script from local machine (requires Node.js)
npm run db:seed

# Option 2: Use the dummy players script
npx tsx scripts/seed-dummy-players.ts
```

---

## 🎮 First Steps After Deployment

### **1. Login as Admin**
```
1. Go to http://localhost:3000/admin/login
2. Username: admin
3. Password: admin123
```

### **2. Create Game Questions**
```
1. Go to Admin Dashboard → Questions tab
2. Add questions for both stages
3. Set correct answers and optional images
```

### **3. Start Your Game**
```
1. Players register at http://localhost:3000/register
2. Admin clicks "Create New Game" or "Assign Lobbies"
3. Admin clicks "Start Round" to begin
```

---

## 🔧 Common Docker Commands

### **View Logs**
```bash
# All containers
docker-compose logs -f

# Just the app
docker-compose logs -f app

# Last 50 lines
docker-compose logs --tail=50 app
```

### **Restart Services**
```bash
# Restart all
docker-compose restart

# Restart just the app
docker-compose restart app
```

### **Stop Everything**
```bash
# Stop containers (data persists)
docker-compose down

# Stop and remove all data (fresh start)
docker-compose down -v
```

### **Rebuild After Code Changes**
```bash
docker-compose up -d --build
```

### **Check Container Status**
```bash
docker-compose ps

# Should show:
# ✓ trustgambit-db (healthy)
# ✓ trustgambit-redis (healthy)  
# ✓ trustgambit-app (running)
```

---

## 🗄️ Database Management

### **Access PostgreSQL**
```bash
# Connect to database
docker-compose exec postgres psql -U trustgambit -d trustgambit

# Common queries:
# List all admins
SELECT * FROM "Admin";

# Count users
SELECT COUNT(*) FROM "User";

# View games
SELECT * FROM "Game";
```

### **Run Migrations**
```bash
# Migrations run automatically on container start
# To run manually:
docker-compose exec app npx prisma migrate deploy
```

### **Prisma Studio (Database GUI)**
```bash
# From your local machine (not in Docker):
npm run db:studio

# Access at: http://localhost:5555
```

---

## 🌍 Production Deployment

### **1. Set Environment Variables**

Create a `.env` file or set in your hosting platform:

```env
# Database (use your production database URL)
DATABASE_URL=postgresql://user:password@your-db-host:5432/trustgambit
POSTGRES_PASSWORD=your-strong-password

# NextAuth (REQUIRED!)
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
AUTH_TRUST_HOST=true

# Optional: Redis for scaling
REDIS_URL=redis://your-redis-host:6379

# Node Environment
NODE_ENV=production
```

### **2. Generate Secure Secrets**
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate strong password
openssl rand -base64 24
```

### **3. Deploy to Cloud Platform**

#### **DigitalOcean Droplet:**
```bash
# On your server:
git clone your-repo
cd TrustGambit
./scripts/deploy-to-droplet.sh
```

#### **DigitalOcean App Platform:**
```bash
# Connect your GitHub repo and set environment variables in the dashboard
# App Platform will handle the build and deployment automatically
```

#### **Any VPS with Docker:**
```bash
# On your server:
git clone your-repo
cd TrustGambit
cp .env.docker.example .env
# Edit .env with production values
docker-compose up -d --build
```

---

## 🔐 Security Checklist for Production

- [ ] Change default admin password
- [ ] Generate strong `NEXTAUTH_SECRET`
- [ ] Use strong database password
- [ ] Set `NEXTAUTH_URL` to your domain (https)
- [ ] Enable HTTPS/SSL (use reverse proxy like nginx)
- [ ] Restrict database access (firewall rules)
- [ ] Set up regular backups of postgres volume
- [ ] Monitor logs for suspicious activity
- [ ] Update dependencies regularly

---

## 📊 Monitoring

### **Check Application Health**
```bash
curl http://localhost:3000/api/health

# Should return:
{
  "status": "healthy",
  "timestamp": "...",
  "uptime": 123.45,
  "environment": "production"
}
```

### **Monitor Resource Usage**
```bash
# Container stats
docker stats trustgambit-app trustgambit-db trustgambit-redis

# Disk usage
docker system df
```

---

## 🐛 Troubleshooting

### **App won't start**
```bash
# Check logs
docker-compose logs app

# Common issues:
# - Database not ready → Wait for healthy status
# - Wrong DATABASE_URL → Check environment variables
# - Migration errors → Check Prisma schema
```

### **Can't login to admin panel**
```bash
# 1. Verify admin exists
docker-compose exec postgres psql -U trustgambit -d trustgambit -c "SELECT username FROM \"Admin\";"

# 2. Update admin password with correct hash
docker-compose exec postgres psql -U trustgambit -d trustgambit -c "
UPDATE \"Admin\" SET password = '\$2a\$12\$Nr.Vyu.RBFkrrTS3mp8.4eyXWWnlkWwGYf9v10z5cWus7C7cVyvhy' 
WHERE username = 'admin';
"

# 3. Restart the app
docker-compose restart app

# 4. Clear browser cache/cookies and try again
# 5. Use username: admin, password: admin123

# Still not working? Check app logs:
docker-compose logs app | grep -i "auth\|error"
```

**Common Issues:**
- **CSRF Error**: Clear browser cookies and try again
- **Wrong password**: Make sure you're using `admin123` (not `admin` as password)
- **Session issues**: Restart the app container
- **Browser cache**: Try incognito/private mode

### **Database connection failed**
```bash
# Check if database is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### **Port already in use**
```bash
# Change ports in docker-compose.yml
ports:
  - "8080:3000"  # Use 8080 instead of 3000
```

### **Clean slate (reset everything)**
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
# Then re-seed admin user (see Database Seeding)
```

---

## 📞 Support

- **Documentation**: See `DOCKER-DEPLOYMENT.md` for detailed deployment guide
- **Technical Details**: See `DOCKER-FIX-SUMMARY.md` for troubleshooting
- **Game Rules**: See `game.md` for gameplay mechanics
- **API Reference**: See `DOCUMENTATION.md` for API endpoints

---

## 🎯 What's Next?

1. ✅ **Test Locally**: Visit http://localhost:3000
2. ✅ **Login as Admin**: http://localhost:3000/admin/login (admin/admin123)
3. ✅ **Add Questions**: Create questions in admin dashboard
4. ✅ **Test with Players**: Register dummy users and start a test game
5. 🚀 **Deploy to Production**: Follow production deployment steps above
6. 🎉 **Run Your Competition**: Monitor from admin panel

---

**Your application is ready! Happy gaming! 🎮**
