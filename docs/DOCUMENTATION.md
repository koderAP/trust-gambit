# Trust Gambit - Complete Documentation

**A strategic game theory competition exploring trust dynamics through delegation and problem-solving**

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [Quick Start](#quick-start)
3. [Admin Guide](#admin-guide)
4. [Game Mechanics](#game-mechanics)
5. [Architecture](#architecture)
6. [Deployment](#deployment)

---

## Game Overview

### Concept

The Trust Gambit is a unique competition where brilliant problem-solving is only part of the path to victory. Reputation and strategic trust are equally vital. Players must decide: Will you risk your score to bet on another's expertise, or will you gamble on your own skills?

### Competition Structure

- **Participants**: 120 players (expandable to 1000+)
- **Domains**: 10 knowledge areas (Algorithms, Finance, Economics, Statistics, Probability, ML, Crypto, Biology, Indian History, Game Theory)
- **Stages**:
  - **Stage 1**: 120 players divided into 8 pools of 15 each (20 rounds across all domains). Top 2 from each pool advance.
  - **Stage 2**: 16 finalists compete in 4 domains (8 rounds). Top 3 win.

### Actions Per Round

For each question, players choose:
- **Solve**: Attempt the problem directly
- **Delegate**: Point to another participant most likely to know the answer
- **Pass**: Abstain (scores 0)

---

## Quick Start

### Prerequisites

```bash
Node.js 18+
PostgreSQL 14+
npm 9+
```

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd TrustGambit

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
npx prisma generate
npx prisma db push

# Seed dummy players (optional)
npx tsx scripts/seed-dummy-players.ts

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Default Credentials

**Admin Login**: `admin` / `admin123`

---

## Admin Guide

### Complete Game Lifecycle

```
┌─────────────────────────────────────────────────────┐
│  1. GAME SETUP                                      │
│     ↓ Click "Assign Lobbies"                        │
│  2. LOBBIES CREATED (Auto-activated)                │
│     ↓ Click "Start Round"                           │
│  3. STAGE 1 - ROUNDS 1-20                           │
│     ↓ After 20 rounds, click "Finish Stage 1"       │
│  4. STAGE 2 SETUP (Top 2 from each pool)            │
│     ↓ Click "Activate Stage 2 Lobbies"              │
│  5. STAGE 2 - ROUNDS 1-8                            │
│     ↓ After 8 rounds, click "Finish Stage 2"        │
│  6. GAME ENDED (Winners declared)                   │
│     ↓ Click "Create New Game"                       │
│  7. CLEAN SLATE (Ready for next competition)        │
└─────────────────────────────────────────────────────┘
```

### Dashboard Controls

#### Overview Tab

**When No Game / Game Ended:**
- 🟢 **Create New Game** - Archives old games and creates fresh game

**When Game NOT_STARTED:**
- 🟡 **Assign Lobbies** - Creates lobbies, assigns players, auto-activates game

**When Game STAGE_1_ACTIVE:**
- 🔵 **Start Round** - Begins next round across all lobbies
- 🔴 **End Round** - Completes current round, calculates scores
- 🟠 **Finish Stage 1** - Creates Stage 2 lobbies, promotes top 2 from each pool

**When Game STAGE_2_ACTIVE:**
- 🔵 **Start Round** - Begins next round for finalists
- 🔴 **End Round** - Completes current round
- 🟣 **Finish Stage 2** - Ends game, declares winners

**Always Available:**
- ⚙️ **Update Parameters** - Adjust λ, β, γ scoring parameters
- 📝 **Manage Questions** - Add/edit questions for rounds
- 🔚 **End Game** (header) - Emergency stop, marks game as ENDED

#### Questions Tab

**Global Question Pool:**
- Questions are shared across all games
- Each question used only once (`isUsed` flag)
- Fields: Stage, Domain, Question Text, Correct Answer
- Edit or delete unused questions
- Used questions are locked (can't delete)

### Key Features

**Auto-refresh**: Dashboard updates every 5 seconds

**Live Stats Cards**:
- Total Users
- Ready to Play (lobbyRequested = true)
- In Lobbies
- Waiting for Lobby
- Incomplete Profiles

**Lobby Management**:
- View all players in each lobby
- Kick players from lobbies (sets unassigned state)
- See lobby status (WAITING, ACTIVE, COMPLETED)

**Round Tracking**:
- View all rounds with questions
- See submission counts
- Monitor round status

---

## Game Mechanics

### Scoring System

**Parameters:**
- `λ` (lambda): Chain propagation multiplier (default: 0.5)
- `β` (beta): Trust bonus per delegator (default: 0.1)
- `γ` (gamma): Cycle penalty multiplier (default: 0.2)

### Per-Round Scoring

| Action / Position | Score |
|------------------|-------|
| Solve correctly (no delegation) | +1 |
| Solve incorrectly (no delegation) | -1 |
| Pass (no delegation) | 0 |
| Upstream of +1 terminus at distance k | 1 + λᵏ |
| Upstream of 0 or -1 terminus at distance k | -1 - λᵏ |
| Member of cycle (no solver/pass inside) | -1 - γ |
| Upstream of cycle at distance k | -1 - γᵏ⁺¹ |
| Trust bonus (k direct delegators, you solved correctly) | +β·k |

### Examples

**Direct Solve:**
- Alice solves correctly → +1

**Single Delegation:**
- Bob → Alice (Alice solves correctly)
- Bob scores: 1 + λ¹ = 1 + 0.5 = 1.5

**Chain Ending in Incorrect:**
- Carol → Dave → Eve (Eve answers incorrectly)
- Dave: -1 - λ = -1.5
- Carol: -1 - λ² = -1.25

**Chain Ending in Pass:**
- Frank → Grace (Grace passes, terminus = 0)
- Frank: -1 - λ = -1.5

**Cycle Penalty:**
- Henry → Ivy → Jack → Henry (no one solves/passes)
- Each member: -1 - γ = -1.2
- Leo → Henry (upstream of cycle): -1 - γ² = -1.04

**Trust Bonus:**
- 3 players delegate to Maya, Maya solves correctly
- Maya: +1 (solve) + 0.3 (trust bonus) = +1.3

---

## Architecture

### Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Polling (5s intervals on admin dashboard)

### Database Schema

**Core Models:**
- `User` - Player profiles with domain ratings
- `Game` - Competition instance with status tracking
- `Lobby` - Player pools (Stage 1: 15 players, Stage 2: 16 players)
- `Round` - Individual questions with timing
- `Submission` - Player actions (SOLVE, DELEGATE, PASS)
- `RoundScore` - Calculated scores per round per user
- `Question` - Global question pool
- `DomainRating` - User self-ratings (0-10 per domain)
- `TrustEdge` - Delegation history tracking

### Game State Machine

```
NOT_STARTED → (Assign Lobbies)
    ↓
STAGE_1_ACTIVE → (20 rounds)
    ↓
STAGE_2_ACTIVE → (8 rounds)
    ↓
ENDED → (Create New Game)
    ↓
NOT_STARTED
```

### API Routes

**Admin:**
- `/api/admin/game-state` - Get current game status
- `/api/admin/create-new-game` - Start fresh game
- `/api/admin/start-game` - Assign lobbies
- `/api/admin/start-round` - Begin round
- `/api/admin/end-current-round` - Complete round
- `/api/admin/finish-stage-1` - Progress to Stage 2
- `/api/admin/finish-stage-2` - End competition
- `/api/admin/questions` - CRUD for questions
- `/api/admin/kick-player` - Remove player from lobby

**Player:**
- `/api/auth/register` - Create account
- `/api/auth/login` - Sign in
- `/api/profile/domain-ratings` - Update self-ratings
- `/api/game/state` - Get player's game state
- `/api/game/submit` - Submit action for round

---

## Deployment

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/trustgambit"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Redis for production scaling
REDIS_URL="redis://localhost:6379"
```

### Production Setup

```bash
# Build
npm run build

# Start
npm start
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name description

# Apply migrations
npx prisma migrate deploy

# Reset database (development)
npx prisma migrate reset
```

### Scaling Considerations

**Single Machine**: Supports 1000+ players
- Optimize: Use connection pooling, enable query caching
- PostgreSQL with proper indexes handles 10k+ concurrent users

**Multi-Machine**: For 10,000+ players
- Load balancer (nginx)
- Database: Read replicas
- Redis for session management
- Horizontal scaling with K8s

---

## Maintenance Scripts

### Useful Commands

```bash
# Check system state
npx tsx scripts/check-system-state.ts

# Check all games
npx tsx scripts/check-all-games.ts

# Clean up duplicate games
npx tsx scripts/cleanup-duplicate-games.ts

# Seed dummy players
npx tsx scripts/seed-dummy-players.ts

# Fix system state after reset
npx tsx scripts/fix-system-state.ts
```

### Troubleshooting

**Issue**: Users not showing as ready for lobbies
```bash
# Fix: Set lobbyRequested = true
npx tsx scripts/fix-system-state.ts
```

**Issue**: Old lobbies not deleted
```bash
# Fix: Clean and create new game
npx tsx scripts/clean-for-new-game.ts
```

**Issue**: Multiple games showing
```bash
# Fix: Archive old games
npx tsx scripts/cleanup-duplicate-games.ts
```

---

## Support & Contact

For issues or questions about the Trust Gambit platform, please refer to:
- Game rules: `game.md`
- State machine details: `state-machine.md`
- Technical setup: This documentation

---

**Version**: 2.0  
**Last Updated**: October 17, 2025  
**Status**: Production Ready
