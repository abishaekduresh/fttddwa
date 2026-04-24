import { NextRequest } from "next/server";
import { ok, forbidden, notFound, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";
import { MemberStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/members/[id]/approve
 * Approves a PENDING member — sets status to ACTIVE.
 * Requires ADMIN or SUPER_ADMIN.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
      return forbidden("Only admins can approve members");
    }

    const { id } = await params;
    const memberId = parseInt(id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (prisma.member.findUnique as any)({
      where: { id: memberId },
      select: { id: true, name: true, membershipId: true, status: true },
    });

    if (!member) return notFound("Member not found");

    if (member.status !== MemberStatus.PENDING) {
      return ok(member, "Member is already approved");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma.member.update as any)({
      where: { id: memberId },
      data: { status: MemberStatus.ACTIVE },
    });

    const userId = req.headers.get("x-user-id");
    await createAuditLog({
      userId: userId ? parseInt(userId) : undefined,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "UPDATE",
      resource: "members",
      resourceId: id,
      oldValues: { status: "PENDING" },
      newValues: { status: "ACTIVE", approvedBy: req.headers.get("x-user-name") || undefined },
      ipAddress: getClientIp(req),
    });

    return ok(updated, `${member.name} approved successfully`);
  } catch {
    return serverError();
  }
}
