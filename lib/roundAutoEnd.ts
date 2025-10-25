/**
 * Round Auto-End Service
 * 
 * Periodically checks for expired rounds and automatically ends them.
 * Runs every 10 seconds to ensure rounds end promptly when their timer expires.
 */

import { prisma } from './prisma'
import { getSocketServer } from './socket/server'
import { calculateDelegationGraph } from './calculateDelegationGraph'

const CHECK_INTERVAL_MS = 10000 // Check every 10 seconds
let isRunning = false

/**
 * End a single expired round
 */
async function endExpiredRound(roundId: string, gameId: string, lobbyId: string | null, roundNumber: number) {
  try {
    console.log(`[Auto-End] Ending expired round: ${roundId}`)
    
    const endTime = new Date()
    
    // Update round status
    const round = await prisma.round.update({
      where: { id: roundId },
      data: {
        status: 'COMPLETED',
        endTime: endTime,
      },
    })
    
    console.log(`[Auto-End] ✅ Round ${roundId} ended successfully (Lobby: ${round.lobbyId})`)
    
    // Calculate delegation graph (this handles implicit PASS for non-submitters)
    try {
      console.log(`[Auto-End] Calculating delegation graph for round ${roundId}...`)
      await calculateDelegationGraph(roundId)
      console.log(`[Auto-End] ✅ Delegation graph calculated successfully`)
    } catch (graphError) {
      console.error(`[Auto-End] ❌ Failed to calculate delegation graph for round ${roundId}:`, graphError)
      // Don't throw - round is already ended, graph calculation failure shouldn't stop auto-end
    }
    
    // Broadcast via Socket.IO
    try {
      const socketServer = getSocketServer()
      socketServer.notifyRoundEnded(roundId, gameId, lobbyId, {
        roundNumber,
        endTime: endTime.toISOString(),
        reason: 'TIME_EXPIRED',
        autoEnded: true,
      })
      console.log(`[Auto-End] [Socket.IO] Broadcasted auto-end event for round ${roundId}`)
    } catch (socketError) {
      console.warn(`[Auto-End] Could not broadcast socket event:`, socketError)
    }
    
    return round
  } catch (error) {
    console.error(`[Auto-End] ❌ Failed to end round ${roundId}:`, error)
    throw error
  }
}

/**
 * Find and end all expired active rounds
 */
async function checkAndEndExpiredRounds() {
  try {
    const now = new Date()
    
    // Find all ACTIVE rounds
    const activeRounds = await prisma.round.findMany({
      where: {
        status: 'ACTIVE',
        startTime: { not: null },
      },
      select: {
        id: true,
        gameId: true,
        roundNumber: true,
        startTime: true,
        durationSeconds: true,
        lobbyId: true,
      },
    })
    
    if (activeRounds.length === 0) {
      return // No active rounds to check
    }
    
    // Check which rounds have expired
    const expiredRounds = activeRounds.filter(round => {
      if (!round.startTime) return false
      
      const expirationTime = new Date(round.startTime.getTime() + round.durationSeconds * 1000)
      return now >= expirationTime
    })
    
    if (expiredRounds.length > 0) {
      console.log(`[Auto-End] Found ${expiredRounds.length} expired round(s) at ${now.toISOString()}`)
      
      // End all expired rounds
      for (const round of expiredRounds) {
        const expirationTime = new Date(round.startTime!.getTime() + round.durationSeconds * 1000)
        const delaySeconds = Math.floor((now.getTime() - expirationTime.getTime()) / 1000)
        
        console.log(`[Auto-End] - Round ${round.roundNumber} (Lobby: ${round.lobbyId}) expired ${delaySeconds}s ago`)
        
        await endExpiredRound(round.id, round.gameId, round.lobbyId, round.roundNumber)
      }
    }
  } catch (error) {
    console.error('[Auto-End] Error checking expired rounds:', error)
  }
}

/**
 * Start the round auto-end service
 */
export function startRoundAutoEndService() {
  if (isRunning) {
    console.log('[Auto-End] Service already running')
    return
  }
  
  isRunning = true
  console.log(`[Auto-End] 🚀 Starting round auto-end service (checking every ${CHECK_INTERVAL_MS / 1000}s)`)
  
  // Run immediately
  checkAndEndExpiredRounds()
  
  // Then run periodically
  const intervalId = setInterval(() => {
    checkAndEndExpiredRounds()
  }, CHECK_INTERVAL_MS)
  
  // Cleanup on process exit
  process.on('SIGINT', () => {
    console.log('[Auto-End] Stopping service...')
    clearInterval(intervalId)
    isRunning = false
    process.exit(0)
  })
  
  process.on('SIGTERM', () => {
    console.log('[Auto-End] Stopping service...')
    clearInterval(intervalId)
    isRunning = false
    process.exit(0)
  })
  
  return intervalId
}

/**
 * Manually check for expired rounds (useful for testing or one-off checks)
 */
export async function checkExpiredRoundsNow() {
  console.log('[Auto-End] Manual check triggered')
  await checkAndEndExpiredRounds()
}
