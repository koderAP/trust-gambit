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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const includeLobby = searchParams.get('includeLobby') !== 'false' // default true
    const includeDomainRatings = searchParams.get('includeDomainRatings') !== 'false' // default true

    // Fetch all users with detailed information
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        profileComplete: true,
        lobbyRequested: true,
        lobbyId: true,
        createdAt: true,
        ...(includeLobby && {
          lobby: {
            select: {
              id: true,
              name: true,
              poolNumber: true,
              stage: true,
              status: true
            }
          }
        })
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch domain ratings separately if requested (since they're in a separate table)
    let domainRatingsMap: Record<string, any[]> = {}
    if (includeDomainRatings) {
      const allRatings = await prisma.domainRating.findMany({
        where: {
          userId: { in: users.map(u => u.id) }
        },
        select: {
          userId: true,
          domain: true,
          rating: true,
          reason: true
        }
      })

      domainRatingsMap = allRatings.reduce((acc, rating) => {
        if (!acc[rating.userId]) {
          acc[rating.userId] = []
        }
        acc[rating.userId].push({
          domain: rating.domain,
          rating: rating.rating,
          reason: rating.reason
        })
        return acc
      }, {} as Record<string, any[]>)
    }

    // Format users with domain ratings
    const usersWithRatings = users.map(user => ({
      ...user,
      ...(includeDomainRatings && {
        domainRatings: domainRatingsMap[user.id] || []
      })
    }))

    return NextResponse.json({
      success: true,
      users: usersWithRatings
    })
  } catch (error: any) {
    console.error('Error fetching detailed users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
