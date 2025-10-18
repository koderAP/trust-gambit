# Trust Gambit Documentation

Welcome to the Trust Gambit documentation! This directory contains comprehensive guides for understanding, developing, and deploying the platform.

## 📖 Documentation Files

### Essential Reading

1. **[README.md](../README.md)** - Start here!
   - Project overview and features
   - Quick start guide
   - Tech stack and architecture
   - Development setup
   - Testing and monitoring

2. **[game.md](./game.md)** - Game Mechanics
   - Competition rules and structure
   - Scoring algorithm (delegation chains, trust bonuses, cycles)
   - Strategy insights
   - Worked examples with calculations
   - Stage 1 and Stage 2 differences

3. **[API.md](./API.md)** - Complete API Reference
   - All 40+ endpoints documented
   - Authentication flow
   - Request/response examples
   - Error handling
   - WebSocket events
   - Rate limiting details

4. **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment Guide
   - Local development setup
   - Docker deployment (single and multi-instance)
   - Production configuration
   - Environment variables
   - Database setup and migrations
   - Horizontal scaling (5 instances)
   - Monitoring and troubleshooting
   - Performance benchmarks

### Technical Deep Dives

5. **[state-machine.md](./state-machine.md)** - State Machine Logic
   - XState implementation
   - Game state transitions
   - Round lifecycle
   - Event handling
   - State persistence

6. **[ARCHITECTURE-DIAGRAM.md](./ARCHITECTURE-DIAGRAM.md)** - System Architecture
   - Component diagrams
   - Data flow
   - Infrastructure layout
   - Technology choices

## 🚀 Getting Started

### New to Trust Gambit?
1. Read [README.md](../README.md) for project overview
2. Study [game.md](./game.md) to understand game mechanics
3. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) Quick Start section

### Building a Feature?
1. Check [API.md](./API.md) for existing endpoints
2. Review [state-machine.md](./state-machine.md) for game state logic
3. Reference [ARCHITECTURE-DIAGRAM.md](./ARCHITECTURE-DIAGRAM.md) for system design

### Deploying to Production?
1. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) Production Deployment section
2. Configure environment variables from Environment Configuration
3. Set up horizontal scaling (5 instances recommended)
4. Enable monitoring from Monitoring & Maintenance section

## 📊 Key Concepts

### Game Structure
- **Stage 1**: 120 players → 8 pools of 15 → Top 2 advance (20 rounds)
- **Stage 2**: 16 finalists → 4 pools of 4 → Top 3 winners (8 rounds)
- **Actions**: Solve, Delegate, Pass
- **Scoring**: Delegation chains with λ decay, β trust bonus, γ cycle penalty

### Technical Architecture
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth, Prisma ORM
- **Database**: PostgreSQL 15 with connection pooling
- **Cache**: Redis 7 for rate limiting and caching
- **Real-time**: Socket.io for WebSocket communication
- **Scaling**: nginx load balancer + 5 app instances

### Performance Characteristics
- **Registration**: 16-17 users/second sustained (5 instances)
- **API Throughput**: 100 requests/second per instance
- **Large Games**: 700+ players, 50+ lobbies supported
- **Round Operations**: <100ms for bulk operations
- **Database**: 200 max connections, pooled at 60/instance

## 🔍 Finding Information

### By Topic

**Authentication & Users**
- API: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- Docs: [API.md - Authentication](./API.md#authentication)

**Game Flow**
- State Machine: [state-machine.md](./state-machine.md)
- API: `/api/admin/create-new-game`, `/api/admin/start-game`
- Docs: [API.md - Admin - Game Control](./API.md#admin---game-control)

**Round Management**
- API: `/api/admin/start-round`, `/api/admin/end-current-round`
- State Machine: [state-machine.md - Round Lifecycle](./state-machine.md)
- Docs: [API.md - Round Management](./API.md#round-management)

**Scoring Logic**
- Game Mechanics: [game.md - Scoring Summary](./game.md)
- Code: `lib/graph/scoring.ts`, `lib/calculateDelegationGraph.ts`

**Deployment & Scaling**
- Guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
- Docker: [DEPLOYMENT.md - Docker Deployment](./DEPLOYMENT.md#docker-deployment)
- Scaling: [DEPLOYMENT.md - Horizontal Scaling](./DEPLOYMENT.md#horizontal-scaling)

**Troubleshooting**
- Deployment: [DEPLOYMENT.md - Troubleshooting](./DEPLOYMENT.md#troubleshooting)
- API Errors: [API.md - Error Handling](./API.md#error-handling)

## 🛠️ Quick Reference

### Common Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm run start              # Start production server

# Database
npx prisma generate        # Generate Prisma client
npx prisma migrate deploy  # Run migrations
npx prisma db seed         # Seed questions
npx prisma studio          # Open database GUI

# Docker
docker-compose up -d --scale app=5   # Start with 5 instances
docker-compose logs -f app           # View logs
docker-compose ps                    # Check status
curl http://localhost/api/health     # Health check

# Testing
ts-node scripts/stress-test-full-registration.ts  # Load test
curl http://localhost/api/health | jq            # Health check
```

### Environment Variables

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/trustgambit"
NEXTAUTH_SECRET="<generate-with-openssl-rand-base64-32>"
NEXTAUTH_URL="http://localhost:3000"
REDIS_URL="redis://localhost:6379"
NODE_ENV="production"
```

### API Endpoints Overview

- **Auth**: `/api/auth/{register,login,me}`
- **Game**: `/api/game-state`, `/api/game-winners`
- **Lobby**: `/api/lobby/[id]`, `/api/lobbies/[id]/leaderboard`
- **Rounds**: `/api/rounds/start`, `/api/rounds/[id]/{submission,results}`
- **Admin**: `/api/admin/{create-new-game,start-game,start-round,...}`
- **Health**: `/api/health`

## 📦 File Organization

```
docs/
├── INDEX.md                    # This file
├── README.md (../README.md)    # Main project README
├── API.md                      # Complete API documentation
├── DEPLOYMENT.md               # Deployment & operations guide
├── game.md                     # Game mechanics & rules
├── state-machine.md            # State machine implementation
└── ARCHITECTURE-DIAGRAM.md     # System architecture diagrams
```

## 🔗 External Resources

- **Repository**: https://github.com/koderAP/trust-gambit
- **Issues**: https://github.com/koderAP/trust-gambit/issues
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Socket.io Docs**: https://socket.io/docs/v4

## 💡 Tips for Contributors

1. **Before coding**: Read relevant sections of [API.md](./API.md) and [state-machine.md](./state-machine.md)
2. **Adding endpoints**: Document in [API.md](./API.md) with request/response examples
3. **Database changes**: Create migration, update schema, test with `prisma migrate dev`
4. **Performance**: Test with stress test script, ensure >15 reg/sec with 5 instances
5. **Deployment**: Always test with Docker multi-instance setup before production

## 📞 Support

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community support
- **Email**: support@trustgambit.com

---

**Documentation Version**: 1.0  
**Last Updated**: October 2025  
**Maintained by**: Trust Gambit Team
