import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Docker container monitoring
 */
// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Basic health check - you can add more checks here
    // (e.g., database connectivity, Redis, etc.)
    
    return NextResponse.json(
      { 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
