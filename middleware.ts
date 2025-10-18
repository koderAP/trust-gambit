import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for Trust Gambit
 * 
 * Note: Admin initialization is handled by the /api/health endpoint
 * which is called on first request. No need to trigger it here.
 */
export async function middleware(request: NextRequest) {
  // Middleware can be used for auth checks, redirects, etc.
  // Admin initialization happens via /api/health endpoint
  return NextResponse.next()
}

// Only run middleware on specific paths to avoid unnecessary overhead
export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
