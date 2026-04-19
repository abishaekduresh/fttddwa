import { NextRequest } from "next/server";
import { getUserById } from "@/lib/services/auth.service";
import { ok, unauthorized, serverError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) return unauthorized("Not authenticated");

    const user = await getUserById(parseInt(userId));
    if (!user) return unauthorized("User not found");
    if (!user.role) return unauthorized("User role not configured — contact an administrator");
    if (!user.isActive) return unauthorized("Account is deactivated");

    const permissions = user.role.permissions?.map((rp) => rp.permission.name) ?? [];

    return ok({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      roleId: user.roleId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      permissions,
    });
  } catch (err) {
    console.error("[Auth] /me error:", err);
    return serverError(err);
  }
}
