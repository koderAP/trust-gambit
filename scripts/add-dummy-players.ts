import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DOMAINS = [
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
]

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa',
  'Edward', 'Deborah', 'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen', 'Stephen', 'Anna',
  'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
  'Alexander', 'Rachel', 'Patrick', 'Catherine', 'Frank', 'Carolyn', 'Jack', 'Janet',
  'Dennis', 'Ruth', 'Jerry', 'Maria', 'Tyler', 'Heather', 'Aaron', 'Diane'
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell'
]

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@trustgambit.test`
}

function generateReason(domain: string, rating: number): string {
  const reasons = {
    high: [
      `I have extensive experience in ${domain} from my studies and professional work.`,
      `${domain} is one of my strongest areas, I've worked on multiple projects in this field.`,
      `I have a deep understanding of ${domain} concepts and practical applications.`,
      `I've spent years mastering ${domain} through courses, books, and hands-on projects.`,
      `${domain} is my specialty - I feel very confident in this area.`
    ],
    medium: [
      `I have a decent understanding of ${domain} from coursework and some practice.`,
      `I'm familiar with ${domain} concepts but still have room to grow.`,
      `I've studied ${domain} and have a working knowledge of the fundamentals.`,
      `I have moderate experience with ${domain} and can handle most common problems.`,
      `${domain} is an area I'm comfortable with, though not an expert yet.`
    ],
    low: [
      `I'm still learning ${domain} and have basic knowledge.`,
      `${domain} is not my strong suit, but I understand the basics.`,
      `I have limited experience with ${domain} - need more practice.`,
      `${domain} is relatively new to me, still building foundation.`,
      `I know some fundamentals of ${domain} but need to study more.`
    ]
  }

  if (rating >= 7) return getRandomElement(reasons.high)
  if (rating >= 4) return getRandomElement(reasons.medium)
  return getRandomElement(reasons.low)
}

async function main() {
  console.log('🎮 Adding 100 dummy players to Trust Gambit...\n')

  const password = await bcrypt.hash('password123', 12)
  let created = 0
  let skipped = 0

  for (let i = 1; i <= 100; i++) {
    const firstName = getRandomElement(FIRST_NAMES)
    const lastName = getRandomElement(LAST_NAMES)
    const email = generateEmail(firstName, lastName, i)
    const name = `${firstName} ${lastName}`

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        console.log(`⏭️  Skipping ${i}/100: ${name} (${email}) - already exists`)
        skipped++
        continue
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password,
          profileComplete: true
        }
      })

      // Create domain ratings
      const domainRatings = DOMAINS.map(domain => {
        const rating = getRandomInt(0, 10)
        return {
          userId: user.id,
          domain,
          rating,
          reason: generateReason(domain, rating)
        }
      })

      await prisma.domainRating.createMany({
        data: domainRatings
      })

      created++
      console.log(`✅ Created ${i}/100: ${name} (${email}) - Profile complete with ${DOMAINS.length} domain ratings`)
    } catch (error) {
      console.error(`❌ Error creating user ${i}/100:`, error)
    }
  }

  console.log(`\n🎉 Done! Created ${created} new players, skipped ${skipped} existing players.`)
  console.log(`\n📊 Total users in database: ${await prisma.user.count()}`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
