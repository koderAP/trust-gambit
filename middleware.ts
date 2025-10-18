import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware runs on every request
// We'll use it to ensure admin is initialized on first deployment

let initializationAttempted = false

export async function middleware(request: NextRequest) {
  // Only attempt initialization once per deployment
  if (!initializationAttempted) {
    initializationAttempted = true
    
    // Trigger initialization in the background
    // This doesn't block the request
    if (process.env.NODE_ENV === 'production') {
      try {
        // Call our init endpoint in the background
        const baseUrl = request.nextUrl.origin
        fetch(`${baseUrl}/api/init`).catch((error) => {
          console.error('Background admin initialization failed:', error)
        })
      } catch (error) {
        console.error('Failed to trigger admin initialization:', error)
      }
    }
  }

  return NextResponse.next()
}

// Only run middleware on specific paths to avoid unnecessary overhead
export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
