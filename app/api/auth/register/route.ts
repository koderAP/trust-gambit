import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { name, email, password, hostelName } = await request.json()

    // Validate input
    if (!name || !email || !password) {
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
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

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

    return NextResponse.json({
      message: 'User registered successfully',
      userId: user.id,
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    )
  }
}
