import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const domains = [
  'Algorithms',
  'Astronomy',
  'Biology',
  'Crypto',
  'Economics',
  'Finance',
  'Game Theory',
  'Indian History',
  'Machine Learning',
  'Probability',
  'Statistics'
]

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
]

async function main() {
  console.log('Starting to seed 500 dummy players...')

  const hashedPassword = await bcrypt.hash('password123', 10)

  for (let i = 1; i <= 500; i++) {
    const name = `Player ${i}`
    const email = `player${i}@iitd.ac.in`
    const hostelName = hostels[Math.floor(Math.random() * hostels.length)]

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
      })

      // Create domain ratings for this user (random ratings 1-10)
      const domainRatings = domains.map(domain => ({
        userId: user.id,
        domain,
        rating: Math.floor(Math.random() * 10) + 1, // Random rating 1-10
        reason: `Self-assessed rating for ${domain}`,
      }))

      await prisma.domainRating.createMany({
        data: domainRatings,
      })

      if (i % 50 === 0) {
        console.log(`Created ${i} players...`)
      }
    } catch (error) {
      console.error(`Error creating player ${i}:`, error)
    }
  }

  console.log('✅ Successfully created 500 dummy players!')
  console.log('All players have:')
  console.log('  - Email: player[1-500]@iitd.ac.in')
  console.log('  - Password: password123')
  console.log('  - Profile Complete: true')
  console.log('  - Lobby Requested: true')
  console.log('  - Random domain ratings (1-10)')
  console.log('  - Random hostel assignments')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
