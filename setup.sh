#!/bin/bash

# Trust Gambit - Quick Setup Script
# This script automates the initial setup process

set -e  # Exit on error

echo "🎮 Trust Gambit - Quick Setup"
echo "================================"
echo ""

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ is required. You have: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo "⚠️  Please edit .env with your database credentials!"
    echo ""
else
    echo "✅ .env file already exists"
    echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
echo "This may take a few minutes..."
npm install
echo "✅ Dependencies installed"
echo ""

# Check if DATABASE_URL is set
if grep -q "DATABASE_URL=\"postgresql://postgres:password@localhost:5432/trustgambit" .env; then
    echo "⚠️  Warning: Using default DATABASE_URL"
    echo "   Make sure PostgreSQL is running on localhost:5432"
    echo "   Or update DATABASE_URL in .env file"
    echo ""
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run db:generate
echo "✅ Prisma Client generated"
echo ""

# Ask about database setup
echo "📊 Database Setup"
echo "Do you want to push the schema to your database now? (y/n)"
read -r response

if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
    echo "Pushing database schema..."
    npm run db:push || {
        echo "❌ Database push failed!"
        echo "   Please check:"
        echo "   1. PostgreSQL is running"
        echo "   2. DATABASE_URL in .env is correct"
        echo "   3. Database 'trustgambit' exists"
        echo ""
        echo "   You can try manually:"
        echo "   createdb trustgambit"
        echo "   npm run db:push"
        exit 1
    }
    echo "✅ Database schema pushed"
    echo ""
else
    echo "⏭️  Skipping database setup"
    echo "   Run 'npm run db:push' when ready"
    echo ""
fi

# Summary
echo "================================"
echo "✨ Setup Complete!"
echo "================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Update .env file if needed"
echo "   - Set DATABASE_URL for your PostgreSQL"
echo "   - Generate NEXTAUTH_SECRET:"
echo "     openssl rand -base64 32"
echo ""
echo "2. Start development server:"
echo "   npm run dev"
echo ""
echo "3. Open in browser:"
echo "   http://localhost:3000"
echo ""
echo "4. Optional - Open Prisma Studio:"
echo "   npm run db:studio"
echo ""
echo "📖 Documentation:"
echo "   - README.md - Full documentation"
echo "   - SETUP.md - Detailed setup guide"
echo "   - game.md - Game rules"
echo ""
echo "🐛 Troubleshooting:"
echo "   If you see TypeScript errors, they will"
echo "   resolve automatically after the first build."
echo ""
echo "🎮 Happy coding!"
echo ""
