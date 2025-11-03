/**
 * Cleanup Script: Remove Stress Test Users
 * 
 * Removes all users created during stress testing
 * 
 * Usage:
 *   npx tsx scripts/cleanup-stress-test-users.ts
 */

import { prisma } from '../lib/prisma';

async function cleanup() {
  console.log('\n🧹 Cleaning up stress test users...\n');

  try {
    // Count users before deletion
    const countBefore = await prisma.user.count({
      where: {
        email: {
          startsWith: 'stresstest',
        },
      },
    });

    console.log(`Found ${countBefore} stress test users`);

    if (countBefore === 0) {
      console.log('✅ No stress test users to delete');
      return;
    }

    // Confirm deletion
    console.log('\n⚠️  This will permanently delete all stress test users and their data.');
    console.log('Press Ctrl+C within 5 seconds to cancel...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete users (cascade will handle related data)
    const result = await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'stresstest',
        },
      },
    });

    console.log(`✅ Deleted ${result.count} stress test users`);

    // Show remaining user count
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total remaining users: ${totalUsers}\n`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanup()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
