import { NextRequest } from "next/server";
import { createMember, parseMemberUniqueError } from "@/lib/services/member.service";
import { createMemberSchema } from "@/lib/validation/member.schema";
import { created, error, serverError } from "@/lib/api/response";
import { getClientIp } from "@/lib/security/rate-limiter";
import { createAuditLog } from "@/lib/services/audit.service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Check if public registration is enabled
    const row = await prisma.$queryRaw<{ enableMemberRegistration: boolean }[]>`
      SELECT enableMemberRegistration FROM association_settings WHERE id = 1 LIMIT 1
    `;
    const enabled = row[0]?.enableMemberRegistration ?? true;
    if (!enabled) {
      return error("Member registration is currently disabled.", 403);
    }

    const body = await req.json();
    const parsed = createMemberSchema.safeParse(body);

    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const { aadhaar, dateOfBirth, weddingDate, ...rest } = parsed.data;

    const member = await createMember({
      ...rest,
      email: rest.email || undefined,
      aadhaarHash: aadhaar || undefined,
      dateOfBirth: dateOfBirth && dateOfBirth !== "" ? new Date(dateOfBirth) : undefined,
      weddingDate: weddingDate && weddingDate !== "" ? new Date(weddingDate) : undefined,
      // No createdById — self-registration
    });

    await createAuditLog({
      action: "CREATE",
      resource: "members",
      resourceId: member.id,
      newValues: { membershipId: member.membershipId, name: member.name, via: "self-registration" },
      ipAddress: getClientIp(req),
    });

    return created(
      { membershipId: member.membershipId, name: member.name },
      "Registration submitted successfully. Your membership is pending approval."
    );
  } catch (err) {
    const uniqueErrors = parseMemberUniqueError(err);
    if (uniqueErrors) return error("Duplicate value", 409, uniqueErrors);
    console.error("POST /members/register error:", err);
    return serverError();
  }
}
