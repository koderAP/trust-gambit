-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "hostelName" TEXT,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "lobbyRequested" BOOLEAN NOT NULL DEFAULT false,
    "lobbyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DomainRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lobby" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "poolNumber" INTEGER NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER NOT NULL DEFAULT 15,
    "currentUsers" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Trust Gambit Competition',
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "currentStage" INTEGER NOT NULL DEFAULT 0,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "lambda" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "beta" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "gamma" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "lobbyId" TEXT,
    "roundNumber" INTEGER NOT NULL,
    "stage" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "durationSeconds" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "answer" TEXT,
    "delegateTo" TEXT,
    "isCorrect" BOOLEAN,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundScore" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "solveScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delegateScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inCycle" BOOLEAN NOT NULL DEFAULT false,
    "distanceFromSolver" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrustEdge" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "trustCount" INTEGER NOT NULL DEFAULT 0,
    "lastTrusted" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrustEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_lobbyId_idx" ON "User"("lobbyId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_profileComplete_idx" ON "User"("profileComplete");

-- CreateIndex
CREATE INDEX "DomainRating_userId_idx" ON "DomainRating"("userId");

-- CreateIndex
CREATE INDEX "DomainRating_domain_idx" ON "DomainRating"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "DomainRating_userId_domain_key" ON "DomainRating"("userId", "domain");

-- CreateIndex
CREATE UNIQUE INDEX "Lobby_name_key" ON "Lobby"("name");

-- CreateIndex
CREATE INDEX "Lobby_status_idx" ON "Lobby"("status");

-- CreateIndex
CREATE INDEX "Lobby_stage_idx" ON "Lobby"("stage");

-- CreateIndex
CREATE INDEX "Lobby_gameId_idx" ON "Lobby"("gameId");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Round_gameId_idx" ON "Round"("gameId");

-- CreateIndex
CREATE INDEX "Round_lobbyId_idx" ON "Round"("lobbyId");

-- CreateIndex
CREATE INDEX "Round_status_idx" ON "Round"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Round_gameId_stage_roundNumber_lobbyId_key" ON "Round"("gameId", "stage", "roundNumber", "lobbyId");

-- CreateIndex
CREATE INDEX "Submission_roundId_idx" ON "Submission"("roundId");

-- CreateIndex
CREATE INDEX "Submission_userId_idx" ON "Submission"("userId");

-- CreateIndex
CREATE INDEX "Submission_delegateTo_idx" ON "Submission"("delegateTo");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_roundId_userId_key" ON "Submission"("roundId", "userId");

-- CreateIndex
CREATE INDEX "RoundScore_roundId_idx" ON "RoundScore"("roundId");

-- CreateIndex
CREATE INDEX "RoundScore_userId_idx" ON "RoundScore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundScore_roundId_userId_key" ON "RoundScore"("roundId", "userId");

-- CreateIndex
CREATE INDEX "TrustEdge_fromUserId_idx" ON "TrustEdge"("fromUserId");

-- CreateIndex
CREATE INDEX "TrustEdge_toUserId_idx" ON "TrustEdge"("toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TrustEdge_fromUserId_toUserId_key" ON "TrustEdge"("fromUserId", "toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE INDEX "Admin_username_idx" ON "Admin"("username");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DomainRating" ADD CONSTRAINT "DomainRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundScore" ADD CONSTRAINT "RoundScore_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundScore" ADD CONSTRAINT "RoundScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
