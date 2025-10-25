/**
 * Custom Next.js Server with Socket.IO Support
 * 
 * This custom server is required because Socket.IO needs access to the HTTP server
 * instance to attach its WebSocket handlers. Next.js standalone mode doesn't expose
 * the HTTP server, so we need this custom server.
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const path = require('path')
const fs = require('fs')

// Determine if we're in production by checking if .next/BUILD_ID exists
const buildIdPath = path.join(__dirname, '.next', 'BUILD_ID')
const dev = !fs.existsSync(buildIdPath)

const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

console.log(`🔧 Server mode: ${dev ? 'Development' : 'Production'}`)
console.log(`📁 Working directory: ${__dirname}`)

// Create Next.js app
const app = next({ dev, hostname, port, dir: __dirname })
const handle = app.getRequestHandler()

app.prepare().then(async () => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling request:', err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // Initialize Socket.IO server
  try {
    console.log('🔌 Initializing Socket.IO server...')
    
    // Try to load Socket.IO server module
    let socketModule
    if (dev) {
      // Development: import TypeScript files (requires tsx/ts-node)
      socketModule = await import('./lib/socket/server.ts')
    } else {
      // Production: import from lib folder (copied by Dockerfile)
      socketModule = await import('./lib/socket/server.js')
    }
    
    const { initSocketServer } = socketModule
    const socketServer = initSocketServer(httpServer)
    console.log('✅ Socket.IO server initialized')
    
    // Make socket server globally available
    global.socketServer = socketServer
  } catch (err) {
    console.error('❌ Failed to initialize Socket.IO server:', err.message)
    console.error('Stack:', err.stack)
  }

  // Initialize startup services (admin user, auto-end)
  try {
    console.log('🚀 Initializing startup services...')
    let startupModule
    if (dev) {
      startupModule = await import('./startup.ts')
    } else {
      // In production, startup.ts is copied to root
      startupModule = await import('./startup.js')
    }
    console.log('✅ Startup services initialized')
  } catch (err) {
    console.error('❌ Failed to initialize startup services:', err.message)
    console.error('Stack:', err.stack)
  }

  // Start listening
  httpServer.once('error', (err) => {
    console.error('❌ Server error:', err)
    process.exit(1)
  })

  httpServer.listen(port, hostname, () => {
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



