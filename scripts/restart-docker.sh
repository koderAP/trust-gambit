#!/bin/bash
# Graceful restart script for Trust Gambit Docker containers

echo "🔄 Restarting Trust Gambit containers..."

# Stop containers gracefully
echo "📦 Stopping containers..."
docker-compose down

# Wait a moment for cleanup
echo "⏳ Waiting for cleanup..."
sleep 2

# Rebuild and start
echo "🚀 Starting containers..."
docker-compose up -d --build

# Wait for startup
echo "⏳ Waiting for containers to start (60 seconds)..."
sleep 60

# Check status
echo "✅ Checking container status..."
docker-compose ps

echo ""
echo "🎯 You can now access:"
echo "   - Application: http://localhost"
echo "   - Application (alt): http://localhost:3000"
echo ""
echo "📊 View logs with: docker-compose logs -f"
echo "🛑 Stop with: docker-compose down"
