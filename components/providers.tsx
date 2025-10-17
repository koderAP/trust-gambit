'use client'

import { SessionProvider } from 'next-auth/react'
import SocketProvider from './socket-provider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SocketProvider>
        {children}
      </SocketProvider>
    </SessionProvider>
  )
}
