import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Target, TrendingUp, Network } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
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
            Explore <span className="text-primary">Trust</span> Through Strategy
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A game theory experiment where your decisions shape trust networks and determine success. 
            Compete with other players in strategic rounds across multiple domains.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-shadow">
                Login to Play
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 hover:bg-primary/5">
                Register
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
