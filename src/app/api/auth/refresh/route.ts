import { NextRequest, NextResponse } from "next/server";
import { refreshTokens } from "@/lib/services/auth.service";
import { unauthorized, serverError } from "@/lib/api/response";
import { getClientIp } from "@/lib/security/rate-limiter";

const IS_PROD = process.env.APP_ENV === "production";

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("refresh_token")?.value;
    if (!refreshToken) return unauthorized("No refresh token provided");

    const tokens = await refreshTokens(refreshToken, getClientIp(req));
    if (!tokens) return unauthorized("Session expired — please sign in again");

    const response = NextResponse.json(
      { success: true, message: "Token refreshed" },
      { status: 200 }
    );

    response.cookies.set("access_token", tokens.accessToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      maxAge: 900,
      path: "/",
    });

    response.cookies.set("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: "strict",
      maxAge: 604800,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[Auth] Refresh error:", err);
    return serverError(err);
  }
}
