import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function diagnose() {
  console.log('🔍 Diagnosing Trust Gambit System...\n')
  
  // Check users
  const totalUsers = await prisma.user.count()
  const completeProfiles = await prisma.user.count({ where: { profileComplete: true } })
  const usersInLobbies = await prisma.user.count({ where: { lobbyId: { not: null } } })
  const readyUsers = await prisma.user.count({ 
    where: { profileComplete: true, lobbyId: null }
  })
  
  console.log('👥 USERS:')
  console.log(`   Total: ${totalUsers}`)
  console.log(`   Complete Profiles: ${completeProfiles}`)
  console.log(`   In Lobbies: ${usersInLobbies}`)
  console.log(`   Ready (not in lobby): ${readyUsers}`)
  
  // Check games
  const games = await prisma.game.findMany({
    select: {
      id: true,
      status: true,
      currentStage: true,
      currentRound: true,
      startedAt: true,
      _count: {
        select: {
          lobbies: true
        }
      }
    }
  })
  
  console.log(`\n🎮 GAMES: ${games.length}`)
  games.forEach((game, i) => {
    console.log(`   Game ${i + 1}:`)
    console.log(`     ID: ${game.id}`)
    console.log(`     Status: ${game.status}`)
    console.log(`     Stage: ${game.currentStage}, Round: ${game.currentRound}`)
    console.log(`     Lobbies: ${game._count.lobbies}`)
    console.log(`     Started: ${game.startedAt ? game.startedAt.toLocaleString() : 'Not started'}`)
  })
  
  // Check lobbies
  const lobbies = await prisma.lobby.findMany({
    include: {
      _count: {
        select: {
          users: true
        }
      }
    }
  })
  
  console.log(`\n🏢 LOBBIES: ${lobbies.length}`)
  lobbies.forEach((lobby) => {
    console.log(`   ${lobby.name} (Pool ${lobby.poolNumber}):`)
    console.log(`     Status: ${lobby.status}`)
    console.log(`     Stage: ${lobby.stage}`)
    console.log(`     Players: ${lobby._count.users}/${lobby.maxUsers}`)
    console.log(`     Game ID: ${lobby.gameId}`)
  })
  
  // Check if any users are stuck
  const usersInLobby = await prisma.user.findMany({
    where: { lobbyId: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      lobbyId: true,
      lobby: {
        select: {
          name: true,
          status: true
        }
      }
    }
  })
  
  if (usersInLobby.length > 0) {
    console.log(`\n👤 USERS IN LOBBIES: ${usersInLobby.length}`)
    usersInLobby.forEach(user => {
      console.log(`   ${user.name} (${user.email})`)
      console.log(`     Lobby: ${user.lobby?.name || 'Unknown'} (${user.lobby?.status})`)
    })
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:')
  if (usersInLobbies > 0 && readyUsers > 0) {
    console.log(`   ⚠️  You have ${usersInLobbies} users stuck in lobbies from a previous game.`)
    console.log(`   💡 To start fresh, you should clear these assignments first.`)
    console.log(`   🔧 Run: npx tsx scripts/clear-lobbies.ts`)
  }
  
  if (readyUsers >= 1) {
    console.log(`   ✅ You have ${readyUsers} users ready to play.`)
    console.log(`   🎮 Clicking "Start Game" will create ${Math.ceil(readyUsers / 15)} lobbies.`)
  }
  
  if (readyUsers === 0 && usersInLobbies > 0) {
    console.log(`   ⚠️  All users are already in lobbies.`)
    console.log(`   💡 Clear lobbies first to reassign users.`)
  }
  
  if (games.length === 0) {
    console.log(`   📝 No games found. A new game will be created when you click "Start Game".`)
  }
  
  if (games.some(g => g.status === 'LOBBIES_FORMING')) {
    console.log(`   🎯 A game is in progress (LOBBIES_FORMING status).`)
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
