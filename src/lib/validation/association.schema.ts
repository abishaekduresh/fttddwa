import { z } from "zod";

export const associationSettingsSchema = z.object({
  name: z.string().min(2, "Association Name must be at least 2 characters").max(255),
  nameTamil: z.string().max(255).optional().nullable().or(z.literal("")),
  shortName: z.string().min(2, "Short Name must be at least 2 characters").max(50),
  shortNameTamil: z.string().max(50).optional().nullable().or(z.literal("")),
  tagline: z.string().max(255).optional().nullable().or(z.literal("")),
  taglineTamil: z.string().max(255).optional().nullable().or(z.literal("")),
  logo1Url: z.string().optional().nullable().or(z.literal("")),
  logo2Url: z.string().optional().nullable().or(z.literal("")),
  regNumber: z.string().max(100).optional().nullable().or(z.literal("")),
  address: z.string().max(1000).optional().nullable().or(z.literal("")),
  addressTamil: z.string().max(1000).optional().nullable().or(z.literal("")),
  state: z.string().max(100).optional().nullable().or(z.literal("")),
  stateTamil: z.string().max(100).optional().nullable().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  phone: z.string().max(20).optional().nullable().or(z.literal("")),
  sigChairmanUrl: z.string().optional().nullable().or(z.literal("")),
  sigPresidentUrl: z.string().optional().nullable().or(z.literal("")),
  sigVicePresidentUrl: z.string().optional().nullable().or(z.literal("")),
  sigSecretaryUrl: z.string().optional().nullable().or(z.literal("")),
  sigJointSecretaryUrl: z.string().optional().nullable().or(z.literal("")),
  sigTreasurerUrl: z.string().optional().nullable().or(z.literal("")),
  idCardSettings: z.any().optional(),
});

export type AssociationSettingsInput = z.infer<typeof associationSettingsSchema>;
