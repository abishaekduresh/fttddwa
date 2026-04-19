import { prisma } from "@/lib/prisma";
import { getUpcomingCelebrations } from "@/lib/services/dashboard.service";
import { getWhatsappSettings } from "@/lib/services/whatsapp-settings.service";
import { checkDuplicate } from "@/lib/services/whatsapp-log.service";
import { enqueueWhatsAppJob } from "@/lib/whatsapp/queue/whatsapp.queue";
import { processWhatsAppJob } from "@/lib/whatsapp/queue/whatsapp.processor";
import { formatPhoneForWhatsApp } from "@/lib/whatsapp/phone";
import { WaMessageType } from "@prisma/client";

export interface CronSkipDetail {
  memberId: number;
  name: string;
  messageType: string;
  reason: string;   // e.g. "Already sent", "Previously failed", "Pending"
  existingLogId: number;
}

export interface CronRunResult {
  processed: number;
  skipped: number;
  enqueued: number;
  errors: string[];
  skippedDetails: CronSkipDetail[];
  stoppedReason?: string;
  diagnostics?: {
    birthdaysToday: number;
    anniversariesToday: number;
    birthdayEnabled: boolean;
    anniversaryEnabled: boolean;
    birthdayTemplateConfigured: boolean;
    anniversaryTemplateConfigured: boolean;
    istDate: string;
  };
}

export async function runWhatsAppCron(triggeredBy: "scheduler" | "manual" | "admin" = "scheduler"): Promise<CronRunResult> {
  const startedAt = Date.now();
  const result: CronRunResult = {
    processed: 0, skipped: 0, enqueued: 0, errors: [], skippedDetails: [],
    diagnostics: {
      birthdaysToday: 0, anniversariesToday: 0,
      birthdayEnabled: false, anniversaryEnabled: false,
      birthdayTemplateConfigured: false, anniversaryTemplateConfigured: false,
      istDate: "",
    },
  };

  // 1. Load settings
  const settings = await getWhatsappSettings();
  if (!settings.activeVendorId) {
    result.stoppedReason = "No active vendor configured in WhatsApp settings";
    return result;
  }

  // 2. Check vendor exists and wallet is non-zero
  const vendor = await prisma.whatsappVendor.findUnique({
    where: { id: settings.activeVendorId, isActive: true },
  });
  if (!vendor) {
    result.stoppedReason = "Active vendor not found or has been deactivated";
    return result;
  }
  if (vendor.walletBalance.toNumber() <= 0) {
    result.stoppedReason = `Vendor "${vendor.name}" wallet balance is zero — top up required`;
    console.error(`[WA Cron] Vendor ${vendor.id} (${vendor.name}) wallet empty. Aborting.`);
    return result;
  }

  // Force "Today" to Asia/Kolkata timezone regardless of server time
  const istDateString = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [mStr, dStr, yStr] = istDateString.split("/");
  const today = new Date(parseInt(yStr), parseInt(mStr) - 1, parseInt(dStr));
  today.setHours(0, 0, 0, 0);

  result.diagnostics!.istDate = `${yStr}-${mStr}-${dStr}`;
  result.diagnostics!.birthdayEnabled = settings.enableBirthday;
  result.diagnostics!.anniversaryEnabled = settings.enableAnniversary;
  result.diagnostics!.birthdayTemplateConfigured = !!settings.birthdayTemplateId;
  result.diagnostics!.anniversaryTemplateConfigured = !!settings.anniversaryTemplateId;

  console.log(`[WA Cron] Running for IST date: ${yStr}-${mStr}-${dStr}`);

  // Rate limit: delay between each send = 1000ms / rateLimitPerSec (min 200ms to be safe)
  const rateLimitDelayMs = Math.max(200, Math.ceil(1000 / (vendor.rateLimitPerSec ?? 1)));
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper: resolve variables from member data using mapping.
  // Always returns an entry for every templateVar slot — uses mapped member field
  // value when configured, or empty string as fallback so field_N is still sent.
  const resolveVariables = (member: any, mapping: any, templateVars: string[]): Record<string, string> => {
    if (!templateVars.length) return {};
    const resolved: Record<string, string> = {};
    templateVars.forEach(varName => {
      const field = mapping?.[varName];
      const val = field ? String(member[field] ?? "") : "";
      // Vendor (SendAdz/Meta) rejects empty strings. Use a dot fallback.
      resolved[varName] = val.trim() === "" ? "-" : val;
    });
    return resolved;
  };

  // Helper: create a log + enqueue
  async function enqueue(
    memberId: number,
    phone: string,
    messageType: WaMessageType,
    templateName: string,
    language: string,
    variables: Record<string, string> = {}
  ) {
    const log = await prisma.whatsappLog.create({
      data: {
        vendorId: vendor!.id,
        memberId,
        messageType,
        templateName,
        recipientPhone: phone,
        status: "pending",
        messageBody: Object.keys(variables).length > 0 ? JSON.stringify(variables) : null,
        scheduledDate: today,
      },
    });

    await enqueueWhatsAppJob({
      logId: log.id,
      vendorId: vendor!.id,
      memberId,
      phone,
      messageType,
      templateName,
      language,
      variables,
    });

    // Process immediately — no worker required
    await processWhatsAppJob(log.id);

    // Honour vendor rate limit between consecutive sends
    await sleep(rateLimitDelayMs);
  }

  // 3. Process birthdays
  if (settings.enableBirthday && settings.birthdayTemplateId) {
    const template = await prisma.whatsappTemplate.findUnique({
      where: { id: settings.birthdayTemplateId },
    });

    if (template) {
      const celebrations = await getUpcomingCelebrations();
      const birthdays = celebrations.filter((c) => c.type === "birthday" && c.daysUntil === 0);
      result.diagnostics!.birthdaysToday = birthdays.length;
      console.log(`[WA Cron] Birthdays today: ${birthdays.length}`);

      for (const member of birthdays) {
        result.processed++;
        try {
          const dupe = await checkDuplicate(member.id, "birthday", today);
          if (dupe) {
            const reason = dupe.status === "sent" || dupe.status === "delivered" ? "Already sent" : dupe.status === "failed" ? "Previously failed" : "Pending/processing";
            result.skippedDetails.push({ memberId: member.id, name: member.name, messageType: "birthday", reason, existingLogId: dupe.id });
            result.skipped++;
            continue;
          }

          let phone: string;
          try { phone = formatPhoneForWhatsApp(member.phone, settings.countryCode); }
          catch {
            result.errors.push(`Invalid phone for member ${member.id} (${member.name})`);
            result.skipped++;
            continue;
          }

          const variables = resolveVariables(member, settings.birthdayVariables, (template.variables as string[]) || []);
          await enqueue(member.id, phone, "birthday", template.templateName, template.language, variables);
          result.enqueued++;
        } catch (err) {
          result.errors.push(`Birthday member ${member.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // 4. Process wedding anniversaries
  if (settings.enableAnniversary && settings.anniversaryTemplateId) {
    const template = await prisma.whatsappTemplate.findUnique({
      where: { id: settings.anniversaryTemplateId },
    });

    if (template) {
      const celebrations = await getUpcomingCelebrations();
      const anniversaries = celebrations.filter((c) => c.type === "wedding" && c.daysUntil === 0);
      result.diagnostics!.anniversariesToday = anniversaries.length;
      console.log(`[WA Cron] Anniversaries today: ${anniversaries.length}`);

      for (const member of anniversaries) {
        result.processed++;
        try {
          const dupe = await checkDuplicate(member.id, "anniversary", today);
          if (dupe) {
            const reason = dupe.status === "sent" || dupe.status === "delivered" ? "Already sent" : dupe.status === "failed" ? "Previously failed" : "Pending/processing";
            result.skippedDetails.push({ memberId: member.id, name: member.name, messageType: "anniversary", reason, existingLogId: dupe.id });
            result.skipped++;
            continue;
          }

          let phone: string;
          try { phone = formatPhoneForWhatsApp(member.phone, settings.countryCode); }
          catch {
            result.errors.push(`Invalid phone for member ${member.id} (${member.name})`);
            result.skipped++;
            continue;
          }

          const variables = resolveVariables(member, settings.anniversaryVariables, (template.variables as string[]) || []);
          await enqueue(member.id, phone, "anniversary", template.templateName, template.language, variables);
          result.enqueued++;
        } catch (err) {
          result.errors.push(`Anniversary member ${member.id}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // 5. Process scheduled events (festival / custom)
  if (settings.enableEvents) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const activeEvents = await prisma.whatsappEvent.findMany({
      where: { isActive: true, scheduleTime: currentTime },
      include: { template: true },
    });

    for (const event of activeEvents) {
      const members = await prisma.member.findMany({
        where: { status: "ACTIVE", deletedAt: null },
        select: { id: true, name: true, phone: true },
      });

      for (const member of members) {
        result.processed++;
        try {
          const dupe = await checkDuplicate(member.id, event.type as WaMessageType, today);
          if (dupe) {
            const reason = dupe.status === "sent" || dupe.status === "delivered" ? "Already sent" : dupe.status === "failed" ? "Previously failed" : "Pending/processing";
            result.skippedDetails.push({ memberId: member.id, name: member.name, messageType: event.type, reason, existingLogId: dupe.id });
            result.skipped++;
            continue;
          }

          let phone: string;
          try { phone = formatPhoneForWhatsApp(member.phone, settings.countryCode); }
          catch { result.skipped++; continue; }

          await enqueue(member.id, phone, event.type as WaMessageType, event.template.templateName, event.template.language);
          result.enqueued++;
        } catch (err) {
          result.errors.push(`Event ${event.id} member ${member.id}: ${String(err)}`);
        }
      }
    }
  }
  // Persist cron run log
  try {
    await prisma.$executeRaw`
      INSERT INTO whatsapp_cron_logs
        (triggeredBy, istDate, processed, enqueued, skipped, failed, stoppedReason, skippedDetails, errors, diagnostics, durationMs, createdAt)
      VALUES (
        ${triggeredBy},
        ${result.diagnostics?.istDate ?? ""},
        ${result.processed},
        ${result.enqueued},
        ${result.skipped},
        ${result.errors.length},
        ${result.stoppedReason ?? null},
        ${JSON.stringify(result.skippedDetails)},
        ${JSON.stringify(result.errors)},
        ${JSON.stringify(result.diagnostics ?? {})},
        ${Date.now() - startedAt},
        NOW()
      )
    `;
  } catch (logErr) {
    console.error("[WA Cron] Failed to save cron log:", logErr);
  }

  return result;
}

export async function runWhatsAppStatusSync() {
  const { syncWhatsAppMessageStatuses } = await import("./whatsapp-status.service");
  return syncWhatsAppMessageStatuses();
}
