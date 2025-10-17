import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== CHECKING USER LOBBY STATUS ===\n');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      lobbyId: true,
      lobbyRequested: true,
      lobby: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
    take: 10,
  });

  console.log('First 10 users:');
  users.forEach((user, idx) => {
    console.log(`${idx + 1}. ${user.email}`);
    console.log(`   lobbyId: ${user.lobbyId}`);
    console.log(`   lobbyRequested: ${user.lobbyRequested}`);
    if (user.lobby) {
      console.log(`   In Lobby: ${user.lobby.name} (${user.lobby.status})`);
    }
    console.log();
  });

  const stats = await prisma.user.groupBy({
    by: ['lobbyRequested'],
    _count: true,
    where: {
      lobbyId: {
        not: null,
      },
    },
  });

  console.log('Users IN lobbies grouped by lobbyRequested:');
  console.log(stats);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
