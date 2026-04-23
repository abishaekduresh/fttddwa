import { NextRequest } from "next/server";
import { getAssociationSettings, updateAssociationSettings } from "@/lib/services/association.service";
import { associationSettingsSchema } from "@/lib/validation/association.schema";
import { ok, forbidden, serverError, error } from "@/lib/api/response";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";
import { verifyAccessToken } from "@/lib/jwt";

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
    // Manual auth: this route is in PUBLIC_EXACT_PATHS (so GET works without a token),
    // meaning middleware does NOT inject x-user-* headers. Verify token from cookie directly.
    const token = req.cookies.get("access_token")?.value;
    if (!token) return forbidden("Unauthorized");
    const payload = await verifyAccessToken(token);
    if (!payload) return forbidden("Unauthorized");

    const isSuperAdmin = payload.role === "SUPER_ADMIN";
    const permissions: string[] = payload.permissions ?? [];
    const hasPermission = isSuperAdmin || permissions.includes("association:manage");
    if (!hasPermission) return forbidden("Insufficient permissions to manage association settings");

    const body = await req.json();
    const parsed = associationSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const oldSettings = await getAssociationSettings();
    const settings = await updateAssociationSettings(parsed.data);

    await createAuditLog({
      userId: payload.userId,
      userEmail: payload.email,
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
