import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { rateLimit, getClientIp } from "@/lib/security/rate-limiter";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",  // Must be public — user may have an expired access token when logging out
  "/api/health",
  "/api/docs",
  "/api/docs/yaml",
  "/api/files",
  "/api/whatsapp/webhook",
];

const AUTH_API_PATHS = ["/api/auth/login", "/api/auth/refresh"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limit auth endpoints
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

  // General rate limiting for all API routes
  if (pathname.startsWith("/api/")) {
    const ip = getClientIp(req);
    const limit = rateLimit(
      `api:${ip}`,
      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
      parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10)
    );

    if (!limit.success) {
      return NextResponse.json(
        { success: false, message: "Rate limit exceeded" },
        { status: 429 }
      );
    }
  }

  // Skip auth for public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
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
      // No token at all → send to login
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

    // Inject user info into headers for API handlers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", payload.userId.toString());
    requestHeaders.set("x-user-email", payload.email);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-user-role-id", payload.roleId.toString());

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|uploads).*)",
  ],
};
