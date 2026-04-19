import { prisma } from "@/lib/prisma";
import { MemberStatus } from "@prisma/client";
import { generateMembershipId } from "@/lib/utils/membership-id";
import { sanitizeText } from "@/lib/security/sanitizer";

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

  return prisma.member.create({
    data: { ...sanitized, membershipId },
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
