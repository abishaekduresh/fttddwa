/**
 * POST /api/whatsapp/cron/trigger
 *
 * Internal endpoint to manually trigger the daily WhatsApp cron job.
 * Protected by WHATSAPP_CRON_SECRET header — not JWT authenticated.
 * Can be called by:
 *   - The worker process itself (on startup or manual trigger)
 *   - Windows Task Scheduler / Linux cron: curl -X POST http://localhost:3000/api/whatsapp/cron/trigger -H "x-cron-secret: <secret>"
 *   - Admin UI (super admin only, passes through the JWT path)
 */
import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/api/response";
import { runWhatsAppCron } from "@/lib/services/whatsapp-cron.service";
import { syncWhatsAppMessageStatuses } from "@/lib/services/whatsapp-status.service";
import { createAuditLog } from "@/lib/services/audit.service";
import { getWhatsappSettings } from "@/lib/services/whatsapp-settings.service";

export async function GET(req: NextRequest) {
  return handleTrigger(req, "GET");
}

export async function POST(req: NextRequest) {
  return handleTrigger(req, "POST");
}

async function handleTrigger(req: NextRequest, method: string) {
  try {
    const settings = await getWhatsappSettings();
    const envSecret = process.env.WHATSAPP_CRON_SECRET;
    const dbSecret = settings.externalCronSecret;

    // Allow: correct cron secret (for scheduler/worker) OR SUPER_ADMIN JWT (for admin UI)
    const providedSecret = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");
    const role = req.headers.get("x-user-role");

    const isExternalAuthorized = 
      settings.enableExternalCron && 
      (
        (dbSecret && providedSecret === dbSecret) || 
        (!dbSecret && envSecret && providedSecret === envSecret)
      );
    
    const isAdminCall = role === "SUPER_ADMIN" || role === "ADMIN";

    if (!isExternalAuthorized && !isAdminCall) {
      if (!settings.enableExternalCron && providedSecret) {
        return error("External cron trigger is currently disabled in settings", 403);
      }
      return error("Unauthorized", 401);
    }

    const triggeredBy = isAdminCall ? "admin" : "manual";
    const [result, dlr] = await Promise.all([
      runWhatsAppCron(triggeredBy),
      syncWhatsAppMessageStatuses(),
    ]);

    if (isAdminCall) {
      await createAuditLog({
        userId: parseInt(req.headers.get("x-user-id") || "0") || undefined,
        userEmail: req.headers.get("x-user-email") ?? undefined,
        action: "TRIGGER",
        resource: "whatsapp_cron",
        newValues: { enqueued: result.enqueued, skipped: result.skipped, stoppedReason: result.stoppedReason ?? null },
      });
    }

    return ok(
      { cron: result, dlr },
      result.stoppedReason
        ? `Cron stopped: ${result.stoppedReason}`
        : `Cron completed: ${result.enqueued} sent, ${result.skipped} skipped (${result.skippedDetails.filter(s => s.reason === "Already sent").length} already sent, ${result.skippedDetails.filter(s => s.reason === "Previously failed").length} previously failed) — DLR: ${dlr.updated} statuses updated`
    );
  } catch (err) {
    return serverError(err);
  }
}
