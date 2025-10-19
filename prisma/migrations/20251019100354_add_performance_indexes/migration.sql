-- CreateIndex
CREATE INDEX "Submission_roundId_action_idx" ON "Submission"("roundId", "action");

-- CreateIndex
CREATE INDEX "Submission_roundId_userId_idx" ON "Submission"("roundId", "userId");

-- CreateIndex
CREATE INDEX "RoundScore_userId_totalScore_idx" ON "RoundScore"("userId", "totalScore");

-- CreateIndex
CREATE INDEX "RoundScore_roundId_userId_idx" ON "RoundScore"("roundId", "userId");

-- CreateIndex
CREATE INDEX "Round_lobbyId_status_idx" ON "Round"("lobbyId", "status");

-- CreateIndex
CREATE INDEX "Round_gameId_status_idx" ON "Round"("gameId", "status");
