'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SimpleModal } from '@/components/ui/simple-modal'
import { Shield, Users, Play, LogOut, CheckCircle2, Clock, Activity, Layers, Target, Info, TrendingUp, AlertCircle, Eye, ChevronDown, ChevronUp, Lock, Unlock, Download } from 'lucide-react'

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
    allowProfileEdits: boolean
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
  
  // Round results modal state
  const [selectedRoundResults, setSelectedRoundResults] = useState<any>(null)
  const [loadingRoundResults, setLoadingRoundResults] = useState(false)
  
  // Game winners state
  const [gameWinners, setGameWinners] = useState<any>(null)
  const [loadingWinners, setLoadingWinners] = useState(false)
  
  // Game parameters state
  const [lambda, setLambda] = useState<number>(0.5)
  const [beta, setBeta] = useState<number>(0.1)
  const [gamma, setGamma] = useState<number>(0.2)
  const [defaultDuration, setDefaultDuration] = useState<number>(60)
  const [roundDurationOverride, setRoundDurationOverride] = useState<number | null>(null)
  const [updatingParams, setUpdatingParams] = useState(false)

  // Questions state
  const [questions, setQuestions] = useState<any[]>([])
  
  // Export data state
  const [exportingData, setExportingData] = useState(false)
  
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
  
  // Bulk upload state
  const [uploadingBulk, setUploadingBulk] = useState(false)
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null)
  
  // Clear all questions state
  const [clearingAllQuestions, setClearingAllQuestions] = useState(false)

  // Tab refresh states
  const [refreshingUsers, setRefreshingUsers] = useState(false)
  const [refreshingLobbies, setRefreshingLobbies] = useState(false)
  const [refreshingGame, setRefreshingGame] = useState(false)
  
  // Profile edit control state
  const [allowProfileEdits, setAllowProfileEdits] = useState(true)
  const [togglingProfileEdits, setTogglingProfileEdits] = useState(false)

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
      
      // Refresh only overview stats every 5 seconds
      const interval = setInterval(fetchOverviewStats, 5000)
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

  // Fetch winners when game status changes to ENDED
  useEffect(() => {
    const activeGame = gameState?.activeGame
    if (activeGame?.status === 'ENDED') {
      fetchGameWinners()
    }
  }, [gameState?.activeGame?.status])

  // OPTIMIZED: Fetch initial data without heavy submissions/scores
  const fetchGameState = async () => {
    try {
      // Use optimized endpoint - exclude users initially, no submissions/scores
      const res = await fetch('/api/admin/game-state?includeUsers=false&includeSubmissions=false&includeScores=false')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch game state')
      }

      setGameState(data)
      
      // Update profile edits control state
      if (data.activeGame?.allowProfileEdits !== undefined) {
        setAllowProfileEdits(data.activeGame.allowProfileEdits)
      }
    } catch (err: any) {
      console.error('Error fetching game state:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // OPTIMIZED: Lightweight refresh - only stats
  const refreshStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch stats')
      }

      // Update ONLY stats and minimal activeGame info
      setGameState((prevState) => {
        if (!prevState) {
          return prevState
        }
        
        return {
          stats: data.stats,
          allUsers: prevState.allUsers,
          activeGame: prevState.activeGame ? {
            ...prevState.activeGame,
            status: data.activeGame?.status || prevState.activeGame.status,
            currentRound: data.activeGame?.currentRound || prevState.activeGame.currentRound,
            currentStage: data.activeGame?.currentStage || prevState.activeGame.currentStage,
            lobbies: prevState.activeGame.lobbies,
            rounds: prevState.activeGame.rounds,
          } : data.activeGame,
        }
      })
    } catch (err: any) {
      console.error('Error fetching stats:', err)
    }
  }

  // OPTIMIZED: Refresh lobbies only
  const refreshLobbies = async () => {
    try {
      const res = await fetch('/api/admin/lobbies')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch lobbies')
      }

      setGameState((prevState) => {
        if (!prevState?.activeGame) return prevState
        
        return {
          ...prevState,
          activeGame: {
            ...prevState.activeGame,
            lobbies: data.lobbies,
            totalLobbies: data.lobbies.length
          }
        }
      })
    } catch (err: any) {
      console.error('Error fetching lobbies:', err)
    }
  }

  // OPTIMIZED: Refresh rounds only
  const refreshRounds = async () => {
    try {
      // Note: scoresCalculated flag is always included by the API
      const res = await fetch('/api/admin/rounds')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch rounds')
      }

      setGameState((prevState) => {
        if (!prevState?.activeGame) return prevState
        
        return {
          ...prevState,
          activeGame: {
            ...prevState.activeGame,
            rounds: data.rounds,
            totalRounds: data.rounds.length,
            currentRound: data.currentRound,
            currentStage: data.currentStage,
            status: data.gameStatus
          }
        }
      })
    } catch (err: any) {
      console.error('Error fetching rounds:', err)
    }
  }

  // OPTIMIZED: Refresh users only
  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/admin/users/detailed')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setGameState((prevState) => {
        if (!prevState) return prevState
        
        return {
          ...prevState,
          allUsers: data.users
        }
      })
    } catch (err: any) {
      console.error('Error fetching users:', err)
    }
  }

  // Fetch only overview stats (lightweight - doesn't fetch users/lobbies/rounds)
  const fetchOverviewStats = async () => {
    try {
      // Use lightweight stats-only endpoint
      const res = await fetch('/api/admin/stats')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch stats')
      }

      // Update ONLY stats and minimal activeGame info
      // This is truly lightweight - no users, lobbies, or rounds data fetched
      setGameState((prevState) => {
        if (!prevState) {
          // Initial load - need full data, so fetch it
          fetchGameState()
          return prevState
        }
        
        // Partial update: ONLY stats and basic game status
        return {
          stats: data.stats, // Update stats (5 numbers only)
          allUsers: prevState.allUsers, // Keep existing users (not fetched)
          activeGame: prevState.activeGame ? {
            ...prevState.activeGame,
            // Only update minimal fields from lightweight endpoint
            status: data.activeGame?.status || prevState.activeGame.status,
            currentRound: data.activeGame?.currentRound || prevState.activeGame.currentRound,
            currentStage: data.activeGame?.currentStage || prevState.activeGame.currentStage,
            // Keep expensive data unchanged (not fetched from stats endpoint)
            lobbies: prevState.activeGame.lobbies,
            rounds: prevState.activeGame.rounds,
          } : data.activeGame,
        }
      })
    } catch (err: any) {
      console.error('Error fetching overview stats:', err)
      // Don't show error for background refresh
    }
  }

  const fetchRoundResults = async (roundId: string) => {
    setLoadingRoundResults(true)
    try {
      const res = await fetch(`/api/rounds/${roundId}/results`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch round results')
      }

      setSelectedRoundResults(data)
    } catch (err: any) {
      console.error('Error fetching round results:', err)
      setError(err.message)
    } finally {
      setLoadingRoundResults(false)
    }
  }

  const fetchGameWinners = async () => {
    setLoadingWinners(true)
    try {
      const res = await fetch('/api/game-winners')
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch winners')
      }

      setGameWinners(data)
    } catch (err: any) {
      console.error('Error fetching winners:', err)
      setError(err.message)
    } finally {
      setLoadingWinners(false)
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
        throw new Error(data.error || 'Failed to assign lobbies')
      }

      setSuccess(`Lobbies assigned! Created ${data.lobbiesCreated} lobbies with ${data.playersAssigned} players. Use "Activate Lobbies" button to make them ready.`)
      
      // OPTIMIZED: Only refresh stats and lobbies (not users or rounds)
      await Promise.all([refreshStats(), refreshLobbies()])
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
      
      // OPTIMIZED: Refresh stats and lobbies (stage change affects lobbies)
      await Promise.all([refreshStats(), refreshLobbies()])
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
      
      // OPTIMIZED: Refresh stats and rounds (game ended)
      await Promise.all([refreshStats(), refreshRounds()])
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/admin/login' })
  }

  const handleExportGameData = async () => {
    if (!activeGame) {
      setError('No active game to export')
      return
    }

    setExportingData(true)
    setError('')
    setSuccess('')

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const stageName = activeGame.currentStage === 1 ? 'stage-1' : activeGame.currentStage === 2 ? 'stage-2' : 'game'
      const filename = `trust-gambit-${stageName}-${timestamp}.json`

      const res = await fetch(`/api/admin/export-game-data?gameId=${activeGame.id}`)
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to export game data')
      }

      // Download the file
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setSuccess(`Game data exported successfully! File: ${filename}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExportingData(false)
    }
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

  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      setError('Please select a JSON file to upload')
      return
    }

    setUploadingBulk(true)
    setError('')
    setSuccess('')

    try {
      // Read the file content
      const fileContent = await bulkUploadFile.text()
      let questions

      try {
        questions = JSON.parse(fileContent)
      } catch (parseError) {
        throw new Error('Invalid JSON file. Please check the file format.')
      }

      // Upload to the API
      const res = await fetch('/api/admin/questions/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questions),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload questions')
      }

      setSuccess(`Successfully uploaded ${data.count} questions!`)
      setBulkUploadFile(null)
      
      // Reset file input
      const fileInput = document.getElementById('bulk-upload-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
      await fetchQuestions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploadingBulk(false)
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

  const handleClearAllQuestions = async () => {
    const confirmMessage = 'Are you sure you want to DELETE ALL QUESTIONS from the database? This action cannot be undone!'
    
    if (!confirm(confirmMessage)) return
    
    // Double confirmation for safety
    const doubleConfirm = confirm('⚠️ FINAL WARNING: This will permanently delete ALL questions. Are you absolutely sure?')
    if (!doubleConfirm) return

    setError('')
    setSuccess('')
    setClearingAllQuestions(true)

    try {
      const res = await fetch('/api/admin/questions/clear-all', {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to clear questions')
      }

      setSuccess(`Successfully deleted ${data.deletedCount} questions`)
      await fetchQuestions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setClearingAllQuestions(false)
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
      // OPTIMIZED: Refresh stats and lobbies (player removed from lobby)
      await Promise.all([refreshStats(), refreshLobbies()])
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
              <p className="text-gray-300 text-sm">Overview stats auto-refresh every 5s • Use tab refresh buttons for detailed data</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Export Game Data Button - Show if game exists */}
            {activeGame && (
              <Button
                variant="outline"
                onClick={handleExportGameData}
                disabled={exportingData}
                className="text-blue-400 border-blue-400 hover:bg-blue-500/10"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportingData ? 'Exporting...' : 'Export Data'}
              </Button>
            )}
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
                      // OPTIMIZED: Refresh game state and questions
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
            <TabsTrigger value="questions" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white">
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

                {/* Assign Lobbies Button - Show when game exists and has waiting players */}
                {/* Can be used multiple times to add more lobbies incrementally */}
                {activeGame && ['NOT_STARTED', 'REGISTRATION_OPEN', 'LOBBIES_FORMING', 'STAGE_1_ACTIVE'].includes(activeGame.status) && (
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
                            // OPTIMIZED: Refresh stats and lobbies only
                            await Promise.all([refreshStats(), refreshLobbies()]);
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
                    {/* Consolidate Lobbies Button: Show if there are multiple WAITING lobbies with few players */}
                    {activeGame.lobbies.filter((l: any) => l.status === 'WAITING').length > 1 && (
                      <Button
                        onClick={async () => {
                          setError('');
                          setSuccess('');
                          try {
                            const res = await fetch('/api/admin/consolidate-lobbies', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ gameId: activeGame.id }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Failed to consolidate lobbies');
                            setSuccess(`Consolidated ${data.oldLobbies} lobbies into ${data.newLobbies} lobby/lobbies with ${data.totalPlayers} players!`);
                            // OPTIMIZED: Refresh stats and lobbies (lobby structure changed)
                            await Promise.all([refreshStats(), refreshLobbies()]);
                          } catch (err: any) {
                            setError(err.message);
                          }
                        }}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold mt-2"
                      >
                        <Layers className="mr-2 h-4 w-4" />
                        Consolidate Small Lobbies
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
                          // OPTIMIZED: Refresh stats and lobbies
                          await Promise.all([refreshStats(), refreshLobbies()]);
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
                          // OPTIMIZED: Refresh stats and lobbies
                          await Promise.all([refreshStats(), refreshLobbies()]);
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
                              // OPTIMIZED: Refresh stats and rounds (round ended, scores calculated)
                              await Promise.all([refreshStats(), refreshRounds()]);
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
                              // OPTIMIZED: Refresh stats and rounds (new round started)
                              await Promise.all([refreshStats(), refreshRounds()]);
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

            {/* Profile Edit Control - Three-Phase Game Management */}
            {activeGame && (
              <Card className={`border ${allowProfileEdits ? 'bg-green-500/10 border-green-500/50' : 'bg-orange-500/10 border-orange-500/50'} text-white`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {allowProfileEdits ? <Unlock className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-orange-500" />}
                    Profile Edit Control
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Control whether users can edit their domain ratings (3-phase game management)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`p-3 rounded-lg border ${
                    allowProfileEdits 
                      ? 'bg-green-500/20 border-green-500/50' 
                      : 'bg-orange-500/20 border-orange-500/50'
                  }`}>
                    <p className="text-sm font-semibold mb-1">
                      Current Status: {allowProfileEdits ? '🔓 UNLOCKED' : '🔒 LOCKED'}
                    </p>
                    <p className="text-xs text-gray-300">
                      {allowProfileEdits 
                        ? 'Users CAN currently edit their domain ratings and profile' 
                        : 'Users CANNOT currently edit their domain ratings - profile is locked'}
                    </p>
                  </div>
                  
                  <Button
                    onClick={async () => {
                      setError('')
                      setSuccess('')
                      setTogglingProfileEdits(true)
                      try {
                        const res = await fetch('/api/admin/toggle-profile-edits', {
                          method: 'POST',
                        })
                        const data = await res.json()
                        if (!res.ok) throw new Error(data.error || 'Failed to toggle profile edits')
                        
                        setAllowProfileEdits(data.allowProfileEdits)
                        setSuccess(data.message)
                        
                        // Update game state
                        if (gameState?.activeGame) {
                          setGameState({
                            ...gameState,
                            activeGame: {
                              ...gameState.activeGame,
                              allowProfileEdits: data.allowProfileEdits
                            }
                          })
                        }
                      } catch (err: any) {
                        setError(err.message)
                      } finally {
                        setTogglingProfileEdits(false)
                      }
                    }}
                    disabled={togglingProfileEdits}
                    className={`w-full font-semibold ${
                      allowProfileEdits
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {togglingProfileEdits ? (
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                    ) : allowProfileEdits ? (
                      <Lock className="mr-2 h-4 w-4" />
                    ) : (
                      <Unlock className="mr-2 h-4 w-4" />
                    )}
                    {togglingProfileEdits 
                      ? 'Toggling...' 
                      : allowProfileEdits 
                        ? 'Lock Profile Editing' 
                        : 'Unlock Profile Editing'}
                  </Button>
                  
                  <p className="text-xs text-gray-400 mt-2">
                    💡 Use this to control the three phases: (1) Profile setup, (2) Game play with locked profiles, (3) Post-game with unlocked profiles
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Game Winners Section - Show when game is ENDED */}
            {activeGame && activeGame.status === 'ENDED' && (
              <Card className="bg-gray-800/50 border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl text-yellow-400">
                    <TrendingUp className="h-6 w-6 text-yellow-400" />
                    🏆 Global Top 10 Winners
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Top 10 players ranked by cumulative Stage 2 scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingWinners ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
                      <p className="mt-4 text-gray-400">Loading winners...</p>
                    </div>
                  ) : gameWinners?.gameEnded && gameWinners.winners && gameWinners.winners.length > 0 ? (
                    <div className="space-y-4">
                      {gameWinners.endedAt && (
                        <p className="text-sm text-gray-400 mb-4">
                          Game ended: {new Date(gameWinners.endedAt).toLocaleString()}
                        </p>
                      )}
                      
                      {/* Top 3 - Large Cards with Medals */}
                      <div className="space-y-3 mb-6">
                        {gameWinners.winners.slice(0, 3).map((winner: any, idx: number) => (
                          <div 
                            key={winner.userId}
                            className={`p-5 rounded-lg border ${
                              idx === 0 
                                ? 'bg-yellow-900/20 border-yellow-600/50' 
                                : idx === 1
                                ? 'bg-gray-700/30 border-gray-500/50'
                                : 'bg-orange-900/20 border-orange-600/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`text-4xl font-bold ${
                                  idx === 0 
                                    ? 'text-yellow-400' 
                                    : idx === 1
                                    ? 'text-gray-300'
                                    : 'text-orange-400'
                                }`}>
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                </div>
                                <div>
                                  <p className="text-xl font-bold text-gray-100">{winner.userName}</p>
                                  <p className="text-xs text-gray-500 font-mono">ID: {winner.userId}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-bold text-gray-100">{winner.totalScore.toFixed(2)}</p>
                                <p className="text-sm text-gray-400">points</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Ranks 4-10 - Compact List */}
                      {gameWinners.winners.length > 3 && (
                        <div className="border-t border-gray-700 pt-4">
                          <h3 className="text-lg font-semibold mb-3 text-gray-300">Ranks 4-10</h3>
                          <div className="space-y-2">
                            {gameWinners.winners.slice(3, 10).map((winner: any, idx: number) => (
                              <div 
                                key={winner.userId}
                                className="p-3 rounded-lg bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800/60 transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="text-lg font-bold text-gray-400 w-8">
                                      #{idx + 4}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-200">{winner.userName}</p>
                                      <p className="text-xs text-gray-500 font-mono">{winner.userId}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xl font-bold text-gray-100">{winner.totalScore.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">points</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                        <p className="text-sm text-blue-300">
                          <strong>Note:</strong> Scores shown are cumulative totals from all Stage 2 rounds across all lobbies.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No winners data available.</p>
                      <Button
                        onClick={fetchGameWinners}
                        className="mt-4 bg-yellow-600 hover:bg-yellow-700"
                      >
                        Refresh Winners
                      </Button>
                    </div>
                  )}
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
                          // OPTIMIZED: Fetch fresh game state
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
                          // OPTIMIZED: Fresh fetch after wipe
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
            {/* Refresh Button for Active Game Tab */}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setRefreshingGame(true)
                  try {
                    // OPTIMIZED: Refresh rounds only for game tab
                    await refreshRounds()
                    setSuccess('Active game data refreshed')
                  } catch (err: any) {
                    setError('Failed to refresh game data')
                  } finally {
                    setRefreshingGame(false)
                  }
                }}
                disabled={refreshingGame}
                className="text-white border-white/30 hover:bg-white/10"
              >
                {refreshingGame ? '⟳ Refreshing...' : '⟳ Refresh'}
              </Button>
            </div>

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
                            // OPTIMIZED: Refresh stats only (params are metadata)
                            await refreshStats();
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
                  <>
                    {/* All Rounds List */}
                    <Card className="bg-white/10 border-white/20 text-white">
                      <CardHeader>
                        <CardTitle>All Rounds ({activeGame.rounds.length})</CardTitle>
                        <CardDescription className="text-gray-300">
                          Complete list of all rounds (Active, Completed, and Pending)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {activeGame.rounds.map((round) => (
                            <div key={round.id} className="p-3 bg-white/5 rounded-lg">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                  <p className="font-medium">Round {round.roundNumber} - {round.domain}</p>
                                  <p className="text-xs text-gray-400 mt-1 whitespace-pre-line">{round.question}</p>
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
                                  {round.status === 'COMPLETED' && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => fetchRoundResults(round.id)}
                                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                      title="View round results"
                                    >
                                      <Eye className="h-4 w-4 mr-1" />
                                      Results
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
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
            {/* Refresh Button for Lobbies Tab */}
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  setRefreshingLobbies(true)
                  try {
                    // OPTIMIZED: Refresh lobbies only
                    await refreshLobbies()
                    setSuccess('Lobbies refreshed')
                  } catch (err: any) {
                    setError('Failed to refresh lobbies')
                  } finally {
                    setRefreshingLobbies(false)
                  }
                }}
                disabled={refreshingLobbies}
                className="text-white border-white/30 hover:bg-white/10"
              >
                {refreshingLobbies ? '⟳ Refreshing...' : '⟳ Refresh'}
              </Button>
            </div>

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
                      <option value="Astronomy" className="bg-gray-800">Astronomy</option>
                      <option value="Biology" className="bg-gray-800">Biology</option>
                      <option value="Crypto" className="bg-gray-800">Crypto</option>
                      <option value="Economics" className="bg-gray-800">Economics</option>
                      <option value="Finance" className="bg-gray-800">Finance</option>
                      <option value="Game Theory" className="bg-gray-800">Game Theory</option>
                      <option value="Indian History" className="bg-gray-800">Indian History</option>
                      <option value="Machine Learning" className="bg-gray-800">Machine Learning</option>
                      <option value="Probability" className="bg-gray-800">Probability</option>
                      <option value="Statistics" className="bg-gray-800">Statistics</option>
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

                {/* Bulk Upload Section */}
                <div className="p-4 bg-purple-500/20 border border-purple-500/50 rounded-lg space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-400" />
                    Bulk Upload Questions (JSON)
                  </h3>
                  <p className="text-sm text-gray-300">
                    Upload multiple questions at once using a JSON file. Each question must have: stage, domain, question, correctAnswer, and optional imageUrl.
                  </p>
                  
                  <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
                    <p className="text-xs text-gray-400 mb-2">Expected JSON format:</p>
                    <pre className="text-xs text-green-300 overflow-x-auto">
{`[
  {
    "stage": 1,
    "domain": "Algorithms",
    "question": "What is the time complexity?",
    "correctAnswer": "O(log n)",
    "imageUrl": ""
  }
]`}
                    </pre>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="bulk-upload-input"
                      type="file"
                      accept=".json"
                      onChange={(e) => setBulkUploadFile(e.target.files?.[0] || null)}
                      className="flex-1 text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer"
                    />
                    <Button
                      onClick={handleBulkUpload}
                      disabled={uploadingBulk || !bulkUploadFile}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {uploadingBulk ? 'Uploading...' : 'Upload'}
                    </Button>
                  </div>
                  
                  {bulkUploadFile && (
                    <p className="text-xs text-gray-400">
                      Selected: {bulkUploadFile.name} ({(bulkUploadFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>

                {/* Questions List */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-lg">Configured Questions ({questions.length})</h3>
                    {questions.length > 0 && (
                      <Button
                        onClick={handleClearAllQuestions}
                        disabled={clearingAllQuestions}
                        variant="destructive"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {clearingAllQuestions ? 'Deleting...' : '🗑️ Clear All Questions'}
                      </Button>
                    )}
                  </div>
                  
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
                          <p className="text-sm mb-2 whitespace-pre-line"><strong>Q:</strong> {q.question}</p>
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
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle>All Registered Users ({users.length})</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setRefreshingUsers(true)
                    try {
                      // OPTIMIZED: Refresh users only
                      await refreshUsers()
                      setSuccess('Users list refreshed')
                    } catch (err: any) {
                      setError('Failed to refresh users')
                    } finally {
                      setRefreshingUsers(false)
                    }
                  }}
                  disabled={refreshingUsers}
                  className="text-white border-white/30 hover:bg-white/10"
                >
                  {refreshingUsers ? '⟳ Refreshing...' : '⟳ Refresh'}
                </Button>
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

        {/* Round Results Modal */}
        <SimpleModal 
          open={selectedRoundResults !== null} 
          onOpenChange={() => setSelectedRoundResults(null)}
        >
          {loadingRoundResults ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading round results...</p>
            </div>
          ) : selectedRoundResults && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Round {selectedRoundResults.round.roundNumber} Results
                </h2>
                <p className="text-sm text-gray-600">
                  {selectedRoundResults.round.domain} | Status: <span className="font-semibold">{selectedRoundResults.round.status}</span>
                </p>
              </div>

              {/* Question and Answer */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Question</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-gray-900 whitespace-pre-line">{selectedRoundResults.round.question}</p>
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-sm font-semibold text-green-700">
                      Correct Answer: {selectedRoundResults.round.correctAnswer}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Submissions Summary */}
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Submissions ({selectedRoundResults.graph.nodes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedRoundResults.graph.nodes
                      .sort((a: any, b: any) => b.score - a.score)
                      .map((node: any) => (
                        <div 
                          key={node.id} 
                          className={`p-3 rounded-lg border ${
                            node.action === 'SOLVE' && node.isCorrect 
                              ? 'bg-green-50 border-green-200' 
                              : node.action === 'DELEGATE' 
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{node.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`text-xs px-2 py-1 rounded ${
                                  node.action === 'SOLVE' ? 'bg-green-100 text-green-800' :
                                  node.action === 'DELEGATE' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {node.action}
                                </span>
                                {node.action === 'SOLVE' && (
                                  <span className="text-xs text-gray-600">
                                    Answer: <span className={node.isCorrect ? 'text-green-700 font-semibold' : 'text-red-700'}>
                                      {node.answer}
                                    </span>
                                  </span>
                                )}
                                {node.action === 'DELEGATE' && node.delegateTo && (
                                  <span className="text-xs text-gray-600">
                                    Delegated to: {selectedRoundResults.graph.nodes.find((n: any) => n.id === node.delegateTo)?.name || node.delegateTo}
                                  </span>
                                )}
                                {node.inCycle && (
                                  <span className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800">
                                    ⚠️ In Cycle
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-900">{node.score.toFixed(2)}</p>
                              <p className="text-xs text-gray-500">points</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Delegation Graph */}
              {selectedRoundResults.graph.edges.length > 0 && (
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Delegation Chains ({selectedRoundResults.graph.edges.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedRoundResults.graph.edges.map((edge: any, idx: number) => {
                        const fromNode = selectedRoundResults.graph.nodes.find((n: any) => n.id === edge.from)
                        const toNode = selectedRoundResults.graph.nodes.find((n: any) => n.id === edge.to)
                        return (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                            <span className="text-sm text-gray-900 font-medium">{fromNode?.name || edge.from}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-sm text-gray-900 font-medium">{toNode?.name || edge.to}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={() => setSelectedRoundResults(null)} 
                className="w-full"
              >
                Close
              </Button>
            </div>
          )}
        </SimpleModal>
      </div>
    </div>
  )
}
