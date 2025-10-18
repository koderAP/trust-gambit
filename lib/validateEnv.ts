/**
 * Validate required environment variables
 * Helps catch configuration issues early
 */
export function validateEnv() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please set these in your deployment platform:\n' +
      '- Digital Ocean: .env file or docker-compose.yml\n' +
      '- Docker: .env file or docker-compose.yml\n' +
      '- Railway: Variables tab'
    
    console.error('❌', error)
    throw new Error(error)
  }

  // Warn about default values
  if (process.env.NEXTAUTH_SECRET === 'your-super-secret-key-change-this-in-production-use-openssl-rand-base64-32') {
    console.warn('⚠️  WARNING: Using default NEXTAUTH_SECRET. Generate a secure one with: openssl rand -base64 32')
  }

  // Check for common misconfigurations
  if (process.env.NEXTAUTH_URL?.endsWith('/')) {
    console.warn('⚠️  WARNING: NEXTAUTH_URL should not end with a slash')
  }

  if (process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.includes('localhost')) {
    console.warn('⚠️  WARNING: Using localhost in production NEXTAUTH_URL')
  }

  console.log('✅ Environment variables validated successfully')
}

/**
 * Get environment info for debugging
 */
export function getEnvInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    platform: process.env.RAILWAY_ENVIRONMENT ? 'railway' : 'other',
    hasDatabase: !!process.env.DATABASE_URL,
    hasNextAuth: !!process.env.NEXTAUTH_URL && !!process.env.NEXTAUTH_SECRET,
    hasTrustHost: !!process.env.AUTH_TRUST_HOST,
    nextAuthUrl: process.env.NEXTAUTH_URL?.replace(/\/+$/, ''), // Remove trailing slash
  }
}
