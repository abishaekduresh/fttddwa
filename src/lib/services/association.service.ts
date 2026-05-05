import { prisma } from "@/lib/prisma";
import { sanitizeText } from "@/lib/security/sanitizer";
import { AssociationSettingsInput } from "@/lib/validation/association.schema";

export async function getAssociationSettings() {
  let settings = await prisma.associationSetting.findFirst({
    where: { id: 1 },
  });

  // Initialize with defaults if not exists
  if (!settings) {
    settings = await prisma.associationSetting.create({
      data: {
        id: 1,
        name: "FTTDDWA",
        shortName: "FTTD",
        state: "Tamil Nadu",
      },
    });
  }

  return settings;
}

export async function updateAssociationSettings(input: AssociationSettingsInput) {
  const sanitized: Record<string, unknown> = {};

  // Sanitize all text fields
  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === "string") {
      sanitized[key] = sanitizeText(value);
    } else {
      sanitized[key] = value;
    }
  });

  return prisma.associationSetting.upsert({
    where: { id: 1 },
    update: sanitized,
    create: { name: "", shortName: "", ...sanitized, id: 1 },
  });
}
