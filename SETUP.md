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
UPLOAD_DIR="uploads" # Optional: Path to storage (e.g. 'uploads' or '/app/persist/uploads')
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

> [!IMPORTANT]
> **aaPanel / VPS Build Troubleshooting**
> If you encounter `Unsupported engine` warnings for Prisma or `tsc: command not found` errors during deployment:
> 1. **Upgrade Node.js**: Ensure you are using **Node.js v20.x or v22.x**. In aaPanel, use the **Node.js Version Manager** to install and select the correct version for your project.
> 2. **Clean Install**: If you previously ran `npm install` with a different Node version, delete `node_modules` and run it again:
>    ```bash
>    rm -rf node_modules package-lock.json
>    npm install
>    ```
> 3. **Binary Paths**: All build scripts in `package.json` now use `npx` to ensure they can find local binaries (like `tsc` and `prisma`) even if they aren't in your global `PATH`.

---

## File Storage & Persistent Volumes

The application uses environment-aware storage paths to handle file uploads (member photos, signatures, and branding logos).

### 1. Environment-Based Paths
- **Development**: Files are stored in the `uploads/` folder in the project root.
- **Production**: Files default to `/app/persist/uploads` (Recommended).
- **Custom Override**: You can set `UPLOAD_DIR` to any **absolute path** (e.g. `/app/persist/uploads`) to override these defaults. **Warning:** If using a relative path like `uploads` in production, files will NOT be persistent across redeployments.

### 2. Configuring Persistent Volumes (Coolify / Docker)
To ensure uploaded files are not lost during redeployments or container restarts, you **must** mount a persistent volume to the following path:

**Mount Point:**
- **Destination Path**: `/app/persist/uploads`

In Coolify, navigate to **Storage → Volumes** and add a mount for this destination path. Without this, all uploaded photos and signatures will be deleted every time you deploy a new version.

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
| POST | /api/upload | members:create (Stores to Disk) |
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
| App settings | ✅ | ✅ | ❌ | ❌ |

---

## Association Branding & Signatures

> [!TIP]
> **Logo & Signatures:**
> - **Logos:** Both Primary (Square/Icon) and Secondary (Banner/Seal) logos should be uploaded at **1080x1080px** for optimal quality across the dashboard and printed reports. Supported formats: PNG, WebP (Max 1MB).
> - **Signatures:** For best results on ID cards, use signature images with a **transparent background (PNG)**. Ensure signatures are horizontal and well-lit. Max size: 500KB. **Resolution is standardized to 650x300px.**

---

## Security Checklist
- [ ] Change all default passwords after setup
- [ ] Use strong random values for JWT secrets (32+ chars)
- [ ] Enable HTTPS in production
- [ ] Set strong MySQL passwords
- [ ] Configure firewall rules (only expose ports 80/443)
- [ ] Enable automated backups for the database volume
- [ ] Review audit logs regularly
