import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()

    if (!session || !session.user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user: session.user })
  } catch (error) {
    console.error('Session fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
