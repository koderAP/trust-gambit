import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Fixing game status...')

  // Find the most recent game
  const game = await prisma.game.findFirst({
    orderBy: { createdAt: 'desc' },
  })

  if (!game) {
    console.log('No game found')
    return
  }

  console.log('Current game status:', game.status)
  console.log('Current stage:', game.currentStage)
  console.log('Current round:', game.currentRound)

  // Update to STAGE_1_ACTIVE if it's LOBBIES_FORMING
  if (game.status === 'LOBBIES_FORMING') {
    await prisma.game.update({
      where: { id: game.id },
      data: {
        status: 'STAGE_1_ACTIVE',
        currentStage: 1,
        currentRound: 0,
      },
    })
    console.log('✅ Updated game status to STAGE_1_ACTIVE')
    console.log('✅ Set current stage to 1')
    console.log('✅ Set current round to 0')
    console.log('\nYou can now start Round 1 from the admin dashboard!')
  } else {
    console.log('Game status is already', game.status, '- no update needed')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
