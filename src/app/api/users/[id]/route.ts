import { NextRequest } from "next/server";
import { getUserById, updateUser, deleteUser } from "@/lib/services/user.service";
import { updateUserSchema } from "@/lib/validation/user.schema";
import { ok, error, forbidden, notFound, serverError } from "@/lib/api/response";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";
import { canManageRole } from "@/lib/security/hierarchy";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) return forbidden();

    const { id } = await params;
    const user = await getUserById(parseInt(id));
    if (!user) return notFound("User not found");
    return ok(user);
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    const currentUserId = req.headers.get("x-user-id");

    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) return forbidden();

    const { id } = await params;

    // Hierarchy Check
    const targetUser = await getUserById(parseInt(id));
    if (!targetUser) return notFound("User not found");

    if (!canManageRole(role || "", targetUser.role?.name || "")) {
      return forbidden("You cannot manage users with a higher or equal role");
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const updated = await updateUser(parseInt(id), parsed.data);

    await createAuditLog({
      userId: currentUserId ? parseInt(currentUserId) : undefined,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "UPDATE",
      resource: "users",
      resourceId: id,
      newValues: parsed.data as Record<string, unknown>,
      ipAddress: getClientIp(req),
    });

    return ok(updated, "User updated");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (role !== "SUPER_ADMIN") return forbidden("Only super admins can delete users");

    const { id } = await params;
    const currentUserId = parseInt(req.headers.get("x-user-id") || "0");
    await deleteUser(parseInt(id), currentUserId);

    await createAuditLog({
      userId: currentUserId,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "DELETE",
      resource: "users",
      resourceId: id,
      ipAddress: getClientIp(req),
    });

    return ok(null, "User deleted");
  } catch (err) {
    if (err instanceof Error && err.message === "Cannot delete your own account") {
      return error(err.message, 400);
    }
    return serverError();
  }
}
