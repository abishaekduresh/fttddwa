# Changelog

All notable changes to FTTDDWA Member Management System will be documented in this file.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.1] — 2026-05-06

### Fixed
- **Production Build Stabilization** — Resolved critical 'type never' errors in Prisma `include` and `select` blocks by applying systematic `any` casts. This workarounds a recurring issue with Prisma client generation in the build environment.
- **Strict Type Enforcement** — Cleaned up over 30 `no-explicit-any` ESLint warnings across `member.service.ts`, `auth.service.ts`, `audit.service.ts`, and `whatsapp-*.service.ts`.
- **ID Card PDF Generation** — Fixed type errors in validity period calculations and ensured consistent `Record<string, unknown>` usage for dynamic settings.
- **WhatsApp Cron Types** — Resolved type mismatches in variable resolution for scheduled birthday and anniversary greetings.

## [2.4.0] — 2026-05-06

### Added
- **Direct PDF Sharing** — Refactored the ID card "Share" button to generate and share high-quality PDF files directly.
- **SVG-to-PNG Rendering Pipeline** — Implemented a backend route using `sharp` to render stylized SVG member cards into PNG images.
- **Enhanced Error Reporting** — Added detailed HTTP status codes to frontend toasts and server-side logging for diagnosing image/PDF generation failures.

### Fixed
- **Registration Form Type Mismatch** — Resolved a TypeScript error in `register/page.tsx` when processing dynamic API validation errors.
- **PDF.js Compatibility** — Updated the ID card preview to satisfy `pdfjs-dist` (v5+) requirements by explicitly passing the `canvas` element to the render method.
- **Optimized Image Fetching** — Improved the `imgDataUri` utility to reduce processing overhead and handle remote assets (logos, photos) more reliably.

---

## [2.3.0] — 2026-04-26

### Added
- **Environment-Aware Storage** — Implemented a centralized storage management system that automatically selects the best path for the environment:
    - **Production**: Defaults to `/app/persist/uploads` (optimized for Docker/Coolify persistent volumes).
    - **Development**: Defaults to the `uploads/` folder in the project root.
    - **Override**: Both can be overridden via the `UPLOAD_DIR` environment variable.
- **`getUploadsDir` Utility** — New centralized helper in `src/lib/utils/storage.ts` to unify storage path resolution across all API routes.

### Changed
- **Storage Infrastructure** — Transitioned from a hybrid model (Vercel Blob + Local) to a purely disk-based local/persistent storage model.
- **Improved File Serving** — Updated the `/api/files/` route to support dynamic storage roots with enhanced path-traversal protection using `path.resolve`.

### Removed
- **Vercel Blob Integration** — Completely removed `@vercel/blob` dependency and related environment variables (`BLOB_READ_WRITE_TOKEN`).
- **Blob storage branches** — Simplified upload API routes by removing cloud storage logic.

---

## [2.2.3] — 2026-04-26

### Fixed
- **Production Build Errors** — Resolved critical errors blocking the production build:
    - Fixed unescaped entities (`"` and `'`) in the **ID Card Designer** JSX.
    - Resolved TypeScript type mismatches in **Member Form** and **Settings Page**.
- **React Hook Warnings** — Corrected missing dependency warnings (`router`, `setUser`, `nextPath`) in `useEffect` hooks across multiple dashboard pages.
- **Linting & Code Quality** — Addressed over 50 linting warnings including unused variables, unused imports, and non-explicit `any` types.

### Changed
- **Image Optimization** — Migrated legacy `<img>` tags to the Next.js `<Image />` component for better performance and LCP optimization in the Login, Member Details, and Sidebar components.

---

## [2.2.2] — 2026-04-26

### Added
- **ID Card Designer Enhancements** — Major updates to the layout engine and designer UI:
    - **Image Padding** — Added support for `padding` on image layers (Photo, Logos), allowing for breathing room within borders.
    - **Image Background Color** — Image layers now support a custom `bgColor` behind the image, perfect for transparent logos or signatures.
    - **Rectangle Border Radius** — Added `borderRadius` support for `rect` shapes, enabling modern rounded-corner designs.
    - **Improved Field Mapping** — Added data aliases for Date of Birth (`dob`, `dateOfBirth`) to ensure reliable data resolution.
    - **Designer Properties** — Added `member.dateOfBirth` to the data-binding dropdown in the properties panel.

### Fixed
- **Coolify Deployment (Hooks Error)** — Renamed `useServerAuth` to `getServerAuth` to resolve a React Hooks rule violation in server-side API routes that was blocking production builds.
- **Coolify Deployment (Mount Error)** — Removed `tsconfig.tsbuildinfo` from the repository and added it to `.gitignore`. This resolves a Docker mount failure where the build system tried to use that file path for a cache directory.
- **Missing PDF Fields** — Resolved an issue where Date of Birth and Business Name (Tamil) were blank in some scenarios by improving font registration and fallback data resolution in the PDF service.
- **Designer Modal Conflict** — Fixed a z-index issue where the canvas could overlap the "Templates" modal.
- **Layer Z-Index Cap** — Capped user-defined layer `zIndex` at 100 to prevent layout breakage while maintaining custom sorting.

### Removed
- **Docker Infrastructure** — Deleted `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and the `docker/` configuration directory to streamline the project for standard Node.js/PM2 deployments.
- **Docker Documentation** — Cleaned up `README.md` and `SETUP.md` to remove Docker-specific instructions.

---

## [2.2.1] — 2026-04-25

## [2.2.0] — 2026-04-25

### Added
- **Return-URL Preservation** — Unauthenticated users are now redirected to `/login?next=<original-path>`. After login or silent session restore they are sent back to the exact page (including query string) they were trying to reach. Works across three surfaces:
  - **Middleware** — encodes `pathname + search` into `?next=` on 401 dashboard redirects; also respects `?next=` when bypassing a valid-session login hit
  - **Login page** — reads `?next=` via `useSearchParams`, passes through `safeNext()` guard (rejects anything not starting with `/` or starting with `//` to prevent open redirects), wrapped in `Suspense` boundary required by App Router
  - **Dashboard layout** — `redirectToLogin()` encodes `window.location.pathname + search` into `?next=`
  - **`apiFetch`** — `expireSession()` appends current path as `?next=` when hard-redirecting after an unrecoverable 401
- **Logout → Home** — Signing out now redirects to `/` (home page) instead of `/login`

### Changed
- **Home Page — Full UI/UX Overhaul** — Complete visual and animation redesign:
  - **Hero** — animated ambient orbs (`orbDrift`), CSS dot-grid texture overlay, `min-h` floor so hero never collapses; floating logo containers with pulsing shimmer rings (`logoFloat`, `ringPulse`)
  - **Text entrance** — name, Tamil name, tagline, and reg number each fade-up sequentially with staggered delays
  - **Animated stat counters** — numbers ease up from 0 using `requestAnimationFrame` + cubic-bezier, triggered by `IntersectionObserver`; labels now in Tamil (உறுப்பினர்கள், மாவட்டங்கள், நிறுவப்பட்டது)
  - **Scroll indicator** — bouncing mouse-scroll hint in the hero
  - **Cards** — gradient top-border stripe per card (blue / emerald / violet); gradient icon backgrounds; two-line titles (Tamil bold + English muted subtitle); staggered `cardIn` entrance via `IntersectionObserver`; shine-sweep `::after` pseudo-element on hover; icon box scales 110% on hover; `→` circle transitions to accent color
  - **Live badge** — pulsing dot on "பதிவு திறந்துள்ளது" badge
  - **Section header** — pill badge "இப்போதே தொடங்குங்கள்" with animated dot; gradient underline rule
  - **Contact tiles** — `contactIn` slide-in animation triggered by scroll; icon inverts to solid on hover; bilingual labels (Tamil · English)
  - **Footer** — gradient shimmer top-line; Tamil navigation links (உள்நுழைவு, பதிவு, அட்டை); Tamil copyright line
- **Quick Access section — fully in Tamil** — All card titles, descriptions, and badges translated to Tamil with NotoSansTamil font applied consistently

---

## [2.1.0] — 2026-04-25

### Added
- **Public Home Page** — New default route at `/` replaces the old dashboard redirect. Features:
  - Hero section with dual-logo display (logo1 left, logo2 right), association name + Tamil name, tagline + Tamil tagline, registration number, and a stats strip (members, districts, est. year)
  - **Quick Access cards** for Admin Login (blue), Join as Member (green), and Get ID Card (violet) — each with hover lift, shimmer animation, and inverted icon on hover
  - Member Registration and ID Card cards are conditionally shown based on `enableMemberRegistration` and `enableIdCard` flags from `/api/settings/app`
  - **Contact & Location section** — renders only when address, phone, email, or reg. number are set; clickable phone (`tel:`) and email (`mailto:`) links
  - Dark footer with association name, Tamil name, and quick nav links
  - Smooth SVG wave divider between hero and content
  - Skeleton loading states during API fetch
  - Fetches both `/api/settings/app` and `/api/settings/association` in parallel
  - NotoSansTamil font applied to all Tamil text
  - Fully mobile-responsive (1 → 2 → 3 column adaptive grid)

### Changed
- **Middleware** — Root path `/` now serves the home page instead of redirecting to `/dashboard`. Logged-in users who navigate to `/` see the home page; they are still auto-redirected to `/dashboard` when they hit `/login`.

---

## [2.0.0] — 2026-04-25

### Added
- **Member Approval Workflow** — Public self-registrations now land as `PENDING` status. Admins see a one-click **Approve** button on the members list page; approving sets status to `ACTIVE` and writes an audit log entry.
- **Member Status Toggle (Block/Unblock)** — New per-member toggle button (ShieldOff / ShieldCheck) lets Data Entry operators and above flip a member between `ACTIVE` and `INACTIVE`. Backed by `PATCH /api/members/:id/status`.
- **`POST /api/members/:id/approve`** — New authenticated endpoint (Admin+) that transitions a `PENDING` member to `ACTIVE`.
- **`PATCH /api/members/:id/status`** — New authenticated endpoint (Data Entry+) accepting `{ status: "ACTIVE" | "INACTIVE" }`.
- **Per-Status ID Card Error Messages** — `/members/id-card` now returns a descriptive toast for each non-active status: PENDING (awaiting approval), INACTIVE (deactivated), SUSPENDED, and EXPIRED — instead of a generic "not found" message.
- **Dual-Logo Header on Public Pages** — Login, public member registration (`/members/register`), and ID card lookup (`/members/id-card`) pages now display logo1 (left) + association name / Tamil name / tagline (centre) + logo2 (right), matching the admin dashboard branding.
- **"Get your ID card" Link on Login Page** — Added a `CreditCard` icon link to `/members/id-card` on the login page for members who already have an account.
- **"Back to Register" Link on ID Card Page** — Added a "Not yet a member? Register here" link on the `/members/id-card` lookup page.
- **`nameTamil` and `logo2Url` in `/api/settings/app`** — Public app-settings endpoint now returns both fields so public pages can render the dual-logo header without additional API calls.
- **DB-backed Single-Use PDF Tokens** — `PdfToken` model added to the schema. `consumePdfToken()` atomically records usage via a DB unique constraint; a second attempt on the same token returns `null` immediately. Expired tokens are purged lazily on each successful consumption.
- **`PdfToken` Prisma Model** — New `pdf_tokens` table: `tokenHash CHAR(64) PRIMARY KEY`, `expiresAt`, `usedAt`.

### Changed
- **`MemberStatus` enum** — Added `PENDING` value. Prisma migration: `add_pending_member_status`.
- **`/api/members/register`** — Now creates members with `status: PENDING` instead of `INACTIVE`.
- **`/api/members/card/lookup`** — Comprehensive status check before UUID lookup: PENDING / INACTIVE / SUSPENDED / EXPIRED each return a tailored error message.
- **`src/lib/pdf-tokens.ts`** — Switched from in-memory Map (broken under Next.js App Router module isolation) to stateless HMAC-SHA256 signed tokens + DB single-use enforcement. `consumePdfToken` is now `async`.
- **`/members/id-card/pdf/[token]/route.ts`** — Updated to `await consumePdfToken(token)`.
- **`/members/id-card/page.tsx`** — Simplified to single-step verification → direct PDF redirect (no intermediate card preview). Includes dual-logo header and NotoSansTamil font.
- **`/(auth)/layout.tsx`** — Added NotoSansTamil `@font-face` declaration so Tamil text renders correctly on login and forgot-password pages.
- **Members List Page** — Added `PENDING` status badge (amber), Approve button, and Block/Unblock toggle button. Added `PENDING` option to status filter dropdown.

### Fixed
- **"Link Expired or Already Used" on First Use** — Module isolation in Next.js App Router caused the in-memory token Map to be inaccessible across route handlers. Fixed with HMAC-signed stateless tokens that need no shared state.
- **Pagination Click Handlers Broken** — `const Pagination = () =>` defined inside a render body creates a new React component type on every render, causing unmount/remount on every click. Fixed in users and WhatsApp templates pages by converting to `const paginationEl = ...` (plain JSX variable).

### Database
- `members` table: `status` enum extended with `PENDING` value (migration: `add_pending_member_status`).
- New `pdf_tokens` table: `tokenHash CHAR(64) PK`, `expiresAt DATETIME`, `usedAt DATETIME NULL` (migration: `add_pdf_tokens_table`).

---

## [1.9.0] — 2026-04-24

### Added
- **Dynamic Vertical Stacking (Auto-Stacking)** — Implemented a smart positioning system for ID cards. Elements in the identity and data sections now automatically "move up" to fill gaps if optional fields (like Tamil Name or Business Name) are missing or hidden, ensuring a professional look without empty spaces.
- **Multi-line Row Support** — Enhanced data rows (e.g., Address, Cell No) to support automatic text wrapping. The layout engine now dynamically calculates the height of wrapped text and adjusts subsequent elements accordingly.
- **Member Address Field** — Added the member's residential address as a standard field in the ID card database query, PDF data mapping, and designer interface.

### Fixed
- **Missing Member Fields** — Resolved an issue where the Tamil name, business name, and member address were not correctly appearing on the generated ID cards.
- **Designer Preview Sync** — Updated the ID Card Designer to accurately reflect the new dynamic stacking and wrapping logic in real-time.
- **"live is not defined" Error** — Fixed a critical JavaScript error in the ID card designer caused by an incorrect variable reference in the rendering loop.

---

## [1.8.0] — 2026-04-24

### Added
- **ID Card Customization UI** — New configuration panel in Association Settings (Branding tab) allowing administrators to dynamically set the ID card's primary theme color, main title, and footer role title.
- **Dynamic Field Visibility** — Added toggle switches to show/hide specific member details on the ID card (Photo, ID Number, Phone, Business Name).
- **Signature Resolution Standardization** — Implemented strict **650x300px** resolution enforcement for all signature uploads in both frontend validation and backend processing to ensure professional rendering.
- **Signature Metadata Display** — Real-time display of dimensions and file size for uploaded signatures in the settings form.

### Changed
- **Refined ID Card Footer** — Standardized the footer layout by removing individual member names and replacing them with a customizable professional role title (e.g., "STATE CHAIRMAN").
- **Improved Signature Visibility** — Increased the display size and optimized the fit of signatures on the generated PDF for better legibility.
- **PDF Generation Engine Refresh** — Updated the centralized PDF service to respect dynamic branding colors and titles defined in the association settings.

### Fixed
- **Settings Form Syntax Error** — Resolved a JSX nesting issue that caused a 500 error when accessing the Association Settings or Login pages.
- **Missing Tagline Fields** — Restored the English and Tamil tagline fields that were accidentally omitted during a previous layout update.

---

## [1.7.0] — 2026-04-24

### Added
- **Association Signatures Management** — New interface in Association Settings to manage digital signatures for Chairman, President, Vice President, Secretary, Joint Secretary, and Treasurer.
- **Redesigned Portrait ID Card** — Replaced the landscape ID card with a professional portrait design (standard CR80 format).
    - Premium dark header with dual-logo support.
    - High-contrast name bar and position details.
    - Specialized styling for business name (Pink) and location details (Blue).
    - Signature placeholders in a professional green footer.
- **Improved Validation Robustness** — Updated the association settings schema to correctly handle `null` values for optional fields, preventing "Validation failed" errors when saving settings with empty optional data.
- **Unified PDF Generation** — Created a centralized `generateIdCardPdf` service to ensure identical design across all access points.
- **Auto-Validity Tracking** — ID cards now automatically compute a 2-year validity period from the member's join date.

### Changed
- **Unified Path Structure** — Standardized ID card PDF URLs with clean suffixes:
    - `/members/id-card/:token.pdf` (Public secure access)
    - `/api/members/card/:uuid.pdf` (Admin authenticated access)
- **Corporate ID Card Refresh** — Replaced the basic portrait design with a premium corporate layout using Slate-900 gradients, gold typography accents, and improved information density.
- **Photo Fetching Fix** — Improved image fetching logic in the PDF generator to correctly handle relative URLs, ensuring member photos are visible regardless of environment.
- **Database Schema (v1.7.0)** — Added signature URL columns to the `association_settings` model.

---

## [1.6.1] — 2026-04-24

### Added
- **Secure Proxied PDF URL** — Implemented a clean, proxied URL at `/members/id-card/[token].pdf`. This hides the internal API path and provides a more professional appearance for shared links.
- **Dashboard "Print ID Card"** — The admin member details page now includes a dedicated "Print ID Card" button that opens the member's generated PDF in a new browser tab.
- **Premium Error UI** — Completely redesigned the "Link Expired" page with a modern, mobile-responsive interface, improved typography, and clear visual indicators.

### Changed
- **Direct PDF Flow** — Public ID card lookup now automatically redirects to the generated PDF upon successful verification, removing the intermediate preview step for a faster user experience.
- **One-Time Access Enforcement** — PDF tokens are strictly single-use and valid for only 10 minutes, ensuring high security for member data access.
- **HTML Sanitization** — Updated the text sanitization utility to prevent double-escaping of HTML entities (e.g., `&` being saved as `&amp;`), ensuring data is stored in its literal form while maintaining XSS protection.

### Fixed
- **Lookup API Import Error** — Fixed a `TypeError` in the ID card lookup route caused by an incorrect import of the `badRequest` utility.

---

## [1.6.0] — 2026-04-23

### Added
- **Member UUID** — Each member now receives a UUID (v4) generated automatically at creation time. Stored as a unique, indexed `uuid` VARCHAR(36) column on the `members` table. Provides a stable, opaque public identifier that does not expose the internal integer ID.
- **Public Member ID Card** — New public page at `/members/id-card`: members enter their phone number or Membership ID to look up their UUID, then are redirected to `/members/id-card/[uuid]` which renders a fully customized digital ID card.
- **ID Card Feature Toggle** — `enableIdCard` boolean in `association_settings`. Admins can enable/disable the public ID card page from the App Settings tab in `/settings`. Disabled state shows a friendly "unavailable" screen on both the lookup and card pages.
- **ID Card Customization** — New "ID Card Customization" section in the App Settings tab. Configurable: header/background/text colors, card title, and per-field visibility toggles (photo, membership ID, phone, email, address, DOB, business name, position, member-since date).
- **Print / Save PDF** — "Print / Save PDF" button on the ID card page uses `window.print()` with a print-scoped CSS that renders only the card. Works in all modern browsers; Chrome's "Save as PDF" printer produces a pixel-perfect PDF of the customized card design.
- **Public ID Card API** — Two new public endpoints:
  - `GET /api/members/card/lookup?q=<phone_or_membershipId>` — returns `uuid` only (no PII); rate-limited 10 req/min per IP
  - `GET /api/members/card/[uuid]` — returns card data + association branding + idCardSettings; rate-limited 30 req/min per IP

### Changed
- **`/api/settings/app` (GET)** — Now also returns `enableIdCard` and `idCardSettings`.
- **`/api/settings/app/update` (PATCH)** — Now accepts `enableIdCard` (boolean) and `idCardSettings` (object) in addition to `enableMemberRegistration`. Any subset of the three fields can be patched in a single request.
- **Middleware** — Added `/members/id-card` and `/api/members/card` to `PUBLIC_PATHS`.

### Database
- `members` table: add `uuid VARCHAR(36) NOT NULL UNIQUE` column with index (run `npm run db:migrate`).
- `association_settings` table: add `enableIdCard BOOLEAN NOT NULL DEFAULT TRUE` and `idCardSettings JSON NULL` columns.

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
| 2.4.0 | 2026-05-06 | Direct PDF sharing, SVG-to-PNG pipeline, and TypeScript/PDF.js fixes |
| 2.3.0 | 2026-04-26 | Persistent storage architecture & Vercel Blob removal |
| 2.2.3 | 2026-04-26 | Production build fixes and linting cleanup |
| 2.2.2 | 2026-04-26 | ID card designer enhancements (padding, background, border-radius) |
| 2.2.1 | 2026-04-25 | Coolify deployment fix, Next.js 15 async params, and TS type fixes |
| 2.2.0 | 2026-04-25 | Home page animation overhaul, Tamil Quick Access, return-URL flow |
| 2.1.0 | 2026-04-25 | Public home page with association branding and quick-access cards |
| 2.0.0 | 2026-04-25 | Member approval workflow, status toggle, single-use PDF tokens, dual-logo headers |
| 1.9.0 | 2026-04-24 | Dynamic stacking, multi-line row support, and missing fields fix |
| 1.8.0 | 2026-04-24 | ID card customization UI, refined footer, standardized signature resolution |
| 1.7.0 | 2026-04-24 | Redesigned Portrait ID Card, Association Signatures Management |
| 1.6.1 | 2026-04-24 | Direct PDF redirect, proxied URLs, modern error pages, sanitization fix |
| 1.6.0 | 2026-04-23 | Member UUID, public ID card page, ID card customization, Print/PDF export |
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

[Unreleased]: https://github.com/your-org/fttddwa/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/your-org/fttddwa/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/your-org/fttddwa/compare/v2.2.3...v2.3.0
[2.2.3]: https://github.com/your-org/fttddwa/compare/v2.2.2...v2.2.3
[2.2.2]: https://github.com/your-org/fttddwa/compare/v2.2.1...v2.2.2
[2.2.0]: https://github.com/your-org/fttddwa/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/your-org/fttddwa/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/your-org/fttddwa/compare/v1.9.0...v2.0.0
[1.9.0]: https://github.com/your-org/fttddwa/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/your-org/fttddwa/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/your-org/fttddwa/compare/v1.6.1...v1.7.0
[1.6.1]: https://github.com/your-org/fttddwa/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/your-org/fttddwa/compare/v1.5.2...v1.6.0
[1.5.2]: https://github.com/your-org/fttddwa/compare/v1.5.1...v1.5.2
[1.5.1]: https://github.com/your-org/fttddwa/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/your-org/fttddwa/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/your-org/fttddwa/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/your-org/fttddwa/releases/tag/v1.3.1
[1.3.0]: https://github.com/your-org/fttddwa/releases/tag/v1.3.0
[1.2.0]: https://github.com/your-org/fttddwa/releases/tag/v1.2.0
[1.1.0]: https://github.com/your-org/fttddwa/releases/tag/v1.1.0
[1.0.0]: https://github.com/your-org/fttddwa/releases/tag/v1.0.0
