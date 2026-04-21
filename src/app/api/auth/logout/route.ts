import { NextRequest, NextResponse } from "next/server";
import { logoutUser } from "@/lib/services/auth.service";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    await logoutUser(refreshToken).catch(() => {});
  }

  const userId = req.headers.get("x-user-id");
  const userEmail = req.headers.get("x-user-email");
  if (userId) {
    await createAuditLog({
      userId: parseInt(userId),
      userEmail: userEmail || undefined,
      action: "LOGOUT",
      resource: "auth",
      ipAddress: getClientIp(req),
    });
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });

  const IS_PROD = process.env.NODE_ENV === "production";
  const expired = new Date(0); // Unix epoch — forces immediate expiry in all browsers

  response.cookies.set("access_token", "", {
    httpOnly: true, secure: IS_PROD, sameSite: "strict",
    path: "/", expires: expired, maxAge: 0,
  });
  response.cookies.set("refresh_token", "", {
    httpOnly: true, secure: IS_PROD, sameSite: "strict",
    path: "/", expires: expired, maxAge: 0,
  });

  return response;
}
