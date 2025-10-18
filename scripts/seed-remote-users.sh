#!/bin/bash

# ============================================
# Remote User Seeding Script
# Seeds users to a deployed Trust Gambit instance
# ============================================

if [ -z "$1" ]; then
  echo "Usage: ./seed-remote-users.sh <server-url> [number-of-users]"
  echo "Example: ./seed-remote-users.sh http://142.93.213.0:3000 3000"
  exit 1
fi

SERVER_URL="$1"
NUM_USERS="${2:-3000}"

echo "🌱 Seeding $NUM_USERS users to $SERVER_URL"
echo ""

# Counter for successful registrations
SUCCESS=0
FAILED=0

# Seed users
for i in $(seq 1 $NUM_USERS); do
  EMAIL="user${i}@test.com"
  NAME="User ${i}"
  PASSWORD="password123"
  
  # Register user
  RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$NAME\",
      \"email\": \"$EMAIL\",
      \"password\": \"$PASSWORD\",
      \"hostelName\": \"Hostel $((i % 10 + 1))\"
    }")
  
  # Check if successful
  if echo "$RESPONSE" | grep -q "userId"; then
    SUCCESS=$((SUCCESS + 1))
    echo "✓ $i/$NUM_USERS - Created: $EMAIL"
  else
    FAILED=$((FAILED + 1))
    echo "✗ $i/$NUM_USERS - Failed: $EMAIL"
    # Show error for first few failures
    if [ $FAILED -le 3 ]; then
      echo "  Error: $RESPONSE"
    fi
  fi
  
  # Progress update every 100 users
  if [ $((i % 100)) -eq 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Progress: $i/$NUM_USERS | Success: $SUCCESS | Failed: $FAILED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  fi
  
  # Small delay to avoid overwhelming the server
  sleep 0.1
done

echo ""
echo "============================================"
echo "📊 Seeding Complete!"
echo "============================================"
echo "Total attempted: $NUM_USERS"
echo "Successful: $SUCCESS"
echo "Failed: $FAILED"
echo ""
echo "Users created with:"
echo "  Email: user1@test.com to user${NUM_USERS}@test.com"
echo "  Password: password123"
echo "============================================"
