import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/rateLimit'
import { cacheGet, cacheSet } from '@/lib/redis'

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

async function handleRegistration(request: Request) {
  try {
    const body = await request.json()
    const { name, email, password, hostelName } = body

    console.log('📝 Registration attempt:', { email, name, hasPassword: !!password })

    // Check cache first to prevent duplicate rapid registrations
    const cacheKey = `registration:${email}`
    const cached = await cacheGet(cacheKey)
    if (cached && typeof cached === 'string') {
      console.log('⚡ Returning cached registration result')
      return NextResponse.json(JSON.parse(cached))
    }

    // Validate input
    if (!name || !email || !password) {
      console.log('❌ Validation failed: Missing fields')
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      console.log('❌ User already exists:', email)
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password with 10 rounds (faster for high concurrency, still secure)
    // 10 rounds ≈ 150ms vs 12 rounds ≈ 500ms per hash
    const hashedPassword = await hash(password, 10)

    // Create user without assigning to lobby
    // User will complete profile with domain ratings next
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        hostelName: hostelName || null,
        profileComplete: false,
        lobbyRequested: false,
      },
    })

    console.log('✅ User registered successfully:', { userId: user.id, email: user.email })

    const response = {
      message: 'User registered successfully',
      userId: user.id,
    }

    // Cache the result for 60 seconds to prevent duplicate registrations
    await cacheSet(cacheKey, JSON.stringify(response), 60)

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Registration error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Failed to register user', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Apply rate limiting
// NOTE: Temporarily increased for stress testing
// Production: 10 per 10 minutes | Testing: 200 per minute
export const POST = withRateLimit(handleRegistration, {
  interval: 60 * 1000, // 1 minute (for stress testing)
  tokensPerInterval: 200, // 200 registrations per minute (for stress testing)
  uniqueTokenPerInterval: 1000, // Track up to 1000 unique IPs
})

// PRODUCTION SETTINGS (restore after testing):
// export const POST = withRateLimit(handleRegistration, {
//   interval: 10 * 60 * 1000, // 10 minutes
//   tokensPerInterval: 10, // 10 registrations per 10 minutes
//   uniqueTokenPerInterval: 1000,
// })
