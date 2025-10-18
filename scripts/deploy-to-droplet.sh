#!/bin/bash

# ============================================
# Digital Ocean Droplet Setup Script
# Deploys Trust Gambit with Docker Compose
# ============================================

echo "🚀 Setting up Trust Gambit on Digital Ocean Droplet"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (or use sudo)"
  exit 1
fi

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt-get install -y docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Install Git
echo "📚 Installing Git..."
apt-get install -y git

# Get Droplet IP
DROPLET_IP=$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)
echo "📍 Droplet IP: $DROPLET_IP"

# Clone repository
echo "📥 Cloning repository..."
cd /root
if [ -d "trust-gambit" ]; then
    echo "⚠️  Repository already exists, pulling latest..."
    cd trust-gambit
    git pull
else
    git clone https://github.com/koderAP/trust-gambit.git
    cd trust-gambit
fi

# Create .env file
echo "⚙️  Configuring environment..."
cat > .env << EOF
# Database Configuration
DATABASE_URL=postgresql://trustgambit:changeme123@postgres:5432/trustgambit
POSTGRES_PASSWORD=changeme123

# NextAuth Configuration
NEXTAUTH_URL=http://${DROPLET_IP}:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)
AUTH_TRUST_HOST=true

# Redis
REDIS_URL=redis://redis:6379

# Node Environment
NODE_ENV=production
EOF

echo "✅ Environment configured"

# Start services
echo "🚀 Starting Docker containers..."
docker-compose down
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo ""
echo "============================================"
echo "📊 Deployment Status"
echo "============================================"
docker-compose ps

# Test health
echo ""
echo "🏥 Testing health endpoint..."
sleep 5
curl -s http://localhost:3000/api/health | jq '.' || echo "Health check pending..."

echo ""
echo "============================================"
echo "✅ Deployment Complete!"
echo "============================================"
echo ""
echo "🌐 Your app is running at:"
echo "   http://${DROPLET_IP}:3000"
echo ""
echo "🔐 Admin login:"
echo "   http://${DROPLET_IP}:3000/admin/login"
echo "   Username: admin"
echo "   Password: admin@123"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Restart:       docker-compose restart"
echo "   Stop:          docker-compose down"
echo "   Update code:   git pull && docker-compose up -d --build"
echo ""
echo "📚 Documentation:"
echo "   See DIGITAL-OCEAN-DEPLOYMENT.md for details"
echo "============================================"
