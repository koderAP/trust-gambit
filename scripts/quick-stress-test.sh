#!/bin/bash

# Quick Start Stress Test Script
# Usage: ./scripts/quick-stress-test.sh [url] [num_users] [duration_seconds]

# Default values
URL="${1:-http://localhost:3000}"
NUM_USERS="${2:-100}"
DURATION="${3:-300}"  # 5 minutes default

echo "========================================"
echo "🚀 Quick Stress Test"
echo "========================================"
echo "📍 URL: $URL"
echo "👥 Users: $NUM_USERS"
echo "⏱️  Duration: ${DURATION}s"
echo "========================================"
echo ""

# Check if server is running
echo "🔍 Checking if server is running..."
if curl -s -o /dev/null -w "%{http_code}" "$URL" | grep -q "200\|302\|404"; then
    echo "✅ Server is reachable"
else
    echo "❌ Server is not reachable at $URL"
    echo "Please start your server first"
    exit 1
fi

echo ""
echo "🏃 Starting stress test..."
echo "Press Ctrl+C to stop early"
echo ""

# Start the stress test in background
npx tsx scripts/stress-test-100-users.ts "$URL" &
STRESS_PID=$!

# Wait for specified duration
sleep "$DURATION"

# Stop the stress test
echo ""
echo "⏹️  Stopping stress test after ${DURATION}s..."
kill $STRESS_PID 2>/dev/null

echo ""
echo "✅ Stress test completed!"
echo ""
echo "Next steps:"
echo "  - Review server logs: docker compose logs -f app"
echo "  - Check database stats: docker exec trustgambit-db psql -U postgres -d trustgambit -c 'SELECT count(*) FROM \"User\";'"
echo "  - Cleanup test users: npx tsx scripts/cleanup-stress-test-users.ts"
echo ""
