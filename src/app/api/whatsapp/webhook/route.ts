/**
 * POST /api/whatsapp/webhook
 *
 * Public endpoint (no JWT) — called by WhatsApp vendors to report delivery status.
 * Verified via HMAC-SHA256 signature if WHATSAPP_WEBHOOK_SECRET is configured.
 */
import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { ok, error, serverError } from "@/lib/api/response";
import { webhookSchema } from "@/lib/validation/whatsapp.schema";
import { updateLogStatusByVendorId } from "@/lib/services/whatsapp-log.service";

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;

    let body: unknown;

    if (secret) {
      // Read raw body first — must happen before any .json() call
      const rawBody = await req.text();

      const signature =
        req.headers.get("x-hub-signature-256") ||
        req.headers.get("x-sendadz-signature") ||
        req.headers.get("x-signature");

      if (!signature) {
        return error("Missing webhook signature", 401);
      }

      const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expected);

      if (
        sigBuf.length !== expBuf.length ||
        !timingSafeEqual(sigBuf, expBuf)
      ) {
        return error("Invalid webhook signature", 401);
      }

      try {
        body = JSON.parse(rawBody);
      } catch {
        return error("Invalid JSON body", 400);
      }
    } else {
      body = await req.json();
    }

    const parsed = webhookSchema.safeParse(body);
    if (!parsed.success) {
      return error("Invalid webhook payload", 400);
    }

    const { messageId, status, error: vendorError } = parsed.data;

    // Normalize "read" to "delivered"
    const normalizedStatus = status === "read" ? "delivered" : status;

    await updateLogStatusByVendorId({
      vendorMessageId: messageId,
      status: normalizedStatus as "delivered" | "failed" | "sent",
      deliveredAt: normalizedStatus === "delivered" ? new Date() : undefined,
      errorMessage: vendorError?.message,
    });

    return ok({ received: true });
  } catch (err) {
    console.error("[Webhook] Error processing delivery event:", err);
    return serverError(err);
  }
}
