#!/bin/sh
set -e

echo "🚀 Starting Trust Gambit application..."
echo ""

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
  if npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database is ready!"
    break
  fi
  retry_count=$((retry_count + 1))
  echo "   Attempt $retry_count/$max_retries - Database not ready yet..."
  sleep 2
done

if [ $retry_count -eq $max_retries ]; then
  echo "❌ Database connection timeout!"
  exit 1
fi

echo ""
echo "📦 Running database migrations..."
npx prisma db push --skip-generate --accept-data-loss

if [ $? -eq 0 ]; then
  echo "✅ Database schema is up to date!"
else
  echo "⚠️  Warning: Database migration had issues, but continuing..."
fi

echo ""
echo "🎯 Starting Next.js server..."
echo ""

# Execute the main command (node server.js)
exec "$@"
