import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CLEANING UP DUPLICATE GAMES ===\n');

  // Find the most recent game
  const latestGame = await prisma.game.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!latestGame) {
    console.log('No games found');
    return;
  }

  console.log('Latest Game:');
  console.log(`  ID: ${latestGame.id}`);
  console.log(`  Status: ${latestGame.status}`);
  console.log(`  Created: ${latestGame.createdAt.toISOString()}\n`);

  // Mark all other games as COMPLETED
  const result = await prisma.game.updateMany({
    where: {
      id: {
        not: latestGame.id,
      },
    },
    data: {
      status: 'COMPLETED',
    },
  });

  console.log(`✅ Marked ${result.count} old games as COMPLETED`);

  // Show current state
  const games = await prisma.game.groupBy({
    by: ['status'],
    _count: true,
  });

  console.log('\nCurrent Games by Status:');
  games.forEach((g) => {
    console.log(`  ${g.status}: ${g._count}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
