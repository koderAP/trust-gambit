#!/usr/bin/env node

/**
 * Full Registration Stress Test
 * 
 * Tests complete user registration flow:
 * 1. Register user (POST /api/auth/register)
 * 2. Complete profile with domain ratings (POST /api/profile/complete)
 * 
 * Target: 20 complete registrations per second
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Test configuration
const SEQUENTIAL_MODE = false // Set to true for validation, false for stress test

// REALISTIC TARGETS for single Node.js instance:
// - Sequential: ~3 reg/sec (validation mode)
// - Sustained load: 3 reg/sec (95-100% success expected)
// - Peak burst: 5 reg/sec (90-100% success expected)
// - Beyond 10 reg/sec: Will fail without horizontal scaling!
//
// Why? Node.js is single-threaded, bcrypt blocks CPU for ~150ms
// Max theoretical: 1000ms / 150ms = 6.67 hashes/sec per instance

const REGISTRATIONS_PER_SECOND = 100 // Testing 100/sec - THE BIG ONE!
const TOTAL_DURATION_SECONDS = 2 // Shorter duration for extreme load

// In sequential mode, just do a few registrations to validate
const TOTAL_REGISTRATIONS = SEQUENTIAL_MODE 
  ? 20 // Validation: 20 sequential registrations
  : REGISTRATIONS_PER_SECOND * TOTAL_DURATION_SECONDS // Stress test: sustained load

// Note: The registration endpoint has rate limiting
// Current setting: 200 registrations per minute (for stress testing)
// Production: 10 registrations per 10 minutes per IP

// Domain list for ratings (must match lib/constants.ts)
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
  'Game Theory',
]

const HOSTELS = [
  'Aravali',
  'Kumaon',
  'Nilgiri',
  'Satpura',
  'Vindhyachal',
  'Zanskar',
  'Himadri',
  'Kailash',
  'Shivalik',
  'Udaigiri'
]

interface TestStats {
  attempted: number
  registrationSuccess: number
  registrationFailed: number
  profileSuccess: number
  profileFailed: number
  totalSuccess: number
  totalFailed: number
  responseTimes: number[]
  errors: string[]
}

interface RegistrationResponse {
  userId: string
  message: string
}

/**
 * Generate random domain ratings (1-10) in the format expected by the API
 */
function generateDomainRatings(): Array<{ domain: string; rating: number; reason: string }> {
  return DOMAINS.map(domain => ({
    domain,
    rating: Math.floor(Math.random() * 10) + 1,
    reason: `Auto-generated rating for stress test`
  }))
}

/**
 * Generate unique user data
 */
function generateUserData(index: number) {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 100000)
  
  return {
    name: `StressUser_${timestamp}_${index}_${random}`,
    email: `stress_${timestamp}_${index}_${random}@test.com`,
    password: `StressTest123!_${timestamp}`,
    hostelName: HOSTELS[Math.floor(Math.random() * HOSTELS.length)]
  }
}

/**
 * Register a single user
 */
async function registerUser(userData: ReturnType<typeof generateUserData>): Promise<RegistrationResponse> {
  const response = await fetch(
    `${BASE_URL}/api/auth/register`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      signal: AbortSignal.timeout(15000)
    }
  )
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Registration failed'}`)
  }
  
  return response.json()
}

/**
 * Complete user profile with domain ratings
 */
async function completeProfile(
  userId: string, 
  domainRatings: Array<{ domain: string; rating: number; reason: string }>
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/api/profile/complete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, domainRatings }),
      signal: AbortSignal.timeout(15000)
    }
  )
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`HTTP ${response.status}: ${errorData.error || 'Profile completion failed'}`)
  }
}

/**
 * Perform complete registration (register + complete profile)
 */
async function performCompleteRegistration(index: number, stats: TestStats): Promise<void> {
  const startTime = Date.now()
  let userId: string | null = null
  
  try {
    stats.attempted++
    
    // Step 1: Register user
    const userData = generateUserData(index)
    let registrationResponse: RegistrationResponse
    
    try {
      registrationResponse = await registerUser(userData)
      userId = registrationResponse.userId
      stats.registrationSuccess++
      
      if (!userId) {
        throw new Error('No userId returned from registration')
      }
    } catch (error) {
      stats.registrationFailed++
      const errorMsg = error instanceof Error 
        ? `Registration failed: ${error.message}`
        : `Registration failed: Unknown error`
      stats.errors.push(errorMsg)
      return // Exit if registration fails
    }
    
    // Step 2: Complete profile
    const domainRatings = generateDomainRatings()
    
    try {
      await completeProfile(userId, domainRatings)
      stats.profileSuccess++
      stats.totalSuccess++
      
      const responseTime = Date.now() - startTime
      stats.responseTimes.push(responseTime)
    } catch (error) {
      stats.profileFailed++
      stats.totalFailed++
      const errorMsg = error instanceof Error
        ? `Profile completion failed: ${error.message}`
        : `Profile completion failed: Unknown error`
      stats.errors.push(errorMsg)
    }
    
  } catch (error) {
    stats.totalFailed++
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    stats.errors.push(`Complete registration failed: ${errorMsg}`)
  }
}

/**
 * Calculate statistics
 */
function calculateStats(responseTimes: number[]) {
  if (responseTimes.length === 0) {
    return { min: 0, avg: 0, max: 0, p50: 0, p95: 0, p99: 0 }
  }
  
  const sorted = [...responseTimes].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  
  return {
    min: sorted[0],
    avg: Math.round(sum / sorted.length),
    max: sorted[sorted.length - 1],
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)]
  }
}

/**
 * Display progress bar
 */
function displayProgress(current: number, total: number, stats: TestStats) {
  const percentage = ((current / total) * 100).toFixed(1)
  const barLength = 30
  const filled = Math.round((current / total) * barLength)
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled)
  
  process.stdout.write(
    `\r   Progress: ${bar} ${current}/${total} (${percentage}%) | ` +
    `✅ ${stats.totalSuccess} | ❌ ${stats.totalFailed}`
  )
}

/**
 * Run stress test with controlled rate
 */
async function runStressTest() {
  console.log('\n🚀 FULL REGISTRATION STRESS TEST')
  console.log('============================================================')
  console.log(`Target: ${BASE_URL}`)
  console.log(`Mode: ${SEQUENTIAL_MODE ? '📋 SEQUENTIAL (Validation)' : '⚡ CONCURRENT (Stress Test)'}`)
  if (!SEQUENTIAL_MODE) {
    console.log(`Rate: ${REGISTRATIONS_PER_SECOND} complete registrations/second`)
    console.log(`Duration: ${TOTAL_DURATION_SECONDS} seconds`)
  }
  console.log(`Total registrations: ${TOTAL_REGISTRATIONS}`)
  console.log(`\nEach registration includes:`)
  console.log(`  1. User registration (POST /api/auth/register)`)
  console.log(`  2. Profile completion with ${DOMAINS.length} domain ratings (POST /api/profile/complete)`)
  console.log('============================================================\n')
  
  // Check server health
  try {
    const healthCheck = await fetch(`${BASE_URL}/api/health`, { 
      signal: AbortSignal.timeout(5000) 
    })
    
    if (!healthCheck.ok) {
      throw new Error(`Server returned ${healthCheck.status}`)
    }
    
    const data = await healthCheck.json()
    console.log('✅ Server is healthy')
    console.log(`   Status: ${data.status}`)
  } catch (error) {
    console.error('❌ Server health check failed!')
    console.error('   Make sure the server is running on', BASE_URL)
    process.exit(1)
  }
  
  console.log('\n🏃 Starting stress test...\n')
  
  const stats: TestStats = {
    attempted: 0,
    registrationSuccess: 0,
    registrationFailed: 0,
    profileSuccess: 0,
    profileFailed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    responseTimes: [],
    errors: []
  }
  
  const startTime = Date.now()
  
  if (SEQUENTIAL_MODE) {
    // Sequential mode: One at a time for validation
    console.log('📋 Running in SEQUENTIAL mode (one registration at a time)...\n')
    
    for (let i = 0; i < TOTAL_REGISTRATIONS; i++) {
      await performCompleteRegistration(i, stats)
      displayProgress(stats.attempted, TOTAL_REGISTRATIONS, stats)
      
      // Small delay between sequential registrations
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    console.log('\n') // New line after progress bar
    
  } else {
    // Concurrent mode: Scheduled at target rate
    console.log('⚡ Running in CONCURRENT mode (target rate: 20/sec)...\n')
    
    const intervalMs = 1000 / REGISTRATIONS_PER_SECOND // Time between each registration
    const promises: Promise<void>[] = []
    
    // Schedule registrations at steady rate
    for (let i = 0; i < TOTAL_REGISTRATIONS; i++) {
      const promise = new Promise<void>((resolve) => {
        setTimeout(async () => {
          await performCompleteRegistration(i, stats)
          displayProgress(stats.attempted, TOTAL_REGISTRATIONS, stats)
          resolve()
        }, i * intervalMs)
      })
      
      promises.push(promise)
    }
    
    // Wait for all registrations to complete
    await Promise.all(promises)
    console.log('\n') // New line after progress bar
  }
  
  const totalTime = Date.now() - startTime
  
  // Print final results
  console.log('\n============================================================')
  console.log(`🎯 ${SEQUENTIAL_MODE ? 'VALIDATION' : 'STRESS TEST'} RESULTS - FULL REGISTRATION FLOW`)
  console.log('============================================================\n')
  
  console.log('📊 Registration Statistics:')
  console.log(`   Mode: ${SEQUENTIAL_MODE ? 'Sequential (validation)' : 'Concurrent (stress test)'}`)
  console.log(`   Total attempted: ${stats.attempted}`)
  console.log(`   Registration success: ${stats.registrationSuccess}`)
  console.log(`   Registration failed: ${stats.registrationFailed}`)
  console.log(`   Profile completion success: ${stats.profileSuccess}`)
  console.log(`   Profile completion failed: ${stats.profileFailed}`)
  console.log(`   Complete flow success: ${stats.totalSuccess}`)
  console.log(`   Complete flow failed: ${stats.totalFailed}`)
  
  const successRate = ((stats.totalSuccess / stats.attempted) * 100).toFixed(1)
  console.log(`\n✅ Success Rate: ${successRate}%`)
  
  console.log(`\n⏱️  Timing:`)
  console.log(`   Total duration: ${(totalTime / 1000).toFixed(2)}s`)
  if (!SEQUENTIAL_MODE) {
    console.log(`   Target rate: ${REGISTRATIONS_PER_SECOND} registrations/sec`)
  }
  console.log(`   Actual rate: ${(stats.totalSuccess / (totalTime / 1000)).toFixed(2)} registrations/sec`)
  
  if (stats.responseTimes.length > 0) {
    const timeStats = calculateStats(stats.responseTimes)
    console.log(`\n📈 Response Times (complete flow):`)
    console.log(`   Min: ${timeStats.min}ms`)
    console.log(`   Avg: ${timeStats.avg}ms`)
    console.log(`   Max: ${timeStats.max}ms`)
    console.log(`   P50: ${timeStats.p50}ms`)
    console.log(`   P95: ${timeStats.p95}ms`)
    console.log(`   P99: ${timeStats.p99}ms`)
  }
  
  // Show errors summary
  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (showing first 10):`)
    const uniqueErrors = [...new Set(stats.errors)]
    uniqueErrors.slice(0, 10).forEach(error => {
      console.log(`   - ${error}`)
    })
    if (uniqueErrors.length > 10) {
      console.log(`   ... and ${uniqueErrors.length - 10} more unique errors`)
    }
  }
  
  // Performance assessment
  console.log('\n📈 Performance Assessment:')
  const actualRate = stats.totalSuccess / (totalTime / 1000)
  
  if (successRate === '100.0' && actualRate >= REGISTRATIONS_PER_SECOND * 0.9) {
    console.log('   ✅ EXCELLENT: Target rate achieved with 100% success!')
  } else if (parseFloat(successRate) >= 95 && actualRate >= REGISTRATIONS_PER_SECOND * 0.8) {
    console.log('   ✅ GOOD: Near target rate with high success rate')
  } else if (parseFloat(successRate) >= 90) {
    console.log('   ⚠️  ACCEPTABLE: Good success rate but below target throughput')
  } else if (parseFloat(successRate) >= 75) {
    console.log('   ⚠️  NEEDS IMPROVEMENT: Moderate success rate')
  } else {
    console.log('   ❌ POOR: High failure rate detected')
  }
  
  if (actualRate < REGISTRATIONS_PER_SECOND * 0.5) {
    console.log('\n💡 Recommendations:')
    console.log('   - Check database connection pool size')
    console.log('   - Verify bcrypt rounds are optimized (10 recommended)')
    console.log('   - Enable Redis caching for frequently accessed data')
    console.log('   - Monitor database query performance')
    console.log('   - Check for rate limiting (429 errors)')
    console.log('   - Consider horizontal scaling for higher throughput')
  }
  
  console.log('\n============================================================')
  
  // Exit with appropriate code
  if (parseFloat(successRate) >= 95) {
    console.log('✅ Test passed!\n')
    process.exit(0)
  } else {
    console.log('❌ Test failed - success rate below 95%\n')
    process.exit(1)
  }
}

// Run the test
runStressTest().catch(error => {
  console.error('\n❌ Stress test crashed:', error)
  process.exit(1)
})
