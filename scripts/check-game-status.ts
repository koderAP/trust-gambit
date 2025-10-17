import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const game = await prisma.game.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      lobbies: {
        select: {
          id: true,
          name: true,
          status: true,
          currentUsers: true,
        }
      }
    }
  })

  if (!game) {
    console.log('No game found')
    return
  }

  console.log('\n=== GAME STATUS ===')
  console.log('ID:', game.id)
  console.log('Status:', game.status)
  console.log('Current Stage:', game.currentStage)
  console.log('Current Round:', game.currentRound)
  console.log('\n=== LOBBIES ===')
  console.log('Total Lobbies:', game.lobbies.length)
  game.lobbies.slice(0, 3).forEach(lobby => {
    console.log(`  ${lobby.name}: ${lobby.status} (${lobby.currentUsers} players)`)
  })
  if (game.lobbies.length > 3) {
    console.log(`  ... and ${game.lobbies.length - 3} more lobbies`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
