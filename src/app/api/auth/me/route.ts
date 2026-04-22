import { NextRequest } from "next/server";
import { ok, unauthorized, serverError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    const name = req.headers.get("x-user-name");
    const email = req.headers.get("x-user-email");
    const role = req.headers.get("x-user-role");
    const roleId = req.headers.get("x-user-role-id");
    const permissionsHeader = req.headers.get("x-user-permissions");

    if (!userId || !email || !role) return unauthorized("Not authenticated");

    let permissions: string[] = [];
    if (permissionsHeader) {
      try {
        permissions = JSON.parse(permissionsHeader);
      } catch {
        permissions = [];
      }
    }

    return ok({
      id: parseInt(userId),
      name: name ?? "",
      email,
      role,
      roleId: roleId ? parseInt(roleId) : 0,
      permissions,
    });
  } catch (err) {
    console.error("[Auth] /me error:", err);
    return serverError(err);
  }
}
