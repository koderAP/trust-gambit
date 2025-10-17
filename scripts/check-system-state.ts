import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('\n=== CHECKING GAME AND USER STATE ===\n')

  // Check game
  const game = await prisma.game.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (game) {
    console.log('GAME:')
    console.log('  Status:', game.status)
    console.log('  Stage:', game.currentStage)
    console.log('  Round:', game.currentRound)
    console.log('  ID:', game.id)
  } else {
    console.log('No game found!')
  }

  // Check users
  const totalUsers = await prisma.user.count()
  const usersWithProfiles = await prisma.user.count({
    where: { profileComplete: true }
  })
  const usersRequestingLobby = await prisma.user.count({
    where: { 
      profileComplete: true,
      lobbyRequested: true 
    }
  })
  const usersInLobbies = await prisma.user.count({
    where: { 
      lobbyId: { not: null }
    }
  })
  const usersReadyForAssignment = await prisma.user.count({
    where: {
      profileComplete: true,
      lobbyRequested: true,
      lobbyId: null
    }
  })

  console.log('\nUSERS:')
  console.log('  Total:', totalUsers)
  console.log('  With Complete Profiles:', usersWithProfiles)
  console.log('  Requesting Lobby:', usersRequestingLobby)
  console.log('  In Lobbies:', usersInLobbies)
  console.log('  Ready for Assignment:', usersReadyForAssignment)

  // Check lobbies
  const totalLobbies = await prisma.lobby.count()
  console.log('\nLOBBIES:')
  console.log('  Total:', totalLobbies)

  if (usersReadyForAssignment === 0 && usersWithProfiles > 0) {
    console.log('\n⚠️  ISSUE: Users have profiles but lobbyRequested is false!')
    console.log('   Run the fix script to set lobbyRequested=true')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
