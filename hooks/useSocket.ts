'use client'

import { useState } from 'react'
import { Socket } from 'socket.io-client'

// Socket.io is disabled until we implement real-time features
// This prevents 404 errors in development

let socket: Socket | null = null

export const useSocket = () => {
  const [isConnected] = useState(false)

  // Socket initialization disabled
  // Will be implemented when needed for:
  // - Real-time game updates
  // - Lobby notifications
  // - Live round progression

  return { socket, isConnected }
}

export const getSocket = () => socket
