# Trust Gambit

**A strategic game theory competition where trust, delegation, and problem-solving converge.**

A multiplayer web application where 120+ players navigate 28 rounds across 10 knowledge domains. Success depends on solving problems, building trust networks, and strategic delegation.

## 🚀 Quick Start

### Docker Deployment (Recommended for Production)

```bash
# Clone and navigate
git clone <your-repo-url>
cd TrustGambit

# Configure environment
cp .env.docker.example .env

# Start containers
docker-compose up -d

# Access at http://localhost:3000
# Admin credentials: admin / admin@123 (auto-created)
```

**Admin user is automatically created on startup** - no manual seeding required!

📖 See [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md) for full deployment guide  
📖 See [ADMIN-AUTO-SEED.md](ADMIN-AUTO-SEED.md) for admin seeding details

### Local Development

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
npx prisma generate
npx prisma db push

# Run development server
npm run dev
```

Visit **http://localhost:3000**

## 🎮 What is Trust Gambit?

A game theory webapp that explores trust dynamics through strategic gameplay:

- **Stage 1**: 120 players in 8 pools of 15 (20 rounds) → Top 2 from each pool advance
- **Stage 2**: 16 finalists compete (8 rounds) → Top 3 win

Each round, choose: **Solve**, **Delegate**, or **Pass**. Scores propagate through delegation chains with bonuses for trust and penalties for cycles.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth v5
- **Database**: PostgreSQL 15 + Prisma ORM
- **Styling**: shadcn/ui components
- **Deployment**: Docker with multi-stage builds

## 📚 Documentation

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
- **[Docker Deployment](DOCKER-DEPLOYMENT.md)** - Production deployment with Docker
- **[Admin Auto-Seeding](ADMIN-AUTO-SEED.md)** - How admin users are automatically created
- **[Complete Documentation](DOCUMENTATION.md)** - Setup, admin guide, game mechanics
- **[Game Rules](game.md)** - Detailed scoring system and examples
- **[State Machine](state-machine.md)** - Game flow and status transitions

## 📊 Admin Dashboard

Access admin panel at `/admin/login` with credentials:
- Username: `admin`
- Password: `admin@123`

⚠️ **Change password after first login in production!**

### Admin Capabilities

1. **Lobby Management**: Create/assign players to lobbies
2. **Round Control**: Start/end rounds for each stage
3. **Game Flow**: Progress through stage transitions
4. **Player Management**: Kick players, view statistics
5. **Question Management**: Upload and manage question sets
6. **System Monitoring**: View game state and player progress

## 🎯 Scoring Formula

| Action | Score |
|--------|-------|
| Solve correctly | +1 |
| Solve incorrectly | -1 |
| Pass | 0 |
| Delegate to correct solver (distance k) | 1 + λᵏ |
| Delegate to pass or wrong solver (distance k) | -1 - λᵏ |
| In delegation cycle | -1 - γ |
| Trust bonus (k delegators, you solve correctly) | +β·k |

**Default parameters**: λ=0.5, β=0.1, γ=0.2

## 📁 Project Structure

```
TrustGambit/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (auth, game logic)
│   ├── admin/             # Admin dashboard
│   ├── dashboard/         # Player dashboard
│   └── lobby/[id]/        # Game lobby interface
├── components/            # React components
├── lib/                   # Utilities and core logic
│   ├── auth.ts           # NextAuth configuration
│   ├── initAdmin.ts      # Auto-seed admin user
│   ├── calculateDelegationGraph.ts
│   └── graph/            # Graph processing & scoring
├── prisma/                # Database schema & migrations
├── scripts/               # Admin scripts (seeding, testing)
├── types/                 # TypeScript definitions
├── Dockerfile            # Multi-stage production build
└── docker-compose.yml    # Container orchestration
```

## 🚢 Deployment

### Docker Production

```bash
# Build and start
docker-compose up -d

# Check status
docker ps
curl http://localhost:3000/api/health

# View logs
docker logs trustgambit-app

# Stop
docker-compose down
```

### Environment Variables

Required for production:

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/trustgambit"

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
AUTH_TRUST_HOST="true"

# Optional: Custom admin password
ADMIN_PASSWORD="your_secure_password"
```

## 🧪 Development Scripts

```bash
# Seed 3000 demo players
npm run seed:3000

# Add dummy players to existing lobbies
npx tsx scripts/add-dummy-players.ts

# Check game/lobby status
npx tsx scripts/check-game-status.ts
npx tsx scripts/check-user-lobby-status.ts

# Clean up for new game
npx tsx scripts/clean-for-new-game.ts
```

## 🔧 Troubleshooting

### Docker Issues

```bash
# Rebuild containers
docker-compose down
docker-compose up --build -d

# Check logs
docker logs trustgambit-app
docker logs trustgambit-db

# Access database
docker exec -it trustgambit-db psql -U trustgambit -d trustgambit
```

### Admin Login Issues

1. Check admin exists: `SELECT * FROM "Admin";`
2. Verify health endpoint: `curl http://localhost:3000/api/health`
3. Manually trigger init: `curl http://localhost:3000/api/init`
4. Check logs: `docker logs trustgambit-app | grep admin`

## 🤝 Contributing

See [DOCUMENTATION.md](DOCUMENTATION.md) for development guidelines and architecture details.

## 📝 License

[Your License Here]

## 🙏 Acknowledgments

Built with Next.js, Prisma, and shadcn/ui.

---

**Status**: Production Ready ✅  
**Version**: 1.0.0  
**Last Updated**: October 2024
