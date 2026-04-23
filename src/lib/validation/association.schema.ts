import { z } from "zod";

export const associationSettingsSchema = z.object({
  name: z.string().min(2, "Association Name must be at least 2 characters").max(255),
  nameTamil: z.string().max(255).optional().or(z.literal("")),
  shortName: z.string().min(2, "Short Name must be at least 2 characters").max(50),
  shortNameTamil: z.string().max(50).optional().or(z.literal("")),
  tagline: z.string().max(255).optional().or(z.literal("")),
  taglineTamil: z.string().max(255).optional().or(z.literal("")),
  logo1Url: z.string().optional().or(z.literal("")),
  logo2Url: z.string().optional().or(z.literal("")),
  regNumber: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(1000).optional().or(z.literal("")),
  addressTamil: z.string().max(1000).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  stateTamil: z.string().max(100).optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  sigChairmanUrl: z.string().optional().or(z.literal("")),
  sigPresidentUrl: z.string().optional().or(z.literal("")),
  sigVicePresidentUrl: z.string().optional().or(z.literal("")),
  sigSecretaryUrl: z.string().optional().or(z.literal("")),
  sigJointSecretaryUrl: z.string().optional().or(z.literal("")),
  sigTreasurerUrl: z.string().optional().or(z.literal("")),
});

export type AssociationSettingsInput = z.infer<typeof associationSettingsSchema>;
