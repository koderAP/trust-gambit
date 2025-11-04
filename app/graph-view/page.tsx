'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { DelegationGraphVisualization } from '@/components/DelegationGraphVisualization'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatSuperscript } from '@/lib/utils'

function GraphViewContent() {
  const searchParams = useSearchParams()
  const roundId = searchParams.get('roundId')
  const [graphData, setGraphData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchGraphData = async () => {
      if (!roundId) {
        setError('No round ID provided')
        setLoading(false)
        return
      }

      try {
        // Get userId from localStorage (set when opening the window)
        const userId = localStorage.getItem('viewGraphUserId')
        
        const res = await fetch(`/api/rounds/${roundId}/results?userId=${userId}`)
        if (!res.ok) throw new Error('Failed to fetch round results')
        
        const data = await res.json()
        setGraphData(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchGraphData()
  }, [roundId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading graph visualization...</div>
      </div>
    )
  }

  if (error || !graphData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || 'Failed to load graph data'}</p>
            <Button onClick={() => window.close()} className="mt-4 w-full">
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/20">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span>🔀</span>
              Delegation Graph Visualization
            </h1>
            <p className="text-gray-300 text-sm mt-1">
              Round {graphData.round.roundNumber} - {graphData.round.domain}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.close()}
            className="text-white border-white/30 hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>

        {/* Graph Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Total Players</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{graphData.graph.nodes.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Delegations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{graphData.graph.edges.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">Solved Correctly</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {graphData.graph.nodes.filter((n: any) => n.action === 'SOLVE' && n.isCorrect === true).length}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-300">In Cycles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">
                {graphData.graph.nodes.filter((n: any) => n.inCycle).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Graph Visualization */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Interactive Delegation Network</CardTitle>
            <CardDescription className="text-gray-300">
              Pan, zoom, and drag nodes to explore the delegation relationships
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2">
            <div className="bg-white rounded-lg" style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
              <DelegationGraphVisualization graphData={graphData.graph} />
            </div>
          </CardContent>
        </Card>

        {/* Question Info */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
          <CardHeader>
            <CardTitle>Question Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-gray-300">Question:</p>
              <p 
                className="font-medium whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: formatSuperscript(graphData.round.question) }}
              />
            </div>
            <div>
              <p className="text-sm text-gray-300">Correct Answer:</p>
              <p className="font-medium text-green-400">{graphData.round.correctAnswer}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function GraphViewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    }>
      <GraphViewContent />
    </Suspense>
  )
}
