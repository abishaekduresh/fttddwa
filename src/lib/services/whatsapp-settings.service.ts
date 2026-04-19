import { prisma } from "@/lib/prisma";

export interface UpdateSettingsInput {
  activeVendorId?: number | null;
  cronTime?: string;
  retryAttempts?: number;
  enableBirthday?: boolean;
  enableAnniversary?: boolean;
  enableEvents?: boolean;
  birthdayTemplateId?: number | null;
  anniversaryTemplateId?: number | null;
  countryCode?: string;
  countryName?: string;
  birthdayVariables?: any;
  anniversaryVariables?: any;
}

export async function getWhatsappSettings() {
  let settings = await prisma.whatsappSettings.findFirst({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.whatsappSettings.create({
      data: { id: 1, cronTime: "09:00", retryAttempts: 3 },
    });
  }
  return settings;
}

export async function updateWhatsappSettings(input: UpdateSettingsInput) {
  return prisma.whatsappSettings.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...input },
  });
}
