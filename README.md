# Trust Gambit

**A strategic game theory competition where trust, delegation, and problem-solving converge.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-red)](https://redis.io/)

## 🎮 Overview

Trust Gambit is a multiplayer competition platform that explores trust dynamics through strategic gameplay. Players navigate multiple rounds across diverse knowledge domains, making critical decisions to **Solve**, **Delegate**, or **Pass** on questions while building trust networks.

### Game Structure

- **Stage 1**: 120 players in 8 pools of 15 (20 rounds) → Top 2 from each pool advance
- **Stage 2**: 16 finalists compete (8 rounds) → Top 3 winners

### Core Mechanics

Each round, players choose one of three actions:
- **Solve**: Attempt the problem directly (+1 correct, -1 incorrect)
- **Delegate**: Trust another player to solve (scores propagate via delegation chains)
- **Pass**: Abstain from the round (0 points)

**Key Features**:
- Scores propagate through delegation chains with distance-based decay
- Trust bonuses for players who receive many delegations and solve correctly
- Penalties for delegation cycles
- Admin dashboard with polling-based updates
- Complex graph-based scoring algorithm

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+ (optional, for production caching)
- Docker & Docker Compose (for containerized deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/koderAP/trust-gambit.git
cd trust-gambit

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Configure DATABASE_URL, NEXTAUTH_SECRET, etc. in .env

# Initialize database
npx prisma generate
npx prisma migrate deploy

# Seed questions (optional)
npx prisma db seed

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Docker Deployment (Production)

```bash
# Build and start all services (5 app instances + nginx + postgres + redis)
docker-compose up -d --scale app=5

# Check health
curl http://localhost/api/health

# View logs
docker-compose logs -f app
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed production deployment instructions.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         nginx (Load Balancer)                │
│                    Rate Limiting & Routing                   │
└──────┬──────────────────────────────────────────────────────┘
       │
       ├─────┬─────┬─────┬─────┐
       ▼     ▼     ▼     ▼     ▼
    ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
    │App│ │App│ │App│ │App│ │App│  Next.js 14 (Standalone)
    │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │
    └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘
      │     │     │     │     │
      └─────┴─────┴─────┴─────┘
              │         │
              ▼         ▼
        ┌──────────┐ ┌───────┐
        │PostgreSQL│ │ Redis │
        │    15    │ │   7   │
        └──────────┘ └───────┘
```

### Tech Stack

**Frontend**:
- Next.js 14 (App Router)
- React 18
- TypeScript 5
- Tailwind CSS
- shadcn/ui components

**Backend**:
- Next.js API Routes
- NextAuth.js (authentication)
- Prisma ORM
- XState (state machine)

**Database & Cache**:
- PostgreSQL 15 (primary data store)
- Redis 7 (caching & rate limiting)

**Infrastructure**:
- Docker & Docker Compose
- nginx (load balancing, rate limiting)
- Horizontal scaling (5 app instances)

## 📁 Project Structure

```
trust-gambit/
├── app/                      # Next.js 14 app directory
│   ├── api/                  # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── admin/           # Admin panel endpoints
│   │   ├── game-winners/    # Winner management
│   │   ├── lobbies/         # Lobby operations
│   │   ├── profile/         # User profiles
│   │   ├── rounds/          # Round management
│   │   └── user/            # User operations
│   ├── admin/               # Admin dashboard pages
│   ├── dashboard/           # Player dashboard
│   ├── lobby/               # Game lobby pages
│   ├── login/               # Authentication pages
│   └── register/            # Registration pages
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── DelegationGraphVisualization.tsx
│   └── providers.tsx
├── lib/                     # Shared utilities
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client & pooling
│   ├── redis.ts             # Redis client & caching
│   ├── rateLimit.ts         # Rate limiting logic
│   ├── circuitBreaker.ts    # Circuit breaker pattern
│   ├── calculateDelegationGraph.ts
│   ├── roundAutoEnd.ts      # Auto-end expired rounds
│   ├── graph/               # Graph processing & scoring
│   └── state-machines/      # XState game machine
├── prisma/                  # Database schema & migrations
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── scripts/                 # Utility scripts
│   ├── seed-users.js        # Bulk user seeding
│   ├── stress-test.ts       # Load testing
│   ├── clean-for-new-game.ts
│   └── check-game-status.ts
├── docs/                    # Documentation
│   ├── API.md               # API endpoint documentation
│   ├── DEPLOYMENT.md        # Deployment guide
│   ├── game.md              # Game mechanics
│   └── state-machine.md     # State machine logic
├── docker-compose.yml       # Docker orchestration
├── Dockerfile              # Container definition
├── nginx.conf              # Load balancer config
└── package.json            # Dependencies
```

## 🎯 Key Features

### For Players

- **Self-Rating System**: Rate your expertise across 10 domains (Algorithms, Finance, Economics, Statistics, Probability, ML, Crypto, Biology, Indian History, Game Theory)
- **Strategic Decisions**: Choose between solving, delegating, or passing each round
- **Trust Networks**: Build reputation by solving correctly and receiving delegations
- **Visual Analytics**: Interactive delegation graph visualization
- **Leaderboards**: Track your standing with manual refresh

### For Admins

- **Game Management**: Create, start, pause, and end games
- **Round Control**: Configure and start rounds with custom parameters
- **Question Management**: Upload questions with domain tags and images
- **User Management**: View, manage, and seed users
- **Live Monitoring**: Dashboard with polling-based updates (every 5 seconds)
- **Bulk Operations**: Efficient handling of 700+ players across 50+ lobbies

### Performance & Scalability

- **Adaptive Polling**: Context-aware refresh rates (3-4s active, 15-18s idle)
- **High Concurrency**: Handles 300+ concurrent users with polling architecture
- **Horizontal Scaling**: 5 app instances with nginx load balancing
- **Connection Pooling**: 50 connections per instance, optimized for burst traffic
- **Redis Caching**: 95%+ cache hit rate, 5-second TTL for real-time feel
- **Smart Invalidation**: Parallel cache invalidation on state changes
- **Rate Limiting**: Token bucket algorithm, configurable per endpoint
- **Circuit Breakers**: Graceful degradation on database/Redis failures
- **Change Detection**: Only update UI when data changes (preserves timer state)
- **Load Reduction**: 67% lower load during idle periods, 13% overall reduction

See **[Performance Guide](./docs/PERFORMANCE.md)** for detailed optimization strategies.

## 📚 Documentation

- **[API Reference](./docs/API.md)** - Complete API endpoint documentation
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Game Mechanics](./docs/game.md)** - Detailed game rules and scoring
- **[State Machine](./docs/state-machine.md)** - Game state flow and transitions
- **[Architecture](./docs/ARCHITECTURE-DIAGRAM.md)** - System architecture diagrams
- **[Performance & Scalability](./docs/PERFORMANCE.md)** - Adaptive polling, caching, and optimization for 300+ users

## 🔧 Development

### Environment Variables

Create a `.env` file with the following:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trustgambit"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_TRUST_HOST="true"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Game Configuration
GAME_STAGE_1_ROUNDS=20
GAME_STAGE_2_ROUNDS=8
```

### Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Deploy migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Seed database
npx prisma db seed

# Reset database
npx prisma migrate reset
```

### Useful Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:push          # Push schema changes
npm run db:seed          # Seed questions

# Testing
npm run test             # Run tests (if configured)
npm run stress-test      # Run load tests

# Utilities
npm run check-status     # Check game status
npm run clean-game       # Clean for new game
npm run seed-users       # Bulk seed users
```

### Admin Seeding

First user to register becomes admin automatically. Or manually create admin:

```bash
# Using script
npm run seed-admin

# Using Prisma Studio
npx prisma studio
# Navigate to User table, set role="ADMIN"
```

## 🚦 API Overview

For complete API documentation, see [docs/API.md](./docs/API.md).

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (NextAuth)
- `GET /api/auth/session` - Get session

### Game Management

- `GET /api/health` - System health check
- `POST /api/admin/create-new-game` - Create game
- `POST /api/admin/start-game` - Start game
- `POST /api/admin/start-round` - Start new round
- `POST /api/admin/end-current-round` - End active round
- `GET /api/lobby/[id]` - Get lobby details

### User Actions

- `POST /api/profile/complete` - Complete profile with domain ratings
- `POST /api/rounds/start` - Submit round action (solve/delegate/pass)
- `GET /api/user/exit-game` - Exit current game

### Admin Operations

- `GET /api/admin/users` - List all users
- `GET /api/admin/questions` - Manage questions
- `POST /api/admin/activate-lobbies` - Activate lobbies for game
- `POST /api/admin/finish-stage-1` - Progress to stage 2

## 🧪 Testing

### Load Testing

```bash
# Register 20 users per second
npm run stress-test -- --rate 20

# Full registration flow (registration + profile)
ts-node scripts/stress-test-full-registration.ts
```

### Health Check

```bash
curl http://localhost:3000/api/health
# or with docker
curl http://localhost/api/health
```

## 🐳 Docker

### Development

```bash
docker-compose up
```

### Production (5 Instances)

```bash
# Build
docker-compose build app

# Start with 5 replicas
docker-compose up -d --scale app=5

# View logs
docker-compose logs -f app

# Check specific instance
docker logs trustgambit-app-1
```

### Monitoring

```bash
# All containers
docker-compose ps

# Resource usage
docker stats

# Database connections
docker exec -it trustgambit-db psql -U trustgambit -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for TechGC Competition by IGTS
- Inspired by game theory and trust network research
- Community contributions and feedback

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/koderAP/trust-gambit/issues)
- **Discussions**: [GitHub Discussions](https://github.com/koderAP/trust-gambit/discussions)
- **Email**: support@trustgambit.com

---

**Made with ❤️ for strategic gameplay and trust dynamics research**
