# Game Data Export Guide

## Overview

The game data export system allows you to download complete snapshots of the Trust Gambit game at any point. This is especially useful since **lobbies get reassigned** between Stage 1 and Stage 2.

## Why Download Twice?

You're right that lobby reassignment makes this tricky! Here's the recommended approach:

### 📸 Snapshot Timeline

1. **After Stage 1 Ends** → Capture initial lobby assignments
   - Shows which players were grouped together in Stage 1
   - Includes all Stage 1 submissions and scores
   - Lobby IDs will change after Stage 2 starts

2. **After Stage 2 Ends** → Capture final lobby assignments
   - Shows new lobby groupings for Stage 2
   - Includes all Stage 2 submissions and scores
   - Complete game data with both stages

3. **After Game Ends** → Final complete snapshot
   - Full game history
   - Final scores and rankings
   - All delegation chains

## API Endpoint

```
GET /api/admin/export-game-data?gameId=<GAME_ID>
```

### Authentication
Requires admin authentication (session cookie).

## What's Included

The export includes:

### Game Info
- Game status, current stage, current round
- Game parameters (lambda, beta, gamma)
- Timestamps (started, ended, created)

### Statistics
- Total users, completed profiles, lobby requests
- Total lobbies (Stage 1 and Stage 2 counts)
- Total rounds (Stage 1 and Stage 2 counts)
- Total submissions (delegated vs direct)

### Lobbies (⚠️ Changes between stages!)
- Lobby ID, name, pool number, stage
- Max users, current users, status
- **List of users in each lobby** (this changes!)

### Users
- User profile data (name, email, hostel)
- Domain ratings (self-assessments)
- Round scores with breakdown:
  - `solveScore` - Base score for solving
  - `delegateScore` - Score from delegation
  - `trustScore` - Trust network score
  - `totalScore` - Combined final score
  - `inCycle` - Whether user is in delegation cycle
  - `distanceFromSolver` - Distance in delegation chain

### Rounds
- Round questions and correct answers
- Round status and timing
- Lobby ID (which lobby played this round)
- All submissions for each round

### Submissions
- User answer or delegation decision
- Action type: SOLVE, DELEGATE, or PASS
- `delegateTo` - ID of user who received delegation
- Correctness, submission time

### Round Scores
- Per-user, per-round scoring breakdown
- All score components
- Delegation graph metrics

## Usage Methods

### Method 1: Using the Download Script (Recommended)

```bash
# Make it executable (first time only)
chmod +x scripts/download-game-data.sh

# Download after Stage 1
./scripts/download-game-data.sh <GAME_ID> after-stage-1

# Download after Stage 2
./scripts/download-game-data.sh <GAME_ID> after-stage-2

# Download final data
./scripts/download-game-data.sh <GAME_ID> final
```

This creates timestamped files like:
- `trust-gambit-after-stage-1-20251104-143022.json`
- `trust-gambit-after-stage-2-20251104-163045.json`
- `trust-gambit-final-20251104-180512.json`

### Method 2: Using curl directly

```bash
curl -X GET "http://localhost:3000/api/admin/export-game-data?gameId=<GAME_ID>" \
  -H "Content-Type: application/json" \
  -o game-data.json
```

### Method 3: Browser Download

Navigate to:
```
http://localhost:3000/api/admin/export-game-data?gameId=<GAME_ID>
```

The browser will download the JSON file automatically.

### Method 4: Using the Admin Dashboard

1. Log in to the admin dashboard at `http://localhost:3000/admin/dashboard`
2. Click the **"Export Data"** button in the top-right corner (next to "End Game" and "Logout")
3. The file will automatically download with a timestamp in the filename

The button is only visible when a game exists, and it automatically names the file based on the current stage:
- `trust-gambit-stage-1-<timestamp>.json` (during Stage 1)
- `trust-gambit-stage-2-<timestamp>.json` (during Stage 2)
- `trust-gambit-game-<timestamp>.json` (other states)

## Tracking Lobby Changes

To track how lobbies change between stages:

### 1. Export After Stage 1
```bash
./scripts/download-game-data.sh abc123 after-stage-1
```

This captures:
```json
{
  "lobbies": [
    {
      "id": "lobby-s1-001",
      "stage": 1,
      "poolNumber": 1,
      "users": [
        { "id": "user1", "name": "Alice" },
        { "id": "user2", "name": "Bob" },
        ...
      ]
    },
    ...
  ]
}
```

### 2. Export After Stage 2
```bash
./scripts/download-game-data.sh abc123 after-stage-2
```

Now lobbies have **different IDs and different members**:
```json
{
  "lobbies": [
    {
      "id": "lobby-s2-001",
      "stage": 2,
      "poolNumber": 1,
      "users": [
        { "id": "user5", "name": "Charlie" },
        { "id": "user1", "name": "Alice" },
        ...
      ]
    },
    ...
  ]
}
```

### 3. Compare the Two Files

You can write a script to:
- Map user IDs to their Stage 1 lobby
- Map user IDs to their Stage 2 lobby
- Analyze how performance in Stage 1 affected Stage 2 grouping
- Track delegation patterns within and across lobby changes

## Example Analysis Script

```python
import json

# Load both snapshots
with open('trust-gambit-after-stage-1-<timestamp>.json') as f:
    stage1_data = json.load(f)

with open('trust-gambit-after-stage-2-<timestamp>.json') as f:
    stage2_data = json.load(f)

# Build user -> lobby mappings
stage1_lobbies = {}
for lobby in stage1_data['lobbies']:
    for user in lobby['users']:
        stage1_lobbies[user['id']] = lobby['poolNumber']

stage2_lobbies = {}
for lobby in stage2_data['lobbies']:
    for user in lobby['users']:
        stage2_lobbies[user['id']] = lobby['poolNumber']

# Compare
for user_id in stage1_lobbies:
    s1_lobby = stage1_lobbies.get(user_id, 'None')
    s2_lobby = stage2_lobbies.get(user_id, 'None')
    print(f"User {user_id}: Stage 1 Lobby {s1_lobby} → Stage 2 Lobby {s2_lobby}")
```

## Data Size Estimates

For a game with 250 users:
- **After Stage 1**: ~5-10 MB (20 rounds × 250 submissions)
- **After Stage 2**: ~10-15 MB (cumulative, includes both stages)
- **Final**: Same as Stage 2 (unless additional data is added)

## Tips

1. **Always download after each stage transition** - You can't recreate past lobby states
2. **Use descriptive filenames** - Include stage name and timestamp
3. **Keep all snapshots** - Storage is cheap, lost data is not
4. **Back up to cloud** - Use git, Dropbox, or cloud storage
5. **Validate downloads** - Check file size and `statistics` object

## Troubleshooting

### "Unauthorized" Error
Make sure you're logged in as admin. The API requires admin session authentication.

### Empty or Incomplete Data
- Verify the `gameId` is correct
- Check that the game has actually started
- Ensure database contains the expected data

### Large File Size
This is normal for games with many users. Consider:
- Compressing JSON files: `gzip trust-gambit-*.json`
- Using `jq` to extract specific data: `jq '.users' data.json > users-only.json`

## Questions?

See the main documentation or check:
- `/app/api/admin/export-game-data/route.ts` - API implementation
- `/scripts/download-game-data.sh` - Download script
- `/docs/ADMIN-API-README.md` - Admin API overview
