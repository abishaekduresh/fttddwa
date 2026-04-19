import { NextRequest } from "next/server";
import { ok, forbidden, error, serverError } from "@/lib/api/response";
import { syncTemplatesSchema } from "@/lib/validation/whatsapp.schema";
import { syncTemplatesFromVendor } from "@/lib/services/whatsapp-template.service";
import { createAuditLog } from "@/lib/services/audit.service";

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
      return forbidden();
    }

    const body = await req.json();
    const parsed = syncTemplatesSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const result = await syncTemplatesFromVendor(parsed.data.vendorId);
    await createAuditLog({
      userId: parseInt(req.headers.get("x-user-id") || "0") || undefined,
      userEmail: req.headers.get("x-user-email") ?? undefined,
      action: "SYNC",
      resource: "whatsapp_templates",
      resourceId: parsed.data.vendorId,
      newValues: { created: result.created, updated: result.updated, total: result.total },
    });
    return ok(result, `Synced ${result.total} templates (${result.created} new, ${result.updated} updated)`);
  } catch (err) {
    return serverError(err);
  }
}
