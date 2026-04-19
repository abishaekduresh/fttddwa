import { prisma } from "@/lib/prisma";
import { encryptApiKey } from "@/lib/whatsapp/encryption";
import { createVendor } from "@/lib/whatsapp/vendors/vendor.factory";
import { sanitizeText } from "@/lib/security/sanitizer";

export interface CreateVendorInput {
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  rateLimitPerSec?: number;
  retryLimit?: number;
}

export interface UpdateVendorInput {
  name?: string;
  apiBaseUrl?: string;
  apiKey?: string;
  isActive?: boolean;
  status?: "ACTIVE" | "INACTIVE" | "DELETED";
  rateLimitPerSec?: number;
  retryLimit?: number;
}

// Safe select — never expose the encrypted API key to the client
const SAFE_SELECT = {
  id: true,
  name: true,
  apiBaseUrl: true,
  isActive: true,
  status: true,
  rateLimitPerSec: true,
  retryLimit: true,
  walletBalance: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createWhatsappVendor(input: CreateVendorInput) {
  return prisma.whatsappVendor.create({
    data: {
      name: sanitizeText(input.name),
      apiBaseUrl: sanitizeText(input.apiBaseUrl),
      apiKeyEncrypted: encryptApiKey(input.apiKey),
      rateLimitPerSec: input.rateLimitPerSec ?? 10,
      retryLimit: input.retryLimit ?? 3,
    },
    select: SAFE_SELECT,
  });
}

export async function getWhatsappVendors() {
  return prisma.whatsappVendor.findMany({
    where: { status: { not: "DELETED" } },
    select: SAFE_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export async function getWhatsappVendorById(id: number) {
  return prisma.whatsappVendor.findUnique({
    where: { id, status: { not: "DELETED" } },
    select: SAFE_SELECT,
  });
}

export async function updateWhatsappVendor(id: number, input: UpdateVendorInput) {
  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = sanitizeText(input.name);
  if (input.apiBaseUrl !== undefined) data.apiBaseUrl = sanitizeText(input.apiBaseUrl);
  if (input.apiKey !== undefined) data.apiKeyEncrypted = encryptApiKey(input.apiKey);
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
    data.status = input.isActive ? "ACTIVE" : "INACTIVE";
  }
  if (input.status !== undefined) data.status = input.status;
  if (input.rateLimitPerSec !== undefined) data.rateLimitPerSec = input.rateLimitPerSec;
  if (input.retryLimit !== undefined) data.retryLimit = input.retryLimit;

  return prisma.whatsappVendor.update({
    where: { id },
    data,
    select: SAFE_SELECT,
  });
}

export async function deleteWhatsappVendor(id: number) {
  // First update the vendor status
  const vendor = await prisma.whatsappVendor.update({
    where: { id },
    data: { status: "DELETED", isActive: false },
  });

  // Also soft-delete all templates associated with this vendor
  await prisma.whatsappTemplate.updateMany({
    where: { vendorId: id },
    data: { status: "DELETED", isActive: false },
  });

  return vendor;
}

/**
 * Fetch live wallet balance from vendor API and persist it in DB.
 */
export async function refreshVendorBalance(id: number): Promise<number> {
  const row = await prisma.whatsappVendor.findUnique({ where: { id } });
  if (!row) throw new Error("Vendor not found");

  const vendor = createVendor(row);
  const result = await vendor.checkBalance();

  await prisma.whatsappVendor.update({
    where: { id },
    data: { walletBalance: result.balance },
  });

  return result.balance;
}

export async function manualUpdateVendorBalance(id: number, balance: number) {
  return prisma.whatsappVendor.update({
    where: { id },
    data: { walletBalance: balance },
    select: SAFE_SELECT,
  });
}
