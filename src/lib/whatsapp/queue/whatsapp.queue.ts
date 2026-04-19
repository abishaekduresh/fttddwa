/**
 * DB-backed queue — no Redis required.
 *
 * The WhatsappLog table IS the queue:
 *   status=pending   → waiting to be processed
 *   status=processing → being processed right now (prevents double-send)
 *   status=sent      → sent successfully
 *   status=failed    → permanently failed
 *   status=delivered → confirmed delivered via webhook
 *
 * nextRetryAt controls when a failed job becomes eligible for retry.
 */

import { prisma } from "@/lib/prisma";

export interface WhatsAppJobData {
  logId: number;
  vendorId: number;
  memberId: number;
  phone: string;        // Already formatted: "91XXXXXXXXXX"
  messageType: string;  // WaMessageType enum value
  templateName: string;
  language: string;
  variables: string[] | Record<string, string>;
  messageBody?: string;
}

/**
 * Enqueue is simply ensuring the log row exists with status=pending.
 * The log is created by the cron/send service before calling this.
 * This function is a no-op — kept for a clear API boundary.
 */
export async function enqueueWhatsAppJob(_data: WhatsAppJobData): Promise<void> {
  // Log is already created as "pending" by the caller.
  // The worker polls the DB for pending logs.
  // Nothing to do here — the DB row is the job.
}

/**
 * Fetch the next batch of pending jobs ready to process.
 * Includes jobs whose nextRetryAt is null (first attempt) or has passed.
 * Atomically marks them as "processing" to prevent concurrent double-sends.
 */
export async function claimNextBatch(batchSize: number): Promise<number[]> {
  const now = new Date();

  const pending = await prisma.whatsappLog.findMany({
    where: {
      status: "pending",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    select: { id: true },
  });

  if (pending.length === 0) return [];

  const ids = pending.map((r) => r.id);

  // Mark as processing — prevents a second worker instance from picking same jobs
  await prisma.whatsappLog.updateMany({
    where: { id: { in: ids }, status: "pending" },
    data: { status: "processing", updatedAt: now },
  });

  return ids;
}

/**
 * On worker startup, reset any jobs stuck in "processing" back to "pending".
 * This handles the case where the worker crashed mid-batch.
 */
export async function resetStuckJobs(): Promise<number> {
  const result = await prisma.whatsappLog.updateMany({
    where: { status: "processing" },
    data: { status: "pending", nextRetryAt: null },
  });
  return result.count;
}
