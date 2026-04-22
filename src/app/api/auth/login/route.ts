import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/services/auth.service";
import { loginSchema } from "@/lib/validation/auth.schema";
import { error, serverError } from "@/lib/api/response";
import { getClientIp } from "@/lib/security/rate-limiter";

const IS_PROD = process.env.APP_ENV === "production";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return error("Request body must be valid JSON", 400);
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { email, password } = parsed.data;
    const result = await loginUser(
      email, password,
      getClientIp(req),
      req.headers.get("user-agent") ?? undefined
    );

    if (!result.success) {
      return error(result.error || "Invalid credentials", 401);
    }

    // Never expose tokens in the response body — HttpOnly cookies only
    const response = NextResponse.json(
      { success: true, message: "Login successful", name: result.user!.name },
      { status: 200 }
    );

    response.cookies.set("access_token", result.accessToken!, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      maxAge: 900,      // 15 minutes
      path: "/",
    });

    // Restrict refresh_token to /api/auth/ path — reduces attack surface.
    // It will only be sent to /api/auth/refresh and /api/auth/logout.
    response.cookies.set("refresh_token", result.refreshToken!, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      maxAge: 604800,   // 7 days
      path: "/api/auth",
    });

    return response;
  } catch (err) {
    console.error("[Auth] Login error:", err);
    return serverError(err);
  }
}
