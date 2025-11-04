import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const togglePassScoreSchema = z.object({
  gameId: z.string(),
  passScore: z.number().min(-1).max(0), // -1 or 0
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { gameId, passScore } = togglePassScoreSchema.parse(body)

    // Update the game's passScore parameter
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: { passScore },
    })

    console.log(`✅ PASS score updated to ${passScore} for game ${gameId}`)

    return NextResponse.json({
      success: true,
      game: {
        id: updatedGame.id,
        passScore: updatedGame.passScore,
        lambda: updatedGame.lambda,
        beta: updatedGame.beta,
        gamma: updatedGame.gamma,
      },
      message: `PASS score updated to ${passScore}`,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating PASS score:', error)
    return NextResponse.json(
      { error: 'Failed to update PASS score', details: error.message },
      { status: 500 }
    )
  }
}
