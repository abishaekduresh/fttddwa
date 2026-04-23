import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { rateLimit, getClientIp } from "@/lib/security/rate-limiter";

// Prefix-matched public paths (any sub-path also passes)
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/members/register",
  "/members/id-card",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",  // Must be public — user may have an expired access token when logging out
  "/api/health",
  "/api/docs",
  "/api/files",
  "/api/whatsapp/webhook",
  "/api/members/register",
  "/api/members/register/upload",
  "/api/members/card",
  "/api/whatsapp/cron/trigger",
];

// Exact-matched public paths (only the exact URL is public, sub-paths are protected)
const PUBLIC_EXACT_PATHS = [
  "/api/settings/app",
  "/api/settings/association",  // GET is unauthenticated (branding data for login/public pages); POST has its own auth check
];

const AUTH_API_PATHS = ["/api/auth/login", "/api/auth/refresh"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limit auth endpoints by IP (stricter)
  if (AUTH_API_PATHS.some((p) => pathname.startsWith(p))) {
    const ip = getClientIp(req);
    const limit = rateLimit(
      `auth:${ip}`,
      parseInt(process.env.AUTH_RATE_LIMIT_MAX || "5", 10),
      15 * 60 * 1000
    );

    if (!limit.success) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((limit.resetAt - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": process.env.AUTH_RATE_LIMIT_MAX || "5",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // Auth pages: redirect to dashboard if a valid access_token already exists
  if (pathname === "/login" || pathname === "/forgot-password") {
    const token = req.cookies.get("access_token")?.value;
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  // Skip auth for all other public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || PUBLIC_EXACT_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Redirect root to dashboard
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Protect dashboard routes (non-API)
  if (!pathname.startsWith("/api/")) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      // Token exists but expired — let the page load.
      // The dashboard layout's initAuth() will call /api/auth/refresh and
      // silently get a new access token. Do NOT delete cookies or redirect
      // here — the refresh token is needed for the silent refresh to work.
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  // Protect API routes
  if (pathname.startsWith("/api/")) {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("access_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Rate limit authenticated API requests by userId (not IP) — prevents
    // shared NAT/proxy from grouping all users under one limit.
    const apiLimit = rateLimit(
      `api:user:${payload.userId}`,
      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "200", 10),
      parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10)
    );

    if (!apiLimit.success) {
      return NextResponse.json(
        { success: false, message: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Inject user info into headers for API handlers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", payload.userId.toString());
    requestHeaders.set("x-user-name", payload.name);
    requestHeaders.set("x-user-email", payload.email);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-user-role-id", payload.roleId.toString());
    requestHeaders.set("x-user-permissions", JSON.stringify(payload.permissions ?? []));

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|uploads).*)",
  ],
};
