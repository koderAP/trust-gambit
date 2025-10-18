# Lobby Assignment State Management Fix

## Problem Description

When the game was in NOT_STARTED state and 5 players were waiting for lobby assignment:
1. Admin clicks "Assign Lobbies" - lobbies are created and game moves to STAGE_1_ACTIVE
2. 2 more players join and complete their profiles
3. Admin clicks "Assign Lobbies" again for these new players
4. **BUG**: Lobbies were NOT assigned, and the game entered a corrupted state where:
   - Cannot continue the game with users already in lobbies
   - Only "Assign Lobby" button is visible
   - "End Game" button doesn't properly reset state
   - Cannot create a new game (says "a game is already running")

## Root Cause Analysis

### Issue 1: start-game Route State Detection
The `/api/admin/start-game/route.ts` endpoint was only looking for games with status `NOT_STARTED` or `REGISTRATION_OPEN`:

```typescript
let game = await prisma.game.findFirst({
  where: {
    status: {
      in: ['NOT_STARTED', 'REGISTRATION_OPEN'],
    },
  },
})
```

**Problem**: When called the second time, the game status was already `STAGE_1_ACTIVE`, so:
- `findFirst` returned `null` (no game found)
- The code created a **NEW** game instead of using the existing one
- This created duplicate games and corrupted the state

### Issue 2: Pool Numbering
The route always started pool numbering from 1, causing conflicts when adding lobbies incrementally.

### Issue 3: Status Transitions
The route always changed game status to `STAGE_1_ACTIVE` immediately, even when lobbies should be in `WAITING` state first.

## Solutions Implemented

### 1. Fixed start-game Route (app/api/admin/start-game/route.ts)

**Changes:**
- Extended game status search to include `LOBBIES_FORMING` and `STAGE_1_ACTIVE`
- Added logic to fetch existing lobbies and calculate next pool number
- Only update game status if it's `NOT_STARTED` or `REGISTRATION_OPEN`
- Create new lobbies with `WAITING` status (requires explicit activation)
- If game already exists in `LOBBIES_FORMING` or `STAGE_1_ACTIVE`, use it without changing status

**Code changes:**
```typescript
// Now searches for games in multiple states
const existingGame = await prisma.game.findFirst({
  where: {
    status: {
      in: ['NOT_STARTED', 'REGISTRATION_OPEN', 'LOBBIES_FORMING', 'STAGE_1_ACTIVE'],
    },
  },
  include: {
    lobbies: {
      orderBy: { poolNumber: 'desc' },
      take: 1
    }
  }
})

// Calculate next pool number from existing lobbies
let nextPoolNumber = 1
if (existingGame && existingGame.lobbies.length > 0) {
  nextPoolNumber = existingGame.lobbies[0].poolNumber + 1
}

// Only update status for new games
if (!existingGame) {
  // Create new game with LOBBIES_FORMING status
} else if (existingGame.status === 'NOT_STARTED' || existingGame.status === 'REGISTRATION_OPEN') {
  // Update to LOBBIES_FORMING
} else {
  // Use existing game as-is (don't change status)
  game = existingGame
}
```

### 2. Updated Dashboard UI (app/admin/dashboard/page.tsx)

**Changes:**
- Modified "Assign Lobbies" button visibility logic to only show for appropriate states
- Updated success message to guide admins to use "Activate Lobbies" button

**Before:**
```typescript
{activeGame && activeGame.status !== 'ENDED' && (
  <Button onClick={handleStartGame}>
    Assign Lobbies
  </Button>
)}
```

**After:**
```typescript
{activeGame && ['NOT_STARTED', 'REGISTRATION_OPEN', 'LOBBIES_FORMING', 'STAGE_1_ACTIVE'].includes(activeGame.status) && (
  <Button onClick={handleStartGame}>
    Assign Lobbies ({stats.usersWaitingForLobby} players)
  </Button>
)}
```

### 3. Verified Other Routes

**activate-lobbies-simple** (app/api/admin/activate-lobbies-simple/route.ts):
- ✅ Already handles incremental activation correctly
- Only changes game status if it's `LOBBIES_FORMING` or `NOT_STARTED`
- Safe to call multiple times

**end-game** (app/api/admin/end-game/route.ts):
- ✅ Properly marks game as `ENDED`
- Resets all users (removes from lobbies)
- Marks lobbies as `COMPLETED`
- Resets questions to unused

**create-new-game** (app/api/admin/create-new-game/route.ts):
- ✅ Already checks for active games correctly
- Prevents creating new game if one exists in states other than `NOT_STARTED`, `ENDED`, or `COMPLETED`

## New Workflow

### Correct Lobby Assignment Flow

1. **Initial Setup**: Game is in `NOT_STARTED` state
2. **First Batch**: 5 players complete profiles
   - Admin clicks "Assign Lobbies"
   - Creates Pool 1 with 5 players (status: WAITING)
   - Game status → LOBBIES_FORMING
3. **Second Batch**: 2 more players complete profiles
   - Admin clicks "Assign Lobbies" again
   - Creates Pool 2 with 2 players (status: WAITING)
   - Game remains in LOBBIES_FORMING
4. **Activate**: Admin clicks "Activate Lobbies"
   - All WAITING lobbies → ACTIVE
   - Game status → STAGE_1_ACTIVE
5. **Continue**: Admin can now start rounds

### Key Benefits

✅ **Incremental Lobby Creation**: Can add lobbies multiple times before activation
✅ **No State Corruption**: Uses existing game instead of creating duplicates
✅ **Proper Pool Numbering**: Automatically continues from existing pool numbers
✅ **Safe Workflow**: WAITING → ACTIVE transition gives admin control
✅ **Clear Feedback**: UI guides admin through proper steps

## Testing Scenarios

### Scenario 1: Incremental Addition (Fixed)
1. Create game with 5 players → Pool 1 (WAITING)
2. Add 2 more players → Pool 2 (WAITING)
3. Activate lobbies → Both pools become ACTIVE
4. ✅ Game continues normally

### Scenario 2: Late Arrivals
1. Create game with 5 players → Pool 1
2. Activate lobbies → Game STAGE_1_ACTIVE
3. 2 more players join
4. Add them → Pool 2 (WAITING)
5. Activate new lobby → Pool 2 becomes ACTIVE
6. ✅ Both pools can play

### Scenario 3: End and Restart
1. End active game → Game status ENDED
2. Create new game → New game with NOT_STARTED
3. Assign lobbies → Works correctly
4. ✅ Clean slate for new game

## Migration Notes

**No database migration required** - this is a code-only fix.

**Existing games**: If you have a game currently in a corrupted state:
1. Use "End Game" button to mark it as ENDED
2. Use "Create New Game" button to start fresh
3. All users will be reset and ready for new lobby assignment

## Related Files Modified

1. `/app/api/admin/start-game/route.ts` - Main fix for incremental lobby assignment
2. `/app/admin/dashboard/page.tsx` - UI improvements for better workflow
3. `/docs/LOBBY-ASSIGNMENT-FIX.md` - This documentation

## Future Improvements

Consider implementing:
- [ ] Automatic pool merging if pools are too small
- [ ] Warning if pool sizes are unbalanced
- [ ] Ability to remove/reassign players before activation
- [ ] Transaction-based operations to prevent partial state updates
- [ ] Better error handling and rollback mechanisms
