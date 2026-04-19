import { NextRequest } from "next/server";
import { ok, forbidden, error, serverError } from "@/lib/api/response";
import { manualSendSchema } from "@/lib/validation/whatsapp.schema";
import { manualSendMessage } from "@/lib/services/whatsapp-send.service";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY"].includes(role || "")) {
      return forbidden();
    }

    const body = await req.json();
    const parsed = manualSendSchema.safeParse(body);
    if (!parsed.success) {
      console.error("[WA Send] Validation failed:", JSON.stringify(parsed.error.format(), null, 2));
      console.error("[WA Send] Body received:", JSON.stringify(body, null, 2));
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const result = await manualSendMessage(parsed.data);

    await createAuditLog({
      userId: parseInt(req.headers.get("x-user-id") || "0"),
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "CREATE",
      resource: "whatsapp_message",
      resourceId: String(result.logId),
      newValues: { memberId: parsed.data.memberId, templateId: parsed.data.templateId },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      status: "SUCCESS",
    });

    const msg = result.status === "sent" || result.status === "delivered"
      ? "Message sent successfully"
      : result.status === "failed"
        ? "Message failed to send — check logs for details"
        : "Message queued for delivery";
    return ok(result, msg);
  } catch (err) {
    return serverError(err);
  }
}
