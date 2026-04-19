import { prisma } from "@/lib/prisma";
import { createVendor } from "@/lib/whatsapp/vendors/vendor.factory";

// Exponential backoff delays in milliseconds: 1min, 5min, 15min
const BACKOFF_DELAYS_MS = [60_000, 300_000, 900_000];

/**
 * Process a single WhatsApp log entry (a job).
 * Fetches vendor from DB, sends the message, updates the log status.
 */
export async function processWhatsAppJob(logId: number): Promise<void> {
  const log = await prisma.whatsappLog.findUnique({ where: { id: logId } });
  if (!log) {
    console.error(`[WA Processor] Log ${logId} not found`);
    return;
  }

  // Already resolved — skip
  if (log.status === "sent" || log.status === "delivered" || log.status === "failed") {
    return;
  }

  const vendorRow = await prisma.whatsappVendor.findUnique({ where: { id: log.vendorId } });
  if (!vendorRow) {
    await markFailed(log, log.retryCount, "Vendor not found — permanent failure");
    return;
  }

  // Check wallet before sending
  if (vendorRow.walletBalance.toNumber() <= 0) {
    await markFailed(log, log.retryCount, "Vendor wallet balance is zero");
    console.error(`[WA Processor] Vendor ${vendorRow.id} wallet empty. Skipping log ${logId}.`);
    return;
  }

  let result;
  let resolvedMessageText: string | null = null;
  
  try {
    const vendor = createVendor(vendorRow);

    // Determine language + vendorTemplateId from template (default "en")
    const template = log.templateName
      ? await prisma.whatsappTemplate.findFirst({
          where: { vendorId: log.vendorId, templateName: log.templateName },
          select: { language: true, variables: true, body: true },
        })
      : null;

    // Fetch vendorTemplateId via raw query (avoids stale Prisma client type after migration)
    let vendorTemplateId: string | undefined;
    if (log.templateName) {
      const rows = await prisma.$queryRaw<Array<{ vendorTemplateId: string | null }>>`
        SELECT vendorTemplateId FROM whatsapp_templates
        WHERE vendorId = ${log.vendorId} AND templateName = ${log.templateName}
        LIMIT 1
      `;
      vendorTemplateId = rows[0]?.vendorTemplateId ?? undefined;
    }

    const language = template?.language ?? "en";

    if (log.messageBody && !log.templateName) {
      // Free-text message
      resolvedMessageText = log.messageBody;
      result = await vendor.sendText({ to: log.recipientPhone, text: log.messageBody });
    } else {
      // Template message
      let variablesData: string[] | Record<string, string> = [];
      if (log.messageBody) {
        try { variablesData = JSON.parse(log.messageBody); } catch { variablesData = []; }
      }

      // ─── Variable Padding Logic ───
      // WABridge/Meta Error 132012 occurs if counts mismatch. 
      // We pad missing variables with a fallback character.
      const FALLBACK = ".";
      const finalVarArray: string[] = [];
      
      const expectedVarNames = (template?.variables as string[]) || [];
      if (expectedVarNames.length > 0) {
        // Build array using the exact order and count of placeholders found during sync
        expectedVarNames.forEach(varName => {
          let val = "";
          if (Array.isArray(variablesData)) {
            const idx = parseInt(varName) - 1;
            val = variablesData[idx] || "";
          } else if (typeof variablesData === "object" && variablesData !== null) {
            val = variablesData[varName] || "";
          }
          finalVarArray.push(val.trim() === "" ? FALLBACK : val);
        });
      } else {
        // Fallback: use whatever the job has, sorted by index
        const mapped = Array.isArray(variablesData) 
          ? variablesData 
          : Object.entries(variablesData)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([, v]) => v);
        mapped.forEach(v => finalVarArray.push(String(v || "").trim() === "" ? FALLBACK : String(v)));
      }

      // ─── Resolve Final Message Text for Reference ───
      if (template?.body) {
        let tempText = template.body;
        finalVarArray.forEach((val, i) => {
          tempText = tempText.replace(`{{${i + 1}}}`, val);
        });
        resolvedMessageText = tempText;
      }

      result = await vendor.sendTemplate({
        to: log.recipientPhone,
        templateName: log.templateName ?? "",
        vendorTemplateId,
        language,
        variables: finalVarArray,
      });
    }
  } catch (err) {
    result = {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      isPermanentFailure: false,
    };
  }

  if (result.success) {
    await prisma.$transaction([
      prisma.whatsappLog.update({
        where: { id: logId },
        data: {
          status: "sent",
          vendorMessageId: result.messageId,
          messageBodyResolved: resolvedMessageText,
          sentAt: new Date(),
          retryCount: log.retryCount,
          errorMessage: null,
        },
      }),
      prisma.whatsappVendor.update({
        where: { id: log.vendorId },
        data: { walletBalance: { decrement: 1 } },
      }),
      prisma.whatsappCreditLog.create({
        data: {
          vendorId: log.vendorId,
          logId: logId,
          amount: 1.0,
          type: log.messageType,
        },
      }),
    ]);
    return;
  }

  // Permanent failure — don't retry
  if (result.isPermanentFailure) {
    await markFailed(log, log.retryCount, result.error ?? "Permanent failure");
    return;
  }

  // Transient failure — schedule retry with exponential backoff
  const nextRetryCount = log.retryCount + 1;
  const maxRetries = await getRetryLimit(log.vendorId);

  if (nextRetryCount >= maxRetries) {
    await markFailed(log, nextRetryCount, result.error ?? "Max retries exhausted");
    return;
  }

  const delayMs = BACKOFF_DELAYS_MS[log.retryCount] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
  const nextRetryAt = new Date(Date.now() + delayMs);

  await prisma.whatsappLog.update({
    where: { id: logId },
    data: {
      status: "pending",
      retryCount: nextRetryCount,
      errorMessage: result.error,
      nextRetryAt,
    },
  });

  console.log(
    `[WA Processor] Log ${logId} failed (attempt ${nextRetryCount}/${maxRetries}). ` +
    `Retry at ${nextRetryAt.toISOString()}. Error: ${result.error}`
  );
}

async function markFailed(log: { id: number }, finalRetryCount: number, errorMessage: string) {
  try {
    await prisma.whatsappLog.update({
      where: { id: log.id },
      data: { status: "failed", errorMessage, retryCount: finalRetryCount },
    });
  } catch (err) {
    console.error(`[WA Processor] Failed to mark log ${log.id} as failed:`, err);
  }
}

async function getRetryLimit(vendorId: number): Promise<number> {
  const vendor = await prisma.whatsappVendor.findUnique({
    where: { id: vendorId },
    select: { retryLimit: true },
  });
  return vendor?.retryLimit ?? 3;
}
