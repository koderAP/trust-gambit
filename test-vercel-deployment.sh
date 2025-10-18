#!/bin/bash

# Vercel Deployment Test Script
# Tests all critical endpoints after deployment

if [ -z "$1" ]; then
  echo "Usage: ./test-vercel-deployment.sh <your-vercel-url>"
  echo "Example: ./test-vercel-deployment.sh https://your-app.vercel.app"
  exit 1
fi

BASE_URL="$1"
echo "🧪 Testing deployment at: $BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health")
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
  echo -e "${GREEN}✅ Health check passed${NC}"
else
  echo -e "${RED}❌ Health check failed${NC}"
  exit 1
fi
echo ""

# Test 2: Admin Initialization
echo "2️⃣  Testing admin initialization..."
INIT_RESPONSE=$(curl -s "$BASE_URL/api/init")
echo "$INIT_RESPONSE" | jq '.' 2>/dev/null || echo "$INIT_RESPONSE"

if echo "$INIT_RESPONSE" | grep -q '"status":"initialized"'; then
  echo -e "${GREEN}✅ Admin initialization passed${NC}"
else
  echo -e "${YELLOW}⚠️  Admin initialization response unexpected${NC}"
fi
echo ""

# Test 3: Registration
echo "3️⃣  Testing user registration..."
RANDOM_EMAIL="test-$(date +%s)@example.com"
REG_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test User\",
    \"email\": \"$RANDOM_EMAIL\",
    \"password\": \"test123456\"
  }")

echo "$REG_RESPONSE" | jq '.' 2>/dev/null || echo "$REG_RESPONSE"

if echo "$REG_RESPONSE" | grep -q '"userId"'; then
  echo -e "${GREEN}✅ Registration passed${NC}"
  USER_ID=$(echo "$REG_RESPONSE" | jq -r '.userId')
  echo "   User ID: $USER_ID"
  echo "   Email: $RANDOM_EMAIL"
  REGISTRATION_SUCCESS=true
else
  echo -e "${RED}❌ Registration failed${NC}"
  REGISTRATION_SUCCESS=false
fi
echo ""

# Test 4: Login (only if registration succeeded)
if [ "$REGISTRATION_SUCCESS" = true ]; then
  echo "4️⃣  Testing user login..."
  LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"$RANDOM_EMAIL\",
      \"password\": \"test123456\"
    }")

  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"

  if echo "$LOGIN_RESPONSE" | grep -q '"userId"'; then
    echo -e "${GREEN}✅ Login passed${NC}"
  else
    echo -e "${RED}❌ Login failed${NC}"
  fi
  echo ""
fi

# Test 5: Admin Login (optional - requires known admin credentials)
echo "5️⃣  Testing admin login page..."
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin/login")

if [ "$ADMIN_STATUS" = "200" ]; then
  echo -e "${GREEN}✅ Admin login page accessible${NC}"
else
  echo -e "${RED}❌ Admin login page returned: $ADMIN_STATUS${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deployment URL: $BASE_URL"
echo ""
echo "Next steps:"
echo "1. Check Vercel logs if any tests failed"
echo "2. Verify environment variables are set correctly"
echo "3. Test admin login at: $BASE_URL/admin/login"
echo "   Default credentials: admin / admin@123"
echo ""
echo "For troubleshooting, see: VERCEL-TROUBLESHOOTING.md"
