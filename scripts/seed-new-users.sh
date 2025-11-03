#!/bin/bash

# ============================================
# Fast Remote User Seeding with Profile Completion
# Uses timestamp to avoid duplicates
# ============================================

if [ -z "$1" ]; then
  echo "Usage: ./seed-new-users.sh <server-url> [number-of-users] [parallel-jobs] [start-number]"
  echo "Example: ./seed-new-users.sh http://142.93.213.0:3000 3000 50 1"
  exit 1
fi

SERVER_URL="$1"
NUM_USERS="${2:-3000}"
PARALLEL_JOBS="${3:-50}"
START_NUM="${4:-1}"

# Use timestamp to make emails unique
TIMESTAMP=$(date +%s)

echo "🚀 Fast seeding $NUM_USERS users to $SERVER_URL"
echo "⚡ Using $PARALLEL_JOBS parallel connections"
echo "📧 Email prefix: player${TIMESTAMP}-"
echo ""

# Create temp directory for tracking
TEMP_DIR=$(mktemp -d)
SUCCESS_FILE="$TEMP_DIR/success.txt"
FAILED_FILE="$TEMP_DIR/failed.txt"
touch "$SUCCESS_FILE" "$FAILED_FILE"

# Function to create a user with completed profile
create_user() {
  local i=$1
  local EMAIL="player${TIMESTAMP}-${i}@trustgambit.com"
  local NAME="Player ${i}"
  local PASSWORD="password123"
  local HOSTEL_NUM=$((i % 12 + 1))
  local HOSTEL="Hostel ${HOSTEL_NUM}"
  
  # Step 1: Register user
  REGISTER_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"$NAME\",
      \"email\": \"$EMAIL\",
      \"password\": \"$PASSWORD\",
      \"hostelName\": \"$HOSTEL\"
    }")
  
  if ! echo "$REGISTER_RESPONSE" | grep -q "userId"; then
    echo "$EMAIL" >> "$FAILED_FILE"
    return 1
  fi
  
  USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
  
  # Step 2: Complete profile with domain ratings
  # Domains from lib/constants.ts
  DOMAINS=("Algorithms" "Astronomy" "Biology" "Crypto" "Economics" "Finance" "Game Theory" "Indian History" "Machine Learning" "Probability" "Statistics")
  DOMAIN_RATINGS="["
  for j in "${!DOMAINS[@]}"; do
    RATING=$((1 + RANDOM % 10))
    REASON="Self-assessed proficiency level"
    DOMAIN_RATINGS+="{\"domain\":\"${DOMAINS[$j]}\",\"rating\":$RATING,\"reason\":\"$REASON\"}"
    if [ $j -lt $((${#DOMAINS[@]} - 1)) ]; then
      DOMAIN_RATINGS+=","
    fi
  done
  DOMAIN_RATINGS+="]"
  
  PROFILE_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/profile/complete" \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"$USER_ID\",
      \"domainRatings\": $DOMAIN_RATINGS
    }")
  
  if echo "$PROFILE_RESPONSE" | grep -q "success\|complete\|updated"; then
    echo "$EMAIL|$USER_ID" >> "$SUCCESS_FILE"
    return 0
  else
    echo "$EMAIL" >> "$FAILED_FILE"
    return 1
  fi
}

export -f create_user
export SERVER_URL
export SUCCESS_FILE
export FAILED_FILE
export TIMESTAMP

# Create array of user numbers
END_NUM=$((START_NUM + NUM_USERS - 1))
USER_NUMBERS=$(seq $START_NUM $END_NUM)

# Progress indicator in background
(
  while true; do
    if [ -f "$SUCCESS_FILE" ]; then
      SUCCESS_COUNT=$(wc -l < "$SUCCESS_FILE" 2>/dev/null | tr -d ' ')
      FAILED_COUNT=$(wc -l < "$FAILED_FILE" 2>/dev/null | tr -d ' ')
      TOTAL=$((SUCCESS_COUNT + FAILED_COUNT))
      if [ $TOTAL -gt 0 ]; then
        PERCENT=$((TOTAL * 100 / NUM_USERS))
        echo -ne "\r⏳ Progress: $TOTAL/$NUM_USERS ($PERCENT%) | ✓ $SUCCESS_COUNT | ✗ $FAILED_COUNT"
      fi
    fi
    sleep 2
  done
) &
PROGRESS_PID=$!

# Run in parallel using xargs
echo "$USER_NUMBERS" | tr ' ' '\n' | xargs -P $PARALLEL_JOBS -I {} bash -c 'create_user {} >/dev/null 2>&1'

# Kill progress indicator
kill $PROGRESS_PID 2>/dev/null
wait $PROGRESS_PID 2>/dev/null

# Calculate results
SUCCESS_COUNT=$(wc -l < "$SUCCESS_FILE" 2>/dev/null | tr -d ' ')
FAILED_COUNT=$(wc -l < "$FAILED_FILE" 2>/dev/null | tr -d ' ')

echo ""
echo ""
echo "============================================"
echo "📊 Seeding Complete!"
echo "============================================"
echo "Total attempted: $NUM_USERS"
echo "✅ Successful: $SUCCESS_COUNT"
echo "❌ Failed: $FAILED_COUNT"
echo ""
echo "📧 Email pattern: player${TIMESTAMP}-N@trustgambit.com"
echo "🔑 Password (all users): password123"
echo "📍 Hostels: Distributed across Hostel 1-12"
echo "📊 Domain ratings: Random 1-10 for all 11 domains"
echo ""
echo "✨ All users have completed profiles!"
echo "🎮 Ready to assign to lobbies and start game!"
echo "============================================"

# Show some sample credentials
echo ""
echo "Sample login credentials:"
head -5 "$SUCCESS_FILE" | while IFS='|' read EMAIL USER_ID; do
  echo "  Email: $EMAIL"
  echo "  Password: password123"
  echo ""
done

# Cleanup
rm -rf "$TEMP_DIR"
