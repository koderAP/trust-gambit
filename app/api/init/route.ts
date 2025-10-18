import { NextResponse } from 'next/server'
import { initializeAdmin } from '@/lib/initAdmin'

export const dynamic = 'force-dynamic'

/**
 * Initialize system resources (admin user, etc.)
 * This endpoint is called during Docker health checks and on first request
 */
export async function GET() {
  try {
    await initializeAdmin()
    
    return NextResponse.json({
      status: 'initialized',
      message: 'System initialized successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Initialization error:', error)
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to initialize system',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
