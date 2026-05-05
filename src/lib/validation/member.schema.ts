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

/**
 * Stricter schema used only for the public self-registration form.
 * - Adds mandatory: photo, email, dateOfBirth, businessName
 * - name must be English letters only
 * - nameTamil / businessNameTamil must not contain English letters
 */
export const publicRegisterSchema = createMemberSchema.extend({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(200)
    .regex(/^[A-Za-z\s.,'"\-()/]+$/, "Full name must be in English only (no Tamil characters)"),
  nameTamil: z
    .string()
    .max(200)
    .regex(/^[^A-Za-z]*$/, "Name in Tamil must not contain English letters")
    .optional(),
  businessName: z
    .string()
    .min(2, "Business name (English) is required")
    .max(200),
  businessNameTamil: z
    .string()
    .max(200)
    .regex(/^[^A-Za-z]*$/, "Business name in Tamil must not contain English letters")
    .optional(),
  email: z.string().email("Invalid email address").min(1, "Email address is required"),
  photoUrl: z.string().min(1, "Please upload a member photo"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type PublicRegisterInput = z.infer<typeof publicRegisterSchema>;
