import { prisma } from "@/lib/prisma";
import { createVendor } from "@/lib/whatsapp/vendors/vendor.factory";
import { WaTemplateCategory } from "@prisma/client";

const CATEGORY_MAP: Record<string, WaTemplateCategory> = {
  birthday: "birthday",
  anniversary: "anniversary",
  festival: "festival",
  otp: "otp",
  custom: "custom",
  marketing: "custom",
  utility: "custom",
  authentication: "otp",
};

export async function getWhatsappTemplates(vendorId?: number) {
  return (prisma.whatsappTemplate as any).findMany({
    where: { 
      ...(vendorId ? { vendorId } : {}),
      status: { not: "DELETED" }
    },
    include: { vendor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteWhatsappTemplate(id: number) {
  return prisma.whatsappTemplate.update({
    where: { id },
    data: { status: "DELETED", isActive: false },
  });
}

export async function syncTemplatesFromVendor(vendorId: number) {
  const row = await prisma.whatsappVendor.findUnique({ where: { id: vendorId } });
  if (!row) throw new Error("Vendor not found");

  const vendor = createVendor(row);
  const remoteTemplates = await vendor.getTemplates();

  let created = 0;
  let updated = 0;

  for (const t of remoteTemplates) {
    const category: WaTemplateCategory =
      CATEGORY_MAP[t.category.toLowerCase()] ?? "custom";

    const approved = t.status.toUpperCase() === "APPROVED";
    const isActive = approved ? 1 : 0;
    const statusVal = approved ? "ACTIVE" : "INACTIVE";
    const vars    = t.variables ? JSON.stringify(t.variables) : null;
    const buttons = t.buttons   ? JSON.stringify(t.buttons)   : null;
    const vendorTplId = t.vendorTemplateId || null;

    // Use raw SQL to avoid stale Prisma client type issues (pending prisma generate)
    const existing = await prisma.$queryRaw<Array<{ id: number }>>`
      SELECT id FROM whatsapp_templates
      WHERE vendorId = ${vendorId} AND templateName = ${t.name} AND language = ${t.language}
      LIMIT 1
    `;

    if (existing.length > 0) {
      await prisma.$executeRaw`
        UPDATE whatsapp_templates SET
          vendorTemplateId = ${vendorTplId},
          variables        = ${vars},
          body             = ${t.body ?? null},
          headerText       = ${t.headerText ?? null},
          headerFormat     = ${t.headerFormat ?? null},
          footerText       = ${t.footerText ?? null},
          buttons          = ${buttons},
          category         = ${category},
          isActive         = ${isActive},
          status           = ${statusVal},
          updatedAt        = NOW()
        WHERE id = ${existing[0].id}
      `;
      updated++;
    } else {
      await prisma.$executeRaw`
        INSERT INTO whatsapp_templates
          (vendorId, templateName, vendorTemplateId, language, category,
           variables, body, headerText, headerFormat, footerText, buttons,
           isActive, status, createdAt, updatedAt)
        VALUES
          (${vendorId}, ${t.name}, ${vendorTplId}, ${t.language}, ${category},
           ${vars}, ${t.body ?? null}, ${t.headerText ?? null}, ${t.headerFormat ?? null},
           ${t.footerText ?? null}, ${buttons},
           ${isActive}, ${statusVal}, NOW(), NOW())
      `;
      created++;
    }
  }

  return { created, updated, total: remoteTemplates.length };
}
