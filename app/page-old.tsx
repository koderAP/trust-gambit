import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Target, TrendingUp, Network, Brain, Award, AlertCircle, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Network className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">Trust Gambit</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/admin/login">
              <Button variant="outline">Admin</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-block mb-6 px-4 py-2 bg-primary/10 rounded-full">
            <p className="text-sm font-semibold text-primary">🎮 Game Theory Competition</p>
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Master <span className="text-primary">Trust</span> Through Strategy
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A game theory experiment where your decisions shape trust networks and determine success. 
            Solve, delegate, or pass—each choice creates ripples through the network.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow">
                Login to Play
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 hover:bg-primary/5">
                Register Now
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Multiplayer</CardTitle>
              <CardDescription className="text-base">
                Compete with 120+ players in strategic gameplay
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">11 Domains</CardTitle>
              <CardDescription className="text-base">
                Test skills across algorithms, ML, economics, and more
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Network className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Trust Networks</CardTitle>
              <CardDescription className="text-base">
                Build reputation through delegation and expertise
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Strategic Scoring</CardTitle>
              <CardDescription className="text-base">
                Earn points through solving, delegating, and trust
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Game Rules Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How to Play</h2>
            <p className="text-xl text-gray-600">Three actions, infinite strategic possibilities</p>
          </div>

          {/* Three Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-2 border-blue-200 bg-blue-50/50 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Solve</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">Answer the question yourself.</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700">Correct: +1 point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700">Wrong: -1 point</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4 italic">High risk, high reward</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-50/50 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
                    <Network className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Delegate</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">Trust another player to solve it.</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-700">They're right: 1 + λ×(2k/(k+1))</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700">They're wrong: -1 point</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4 italic">Build trust networks</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-green-50/50 hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <MinusCircle className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Pass</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">Skip the question entirely.</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MinusCircle className="h-5 w-5 text-gray-600" />
                    <span className="font-semibold text-gray-700">Safe: 0 points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-700">Others trust you: -1 for them</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-4 italic">Play it safe</p>
              </CardContent>
            </Card>
          </div>

          {/* Scoring Examples */}
          <Card className="border-2 border-primary mb-12">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
              <CardTitle className="text-3xl flex items-center gap-2">
                <Award className="h-8 w-8 text-primary" />
                Scoring Examples
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Understanding how points are calculated (with λ=0.6, γ=0.4, β=0.2)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Example 1 */}
                <div className="p-5 bg-green-50 border-2 border-green-200 rounded-lg">
                  <h4 className="font-bold text-lg mb-3 text-green-900 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Correct Delegation Chain
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="font-mono bg-white px-3 py-1 rounded border">Alice → Bob → Carol</div>
                      <span className="text-sm">Carol solves correctly</span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 mt-3">
                      <div className="bg-white p-3 rounded border-l-4 border-green-500">
                        <div className="font-semibold text-green-700">Carol (solver)</div>
                        <div className="text-2xl font-bold text-green-600">+1.4</div>
                        <div className="text-xs text-gray-600">+1 correct + 0.4 trust bonus (2 delegators)</div>
                      </div>
                      <div className="bg-white p-3 rounded border-l-4 border-green-500">
                        <div className="font-semibold text-green-700">Bob (distance 1)</div>
                        <div className="text-2xl font-bold text-green-600">+1.6</div>
                        <div className="text-xs text-gray-600">1 + 0.6×(2×1/2) = 1.6</div>
                      </div>
                      <div className="bg-white p-3 rounded border-l-4 border-green-500">
                        <div className="font-semibold text-green-700">Alice (distance 2)</div>
                        <div className="text-2xl font-bold text-green-600">+1.8</div>
                        <div className="text-xs text-gray-600">1 + 0.6×(2×2/3) = 1.8</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 italic">
                      💡 Everyone benefits when trusting the right person!
                    </p>
                  </div>
                </div>

                {/* Example 2 */}
                <div className="p-5 bg-red-50 border-2 border-red-200 rounded-lg">
                  <h4 className="font-bold text-lg mb-3 text-red-900 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Incorrect Delegation Chain
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="font-mono bg-white px-3 py-1 rounded border">Dave → Eve → Frank</div>
                      <span className="text-sm">Frank solves incorrectly</span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 mt-3">
                      <div className="bg-white p-3 rounded border-l-4 border-red-500">
                        <div className="font-semibold text-red-700">Frank (solver)</div>
                        <div className="text-2xl font-bold text-red-600">-1</div>
                        <div className="text-xs text-gray-600">Wrong answer</div>
                      </div>
                      <div className="bg-white p-3 rounded border-l-4 border-red-500">
                        <div className="font-semibold text-red-700">Eve (distance 1)</div>
                        <div className="text-2xl font-bold text-red-600">-1</div>
                        <div className="text-xs text-gray-600">Flat penalty (distance doesn't matter)</div>
                      </div>
                      <div className="bg-white p-3 rounded border-l-4 border-red-500">
                        <div className="font-semibold text-red-700">Dave (distance 2)</div>
                        <div className="text-2xl font-bold text-red-600">-1</div>
                        <div className="text-xs text-gray-600">Flat penalty (distance doesn't matter)</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 italic">
                      ⚠️ Trusting the wrong person costs everyone equally!
                    </p>
                  </div>
                </div>

                {/* Example 3 */}
                <div className="p-5 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <h4 className="font-bold text-lg mb-3 text-yellow-900 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Delegation Cycle (The Trap!)
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="font-mono bg-white px-3 py-1 rounded border">George → Helen → Ivan → Helen</div>
                      <span className="text-sm text-red-600">Circular delegation!</span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4 mt-3">
                      <div className="bg-white p-3 rounded border-l-4 border-orange-500">
                        <div className="font-semibold text-orange-700">Helen (in cycle)</div>
                        <div className="text-2xl font-bold text-orange-600">-1.4</div>
                        <div className="text-xs text-gray-600">-1 - γ = -1 - 0.4</div>
                      </div>
                      <div className="bg-white p-3 rounded border-l-4 border-orange-500">
                        <div className="font-semibold text-orange-700">Ivan (in cycle)</div>
                        <div className="text-2xl font-bold text-orange-600">-1.4</div>
                        <div className="text-xs text-gray-600">-1 - γ = -1 - 0.4</div>
                      </div>
                      <div className="bg-white p-3 rounded border-l-4 border-yellow-500">
                        <div className="font-semibold text-yellow-700">George (distance 1)</div>
                        <div className="text-2xl font-bold text-yellow-600">-1.2</div>
                        <div className="text-xs text-gray-600">-1 - γ/(1+1) = -1.2</div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 italic">
                      🔄 Cycles hurt everyone involved, but upstream players suffer less!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Strategies */}
          <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Brain className="h-8 w-8 text-indigo-600" />
                Winning Strategies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Know Your Strengths</h4>
                      <p className="text-gray-600 text-sm">Solve when confident in your domain knowledge. Your self-ratings guide you—use them wisely!</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Build Reputation</h4>
                      <p className="text-gray-600 text-sm">Solve correctly to attract delegators. Each direct delegator gives you a +0.2 bonus!</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Trust Wisely</h4>
                      <p className="text-gray-600 text-sm">Delegate to players with proven expertise. Being closer in the chain is better—but everyone in a correct chain wins!</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      4
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Avoid Cycles</h4>
                      <p className="text-gray-600 text-sm">Circular delegation chains penalize everyone. Watch the graph and break cycles early!</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      5
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Think Per-Round</h4>
                      <p className="text-gray-600 text-sm">Each question is independent. Past scores don't affect current round strategies—stay adaptable!</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                      6
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Use Pass Strategically</h4>
                      <p className="text-gray-600 text-sm">When unsure, passing is safe (0 points). But beware—others delegating to your pass get -1!</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Competition Structure */}
        <Card className="max-w-4xl mx-auto shadow-xl border-2 mb-16">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="text-3xl">Competition Structure</CardTitle>
            <CardDescription className="text-base">
              Two stages, 11 domains, multiple rounds
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-6">
              <div className="p-5 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                <h3 className="font-bold text-xl mb-2 text-blue-900">Stage 1: Qualifiers</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>120 participants divided into 8 pools of 15 players each</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Questions across all 11 domains (Algorithms, Astronomy, Biology, Crypto, Economics, Finance, Game Theory, Indian History, Machine Learning, Probability, Statistics)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="font-semibold">Top 2 from each pool advance to Stage 2</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 bg-purple-50 border-l-4 border-purple-500 rounded-r-lg">
                <h3 className="font-bold text-xl mb-2 text-purple-900">Stage 2: Finals</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>16 finalists compete for top 3 positions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Focus on 4 key domains: Algorithms, Probability, Economics, Machine Learning</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span className="font-semibold">Winner takes all the glory! 🏆</span>
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-primary to-indigo-600 text-white border-0 shadow-2xl">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Play?</h2>
            <p className="text-xl mb-8 opacity-90">
              Join the competition and test your strategic thinking!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl">
                  Register Now
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 border-white text-white hover:bg-white/20">
                  Login to Continue
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p className="font-semibold">Trust Gambit - A Game Theory Research Project</p>
          <p className="text-sm mt-2">© 2025 All Rights Reserved</p>
        </div>
      </footer>
    </div>
  )
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Multiplayer</CardTitle>
              <CardDescription className="text-base">
                Compete with other players in strategic gameplay
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Multi-Stage</CardTitle>
              <CardDescription className="text-base">
                Navigate through challenging rounds across multiple stages
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Network className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Trust Network</CardTitle>
              <CardDescription className="text-base">
                Build trust by delegating to reliable players
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-2 hover:border-primary/50">
            <CardHeader>
              <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Strategic Scoring</CardTitle>
              <CardDescription className="text-base">
                Earn points through solving, delegating, and trust
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="max-w-4xl mx-auto shadow-xl border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="text-3xl">How It Works</CardTitle>
            <CardDescription className="text-base">
              Three simple actions, infinite strategic possibilities
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="space-y-8">
              <div className="flex gap-6 items-start group hover:bg-primary/5 p-4 rounded-lg transition-colors">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2 text-gray-900">💡 Solve</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Answer the question yourself. Get <span className="font-semibold text-primary">+1 point</span> if correct, 
                    but risk <span className="font-semibold text-red-600">-1 point</span> if wrong. 
                    The high-risk, high-reward option.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start group hover:bg-primary/5 p-4 rounded-lg transition-colors">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2 text-gray-900">🤝 Delegate</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Trust another player to solve it. If they solve correctly, you get <span className="font-semibold text-primary">1 + λᵏ points</span>. 
                    Build trust networks and strategic alliances over time.
                  </p>
                </div>
              </div>

              <div className="flex gap-6 items-start group hover:bg-primary/5 p-4 rounded-lg transition-colors">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-2 text-gray-900">⏭️ Pass</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Skip the question entirely. The safe option with <span className="font-semibold">0 points</span>, 
                    but delegating to a pass can be risky for others!
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-5 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg">
              <p className="text-sm text-yellow-900 leading-relaxed">
                <strong className="text-base">⚠️ Beware of cycles!</strong><br/>
                If delegation chains form a loop, everyone in the cycle gets <span className="font-semibold text-red-700">-1 - γ points</span> for that round.
                Strategic thinking is key!
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>Trust Gambit - A Game Theory Research Project</p>
          <p className="text-sm mt-2">© 2025 All Rights Reserved</p>
        </div>
      </footer>
    </div>
  )
}
