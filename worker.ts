/**
 * WhatsApp Worker — Standalone Node.js process
 *
 * Runs separately from the Next.js app:
 *   npm run worker
 *
 * Responsibilities:
 *   1. Polls the database every 5 seconds for pending WhatsApp jobs
 *   2. Processes each job: sends via vendor API, updates status
 *   3. Schedules the daily cron using node-cron (reads cronTime from WhatsappSettings)
 *   4. Refreshes cron schedule every 5 minutes in case settings change
 *
 * No Redis required — uses WhatsappLog table as the job queue.
 */

import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables. Priorities: .env.local (dev), then .env (prod)
dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

// Use require for ts-node CommonJS compatibility with path aliases
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("./src/lib/prisma");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { claimNextBatch, resetStuckJobs } = require("./src/lib/whatsapp/queue/whatsapp.queue");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { processWhatsAppJob } = require("./src/lib/whatsapp/queue/whatsapp.processor");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { runWhatsAppCron, runWhatsAppStatusSync } = require("./src/lib/services/whatsapp-cron.service");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getWhatsappSettings } = require("./src/lib/services/whatsapp-settings.service");

const POLL_INTERVAL_MS = 5000;    // Poll every 5 seconds
const BATCH_SIZE = 10;             // Process up to 10 jobs per poll
const CRON_REFRESH_INTERVAL_MS = 5 * 60 * 1000;  // Re-read cron schedule every 5 min

let isProcessing = false;
let lastCronRunDate: string | null = null; // To prevent double-firing on the same day

// ─── Job Poll Loop ─────────────────────────────────────────────────────────────

async function processBatch(): Promise<void> {
  if (isProcessing) return; 
  isProcessing = true;

  try {
    // 1. Claim a batch of jobs regardless of global active vendor setting
    const jobIds: number[] = await claimNextBatch(BATCH_SIZE);
    
    if (jobIds.length === 0) return;
    
    console.log(`[Worker] Claimed ${jobIds.length} job(s) for processing.`);

    for (const logId of jobIds) {
      try {
        // 2. For each job, identify its assigned vendor to apply correct rate limits
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

        if (!vendor || !vendor.isActive) {
          console.error(`[Worker] Job ${logId} skipped: Vendor ${log.vendorId} is missing or inactive.`);
          // The processor will also check this, but we can log it here
        }

        const rateLimitDelay = Math.ceil(1000 / (vendor?.rateLimitPerSec ?? 10));

        // 3. Process the actual job
        await processWhatsAppJob(logId);
        
        // 4. Honor vendor-specific rate limit before next job in batch
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

async function getActiveVendor() {
  try {
    const settings = await getWhatsappSettings();
    if (!settings?.activeVendorId) return null;
    return prisma.whatsappVendor.findUnique({
      where: { id: settings.activeVendorId, isActive: true },
      select: { id: true, rateLimitPerSec: true, walletBalance: true },
    });
  } catch {
    return null;
  }
}

// ─── Manual Scheduler (IST Aware) ──────────────────────────────────────────────

/**
 * Checks if it's currently the scheduled IST time for a daily run.
 * We poll every 30-60 seconds to ensure we don't miss the minute.
 */
async function checkAndRunScheduler(): Promise<void> {
  try {
    const settings = await getWhatsappSettings();
    const scheduledTime = settings?.cronTime ?? "09:00"; // HH:mm

    // Use formatToParts() — immune to locale/ICU format differences across Node.js versions
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hourCycle: "h23",   // Forces 00-23 range, never "24:00" for midnight
    });

    const parts = formatter.formatToParts(new Date());
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

    const hour   = get("hour").padStart(2, "0");
    const minute = get("minute").padStart(2, "0");
    const month  = get("month");
    const day    = get("day");
    const year   = get("year");

    const currentTime = `${hour}:${minute}`;
    const datePart    = `${month}/${day}/${year}`;

    // Log status every check
    console.log(`[Scheduler] Watching for ${scheduledTime} | Current IST: ${currentTime} (${datePart})`);

    // Trigger Condition: Time matches AND we haven't already run today
    if (currentTime === scheduledTime && lastCronRunDate !== datePart) {
      console.log(`[Scheduler] Triggered at ${currentTime} IST — starting daily task...`);
      lastCronRunDate = datePart; // Mark as run for today
      
      try {
        const result = await runWhatsAppCron();
        if (result.stoppedReason) {
          console.warn(`[Scheduler] Stopped: ${result.stoppedReason}`);
        } else {
          console.log(
            `[Scheduler] Batch Complete — Enqueued: ${result.enqueued}, Skipped: ${result.skipped}` +
            (result.errors.length ? `, Errors: ${result.errors.length}` : "")
          );
        }
      } catch (err) {
        console.error("[Scheduler] Fatal error during execution:", err);
      }
    }
  } catch (err) {
    console.error("[Scheduler] Failed to check schedule:", err);
  }
}

// ─── Startup ───────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  console.log("[Worker] Starting WhatsApp worker (Manual IST Scheduler)...");

  // Reset any jobs that were left in "processing" state from a previous crash
  const reset = await resetStuckJobs();
  if (reset > 0) {
    console.log(`[Worker] Reset ${reset} stuck job(s) back to pending`);
  }

  // 1. Initial manual check + Scheduled Poller (every 30s)
  await checkAndRunScheduler();
  const scheduleTimer = setInterval(checkAndRunScheduler, 30 * 1000);

  // 2. Start polling loop for pending jobs (every 5s)
  const pollTimer = setInterval(processBatch, POLL_INTERVAL_MS);

  // 3. Start delivery status polling loop (every 5 minutes)
  const statusSyncTimer = setInterval(async () => {
    try {
      console.log("[Worker] Running periodic message status sync...");
      await runWhatsAppStatusSync();
    } catch (err) {
      console.error("[Worker] Error during message status sync:", err);
    }
  }, 5 * 60 * 1000);

  // 3. Heartbeat: Log current IST time every 5 mins to confirm server sync
  setInterval(() => {
    const istTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(new Date());
    console.log(`[Worker] Heartbeat — Current IST Time: ${istTime}`);
  }, 5 * 60 * 1000);

  console.log("[Worker] Ready — polling every 5s, Scheduler active (30s checks).");

  // ─── Graceful Shutdown ───────────────────────────────────────────────────────
  async function shutdown(signal: string) {
    console.log(`\n[Worker] ${signal} received — shutting down...`);
    clearInterval(pollTimer);
    clearInterval(scheduleTimer);
    clearInterval(statusSyncTimer);
    await prisma.$disconnect();
    console.log("[Worker] Shutdown complete.");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

start().catch((err) => {
  console.error("[Worker] Fatal startup error:", err);
  process.exit(1);
});
