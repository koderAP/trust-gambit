'use client'

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  // Socket.io will be initialized when needed for real-time features
  // Currently disabled to prevent 404 errors in development
  return <>{children}</>
}
