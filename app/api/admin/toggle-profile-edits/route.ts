import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const session = await auth()
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current game
    const game = await prisma.game.findFirst({
      orderBy: { createdAt: 'desc' }
    })

    if (!game) {
      return NextResponse.json(
        { error: 'No game found' },
        { status: 404 }
      )
    }

    // Toggle allowProfileEdits
    const updatedGame = await prisma.game.update({
      where: { id: game.id },
      data: {
        allowProfileEdits: !game.allowProfileEdits
      }
    })

    return NextResponse.json({
      success: true,
      allowProfileEdits: updatedGame.allowProfileEdits,
      message: updatedGame.allowProfileEdits 
        ? 'Profile editing is now ENABLED for all users' 
        : 'Profile editing is now LOCKED for all users'
    })

  } catch (error) {
    console.error('Toggle profile edits error:', error)
    return NextResponse.json(
      { error: 'Failed to toggle profile edits' },
      { status: 500 }
    )
  }
}
