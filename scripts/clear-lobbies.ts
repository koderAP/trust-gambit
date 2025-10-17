import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearLobbies() {
  console.log('🧹 Clearing all lobbies and resetting game state...\n')
  
  // Step 1: Remove all users from lobbies
  const usersInLobbies = await prisma.user.count({ where: { lobbyId: { not: null } } })
  
  if (usersInLobbies > 0) {
    console.log(`📤 Removing ${usersInLobbies} users from lobbies...`)
    await prisma.user.updateMany({
      where: { lobbyId: { not: null } },
      data: { lobbyId: null }
    })
    console.log(`   ✅ All users removed from lobbies`)
  } else {
    console.log(`   ℹ️  No users in lobbies`)
  }
  
  // Step 2: Delete all lobbies
  const lobbiesCount = await prisma.lobby.count()
  
  if (lobbiesCount > 0) {
    console.log(`\n🗑️  Deleting ${lobbiesCount} lobbies...`)
    await prisma.lobby.deleteMany({})
    console.log(`   ✅ All lobbies deleted`)
  } else {
    console.log(`\n   ℹ️  No lobbies to delete`)
  }
  
  // Step 3: Delete all games
  const gamesCount = await prisma.game.count()
  
  if (gamesCount > 0) {
    console.log(`\n🗑️  Deleting ${gamesCount} games...`)
    await prisma.game.deleteMany({})
    console.log(`   ✅ All games deleted`)
  } else {
    console.log(`\n   ℹ️  No games to delete`)
  }
  
  // Step 4: Verify cleanup
  console.log(`\n✨ Verifying cleanup...`)
  
  const finalStats = {
    users: await prisma.user.count(),
    usersInLobbies: await prisma.user.count({ where: { lobbyId: { not: null } } }),
    readyUsers: await prisma.user.count({ where: { profileComplete: true, lobbyId: null } }),
    lobbies: await prisma.lobby.count(),
    games: await prisma.game.count()
  }
  
  console.log(`\n📊 Final State:`)
  console.log(`   Total Users: ${finalStats.users}`)
  console.log(`   Ready to Play: ${finalStats.readyUsers}`)
  console.log(`   Users in Lobbies: ${finalStats.usersInLobbies}`)
  console.log(`   Active Lobbies: ${finalStats.lobbies}`)
  console.log(`   Active Games: ${finalStats.games}`)
  
  console.log(`\n✅ Done! System is clean and ready.`)
  console.log(`\n🎮 You can now start a fresh game with ${finalStats.readyUsers} players!`)
  console.log(`   This will create ${Math.ceil(finalStats.readyUsers / 15)} lobbies.`)
}

clearLobbies()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
