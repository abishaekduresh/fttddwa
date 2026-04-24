import { prisma } from "@/lib/prisma";

type RawMember = {
  id: number;
  membershipId: string;
  name: string;
  phone: string;
  district: string;
  dateOfBirth: Date | null;
  weddingDate: Date | null;
  notifyBirthday: number | boolean;
  notifyWedding: number | boolean;
};

export async function getUpcomingCelebrations() {
  const members = await prisma.$queryRaw<RawMember[]>`
    SELECT id, membershipId, name, phone, district, dateOfBirth, weddingDate, notifyBirthday, notifyWedding
    FROM members
    WHERE status = 'ACTIVE' AND deletedAt IS NULL
    AND (dateOfBirth IS NOT NULL OR weddingDate IS NOT NULL)
  `;

  // Force "Today" to Asia/Kolkata timezone regardless of server time
  const istDateString = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [m, d, y] = istDateString.split("/");
  const today = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  today.setHours(0, 0, 0, 0);

  function daysUntil(date: Date): number {
    const thisYear = new Date(today.getFullYear(), date.getMonth(), date.getDate());
    const target = thisYear < today
      ? new Date(today.getFullYear() + 1, date.getMonth(), date.getDate())
      : thisYear;
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  const celebrations: Array<{
    id: number;
    membershipId: string;
    name: string;
    phone: string;
    district: string;
    type: "birthday" | "wedding";
    daysUntil: number;
    monthDay: string;
  }> = [];

  for (const m of members) {
    const notifyBirthday = m.notifyBirthday === true || m.notifyBirthday === 1;
    const notifyWedding = m.notifyWedding === true || m.notifyWedding === 1;

    if (m.dateOfBirth && notifyBirthday) {
      const days = daysUntil(new Date(m.dateOfBirth));
      if (days >= 0 && days <= 7) {
        const d = new Date(m.dateOfBirth);
        celebrations.push({
          id: m.id, membershipId: m.membershipId, name: m.name, phone: m.phone, district: m.district,
          type: "birthday", daysUntil: days,
          monthDay: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        });
      }
    }
    if (m.weddingDate && notifyWedding) {
      const days = daysUntil(new Date(m.weddingDate));
      if (days >= 0 && days <= 7) {
        const d = new Date(m.weddingDate);
        celebrations.push({
          id: m.id, membershipId: m.membershipId, name: m.name, phone: m.phone, district: m.district,
          type: "wedding", daysUntil: days,
          monthDay: `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        });
      }
    }
  }

  return celebrations.sort((a, b) => a.daysUntil - b.daysUntil);
}

export async function getDashboardStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalMembers,
    activeMembers,
    totalUsers,
    recentMembers,
    membersByDistrict,
    recentActivity,
    monthlyGrowth,
    upcomingCelebrations,
    expiredMembers,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.member.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, membershipId: true, name: true, district: true, phone: true, status: true, createdAt: true },
    }),
    prisma.member.groupBy({
      by: ["district"],
      _count: { _all: true },
      orderBy: { _count: { district: "desc" } },
      take: 8,
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, resource: true, userEmail: true, ipAddress: true, createdAt: true, status: true },
    }),
    prisma.member.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    getUpcomingCelebrations(),
    prisma.member.count({ where: { validUntil: { lt: new Date() }, status: { not: "DELETED" } } }),
  ]);

  return {
    totalMembers,
    activeMembers,
    inactiveMembers: totalMembers - activeMembers,
    expiredMembers,
    totalUsers,
    newMembersThisMonth: monthlyGrowth,
    recentMembers,
    membersByDistrict: (membersByDistrict as any[]).map((d) => ({
      district: d.district as string,
      count: d._count._all as number,
    })),
    recentActivity,
    upcomingCelebrations,
  };
}
