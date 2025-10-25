'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Users, Clock, Play } from 'lucide-react'
import { useSocket, joinRoom } from '@/hooks/useSocket'

interface User {
  id: string
  name: string
  domain: string
  rating: number
}

interface Lobby {
  id: string
  name: string
  maxUsers: number
  currentUsers: number
  status: string
  users: User[]
  games: any[]
}

export default function LobbyPage() {
  const params = useParams()
  const router = useRouter()
  const lobbyId = params.id as string
  const { socket, isConnected } = useSocket()

  const [lobby, setLobby] = useState<Lobby | null>(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<string>('')

  // Fetch lobby data
  const fetchLobby = () => {
    fetch(`/api/lobby/${lobbyId}`)
      .then(res => res.json())
      .then(data => {
        setLobby(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching lobby:', err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchLobby()
    
    // Fallback polling (reduced frequency since Socket.IO provides real-time updates)
    const pollInterval = setInterval(fetchLobby, 30000) // 30 seconds instead of 5

    return () => {
      clearInterval(pollInterval)
    }
  }, [lobbyId])

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !isConnected) return

    console.log('[Lobby] Setting up Socket.IO listeners')

    // Join lobby room
    joinRoom('lobby', lobbyId)

    // Listen for lobby activation
    const handleLobbyActivated = (data: any) => {
      console.log('[Socket.IO] Lobby activated:', data)
      setNotification('🎮 Lobby activated! Game is ready to start.')
      fetchLobby() // Refresh lobby data
    }

    // Listen for lobby user joined
    const handleUserJoined = (data: any) => {
      console.log('[Socket.IO] User joined:', data)
      fetchLobby() // Refresh to show new user
    }

    // Listen for round start
    const handleRoundStarted = (data: any) => {
      console.log('[Socket.IO] Round started:', data)
      setNotification(`🚀 Round ${data.roundNumber} started! Question: ${data.question}`)
      // Could redirect to game page or show round interface
      setTimeout(() => {
        // Auto-redirect to game page if needed
        if (lobby?.games?.[0]?.id) {
          router.push(`/game/${lobby.games[0].id}`)
        }
      }, 2000)
    }

    // Listen for round end
    const handleRoundEnded = (data: any) => {
      console.log('[Socket.IO] Round ended:', data)
      if (data.autoEnded) {
        setNotification(`⏱️ Round ${data.roundNumber} ended (time expired)`)
      } else {
        setNotification(`✅ Round ${data.roundNumber} ended`)
      }
    }

    // Listen for game status changes
    const handleGameStatusChanged = (data: any) => {
      console.log('[Socket.IO] Game status changed:', data)
      fetchLobby() // Refresh lobby data
    }

    // Attach listeners
    socket.on('lobby:activated', handleLobbyActivated)
    socket.on('lobby:user_joined', handleUserJoined)
    socket.on('round:started', handleRoundStarted)
    socket.on('round:ended', handleRoundEnded)
    socket.on('game:status_changed', handleGameStatusChanged)

    // Cleanup
    return () => {
      socket.off('lobby:activated', handleLobbyActivated)
      socket.off('lobby:user_joined', handleUserJoined)
      socket.off('round:started', handleRoundStarted)
      socket.off('round:ended', handleRoundEnded)
      socket.off('game:status_changed', handleGameStatusChanged)
    }
  }, [socket, isConnected, lobbyId])

  // Auto-hide notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lobby...</p>
        </div>
      </div>
    )
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Lobby Not Found</CardTitle>
            <CardDescription>The lobby you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = (lobby.currentUsers / lobby.maxUsers) * 100
  const activeGame = lobby.games && lobby.games.length > 0 ? lobby.games[0] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        {/* Socket.IO Connection Status */}
        {isConnected && (
          <div className="mb-4 p-2 bg-green-100 border border-green-300 rounded text-green-800 text-sm text-center">
            🟢 Connected - Real-time updates enabled
          </div>
        )}
        
        {/* Notification Banner */}
        {notification && (
          <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded-lg text-blue-900 font-medium animate-pulse">
            {notification}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{lobby.name}</h1>
          <p className="text-gray-600">Waiting for players to join...</p>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Lobby Status</CardTitle>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                lobby.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
                lobby.status === 'FULL' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {lobby.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Players</span>
                  <span className="font-semibold">
                    {lobby.currentUsers} / {lobby.maxUsers}
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>

              {lobby.status === 'WAITING' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Clock className="h-4 w-4" />
                    <p className="text-sm">
                      Waiting for more players... Game will start once the admin begins or lobby is full.
                    </p>
                  </div>
                </div>
              )}

              {lobby.status === 'FULL' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <Play className="h-4 w-4" />
                    <p className="text-sm font-medium">
                      Lobby is full! Waiting for admin to start the game...
                    </p>
                  </div>
                </div>
              )}

              {activeGame && (
                <Button
                  className="w-full"
                  onClick={() => router.push(`/game/${activeGame.id}`)}
                >
                  Join Active Game
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Players List */}
        <Card>
          <CardHeader>
            <CardTitle>Players ({lobby.users.length})</CardTitle>
            <CardDescription>Experts from various domains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {lobby.users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(user.rating)].map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-yellow-400" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Game Rules Reminder */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Game Rules Reminder</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <p>• <strong>Multi-Stage Competition:</strong> Progress through multiple rounds across different stages</p>
            <p>• <strong>3 Actions:</strong> Solve (answer yourself), Delegate (trust another player), Pass (skip)</p>
            <p>• <strong>Beware Cycles:</strong> If delegation forms a loop, everyone in the cycle gets penalty points!</p>
            <p>• <strong>Build Trust:</strong> Successful delegations build trust and earn bonus points</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
