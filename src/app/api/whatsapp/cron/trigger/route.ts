/**
 * POST /api/whatsapp/cron/trigger
 *
 * Triggers the daily WhatsApp cron job.
 * Two valid callers:
 *   1. Admin UI — passes a valid access_token cookie (SUPER_ADMIN or ADMIN role)
 *   2. External scheduler (n8n, cron-job.org) — passes secret via
 *      ?secret=<key>  or  x-cron-secret: <key>  header
 *      (requires enableExternalCron = true in WhatsApp settings)
 *
 * This route is intentionally public in middleware so external callers can reach
 * it without a JWT. Admin auth is verified manually via cookie in this handler.
 */
import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/api/response";
import { verifyAccessToken } from "@/lib/jwt";
import { runWhatsAppCron } from "@/lib/services/whatsapp-cron.service";
import { syncWhatsAppMessageStatuses } from "@/lib/services/whatsapp-status.service";
import { createAuditLog } from "@/lib/services/audit.service";
import { getWhatsappSettings } from "@/lib/services/whatsapp-settings.service";

export async function GET(req: NextRequest) {
  return handleTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleTrigger(req);
}

async function handleTrigger(req: NextRequest) {
  try {
    const settings = await getWhatsappSettings();
    const envSecret = process.env.WHATSAPP_CRON_SECRET;
    const dbSecret = settings.externalCronSecret;

    // ── Check 1: Admin via JWT cookie (Run Cron Now button) ─────────────────
    // Middleware skips auth for this public route, so we verify the token here.
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("access_token")?.value;

    const tokenPayload = token ? await verifyAccessToken(token) : null;
    const role = tokenPayload?.role;
    const isAdminCall = role === "SUPER_ADMIN" || role === "ADMIN";

    // ── Check 2: External scheduler via secret ───────────────────────────────
    const providedSecret =
      req.headers.get("x-cron-secret") ||
      req.nextUrl.searchParams.get("secret");

    const isExternalAuthorized =
      settings.enableExternalCron &&
      (
        (dbSecret  && providedSecret === dbSecret) ||
        (!dbSecret && envSecret && providedSecret === envSecret)
      );

    if (!isAdminCall && !isExternalAuthorized) {
      if (providedSecret && !settings.enableExternalCron) {
        return error("External cron trigger is currently disabled in settings", 403);
      }
      return error("Unauthorized", 401);
    }

    // ── Run cron ─────────────────────────────────────────────────────────────
    const triggeredBy = isAdminCall ? "admin" : "manual";
    const [result, dlr] = await Promise.all([
      runWhatsAppCron(triggeredBy),
      syncWhatsAppMessageStatuses(),
    ]);

    if (isAdminCall && tokenPayload) {
      await createAuditLog({
        userId: tokenPayload.userId,
        userEmail: tokenPayload.email,
        action: "TRIGGER",
        resource: "whatsapp_cron",
        newValues: {
          enqueued: result.enqueued,
          skipped: result.skipped,
          stoppedReason: result.stoppedReason ?? null,
        },
      });
    }

    return ok(
      { cron: result, dlr },
      result.stoppedReason
        ? `Cron stopped: ${result.stoppedReason}`
        : `Cron completed: ${result.enqueued} sent, ${result.skipped} skipped` +
          ` — DLR: ${dlr.updated} statuses updated`
    );
  } catch (err) {
    return serverError(err);
  }
}
