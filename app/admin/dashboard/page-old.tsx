'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Users, Play, LogOut, CheckCircle2, Clock, Activity, Layers, Target, Info, TrendingUp, AlertCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type User = {
  id: string
  name: string
  email: string
  profileComplete: boolean
  lobbyRequested: boolean
  createdAt: string
  lobbyId?: string
  lobby?: {
    id: string
    name: string
    poolNumber: number
    stage: number
    status: string
  }
  domainRatings?: Array<{
    domain: string
    rating: number
    reason: string | null
  }>
}

type GameState = {
  stats: {
    totalUsers: number
    profileCompleteUsers: number
    profileIncompleteUsers: number
    usersInLobbies: number
    usersWaitingForLobby: number
  }
  activeGame: {
    id: string
    status: string
    currentStage: number
    currentRound: number
    startedAt: string | null
    lambda: number
    beta: number
    gamma: number
    totalLobbies: number
    totalRounds: number
    rounds: Array<{
      id: string
      roundNumber: number
      stage: number
      domain: string
      question: string
      status: string
      lobbyId: string | null
      startTime: string | null
      endTime: string | null
      submissionsCount: number
      scoresCalculated: boolean
    }>
    lobbies: Array<{
      id: string
      name: string
      poolNumber: number
      stage: number
      status: string
      maxUsers: number
      currentPlayerCount: number
      totalRounds: number
      currentRound: any
      players: Array<{
        id: string
        name: string
        email: string
        profileComplete: boolean
        domainRatings: Array<{
          domain: string
          rating: number
          reason: string | null
        }>
      }>
    }>
  } | null
  allUsers: User[]
}

export default function AdminDashboard() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingGame, setStartingGame] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'lobbies' | 'rounds'>('overview')

  useEffect(() => {
    // Check if user is authenticated as admin
    if (status === 'unauthenticated') {
      router.push('/admin/login')
      return
    }

    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchUsers()
      fetchGameState()
      
      // Refresh game state every 5 seconds
      const interval = setInterval(fetchGameState, 5000)
      return () => clearInterval(interval)
    }
  }, [status, session, router])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchGameState = async () => {
    try {
      const res = await fetch('/api/admin/game-state')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch game state')
      }

      setGameState(data)
      setUsers(data.allUsers)
    } catch (err: any) {
      console.error('Error fetching game state:', err)
      setError(err.message)
    }
  }

  const handleStartGame = async () => {
    setStartingGame(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/start-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start game')
      }

      setSuccess(`Game started! Created ${data.lobbiesCreated} lobbies with ${data.playersAssigned} players.`)
      
      // Refresh user list and game state
      await fetchUsers()
      await fetchGameState()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setStartingGame(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' })
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  const profileCompleteUsers = users.filter(u => u.profileComplete)
  const profileIncompleteUsers = users.filter(u => !u.profileComplete)
  
  const stats = gameState?.stats || {
    totalUsers: users.length,
    profileCompleteUsers: profileCompleteUsers.length,
    profileIncompleteUsers: profileIncompleteUsers.length,
    usersInLobbies: users.filter(u => u.lobbyId).length,
    usersWaitingForLobby: users.filter(u => u.profileComplete && !u.lobbyId).length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-300 text-sm">Trust Gambit Game Control</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="text-white border-white hover:bg-white/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/20 border border-green-500 text-green-200 rounded-lg">
            {success}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Total Registered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{users.length}</div>
              <p className="text-xs text-gray-400 mt-1">Total participants</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Profile Complete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{profileCompleteUsers.length}</div>
              <p className="text-xs text-gray-400 mt-1">Ready to play</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Profile Incomplete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{profileIncompleteUsers.length}</div>
              <p className="text-xs text-gray-400 mt-1">Pending completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Game Controls */}
        <Card className="bg-white/10 border-yellow-500/50 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-yellow-500" />
              Game Controls
            </CardTitle>
            <CardDescription className="text-gray-300">
              Start the game and assign players to lobbies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <p className="text-sm text-blue-200">
                <strong>Game Setup:</strong> Players will be assigned to lobbies of up to 15 users each.
                Currently have: <strong>{profileCompleteUsers.length}</strong> ready players.
              </p>
              {profileCompleteUsers.length > 0 && (
                <p className="text-xs text-blue-300 mt-2">
                  Will create {Math.ceil(profileCompleteUsers.length / 15)} lobby/lobbies with {profileCompleteUsers.length} players.
                </p>
              )}
            </div>
            {profileCompleteUsers.length === 0 ? (
              <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                <p className="text-sm text-yellow-200">
                  <strong>⚠️ Warning:</strong> No users have completed their profiles yet. 
                  At least one user must complete their profile before starting the game.
                </p>
              </div>
            ) : null}
            <Button
              onClick={handleStartGame}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
              disabled={profileCompleteUsers.length === 0 || startingGame}
            >
              <Play className="mr-2 h-4 w-4" />
              {startingGame ? 'Starting Game...' : `Start Game & Assign Lobbies (${profileCompleteUsers.length} players)`}
            </Button>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-white/10 border-white/20 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered Users
            </CardTitle>
            <CardDescription className="text-gray-300">
              All participants registered for Trust Gambit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No users registered yet</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Registered: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.profileComplete ? (
                        <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full">
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                          <span className="text-xs text-green-400">Complete</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full">
                          <Clock className="h-4 w-4 text-yellow-400" />
                          <span className="text-xs text-yellow-400">Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
