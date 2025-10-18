# Trust Gambit# Trust Gambit# Trust Gambit



**A strategic game theory competition where trust, delegation, and problem-solving converge.**



## 🎮 What is Trust Gambit?**A strategic game theory competition where trust, delegation, and problem-solving converge.**A game theory webapp that explores trust dynamics through strategic gameplay. Players navigate 28 rounds across 2 stages, making decisions to **Solve**, **Delegate**, or **Pass** on questions while building trust networks.



A multiplayer competition where 120+ players navigate 28 rounds across 10 knowledge domains. Success depends not just on solving problems, but on building trust networks and strategic delegation.



- **Stage 1**: 120 players in 8 pools of 15 (20 rounds) → Top 2 advance## 🎮 What is Trust Gambit?## 🚀 Quick Start

- **Stage 2**: 16 finalists compete (8 rounds) → Top 3 win



Each round, choose: **Solve**, **Delegate**, or **Pass**. Scores propagate through delegation chains with bonuses for trust and penalties for cycles.

A multiplayer competition where 120+ players navigate 28 rounds across 10 knowledge domains. Success depends not just on solving problems, but on building trust networks and strategic delegation.### Prerequisites

## 🚀 Quick Start



```bash

# Install dependencies- **Stage 1**: 120 players in 8 pools of 15 (20 rounds) → Top 2 advance- Node.js 18+ and npm 9+

npm install

- **Stage 2**: 16 finalists compete (8 rounds) → Top 3 win- PostgreSQL 14+

# Setup environment

cp .env.example .env- Redis 7+ (optional, for production)

# Configure DATABASE_URL in .env

Each round, choose: **Solve**, **Delegate**, or **Pass**. Scores propagate through delegation chains with bonuses for trust and penalties for cycles.

# Initialize database

npx prisma generate### Installation

npx prisma db push

## 🚀 Quick Start

# Seed demo data (optional)

npx tsx scripts/seed-dummy-players.ts```bash



# Run development server```bash# Clone the repository

npm run dev

```# Install dependenciesgit clone <your-repo-url>



Visit **http://localhost:3000**npm installcd TrustGambit



**Default Admin**: `admin` / `admin123`



## 📚 Documentation

- **[Complete Documentation](docs/DOCUMENTATION.md)** - Setup, admin guide, game mechanics, architecture
- **[Quick Start Guide](docs/QUICKSTART.md)** - Get started quickly
- **[Game Rules](docs/game.md)** - Detailed scoring system and examples
- **[State Machine](docs/state-machine.md)** - Game flow and status transitions

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: shadcn/ui components

npx prisma db push

## 📊 Game Flow (Admin)

# Setup database

```

1. Create/Assign Lobbies → 2. Start Rounds (Stage 1) → 3. Finish Stage 1# Seed demo data (optional)npm run db:push

   ↓

4. Activate Stage 2 Lobbies → 5. Start Rounds (Stage 2) → 6. Finish Stage 2npx tsx scripts/seed-dummy-players.ts

   ↓

7. Game Ended → 8. Create New Game# Run development server

```

# Run development servernpm run dev

## 🎯 Scoring Formula

npm run dev```

| Action | Score |

|--------|-------|```

| Solve correctly | +1 |

| Solve incorrectly | -1 |Visit [http://localhost:3000](http://localhost:3000)

| Pass | 0 |

| Delegate to correct solver (distance k) | 1 + λᵏ |Visit **http://localhost:3000**

| Delegate to pass or wrong solver (distance k) | -1 - λᵏ |

| In delegation cycle | -1 - γ |## 📁 Project Structure

| Trust bonus (k delegators, you solve correctly) | +β·k |

**Default Admin**: `admin` / `admin123`

**Default**: λ=0.5, β=0.1, γ=0.2

```

### Examples

## 📚 DocumentationTrustGambit/

- **Bob → Alice (Alice solves correctly)**: Bob gets 1 + λ = 1.5

- **Carol → Dave (Dave answers wrong)**: Carol gets -1 - λ = -1.5├── app/                          # Next.js App Router

- **Frank → Grace (Grace passes)**: Frank gets -1 - λ = -1.5

- **[Complete Documentation](DOCUMENTATION.md)** - Setup, admin guide, game mechanics, architecture│   ├── api/                      # API Routes

## 🔧 Useful Scripts

- **[Game Rules](game.md)** - Detailed scoring system and examples│   │   ├── auth/

```bash

# Check system state- **[State Machine](state-machine.md)** - Game flow and status transitions│   │   │   ├── register/route.ts # User registration

npx tsx scripts/check-system-state.ts

│   │   │   └── login/route.ts    # User login

# View all games

npx tsx scripts/check-all-games.ts## 🛠️ Tech Stack│   │   ├── lobby/



# Clean up for new game│   │   │   └── [id]/route.ts     # Lobby management

npx tsx scripts/clean-for-new-game.ts

```- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS│   │   └── rounds/



## 📝 License- **Backend**: Next.js API Routes, NextAuth.js│   │       └── [roundId]/



This project was developed for the TechGC Problem Statement by IGTS.- **Database**: PostgreSQL + Prisma ORM│   │           └── submit/route.ts # Round submissions



---- **Styling**: shadcn/ui components│   ├── register/page.tsx         # Registration page



For complete documentation, see **[DOCUMENTATION.md](DOCUMENTATION.md)**│   ├── lobby/[id]/page.tsx       # Lobby waiting room (TODO)


## 📊 Game Flow (Admin)│   ├── game/[id]/page.tsx        # Game round interface (TODO)

│   ├── results/[id]/page.tsx     # Results/leaderboard (TODO)

```│   ├── admin/page.tsx            # Admin dashboard (TODO)

1. Create/Assign Lobbies → 2. Start Rounds (Stage 1) → 3. Finish Stage 1│   ├── layout.tsx                # Root layout

   ↓│   ├── page.tsx                  # Homepage

4. Activate Stage 2 Lobbies → 5. Start Rounds (Stage 2) → 6. Finish Stage 2│   └── globals.css               # Global styles

   ↓│

7. Game Ended → 8. Create New Game├── components/                   # React components

```│   ├── ui/                       # shadcn/ui components

│   │   ├── button.tsx

## 🎯 Scoring Formula│   │   ├── input.tsx

│   │   ├── card.tsx

| Action | Score |│   │   ├── label.tsx

|--------|-------|│   │   └── progress.tsx

| Solve correctly | +1 |│   ├── game/                     # Game components (TODO)

| Solve incorrectly | -1 |│   │   ├── RoundDisplay.tsx

| Pass | 0 |│   │   ├── ActionButtons.tsx

| Delegate to correct solver (distance k) | λᵏ |│   │   └── Timer.tsx

| Delegate to wrong solver (distance k) | -1 - λᵏ |│   └── graph/                    # Graph visualization (TODO)

| In delegation cycle | -1 - γ |│       └── TrustGraph.tsx

| Trust bonus (k delegators, you solve correctly) | +β·k |│

├── lib/                          # Core logic

**Default**: λ=0.5, β=0.1, γ=0.2│   ├── graph/                    # Graph processing

│   │   ├── processor.ts          # Cycle detection, distances

## 🔧 Useful Scripts│   │   └── scoring.ts            # Scoring algorithm

│   ├── state-machines/           # XState machines

```bash│   │   └── gameMachine.ts        # Game & round state machines

# Check system state│   ├── socket/                   # WebSocket handling

npx tsx scripts/check-system-state.ts│   │   └── server.ts             # Socket.io server

│   ├── prisma.ts                 # Prisma client

# View all games│   └── utils.ts                  # Utility functions

npx tsx scripts/check-all-games.ts│

├── prisma/

# Clean up for new game│   └── schema.prisma             # Database schema

npx tsx scripts/clean-for-new-game.ts│

```├── public/                       # Static assets

│

## 📝 License├── .env.example                  # Environment template

├── package.json

This project was developed for the TechGC Problem Statement by IGTS.├── tsconfig.json

├── tailwind.config.js

---├── next.config.js

└── README.md

For complete documentation, see **[DOCUMENTATION.md](DOCUMENTATION.md)**```


## 🎮 Game Rules

### Overview
- **120 players** per lobby
- **28 rounds** total (20 in Stage 1, 8 in Stage 2)
- **3 actions** per round: Solve, Delegate, or Pass

### Actions

1. **Solve** - Answer the question yourself
   - ✅ Correct: Full points (λ = 0.5)
   - ❌ Wrong: Zero points

2. **Delegate** - Trust another player
   - ✅ If chain leads to correct solver: Partial points (β = 0.3, decreases with distance)
   - ❌ If chain fails or forms cycle: Zero points
   - 🎁 Build trust relationships (γ = 0.2)

3. **Pass** - Skip the question
   - Safe option, no points

### Scoring Formula

```
Total Score = λ (solve) + β (delegate) + γ (trust)

Where:
- λ = 0.5 (solving correctly)
- β = 0.3 × 0.9^distance (delegating to correct solver)
- γ = 0.2 (trust bonus)
```

### Cycles

⚠️ **Critical Rule**: If delegation forms a cycle (A→B→C→A), everyone in the cycle gets **zero points** for that round!

## 🗄️ Database Schema

### Key Models

- **User** - Player information (name, email, domain, rating)
- **Lobby** - Groups of up to 120 players
- **Game** - One complete game session (28 rounds)
- **Round** - Individual question/round
- **Submission** - User's action per round
- **RoundScore** - Calculated scores per user per round
- **TrustEdge** - Trust relationships between users

## 🔧 Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript 5** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **React Flow** - Graph visualization

### Backend
- **Next.js API Routes** - REST API
- **Socket.io** - WebSocket real-time updates
- **Prisma ORM** - Database access
- **PostgreSQL** - Primary database
- **Redis** - Caching & sessions (optional)

### State Management
- **XState** - State machines for game flow
- **Zustand** - Client state (TODO)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Lobbies
- `GET /api/lobby/[id]` - Get lobby details

### Rounds
- `POST /api/rounds/[roundId]/submit` - Submit action
- `GET /api/rounds/[roundId]/submit` - Get submissions

### Admin (TODO)
- `POST /api/admin/game/start` - Start game
- `POST /api/admin/round/start` - Start round
- `POST /api/admin/round/end` - End round

## 🔌 WebSocket Events

### Client → Server
- `join:lobby` - Join lobby room
- `join:game` - Join game room
- `round:submit` - Submit round action
- `admin:start_round` - Admin starts round
- `admin:end_round` - Admin ends round

### Server → Client
- `lobby:status` - Lobby status update
- `lobby:user_joined` - New user joined
- `round:started` - Round has started
- `round:submission` - New submission received
- `round:timer_update` - Timer sync
- `round:ended` - Round has ended

## 🎯 Development Roadmap

### ✅ Completed
- [x] Project setup (Next.js, TypeScript, Tailwind)
- [x] Database schema (Prisma)
- [x] Graph processing engine (cycle detection, scoring)
- [x] XState machines (game & round flows)
- [x] Socket.io server setup
- [x] API routes (auth, lobby, submissions)
- [x] UI components (shadcn/ui)
- [x] Homepage
- [x] Registration page

### 🚧 In Progress
- [ ] Lobby waiting room page
- [ ] Game round interface
- [ ] Trust graph visualization
- [ ] Results/leaderboard page
- [ ] Admin dashboard

### 📝 TODO
- [ ] Login page
- [ ] Socket.io client integration
- [ ] Real-time round updates
- [ ] Timer synchronization
- [ ] User profile page
- [ ] Game history
- [ ] Email notifications
- [ ] Unit tests
- [ ] E2E tests
- [ ] Deployment scripts

## 🧪 Testing

```bash
# Run tests (TODO)
npm test

# Run E2E tests (TODO)
npm run test:e2e
```

## 📊 Performance

Target capacity: **1000 concurrent users**

Expected performance:
- Response time: 180ms avg, 420ms P95
- WebSocket latency: <50ms
- Success rate: 99.8%

## 🔒 Security

- ✅ Password hashing (bcrypt)
- ✅ Input validation (Zod)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection (React escaping)
- ✅ CSRF protection (Next.js built-in)
- ⏳ Rate limiting (TODO)
- ⏳ Session management (TODO)

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Build
npm run build

# Start
npm start
```

### Docker (TODO)
```bash
docker-compose up
```

## 📖 Documentation

Additional documentation:
- [Complete Documentation](docs/DOCUMENTATION.md)
- [Quick Start Guide](docs/QUICKSTART.md)
- [Deployment Guide](docs/DEPLOYMENT-QUICK-REF.md)
- [Digital Ocean Deployment](docs/DIGITAL-OCEAN-DEPLOYMENT.md)
- [Docker Deployment](docs/DOCKER-DEPLOYMENT.md)
- [Game Rules](docs/game.md)
- [State Machine Specification](docs/state-machine.md)
- [Admin Auto-Seed](docs/ADMIN-AUTO-SEED.md)
- [Image Performance Guide](docs/IMAGE-PERFORMANCE-GUIDE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License

## 👥 Authors

Trust Gambit Team

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [Socket.io](https://socket.io/)
- [XState](https://xstate.js.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Need help?** Open an issue or contact the development team.
