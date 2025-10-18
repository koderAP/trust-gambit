# Admin Auto-Seeding

## Overview

The admin user is **automatically created** when the app starts in production. You don't need to manually seed the database.

## How It Works

1. **Health Check Integration**: The `/api/health` endpoint (used by Docker health checks) automatically creates the admin user on first run
2. **Manual Initialization**: You can also call `/api/init` to manually trigger initialization
3. **Idempotent**: Safe to run multiple times - checks if admin exists before creating

## Default Credentials

```
Username: admin
Password: admin@123
```

⚠️ **IMPORTANT**: Change the password immediately after first login in production!

## Production Setup

### Environment Variables Required

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://your-production-domain.com"
NEXTAUTH_SECRET="your-secure-random-secret-here"
AUTH_TRUST_HOST="true"
```

### Generate Secure Secret

```bash
openssl rand -base64 32
```

### Changing Default Admin Password

To change the default admin password before deployment, edit `lib/initAdmin.ts`:

```typescript
// In ensureAdminExists() function
const adminPassword = await hash('YOUR_NEW_PASSWORD', 12)
```

Or, better yet, use an environment variable:

```typescript
const adminPassword = await hash(process.env.ADMIN_PASSWORD || 'admin@123', 12)
```

Then add to docker-compose.yml:

```yaml
environment:
  - ADMIN_PASSWORD=your_secure_password
```

## Verification

### Check if admin was created:

```bash
# Using docker exec
docker exec -it trustgambit-db psql -U trustgambit -d trustgambit -c "SELECT username, \"createdAt\" FROM \"Admin\";"
```

### Check initialization status:

```bash
curl https://your-domain.com/api/health
```

Response should include:
```json
{
  "status": "healthy",
  "adminInitialized": true,
  ...
}
```

## Troubleshooting

### Admin not created

1. Check Docker logs:
```bash
docker logs trustgambit-app
```

Look for:
- `✅ Admin user created automatically`
- `✅ Admin user already exists`
- `❌ Error ensuring admin exists:`

2. Manually trigger initialization:
```bash
curl https://your-domain.com/api/init
```

3. Check database connectivity:
```bash
docker exec trustgambit-app npm run prisma db pull
```

### Admin login not working

1. Verify admin exists in database
2. Check password hash matches in database
3. Clear browser cache and cookies
4. Check NextAuth configuration in `.env`

## Security Best Practices

1. **Change Default Password**: Immediately after deployment
2. **Use Strong Passwords**: At least 12 characters, mixed case, numbers, symbols
3. **Secure NEXTAUTH_SECRET**: Use a cryptographically random string
4. **HTTPS Only**: Always use HTTPS in production
5. **Regular Updates**: Keep dependencies updated
6. **Monitor Access**: Review admin login logs regularly

## Implementation Files

- `lib/initAdmin.ts` - Admin creation logic
- `app/api/health/route.ts` - Health check with auto-seeding
- `app/api/init/route.ts` - Manual initialization endpoint
- `app/admin/login/page.tsx` - Admin login UI

## Database Schema

```prisma
model Admin {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

The admin table is separate from regular users and only accessible through `/admin/login`.
