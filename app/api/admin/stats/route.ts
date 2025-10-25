import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await auth()
    
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // LIGHTWEIGHT: Only fetch counts, no relations
    const [
      totalUsers,
      profileCompleteUsers,
      usersInLobbies,
      activeGame
    ] = await Promise.all([
      // Total users count
      prisma.user.count(),
      
      // Profile complete users count
      prisma.user.count({
        where: { profileComplete: true }
      }),
      
      // Users in lobbies count
      prisma.user.count({
        where: { lobbyId: { not: null } }
      }),
      
      // Active game basic info (no relations)
      prisma.game.findFirst({
        where: {
          status: { notIn: ['COMPLETED'] }
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          currentRound: true,
          currentStage: true
        }
      })
    ])

    // Calculate derived stats
    const profileIncompleteUsers = totalUsers - profileCompleteUsers
    const usersWaitingForLobby = profileCompleteUsers - usersInLobbies

    // Return ONLY the statistics
    const stats = {
      totalUsers,
      profileCompleteUsers,
      profileIncompleteUsers,
      usersInLobbies,
      usersWaitingForLobby
    }

    return NextResponse.json({
      success: true,
      stats,
      activeGame: activeGame ? {
        id: activeGame.id,
        status: activeGame.status,
        currentRound: activeGame.currentRound,
        currentStage: activeGame.currentStage
      } : null
    })
  } catch (error: any) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
