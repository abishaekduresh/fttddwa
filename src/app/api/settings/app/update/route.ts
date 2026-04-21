import { NextRequest } from "next/server";
import { ok, forbidden, serverError } from "@/lib/api/response";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const roleId = req.headers.get("x-user-role-id");
    const isSuperAdmin = req.headers.get("x-user-role") === "SUPER_ADMIN";
    if (!isSuperAdmin && roleId) {
      const roleData = await prisma.role.findUnique({
        where: { id: parseInt(roleId) },
        include: { permissions: { include: { permission: true } } },
      });
      const hasPermission = (roleData?.permissions as any[])?.some(
        (rp: any) => rp.permission?.name === "app_settings:manage"
      );
      if (!hasPermission) return forbidden("Insufficient permissions to manage app settings");
    } else if (!isSuperAdmin) {
      return forbidden("Insufficient permissions to manage app settings");
    }

    const body = await req.json();
    const { enableMemberRegistration } = body;

    if (typeof enableMemberRegistration !== "boolean") {
      return forbidden("Invalid value for enableMemberRegistration");
    }

    await prisma.$executeRaw`
      UPDATE association_settings SET enableMemberRegistration = ${enableMemberRegistration} WHERE id = 1
    `;

    const userId = req.headers.get("x-user-id");
    await createAuditLog({
      userId: userId ? parseInt(userId) : undefined,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "UPDATE",
      resource: "app_settings",
      resourceId: "1",
      newValues: { enableMemberRegistration },
      ipAddress: getClientIp(req),
    });

    return ok({ enableMemberRegistration }, "App settings updated");
  } catch (err) {
    console.error("PATCH /api/settings/app/update error:", err);
    return serverError();
  }
}
