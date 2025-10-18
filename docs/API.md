# Trust Gambit API Documentation

Complete reference for all API endpoints in the Trust Gambit platform.

## Table of Contents

- [Authentication](#authentication)
- [Health & System](#health--system)
- [User Profile](#user-profile)
- [Game State](#game-state)
- [Lobby Management](#lobby-management)
- [Round Management](#round-management)
- [Admin - Game Control](#admin---game-control)
- [Admin - User Management](#admin---user-management)
- [Admin - Question Management](#admin---question-management)
- [Admin - Lobby Management](#admin---lobby-management)

---

## Authentication

### Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "cm...",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PLAYER"
  }
}
```

**Rate Limit:** 200 requests/minute (testing), 10 requests/10 minutes (production)

**Error Codes:**
- `400` - Invalid input or user already exists
- `429` - Rate limit exceeded
- `500` - Server error

---

### Login

**POST** `/api/auth/login`

Handled by NextAuth.js. Use NextAuth `signIn()` method on client side.

```typescript
import { signIn } from 'next-auth/react';

await signIn('credentials', {
  email: 'user@example.com',
  password: 'password',
  redirect: false,
});
```

---

### Get Current User

**GET** `/api/auth/me`

Get currently authenticated user's information.

**Response:**
```json
{
  "id": "cm...",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "PLAYER",
  "profileComplete": true,
  "lobbyId": "lobby123"
}
```

**Authentication:** Required

---

## Health & System

### Health Check

**GET** `/api/health`

Check system health status.

**Response:**
```json
{
  "timestamp": "2025-10-18T10:00:00.000Z",
  "status": "healthy",
  "uptime": 3600.5,
  "environment": "production",
  "adminInitialized": true,
  "envInfo": {
    "nodeEnv": "production",
    "platform": "docker",
    "hasDatabase": true,
    "hasNextAuth": true,
    "hasTrustHost": true,
    "nextAuthUrl": "http://localhost:3000"
  },
  "checks": {
    "database": {
      "status": "healthy",
      "circuitBreaker": {
        "state": "CLOSED",
        "failures": 0
      }
    },
    "redis": {
      "status": "healthy"
    },
    "memory": {
      "status": "healthy",
      "heapUsed": "45MB",
      "heapTotal": "80MB",
      "rss": "150MB"
    }
  }
}
```

**No Authentication Required**

---

### Initialize System

**GET** `/api/init`

Initialize system and create admin user if needed.

**Response:**
```json
{
  "message": "Admin initialization complete",
  "adminCreated": false,
  "existingAdmins": 1
}
```

---

## User Profile

### Get User Profile

**GET** `/api/profile/[userId]`

Get a user's profile information.

**Parameters:**
- `userId` - User ID

**Response:**
```json
{
  "id": "cm...",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "PLAYER",
  "profileComplete": true,
  "hostelName": "Hostel 5",
  "domainRatings": [
    {
      "domain": "ALGORITHMS",
      "rating": 8
    },
    {
      "domain": "FINANCE",
      "rating": 5
    }
    // ... 10 domains total
  ]
}
```

**Authentication:** Required

---

### Complete Profile

**POST** `/api/profile/complete`

Complete user profile with domain ratings (10 domains required).

**Request Body:**
```json
{
  "hostelName": "Hostel 5",
  "domainRatings": {
    "ALGORITHMS": 8,
    "FINANCE": 5,
    "ECONOMICS": 6,
    "STATISTICS": 7,
    "PROBABILITY": 8,
    "MACHINE_LEARNING": 6,
    "CRYPTO": 4,
    "BIOLOGY": 3,
    "INDIAN_HISTORY": 5,
    "GAME_THEORY": 7
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "cm...",
    "profileComplete": true,
    "hostelName": "Hostel 5"
  }
}
```

**Authentication:** Required

**Validation:**
- All 10 domains must be rated
- Ratings must be integers 0-10
- Hostel name required

---

### Update Profile

**PUT** `/api/profile/update`

Update user profile information.

**Request Body:**
```json
{
  "name": "John Smith",
  "hostelName": "Hostel 3",
  "domainRatings": {
    "ALGORITHMS": 9
    // ... partial updates allowed
  }
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "cm...",
    "name": "John Smith",
    "hostelName": "Hostel 3"
  }
}
```

**Authentication:** Required

---

## Game State

### Get Game State

**GET** `/api/game-state`

Get current game state for the player.

**Response:**
```json
{
  "game": {
    "id": "cm...",
    "status": "IN_PROGRESS",
    "currentStage": 1,
    "currentRound": 5
  },
  "lobby": {
    "id": "lobby123",
    "name": "Pool 1",
    "gameId": "cm...",
    "isActive": true,
    "currentRound": 5
  },
  "currentRound": {
    "id": "round123",
    "roundNumber": 5,
    "status": "ACTIVE",
    "question": {
      "text": "What is the time complexity...",
      "domain": "ALGORITHMS",
      "imageUrl": null
    },
    "startTime": "2025-10-18T10:00:00.000Z",
    "durationSeconds": 300
  },
  "userSubmission": null,
  "leaderboard": [
    {
      "userId": "cm...",
      "name": "Alice",
      "cumulativeScore": 15.5,
      "rank": 1
    }
  ]
}
```

**Authentication:** Required

---

### Get Game Winners

**GET** `/api/game-winners`

Get winners of completed games.

**Query Parameters:**
- `gameId` (optional) - Specific game ID

**Response:**
```json
{
  "stage1Winners": [
    {
      "userId": "cm...",
      "name": "Alice",
      "lobbyName": "Pool 1",
      "finalScore": 25.5,
      "rank": 1
    }
  ],
  "stage2Winners": [
    {
      "userId": "cm...",
      "name": "Bob",
      "finalScore": 45.0,
      "rank": 1
    }
  ]
}
```

---

## Lobby Management

### Get Lobby Details

**GET** `/api/lobby/[id]`

Get detailed lobby information.

**Parameters:**
- `id` - Lobby ID

**Response:**
```json
{
  "id": "lobby123",
  "name": "Pool 1",
  "gameId": "cm...",
  "isActive": true,
  "currentRound": 5,
  "players": [
    {
      "id": "cm...",
      "name": "Alice",
      "cumulativeScore": 15.5
    }
  ],
  "rounds": [
    {
      "id": "round123",
      "roundNumber": 5,
      "status": "ACTIVE"
    }
  ]
}
```

**Authentication:** Required

---

### Get Lobby Leaderboard

**GET** `/api/lobbies/[lobbyId]/leaderboard`

Get lobby leaderboard rankings.

**Parameters:**
- `lobbyId` - Lobby ID

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "cm...",
      "name": "Alice",
      "cumulativeScore": 25.5,
      "roundScores": [1, 1.5, -1, 2, 1]
    }
  ]
}
```

**Authentication:** Required

---

### Get Lobby Rounds

**GET** `/api/lobbies/[lobbyId]/rounds`

Get all rounds for a lobby.

**Parameters:**
- `lobbyId` - Lobby ID

**Response:**
```json
{
  "rounds": [
    {
      "id": "round123",
      "roundNumber": 1,
      "status": "ENDED",
      "question": {
        "domain": "ALGORITHMS",
        "text": "Question text..."
      },
      "startTime": "2025-10-18T10:00:00.000Z",
      "endTime": "2025-10-18T10:05:00.000Z"
    }
  ]
}
```

**Authentication:** Required

---

## Round Management

### Submit Round Action

**POST** `/api/rounds/start`

Submit action for current round (Solve, Delegate, or Pass).

**Request Body:**
```json
{
  "action": "SOLVE",
  "answer": "Option A",
  "delegateTo": null
}
```

Or for delegation:
```json
{
  "action": "DELEGATE",
  "answer": null,
  "delegateTo": "user-id-here"
}
```

Or for pass:
```json
{
  "action": "PASS",
  "answer": null,
  "delegateTo": null
}
```

**Response:**
```json
{
  "success": true,
  "submission": {
    "id": "sub123",
    "action": "SOLVE",
    "answer": "Option A",
    "score": null
  }
}
```

**Authentication:** Required

**Validation:**
- Round must be ACTIVE
- User must be in active lobby
- Cannot submit twice for same round
- If DELEGATE, must specify valid delegateTo userId

---

### Get Round Submission

**GET** `/api/rounds/[roundId]/submission`

Get user's submission for a round.

**Parameters:**
- `roundId` - Round ID

**Response:**
```json
{
  "submission": {
    "id": "sub123",
    "action": "SOLVE",
    "answer": "Option A",
    "delegateTo": null,
    "score": 1.0,
    "isCorrect": true
  }
}
```

**Authentication:** Required

---

### Get Round Results

**GET** `/api/rounds/[roundId]/results`

Get complete results for an ended round.

**Parameters:**
- `roundId` - Round ID

**Response:**
```json
{
  "round": {
    "id": "round123",
    "roundNumber": 5,
    "status": "ENDED",
    "correctAnswer": "Option A"
  },
  "submissions": [
    {
      "userId": "cm...",
      "name": "Alice",
      "action": "SOLVE",
      "score": 1.0,
      "isCorrect": true
    }
  ],
  "delegationGraph": {
    "nodes": [
      { "id": "user1", "name": "Alice", "action": "SOLVE" }
    ],
    "edges": [
      { "from": "user2", "to": "user1" }
    ]
  }
}
```

**Authentication:** Required

**Note:** Only available after round ends

---

### End Round (Admin)

**POST** `/api/rounds/[roundId]/end`

Manually end a round and calculate scores.

**Parameters:**
- `roundId` - Round ID

**Response:**
```json
{
  "success": true,
  "round": {
    "id": "round123",
    "status": "ENDED",
    "endTime": "2025-10-18T10:05:00.000Z"
  },
  "scoresCalculated": 15
}
```

**Authentication:** Admin only

---

## Admin - Game Control

### Create New Game

**POST** `/api/admin/create-new-game`

Create a new game instance.

**Request Body:**
```json
{
  "name": "Trust Gambit October 2025",
  "lambda": 0.5,
  "beta": 0.1,
  "gamma": 0.2
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "id": "cm...",
    "name": "Trust Gambit October 2025",
    "status": "NOT_STARTED",
    "currentStage": 0,
    "lambda": 0.5,
    "beta": 0.1,
    "gamma": 0.2
  }
}
```

**Authentication:** Admin only

---

### Start Game

**POST** `/api/admin/start-game`

Start the game (move from NOT_STARTED to IN_PROGRESS).

**Request Body:**
```json
{
  "gameId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "id": "cm...",
    "status": "IN_PROGRESS",
    "currentStage": 1,
    "startedAt": "2025-10-18T10:00:00.000Z"
  }
}
```

**Authentication:** Admin only

---

### Configure Rounds

**POST** `/api/admin/configure-rounds`

Configure rounds for all lobbies in current stage.

**Request Body:**
```json
{
  "gameId": "cm...",
  "questionIds": ["q1", "q2", "q3"],
  "durationSeconds": 300
}
```

**Response:**
```json
{
  "success": true,
  "roundsConfigured": 24,
  "lobbies": 8,
  "questionsPerLobby": 3
}
```

**Authentication:** Admin only

**Note:** Creates rounds for all active lobbies with specified questions

---

### Start Round

**POST** `/api/admin/start-round`

Start a new round across all lobbies.

**Request Body:**
```json
{
  "gameId": "cm...",
  "durationSeconds": 300
}
```

**Response:**
```json
{
  "success": true,
  "roundsStarted": 8,
  "currentRound": 5,
  "startTime": "2025-10-18T10:00:00.000Z"
}
```

**Authentication:** Admin only

**Timeout:** 60 seconds (handles large games with 50+ lobbies)

---

### End Current Round

**POST** `/api/admin/end-current-round`

End the currently active round across all lobbies.

**Request Body:**
```json
{
  "gameId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "roundsEnded": 8,
  "scoresCalculated": 120
}
```

**Authentication:** Admin only

---

### Finish Stage 1

**POST** `/api/admin/finish-stage-1`

Complete Stage 1 and advance top 2 from each lobby to Stage 2.

**Request Body:**
```json
{
  "gameId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "stage2Lobbies": 4,
  "qualifiedPlayers": 16,
  "stage2LobbyIds": ["lobby9", "lobby10", "lobby11", "lobby12"]
}
```

**Authentication:** Admin only

**Process:**
1. Identifies top 2 players from each Stage 1 lobby
2. Creates new lobbies for Stage 2 (4 lobbies of 4 players each)
3. Deactivates Stage 1 lobbies
4. Updates game to Stage 2

---

### Finish Stage 2

**POST** `/api/admin/finish-stage-2`

Complete Stage 2 and declare winners.

**Request Body:**
```json
{
  "gameId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "winners": [
    {
      "userId": "cm...",
      "name": "Alice",
      "finalScore": 45.0,
      "rank": 1
    },
    {
      "userId": "cm...",
      "name": "Bob",
      "finalScore": 42.5,
      "rank": 2
    },
    {
      "userId": "cm...",
      "name": "Charlie",
      "finalScore": 40.0,
      "rank": 3
    }
  ]
}
```

**Authentication:** Admin only

---

### End Game

**POST** `/api/admin/end-game`

End the game completely.

**Request Body:**
```json
{
  "gameId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "id": "cm...",
    "status": "ENDED",
    "endedAt": "2025-10-18T15:00:00.000Z"
  }
}
```

**Authentication:** Admin only

---

### Update Game Parameters

**POST** `/api/admin/update-game-params`

Update game scoring parameters (lambda, beta, gamma).

**Request Body:**
```json
{
  "gameId": "cm...",
  "lambda": 0.6,
  "beta": 0.15,
  "gamma": 0.25
}
```

**Response:**
```json
{
  "success": true,
  "game": {
    "id": "cm...",
    "lambda": 0.6,
    "beta": 0.15,
    "gamma": 0.25
  }
}
```

**Authentication:** Admin only

---

### Get Game State (Admin)

**GET** `/api/admin/game-state`

Get comprehensive game state for admin dashboard.

**Response:**
```json
{
  "game": {
    "id": "cm...",
    "status": "IN_PROGRESS",
    "currentStage": 1,
    "currentRound": 5
  },
  "lobbies": [
    {
      "id": "lobby1",
      "name": "Pool 1",
      "playerCount": 15,
      "isActive": true
    }
  ],
  "stats": {
    "totalPlayers": 120,
    "activePlayers": 118,
    "totalSubmissions": 590,
    "averageScore": 12.5
  }
}
```

**Authentication:** Admin only

---

## Admin - User Management

### Get All Users

**GET** `/api/admin/users`

Get list of all registered users.

**Response:**
```json
{
  "users": [
    {
      "id": "cm...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "PLAYER",
      "profileComplete": true,
      "lobbyId": "lobby1",
      "cumulativeScore": 15.5,
      "createdAt": "2025-10-18T09:00:00.000Z"
    }
  ],
  "total": 120
}
```

**Authentication:** Admin only

---

### Reset Users

**POST** `/api/admin/reset-users`

Reset all users' game state (remove from lobbies, clear scores).

**Response:**
```json
{
  "success": true,
  "usersReset": 120
}
```

**Authentication:** Admin only

**Warning:** Destructive operation, use with caution

---

### Kick Player

**POST** `/api/admin/kick-player`

Remove a player from their lobby.

**Request Body:**
```json
{
  "userId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "cm...",
    "lobbyId": null
  }
}
```

**Authentication:** Admin only

---

### Exit Game (User)

**POST** `/api/user/exit-game`

Allow user to voluntarily exit the current game.

**Response:**
```json
{
  "success": true,
  "message": "Successfully exited game"
}
```

**Authentication:** Required

---

## Admin - Question Management

### Get Questions

**GET** `/api/admin/questions`

Get all questions in the database.

**Query Parameters:**
- `domain` (optional) - Filter by domain
- `stage` (optional) - Filter by stage (1 or 2)

**Response:**
```json
{
  "questions": [
    {
      "id": "q1",
      "text": "What is the time complexity...",
      "domain": "ALGORITHMS",
      "correctAnswer": "Option A",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "stage": 1,
      "imageUrl": null,
      "createdAt": "2025-10-18T09:00:00.000Z"
    }
  ],
  "total": 20
}
```

**Authentication:** Admin only

---

### Create Question

**POST** `/api/admin/questions`

Create a new question.

**Request Body:**
```json
{
  "text": "What is the time complexity of binary search?",
  "domain": "ALGORITHMS",
  "correctAnswer": "O(log n)",
  "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
  "stage": 1,
  "imageUrl": "https://example.com/image.png"
}
```

**Response:**
```json
{
  "success": true,
  "question": {
    "id": "q123",
    "text": "What is the time complexity...",
    "domain": "ALGORITHMS",
    "stage": 1
  }
}
```

**Authentication:** Admin only

**Validation:**
- Domain must be one of: ALGORITHMS, FINANCE, ECONOMICS, STATISTICS, PROBABILITY, MACHINE_LEARNING, CRYPTO, BIOLOGY, INDIAN_HISTORY, GAME_THEORY
- Stage must be 1 or 2
- Must have 2-6 options
- correctAnswer must be one of the options

---

### Delete Question

**DELETE** `/api/admin/questions?id=q123`

Delete a question.

**Query Parameters:**
- `id` - Question ID

**Response:**
```json
{
  "success": true,
  "message": "Question deleted"
}
```

**Authentication:** Admin only

---

## Admin - Lobby Management

### Activate Lobbies

**POST** `/api/admin/activate-lobbies`

Assign players to lobbies for Stage 1 (8 pools of 15 players).

**Request Body:**
```json
{
  "gameId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "lobbiesCreated": 8,
  "playersAssigned": 120,
  "lobbies": [
    {
      "id": "lobby1",
      "name": "Pool 1",
      "playerCount": 15
    }
  ]
}
```

**Authentication:** Admin only

**Process:**
- Takes all users with profileComplete=true and no lobbyId
- Randomly divides into 8 lobbies of 15 players each
- Activates lobbies for gameplay

---

### Reset Lobbies

**POST** `/api/admin/reset-lobbies`

Delete all lobbies and reset game state.

**Request Body:**
```json
{
  "gameId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "lobbiesDeleted": 8
}
```

**Authentication:** Admin only

**Warning:** Destructive operation

---

### Consolidate Lobbies

**POST** `/api/admin/consolidate-lobbies`

Consolidate players from partially filled lobbies.

**Request Body:**
```json
{
  "gameId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "lobbiesConsolidated": 2,
  "playersReassigned": 12
}
```

**Authentication:** Admin only

**Use Case:** When some players exit, consolidate remaining players into full lobbies

---

### Wipe Database

**POST** `/api/admin/wipe-database`

Completely wipe all game data (keep users and questions).

**Response:**
```json
{
  "success": true,
  "message": "Database wiped successfully",
  "deleted": {
    "games": 1,
    "lobbies": 8,
    "rounds": 160,
    "submissions": 2400
  }
}
```

**Authentication:** Admin only

**Warning:** EXTREMELY DESTRUCTIVE - Use only for testing/reset

---

## WebSocket Events

Trust Gambit uses Socket.io for real-time updates.

### Client Events (Emit)

```typescript
// Join lobby room
socket.emit('join-lobby', { lobbyId: 'lobby123' });

// Leave lobby room
socket.emit('leave-lobby', { lobbyId: 'lobby123' });
```

### Server Events (Listen)

```typescript
// Round started
socket.on('round-started', (data) => {
  // data: { roundId, roundNumber, startTime, durationSeconds }
});

// Round ended
socket.on('round-ended', (data) => {
  // data: { roundId, endTime }
});

// Submission received
socket.on('submission-received', (data) => {
  // data: { userId, action }
});

// Scores updated
socket.on('scores-updated', (data) => {
  // data: { leaderboard: [...] }
});

// Game state changed
socket.on('game-state-changed', (data) => {
  // data: { status, currentStage, currentRound }
});
```

---

## Error Handling

All endpoints return errors in consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

- `400` - Bad Request (validation failed)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not admin)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate, invalid state)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

### Rate Limiting

Rate limits vary by endpoint:

- **Registration**: 200/min (testing), 10/10min (production)
- **General API**: 100/sec per instance
- **Admin API**: No limit (internal use)

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

---

## Authentication

Most endpoints require authentication via NextAuth session.

**Client-side:**
```typescript
import { useSession } from 'next-auth/react';

const { data: session } = useSession();
// session.user contains user info
```

**Server-side:**
```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const session = await getServerSession(authOptions);
```

**Admin-only endpoints** require `session.user.role === 'ADMIN'`.

---

## Rate Limiting & Performance

### Current Capacity

- **Registration**: 16-17 users/second sustained
- **API Throughput**: 100 requests/second per instance
- **Horizontal Scaling**: 5 app instances behind nginx
- **Database**: 200 max connections, pooled at 60/instance
- **Large Games**: Handles 700+ players, 50+ lobbies efficiently

### Optimization Features

- Connection pooling (60 connections per instance)
- Redis caching with TTL
- Circuit breakers for database and Redis
- Bulk operations for large-scale updates
- Extended timeouts for admin operations (60 seconds)

---

## Development Tips

### Testing API Endpoints

```bash
# Health check
curl http://localhost:3000/api/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass123","name":"Test"}'

# Get game state (requires auth cookie)
curl http://localhost:3000/api/game-state \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Using with Frontend

```typescript
// React hook for API calls
async function submitAction(action: string) {
  const response = await fetch('/api/rounds/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, answer: 'A', delegateTo: null }),
  });
  
  const data = await response.json();
  return data;
}
```

---

## Support

For API issues or questions:
- **GitHub Issues**: [trust-gambit/issues](https://github.com/koderAP/trust-gambit/issues)
- **Documentation**: [docs/](./README.md)
- **Email**: support@trustgambit.com
