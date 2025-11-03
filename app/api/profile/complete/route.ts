import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DOMAINS } from '@/lib/constants'

type DomainRatingInput = {
  domain: string
  rating: number
  reason: string
}

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { userId, domainRatings } = await request.json() as {
      userId: string
      domainRatings: DomainRatingInput[]
    }

    // Validate input
    if (!userId || !domainRatings || !Array.isArray(domainRatings)) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    // Validate that all 11 domains are provided
    if (domainRatings.length !== DOMAINS.length) {
      return NextResponse.json(
        { error: `All ${DOMAINS.length} domain ratings are required` },
        { status: 400 }
      )
    }

    // Validate that all domains are valid
    const providedDomains = domainRatings.map(dr => dr.domain)
    const invalidDomains = providedDomains.filter(d => !(DOMAINS as readonly string[]).includes(d))
    if (invalidDomains.length > 0) {
      return NextResponse.json(
        { error: `Invalid domains: ${invalidDomains.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if profile editing is allowed
    const game = await prisma.game.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { allowProfileEdits: true }
    })

    if (game && game.allowProfileEdits === false) {
      return NextResponse.json(
        { error: 'Profile editing is currently locked by the game administrator' },
        { status: 403 }
      )
    }

    // ✅ USE TRANSACTION - Ensures all-or-nothing atomicity
    // If any operation fails, all changes are rolled back
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing domain ratings for this user (if any)
      await tx.domainRating.deleteMany({
        where: { userId },
      })

      // Create new domain ratings
      await tx.domainRating.createMany({
        data: domainRatings.map(dr => ({
          userId,
          domain: dr.domain,
          rating: dr.rating,
          reason: dr.reason || null,
        })),
      })

      // Update user's profileComplete status
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { profileComplete: true },
      })

      return updatedUser
    })

    return NextResponse.json({
      message: 'Profile completed successfully',
      userId: result.id,
    })
  } catch (error) {
    console.error('Profile completion error:', error)
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    )
  }
}
