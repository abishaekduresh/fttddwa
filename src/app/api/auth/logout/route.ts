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
  
  // Explicitly delete cookies from the root path
  response.cookies.delete({ name: "access_token", path: "/" });
  response.cookies.delete({ name: "refresh_token", path: "/" });
  
  return response;
}
