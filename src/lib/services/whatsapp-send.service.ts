import { prisma } from "@/lib/prisma";
import { enqueueWhatsAppJob } from "@/lib/whatsapp/queue/whatsapp.queue";
import { processWhatsAppJob } from "@/lib/whatsapp/queue/whatsapp.processor";
import { formatPhoneForWhatsApp } from "@/lib/whatsapp/phone";
import { getWhatsappSettings } from "@/lib/services/whatsapp-settings.service";

export interface ManualSendInput {
  memberId: number;
  templateId: number;
  vendorId?: number;
  variables?: string[] | Record<string, string> | null;
}

export async function manualSendMessage(input: ManualSendInput) {
  const settings = await getWhatsappSettings();
  const vendorId = input.vendorId ?? settings.activeVendorId;
  if (!vendorId) throw new Error("No vendor selected and no active vendor configured in WhatsApp settings");

  const [vendor, template, member] = await Promise.all([
    prisma.whatsappVendor.findUnique({ where: { id: vendorId, isActive: true } }),
    prisma.whatsappTemplate.findUnique({ where: { id: input.templateId } }),
    prisma.member.findUnique({ where: { id: input.memberId }, select: { id: true, name: true, phone: true, status: true } }),
  ]);

  if (!vendor) throw new Error("Active vendor not found or has been deactivated");
  if (!template) throw new Error("Template not found");
  if (!member || member.status !== "ACTIVE") throw new Error("Member not found or not active");
  if (vendor.walletBalance.toNumber() <= 0) throw new Error("Vendor wallet balance is zero");

  const phone = formatPhoneForWhatsApp(member.phone, settings.countryCode);
  
  // Convert array variables to index-mapped object for consistent backend handling
  let mappedVars: Record<string, string> = {};
  if (Array.isArray(input.variables)) {
    input.variables.forEach((v, i) => {
      mappedVars[String(i + 1)] = v;
    });
  } else if (input.variables && typeof input.variables === "object") {
    mappedVars = input.variables;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const log = await prisma.whatsappLog.create({
    data: {
      vendorId: vendor.id,
      memberId: member.id,
      messageType: "manual",
      templateName: template.templateName,
      recipientPhone: phone,
      // Store actual variable values as JSON
      messageBody: Object.keys(mappedVars).length > 0
        ? JSON.stringify(mappedVars)
        : null,
      status: "pending",
      scheduledDate: today,
    },
  });

  await enqueueWhatsAppJob({
    logId: log.id,
    vendorId: vendor.id,
    memberId: member.id,
    phone,
    messageType: "manual",
    templateName: template.templateName,
    language: template.language,
    variables: mappedVars,
  });

  // Process immediately — don't wait for the worker poll cycle
  await processWhatsAppJob(log.id);

  // Re-read final status to return accurate result
  const finalLog = await prisma.whatsappLog.findUnique({
    where: { id: log.id },
    select: { status: true, errorMessage: true },
  });

  return {
    logId: log.id,
    status: finalLog?.status ?? "pending",
    errorMessage: finalLog?.errorMessage ?? null,
  };
}
