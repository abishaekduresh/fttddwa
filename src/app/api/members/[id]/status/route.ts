import { NextRequest } from "next/server";
import { ok, error, forbidden, notFound, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";
import { MemberStatus } from "@prisma/client";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/members/[id]/status
 * Body: { status: "ACTIVE" | "INACTIVE" }
 * Toggles a member between active and inactive. ADMIN+ only.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY"].includes(role || "")) {
      return forbidden("Insufficient permissions");
    }

    const { id } = await params;
    const memberId = parseInt(id);

    const body = await req.json();
    const { status } = body;

    if (status !== MemberStatus.ACTIVE && status !== MemberStatus.INACTIVE) {
      return error("Status must be ACTIVE or INACTIVE");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const member = await (prisma.member.findUnique as any)({
      where: { id: memberId },
      select: { id: true, name: true, status: true },
    });

    if (!member || member.status === MemberStatus.DELETED) {
      return notFound("Member not found");
    }

    if (member.status === status) {
      return ok(member, `Member is already ${status.toLowerCase()}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (prisma.member.update as any)({
      where: { id: memberId },
      data: { status },
    });

    const userId = req.headers.get("x-user-id");
    await createAuditLog({
      userId: userId ? parseInt(userId) : undefined,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "UPDATE",
      resource: "members",
      resourceId: id,
      oldValues: { status: member.status },
      newValues: { status },
      ipAddress: getClientIp(req),
    });

    return ok(updated, `Member ${status === MemberStatus.ACTIVE ? "activated" : "deactivated"} successfully`);
  } catch {
    return serverError();
  }
}
