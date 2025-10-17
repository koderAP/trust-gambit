import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/admin/activate-lobbies
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth()
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the active game in LOBBIES_FORMING
    const game = await prisma.game.findFirst({
      where: { status: 'LOBBIES_FORMING' },
      include: { lobbies: true }
    })
    if (!game) {
      return NextResponse.json({ error: 'No game in LOBBIES_FORMING state' }, { status: 400 })
    }

    // Check all lobbies are in WAITING
    if (!game.lobbies.every(lobby => lobby.status === 'WAITING')) {
      return NextResponse.json({ error: 'Not all lobbies are in WAITING state' }, { status: 400 })
    }

    // Activate all lobbies
    const updatedLobbies = await prisma.lobby.updateMany({
      where: { id: { in: game.lobbies.map(l => l.id) } },
      data: { status: 'ACTIVE' }
    })

    // Update game status to STAGE_1_ACTIVE (but don't start any rounds yet)
    await prisma.game.update({
      where: { id: game.id },
      data: { 
        status: 'STAGE_1_ACTIVE', 
        currentStage: 1, 
        currentRound: 0  // Start at 0, admin will start round 1 manually
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Lobbies activated and Stage 1 ready. Use "Start Round" to begin.',
      lobbiesActivated: updatedLobbies.count
    })
  } catch (error) {
    console.error('Activate lobbies error:', error)
    return NextResponse.json({ error: 'Failed to activate lobbies' }, { status: 500 })
  }
}
