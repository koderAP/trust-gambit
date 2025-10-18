#!/bin/bash
# Seed Admin User for Docker Deployment
# This script creates or updates the admin user in the Docker database

echo "🌱 Seeding Admin User to Docker Database..."

# Generate bcrypt hash for 'admin123'
HASH='$2a$12$Nr.Vyu.RBFkrrTS3mp8.4eyXWWnlkWwGYf9v10z5cWus7C7cVyvhy'

# Update or insert admin user
docker-compose exec -T postgres psql -U trustgambit -d trustgambit << EOF
INSERT INTO "Admin" (id, username, password, "createdAt") 
VALUES ('admin-default', 'admin', '${HASH}', NOW()) 
ON CONFLICT (username) 
DO UPDATE SET password = '${HASH}';
EOF

if [ $? -eq 0 ]; then
    echo "✅ Admin user seeded successfully!"
    echo ""
    echo "📝 Login Credentials:"
    echo "   URL: http://localhost:3000/admin/login"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo ""
    echo "⚠️  Remember to change the password after first login in production!"
else
    echo "❌ Failed to seed admin user"
    exit 1
fi
