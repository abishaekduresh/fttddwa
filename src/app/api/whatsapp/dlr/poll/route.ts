/**
 * POST /api/whatsapp/dlr/poll
 *
 * Polls all vendors for delivery status updates on "sent" logs.
 * Protected by WHATSAPP_CRON_SECRET or ADMIN role (same as cron trigger).
 */
import { NextRequest } from "next/server";
import { syncWhatsAppMessageStatuses } from "@/lib/services/whatsapp-status.service";
import { ok, error, serverError } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const cronSecret = process.env.WHATSAPP_CRON_SECRET;
    const providedSecret = req.headers.get("x-cron-secret");
    const role = req.headers.get("x-user-role");

    const isSchedulerCall = cronSecret && providedSecret === cronSecret;
    const isAdminCall = role === "SUPER_ADMIN" || role === "ADMIN";

    if (!isSchedulerCall && !isAdminCall) {
      return error("Unauthorized", 401);
    }

    const { updated } = await syncWhatsAppMessageStatuses();

    return ok(
      { updated },
      `DLR poll complete: ${updated} message statuses updated.`
    );
  } catch (err) {
    return serverError(err);
  }
}
