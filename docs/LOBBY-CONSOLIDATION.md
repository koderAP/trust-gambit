# Lobby Consolidation Feature

## Problem

When the admin clicks "Assign Lobbies" multiple times (e.g., once per player as they register), it creates multiple small lobbies instead of one optimally-sized lobby.

**Example:**
- 3 players register at different times
- Admin clicks "Assign Lobbies" after each registration
- Result: 3 lobbies with 1 player each ❌
- Expected: 1 lobby with 3 players ✅

## Root Cause

The "Assign Lobbies" button processes only **unassigned players** (those with `lobbyId: null`). This is by design for incremental addition, but it means:

1. Player 1 registers → Click "Assign Lobbies" → Pool 1 (1 player)
2. Player 2 registers → Click "Assign Lobbies" → Pool 2 (1 player)  
3. Player 3 registers → Click "Assign Lobbies" → Pool 3 (1 player)

Each click creates a new lobby with only the new player(s).

## Solution: Consolidate Lobbies Feature

### New Endpoint: `/api/admin/consolidate-lobbies`

**What it does:**
- Takes all players from WAITING lobbies
- Deletes the small WAITING lobbies
- Re-creates optimally-sized lobbies (up to 15 players each)
- Only affects lobbies in WAITING status (safe to use)

**Example:**
- Before: Pool 1 (1 player), Pool 2 (1 player), Pool 3 (1 player)
- After: Pool 1 (3 players)

### How to Use

1. **Assign lobbies** as players register (clicking multiple times is OK)
2. When ready to start, if you have small lobbies, click **"Consolidate Small Lobbies"**
3. Click **"Activate Lobbies"** to make them ready for play

### UI Button

The "Consolidate Small Lobbies" button appears when:
- Game has multiple WAITING lobbies (2 or more)
- Located below the "Activate Lobbies" button
- Orange color to distinguish from other actions

## Logging Added

The `/api/admin/start-game` endpoint now logs:
```
[Lobby Assignment] Processing 3 players, creating 1 lobby/lobbies
[Lobby Assignment] Creating Pool 1 with 3 players
```

Check your server console to see these logs when assigning lobbies.

## Best Practices

### Option 1: Wait and Assign Once (Recommended)
1. Wait for all/most players to register
2. Click "Assign Lobbies" **once**
3. Lobbies are created optimally from the start
4. Click "Activate Lobbies" when ready

### Option 2: Incremental + Consolidate
1. Click "Assign Lobbies" as players register (multiple times)
2. Before activating, click "Consolidate Small Lobbies"
3. This merges small lobbies into optimal sizes
4. Click "Activate Lobbies" when ready

### Option 3: Incremental (Advanced)
1. Click "Assign Lobbies" multiple times to add lobbies
2. Some lobbies may be small (< 15 players)
3. This is OK for testing or if you want separated groups
4. Click "Activate Lobbies" when ready

## Technical Details

### Consolidation Algorithm

```typescript
// 1. Collect all players from WAITING lobbies
const allPlayers = waitingLobbies.flatMap(lobby => lobby.users)

// 2. Delete old WAITING lobbies
await deleteWaitingLobbies()

// 3. Shuffle players randomly
const shuffled = allPlayers.sort(() => Math.random() - 0.5)

// 4. Create optimal lobbies (15 players each)
const newLobbies = Math.ceil(shuffled.length / 15)
for (let i = 0; i < newLobbies; i++) {
  createLobby(shuffled.slice(i * 15, (i + 1) * 15))
}
```

### Safety Guarantees

✅ Only affects WAITING lobbies (not ACTIVE ones)  
✅ Players are never lost (all reassigned)  
✅ Pool numbering continues correctly  
✅ Can be used multiple times safely  
✅ No impact on active games

## Examples

### Example 1: Three Small Lobbies
```
Before consolidation:
- Pool 1: 1 player (WAITING)
- Pool 2: 1 player (WAITING)
- Pool 3: 1 player (WAITING)

After consolidation:
- Pool 1: 3 players (WAITING)
```

### Example 2: Mixed Sizes
```
Before consolidation:
- Pool 1: 5 players (WAITING)
- Pool 2: 3 players (WAITING)
- Pool 3: 2 players (WAITING)
- Pool 4: 1 player (WAITING)

After consolidation:
- Pool 1: 11 players (WAITING)
```

### Example 3: Large Group
```
Before consolidation:
- Pool 1: 8 players (WAITING)
- Pool 2: 7 players (WAITING)
- Pool 3: 10 players (WAITING)
- Pool 4: 5 players (WAITING)
Total: 30 players

After consolidation:
- Pool 1: 15 players (WAITING)
- Pool 2: 15 players (WAITING)
```

### Example 4: With Active Lobbies (Safe)
```
Before consolidation:
- Pool 1: 15 players (ACTIVE) ← Not touched
- Pool 2: 15 players (ACTIVE) ← Not touched
- Pool 3: 2 players (WAITING) ← Will be consolidated
- Pool 4: 3 players (WAITING) ← Will be consolidated

After consolidation:
- Pool 1: 15 players (ACTIVE) ← Unchanged
- Pool 2: 15 players (ACTIVE) ← Unchanged
- Pool 5: 5 players (WAITING) ← New consolidated lobby
```

## Related Files

1. `/app/api/admin/consolidate-lobbies/route.ts` - New consolidation endpoint
2. `/app/api/admin/start-game/route.ts` - Added logging
3. `/app/admin/dashboard/page.tsx` - Added consolidate button
4. `/docs/LOBBY-CONSOLIDATION.md` - This documentation

## Future Improvements

- [ ] Show lobby size statistics before consolidation
- [ ] Warning if lobbies are very unbalanced
- [ ] Option to consolidate only lobbies below a threshold
- [ ] Automatic consolidation suggestion
- [ ] Undo consolidation feature
