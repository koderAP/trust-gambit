'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Users, Play, LogOut, CheckCircle2, Clock, Activity, Layers, Target, Info, TrendingUp, AlertCircle, Eye, ChevronDown, ChevronUp } from 'lucide-react'

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
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [startingGame, setStartingGame] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Game parameters state
  const [lambda, setLambda] = useState<number>(0.5)
  const [beta, setBeta] = useState<number>(0.1)
  const [gamma, setGamma] = useState<number>(0.2)
  const [defaultDuration, setDefaultDuration] = useState<number>(60)
  const [roundDurationOverride, setRoundDurationOverride] = useState<number | null>(null)
  const [updatingParams, setUpdatingParams] = useState(false)

  // Questions state
  const [questions, setQuestions] = useState<any[]>([])
  const [newQuestion, setNewQuestion] = useState({
    stage: 1,
    domain: 'Algorithms',
    question: '',
    correctAnswer: '',
    imageUrl: '',
  })
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [showDangerZone, setShowDangerZone] = useState(false) // For collapsible danger zone

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/admin/login')
      return
    }

    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.push('/login')
      return
    }

    if (status === 'authenticated') {
      fetchGameState()
      
      // Refresh game state every 5 seconds
      const interval = setInterval(fetchGameState, 5000)
      return () => clearInterval(interval)
    }
  }, [status, session, router])

  // Fetch questions when active game changes
  useEffect(() => {
    const activeGame = gameState?.activeGame
    if (activeGame?.id) {
      fetchQuestions()
    }
  }, [gameState?.activeGame?.id])

  const fetchGameState = async () => {
    try {
      const res = await fetch('/api/admin/game-state')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch game state')
      }

      setGameState(data)
    } catch (err: any) {
      console.error('Error fetching game state:', err)
      setError(err.message)
    } finally {
      setLoading(false)
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
        body: JSON.stringify({
          lambda,
          beta,
          gamma,
          defaultDuration,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start game')
      }

      setSuccess(`Game started! Created ${data.lobbiesCreated} lobbies with ${data.playersAssigned} players.`)
      
      // Refresh game state
      await fetchGameState()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setStartingGame(false)
    }
  }

  const handleFinishStage1 = async () => {
    if (!activeGame) return
    
    if (!confirm('Are you sure you want to finish Stage 1? This will promote the top 2 players from each lobby to Stage 2.')) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/finish-stage-1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to finish Stage 1')
      }

      setSuccess(`Stage 1 completed! ${data.qualifiedPlayers} players promoted to ${data.stage2Lobbies} Stage 2 lobbies.`)
      
      // Refresh game state
      await fetchGameState()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleFinishStage2 = async () => {
    if (!activeGame) return
    
    if (!confirm('Are you sure you want to finish Stage 2 and end the game?')) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/finish-stage-2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: activeGame.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to finish Stage 2')
      }

      setSuccess(`Stage 2 completed! Game ended. Winner: ${data.winner?.name || 'TBD'}`)
      
      // Refresh game state
      await fetchGameState()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' })
  }

  const fetchQuestions = async () => {
    console.log('Fetching all global questions')
    try {
      const res = await fetch(`/api/admin/questions`)
      const data = await res.json()
      console.log('Questions fetched:', data)
      if (res.ok) {
        setQuestions(data.questions || [])
      } else {
        console.error('Failed to fetch questions:', data)
      }
    } catch (err) {
      console.error('Error fetching questions:', err)
    }
  }

  const handleSaveQuestion = async () => {
    if (!newQuestion.question || !newQuestion.correctAnswer) {
      setError('Please fill in all fields')
      return
    }

    setSavingQuestion(true)
    setError('')
    setSuccess('')

    try {
      const payload = editingQuestionId 
        ? { id: editingQuestionId, ...newQuestion }
        : newQuestion
      console.log('Saving question with payload:', payload)

      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log('Save response:', res.status, data)

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save question')
      }

      setSuccess(data.message || 'Question saved successfully!')
      setNewQuestion({
        stage: 1,
        domain: 'Algorithms',
        question: '',
        correctAnswer: '',
        imageUrl: '',
      })
      setEditingQuestionId(null)
      await fetchQuestions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return

    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/admin/questions?questionId=${questionId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete question')
      }

      setSuccess('Question deleted successfully')
      await fetchQuestions()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleKickPlayer = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to kick ${userName} from their lobby?`)) return

    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/kick-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to kick player')
      }

      setSuccess(`${data.userName} has been removed from ${data.lobbyName}`)
      await fetchGameState() // Refresh to show updated lobby status
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
        <p className="text-white">Loading...</p>
      </div>
    )
  }

  const stats = gameState?.stats || {
    totalUsers: 0,
    profileCompleteUsers: 0,
    profileIncompleteUsers: 0,
    usersInLobbies: 0,
    usersWaitingForLobby: 0
  }

  const users = gameState?.allUsers || []
  const activeGame = gameState?.activeGame

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-yellow-500" />
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-300 text-sm">Trust Gambit Game Control - Auto-refresh every 5s</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* End Game Button - Show if game is active */}
            {activeGame && (activeGame.status === 'STAGE_1_ACTIVE' || activeGame.status === 'STAGE_2_ACTIVE' || activeGame.status === 'LOBBIES_FORMING') && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (confirm('End the current game? This will mark the game as ended and set all players to waiting for lobby. No new game will be created.')) {
                    setError('');
                    setSuccess('');
                    try {
                      const res = await fetch('/api/admin/end-game', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to end game');
                      setSuccess(`Game ended! ${data.usersReset} players are now waiting for lobby assignment. ${data.questionsReset} questions reset to unused.`);
                      await fetchGameState();
                      await fetchQuestions(); // Refresh questions to show all as unused
                    } catch (err: any) {
                      setError(err.message);
                    }
                  }
                }}
                className="text-red-400 border-red-400 hover:bg-red-500/10"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                End Game
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="text-white border-white hover:bg-white/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500 text-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/20 border border-green-500 text-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-gray-400 mt-1">Registered</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Ready to Play</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{stats.profileCompleteUsers}</div>
              <p className="text-xs text-gray-400 mt-1">Profile complete</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">In Lobbies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">{stats.usersInLobbies}</div>
              <p className="text-xs text-gray-400 mt-1">Assigned players</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Waiting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{stats.usersWaitingForLobby}</div>
              <p className="text-xs text-gray-400 mt-1">For lobby assignment</p>
            </CardContent>
          </Card>

          <Card className="bg-white/10 border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Incomplete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-400">{stats.profileIncompleteUsers}</div>
              <p className="text-xs text-gray-400 mt-1">Pending profiles</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
              <Activity className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white" disabled={!activeGame}>
              <Info className="mr-2 h-4 w-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="game" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white" disabled={!activeGame}>
              <Target className="mr-2 h-4 w-4" />
              Active Game
            </TabsTrigger>
            <TabsTrigger value="lobbies" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white" disabled={!activeGame}>
              <Layers className="mr-2 h-4 w-4" />
              Lobbies
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
              <Users className="mr-2 h-4 w-4" />
              All Users
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
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
                {/* Game Parameters Configuration */}
                {!activeGame && (
                  <div className="p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-5 w-5 text-purple-400" />
                      <h3 className="font-semibold text-purple-200">Game Parameters</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Lambda Parameter */}
                      <div className="space-y-2">
                        <label className="text-sm text-purple-200 flex items-center justify-between">
                          <span>λ (Lambda) - Chain Propagation</span>
                          <span className="text-purple-300 font-mono">{lambda}</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={lambda}
                          onChange={(e) => setLambda(parseFloat(e.target.value))}
                          className="w-full h-2 bg-purple-700/30 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <p className="text-xs text-purple-300/70">Score decay along delegation chains</p>
                      </div>

                      {/* Beta Parameter */}
                      <div className="space-y-2">
                        <label className="text-sm text-purple-200 flex items-center justify-between">
                          <span>β (Beta) - Trust Bonus</span>
                          <span className="text-purple-300 font-mono">{beta}</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="0.5"
                          step="0.05"
                          value={beta}
                          onChange={(e) => setBeta(parseFloat(e.target.value))}
                          className="w-full h-2 bg-purple-700/30 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <p className="text-xs text-purple-300/70">Bonus per delegator to correct solver</p>
                      </div>

                      {/* Gamma Parameter */}
                      <div className="space-y-2">
                        <label className="text-sm text-purple-200 flex items-center justify-between">
                          <span>γ (Gamma) - Cycle Penalty</span>
                          <span className="text-purple-300 font-mono">{gamma}</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="0.5"
                          step="0.05"
                          value={gamma}
                          onChange={(e) => setGamma(parseFloat(e.target.value))}
                          className="w-full h-2 bg-purple-700/30 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <p className="text-xs text-purple-300/70">Penalty for delegation cycles</p>
                      </div>

                      {/* Default Duration */}
                      <div className="space-y-2">
                        <label className="text-sm text-purple-200 flex items-center justify-between">
                          <span>⏱️ Default Round Duration</span>
                          <span className="text-purple-300 font-mono">{defaultDuration}s</span>
                        </label>
                        <input
                          type="range"
                          min="30"
                          max="600"
                          step="30"
                          value={defaultDuration}
                          onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
                          className="w-full h-2 bg-purple-700/30 rounded-lg appearance-none cursor-pointer slider"
                        />
                        <p className="text-xs text-purple-300/70">Time limit per round (seconds)</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                  <p className="text-sm text-blue-200">
                    <strong>Game Setup:</strong> Players will be assigned to lobbies of up to 15 users each.
                    Currently have: <strong>{stats.usersWaitingForLobby}</strong> ready players waiting.
                  </p>
                  {stats.usersWaitingForLobby > 0 && (
                    <p className="text-xs text-blue-300 mt-2">
                      Will create {Math.ceil(stats.usersWaitingForLobby / 15)} lobby/lobbies with {stats.usersWaitingForLobby} players.
                    </p>
                  )}
                </div>
                {stats.usersWaitingForLobby === 0 && !activeGame ? (
                  <div className="p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                    <p className="text-sm text-yellow-200">
                      <strong>⚠️ Warning:</strong> No users are waiting for lobby assignment. 
                      At least one user must complete their profile before starting the game.
                    </p>
                  </div>
                ) : null}

                {/* Assign Lobbies Button - Only show if game exists and is NOT_STARTED or REGISTRATION_OPEN */}
                {activeGame && activeGame.status !== 'ENDED' && (
                  <Button
                    onClick={handleStartGame}
                    className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold"
                    disabled={stats.usersWaitingForLobby === 0 || startingGame}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {startingGame ? 'Assigning Lobbies...' : `Assign Lobbies (${stats.usersWaitingForLobby} players)`}
                  </Button>
                )}

                {/* Simple Activate Lobbies Button: Changes lobby status from WAITING to ACTIVE */}
                {activeGame && activeGame.lobbies && activeGame.lobbies.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-400 mb-1">
                      Game Status: {activeGame.status} | Lobbies: {activeGame.lobbies.length} | 
                      WAITING: {activeGame.lobbies.filter((l: any) => l.status === 'WAITING').length} | 
                      ACTIVE: {activeGame.lobbies.filter((l: any) => l.status === 'ACTIVE').length}
                    </div>
                    {activeGame.lobbies.some((lobby: any) => lobby.status === 'WAITING') && (
                      <Button
                        onClick={async () => {
                          setError('');
                          setSuccess('');
                          try {
                            const res = await fetch('/api/admin/activate-lobbies-simple', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ gameId: activeGame.id }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Failed to activate lobbies');
                            setSuccess(`${data.lobbiesActivated} lobbies activated!`);
                            await fetchGameState();
                          } catch (err: any) {
                            setError(err.message);
                          }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                      >
                        <Activity className="mr-2 h-4 w-4" />
                        Activate Lobbies (WAITING → ACTIVE)
                      </Button>
                    )}
                  </div>
                )}

                {/* Activate Lobbies Button: Only show if game is LOBBIES_FORMING and all lobbies are WAITING */}
                {activeGame &&
                  activeGame.status === 'LOBBIES_FORMING' &&
                  activeGame.lobbies.length > 0 &&
                  activeGame.lobbies.every(lobby => lobby.status === 'WAITING') && (
                    <Button
                      onClick={async () => {
                        setError('');
                        setSuccess('');
                        try {
                          const res = await fetch('/api/admin/activate-lobbies', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Failed to activate lobbies');
                          setSuccess('Lobbies activated and Stage 1 ready!');
                          await fetchGameState();
                        } catch (err: any) {
                          setError(err.message);
                        }
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold mt-2"
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      Activate Lobbies & Prepare Stage 1
                    </Button>
                  )}

                {/* Finish Stage 1 Button: Only show if game is STAGE_1_ACTIVE and no active rounds */}
                {activeGame &&
                  activeGame.status === 'STAGE_1_ACTIVE' &&
                  activeGame.currentStage === 1 &&
                  !activeGame.rounds.some(r => r.status === 'ACTIVE') && (
                    <Button
                      onClick={handleFinishStage1}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold mt-2"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Finish Stage 1 & Promote Top 2 to Stage 2
                    </Button>
                  )}

                {/* Activate Stage 2 Lobbies Button: Show if game is STAGE_2_ACTIVE and stage 2 lobbies are WAITING */}
                {activeGame &&
                  activeGame.status === 'STAGE_2_ACTIVE' &&
                  activeGame.currentStage === 2 &&
                  activeGame.lobbies.some(l => l.stage === 2 && l.status === 'WAITING') && (
                    <Button
                      onClick={async () => {
                        setError('');
                        setSuccess('');
                        try {
                          const res = await fetch('/api/admin/activate-lobbies-simple', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ gameId: activeGame.id }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Failed to activate lobbies');
                          setSuccess('Stage 2 lobbies activated! Ready to start rounds.');
                          await fetchGameState();
                        } catch (err: any) {
                          setError(err.message);
                        }
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold mt-2"
                    >
                      <Activity className="mr-2 h-4 w-4" />
                      Activate Stage 2 Lobbies
                    </Button>
                  )}

                {/* Finish Stage 2 Button: Show if game is STAGE_2_ACTIVE (with or without active rounds) */}
                {activeGame &&
                  (activeGame.status === 'STAGE_2_ACTIVE' || activeGame.status === 'STAGE_2_COMPLETE') &&
                  activeGame.currentStage === 2 && (
                    <Button
                      onClick={handleFinishStage2}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold mt-2"
                      disabled={activeGame.rounds.some(r => r.status === 'ACTIVE')}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      {activeGame.rounds.some(r => r.status === 'ACTIVE') 
                        ? 'End Current Round First' 
                        : 'Finish Stage 2 & End Game'}
                    </Button>
                  )}
                
                {/* Global Round Controls - Show if game is active */}
                {activeGame && (activeGame.status === 'STAGE_1_ACTIVE' || activeGame.status === 'STAGE_2_ACTIVE' || activeGame.status === 'IN_PROGRESS') && (
                  <div className="mt-4 space-y-3">
                    {/* End Current Round Button - Show if there are active rounds */}
                    {activeGame.rounds.some(r => r.status === 'ACTIVE') && (
                      <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                        <p className="text-sm mb-3 text-red-200">
                          <strong>Active Round {activeGame.currentRound}</strong> is running across {activeGame.rounds.filter(r => r.status === 'ACTIVE').length} lobbies
                        </p>
                        <Button
                          onClick={async () => {
                            setError('');
                            setSuccess('');
                            try {
                              const res = await fetch('/api/admin/end-current-round', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ gameId: activeGame.id }),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Failed to end round');
                              setSuccess(`Round ${activeGame.currentRound} ended! ${data.roundsEnded} rounds closed, ${data.submissions.total} submissions received, scoring calculated.`);
                              await fetchGameState();
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }}
                          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          End Current Round (All Lobbies)
                        </Button>
                      </div>
                    )}

                    {/* Start Next Round Button - Show if no active rounds */}
                    {!activeGame.rounds.some(r => r.status === 'ACTIVE') && (
                      <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg space-y-3">
                        <p className="text-sm mb-3">
                          Ready to start <strong>Round {activeGame.currentRound + 1}</strong> across all {activeGame.lobbies.filter(l => l.status === 'ACTIVE').length} active lobbies
                        </p>
                        
                        {/* Round Duration Override */}
                        <div className="space-y-2">
                          <label className="text-sm text-blue-200 flex items-center justify-between">
                            <span>⏱️ Round Duration (optional override)</span>
                            <span className="text-blue-300 font-mono">{roundDurationOverride || 'default'}s</span>
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="600"
                            step="10"
                            placeholder="Leave empty for default"
                            value={roundDurationOverride || ''}
                            onChange={(e) => setRoundDurationOverride(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full px-3 py-2 bg-white/10 border border-blue-400/50 rounded text-white placeholder-gray-400"
                          />
                          <p className="text-xs text-blue-300/70">Override duration for this round only (10-600 seconds)</p>
                        </div>
                        
                        <Button
                          onClick={async () => {
                            setError('');
                            setSuccess('');
                            try {
                              const nextRoundNumber = activeGame.currentRound + 1;
                              const payload: any = {
                                gameId: activeGame.id,
                                roundNumber: nextRoundNumber,
                                stage: activeGame.currentStage,
                              };
                              if (roundDurationOverride) {
                                payload.durationSeconds = roundDurationOverride;
                              }
                              const res = await fetch('/api/admin/start-round', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Failed to start round');
                              setSuccess(`Round ${nextRoundNumber} started! ${data.lobbiesAffected} lobbies active, ${data.durationSeconds}s timer, domain: ${data.domain}`);
                              setRoundDurationOverride(null); // Reset override
                              await fetchGameState();
                            } catch (err: any) {
                              setError(err.message);
                            }
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Start Round {activeGame.currentRound + 1} (All Lobbies)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Game Summary */}
            {activeGame && (
              <Card className="bg-white/10 border-green-500/50 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    Active Game Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-400">Status</p>
                      <p className="text-lg font-semibold">{activeGame.status.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Current Stage</p>
                      <p className="text-lg font-semibold">Stage {activeGame.currentStage}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Current Round</p>
                      <p className="text-lg font-semibold">Round {activeGame.currentRound}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Total Lobbies</p>
                      <p className="text-lg font-semibold">{activeGame.totalLobbies} Pools</p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded">
                    <p className="text-xs text-gray-300 mb-2">Scoring Parameters:</p>
                    <div className="flex gap-4 text-sm">
                      <span>λ (Chain): {activeGame.lambda}</span>
                      <span>β (Trust): {activeGame.beta}</span>
                      <span>γ (Cycle): {activeGame.gamma}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Post-Game Cleanup - Show when game is ENDED or when no active game exists */}
            {(!activeGame || activeGame.status === 'ENDED') && (
              <Card className="bg-white/10 border-green-500/50 text-white">
                <CardHeader>
                  <CardTitle className="text-green-400">
                    {!activeGame ? 'Start New Game' : 'Post-Game Cleanup'}
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    {!activeGame 
                      ? 'No active game found. Create a new game to start the competition.'
                      : 'Start a fresh new game. This will archive the current game and prepare for the next competition.'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={async () => {
                      if (confirm('Create New Game? This will:\n\n• Mark all previous games as COMPLETED\n• Remove all users from lobbies\n• Delete all old game data\n• Create a fresh game ready for lobby assignment\n\nContinue?')) {
                        setError('');
                        setSuccess('');
                        try {
                          const res = await fetch('/api/admin/create-new-game', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Failed to create new game');
                          setSuccess('New game created successfully! All old games archived. Ready to assign lobbies.');
                          await fetchGameState();
                          await fetchQuestions(); // Refresh questions to show all as unused
                        } catch (err: any) {
                          setError(err.message);
                        }
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Create New Game
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Spacer */}
            <div className="h-8"></div>

            {/* Danger Zone - Wipe Database (Collapsible) */}
            <Card className="bg-red-950/50 border-red-500/50 text-white">
              <CardHeader 
                className="cursor-pointer hover:bg-red-900/20 transition-colors"
                onClick={() => setShowDangerZone(!showDangerZone)}
              >
                <CardTitle className="text-red-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    ⚠️ DANGER ZONE - Database Wipe
                  </div>
                  {showDangerZone ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </CardTitle>
                <CardDescription className="text-gray-300">
                  {showDangerZone ? 'Click to hide' : 'Click to reveal dangerous operations'}
                </CardDescription>
              </CardHeader>
              
              {showDangerZone && (
                <CardContent className="space-y-4 pt-2">
                  <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
                    <p className="text-sm text-red-200 font-semibold mb-2">⚠️ This action will delete:</p>
                    <ul className="text-xs text-red-300 space-y-1 ml-4 list-disc">
                      <li>All registered users</li>
                      <li>All games, lobbies, and rounds</li>
                      <li>All submissions and scores</li>
                      <li>All game data (Admin user is preserved)</li>
                      <li>Questions will be reset to unused</li>
                    </ul>
                    <p className="text-xs text-red-200 font-bold mt-3">
                      ⛔ This action is IRREVERSIBLE!
                    </p>
                  </div>
                  <Button
                    onClick={async () => {
                      const confirmation = prompt(
                        '⚠️ DANGER: Complete Database Wipe\n\n' +
                        'This will permanently delete:\n' +
                        '• All users (except admin)\n' +
                        '• All games and game data\n' +
                        '• All lobbies, rounds, submissions, scores\n\n' +
                        'This action is IRREVERSIBLE!\n\n' +
                        'Type "WIPE ALL DATA" (without quotes) to confirm:'
                      );

                      if (confirmation === 'WIPE ALL DATA') {
                        setError('');
                        setSuccess('');
                        try {
                          const res = await fetch('/api/admin/wipe-database', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ confirmation: 'WIPE_ALL_DATA' }),
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Failed to wipe database');
                          setSuccess(
                            `Database wiped successfully! ` +
                            `Deleted: ${data.deleted.users} users, ${data.deleted.games} games, ` +
                            `${data.deleted.lobbies} lobbies, ${data.deleted.rounds} rounds, ` +
                            `${data.deleted.submissions} submissions, ${data.deleted.roundScores} scores. ` +
                            `Reset ${data.reset.questions} questions to unused.`
                          );
                          await fetchGameState();
                          await fetchQuestions();
                        } catch (err: any) {
                          setError(err.message);
                        }
                      } else if (confirmation !== null) {
                        alert('Wipe cancelled. Confirmation text did not match.');
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg border-2 border-red-400"
                  >
                    <AlertCircle className="mr-2 h-5 w-5" />
                    🗑️ WIPE DATABASE
                  </Button>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Active Game Tab */}
          <TabsContent value="game" className="space-y-4">
            {activeGame ? (
              <>
                <Card className="bg-white/10 border-white/20 text-white">
                  <CardHeader>
                    <CardTitle>Game Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Game ID</p>
                        <p className="text-sm font-mono">{activeGame.id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="text-sm font-semibold">{activeGame.status}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Started At</p>
                        <p className="text-sm">{activeGame.startedAt ? new Date(activeGame.startedAt).toLocaleString() : 'Not started'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Current Stage</p>
                        <p className="text-sm">{activeGame.currentStage}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Current Round</p>
                        <p className="text-sm">{activeGame.currentRound}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Total Rounds</p>
                        <p className="text-sm">{activeGame.totalRounds}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Game Parameters Card */}
                <Card className="bg-white/10 border-purple-500/50 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-400" />
                      Scoring Parameters
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Adjust lambda, beta, and gamma values for this game
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      {/* Lambda Parameter */}
                      <div className="space-y-2">
                        <label className="text-sm text-purple-200 flex items-center justify-between">
                          <span>λ (Lambda)</span>
                          <span className="text-purple-300 font-mono">{activeGame.lambda}</span>
                        </label>
                        <p className="text-xs text-purple-300/70">Current: {activeGame.lambda}</p>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          defaultValue={activeGame.lambda}
                          onChange={(e) => setLambda(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-white/10 border border-purple-400/50 rounded text-white text-sm"
                        />
                        <p className="text-xs text-purple-300/70">Chain propagation</p>
                      </div>

                      {/* Beta Parameter */}
                      <div className="space-y-2">
                        <label className="text-sm text-purple-200 flex items-center justify-between">
                          <span>β (Beta)</span>
                          <span className="text-purple-300 font-mono">{activeGame.beta}</span>
                        </label>
                        <p className="text-xs text-purple-300/70">Current: {activeGame.beta}</p>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          defaultValue={activeGame.beta}
                          onChange={(e) => setBeta(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-white/10 border border-purple-400/50 rounded text-white text-sm"
                        />
                        <p className="text-xs text-purple-300/70">Trust bonus</p>
                      </div>

                      {/* Gamma Parameter */}
                      <div className="space-y-2">
                        <label className="text-sm text-purple-200 flex items-center justify-between">
                          <span>γ (Gamma)</span>
                          <span className="text-purple-300 font-mono">{activeGame.gamma}</span>
                        </label>
                        <p className="text-xs text-purple-300/70">Current: {activeGame.gamma}</p>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.05"
                          defaultValue={activeGame.gamma}
                          onChange={(e) => setGamma(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-white/10 border border-purple-400/50 rounded text-white text-sm"
                        />
                        <p className="text-xs text-purple-300/70">Cycle penalty</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        onClick={async () => {
                          setUpdatingParams(true);
                          setError('');
                          setSuccess('');
                          try {
                            const res = await fetch('/api/admin/update-game-params', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                gameId: activeGame.id,
                                lambda,
                                beta,
                                gamma,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Failed to update parameters');
                            setSuccess(`Game parameters updated! λ=${data.lambda}, β=${data.beta}, γ=${data.gamma}`);
                            await fetchGameState();
                          } catch (err: any) {
                            setError(err.message);
                          } finally {
                            setUpdatingParams(false);
                          }
                        }}
                        disabled={updatingParams}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        {updatingParams ? 'Updating...' : 'Update Game Parameters'}
                      </Button>
                      <p className="text-xs text-purple-300/70 mt-2 text-center">
                        Note: Changes will affect future round scoring calculations
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Rounds List */}
                {activeGame.rounds.length > 0 && (
                  <Card className="bg-white/10 border-white/20 text-white">
                    <CardHeader>
                      <CardTitle>Rounds ({activeGame.rounds.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {activeGame.rounds.map((round) => (
                          <div key={round.id} className="p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <p className="font-medium">Round {round.roundNumber} - {round.domain}</p>
                                <p className="text-xs text-gray-400 mt-1">{round.question}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Lobby: {round.lobbyId || 'All'} | Submissions: {round.submissionsCount}
                                  {round.startTime && (
                                    <span className="ml-2">
                                      Started: {new Date(round.startTime).toLocaleTimeString()}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                                  round.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                                  round.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {round.status}
                                </div>
                                {round.scoresCalculated && (
                                  <div className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                                    ✓ Scored
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400">No active game. Start a game to see details here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Lobbies Tab */}
          <TabsContent value="lobbies" className="space-y-4">
            {activeGame && activeGame.lobbies.length > 0 ? (
              activeGame.lobbies.map((lobby) => (
                <Card key={lobby.id} className="bg-white/10 border-white/20 text-white">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{lobby.name} (Pool {lobby.poolNumber})</span>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        lobby.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                        lobby.status === 'WAITING' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {lobby.status}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      Stage {lobby.stage} | {lobby.currentPlayerCount}/{lobby.maxUsers} players | {lobby.totalRounds} rounds
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold mb-2">Players:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {lobby.players.map((player) => (
                          <div key={player.id} className="p-2 bg-white/5 rounded flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{player.name}</p>
                              <p className="text-xs text-gray-400">{player.email}</p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedUser({ ...player, createdAt: '', lobbyRequested: false, lobbyId: lobby.id, lobby: { id: lobby.id, name: lobby.name, poolNumber: lobby.poolNumber, stage: lobby.stage, status: lobby.status } })}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleKickPlayer(player.id, player.name)}
                                className="text-red-400 hover:text-red-300"
                                title="Kick player from lobby"
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-white/10 border-white/20 text-white">
                <CardContent className="py-12 text-center">
                  <p className="text-gray-400">No lobbies created yet. Start a game to create lobbies.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <Card className="bg-white/10 border-white/20 text-white">
              <CardHeader>
                <CardTitle>Manage Questions</CardTitle>
                <CardDescription className="text-gray-300">
                  Add questions for each round. Questions cannot be edited once the round has started.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add/Edit Question Form */}
                <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg space-y-4">
                  <h3 className="font-semibold text-lg">
                    {editingQuestionId ? 'Edit Question' : 'Add New Question'}
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Stage</label>
                    <select
                      value={newQuestion.stage}
                      onChange={(e) => setNewQuestion({ ...newQuestion, stage: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white"
                    >
                      <option value="1" className="bg-gray-800">Stage 1 (20 rounds)</option>
                      <option value="2" className="bg-gray-800">Stage 2 (8 rounds)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Domain</label>
                    <select
                      value={newQuestion.domain}
                      onChange={(e) => setNewQuestion({ ...newQuestion, domain: e.target.value })}
                      className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white"
                    >
                      <option value="Algorithms" className="bg-gray-800">Algorithms</option>
                      <option value="Finance" className="bg-gray-800">Finance</option>
                      <option value="Economics" className="bg-gray-800">Economics</option>
                      <option value="Statistics" className="bg-gray-800">Statistics</option>
                      <option value="Probability" className="bg-gray-800">Probability</option>
                      <option value="Machine Learning" className="bg-gray-800">Machine Learning</option>
                      <option value="Crypto" className="bg-gray-800">Crypto</option>
                      <option value="Biology" className="bg-gray-800">Biology</option>
                      <option value="Indian History" className="bg-gray-800">Indian History</option>
                      <option value="Game Theory" className="bg-gray-800">Game Theory</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Question</label>
                    <textarea
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                      placeholder="Enter the question..."
                      rows={3}
                      className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Correct Answer</label>
                    <input
                      type="text"
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: e.target.value })}
                      placeholder="Enter the correct answer..."
                      className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Image URL (Optional)</label>
                    <input
                      type="url"
                      value={newQuestion.imageUrl}
                      onChange={(e) => setNewQuestion({ ...newQuestion, imageUrl: e.target.value })}
                      placeholder="https://example.com/image.png"
                      className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded text-white placeholder-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">Paste a URL to an image (PNG, JPG, GIF, etc.)</p>
                    {newQuestion.imageUrl && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-1">Preview:</p>
                        <img 
                          src={newQuestion.imageUrl} 
                          alt="Question preview" 
                          className="max-w-full max-h-48 rounded border border-white/20"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveQuestion}
                      disabled={savingQuestion}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {savingQuestion ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Add Question'}
                    </Button>
                    {editingQuestionId && (
                      <Button
                        onClick={() => {
                          setEditingQuestionId(null)
                          setNewQuestion({
                            stage: 1,
                            domain: 'Algorithms',
                            question: '',
                            correctAnswer: '',
                            imageUrl: '',
                          })
                        }}
                        variant="outline"
                        className="text-white border-white/30"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                {/* Questions List */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Configured Questions ({questions.length})</h3>
                  
                  {questions.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Info className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No questions configured yet</p>
                      <p className="text-sm mt-1">Add questions using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {questions.map((q: any) => (
                        <div
                          key={q.id}
                          className={`p-4 rounded-lg border ${
                            q.isUsed
                              ? 'bg-gray-500/20 border-gray-500/50'
                              : 'bg-white/5 border-white/20'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-sm font-semibold text-yellow-400">
                                Stage {q.stage} - {q.domain}
                              </span>
                              {q.isUsed && (
                                <span className="ml-2 text-xs bg-gray-600 px-2 py-1 rounded">Used</span>
                              )}
                            </div>
                            {!q.isUsed && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setNewQuestion({
                                      stage: q.stage,
                                      domain: q.domain,
                                      question: q.question,
                                      correctAnswer: q.correctAnswer,
                                      imageUrl: q.imageUrl || '',
                                    })
                                    setEditingQuestionId(q.id)
                                  }}
                                  className="text-white border-white/30 text-xs"
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="text-red-400 border-red-400/50 hover:bg-red-500/20 text-xs"
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </div>
                          <p className="text-sm mb-2"><strong>Q:</strong> {q.question}</p>
                          {q.imageUrl && (
                            <div className="my-2">
                              <img 
                                src={q.imageUrl} 
                                alt="Question image" 
                                className="max-w-full max-h-32 rounded border border-white/20"
                              />
                            </div>
                          )}
                          <p className="text-sm text-green-400"><strong>A:</strong> {q.correctAnswer}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-white/10 border-white/20 text-white">
              <CardHeader>
                <CardTitle>All Registered Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
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
                          {user.lobby && (
                            <p className="text-xs text-blue-400 mt-1">
                              Assigned to: {user.lobby.name} (Stage {user.lobby.stage})
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Registered: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Profile
                          </Button>
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
          </TabsContent>
        </Tabs>

        {/* User Profile Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
            <Card className="bg-slate-800 border-slate-700 text-white max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>User Profile: {selectedUser.name}</CardTitle>
                <CardDescription className="text-gray-300">{selectedUser.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">User ID</p>
                    <p className="text-sm font-mono">{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Profile Status</p>
                    <p className="text-sm">{selectedUser.profileComplete ? '✅ Complete' : '⏳ Incomplete'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Registered</p>
                    <p className="text-sm">{new Date(selectedUser.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Lobby Assignment</p>
                    <p className="text-sm">{selectedUser.lobby ? selectedUser.lobby.name : 'Not assigned'}</p>
                  </div>
                </div>

                {selectedUser.domainRatings && selectedUser.domainRatings.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-3">Domain Ratings:</p>
                    <div className="space-y-2">
                      {selectedUser.domainRatings.map((rating) => (
                        <div key={rating.domain} className="p-3 bg-white/5 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-medium">{rating.domain}</p>
                            <span className="text-sm font-bold text-yellow-400">{rating.rating}/10</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                            <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${(rating.rating / 10) * 100}%` }}></div>
                          </div>
                          {rating.reason && (
                            <p className="text-xs text-gray-400 mt-1">{rating.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={() => setSelectedUser(null)} className="w-full">
                  Close
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
