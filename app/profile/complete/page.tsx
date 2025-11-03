'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { DOMAINS } from '@/lib/constants'

type DomainRating = {
  domain: string
  rating: number
  reason: string
}

function ProfileCompleteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [profileEditsAllowed, setProfileEditsAllowed] = useState(true)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0)
  const [domainRatings, setDomainRatings] = useState<DomainRating[]>(
    DOMAINS.map(domain => ({
      domain,
      rating: 5,
      reason: '',
    }))
  )

  const currentDomain = domainRatings[currentDomainIndex]
  const progress = ((currentDomainIndex + 1) / DOMAINS.length) * 100
  const isLastDomain = currentDomainIndex === DOMAINS.length - 1

  // Check if profile editing is allowed
  useEffect(() => {
    const checkProfileEditAccess = async () => {
      try {
        const res = await fetch('/api/admin/game-state?includeUsers=false&includeLobbies=false&includeRounds=false&includeSubmissions=false&includeScores=false')
        const data = await res.json()
        
        if (res.ok && data.activeGame) {
          setProfileEditsAllowed(data.activeGame.allowProfileEdits !== false)
        }
      } catch (err) {
        console.error('Error checking profile edit access:', err)
        // Default to allowing edits if check fails
        setProfileEditsAllowed(true)
      } finally {
        setCheckingAccess(false)
      }
    }
    
    checkProfileEditAccess()
  }, [])

  const updateCurrentRating = (rating: number) => {
    const updated = [...domainRatings]
    updated[currentDomainIndex] = { ...updated[currentDomainIndex], rating }
    setDomainRatings(updated)
  }

  const updateCurrentReason = (reason: string) => {
    const updated = [...domainRatings]
    updated[currentDomainIndex] = { ...updated[currentDomainIndex], reason }
    setDomainRatings(updated)
  }

  const handleNext = () => {
    if (!isLastDomain) {
      setCurrentDomainIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentDomainIndex > 0) {
      setCurrentDomainIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!userId) {
      setError('User ID not found')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/profile/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          domainRatings,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      // Redirect to dashboard or waiting page
      router.push(`/dashboard?userId=${userId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>User ID not found. Please register first.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/register">
              <Button className="w-full">Go to Registration</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/register">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        <Card className="shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Complete Your Profile</CardTitle>
            <CardDescription>
              Rate your expertise in {DOMAINS.length} domains (Domain {currentDomainIndex + 1} of {DOMAINS.length})
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Profile Edit Locked Message */}
            {!checkingAccess && !profileEditsAllowed && (
              <div className="p-4 bg-orange-50 border-2 border-orange-400 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <h4 className="font-semibold text-orange-900 mb-1">Profile Editing is Currently Locked</h4>
                    <p className="text-sm text-orange-800">
                      The game admin has temporarily disabled profile editing. You cannot modify your domain ratings at this time. 
                      This is part of the three-phase game management. Please check back later or contact the admin.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span>{currentDomainIndex + 1}/{DOMAINS.length}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Domain Rating Form */}
            <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-primary">
                  {currentDomain.domain}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Rate your knowledge and expertise in this domain
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="rating" className="text-base">
                    Expertise Rating: <span className="font-bold text-primary">{currentDomain.rating}</span>/10
                  </Label>
                  <input
                    id="rating"
                    type="range"
                    min="0"
                    max="10"
                    value={currentDomain.rating}
                    onChange={(e) => updateCurrentRating(parseInt(e.target.value))}
                    disabled={!profileEditsAllowed}
                    className={`w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary mt-2 ${!profileEditsAllowed ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>No Knowledge (0)</span>
                    <span>Expert (10)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Why this rating? (Optional but recommended)
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder={`Example: I have 3 years of experience in ${currentDomain.domain.toLowerCase()}, completed several projects, but still learning advanced concepts.`}
                    value={currentDomain.reason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateCurrentReason(e.target.value)}
                    disabled={!profileEditsAllowed}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps other players understand your background
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentDomainIndex === 0 || !profileEditsAllowed}
                className="flex-1"
              >
                Previous
              </Button>
              
              {!isLastDomain ? (
                <Button
                  onClick={handleNext}
                  disabled={!profileEditsAllowed}
                  className="flex-1"
                >
                  Next Domain
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !profileEditsAllowed}
                  className="flex-1"
                >
                  {loading ? (
                    'Saving...'
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Complete Profile
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Domain Pills */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">All Domains:</p>
              <div className="flex flex-wrap gap-2">
                {DOMAINS.map((domain, index) => (
                  <button
                    key={domain}
                    onClick={() => setCurrentDomainIndex(index)}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${
                      index === currentDomainIndex
                        ? 'bg-primary text-white'
                        : domainRatings[index].reason
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ProfileCompletePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileCompleteContent />
    </Suspense>
  )
}
