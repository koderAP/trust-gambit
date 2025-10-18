import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Auto-seed admin user on app startup
 * This runs automatically when the app starts in production
 */
export async function ensureAdminExists() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { username: 'admin' },
    })

    if (existingAdmin) {
      console.log('✅ Admin user already exists')
      return
    }

    // Create default admin user
    const adminPassword = await hash('admin@123', 12)
    
    await prisma.admin.create({
      data: {
        username: 'admin',
        password: adminPassword,
      },
    })

    console.log('✅ Admin user created automatically')
    console.log('   Username: admin')
    console.log('   Password: admin@123')
    console.log('   ⚠️  Change password after first login!')
  } catch (error) {
    console.error('❌ Error ensuring admin exists:', error)
    // Don't throw - allow app to start even if admin creation fails
  }
}

/**
 * Ensure admin exists without throwing errors
 * Safe to call on every app startup
 */
export async function initializeAdmin() {
  try {
    await ensureAdminExists()
  } catch (error) {
    console.error('Failed to initialize admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}
