// This file runs on app startup to initialize critical system resources
import { initializeAdmin } from './lib/initAdmin'
import { startRoundAutoEndService } from './lib/roundAutoEnd'

// Auto-seed admin user
initializeAdmin().catch((error) => {
  console.error('Failed to initialize admin on startup:', error)
})

// Start round auto-end service
startRoundAutoEndService()
