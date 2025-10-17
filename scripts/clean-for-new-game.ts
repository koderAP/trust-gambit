import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== FIXING CURRENT STATE ===\n');

  // Remove users from old lobbies
  const usersUpdated = await prisma.user.updateMany({
    data: {
      lobbyId: null,
      lobbyRequested: true,
    },
  });
  console.log(`✅ Updated ${usersUpdated.count} users (removed from lobbies, set lobbyRequested=true)`);

  // Delete old game data
  const roundScores = await prisma.roundScore.deleteMany({});
  console.log(`✅ Deleted ${roundScores.count} round scores`);

  const submissions = await prisma.submission.deleteMany({});
  console.log(`✅ Deleted ${submissions.count} submissions`);

  const rounds = await prisma.round.deleteMany({});
  console.log(`✅ Deleted ${rounds.count} rounds`);

  const lobbies = await prisma.lobby.deleteMany({});
  console.log(`✅ Deleted ${lobbies.count} lobbies`);

  console.log('\n=== CURRENT STATE ===');
  const usersReady = await prisma.user.count({
    where: {
      lobbyRequested: true,
      lobbyId: null,
    },
  });
  console.log(`Users ready for assignment: ${usersReady}`);

  const totalLobbies = await prisma.lobby.count();
  console.log(`Total lobbies: ${totalLobbies}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
