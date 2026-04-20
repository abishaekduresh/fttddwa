# FTTDDWA Setup Guide

## Prerequisites
- Node.js 20+
- MySQL 8.x (or Docker)
- npm / yarn

---

## Quick Start (Local Development)

### 1. Install dependencies
```bash
cd fttddwa
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database credentials and secrets:
```env
DATABASE_URL="mysql://root:password@localhost:3306/fttddwa_db"
JWT_SECRET="your-32-char-secret-here-changeme"
JWT_REFRESH_SECRET="another-32-char-refresh-secret-here"
ENCRYPTION_KEY="exactly-32-chars-for-aes256-key!"
```

### 3. Create the database
```sql
CREATE DATABASE fttddwa_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Run database migrations
```bash
npm run db:migrate
```

### 5. Seed the database (creates Super Admin + roles)
```bash
npm run db:seed
```

### 6. Start development server
```bash
npm run dev
```

Open http://localhost:3000

### 7. Start WhatsApp worker (Optional for automation)
```bash
npm run worker
```
This handles automated birthday/anniversary reminders and processes the WhatsApp message queue.

**Default login:**
- Email: `admin@fttddwa.org`
- Password: `Admin@123456`

> ⚠️ Change the password after first login!

---

## WhatsApp Automation & Worker

The system includes a dedicated background worker to process WhatsApp messages and run automated daily tasks (Birthday/Anniversary greetings).

### 1. Launching the Worker
In production, the worker should run alongside the web server. The recommended way is using **PM2**:
```bash
# Start both Web + Worker
npm run prod:start
```
Or manually:
```bash
npm run worker:start
```

### 2. Cron Configuration
The worker reads the execution time (in IST) from the **WhatsApp Settings** dashboard. By default, it runs at **09:00 AM IST** daily. 

### 3. Credit Consumption
The system deducts 1 credit per message sent. Credit tracking is automated, and refunds are issued if a vendor reports a "failed" status after an initial "sent" event.

---

## Troubleshooting (Common Issues)

> [!IMPORTANT]
> **Windows `EPERM` Error during Generate/Migrate**
> If you see `EPERM: operation not permitted, rename...` when running `npm run db:migrate` or `db:generate`, it means the Prisma Query Engine is currently locked by a running process.
> **Fix:** Stop the `npm run dev` server and the `npm run worker` before running database commands. Restart them once the command completes.

> [!IMPORTANT]
> **npm Error 404 / Registry Issue**
> If you see `npm error 404 Not Found` when installing packages (e.g. `@hookform/resolvers`), your server might be configured to use a private registry.
> **Fix:** Reset the npm registry and clear the cache:
> ```bash
> npm config set registry https://registry.npmjs.org/
> rm -rf node_modules package-lock.json
> npm install
> ```

> [!IMPORTANT]
> **Missing Database Tables / Build Failure**
> If `npm run build` fails during "Collecting page data" or you see errors that tables do not exist, it means your database is not initialized.
> **Fix:** Force create the tables directly from your schema:
> ```bash
> npx prisma db push
> npm run db:seed
> ```

---

## Docker Deployment

### 1. Configure environment
```bash
cp .env.example .env
# Edit .env with production values
```

### 2. Start all services
```bash
docker compose up -d
```

### 3. Run migrations
```bash
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

### 4. Access the application
- App: http://localhost
- DB: localhost:3306
- phpMyAdmin: http://localhost:8081

---

## Production Deployment (Standard VPS / Panel)

If you are deploying on a VPS (like Ubuntu/CentOS) or using a server panel (aPanel/BT.cn), use this flow:

### 1. Build Phase
```bash
npm install
npm run build
npm run worker:build
npm run db:migrate:prod
```

### 2. Startup Phase (PM2)
The project includes an `ecosystem.config.js` to manage both the Next.js app and the background worker.

> [!NOTE]
> **Script Environments**:
> - **Standard scripts** (`npm run dev`, `npm run db:migrate`) automatically use `.env.local` for local development.
> - **Production scripts** (`npm run start`, `npm run prod:start`, `npm run db:migrate:prod`) rely on system environment variables or a standard `.env` file.

**Via Command Line:**
```bash
# Start both processes
npm run prod:start

# Monitor status
npm run prod:status

# To see logs
pm2 logs
```

**Via Server Panel:**
Select `ecosystem.config.js` as the project's startup script in the **PM2 Project** settings.

---

## Production Deployment (VPS / Portainer)

### Environment Variables Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Min 32 chars, random string |
| `JWT_REFRESH_SECRET` | Min 32 chars, random string |
| `ENCRYPTION_KEY` | Exactly 32 chars for AES-256 |
| `NEXT_PUBLIC_APP_URL` | Your domain (https://...) |

### Generate secure secrets:
```bash
# Linux/Mac
openssl rand -base64 32
# Or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### SSL / HTTPS
1. Place SSL certificates in `docker/nginx/ssl/`
2. Uncomment the HTTPS redirect in `docker/nginx/default.conf`
3. Add SSL server block

### Nginx SSL config snippet:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of config
}
```

---

## Database Management

```bash
# View database in browser
npm run db:studio

# Reset database (dev only)
npm run db:reset

# Generate Prisma client
npm run db:generate

# Create new migration
npm run db:migrate

# Start background WhatsApp worker
npm run worker
```

### When to use `npm run db:generate`?
You must run this command to update the Prisma Client and TypeScript types in these cases:
- **After modifying `prisma/schema.prisma`**: Whenever you add, remove, or change fields/models.
- **After a fresh install**: When you first clone the repo or run `npm install`.
- **To fix type errors**: If your IDE doesn't recognize new database fields.
- **Troubleshooting**: If you get "Prisma Client is not generated" or `EPERM` errors.

> [!CAUTION]
> **Windows Users:** Always stop the `dev` server and `worker` before running `db:generate` or `db:migrate` to release the engine file lock.


---

## Testing

```bash
# Run all tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## API Endpoints

| Method | Endpoint | Permission Required |
|--------|----------|---------------------|
| POST | /api/auth/login | Public |
| POST | /api/auth/refresh | Public |
| POST | /api/auth/logout | Authenticated |
| GET | /api/auth/me | Authenticated |
| GET | /api/members | members:read |
| POST | /api/members | members:create |
| GET | /api/members/:id | members:read |
| PATCH | /api/members/:id | members:update |
| DELETE | /api/members/:id | members:delete |
| GET | /api/members/export | members:export |
| GET | /api/members/stats | Authenticated |
| GET | /api/users | users:read |
| POST | /api/users | users:create |
| PATCH | /api/users/:id | users:update |
| DELETE | /api/users/:id | SUPER_ADMIN only |
| GET | /api/roles | Authenticated |
| GET | /api/audit-logs | audit:read |
| GET | /api/dashboard/stats | dashboard:read |
| POST | /api/upload | members:create |
| GET | /api/health | Public |

---

## Role Permissions Matrix

| Feature | Super Admin | Admin | Data Entry | Viewer |
|---------|:-----------:|:-----:|:----------:|:------:|
| View members | ✅ | ✅ | ✅ | ✅ |
| Add members | ✅ | ✅ | ✅ | ❌ |
| Edit members | ✅ | ✅ | ✅ | ❌ |
| Delete members | ✅ | ✅ | ❌ | ❌ |
| Export data | ✅ | ✅ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ |
| Delete users | ✅ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ |
| View roles | ✅ | ✅ | ❌ | ❌ |
| Manage settings | ✅ | ❌ | ❌ | ❌ |

---

## Association Branding Requirements

> [!TIP]
> **Logo Dimensions:** Both Primary (Square/Icon) and Secondary (Banner/Seal) logos should be uploaded at **1080x1080px** for optimal quality across the dashboard and printed reports. Supported formats: PNG, WebP (Max 1MB).

---

## Security Checklist
- [ ] Change all default passwords after setup
- [ ] Use strong random values for JWT secrets (32+ chars)
- [ ] Enable HTTPS in production
- [ ] Set strong MySQL passwords
- [ ] Configure firewall rules (only expose ports 80/443)
- [ ] Enable automated backups for the database volume
- [ ] Review audit logs regularly
