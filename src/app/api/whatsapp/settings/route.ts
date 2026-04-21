import { NextRequest } from "next/server";
import { ok, forbidden, error, serverError } from "@/lib/api/response";
import { updateSettingsSchema } from "@/lib/validation/whatsapp.schema";
import {
  getWhatsappSettings,
  updateWhatsappSettings,
} from "@/lib/services/whatsapp-settings.service";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY", "VIEWER"].includes(role || "")) {
      return forbidden();
    }

    const settings: any = await getWhatsappSettings();
    return ok({
      ...settings,
      cronSecret: settings.externalCronSecret || process.env.WHATSAPP_CRON_SECRET || ""
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
      return forbidden();
    }

    const body = await req.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const settings = await updateWhatsappSettings(parsed.data);

    await createAuditLog({
      userId: parseInt(req.headers.get("x-user-id") || "0"),
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "UPDATE",
      resource: "whatsapp_settings",
      resourceId: "1",
      newValues: parsed.data,
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      status: "SUCCESS",
    });

    return ok(settings, "Settings updated successfully");
  } catch (err) {
    return serverError(err);
  }
}
