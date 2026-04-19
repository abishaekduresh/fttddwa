import { NextRequest } from "next/server";
import { getMemberById, updateMember, deleteMember } from "@/lib/services/member.service";
import { updateMemberSchema } from "@/lib/validation/member.schema";
import { ok, error, forbidden, notFound, serverError } from "@/lib/api/response";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const member = await getMemberById(parseInt(id));
    if (!member) return notFound("Member not found");
    return ok(member);
  } catch {
    return serverError();
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY"].includes(role || "")) {
      return forbidden("Insufficient permissions to edit members");
    }

    const { id } = await params;
    const existing = await getMemberById(parseInt(id));
    if (!existing) return notFound("Member not found");

    const body = await req.json();
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { aadhaar, dateOfBirth, weddingDate, ...rest } = parsed.data;
    const updated = await updateMember(parseInt(id), {
      ...rest,
      email: rest.email ?? undefined,
      aadhaarHash: aadhaar ?? undefined,
      dateOfBirth: (dateOfBirth && dateOfBirth !== "") ? new Date(dateOfBirth) : undefined,
      weddingDate: (weddingDate && weddingDate !== "") ? new Date(weddingDate) : undefined,
    });

    const userId = req.headers.get("x-user-id");
    await createAuditLog({
      userId: userId ? parseInt(userId) : undefined,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "UPDATE",
      resource: "members",
      resourceId: id,
      oldValues: { name: existing.name, status: existing.status },
      newValues: { name: updated.name, status: updated.status },
      ipAddress: getClientIp(req),
    });

    return ok(updated, "Member updated");
  } catch {
    return serverError();
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
      return forbidden("Only admins can delete members");
    }

    const { id } = await params;
    const existing = await getMemberById(parseInt(id));
    if (!existing) return notFound("Member not found");

    await deleteMember(parseInt(id));

    const userId = req.headers.get("x-user-id");
    await createAuditLog({
      userId: userId ? parseInt(userId) : undefined,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "DELETE",
      resource: "members",
      resourceId: id,
      oldValues: { membershipId: existing.membershipId, name: existing.name },
      ipAddress: getClientIp(req),
    });

    return ok(null, "Member deleted");
  } catch {
    return serverError();
  }
}
