import { z } from "zod";

export const createVendorSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  apiBaseUrl: z.string().url("Must be a valid URL").trim(),
  apiKey: z.string().min(10, "API key is too short"),
  rateLimitPerSec: z.number().int().min(1).max(100).optional(),
  retryLimit: z.number().int().min(1).max(5).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DELETED"]).optional(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  apiBaseUrl: z.string().url("Must be a valid URL").trim().optional(),
  apiKey: z.string().min(10).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DELETED"]).optional(),
  rateLimitPerSec: z.number().int().min(1).max(100).optional(),
  retryLimit: z.number().int().min(1).max(5).optional(),
});

export const updateSettingsSchema = z.object({
  activeVendorId: z.number().int().positive().nullable().optional(),
  cronTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format (e.g. 09:00)")
    .optional(),
  retryAttempts: z.coerce.number().int().min(0).max(5).optional(),
  enableBirthday: z.boolean().optional(),
  enableAnniversary: z.boolean().optional(),
  enableEvents: z.boolean().optional(),
  birthdayTemplateId: z.number().int().positive().nullable().optional(),
  anniversaryTemplateId: z.number().int().positive().nullable().optional(),
  birthdayVariables: z.record(z.string(), z.string()).nullable().optional(),
  anniversaryVariables: z.record(z.string(), z.string()).nullable().optional(),
  countryCode: z.string().max(10).optional(),
  countryName: z.string().max(100).optional(),
});

export const manualSendSchema = z.object({
  memberId: z.coerce.number().int().positive(),
  templateId: z.coerce.number().int().positive(),
  vendorId: z.coerce.number().int().positive().optional(),
  variables: z.array(z.string()).optional().nullable(),
});

export const webhookSchema = z.object({
  messageId: z.string(),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: z.string().optional(),
  error: z
    .object({ message: z.string() })
    .optional(),
});

export const logFilterSchema = z.object({
  memberId: z.coerce.number().int().positive().optional(),
  messageType: z.preprocess(
    v => (v === "" ? undefined : v),
    z.enum(["birthday", "anniversary", "festival", "custom", "otp", "manual"]).optional()
  ),
  status: z.preprocess(
    v => (v === "" ? undefined : v),
    z.enum(["pending", "processing", "sent", "delivered", "read", "failed"]).optional()
  ),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const syncTemplatesSchema = z.object({
  vendorId: z.number().int().positive(),
});

export const manualBalanceSchema = z.object({
  balance: z.number().min(0, "Balance cannot be negative"),
  password: z.string().min(1, "Administrative password is required"),
});
