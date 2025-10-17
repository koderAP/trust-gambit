import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const domains = [
  'Algorithms',
  'Finance',
  'Economics',
  'Statistics',
  'Probability',
  'Machine Learning',
  'Crypto',
  'Biology',
  'Indian History',
  'Game Theory'
];

const hostels = [
  'Aravali',
  'Girnar',
  'Jwalamukhi',
  'Karakoram',
  'Kailash',
  'Kumaon',
  'Nilgiri',
  'Satpura',
  'Shivalik',
  'Vindhyachal',
  'Zanskar',
  'Himadri'
];

async function main() {
  const TOTAL_PLAYERS = 3000;
  console.log(`🚀 Starting to seed ${TOTAL_PLAYERS} dummy players for stress testing...\n`);

  const hashedPassword = await bcrypt.hash('password123', 10);
  const startTime = Date.now();

  // Batch processing for better performance
  const BATCH_SIZE = 100;
  let created = 0;

  for (let batch = 0; batch < TOTAL_PLAYERS / BATCH_SIZE; batch++) {
    const batchStartTime = Date.now();
    const promises = [];

    for (let i = 0; i < BATCH_SIZE; i++) {
      const playerNum = batch * BATCH_SIZE + i + 1;
      const name = `Player ${playerNum}`;
      const email = `player${playerNum}@iitd.ac.in`;
      const hostelName = hostels[Math.floor(Math.random() * hostels.length)];

      promises.push(
        (async () => {
          try {
            // Create user
            const user = await prisma.user.create({
              data: {
                name,
                email,
                password: hashedPassword,
                hostelName,
                profileComplete: true,
                lobbyRequested: true,
              },
            });

            // Create domain ratings for this user
            const domainRatings = domains.map(domain => ({
              userId: user.id,
              domain,
              rating: Math.floor(Math.random() * 10) + 1,
              reason: `Self-assessed rating for ${domain}`,
            }));

            await prisma.domainRating.createMany({
              data: domainRatings,
            });

            return true;
          } catch (error: any) {
            if (error.code === 'P2002') {
              // Unique constraint violation - user already exists
              console.log(`⚠️  Player ${playerNum} already exists, skipping...`);
              return false;
            }
            throw error;
          }
        })()
      );
    }

    const results = await Promise.all(promises);
    created += results.filter(r => r).length;
    const batchTime = Date.now() - batchStartTime;

    console.log(
      `✅ Batch ${batch + 1}/${TOTAL_PLAYERS / BATCH_SIZE}: Created ${created}/${TOTAL_PLAYERS} players (${batchTime}ms)`
    );
  }

  const totalTime = Date.now() - startTime;
  console.log(`\n🎉 Successfully created ${created} dummy players in ${(totalTime / 1000).toFixed(2)}s!`);
  console.log(`⚡ Average: ${(totalTime / created).toFixed(2)}ms per player`);
  console.log('\n📋 Player Details:');
  console.log(`  - Email: player[1-${TOTAL_PLAYERS}]@iitd.ac.in`);
  console.log('  - Password: password123');
  console.log('  - Profile Complete: true');
  console.log('  - Lobby Requested: true');
  console.log('  - Random domain ratings (1-10)');
  console.log('  - Random hostel assignments');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
