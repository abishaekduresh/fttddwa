# FTTDDWA — Member Management System

> **Federation of Tamil Nadu Tent Dealers & Decorators Welfare Association**
>
> A production-ready SaaS web application for managing member data digitally — built with Next.js 15, Prisma, MySQL, and JWT-based RBAC.

---

## Features

### Core
- **Member Management** — Add, edit, delete, search, and filter members with Tamil + English name support
- **Membership ID Generation** — Auto-generated IDs in format `FTTD{YY}{NNNNN}` (e.g. `FTTD260001`)
- **Wedding Date Tracking** — Record and display anniversary dates for all members
- **WhatsApp Module** — Automated + Manual messaging with multi-vendor support, fallback logic, and real-time status tracking
- **Membership Analytics** — Dashboard stats for membership growth and WhatsApp credit consumption
- **Photo Upload** — Secure passport-size photo upload with type + size validation
- **Tamil Nadu Coverage** — All 38 districts and their taluks pre-loaded
- **Export** — Download member data as formatted Excel (`.xlsx`)

### Authentication & Security
- JWT access tokens (15 min) + refresh tokens (7 days) in HttpOnly cookies
- Role-Based Access Control (RBAC) — Super Admin, Admin, Data Entry Operator, Viewer
- Account lockout after 5 failed login attempts (15-min cooldown)
- Rate limiting on all API routes and strict limits on auth endpoints
- Input sanitization (XSS protection via `sanitize-html`)
- Security headers via Next.js config (CSP, X-Frame-Options, HSTS-ready)

### Admin Dashboard
- Real-time stats — total members, district-wise distribution, monthly growth
- Recent member activity and audit event feed
- Role-gated UI (buttons/sections hidden based on permissions)

### Audit & Compliance
- Full audit log of every create/update/delete/login action
- IP address and user agent captured per event
- Old + new values stored as JSON for full change history

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (Node.js runtime) |
| Database | MySQL 8.x via Prisma ORM |
| Auth | JWT (`jose`) + bcrypt password hashing |
| Validation | Zod schemas |
| Forms | React Hook Form + `@hookform/resolvers` |
| State | Zustand (auth store) |
| Export | ExcelJS |
| Testing | Jest + ts-jest |
| DevOps | Docker + Nginx |

---

## Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8.x running locally (or use Docker)

### 1. Clone & install
```bash
git clone <repo-url> fttddwa
cd fttddwa
npm install
```

### 2. Configure environment
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
DATABASE_URL="mysql://root:password@localhost:3306/fttddwa_db"
JWT_SECRET="your-32-char-secret-here-changeme!!"
JWT_REFRESH_SECRET="another-32-char-refresh-secret!!"
ENCRYPTION_KEY="exactly-32-chars-for-aes256-key!"
```

### 3. Setup database
```bash
# Create the database in MySQL first:
mysql -u root -p -e "CREATE DATABASE fttddwa_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
npm run db:migrate

# Seed roles, permissions, and super admin user
npm run db:seed
```

### 4. Start development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Default login:**
| Field | Value |
|-------|-------|
| Email | `admin@fttddwa.org` |
| Password | `Admin@123456` |

> **Change the default password immediately after first login.**

---

## Docker Deployment

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your production secrets

# Start all services (MySQL + App + Nginx)
docker compose up -d

# Run migrations and seed inside the container
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

Access at:
- **Web App**: [http://localhost](http://localhost)
- **phpMyAdmin**: [http://localhost:8081](http://localhost:8081)

---

## Production Deployment (Standard VPS / Panel)

If you are not using Docker (e.g., deploying on a VPS with a control panel like aPanel/BT.cn), use **PM2** to manage the multiple processes.

### 1. Initial Build
```bash
npm install
npm run build
npm run worker:build
npm run db:migrate:prod
```

### 2. Start with PM2
The project includes an `ecosystem.config.js` to manage both the Web Server and the Worker.
```bash
# Start both processes
npm run prod:start

# Check status
npm run prod:status
```

In your server panel, select `ecosystem.config.js` as the startup file under the **PM2 Project** settings.

---

## Project Structure

```
fttddwa/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login, forgot-password pages
│   │   ├── (dashboard)/         # Protected admin pages
│   │   │   ├── dashboard/       # Stats & activity
│   │   │   ├── members/         # List, create, view, edit
│   │   │   ├── whatsapp/        # Logs, Send, Templates, Vendors
│   │   │   ├── users/           # User management
│   │   │   ├── roles/           # Permission matrix viewer
│   │   │   ├── audit-logs/      # Activity log
│   │   │   └── settings/        # Profile & password
│   │   └── api/                 # REST API routes
│   │       ├── auth/            # login, logout, refresh, me
│   │       ├── members/         # CRUD + export + stats
│   │       ├── dashboard/       # Stats & activity aggregation
│   │       ├── whatsapp/        # Logs, Stats, Send, DLR, Cron
│   │       ├── users/           # CRUD
│   │       ├── roles/           # List
│   │       ├── audit-logs/      # List
│   │       ├── health/          # Health check
│   │       └── phpmyadmin/      # (Managed via Docker)
│   ├── components/
│   │   ├── layout/              # Sidebar, Topbar
│   │   └── members/             # MemberForm
│   ├── lib/
│   │   ├── services/            # Business logic (auth, member, user, whatsapp)
│   │   ├── whatsapp/            # Vendor factory, Queue, Processor
│   │   ├── security/            # Rate limiter, sanitizer
│   │   ├── validation/          # Zod schemas
│   │   ├── utils/               # JWT, password, format, pagination
│   │   └── api/                 # Response helpers, route guard
│   ├── store/                   # Zustand auth store
│   ├── hooks/                   # useAuth
│   └── middleware.ts            # JWT verification + rate limiting
├── prisma/
│   ├── schema.prisma            # DB schema (10+ models)
│   └── seed.ts                  # Roles, permissions, super admin
├── tests/                       # Jest unit tests
├── docker/                      # Nginx config, MySQL init
├── docs/
│   ├── api.md                   # API reference (Markdown)
│   └── openapi.yaml             # OpenAPI 3.0 spec
├── docker-compose.yml
├── Dockerfile
├── SETUP.md                     # Detailed setup guide
└── CHANGELOG.md
```

---

## Role Permissions

| Permission | Super Admin | Admin | Data Entry | Viewer |
|-----------|:-----------:|:-----:|:----------:|:------:|
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
| Send WhatsApp | ✅ | ✅ | ✅ | ❌ |
| Manage WhatsApp| ✅ | ✅ | ❌ | ❌ |

---

## API Overview

Interactive Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login |
| `POST` | `/api/auth/refresh` | Refresh token |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/auth/me` | Current user |
| `GET` | `/api/members` | List members |
| `POST` | `/api/members` | Create member |
| `GET` | `/api/members/:id` | Get member |
| `PATCH` | `/api/members/:id` | Update member |
| `DELETE` | `/api/members/:id` | Delete member |
| `GET` | `/api/members/export` | Export to Excel |
| `GET` | `/api/members/stats` | Member stats |
| `GET` | `/api/users` | List users |
| `POST` | `/api/users` | Create user |
| `PATCH` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |
| `GET` | `/api/roles` | List roles |
| `GET` | `/api/audit-logs` | List audit logs |
| `GET` | `/api/dashboard/stats` | Dashboard stats |
| `POST` | `/api/upload` | Upload photo |
| `GET` | `/api/whatsapp/logs` | List message logs |
| `GET` | `/api/whatsapp/stats/usage` | Credit usage stats |
| `POST` | `/api/whatsapp/send` | Manual message send |
| `GET` | `/api/whatsapp/templates` | List templates |
| `GET` | `/api/health` | Health check |

---

## NPM Scripts

```bash
npm run dev               # Start development server
npm run build             # Type-check + Prisma generate + build
npm run start             # Start production server (Next.js only)
npm run worker:start      # Start production worker (Worker only)
npm run prod:start        # Start BOTH Web + Worker via PM2
npm run prod:status       # Check PM2 process status
npm run db:migrate:prod   # Run Prisma migrations (production)
npm run db:seed           # Seed database
npm test                  # Run Jest tests
```

---

## Database Schema

```
users          ←→ roles (many-to-one)
roles          ←→ permissions (many-to-many via role_permissions)
users          →  sessions (one-to-many)
users          →  members (created_by, one-to-many)
users          →  audit_logs (one-to-many)
members        — standalone entity with full member profile
```

---

## Security Checklist

Before going to production:

- [ ] Replace all secrets in `.env` with strong random values (`openssl rand -base64 32`)
- [ ] Change the default admin password
- [ ] Enable HTTPS (configure SSL in `docker/nginx/ssl/`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure a firewall — only expose ports 80 and 443
- [ ] Enable automated MySQL backups
- [ ] Review and rotate JWT secrets periodically
- [ ] Set up log monitoring

---

## Future Roadmap

- [ ] ID card generation with QR code (membership card PDF)
- [ ] SMS/Email notification system (OTP, renewal alerts)
- [ ] Payment integration (annual membership fee)
- [ ] Multi-tenant support (district-wise admin login)
- [ ] React Native mobile app
- [ ] Bulk import via CSV/Excel
- [ ] Password reset via email (SMTP)

---

## License

Proprietary — All rights reserved.
© 2026 Federation of Tamil Nadu Tent Dealers & Decorators Welfare Association
