import { prisma } from "@/lib/prisma";
import { createVendor } from "@/lib/whatsapp/vendors/vendor.factory";

interface RawLog {
  id: number;
  vendorId: number;
  vendorMessageId: string;
  status: string;
  messageType: string;
  statusCheckCount: number;
  deliveredAt: Date | null;
  readAt: Date | null;
  errorMessage: string | null;
  // vendor fields
  vId: number;
  vName: string;
  vApiBaseUrl: string;
  vApiKeyEncrypted: string;
  vIsActive: number;
  vRateLimitPerSec: number;
  vRetryLimit: number;
  vWalletBalance: string;
}

export async function syncWhatsAppMessageStatuses() {
  console.log("[WA Status] Starting delivery status sync...");

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Poll all non-terminal messages within the 48-hour window.
  // Terminal states (failed, read) are never re-polled.
  // statusCheckCount < N cap removed — rely on the cutoff window instead so
  // messages that are read hours after delivery are still captured.
  const logsToTrack = await prisma.$queryRaw<RawLog[]>`
    SELECT
      l.id, l.vendorId, l.vendorMessageId, l.status, l.messageType,
      l.statusCheckCount, l.deliveredAt, l.readAt, l.errorMessage,
      v.id            AS vId,
      v.name          AS vName,
      v.apiBaseUrl    AS vApiBaseUrl,
      v.apiKeyEncrypted AS vApiKeyEncrypted,
      v.isActive      AS vIsActive,
      v.rateLimitPerSec AS vRateLimitPerSec,
      v.retryLimit    AS vRetryLimit,
      v.walletBalance AS vWalletBalance
    FROM whatsapp_logs l
    JOIN whatsapp_vendors v ON v.id = l.vendorId
    WHERE l.status NOT IN ('failed', 'read', 'pending')
      AND l.vendorMessageId IS NOT NULL
      AND l.createdAt >= ${cutoff}
    LIMIT 50
  `;

  if (logsToTrack.length === 0) {
    console.log("[WA Status] No messages require status tracking.");
    return { updated: 0 };
  }

  // Status progression order — never allow a downgrade
  const STATUS_RANK: Record<string, number> = {
    pending: 0, processing: 1, sent: 2, delivered: 3, read: 4, failed: 5,
  };

  let updatedCount = 0;

  for (const log of logsToTrack) {
    try {
      const vendorRow = {
        id:               log.vId,
        name:             log.vName,
        apiBaseUrl:       log.vApiBaseUrl,
        apiKeyEncrypted:  log.vApiKeyEncrypted,
        isActive:         Boolean(log.vIsActive),
        rateLimitPerSec:  log.vRateLimitPerSec,
        retryLimit:       log.vRetryLimit,
        walletBalance:    { toNumber: () => parseFloat(log.vWalletBalance) } as any,
      };

      const vendorInstance = createVendor(vendorRow as any);
      if (typeof vendorInstance.getMessageStatus !== "function") continue;

      const result = await vendorInstance.getMessageStatus(log.vendorMessageId);
      const nextCheckCount = Number(log.statusCheckCount) + 1;

      // Never downgrade: if vendor returns a lower-rank status (e.g. "sent"
      // when DB already has "delivered"), keep the current DB status.
      const vendorRank  = STATUS_RANK[result.status] ?? 0;
      const currentRank = STATUS_RANK[log.status]    ?? 0;
      const newStatus   = vendorRank >= currentRank ? result.status : log.status;

      // Only update errorMessage when the message actually failed
      const newErrorMessage = newStatus === "failed"
        ? (result.error ?? log.errorMessage)
        : log.errorMessage;

      const newDeliveredAt =
        newStatus === "delivered" && !log.deliveredAt ? new Date() : log.deliveredAt;

      const newReadAt =
        newStatus === "read" && !log.readAt ? new Date() : log.readAt;

      await prisma.$executeRaw`
        UPDATE whatsapp_logs
        SET
          status           = ${newStatus},
          statusCheckCount = ${nextCheckCount},
          deliveredAt      = ${newDeliveredAt},
          readAt           = ${newReadAt},
          errorMessage     = ${newErrorMessage}
        WHERE id = ${log.id}
      `;

      // Refund 1 credit when a previously-sent message is reported as failed by the vendor.
      // Credit was deducted at send time; reverse it now.
      const wasPreviouslySent = ["sent", "delivered", "read"].includes(log.status);
      if (newStatus === "failed" && wasPreviouslySent) {
        await prisma.$executeRaw`
          UPDATE whatsapp_vendors
          SET walletBalance = walletBalance + 1
          WHERE id = ${log.vendorId}
        `;
        await prisma.$executeRaw`
          INSERT INTO whatsapp_credit_logs (vendorId, logId, amount, type, createdAt)
          VALUES (${log.vendorId}, ${log.id}, -1.0, ${log.messageType}, NOW())
        `;
        console.log(`[WA Status] Log #${log.id} failed after send — 1 credit refunded to vendor ${log.vendorId}`);
      }

      if (newStatus !== log.status) {
        updatedCount++;
        console.log(`[WA Status] Log #${log.id} updated: ${log.status} -> ${newStatus}`);
      }
    } catch (err) {
      console.error(`[WA Status] Error updating status for Log #${log.id}:`, err);
    }
  }

  console.log(`[WA Status] Completed. Updated ${updatedCount} message statuses.`);
  return { updated: updatedCount };
}
