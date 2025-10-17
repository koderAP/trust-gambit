import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStats() {
  const totalUsers = await prisma.user.count()
  const completeProfiles = await prisma.user.count({
    where: { profileComplete: true }
  })
  const usersInLobbies = await prisma.user.count({
    where: { lobbyId: { not: null } }
  })
  const totalDomainRatings = await prisma.domainRating.count()

  console.log('📊 Database Statistics:\n')
  console.log(`Total Users: ${totalUsers}`)
  console.log(`Complete Profiles: ${completeProfiles}`)
  console.log(`Users in Lobbies: ${usersInLobbies}`)
  console.log(`Total Domain Ratings: ${totalDomainRatings}`)
  console.log(`\nAverage ratings per user: ${(totalDomainRatings / totalUsers).toFixed(1)}`)
  
  const readyToPlay = await prisma.user.count({
    where: { 
      profileComplete: true,
      lobbyId: null
    }
  })
  
  console.log(`\n✅ Ready to play (not in lobby): ${readyToPlay}`)
  console.log(`\nIf you start a game now, it will create ${Math.ceil(readyToPlay / 15)} lobbies!`)
}

checkStats()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
