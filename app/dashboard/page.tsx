'use client'

import { useState, useEffect, Suspense } from 'react'
import { SimpleModal } from '@/components/ui/simple-modal'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock, Users, Trophy } from 'lucide-react'

type UserProfile = {
  id: string;
  name: string;
  email: string;
  hostelName?: string | null;
  profileComplete: boolean;
  lobbyRequested: boolean;
  domainRatings: {
    domain: string;
    rating: number;
    reason: string | null;
  }[];
  lobby?: {
    id: string;
    name: string;
    poolNumber: number;
    status: string;
    users: { id: string; name: string }[];
  };
  currentRound?: {
    id: string;
    domain: string;
    question: string;
    correctAnswer: string;
    imageUrl?: string | null;
    roundNumber: number;
    startTime: string;
    durationSeconds: number;
    status: string;
  };
};

function DashboardContent(): JSX.Element {
  // Modal state for viewing other profiles
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);
  const [viewProfile, setViewProfile] = useState<any>(null);
  const [viewProfileLoading, setViewProfileLoading] = useState(false);
  const [viewProfileError, setViewProfileError] = useState('');
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Round submission state
  const [selectedAction, setSelectedAction] = useState<'SOLVE' | 'DELEGATE' | 'PASS' | null>(null);
  const [answer, setAnswer] = useState('');
  const [delegateTo, setDelegateTo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [previousRounds, setPreviousRounds] = useState<any[]>([]);
  const [viewingRound, setViewingRound] = useState<any | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  
  // Game winners state
  const [gameWinners, setGameWinners] = useState<any>(null);
  const [showWinners, setShowWinners] = useState(false);

  // ProfileButton component
  const ProfileButton = () => (
    <div className="flex justify-end mb-4">
      <Link href={`/profile?userId=${userId}`}>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">View/Edit Profile</Button>
      </Link>
    </div>
  );

  useEffect(() => {
        if (!userId) {
          setError('User ID not found');
          setLoading(false);
          return;
        }
        const fetchProfile = async () => {
          try {
            const res = await fetch(`/api/profile/${userId}`);
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || 'Failed to load profile');
            }
            setProfile(data);
          } catch (err: any) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };
        fetchProfile();
      }, [userId]);

  useEffect(() => {
    if (viewProfileId) {
      setViewProfileLoading(true);
      setViewProfileError('');
      fetch(`/api/profile/${viewProfileId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          setViewProfile(data);
        })
        .catch(err => setViewProfileError(err.message))
        .finally(() => setViewProfileLoading(false));
    } else {
      setViewProfile(null);
    }
  }, [viewProfileId]);

  // Fetch game winners on mount and periodically
  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const res = await fetch('/api/game-winners');
        const data = await res.json();
        if (data.gameEnded && data.winners && data.winners.length > 0) {
          setGameWinners(data);
          setShowWinners(true);
        }
      } catch (err) {
        console.error('Failed to fetch winners:', err);
      }
    };

    fetchWinners();
    // Check for winners every 10 seconds
    const interval = setInterval(fetchWinners, 10000);
    return () => clearInterval(interval);
  }, []);

  // Timer effect for active round
  useEffect(() => {
    if (profile?.currentRound && profile.currentRound.startTime) {
      const startTime = new Date(profile.currentRound.startTime).getTime();
      const duration = profile.currentRound.durationSeconds * 1000;
      
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTime;
        const remaining = Math.max(0, duration - elapsed);
        
        setTimeRemaining(Math.floor(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
          // Auto-end the round when timer expires
          const currentRound = profile.currentRound;
          if (currentRound && currentRound.status === 'ACTIVE') {
            fetch(`/api/rounds/${currentRound.id}/end`, {
              method: 'POST'
            })
              .then(res => res.json())
              .then(() => {
                // Refresh profile to get updated round status
                if (userId) {
                  fetch(`/api/profile/${userId}`)
                    .then(res => res.json())
                    .then(data => setProfile(data))
                    .catch(console.error);
                }
              })
              .catch(console.error);
          } else {
            // Just refresh profile if round already ended
            if (userId) {
              fetch(`/api/profile/${userId}`)
                .then(res => res.json())
                .then(data => setProfile(data))
                .catch(console.error);
            }
          }
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [profile?.currentRound, userId]);

  // Check if user has already submitted for current round
  useEffect(() => {
    if (profile?.currentRound && userId) {
      fetch(`/api/rounds/${profile.currentRound.id}/submission?userId=${userId}`)
        .then(res => res.json())
        .then(data => {
          if (data.submission) {
            setHasSubmitted(true);
          }
        })
        .catch(console.error);
    }
  }, [profile?.currentRound, userId]);

  // Fetch previous rounds for this lobby
  useEffect(() => {
    if (profile?.lobby && userId) {
      fetch(`/api/lobbies/${profile.lobby.id}/rounds`)
        .then(res => res.json())
        .then(data => {
          if (data.rounds) {
            setPreviousRounds(data.rounds.filter((r: any) => r.status === 'COMPLETED'));
          }
        })
        .catch(console.error);
    }
  }, [profile?.lobby, userId]);

  // Fetch leaderboard for this lobby
  useEffect(() => {
    if (profile?.lobby) {
      setLeaderboardLoading(true);
      fetch(`/api/lobbies/${profile.lobby.id}/leaderboard`)
        .then(res => res.json())
        .then(data => {
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
          }
        })
        .catch(console.error)
        .finally(() => setLeaderboardLoading(false));
    }
  }, [profile?.lobby, previousRounds]); // Refresh when previous rounds change

  const handleViewResults = async (roundId: string) => {
    try {
      const res = await fetch(`/api/rounds/${roundId}/results?userId=${userId}`);
      const data = await res.json();
      if (data.round) {
        setViewingRound(data);
      }
    } catch (error) {
      console.error('Error fetching round results:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAction || !profile?.currentRound || !userId) return;
    
    // Validate based on action
    if (selectedAction === 'SOLVE' && !answer.trim()) {
      setSubmitError('Please enter an answer');
      return;
    }
    
    if (selectedAction === 'DELEGATE' && !delegateTo) {
      setSubmitError('Please select a player to delegate to');
      return;
    }
    
    setSubmitting(true);
    setSubmitError('');
    
    try {
      const res = await fetch(`/api/rounds/${profile.currentRound.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action: selectedAction,
          answer: selectedAction === 'SOLVE' ? answer : undefined,
          delegateTo: selectedAction === 'DELEGATE' ? delegateTo : undefined,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Submission failed');
      }
      
      setHasSubmitted(true);
      setSelectedAction(null);
      setAnswer('');
      setDelegateTo('');
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };      // Loading state
      if (loading) {
        return (
          <>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
              <Card className="w-full max-w-md">
                <CardContent className="pt-6">
                  <p className="text-center">Loading...</p>
                </CardContent>
              </Card>
            </div>
            <SimpleModal open={!!viewProfileId} onOpenChange={open => setViewProfileId(open ? viewProfileId : null)}>
              <div className="space-y-2">
                <h2 className="text-xl font-bold mb-2">Player Profile</h2>
                {viewProfileLoading && <div>Loading...</div>}
                {viewProfileError && <div className="text-red-600">{viewProfileError}</div>}
                {viewProfile && (
                  <div className="space-y-4">
                    <div>
                      <span className="font-semibold">Name:</span> {viewProfile.name}
                    </div>
                    <div>
                      <span className="font-semibold">Email:</span> {viewProfile.email}
                    </div>
                    {viewProfile.hostelName && (
                      <div>
                        <span className="font-semibold">Hostel:</span> {viewProfile.hostelName}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Domain Expertise:</span>
                      <ul className="mt-2 ml-4 list-disc text-sm">
                        {viewProfile.domainRatings?.map((dr: any) => (
                          <li key={dr.domain}>
                            <span className="font-medium">{dr.domain}</span>: {dr.rating}/10
                            {dr.reason && <span className="text-muted-foreground italic"> — "{dr.reason}"</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </SimpleModal>
          </>
        );
      }

      // Error state
      if (error || !profile) {
        return (
          <>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
              <Card className="w-full max-w-md">
                <CardHeader>
                  <CardTitle>Error</CardTitle>
                  <CardDescription>{error || 'Profile not found'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href="/register">
                    <Button className="w-full">Go to Registration</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
            <SimpleModal open={!!viewProfileId} onOpenChange={open => setViewProfileId(open ? viewProfileId : null)}>
              <div className="space-y-2">
                <h2 className="text-xl font-bold mb-2">Player Profile</h2>
                {viewProfileLoading && <div>Loading...</div>}
                {viewProfileError && <div className="text-red-600">{viewProfileError}</div>}
                {viewProfile && (
                  <div className="space-y-4">
                    <div>
                      <span className="font-semibold">Name:</span> {viewProfile.name}
                    </div>
                    <div>
                      <span className="font-semibold">Email:</span> {viewProfile.email}
                    </div>
                    {viewProfile.hostelName && (
                      <div>
                        <span className="font-semibold">Hostel:</span> {viewProfile.hostelName}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold">Domain Expertise:</span>
                      <ul className="mt-2 ml-4 list-disc text-sm">
                        {viewProfile.domainRatings?.map((dr: any) => (
                          <li key={dr.domain}>
                            <span className="font-medium">{dr.domain}</span>: {dr.rating}/10
                            {dr.reason && <span className="text-muted-foreground italic"> — "{dr.reason}"</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </SimpleModal>
          </>
        );
      }

      return (
        <>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-6 px-4">
            {/* Winner Announcement Banner */}
            {showWinners && gameWinners && (
              <div className="max-w-7xl mx-auto mb-6">
                <Card className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 border-4 border-yellow-600 shadow-2xl">
                  <CardHeader>
                    <CardTitle className="text-center text-white text-3xl flex items-center justify-center gap-3">
                      <Trophy className="h-10 w-10" />
                      🎉 Game Completed! Top 3 Winners 🎉
                      <Trophy className="h-10 w-10" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gameWinners.winners.map((winner: any, index: number) => (
                      <div
                        key={winner.userId}
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          index === 0
                            ? 'bg-yellow-200 border-4 border-yellow-600'
                            : index === 1
                            ? 'bg-gray-200 border-4 border-gray-400'
                            : 'bg-orange-200 border-4 border-orange-400'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-4xl font-bold">
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                          <div>
                            <p className="text-xl font-bold text-gray-900">{winner.userName}</p>
                            <p className="text-sm text-gray-700">
                              {index === 0 ? '1st Place' : index === 1 ? '2nd Place' : '3rd Place'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{winner.totalScore}</p>
                          <p className="text-sm text-gray-700">points</p>
                        </div>
                      </div>
                    ))}
                    <Button
                      onClick={() => setShowWinners(false)}
                      className="w-full mt-4 bg-white text-yellow-700 hover:bg-yellow-50"
                    >
                      Close
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {profile.lobby ? (
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <ProfileButton />
                    {/* Exit Game Button - Show if game has ended or user wants to leave */}
                    {gameWinners?.gameEnded && (
                      <Button
                        onClick={async () => {
                          if (confirm('Are you sure you want to exit the game? You will return to the waiting area.')) {
                            try {
                              const res = await fetch('/api/user/exit-game', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId }),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error);
                              // Redirect to profile/waiting page
                              window.location.href = `/profile?userId=${userId}`;
                            } catch (err: any) {
                              alert('Failed to exit game: ' + err.message);
                            }
                          }
                        }}
                        variant="outline"
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        Exit Game
                      </Button>
                    )}
                  </div>
                  <div className="bg-white shadow-lg rounded-xl p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <h1 className="text-3xl font-bold text-gray-900">Welcome, {profile.name}!</h1>
                        <p className="text-gray-600 mt-1 flex items-center flex-wrap gap-3">
                          <span>{profile.lobby.name} • Pool #{profile.lobby.poolNumber}</span>
                          {profile.hostelName && <span>• {profile.hostelName}</span>}
                          {profile.lobby.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full text-sm">
                              <CheckCircle2 className="h-4 w-4" />
                              Lobby Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full text-sm">
                              <Clock className="h-4 w-4" />
                              Waiting for Game
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - Main Content (2/3 width) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Only show round info if lobby is ACTIVE and currentRound exists */}
                    {profile.lobby.status === 'ACTIVE' && profile.currentRound && (
                      <>
                        {/* Round Question Card */}
                        <Card className="border-2 border-primary">
                          <CardHeader>
                            <div className="flex justify-between items-center">
                              <div>
                                <CardTitle className="text-2xl">Round {profile.currentRound.roundNumber}</CardTitle>
                                <CardDescription className="text-base mt-1">Domain: {profile.currentRound.domain}</CardDescription>
                              </div>
                              {timeRemaining !== null && (
                                <div className={`text-2xl font-bold ${timeRemaining <= 10 ? 'text-red-600' : 'text-primary'}`}>
                                  {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-6">
                            {/* Question */}
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                              <h3 className="font-semibold text-lg mb-2 text-blue-900">Question:</h3>
                              <p className="text-gray-800">{profile.currentRound.question}</p>
                              {profile.currentRound.imageUrl && (
                                <div className="mt-3">
                                  <img 
                                    src={profile.currentRound.imageUrl} 
                                    alt="Question image" 
                                    loading="lazy"
                                    decoding="async"
                                    width="400"
                                    height="300"
                                    className="max-w-full max-h-64 rounded border border-blue-200"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </div>

                            {hasSubmitted ? (
                              <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                                  <div>
                                    <h3 className="font-semibold text-green-900">Submission Received!</h3>
                                    <p className="text-sm text-green-700 mt-1">
                                      Waiting for other players to submit. Results will be shown when the round ends.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Action Selection */}
                                <div className="space-y-4">
                                  <h3 className="font-semibold text-lg">Choose Your Action:</h3>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Solve Button */}
                                    <button
                                      onClick={() => setSelectedAction('SOLVE')}
                                      className={`p-4 border-2 rounded-lg transition-all ${
                                        selectedAction === 'SOLVE'
                                          ? 'border-primary bg-primary/10 shadow-lg'
                                          : 'border-gray-300 hover:border-primary/50'
                                      }`}
                                    >
                                      <div className="text-center">
                                        <div className="text-2xl mb-2">💡</div>
                                        <div className="font-semibold">Solve</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Answer the question yourself
                                        </div>
                                      </div>
                                    </button>

                                    {/* Delegate Button */}
                                    <button
                                      onClick={() => setSelectedAction('DELEGATE')}
                                      className={`p-4 border-2 rounded-lg transition-all ${
                                        selectedAction === 'DELEGATE'
                                          ? 'border-primary bg-primary/10 shadow-lg'
                                          : 'border-gray-300 hover:border-primary/50'
                                      }`}
                                    >
                                      <div className="text-center">
                                        <div className="text-2xl mb-2">🤝</div>
                                        <div className="font-semibold">Delegate</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Trust another player
                                        </div>
                                      </div>
                                    </button>

                                    {/* Pass Button */}
                                    <button
                                      onClick={() => setSelectedAction('PASS')}
                                      className={`p-4 border-2 rounded-lg transition-all ${
                                        selectedAction === 'PASS'
                                          ? 'border-primary bg-primary/10 shadow-lg'
                                          : 'border-gray-300 hover:border-primary/50'
                                      }`}
                                    >
                                      <div className="text-center">
                                        <div className="text-2xl mb-2">⏭️</div>
                                        <div className="font-semibold">Pass</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                          Skip this question
                                        </div>
                                      </div>
                                    </button>
                                  </div>

                                  {/* Action-specific inputs */}
                                  {selectedAction === 'SOLVE' && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                      <label className="block font-semibold mb-2">Your Answer:</label>
                                      <input
                                        type="text"
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        placeholder="Enter your answer here"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                      />
                                    </div>
                                  )}

                                  {selectedAction === 'DELEGATE' && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                      <label className="block font-semibold mb-2">Delegate to:</label>
                                      <select
                                        value={delegateTo}
                                        onChange={(e) => setDelegateTo(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                      >
                                        <option value="">Select a player...</option>
                                        {profile.lobby.users
                                          .filter((u: any) => u.id !== profile.id)
                                          .map((u: any) => (
                                            <option key={u.id} value={u.id}>
                                              {u.name}
                                            </option>
                                          ))}
                                      </select>
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Click on a player name above to view their profile and expertise
                                      </p>
                                    </div>
                                  )}

                                  {selectedAction === 'PASS' && (
                                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                      <p className="text-sm text-yellow-800">
                                        ⚠️ Passing will score 0 points for this round. You won't gain or lose points.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Submit Button */}
                                {selectedAction && (
                                  <div className="space-y-2">
                                    {submitError && (
                                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                                        {submitError}
                                      </div>
                                    )}
                                    <Button
                                      onClick={handleSubmit}
                                      disabled={submitting || timeRemaining === 0}
                                      className="w-full py-6 text-lg"
                                      size="lg"
                                    >
                                      {submitting ? 'Submitting...' : 'Submit Your Action'}
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      </>
                    )}
                    
                    {/* Previous Rounds */}
                    {previousRounds.length > 0 && (
                      <Card className="mt-6 border-2 border-gray-300">
                        <CardHeader>
                          <CardTitle>Previous Rounds</CardTitle>
                          <CardDescription>View results and delegation graphs from completed rounds</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {previousRounds.map((round: any) => (
                              <div
                                key={round.id}
                                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={async () => {
                                  // Fetch round details with scores
                                  const res = await fetch(`/api/rounds/${round.id}/results?userId=${userId}`);
                                  const data = await res.json();
                                  setViewingRound(data);
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium">Round {round.roundNumber} - {round.domain}</p>
                                    <p className="text-xs text-muted-foreground">{round.question}</p>
                                  </div>
                                  <Button size="sm" variant="outline">
                                    View Results
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  
                  {/* Right Column - Leaderboard Sidebar (1/3 width) */}
                  <div className="lg:col-span-1">
                    <Card className="sticky top-6 border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-50 shadow-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-yellow-600" />
                          Leaderboard
                        </CardTitle>
                        <CardDescription>Top players in your lobby</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {leaderboardLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        ) : leaderboard.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No scores yet</p>
                            <p className="text-xs mt-1">Complete rounds to see rankings</p>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {leaderboard.map((player: any, index: number) => (
                              <div
                                key={player.userId}
                                className={`p-3 rounded-lg border transition-all ${
                                  player.userId === profile.id
                                    ? 'bg-blue-50 border-blue-300 shadow-md'
                                    : 'bg-white border-gray-200 hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  {/* Rank Medal */}
                                  <div className="w-8 text-center flex-shrink-0">
                                    {player.rank === 1 ? (
                                      <span className="text-2xl">🥇</span>
                                    ) : player.rank === 2 ? (
                                      <span className="text-2xl">🥈</span>
                                    ) : player.rank === 3 ? (
                                      <span className="text-2xl">🥉</span>
                                    ) : (
                                      <span className="text-sm font-semibold text-gray-600">#{player.rank}</span>
                                    )}
                                  </div>
                                  
                                  {/* Player Info */}
                                  <div className="flex-1 min-w-0">
                                    {player.userId === profile.id ? (
                                      <span className="text-primary font-bold block truncate">{player.name} (You)</span>
                                    ) : (
                                      <button
                                        className="text-blue-700 hover:text-blue-900 underline hover:no-underline focus:outline-none font-medium block truncate text-left w-full"
                                        onClick={() => setViewProfileId(player.userId)}
                                        type="button"
                                      >
                                        {player.name}
                                      </button>
                                    )}
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {player.roundsPlayed} {player.roundsPlayed === 1 ? 'round' : 'rounds'}
                                    </div>
                                  </div>
                                  
                                  {/* Score */}
                                  <div className="text-right flex-shrink-0">
                                    <div className={`text-base font-bold ${
                                      player.cumulativeScore > 0 ? 'text-green-600' :
                                      player.cumulativeScore < 0 ? 'text-red-600' :
                                      'text-gray-600'
                                    }`}>
                                      {player.cumulativeScore > 0 ? '+' : ''}{player.cumulativeScore.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {leaderboard.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-yellow-300/50 text-xs text-yellow-800">
                            <div className="flex items-center gap-2">
                              <span>💡</span>
                              <span>Click player names to view profiles</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                <ProfileButton />
                {/* Welcome Card */}
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-3xl">Welcome, {profile.name}!</CardTitle>
                    <CardDescription>Trust Gambit Player Dashboard</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Profile Complete</span>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-blue-900">Waiting for Game to Start</h3>
                          <p className="text-sm text-blue-700 mt-1">
                            The game administrator will assign you to a lobby when the game begins.
                            You will be notified when it's time to join your lobby.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-5 w-5" />
                      <span className="text-sm">Multiple players will compete across lobbies in multiple stages</span>
                    </div>
                  </CardContent>
                </Card>
                {/* Profile Summary */}
                <Card className="shadow-xl">
                  <CardHeader>
                    <CardTitle>Your Domain Expertise</CardTitle>
                    <CardDescription>This profile will be visible to other players in your lobby</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {profile.domainRatings
                        .sort((a: { rating: number }, b: { rating: number }) => b.rating - a.rating)
                        .map((dr: { domain: string; rating: number; reason: string | null }) => (
                          <div key={dr.domain} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{dr.domain}</span>
                              <span className="text-sm text-muted-foreground">{dr.rating}/10</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2 transition-all"
                                style={{ width: `${(dr.rating / 10) * 100}%` }}
                              />
                            </div>
                            {dr.reason && (
                              <p className="text-sm text-muted-foreground italic">"{dr.reason}"</p>
                            )}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
                {/* Info Card */}
                <Card className="shadow-xl border-l-4 border-l-primary">
                  <CardHeader>
                    <CardTitle className="text-lg">What's Next?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
                        1
                      </div>
                      <div>
                        <h4 className="font-medium">Wait for Game Start</h4>
                        <p className="text-sm text-muted-foreground">The admin will start the game and assign lobbies</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
                        2
                      </div>
                      <div>
                        <h4 className="font-medium">Join Your Lobby</h4>
                        <p className="text-sm text-muted-foreground">You'll be assigned to a pool with 14 other players</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm">
                        3
                      </div>
                      <div>
                        <h4 className="font-medium">Play Trust Gambit</h4>
                        <p className="text-sm text-muted-foreground">Compete through multiple rounds, delegate wisely, and advance to the next stage!</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <SimpleModal open={!!viewProfileId} onOpenChange={open => setViewProfileId(open ? viewProfileId : null)}>
            <div className="space-y-2">
              <h2 className="text-xl font-bold mb-2">Player Profile</h2>
              {viewProfileLoading && <div>Loading...</div>}
              {viewProfileError && <div className="text-red-600">{viewProfileError}</div>}
              {viewProfile && (
                <div className="space-y-4">
                  <div>
                    <span className="font-semibold">Name:</span> {viewProfile.name}
                  </div>
                  <div>
                    <span className="font-semibold">Email:</span> {viewProfile.email}
                  </div>
                  {viewProfile.hostelName && (
                    <div>
                      <span className="font-semibold">Hostel:</span> {viewProfile.hostelName}
                    </div>
                  )}
                  <div>
                    <span className="font-semibold">Domain Expertise:</span>
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      {viewProfile.domainRatings?.map((dr: any) => (
                        <li key={dr.domain}>
                          <span className="font-medium">{dr.domain}</span>: {dr.rating}/10
                          {dr.reason && <span className="text-muted-foreground italic"> — "{dr.reason}"</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </SimpleModal>
          
          {/* Round Results Modal */}
          <SimpleModal open={!!viewingRound} onOpenChange={open => setViewingRound(open ? viewingRound : null)}>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Round {viewingRound?.round?.roundNumber} Results</h2>
              
              {viewingRound && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Question</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-medium mb-2">{viewingRound.round.question}</p>
                      <p className="text-sm text-green-600">
                        <strong>Correct Answer:</strong> {viewingRound.round.correctAnswer}
                      </p>
                    </CardContent>
                  </Card>

                  {viewingRound.userScore && (
                    <Card className="border-primary">
                      <CardHeader>
                        <CardTitle>Your Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-primary">
                          {viewingRound.userScore.score.toFixed(2)} points
                        </div>
                        {viewingRound.userScore.inCycle && (
                          <p className="text-sm text-red-600 mt-2">⚠️ You were part of a delegation cycle</p>
                        )}
                        {viewingRound.userScore.distanceFromSolver !== null && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Distance from solver: {viewingRound.userScore.distanceFromSolver}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Delegation Graph</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Store userId in localStorage for the new tab
                            localStorage.setItem('viewGraphUserId', userId || '')
                            // Open graph in new tab
                            window.open(`/graph-view?roundId=${viewingRound.round.id}`, '_blank')
                          }}
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                        >
                          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View Interactive Graph
                        </Button>
                      </CardTitle>
                      <CardDescription>
                        {viewingRound.graph.nodes.length} players, {viewingRound.graph.edges.length} delegations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* List View - Default */}
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {viewingRound.graph.nodes.map((node: any) => (
                          <div
                            key={node.id}
                            className={`p-3 border rounded-lg transition-all ${
                              node.isCurrentUser ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 hover:shadow-md'
                            } ${node.inCycle ? 'bg-red-50 border-red-300' : ''}`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <p className="font-medium">
                                  {node.name} {node.isCurrentUser && '(You)'}
                                  {node.inCycle && <span className="ml-2 text-xs text-red-600">⚠️ In cycle</span>}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  <strong>Action:</strong> {node.action}
                                  {node.action === 'SOLVE' && node.answer && (
                                    <>
                                      <br />
                                      <strong>Answer:</strong> {node.answer}
                                    </>
                                  )}
                                  {node.action === 'DELEGATE' && node.delegateTo && (
                                    <>
                                      <br />
                                      <strong>Delegated to:</strong> {viewingRound.graph.nodes.find((n: any) => n.id === node.delegateTo)?.name || 'Unknown Player'}
                                    </>
                                  )}
                                  {node.isCorrect !== null && (
                                    <span className={node.isCorrect ? 'text-green-600' : 'text-red-600'}>
                                      {' '}({node.isCorrect ? '✓ Correct' : '✗ Incorrect'})
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className={`text-lg font-bold ${node.score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {node.score >= 0 ? '+' : ''}{node.score.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Help Text */}
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 flex items-center gap-2">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          Click <strong>"View Interactive Graph"</strong> button above to see the full network visualization in a new tab
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </SimpleModal>
        </>
      );
    }

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
