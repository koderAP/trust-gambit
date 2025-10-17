import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing current system state...\n')

  // 1. Delete all old lobbies
  const deletedLobbies = await prisma.lobby.deleteMany({})
  console.log(`✅ Deleted ${deletedLobbies.count} lobbies`)

  // 2. Delete all rounds
  const deletedRounds = await prisma.round.deleteMany({})
  console.log(`✅ Deleted ${deletedRounds.count} rounds`)

  // 3. Delete all submissions
  const deletedSubmissions = await prisma.submission.deleteMany({})
  console.log(`✅ Deleted ${deletedSubmissions.count} submissions`)

  // 4. Delete all scores
  const deletedScores = await prisma.roundScore.deleteMany({})
  console.log(`✅ Deleted ${deletedScores.count} round scores`)

  // 5. Set all users to requesting lobby
  const updatedUsers = await prisma.user.updateMany({
    where: {
      profileComplete: true,
    },
    data: {
      lobbyId: null,
      lobbyRequested: true,
    },
  })
  console.log(`✅ Set ${updatedUsers.count} users to requesting lobby`)

  // 6. Check the game status
  const game = await prisma.game.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (game && game.status !== 'NOT_STARTED') {
    await prisma.game.update({
      where: { id: game.id },
      data: {
        status: 'NOT_STARTED',
        currentStage: 0,
        currentRound: 0,
        startedAt: null,
        endedAt: null,
      },
    })
    console.log(`✅ Reset game to NOT_STARTED`)
  } else if (game) {
    console.log(`✅ Game already in NOT_STARTED state`)
  }

  console.log('\n📊 Final State:')
  const readyUsers = await prisma.user.count({
    where: {
      profileComplete: true,
      lobbyRequested: true,
      lobbyId: null,
    },
  })
  console.log(`  ${readyUsers} users ready for lobby assignment`)
  console.log(`  Game status: NOT_STARTED`)
  console.log(`  0 lobbies`)
  console.log('\n✅ System ready! You can now click "Assign Lobbies"')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
