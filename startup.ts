// This file runs on app startup to initialize critical system resources
import { initializeAdmin } from './lib/initAdmin'

// Auto-seed admin user
initializeAdmin().catch((error) => {
  console.error('Failed to initialize admin on startup:', error)
})
