#!/bin/bash

# ============================================
# Fast Remote User Seeding with Profile Completion
# Seeds users with completed profiles in parallel
# ============================================

if [ -z "$1" ]; then
  echo "Usage: ./seed-users-fast.sh <server-url> [number-of-users] [parallel-jobs]"
  echo "Example: ./seed-users-fast.sh http://142.93.213.0:3000 3000 20"
  exit 1
fi

SERVER_URL="$1"
NUM_USERS="${2:-3000}"
PARALLEL_JOBS="${3:-20}"  # Number of parallel requests

echo "🚀 Fast seeding $NUM_USERS users to $SERVER_URL"
echo "⚡ Using $PARALLEL_JOBS parallel connections"
echo ""

# Create temp directory for tracking
TEMP_DIR=$(mktemp -d)
SUCCESS_FILE="$TEMP_DIR/success.txt"
FAILED_FILE="$TEMP_DIR/failed.txt"
touch "$SUCCESS_FILE" "$FAILED_FILE"

# Function to create a user with completed profile
create_user() {
  local i=$1
  local EMAIL="user${i}@test.com"
  local NAME="User ${i}"
  local PASSWORD="password123"
  local HOSTEL="Hostel $((i % 10 + 1))"
  
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
    echo "✗ $i - Failed registration: $EMAIL"
    return 1
  fi
  
  USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"userId":"[^"]*"' | cut -d'"' -f4)
  
  # Step 2: Login to get session
  LOGIN_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$EMAIL\",
      \"password\": \"$PASSWORD\"
    }")
  
  # Step 3: Complete profile with domain ratings
  DOMAINS=("Algorithms" "Astronomy" "Biology" "Crypto" "Economics" "Finance" "Game Theory" "Indian History" "Machine Learning" "Probability" "Statistics")
  DOMAIN_RATINGS="["
  for j in "${!DOMAINS[@]}"; do
    RATING=$((1 + RANDOM % 10))
    REASON="Auto-generated rating"
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
  
  if echo "$PROFILE_RESPONSE" | grep -q "success\|updated\|complete"; then
    echo "$EMAIL" >> "$SUCCESS_FILE"
    echo "✓ $i - Created with profile: $EMAIL"
    return 0
  else
    echo "$EMAIL" >> "$FAILED_FILE"
    echo "⚠ $i - Registered but profile incomplete: $EMAIL"
    return 1
  fi
}

export -f create_user
export SERVER_URL
export SUCCESS_FILE
export FAILED_FILE

# Create array of user numbers
USER_NUMBERS=$(seq 1 $NUM_USERS)

# Run in parallel using xargs
echo "$USER_NUMBERS" | tr ' ' '\n' | xargs -P $PARALLEL_JOBS -I {} bash -c 'create_user {}'

# Calculate results
SUCCESS_COUNT=$(wc -l < "$SUCCESS_FILE" | tr -d ' ')
FAILED_COUNT=$(wc -l < "$FAILED_FILE" | tr -d ' ')

echo ""
echo "============================================"
echo "📊 Seeding Complete!"
echo "============================================"
echo "Total attempted: $NUM_USERS"
echo "Successful: $SUCCESS_COUNT"
echo "Failed: $FAILED_COUNT"
echo ""
echo "✅ Users created with completed profiles:"
echo "  Email: user1@test.com to user${NUM_USERS}@test.com"
echo "  Password: password123"
echo "  Domain ratings: Randomly assigned 1-10"
echo ""
echo "🎮 Ready to assign to lobbies and start game!"
echo "============================================"

# Cleanup
rm -rf "$TEMP_DIR"
