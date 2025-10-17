# Auto-Answer Script

Automatically submits answer "1" for users when a round is active.

## How to Use

### 1. Start the development server
```bash
npm run dev
```

### 2. Make sure users are seeded (if not already done)
```bash
npx tsx scripts/seed-3000-players.ts
```

### 3. Admin starts a game and starts a round
- Go to http://localhost:3000/admin/dashboard
- Create a new game
- Start game (assign lobbies)
- Start Round 1

### 4. Run the auto-answer script
```bash
# Answer for players 1-100
npx tsx scripts/auto-answer.ts 1 100

# Answer for all 3000 players
npx tsx scripts/auto-answer.ts 1 3000

# Answer for specific range
npx tsx scripts/auto-answer.ts 501 1000
```

## What It Does

The script:
1. ✅ Logs in each user
2. ✅ Checks if user is in a lobby
3. ✅ Checks if there's an ACTIVE round
4. ✅ Submits answer "1" if window is open
5. ⏭️ Skips if already submitted

## Output Example

```
🤖 AUTO-ANSWER SCRIPT STARTING
==================================================
Target: http://localhost:3000
Players: 1 to 100 (Total: 100)
Action: Submit answer "1" if round is ACTIVE

⏳ Processing users...

✅ player1@iitd.ac.in           - Submitted "1" for Round 1
✅ player2@iitd.ac.in           - Submitted "1" for Round 1
⏭️  player3@iitd.ac.in           - Already submitted
⏸️  player4@iitd.ac.in           - Not in lobby

==================================================
📊 SUMMARY
==================================================
Total Users:          100
✅ Logged In:         100
🏠 In Lobbies:        95
🎯 Active Rounds:     95
📝 Submitted "1":     92
⏭️  Already Submitted: 3
❌ Failed:            0
==================================================
```

## Use Cases

### Testing Game Flow
```bash
# Start a round, then auto-submit for all users
npx tsx scripts/auto-answer.ts 1 3000
```

### Simulating Partial Participation
```bash
# Only 50% of users answer
npx tsx scripts/auto-answer.ts 1 1500
```

### Testing Timeout Scenarios
```bash
# Submit for some users, let others timeout
npx tsx scripts/auto-answer.ts 1 100
# Then admin ends the round after timeout
```

## Requirements

- Development server must be running (`npm run dev`)
- Users must be seeded (`scripts/seed-3000-players.ts`)
- Admin must have started a game and a round
- Password for all test users: `password123`
