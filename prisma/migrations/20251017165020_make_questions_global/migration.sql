/*
  Warnings:

  - You are about to drop the column `gameId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the column `roundNumber` on the `Question` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_gameId_fkey";

-- DropIndex
DROP INDEX "Question_gameId_idx";

-- DropIndex
DROP INDEX "Question_gameId_stage_roundNumber_key";

-- DropIndex
DROP INDEX "Question_roundNumber_idx";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "gameId",
DROP COLUMN "roundNumber";

-- CreateIndex
CREATE INDEX "Question_isUsed_idx" ON "Question"("isUsed");
