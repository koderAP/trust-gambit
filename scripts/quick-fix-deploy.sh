#!/bin/bash

# Quick Fix for Docker Compose 'ContainerConfig' Error
# This script fixes the deployment issue without wiping all data

set -e

echo "🔧 Quick Fix for Docker Compose Error"
echo "====================================="

# Stop containers
echo "1. Stopping containers..."
docker-compose down --remove-orphans || docker compose down --remove-orphans

# Clean container metadata (this is the key fix)
echo "2. Cleaning old container metadata..."
docker container prune -f

# Clean dangling images (optional, saves space)
echo "3. Cleaning dangling images..."
docker image prune -f

# Use Docker Compose V2 if available, otherwise use V1
if docker compose version &> /dev/null 2>&1; then
    echo "4. Using Docker Compose V2..."
    COMPOSE_CMD="docker compose"
else
    echo "4. Using Docker Compose V1..."
    COMPOSE_CMD="docker-compose"
fi

# Build and start
echo "5. Building and starting services..."
$COMPOSE_CMD up --build -d

# Show status
echo "6. Checking status..."
sleep 5
$COMPOSE_CMD ps

echo ""
echo "✅ Deployment fixed and running!"
echo "Access your app at: http://142.93.213.0"
