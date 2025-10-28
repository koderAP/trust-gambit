# Admin API Quick Reference

## When to Use Which Endpoint

| Scenario | Endpoint | Params | Payload | Time |
|----------|----------|--------|---------|------|
| **Auto-refresh stats** | `/api/admin/stats` | - | 200B | 50ms |
| **Initial dashboard load** | `/api/admin/game-state` | `includeUsers=false` | 200KB | 500ms |
| **View lobbies tab** | `/api/admin/lobbies` | - | 50KB | 200ms |
| **View game/rounds tab** | `/api/admin/rounds` | - | 20KB | 150ms |
| **View users tab** | `/api/admin/users/detailed` | - | 100KB | 300ms |
| **After creating lobbies** | `/api/admin/lobbies` + `/api/admin/stats` | - | 50KB | 200ms |
| **After ending round** | `/api/admin/rounds` + `/api/admin/stats` | - | 20KB | 150ms |
| **After user registration** | `/api/admin/stats` | - | 200B | 50ms |
| **View round details** | `/api/rounds/{id}/results` | - | 10KB | 100ms |

## API Endpoints

### 🔥 Frequently Used

#### `/api/admin/stats` (Polling)
```bash
GET /api/admin/stats
# Returns: stats, basic game status
# Use: Every 5 seconds for live updates
```

#### `/api/admin/lobbies` (Lobbies Tab)
```bash
GET /api/admin/lobbies
GET /api/admin/lobbies?includePlayers=false
GET /api/admin/lobbies?includeCurrentRound=false
# Returns: lobbies array with optional players and current round
# Use: Lobbies management, after lobby actions
```

#### `/api/admin/rounds` (Game Tab)
```bash
GET /api/admin/rounds
GET /api/admin/rounds?lobbyId=xxx
GET /api/admin/rounds?includeSubmissions=true
GET /api/admin/rounds?includeScores=true
# Returns: rounds array with optional submissions/scores
# Use: Game progress, after round actions
```

#### `/api/admin/users/detailed` (Users Tab)
```bash
GET /api/admin/users/detailed
GET /api/admin/users/detailed?includeDomainRatings=false
GET /api/admin/users/detailed?includeLobby=false
# Returns: users array with lobby and domain ratings
# Use: User management, registration overview
```

### 🎯 Special Purpose

#### `/api/admin/game-state` (Flexible)
```bash
# Full data (default - backward compatible)
GET /api/admin/game-state

# Lightweight (no users)
GET /api/admin/game-state?includeUsers=false

# Very lightweight (no users, rounds, lobbies)
GET /api/admin/game-state?includeUsers=false&includeRounds=false&includeLobbies=false

# Only lobbies
GET /api/admin/game-state?includeRounds=false&includeUsers=false

# Everything including heavy data
GET /api/admin/game-state?includeSubmissions=true&includeScores=true
```

## Common Patterns

### Pattern 1: Initial Load
```typescript
async function initDashboard() {
  // Fast initial load
  const stats = await fetch('/api/admin/stats')
  const game = await fetch('/api/admin/game-state?includeUsers=false')
  
  setStats(stats)
  setGameInfo(game.activeGame)
}
```

### Pattern 2: Tab Navigation
```typescript
function handleTabChange(tab) {
  switch(tab) {
    case 'lobbies':
      fetch('/api/admin/lobbies')
      break
    case 'game':
      fetch('/api/admin/rounds')
      break
    case 'users':
      fetch('/api/admin/users/detailed')
      break
  }
}
```

### Pattern 3: After Actions
```typescript
// After ending round
async function handleEndRound() {
  // ... end round logic ...
  await Promise.all([
    fetch('/api/admin/stats'),
    fetch('/api/admin/rounds')
  ])
}

// After creating lobbies
async function handleCreateLobbies() {
  // ... create lobbies logic ...
  await Promise.all([
    fetch('/api/admin/stats'),
    fetch('/api/admin/lobbies')
  ])
}

// After user registration (on server)
// Just update stats on next poll - no action needed
```

### Pattern 4: Polling
```typescript
// Poll stats frequently
useEffect(() => {
  const interval = setInterval(async () => {
    const data = await fetch('/api/admin/stats')
    setStats(data.stats)
  }, 5000)
  
  return () => clearInterval(interval)
}, [])
```

## Query Parameter Matrix

### `/api/admin/game-state`
| Parameter | Default | Effect |
|-----------|---------|--------|
| `includeLobbies` | `true` | Include lobbies array |
| `includeRounds` | `true` | Include rounds array |
| `includeUsers` | `true` | Include allUsers array |
| `includeSubmissions` | `false` | Include submissions in rounds |
| `includeScores` | `false` | Include scores in rounds |

### `/api/admin/lobbies`
| Parameter | Default | Effect |
|-----------|---------|--------|
| `gameId` | active | Specific game ID |
| `includePlayers` | `true` | Include players array per lobby |
| `includeCurrentRound` | `true` | Include current round info |

### `/api/admin/rounds`
| Parameter | Default | Effect |
|-----------|---------|--------|
| `gameId` | active | Specific game ID |
| `lobbyId` | all | Filter by specific lobby |
| `includeSubmissions` | `false` | Include submissions array |
| `includeScores` | `false` | Include scores array |

### `/api/admin/users/detailed`
| Parameter | Default | Effect |
|-----------|---------|--------|
| `includeLobby` | `true` | Include lobby assignment |
| `includeDomainRatings` | `true` | Include domain ratings |

## Response Size Comparison

```
Stats only:              200 bytes
Game (no users):         200 KB
Lobbies:                 50 KB
Rounds (no submissions): 20 KB
Users detailed:          100 KB
Full game-state:         2.5 MB  ⚠️

Recommendation: Use specific endpoints!
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Stats endpoint | <100ms | ~50ms ✅ |
| Lobbies endpoint | <300ms | ~200ms ✅ |
| Rounds endpoint | <300ms | ~150ms ✅ |
| Users endpoint | <500ms | ~300ms ✅ |
| Payload (stats) | <1KB | 200B ✅ |
| Payload (others) | <200KB | <100KB ✅ |

## Migration Checklist

- [ ] Replace `fetchGameState()` polling with `fetchStats()`
- [ ] Add separate fetch functions for lobbies, rounds, users
- [ ] Update action handlers to use targeted refreshes
- [ ] Add refresh buttons per tab
- [ ] Remove unnecessary `fetchGameState()` calls
- [ ] Test dashboard performance
- [ ] Monitor payload sizes in network tab
- [ ] Verify no regressions in functionality

## Tips

1. **Always use `/api/admin/stats` for polling** - It's 12,500x smaller!
2. **Fetch tab data on demand** - Not on every refresh
3. **After actions, only refresh what changed** - Don't refetch everything
4. **Use query params to reduce payload** - `includePlayers=false` saves bandwidth
5. **Monitor network tab** - Verify you're not fetching MB of data

## Red Flags 🚩

- ❌ Polling `/api/admin/game-state` every 5 seconds
- ❌ Fetching all submissions after every action
- ❌ Loading all users when viewing lobbies
- ❌ Fetching game-state with `includeSubmissions=true`
- ❌ Not using query parameters

## Green Flags ✅

- ✅ Polling `/api/admin/stats` for live updates
- ✅ Tab-specific data fetching
- ✅ Targeted refreshes after actions
- ✅ Using query params to minimize payload
- ✅ Separate state for lobbies, rounds, users
