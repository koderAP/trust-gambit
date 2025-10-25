/**
 * Custom Next.js Server with Socket.IO Support
 * 
 * This custom server is required because Socket.IO needs access to the HTTP server
 * instance to attach its WebSocket handlers. Next.js standalone mode doesn't expose
 * the HTTP server, so we need this custom server.
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { initSocketServer } from './lib/socket/server'

// Force development mode for custom server
const dev = true  // Always use dev mode when running via tsx server.ts
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Create Next.js app
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling request:', err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // Initialize Socket.IO server
  try {
    const socketServer = initSocketServer(httpServer)
    console.log('✅ Socket.IO server initialized')
    
    // Make socket server globally available
    ;(global as any).socketServer = socketServer
  } catch (err) {
    console.error('❌ Failed to initialize Socket.IO server:', err)
    if (err instanceof Error) {
      console.error('Stack:', err.stack)
    }
  }

  // Initialize startup services (admin user, auto-end)
  try {
    await import('./startup')
    console.log('✅ Startup services initialized')
  } catch (err) {
    console.error('❌ Failed to initialize startup services:', err)
    if (err instanceof Error) {
      console.error('Stack:', err.stack)
    }
  }

  // Start listening
  httpServer.once('error', (err: Error) => {
    console.error('Server error:', err)
    process.exit(1)
  })

  httpServer.listen(port, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎮  Trust Gambit Server                            ║
║                                                       ║
║   ✅ Next.js server ready                            ║
║   ✅ Socket.IO enabled                               ║
║   🌐 URL: http://${hostname}:${port}                 ║
║   📡 Mode: ${dev ? 'Development' : 'Production'}     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `)
  })
})
