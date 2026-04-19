# Changelog

All notable changes to FTTDDWA Member Management System will be documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- ID card generation with QR code
- SMS/Email notification system
- Payment integration (annual membership fee)
- Multi-tenant support (district-wise login)
- Password reset via email (SMTP)
- CSV/Excel bulk import
- React Native mobile app
- Redis-backed rate limiting for clustered deployments

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
| 1.2.0 | 2026-04-19 | WhatsApp Module, Credit Tracking, IST Automation, and Deployment Refinement |
| 1.1.0 | 2026-04-17 | Added Wedding Date field and enhanced member details view |
| 1.0.0 | 2026-04-17 | Initial release — full CRUD, RBAC, JWT, Docker, Swagger |

---

[Unreleased]: https://github.com/your-org/fttddwa/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/your-org/fttddwa/releases/tag/v1.2.0
[1.1.0]: https://github.com/your-org/fttddwa/releases/tag/v1.1.0
[1.0.0]: https://github.com/your-org/fttddwa/releases/tag/v1.0.0
