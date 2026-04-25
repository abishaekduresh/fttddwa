# FTTDDWA — Member Management System

> **Federation of Tamil Nadu Tent Dealers & Decorators Welfare Association**
>
> A production-ready SaaS web application for managing member data digitally — built with Next.js 15, Prisma, MySQL, and JWT-based RBAC.
>
> **Version 2.2.2** | Deployable on Vercel + SiteGround MySQL or VPS + aaPanel

---

## Features

### Core
- **Public Home Page** — Fully animated, mobile-responsive landing page at `/`. Hero section with floating logos, animated ambient orbs, scroll-triggered stat counters, and staggered text entrance. Quick Access cards in Tamil (விரைவு அணுகல்) with gradient icon badges, shine-sweep hover effects, and IntersectionObserver-driven card entrance animations. Contact tiles slide in on scroll. All Quick Access text is in Tamil. Feature cards respect `enableMemberRegistration` and `enableIdCard` flags
- **Return-URL Preservation** — After session expiry or mid-session 401, users are redirected to `/login?next=<original-path>` and returned to the exact page after re-authentication. Middleware, dashboard layout, and `apiFetch` all cooperate to encode and restore the return path. Open-redirect protection ensures only internal paths are accepted
- **Member Management** — Add, edit, delete, search, and filter members with Tamil + English name support
- **Membership ID Generation** — Auto-generated IDs in format `FTTD{YY}{NNNNN}` (e.g. `FTTD260001`)
- **Wedding Date Tracking** — Record and display anniversary dates for all members
- **Public Self-Registration** — Members can register at `/members/register` (toggleable by admin); submitted records land as `PENDING` and require admin approval before becoming active
- **Member Approval Workflow** — Self-registered members start with `PENDING` status. Admins approve them with a one-click button in the members list, changing status to `ACTIVE`. Non-active statuses (PENDING, INACTIVE, SUSPENDED, EXPIRED) each produce a specific descriptive error on the ID card page
- **Member Status Toggle** — Admins can block/unblock members by toggling between `ACTIVE` and `INACTIVE` status directly from the members list
- **Member ID Card** — Public digital ID card system. Members verify identity at `/members/id-card` (Membership ID + phone); on success, they are redirected to a cryptographically signed, **single-use** PDF token URL that expires in 10 minutes. Card design features a modern portrait layout with automated validity calculation, digital signatures, and **full admin customization (colors, titles, visibility)**. Includes **dynamic vertical stacking** to prevent gaps when fields are missing and **multi-line wrapping** for long addresses.
- **WhatsApp Module** — Automated + Manual messaging with multi-vendor support, fallback logic, and real-time status tracking; cron triggered via admin UI or external HTTP call (no worker required)
- **Membership Analytics** — Dashboard stats for membership growth and WhatsApp credit consumption
- **Photo Upload** — Secure passport-size photo upload with type + size validation (stored in Vercel Blob)
- **Tamil Nadu Coverage** — All 38 districts and their taluks pre-loaded; "Others" option for custom districts
- **Export** — Download member data as formatted Excel (`.xlsx`)

### Authentication & Security
- JWT access tokens (15 min) + refresh tokens (7 days) in HttpOnly cookies
- `refresh_token` cookie scoped to `/api/auth` path — not sent on regular page requests
- Permissions embedded in JWT payload — `/api/auth/me` requires **zero DB queries**
- Role-Based Access Control (RBAC) — Super Admin, Admin, Data Entry Operator, Viewer
- Account lockout after 10 failed login attempts (5-min cooldown)
- Rate limiting: auth endpoints by IP (strict), authenticated APIs by user ID
- Idle-aware proactive token refresh; multi-tab debounce prevents duplicate DB hits
- `apiFetch` client utility — all dashboard API calls auto-refresh on 401, redirect to login with toast on session expiry
- Input sanitization (XSS protection via `sanitize-html`)
- Security headers via Next.js config (CSP, X-Frame-Options, HSTS-ready)
- **HMAC-signed single-use PDF tokens** — stateless HMAC-SHA256 tokens verified across processes; DB unique-constraint enforces one-view-only; expired tokens cleaned up lazily

### Admin Dashboard
- Real-time stats — total members, district-wise distribution, monthly growth
- Recent member activity and audit event feed
- Role-gated UI (buttons/sections hidden based on permissions)
- **App Settings** — Toggle public member registration on/off (SUPER_ADMIN / ADMIN only)

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
| File Storage | Vercel Blob (`@vercel/blob`) |
| Testing | Jest + ts-jest |
| DevOps | Vercel (serverless) + Docker + Nginx |

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

## Vercel + SiteGround Deployment

The recommended production setup is **Vercel** (hosting) + **SiteGround** (MySQL database).

### 1. Provision the database on SiteGround
1. In cPanel → **MySQL Databases**: create a database and user.
2. In cPanel → **Remote MySQL**: add `%` to allow Vercel connections.
3. Import `database/database.sql` via phpMyAdmin — this creates all 15 tables in one shot.
4. Run the seed script once (locally, pointing at SiteGround):
   ```bash
   DATABASE_URL="mysql://user:pass@sg-host:3306/dbname?ssl={\"rejectUnauthorized\":false}" npm run db:seed
   ```

### 2. Deploy to Vercel
1. Push code to GitHub and connect the repo in the Vercel dashboard.
2. Go to **Storage → Create → Blob store** and copy the `BLOB_READ_WRITE_TOKEN`.
3. Set environment variables in Vercel project settings:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `mysql://user:pass@sg-host:3306/dbname?ssl={"rejectUnauthorized":false}&connection_limit=5` |
| `JWT_SECRET` | 32+ random chars |
| `JWT_REFRESH_SECRET` | 32+ random chars |
| `ENCRYPTION_KEY` | exactly 32 chars |
| `BLOB_READ_WRITE_TOKEN` | from Vercel Blob |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `MEMBERSHIP_ID_PREFIX` | `FTTD` |
| `APP_ENV` | `production` |
| `TIMEZONE` | `Asia/Kolkata` |

4. Deploy — Vercel runs `npm run build` (`prisma generate && next build`) automatically.

### 3. WhatsApp cron via n8n
The WhatsApp greeting cron is triggered by calling the public endpoint:
```
POST https://your-app.vercel.app/api/whatsapp/cron/trigger
```
Add an HTTP Request node in n8n scheduled at **09:00 IST (03:30 UTC)** daily.

> **Worker note**: The background worker process (`worker.ts`) cannot run on Vercel. For WhatsApp job processing (sending queued messages), run the worker on a separate persistent server pointing at the same SiteGround database.

## Association Branding & Signatures

> [!TIP]
> **Logo & Signatures:**
> - **Logos:** Both Primary and Secondary logos should be **1080x1080px** (Max 1MB).
> - **Signatures:** Use images with a transparent background (PNG) or clean white background. For best results on ID cards, use a horizontal orientation (Max 500KB). **Resolution is automatically standardized to 650x300px.**

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

## Production Deployment (VPS / Panel with PM2)

### 1. Initial Build
```bash
npm install
npm run build
npm run worker:build
npm run db:migrate:prod
```

### 2. Start with PM2
```bash
npm run prod:start   # Start both Next.js + Worker via PM2
npm run prod:status  # Check status
```

In your server panel, select `ecosystem.config.js` as the PM2 startup file.

---

## Script Environment Reference

| Use Case | Environment File | Priority |
|----------|-----------------|----------|
| **Local Development** | `.env.local` | Highest (via `dotenv-cli`) |
| **Production (Standard / VPS)** | `.env` | Default |
| **Production (Vercel / Panel)** | System / Dashboard Env Vars | Top Priority |

---

## Project Structure

```
fttddwa/
├── src/
│   ├── app/
│   │   ├── page.tsx             # Public home page (default route)
│   │   ├── (auth)/              # Login, forgot-password pages
│   │   ├── (dashboard)/         # Protected admin pages
│   │   │   ├── dashboard/       # Stats & activity
│   │   │   ├── members/         # List, create, view, edit
│   │   │   ├── whatsapp/        # Logs, Send, Templates, Vendors
│   │   │   ├── users/           # User management
│   │   │   ├── roles/           # Permission matrix viewer
│   │   │   ├── audit-logs/      # Activity log
│   │   │   └── settings/        # Profile, password, App Settings
│   │   ├── members/
│   │   │   └── register/        # Public self-registration page
│   │   └── api/                 # REST API routes
│   │       ├── auth/            # login, logout, refresh, me
│   │       ├── members/         # CRUD + export + stats + register
│   │       ├── settings/        # app (public GET), app/update (PATCH)
│   │       ├── dashboard/       # Stats & activity aggregation
│   │       ├── whatsapp/        # Logs, Stats, Send, DLR, Cron
│   │       ├── upload/          # Photo upload → Vercel Blob
│   │       ├── files/           # Local file serving (legacy)
│   │       ├── users/           # CRUD
│   │       ├── roles/           # List
│   │       ├── audit-logs/      # List
│   │       └── health/          # Health check
│   ├── components/
│   │   ├── layout/              # Sidebar, Topbar
│   │   └── members/             # MemberForm (shared admin + public)
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
│   ├── schema.prisma            # DB schema (15 models)
│   ├── migrations/              # Prisma migration history
│   └── seed.ts                  # Roles, permissions, super admin
├── database/
│   └── database.sql             # Complete MySQL schema (import to SiteGround)
├── tests/                       # Jest unit tests
├── docker/                      # Nginx config, MySQL init
├── docs/
│   └── openapi.yaml             # OpenAPI 3.0 spec (Swagger UI at /api/docs)
├── docker-compose.yml
├── Dockerfile
├── vercel.json                  # Vercel function config
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
| **App settings** | ✅ | ✅ | ❌ | ❌ |
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
| `POST` | `/api/members/register` | Public member self-registration |
| `POST` | `/api/upload` | Upload photo (→ Vercel Blob) |
| `GET` | `/api/settings/app` | Public app settings (registration flag, id card flag, branding) |
| `PATCH` | `/api/settings/app/update` | Update app settings (Admin+) |
| `GET` | `/api/members/card/lookup` | Public — look up member UUID + issue PDF token (Membership ID + phone) |
| `GET` | `/api/members/card/:uuid` | Public — fetch member card data by UUID |
| `POST` | `/api/members/:id/approve` | Approve a PENDING member (Admin+) |
| `PATCH` | `/api/members/:id/status` | Toggle member ACTIVE / INACTIVE (Data Entry+) |
| `GET` | `/api/whatsapp/logs` | List message logs |
| `GET` | `/api/whatsapp/stats/usage` | Credit usage stats |
| `POST` | `/api/whatsapp/send` | Manual message send |
| `GET` | `/api/whatsapp/templates` | List templates |
| `POST` | `/api/whatsapp/cron/trigger` | Trigger WhatsApp cron (n8n / external) |
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
- [ ] Set `APP_ENV=production` and `TIMEZONE=Asia/Kolkata`
- [ ] Configure a firewall — only expose ports 80 and 443
- [ ] Enable automated MySQL backups
- [ ] Review and rotate JWT secrets periodically
- [ ] Set up log monitoring

---

## Future Roadmap

- [x] ID card generation with single-use PDF token (membership card PDF)
- [x] QR code embed on ID card for offline verification
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
