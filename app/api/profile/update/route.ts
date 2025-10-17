import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DOMAINS } from '@/lib/constants'

type DomainRatingInput = {
  domain: string
  rating: number
  reason: string
}

export async function PUT(request: Request) {
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

    // Validate that all 10 domains are provided
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

    // Delete existing domain ratings for this user
    await prisma.domainRating.deleteMany({
      where: { userId },
    })

    // Create new domain ratings
    await prisma.domainRating.createMany({
      data: domainRatings.map(dr => ({
        userId,
        domain: dr.domain,
        rating: dr.rating,
        reason: dr.reason || null,
      })),
    })

    // Return updated profile
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        domainRatings: {
          orderBy: { domain: 'asc' },
        },
      },
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
