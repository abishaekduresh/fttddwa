import { z } from "zod";

export const createMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  nameTamil: z.string().max(200).optional(),
  businessName: z.string().max(200).optional(),
  businessNameTamil: z.string().max(200).optional(),
  position: z.string().max(100).optional(),
  aadhaar: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar must be exactly 12 digits")
    .optional()
    .or(z.literal("")),
  address: z.string().min(10, "Address must be at least 10 characters").max(500),
  district: z.string().min(2).max(100),
  taluk: z.string().min(2).max(100),
  village: z.string().max(150).optional(),
  state: z.string().min(2).max(100).default("Tamil Nadu"),
  industry: z.string().max(150).optional(),
  dateOfBirth: z.string().optional(),
  weddingDate: z.string().optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  photoUrl: z.string().optional(),
  remark: z.string().optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
