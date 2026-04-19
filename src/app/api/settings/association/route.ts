import { NextRequest } from "next/server";
import { getAssociationSettings, updateAssociationSettings } from "@/lib/services/association.service";
import { associationSettingsSchema } from "@/lib/validation/association.schema";
import { ok, forbidden, serverError, error } from "@/lib/api/response";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await getAssociationSettings();
    return ok(settings);
  } catch (err) {
    console.error("GET /api/settings/association error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const roleId = req.headers.get("x-user-role-id");
    if (!roleId) return forbidden("Unauthorized");

    const roleData = await prisma.role.findUnique({
      where: { id: parseInt(roleId) },
      include: { permissions: { include: { permission: true } } }
    });

    const isSuperAdmin = req.headers.get("x-user-role") === "SUPER_ADMIN";
    const hasPermission = isSuperAdmin || (roleData?.permissions as any[])?.some((p: any) => p.permission?.name === "association:manage");

    if (!hasPermission) {
      return forbidden("Insufficient permissions to manage association settings");
    }

    const body = await req.json();
    const parsed = associationSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const userId = req.headers.get("x-user-id");
    const oldSettings = await getAssociationSettings();
    const settings = await updateAssociationSettings(parsed.data);

    await createAuditLog({
      userId: userId ? parseInt(userId) : undefined,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "UPDATE",
      resource: "association_settings",
      resourceId: "1",
      oldValues: oldSettings as any,
      newValues: settings as any,
      ipAddress: getClientIp(req),
    });

    return ok(settings, "Association settings updated successfully");
  } catch (err) {
    console.error("POST /api/settings/association error:", err);
    return serverError();
  }
}
