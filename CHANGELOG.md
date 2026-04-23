# Changelog

All notable changes to FTTDDWA Member Management System will be documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.5.2] — 2026-04-23

### Added
- **`apiFetch` Client Utility** — New `src/lib/api/client-fetch.ts` is a drop-in replacement for `fetch()` in all dashboard components. On a 401 response it automatically attempts a silent token refresh, retries the original request once, and if the session cannot be recovered shows a *"Session expired. Redirecting to sign in…"* toast before hard-redirecting to `/login` after 1.5 s.

### Changed
- **All 14 Dashboard Pages + 2 Shared Components + `use-association` Hook** — Migrated from raw `fetch()` to `apiFetch()`. Every authenticated API call in the dashboard now handles 401 consistently without showing a bare "Unauthorized" error to the user.
- **Dashboard Layout** — `redirectToLogin()` helper added; all redirect-to-login paths (initAuth failure, proactive refresh failure) now show a descriptive toast before the redirect instead of navigating silently.

### Fixed
- **"Unauthorized" Toast Without Redirect** — When a session expired mid-session, page components displayed a raw "Unauthorized" error and stayed on the current page. Now any 401 from any dashboard API call triggers an automatic refresh attempt and, on failure, a clear redirect to the login page.

---

## [1.5.1] — 2026-04-23

### Changed
- **WhatsApp Cron Worker** — Removed the internal `checkAndRunScheduler()` function and its 30-second poll timer. The cron is now triggered exclusively via the admin UI button or an external HTTP call. The worker retains only the job-poll loop (stuck-job recovery) and the DLR status-sync timer.
- **WhatsApp Settings UI** — Removed the *Scheduler* card (Daily Cron Time + Retry Attempts fields) since scheduling is now fully external.

### Fixed
- **"Run Cron Now" Button Always Failing** — The cron trigger route (`/api/whatsapp/cron/trigger`) is public in middleware so `x-user-role` was never injected. The route now manually decodes the `access_token` cookie to verify the caller's role, so the admin UI button works correctly.

---

## [1.5.0] — 2026-04-22

### Added
- **Permissions in JWT** — `permissions[]` and `name` are now embedded in the access token payload. `GET /api/auth/me` requires **zero database queries** — all user data is read from the JWT headers injected by middleware.
- **Idle-Aware Token Refresh** — Dashboard layout tracks user activity. Proactive 12-minute refresh is skipped when the tab has been idle for more than 10 minutes, eliminating unnecessary DB hits for inactive sessions.
- **Multi-Tab Refresh Debounce** — A `localStorage` timestamp ensures only one browser tab issues a `/api/auth/refresh` call per 30-second window, preventing N-tab multiplication of DB queries.
- **User-ID Rate Limiting** — Authenticated API endpoints are now rate-limited per `userId` (200 req / 15 min) instead of per IP, preventing shared NAT/proxy environments from grouping all users under a single bucket.

### Changed
- **`refresh_token` Cookie Path** — Restricted from `path: "/"` to `path: "/api/auth"`. The cookie is no longer sent with every browser request — it is only transmitted to `/api/auth/refresh` and `/api/auth/logout`, reducing the cookie's attack surface.
- **Auth Service — Batched Prisma Queries** — `loginUser`, `refreshTokens`, and `getUserById` now use Prisma `include` to fetch user + role + permissions in a single query instead of 2–3 separate round-trips.
  - Login: 5 DB queries → 4
  - Refresh: 4 DB queries → 2
  - `/api/auth/me`: 2 DB queries → **0**
- **Login Page Session Restore** — `checkSession` now fully awaits the logout call before `setCheckingSession(false)`, ensuring stale cookies are cleared before the login form is displayed.
- **Login Response** — `/api/auth/login` now returns `name` in the response body so the welcome toast can be shown without an additional `/api/auth/me` call.

### Fixed
- **Ghost `refresh_token` on Login Page** — Stale cookies from expired sessions are now reliably cleared before the login form becomes visible.
- **`logout` Cookie Mismatch** — `refresh_token` cookie in the logout route now uses `path: "/api/auth"` to match the path used at creation; previously the delete was silently ignored by the browser when paths differed.

---

## [1.4.0] — 2026-04-21

### Added
- **Public Member Registration** — New public page at `/members/register` allowing prospective members to self-register without an admin account. Submitted records are created with `INACTIVE` status pending admin approval.
- **Registration Toggle** — App Settings tab in `/settings` lets Super Admin and Admin enable or disable the public registration page via `enableMemberRegistration` flag.
- **"Others" District Option** — Both the public registration form and the admin member form now include an "Others" option in the district dropdown. When selected, free-text inputs appear for custom district and taluk values.
- **Phone & Email Uniqueness** — `members.phone` and `members.email` are now unique at the database level. Duplicate entries return field-level error toasts (top-right) with per-field messages.
- **Phone Input Enforcement** — Phone number fields are restricted to 10 digits maximum, digits-only; non-numeric characters are stripped on input.
- **`app_settings:manage` Permission** — Added permission and assigned to SUPER_ADMIN and ADMIN roles. Reflected in the `/roles` permissions matrix page.
- **Vercel Deployment** — `vercel.json` added; file uploads now use **Vercel Blob** (`@vercel/blob`) making the app fully compatible with Vercel serverless.
- **Database SQL Export** — `database/database.sql` — complete ready-to-import MySQL schema for fresh SiteGround or any MySQL database provisioning.
- **n8n Cron Support** — WhatsApp cron trigger (`POST /api/whatsapp/cron/trigger`) documented as a public endpoint suitable for external schedulers such as n8n.

### Changed
- **Login Flow** — Login page auto-redirects to `/dashboard` if a valid session already exists (middleware-level). Stale cookies are cleared automatically on failed refresh.
- **Logout** — Uses `maxAge: 0` + `expires: new Date(0)` for reliable cross-browser cookie expiry.
- **File Storage** — `/api/upload` migrated from local `fs.writeFile` to Vercel Blob `put()`. `/api/files/` route retained for backward-compatible local file serving.
- **next.config.ts** — Removed `output: "standalone"`. `images.domains` replaced with `remotePatterns` supporting Vercel Blob URLs.
- **Middleware** — Separated `PUBLIC_PATHS` (prefix-match) from `PUBLIC_EXACT_PATHS` (exact-match) to prevent the settings update route from bypassing auth.

### Fixed
- **App Settings Permission Error** — Super Admin and Admin were seeing "Insufficient permissions" on the App Settings toggle due to a middleware prefix-match bug on the update route.
- **Prisma P2002 TypeError** — MySQL returns unique constraint target as a string, not an array. `parseMemberUniqueError()` now handles both formats.
- **MySQL Key Length** — `members.email` reduced from `VarChar(255)` to `VarChar(191)` to stay within the 1000-byte `utf8mb4` index key limit.

---

## [1.3.1] — 2026-04-20

### Added
- **Production Deployment**: Integrated **PM2 (Process Manager 2)** support with a dedicated `ecosystem.config.js`.
- **Process Management**: Configuration to manage both the Next.js Web Server and the Background Worker simultaneously.
- **Automation Helpers**: New npm scripts for production control (`prod:start`, `prod:status`, `prod:restart`, `prod:stop`).

### Changed
- **Environment**: Refined npm scripts to distinguish between Development and Production:
    - **Development Scripts**: (`dev`, `db:migrate`, `db:seed`, etc.) now automatically use `.env.local` via `dotenv-cli`.
    - **Production Scripts**: (`start`, `prod:start`, `db:migrate:prod`, etc.) now rely on the standard environment (system env vars or `.env`), making them compatible with server control panels.
- **Worker**: Updated `worker.ts` to check for `.env.local` (local dev) first, then fall back to `.env` (production).

---

## [1.3.0] — 2026-04-19

---

## [1.2.0] — 2026-04-19

### Added
- **WhatsApp Module Foundation**:
    - High-performance background worker for message processing with rate limiting and retry logic.
    - Automated IST-aware scheduling for Greeting messages (Birthday, Anniversary, Festivals).
    - Multi-vendor support with unified status synchronization (Sent, Delivered, Read, Failed).
    - Real-time delivery status polling (DLR) with 48-hour tracking window.
- **Credit Tracking & Analytics**:
    - Robust credit logging per vendor and message category.
    - Dashboard statistics cards for Daily, Yesterday, and All-time total consumption.
    - Visual usage breakdown charts by Vendor and Category.
    - Automated credit refund logic for messages that fail after being enqueued.
- **Enhanced Manual Messaging**:
    - Live message preview bubble with real-time variable replacement and missing-variable highlighting.
    - Member-field "Quick Fill" dropdown for template variables (Name, ID, Business, District, etc.).
    - Filtered vendor selection to show only ACTIVE vendors.
- **System Monitoring**:
    - Integrated Cron Log dashboard for monitoring background job outcomes, enqueued counts, and skip reasons.
    - Breadcrumb navigation for improved dashboard flow.

### Fixed
- **Authentication Stability**: Resolved session persistence issues by unifying all cookie paths to root (`/`).
- **Logout Logic**: Corrected an issue where logout failed to clear legacy cookies from deep paths.
- **Prisma Windows Fix**: Added documentation and automated handling for the `EPERM` lock issue during client generation.
- **Reliability**: Implemented silent refresh timeouts in the login page to prevent UI hangs during session restoration.

---

## [1.1.0] — 2026-04-17

### Added
- **Member Profile Enhancement**: Added new `weddingDate` field to member records.
- **Improved Visibility**: Aadhaar Number and Wedding Date are now displayed in the member details view.
- **Better Field Mapping**: Fixed an issue where the Aadhaar number was not updating correctly during edits.

---

## [1.0.0] — 2026-04-17

Initial production release.

### Added

#### Authentication & Security
- JWT-based authentication with access tokens (15 min) and refresh tokens (7 days)
- HttpOnly, SameSite=Strict cookie storage for tokens — no localStorage exposure
- bcrypt password hashing with 12 salt rounds
- Account lockout after 5 consecutive failed login attempts (15-minute cooldown)
- Token rotation on every refresh — old refresh token invalidated
- Server-side session revocation (sessions table) — supports force logout
- In-memory sliding-window rate limiter — auth endpoints limited to 5 req/15 min
- Global API rate limit — 100 req/15 min per IP
- Full XSS protection via `sanitize-html` on all text inputs
- SQL injection prevention via Prisma ORM (parameterised queries only)
- Security response headers — `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy`

#### Role-Based Access Control
- Four system roles: Super Admin, Admin, Data Entry Operator, Viewer
- 14 granular permissions across 6 resources (`members`, `users`, `roles`, `audit`, `dashboard`, `settings`)
- Role-permission many-to-many mapping — ready for custom role creation
- Middleware enforces permissions on every protected API route
- Client-side `PermissionGate` hides UI elements based on role (no server round-trip needed)

#### Member Management
- Full CRUD — create, read, update, delete members
- Fields: name (English + Tamil), position, Aadhaar, address, district, taluk, industry, date of birth, phone, email, photo, status
- All 38 Tamil Nadu districts with their taluks pre-loaded
- Auto-generated membership IDs (`FTTD{YY}{NNNNN}`) — year-prefixed sequential IDs
- Passport-size photo upload — JPEG/PNG/WebP, max 5 MB, stored in `/uploads/members/`
- Member status lifecycle: ACTIVE → INACTIVE / SUSPENDED / EXPIRED
- Full-text search across name, Tamil name, membership ID, phone
- Filter by district, taluk, status
- Paginated list with configurable page size (max 100)
- Member detail page with all fields, photo, and creation metadata

#### Data Export
- Excel export (`.xlsx`) via ExcelJS — formatted with styled headers, auto-filter
- Export supports all active filter parameters (district, status)
- Exports up to 10,000 records in a single download
- PDF export endpoint stub — ready for future implementation

#### Admin Dashboard
- Stats cards: total members, active members, new this month, districts covered
- Recent members table (last 5 registrations)
- District distribution bar chart (top 10 districts)
- Recent activity feed (last 10 audit events)

#### User Management
- Create, update, deactivate, and delete system users
- Assign roles at creation; role can be changed via edit
- Account activate/deactivate toggle without deletion
- Password reset by admin (invalidates all existing sessions)
- Last login time and failed login count visible in admin table

#### Audit Logging
- Every login, logout, failed login, create, update, delete event recorded
- Captures: user ID, email, action, resource, resource ID, old values, new values, IP address, user agent, status
- Audit log failure is non-fatal — main operation completes even if log write fails
- Filterable by resource and action
- Paginated with 25 entries per page default

#### Database
- Prisma schema with 6 models: `users`, `roles`, `permissions`, `role_permissions`, `members`, `sessions`, `audit_logs`
- MySQL 8.x with `utf8mb4` charset for full Unicode / Tamil script support
- Full-text index on `members(name, address)` for search performance
- Composite indexes on high-cardinality filter columns (district, taluk, status, phone)
- Seed script creates all roles, permissions, and a default Super Admin account

#### API
- RESTful API with consistent `{ success, data, message, errors, pagination }` envelope
- Zod validation on all POST/PATCH request bodies
- Standardised error responses with HTTP status codes
- OpenAPI 3.0 specification — `docs/openapi.yaml`
- Swagger UI served at `/api/docs` (development + production)

#### Frontend
- Next.js 15 App Router with route groups: `(auth)` and `(dashboard)`
- Responsive sidebar (collapsible) + sticky topbar
- Tailwind CSS design system with custom tokens (primary blue, semantic colours)
- Google Fonts: Inter (UI) + Noto Sans Tamil (Tamil text rendering)
- React Hook Form + Zod for all forms — real-time validation feedback
- Zustand for client-side auth state (persisted in localStorage with partial rehydration)
- `react-hot-toast` notifications
- Loading skeleton states on all data tables
- Pagination controls on members and audit logs

#### DevOps & Infrastructure
- Multi-stage Docker build — `deps` → `builder` → `runner` (slim production image)
- `docker-compose.yml` — MySQL 8, Next.js app, Nginx reverse proxy (3 services)
- Nginx configuration with upstream keepalive, gzip compression, security headers, static asset caching
- Nginx rate limiting zones (auth + general API)
- Docker health checks on all services
- Uploads volume shared between app and Nginx containers
- `.env.example` with all required variables documented
- `SETUP.md` — step-by-step setup guide for local dev and production
- `README.md` — full project documentation

#### Testing
- Jest + ts-jest configuration
- Unit tests: JWT sign/verify, password hashing/verification, input sanitization, Aadhaar/phone validation

---

## Version History Summary

| Version | Date | Description |
|---------|------|-------------|
| 1.5.2 | 2026-04-23 | Session expiry redirect with toast across all dashboard pages |
| 1.5.1 | 2026-04-23 | WhatsApp cron Run-Now fix, remove internal scheduler, remove Scheduler UI |
| 1.5.0 | 2026-04-22 | Auth hardening, zero-DB /me, batched queries, idle refresh, multi-tab debounce |
| 1.4.0 | 2026-04-21 | Vercel deployment, Blob storage, public registration, APP_ENV/TIMEZONE vars |
| 1.3.1 | 2026-04-20 | PM2 Production Support & Deployment Optimization |
| 1.3.0 | 2026-04-19 | Integrated phpMyAdmin for database management |
| 1.2.0 | 2026-04-19 | WhatsApp Module, Credit Tracking, IST Automation, and Deployment Refinement |
| 1.1.0 | 2026-04-17 | Added Wedding Date field and enhanced member details view |
| 1.0.0 | 2026-04-17 | Initial release — full CRUD, RBAC, JWT, Docker, Swagger |

---

[Unreleased]: https://github.com/your-org/fttddwa/compare/v1.5.2...HEAD
[1.5.2]: https://github.com/your-org/fttddwa/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/your-org/fttddwa/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/your-org/fttddwa/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/your-org/fttddwa/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/your-org/fttddwa/releases/tag/v1.3.1
[1.3.0]: https://github.com/your-org/fttddwa/releases/tag/v1.3.0
[1.2.0]: https://github.com/your-org/fttddwa/releases/tag/v1.2.0
[1.1.0]: https://github.com/your-org/fttddwa/releases/tag/v1.1.0
[1.0.0]: https://github.com/your-org/fttddwa/releases/tag/v1.0.0
