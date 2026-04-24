import { prisma } from "@/lib/prisma";
import { Prisma, MemberStatus } from "@prisma/client";
import { generateMembershipId } from "@/lib/utils/membership-id";
import { sanitizeText } from "@/lib/security/sanitizer";
import { generateUUID } from "@/lib/utils/uuid";

/** Returns field-level errors if a P2002 unique constraint was violated, otherwise null. */
export function parseMemberUniqueError(err: unknown): Record<string, string[]> | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== "P2002") return null;
  const raw = err.meta?.target;
  const targets = (Array.isArray(raw) ? raw.join(",") : String(raw ?? "")).toLowerCase();
  const errors: Record<string, string[]> = {};
  if (targets.includes("phone")) errors.phone = ["This phone number is already registered to another member."];
  if (targets.includes("email")) errors.email = ["This email address is already registered to another member."];
  return Object.keys(errors).length ? errors : null;
}

export interface CreateMemberInput {
  name: string;
  nameTamil?: string;
  businessName?: string;
  businessNameTamil?: string;
  position?: string;
  aadhaarHash?: string;
  address: string;
  district: string;
  taluk: string;
  village?: string;
  state?: string;
  industry?: string;
  dateOfBirth?: Date;
  weddingDate?: Date;
  phone: string;
  email?: string;
  photoUrl?: string;
  remark?: string;
  createdById?: number;
  status?: MemberStatus;
}

export interface MemberFilters {
  search?: string;
  district?: string;
  taluk?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function createMember(input: CreateMemberInput) {
  const membershipId = await generateMembershipId(input.district, input.taluk);

  const sanitized = {
    ...input,
    name: sanitizeText(input.name),
    nameTamil: input.nameTamil ? sanitizeText(input.nameTamil) : undefined,
    businessName: input.businessName ? sanitizeText(input.businessName) : undefined,
    businessNameTamil: input.businessNameTamil ? sanitizeText(input.businessNameTamil) : undefined,
    position: input.position ? sanitizeText(input.position) : undefined,
    address: sanitizeText(input.address),
    district: sanitizeText(input.district),
    taluk: sanitizeText(input.taluk),
    village: input.village ? sanitizeText(input.village) : undefined,
    state: input.state ? sanitizeText(input.state) : "Tamil Nadu",
    industry: input.industry ? sanitizeText(input.industry) : undefined,
    remark: input.remark ? sanitizeText(input.remark) : undefined,
  };

  // Calculate validity date based on settings
  const setting = await prisma.associationSetting.findUnique({ where: { id: 1 }, select: { idCardSettings: true } });
  let validityYears = 2;
  if (setting?.idCardSettings) {
    const cs = (typeof setting.idCardSettings === "string" ? JSON.parse(setting.idCardSettings) : setting.idCardSettings) as any;
    validityYears = Number(cs.validityYears) || 2;
  }
  const joinedAt = new Date();
  const validUntil = new Date(joinedAt.getFullYear() + validityYears, 11, 31, 23, 59, 59);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma.member.create as any)({
    data: {
      ...sanitized,
      membershipId,
      uuid: generateUUID(),
      validUntil,
      joinedAt,
      ...(input.status ? { status: input.status } : {}),
    },
  });
}

export async function getMembers(filters: MemberFilters) {
  const { search, district, taluk, status, page = 1, pageSize = 20 } = filters;

  const whereObject = {
    status: (status && status !== MemberStatus.DELETED) ? (status as any) : { not: MemberStatus.DELETED },
    ...(district ? { district } : {}),
    ...(taluk ? { taluk } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search } },
        { nameTamil: { contains: search } },
        { businessName: { contains: search } },
        { businessNameTamil: { contains: search } },
        { membershipId: { contains: search } },
        { phone: { contains: search } },
      ]
    } : {})
  };

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where: whereObject,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.member.count({ where: whereObject }),
  ]);

  return { members, total };
}

export async function getMemberById(id: number) {
  return prisma.member.findFirst({
    where: { id, status: { not: MemberStatus.DELETED } },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
  });
}

export async function updateMember(id: number, input: Partial<CreateMemberInput>) {
  const sanitized: Record<string, unknown> = {};
  if (input.name) sanitized.name = sanitizeText(input.name);
  if (input.nameTamil) sanitized.nameTamil = sanitizeText(input.nameTamil);
  if (input.businessName !== undefined) sanitized.businessName = input.businessName ? sanitizeText(input.businessName) : null;
  if (input.businessNameTamil !== undefined) sanitized.businessNameTamil = input.businessNameTamil ? sanitizeText(input.businessNameTamil) : null;
  if (input.position !== undefined) sanitized.position = input.position ? sanitizeText(input.position) : null;
  if (input.address) sanitized.address = sanitizeText(input.address);
  if (input.district) sanitized.district = sanitizeText(input.district);
  if (input.taluk) sanitized.taluk = sanitizeText(input.taluk);
  if (input.village !== undefined) sanitized.village = input.village ? sanitizeText(input.village) : null;
  if (input.state) sanitized.state = sanitizeText(input.state);
  if (input.industry !== undefined) sanitized.industry = input.industry ? sanitizeText(input.industry) : null;
  if (input.dateOfBirth !== undefined) sanitized.dateOfBirth = input.dateOfBirth;
  if (input.weddingDate !== undefined) sanitized.weddingDate = input.weddingDate;
  if (input.phone) sanitized.phone = input.phone;
  if (input.email !== undefined) sanitized.email = input.email;
  if (input.photoUrl !== undefined) sanitized.photoUrl = input.photoUrl;
  if (input.aadhaarHash !== undefined) sanitized.aadhaarHash = input.aadhaarHash;
  if (input.remark !== undefined) sanitized.remark = input.remark ? sanitizeText(input.remark) : null;

  return prisma.member.update({ where: { id }, data: sanitized });
}

export async function deleteMember(id: number) {
  return prisma.member.update({ 
    where: { id },
    data: { status: MemberStatus.DELETED, deletedAt: new Date() } 
  });
}

export async function getMemberStats() {
  const whereNotDeleted = { status: { not: MemberStatus.DELETED as MemberStatus } };
  
  const [total, byStatus, byDistrict, recentCount] = await Promise.all([
    prisma.member.count({ where: whereNotDeleted }),
    prisma.member.groupBy({ 
      by: ["status"], 
      where: whereNotDeleted,
      _count: { _all: true } 
    }),
    prisma.member.groupBy({
      by: ["district"],
      where: whereNotDeleted,
      _count: { _all: true },
      orderBy: { _count: { district: "desc" } },
      take: 10,
    }),
    prisma.member.count({
      where: { 
        ...whereNotDeleted,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
      },
    }),
  ]);

  return {
    total,
    active: byStatus.find((s: any) => s.status === "ACTIVE")?._count._all || 0,
    inactive: byStatus.find((s: any) => s.status === "INACTIVE")?._count._all || 0,
    byDistrict: byDistrict.map((d: any) => ({ district: d.district, count: d._count._all })),
    recentCount,
  };
}

export async function getDistinctDistricts(): Promise<string[]> {
  const result = await prisma.member.findMany({
    where: { status: { not: MemberStatus.DELETED } },
    distinct: ["district"],
    select: { district: true },
    orderBy: { district: "asc" },
  });
  return result.map((r: any) => r.district);
}

export async function getDistinctTaluks(district?: string): Promise<string[]> {
  const result = await prisma.member.findMany({
    distinct: ["taluk"],
    where: {
      status: { not: MemberStatus.DELETED },
      ...(district ? { district } : {})
    },
    select: { taluk: true },
    orderBy: { taluk: "asc" },
  });
  return result.map((r: any) => r.taluk);
}

// ─── Public ID Card Lookups ────────────────────────────────────────────────────

export interface MemberCardRow {
  uuid: string;
  membershipId: string;
  validUntil: Date | null;
  name: string;
  nameTamil: string | null;
  businessName: string | null;
  businessNameTamil: string | null;
  position: string | null;
  district: string;
  taluk: string;
  village: string | null;
  address: string;
  state: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  status: string;
  dateOfBirth: Date | null;
  weddingDate: Date | null;
  industry: string | null;
  joinedAt: Date;
}

/**
 * Look up a member's UUID by BOTH membershipId AND phone — both must match the same ACTIVE member.
 * Requiring two factors prevents casual enumeration.
 */
export async function lookupMemberByBothFields(memberId: string, phone: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ uuid: string }[]>`
    SELECT uuid FROM members
    WHERE status = 'ACTIVE'
      AND deletedAt IS NULL
      AND membershipId = ${memberId.trim().toUpperCase()}
      AND phone = ${phone.trim()}
    LIMIT 1
  `;
  return rows[0]?.uuid ?? null;
}

/** Fetch member card data by UUID. Returns public fields only — no aadhaarHash or internal IDs. */
export async function getMemberCardByUuid(uuid: string): Promise<MemberCardRow | null> {
  const row = await prisma.member.findFirst({
    where: { uuid, status: "ACTIVE", deletedAt: null },
    select: {
      uuid: true, membershipId: true, name: true, nameTamil: true,
      businessName: true, businessNameTamil: true, position: true,
      district: true, taluk: true, village: true, address: true, state: true,
      phone: true, email: true, photoUrl: true, status: true,
      industry: true, validUntil: true,
      dateOfBirth: true, weddingDate: true, joinedAt: true,
    },
  });
  return row as MemberCardRow | null;
}

export async function extendMemberValidity(id: number, years?: number) {
  const [member, setting] = await Promise.all([
    prisma.member.findUnique({ where: { id }, select: { validUntil: true } }),
    prisma.associationSetting.findUnique({ where: { id: 1 }, select: { idCardSettings: true } })
  ]);

  if (!member) throw new Error("Member not found");

  let validityYears = years;
  if (!validityYears) {
    const cs = (typeof setting?.idCardSettings === "string" ? JSON.parse(setting.idCardSettings) : setting?.idCardSettings) as any;
    validityYears = Number(cs?.validityYears) || 2;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = member as any;
  const baseDate = (m.validUntil && m.validUntil > new Date())
    ? new Date(m.validUntil)
    : new Date();

  const newValidUntil = new Date(baseDate.getFullYear() + validityYears, 11, 31, 23, 59, 59, 999);

  return prisma.member.update({
    where: { id },
    data: { 
      validUntil: newValidUntil,
      status: MemberStatus.ACTIVE
    }
  });
}
