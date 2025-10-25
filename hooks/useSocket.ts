'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Initialize socket connection if not already created
    if (!socket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
      
      socket = io(socketUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socket.on('connect', () => {
        console.log('[Socket.IO] Connected:', socket?.id)
        setIsConnected(true)
      })

      socket.on('disconnect', () => {
        console.log('[Socket.IO] Disconnected')
        setIsConnected(false)
      })

      socket.on('connect_error', (error) => {
        console.warn('[Socket.IO] Connection error:', error.message)
        setIsConnected(false)
      })
    }

    return () => {
      // Don't disconnect on unmount to maintain persistent connection
      // socket?.disconnect()
    }
  }, [])

  return { socket, isConnected }
}

export const getSocket = () => socket

// Helper to emit events safely
export const emitSocketEvent = (event: string, data?: any) => {
  if (socket?.connected) {
    socket.emit(event, data)
    return true
  }
  console.warn('[Socket.IO] Not connected, cannot emit event:', event)
  return false
}

// Helper to join a room
export const joinRoom = (roomType: 'game' | 'lobby', roomId: string) => {
  if (socket?.connected) {
    socket.emit(`join:${roomType}`, roomId)
    console.log(`[Socket.IO] Joined ${roomType}:${roomId}`)
    return true
  }
  return false
}
