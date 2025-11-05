#!/bin/bash

# Trust Gambit Deployment Script for Digital Ocean
# This script handles Docker Compose upgrades and deployment issues

set -e

echo "🚀 Trust Gambit Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Step 1: Check Docker Compose version
print_info "Checking Docker Compose version..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    print_warning "Using legacy docker-compose: $COMPOSE_VERSION"
    print_warning "This is causing the 'ContainerConfig' error"
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    print_info "Using Docker Compose V2: $COMPOSE_VERSION"
    COMPOSE_CMD="docker compose"
else
    print_error "Docker Compose not found!"
    exit 1
fi

# Step 2: Upgrade to Docker Compose V2 if needed
if [ "$COMPOSE_CMD" = "docker-compose" ]; then
    print_warning "Upgrading to Docker Compose V2 to fix the error..."
    
    # Install Docker Compose V2 plugin
    print_info "Installing Docker Compose V2 plugin..."
    
    # Update package list
    apt-get update -qq
    
    # Install Docker Compose V2 plugin
    apt-get install -y docker-compose-plugin
    
    # Verify installation
    if docker compose version &> /dev/null; then
        print_info "✅ Docker Compose V2 installed successfully!"
        COMPOSE_CMD="docker compose"
    else
        print_error "Failed to install Docker Compose V2"
        print_info "Falling back to manual cleanup method..."
    fi
fi

# Step 3: Stop existing containers (without removing volumes)
print_info "Stopping existing containers..."
$COMPOSE_CMD down --remove-orphans || true

# Step 4: Clean up old container metadata (this fixes the ContainerConfig error)
print_info "Cleaning up old container metadata..."
docker container prune -f

# Step 5: Pull latest images for postgres and redis
print_info "Pulling latest base images..."
docker pull postgres:15-alpine
docker pull redis:7-alpine
docker pull nginx:alpine

# Step 6: Build the application
print_info "Building application (with cache)..."
$COMPOSE_CMD build

# Step 7: Start services
print_info "Starting services..."
$COMPOSE_CMD up -d

# Step 8: Wait for services to be healthy
print_info "Waiting for services to be healthy..."
sleep 10

# Check service status
print_info "Service Status:"
$COMPOSE_CMD ps

# Step 9: Check logs for any errors
print_info "Recent logs (checking for errors)..."
$COMPOSE_CMD logs --tail=50 app | grep -i error || print_info "No errors found in app logs"

# Step 10: Display deployment information
echo ""
print_info "✅ Deployment Complete!"
echo ""
echo "Access your application at:"
echo "  🌐 http://142.93.213.0"
echo ""
echo "Useful commands:"
echo "  View logs:        $COMPOSE_CMD logs -f app"
echo "  Restart app:      $COMPOSE_CMD restart app"
echo "  Stop all:         $COMPOSE_CMD down"
echo "  View status:      $COMPOSE_CMD ps"
echo ""
print_info "To check app health: curl http://142.93.213.0/api/health"
