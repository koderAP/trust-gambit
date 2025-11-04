#!/bin/bash

# Script to download Trust Gambit game data at different stages
# Usage: ./download-game-data.sh [gameId] [stage_name]
# Example: ./download-game-data.sh cljk1234567 after-stage-1

# Get game ID from argument or prompt
if [ -z "$1" ]; then
  echo "Please provide the game ID:"
  read GAME_ID
else
  GAME_ID="$1"
fi

# Get stage name for filename
if [ -z "$2" ]; then
  STAGE_NAME="game-data"
else
  STAGE_NAME="$2"
fi

# Set the API URL (change if needed)
API_URL="http://localhost:3000/api/admin/export-game-data?gameId=$GAME_ID"

# Output filename with timestamp
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
OUTPUT_FILE="trust-gambit-${STAGE_NAME}-${TIMESTAMP}.json"

echo "📥 Downloading game data for: $GAME_ID"
echo "📁 Stage: $STAGE_NAME"
echo "🕐 Timestamp: $TIMESTAMP"
echo ""

# Download the data
curl -X GET "$API_URL" \
  -H "Content-Type: application/json" \
  -o "$OUTPUT_FILE" \
  -w "\n✅ Download complete!\n\nStatus: %{http_code}\nSize: %{size_download} bytes\nTime: %{time_total}s\n"

if [ $? -eq 0 ]; then
  echo ""
  echo "💾 Saved to: $OUTPUT_FILE"
  echo ""
  echo "📊 Quick stats:"
  
  # Pretty print some stats if jq is available
  if command -v jq &> /dev/null; then
    echo "   Total Users: $(jq '.statistics.totalUsers' "$OUTPUT_FILE")"
    echo "   Total Lobbies: $(jq '.statistics.totalLobbies' "$OUTPUT_FILE")"
    echo "   Stage 1 Lobbies: $(jq '.statistics.stage1Lobbies' "$OUTPUT_FILE")"
    echo "   Stage 2 Lobbies: $(jq '.statistics.stage2Lobbies' "$OUTPUT_FILE")"
    echo "   Total Submissions: $(jq '.statistics.totalSubmissions' "$OUTPUT_FILE")"
    echo "   Game Status: $(jq -r '.game.status' "$OUTPUT_FILE")"
    echo "   Current Stage: $(jq '.game.currentStage' "$OUTPUT_FILE")"
  else
    echo "   (Install 'jq' to see pretty stats)"
    ls -lh "$OUTPUT_FILE"
  fi
else
  echo "❌ Download failed!"
  exit 1
fi
