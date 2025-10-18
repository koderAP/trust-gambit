import { NextResponse } from 'next/server';
import { ensureAdminExists } from '@/lib/initAdmin';

/**
 * Health check endpoint for Docker container monitoring
 * Also ensures admin user exists on first health check
 */
// Force dynamic rendering for all API routes
export const dynamic = 'force-dynamic'

let adminInitialized = false;

export async function GET() {
  try {
    // Initialize admin on first health check
    if (!adminInitialized) {
      await ensureAdminExists();
      adminInitialized = true;
    }
    
    return NextResponse.json(
      { 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        adminInitialized
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
