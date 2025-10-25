'use client'

import { useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (socket && isConnected) {
      console.log('[Socket.IO] Provider initialized')
      
      // Global event listeners for debugging
      socket.onAny((event, ...args) => {
        console.log(`[Socket.IO] Event received: ${event}`, args)
      })
    }
  }, [socket, isConnected])

  return <>{children}</>
}
