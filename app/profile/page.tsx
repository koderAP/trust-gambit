'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { DOMAINS } from '@/lib/constants'

type DomainRating = {
  domain: string
  rating: number
  reason: string
}

type UserProfile = {
  id: string
  name: string
  email: string
  hostelName?: string | null
  domainRatings: {
    domain: string
    rating: number
    reason: string | null
  }[]
}

function ProfileEditContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('userId')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [domainRatings, setDomainRatings] = useState<DomainRating[]>([])

  useEffect(() => {
    if (!userId) {
      setError('User ID not found')
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/profile/${userId}`)
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load profile')
        }
        
        setProfile(data)
        setDomainRatings(data.domainRatings.map((dr: any) => ({
          domain: dr.domain,
          rating: dr.rating,
          reason: dr.reason || '',
        })))
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  const updateRating = (index: number, rating: number) => {
    const updated = [...domainRatings]
    updated[index] = { ...updated[index], rating }
    setDomainRatings(updated)
  }

  const updateReason = (index: number, reason: string) => {
    const updated = [...domainRatings]
    updated[index] = { ...updated[index], reason }
    setDomainRatings(updated)
  }

  const handleSave = async () => {
    if (!userId) {
      setError('User ID not found')
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          domainRatings,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-red-600">User ID not found in URL</p>
            <div className="mt-4">
              <Link href="/">
                <Button variant="outline" className="w-full">Go to Home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-red-600">{error}</p>
            <div className="mt-4">
              <Link href={`/dashboard?userId=${userId}`}>
                <Button variant="outline" className="w-full">Back to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/dashboard?userId=${userId}`}>
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Card className="border-2 border-primary shadow-lg">
            <CardHeader>
              <CardTitle className="text-3xl">Edit Your Profile</CardTitle>
              <CardDescription>Update your domain expertise ratings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Name:</span>
                  <span>{profile.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Email:</span>
                  <span>{profile.email}</span>
                </div>
                {profile.hostelName && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Hostel:</span>
                    <span>{profile.hostelName}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Success Message */}
        {success && (
          <Card className="mb-6 border-2 border-green-500 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Profile updated successfully!</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="mb-6 border-2 border-red-500 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Domain Ratings */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Domain Expertise</CardTitle>
            <CardDescription>
              Rate your expertise in each domain from 1-10 and explain your background
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {domainRatings.map((domainRating, index) => (
              <div key={domainRating.domain} className="space-y-4 pb-6 border-b last:border-b-0">
                <div>
                  <Label className="text-lg font-semibold">{domainRating.domain}</Label>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Expertise Level</Label>
                    <span className="text-2xl font-bold text-primary">{domainRating.rating}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={domainRating.rating}
                    onChange={(e) => updateRating(index, parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 - Beginner</span>
                    <span>5 - Intermediate</span>
                    <span>10 - Expert</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Background & Experience (Optional)</Label>
                  <Textarea
                    placeholder="Describe your experience, qualifications, or why you rated yourself this way..."
                    value={domainRating.reason}
                    onChange={(e) => updateReason(index, e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="mt-6 flex gap-4">
          <Link href={`/dashboard?userId=${userId}`} className="flex-1">
            <Button variant="outline" className="w-full" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProfileEditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ProfileEditContent />
    </Suspense>
  )
}
