/**
 * WhatsApp Worker — Standalone Node.js process
 *
 * Runs separately from the Next.js app:
 *   npm run worker
 *
 * Responsibilities:
 *   1. Polls the database every 5 seconds for pending WhatsApp jobs
 *      (catches any jobs that were not processed inline — e.g. after a crash)
 *   2. Syncs delivery statuses (DLR) every 5 minutes
 *
 * NOTE: Daily cron scheduling is NOT handled here.
 *       Use the admin UI "Run Cron Now" button or an external scheduler
 *       (n8n, cron-job.org, etc.) to call:
 *         POST /api/whatsapp/cron/trigger?secret=<key>
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("./src/lib/prisma");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { claimNextBatch, resetStuckJobs } = require("./src/lib/whatsapp/queue/whatsapp.queue");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processWhatsAppJob } = require("./src/lib/whatsapp/queue/whatsapp.processor");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runWhatsAppStatusSync } = require("./src/lib/services/whatsapp-cron.service");

const POLL_INTERVAL_MS = 5000;   // Poll every 5 seconds
const BATCH_SIZE = 10;           // Process up to 10 jobs per poll

let isProcessing = false;

// ─── Job Poll Loop ──────────────────────────────────────────────────────────────

async function processBatch(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const jobIds: number[] = await claimNextBatch(BATCH_SIZE);
    if (jobIds.length === 0) return;

    console.log(`[Worker] Claimed ${jobIds.length} job(s) for processing.`);

    for (const logId of jobIds) {
      try {
        const log = await prisma.whatsappLog.findUnique({
          where: { id: logId },
          select: { vendorId: true },
        });

        if (!log) {
          console.warn(`[Worker] Job ${logId} disappeared before processing.`);
          continue;
        }

        const vendor = await prisma.whatsappVendor.findUnique({
          where: { id: log.vendorId },
          select: { rateLimitPerSec: true, isActive: true },
        });

        const rateLimitDelay = Math.ceil(1000 / (vendor?.rateLimitPerSec ?? 10));

        await processWhatsAppJob(logId);
        await sleep(rateLimitDelay);
      } catch (jobErr) {
        console.error(`[Worker] Failed to process job ${logId}:`, jobErr);
      }
    }
  } catch (err) {
    console.error("[Worker] Batch processing failed:", err);
  } finally {
    isProcessing = false;
  }
}

// ─── Startup ────────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  console.log("[Worker] Starting WhatsApp worker...");

  // Reset jobs stuck in "processing" from a previous crash
  const reset = await resetStuckJobs();
  if (reset > 0) {
    console.log(`[Worker] Reset ${reset} stuck job(s) back to pending`);
  }

  // 1. Job poll loop (every 5 s)
  const pollTimer = setInterval(processBatch, POLL_INTERVAL_MS);

  // 2. Delivery status sync (every 5 min)
  const statusSyncTimer = setInterval(async () => {
    try {
      console.log("[Worker] Running message status sync...");
      await runWhatsAppStatusSync();
    } catch (err) {
      console.error("[Worker] Status sync error:", err);
    }
  }, 5 * 60 * 1000);

  console.log("[Worker] Ready — polling every 5 s, status sync every 5 min.");
  console.log("[Worker] Cron scheduling: use external trigger or admin UI.");

  async function shutdown(signal: string) {
    console.log(`\n[Worker] ${signal} received — shutting down...`);
    clearInterval(pollTimer);
    clearInterval(statusSyncTimer);
    await prisma.$disconnect();
    console.log("[Worker] Shutdown complete.");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

start().catch((err) => {
  console.error("[Worker] Fatal startup error:", err);
  process.exit(1);
});
