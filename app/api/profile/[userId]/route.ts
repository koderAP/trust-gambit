import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        domainRatings: {
          orderBy: {
            rating: 'desc',
          },
        },
        lobby: {
          include: {
            users: {
              select: { id: true, name: true }
            }
          }
        }
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Don't send password to client
    const { password, ...userWithoutPassword } = user

    // Attach lobby info and current round if assigned
    let lobbyInfo = null
    let currentRound = null
    if (user.lobby) {
      lobbyInfo = {
        id: user.lobby.id,
        name: user.lobby.name,
        poolNumber: user.lobby.poolNumber,
        stage: user.lobby.stage,
        status: user.lobby.status,
        users: user.lobby.users,
      }
      // Fetch current active round for this lobby
      const round = await prisma.round.findFirst({
        where: { lobbyId: user.lobby.id, status: 'ACTIVE' },
        orderBy: { roundNumber: 'desc' }
      })
      if (round) currentRound = round
    }

    return NextResponse.json({
      ...userWithoutPassword,
      lobby: lobbyInfo,
      currentRound,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    )
  }
}
