import { prisma } from "@/lib/prisma";
import { createVendor } from "@/lib/whatsapp/vendors/vendor.factory";

export interface DlrPollResult {
  checked: number;
  delivered: number;
  read: number;
  failed: number;
  errors: string[];
}

/**
 * Poll WABridge (and other vendors) for delivery status updates on all "sent" logs
 * that have a vendorMessageId. Updates log status to delivered / read / failed.
 *
 * Call this from the cron trigger or a dedicated scheduler.
 * WABridge uses POST /api/getdlr with messageid.
 */
export async function pollDlrStatuses(): Promise<DlrPollResult> {
  const result: DlrPollResult = { checked: 0, delivered: 0, read: 0, failed: 0, errors: [] };

  // Fetch all "sent" logs that have a vendorMessageId and were sent within the last 7 days
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const logs = await prisma.whatsappLog.findMany({
    where: {
      status: "sent",
      vendorMessageId: { not: null },
      sentAt: { gte: cutoff },
    },
    select: {
      id: true,
      vendorId: true,
      vendorMessageId: true,
    },
    take: 100, // process at most 100 per run to avoid timeouts
  });

  if (logs.length === 0) return result;

  // Group by vendorId so we only load each vendor once
  const byVendor = new Map<number, typeof logs>();
  for (const log of logs) {
    const list = byVendor.get(log.vendorId) ?? [];
    list.push(log);
    byVendor.set(log.vendorId, list);
  }

  for (const [vendorId, vendorLogs] of byVendor) {
    const vendorRow = await prisma.whatsappVendor.findUnique({ where: { id: vendorId } });
    if (!vendorRow) continue;

    let vendor: ReturnType<typeof createVendor>;
    try {
      vendor = createVendor(vendorRow);
    } catch {
      result.errors.push(`Vendor ${vendorId}: failed to initialise`);
      continue;
    }

    for (const log of vendorLogs) {
      result.checked++;
      try {
        const dlr = await vendor.getMessageStatus(log.vendorMessageId!);

        if (dlr.status === "delivered") {
          await prisma.whatsappLog.update({
            where: { id: log.id },
            data: { status: "delivered", deliveredAt: new Date(), errorMessage: null },
          });
          result.delivered++;
        } else if (dlr.status === "read") {
          await prisma.whatsappLog.update({
            where: { id: log.id },
            data: { status: "delivered", deliveredAt: new Date(), errorMessage: null },
          });
          result.read++;
        } else if (dlr.status === "failed") {
          await prisma.whatsappLog.update({
            where: { id: log.id },
            data: {
              status: "failed",
              errorMessage: dlr.error ?? "Delivery failed (DLR)",
            },
          });
          result.failed++;
        }
        // "sent" / "pending" / "accepted" → no change yet, will be polled again next run
      } catch (err) {
        result.errors.push(`Log ${log.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return result;
}
