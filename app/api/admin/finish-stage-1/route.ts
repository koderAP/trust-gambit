import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const finishStage1Schema = z.object({
  gameId: z.string(),
});

/**
 * POST /api/admin/finish-stage-1
 * Finishes Stage 1 and creates Stage 2 lobbies with top 2 players from each Stage 1 lobby
 */
// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = finishStage1Schema.parse(body);

    // Get game with Stage 1 lobbies
    const game = await prisma.game.findUnique({
      where: { id: validatedData.gameId },
      include: {
        lobbies: {
          where: { stage: 1 },
          include: {
            users: {
              include: {
                submissions: {
                  include: {
                    round: true,
                  },
                },
                roundScores: true,
              },
            },
          },
        },
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    if (game.currentStage !== 1) {
      return NextResponse.json(
        { error: 'Game is not in Stage 1' },
        { status: 400 }
      );
    }

    if (game.lobbies.length === 0) {
      return NextResponse.json(
        { error: 'No Stage 1 lobbies found' },
        { status: 400 }
      );
    }

    // Calculate total scores for each user in each lobby
    const lobbyTopPlayers: { lobbyId: string; topPlayers: { userId: string; totalScore: number }[] }[] = [];

    for (const lobby of game.lobbies) {
      const userScores = lobby.users.map(user => {
        const totalScore = user.roundScores.reduce((sum, score) => sum + score.totalScore, 0);
        return { userId: user.id, totalScore };
      });

      // Sort by total score descending and take top 2
      const topPlayers = userScores.sort((a, b) => b.totalScore - a.totalScore).slice(0, 2);
      
      if (topPlayers.length > 0) {
        lobbyTopPlayers.push({ lobbyId: lobby.id, topPlayers });
      }
    }

    // Calculate optimal Stage 2 lobby distribution (10-20 players per lobby)
    const totalQualifiedPlayers = lobbyTopPlayers.reduce((sum, l) => sum + l.topPlayers.length, 0);
    
    // Find optimal number of lobbies that minimizes variance while keeping size 10-20
    let stage2LobbiesCount: number;
    let playersPerLobby: number[];
    
    if (totalQualifiedPlayers <= 20) {
      // Single lobby
      stage2LobbiesCount = 1;
      playersPerLobby = [totalQualifiedPlayers];
    } else {
      // Try different lobby counts and pick the one with minimum variance
      const minLobbies = Math.ceil(totalQualifiedPlayers / 20);
      const maxLobbies = Math.floor(totalQualifiedPlayers / 10);
      
      let bestCount = minLobbies;
      let minVariance = Infinity;
      
      for (let numLobbies = minLobbies; numLobbies <= maxLobbies; numLobbies++) {
        const baseSize = Math.floor(totalQualifiedPlayers / numLobbies);
        const remainder = totalQualifiedPlayers % numLobbies;
        
        // Some lobbies will have baseSize+1, others baseSize
        const largerLobbies = remainder;
        const smallerLobbies = numLobbies - remainder;
        
        // Calculate variance
        const avgSize = totalQualifiedPlayers / numLobbies;
        const variance = (largerLobbies * Math.pow(baseSize + 1 - avgSize, 2) + 
                         smallerLobbies * Math.pow(baseSize - avgSize, 2)) / numLobbies;
        
        if (variance < minVariance) {
          minVariance = variance;
          bestCount = numLobbies;
        }
      }
      
      stage2LobbiesCount = bestCount;
      
      // Calculate distribution
      const baseSize = Math.floor(totalQualifiedPlayers / stage2LobbiesCount);
      const remainder = totalQualifiedPlayers % stage2LobbiesCount;
      playersPerLobby = Array(stage2LobbiesCount).fill(baseSize);
      for (let i = 0; i < remainder; i++) {
        playersPerLobby[i]++;
      }
    }

    console.log(`Creating ${stage2LobbiesCount} Stage 2 lobbies for ${totalQualifiedPlayers} qualified players`);
    console.log(`Lobby distribution: ${playersPerLobby.join(', ')} players`);

    // Create Stage 2 lobbies (WAITING status, need to be activated)
    const stage2Lobbies = [];
    for (let i = 0; i < stage2LobbiesCount; i++) {
      const lobby = await prisma.lobby.create({
        data: {
          name: `Stage 2 - Pool ${i + 1}`,
          poolNumber: i + 1,
          stage: 2,
          maxUsers: playersPerLobby[i], // Dynamic max based on optimal distribution
          currentUsers: 0,
          status: 'WAITING', // Need to activate Stage 2 lobbies manually
          gameId: validatedData.gameId,
        },
      });
      stage2Lobbies.push(lobby);
    }

    // Assign qualified players to Stage 2 lobbies in round-robin fashion
    let currentLobbyIndex = 0;
    const qualifiedUserIds: string[] = [];
    const promotions: { userId: string; fromLobby: string; toLobby: string }[] = [];

    for (const { lobbyId, topPlayers } of lobbyTopPlayers) {
      for (const { userId } of topPlayers) {
        qualifiedUserIds.push(userId);
        const targetLobby = stage2Lobbies[currentLobbyIndex];
        
        // Update user's lobby assignment
        await prisma.user.update({
          where: { id: userId },
          data: { lobbyId: targetLobby.id },
        });

        promotions.push({
          userId,
          fromLobby: lobbyId,
          toLobby: targetLobby.id,
        });

        // Update lobby user count
        await prisma.lobby.update({
          where: { id: targetLobby.id },
          data: { currentUsers: { increment: 1 } },
        });

        // Move to next lobby (round-robin)
        currentLobbyIndex = (currentLobbyIndex + 1) % stage2LobbiesCount;
      }
    }

    // Update Stage 1 lobbies to COMPLETED status
    await prisma.lobby.updateMany({
      where: {
        gameId: validatedData.gameId,
        stage: 1,
      },
      data: {
        status: 'COMPLETED',
      },
    });

    // Update game to Stage 2
    await prisma.game.update({
      where: { id: validatedData.gameId },
      data: {
        currentStage: 2,
        currentRound: 0, // Reset round counter for Stage 2
        status: 'STAGE_2_ACTIVE',
      },
    });

    return NextResponse.json({
      message: 'Stage 1 completed successfully',
      stage1Lobbies: game.lobbies.length,
      qualifiedPlayers: totalQualifiedPlayers,
      stage2Lobbies: stage2LobbiesCount,
      lobbyDistribution: playersPerLobby,
      promotions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Finish Stage 1 error:', error);
    return NextResponse.json(
      { error: 'Failed to finish Stage 1' },
      { status: 500 }
    );
  }
}
