import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== ALL GAMES IN DATABASE ===\n');

  const games = await prisma.game.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      status: true,
      currentStage: true,
      currentRound: true,
      createdAt: true,
      _count: {
        select: {
          lobbies: true,
        },
      },
    },
  });

  console.log(`Total games: ${games.length}\n`);

  games.forEach((game, idx) => {
    console.log(`${idx + 1}. ${game.name}`);
    console.log(`   ID: ${game.id}`);
    console.log(`   Status: ${game.status}`);
    console.log(`   Stage: ${game.currentStage}, Round: ${game.currentRound}`);
    console.log(`   Lobbies: ${game._count.lobbies}`);
    console.log(`   Created: ${game.createdAt.toISOString()}`);
    console.log();
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
