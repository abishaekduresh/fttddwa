import { NextRequest } from "next/server";
import { createMember, getMembers, parseMemberUniqueError } from "@/lib/services/member.service";
import { createMemberSchema } from "@/lib/validation/member.schema";
import { ok, created, error, forbidden, serverError, paginatedOk } from "@/lib/api/response";
import { createAuditLog } from "@/lib/services/audit.service";
import { getPaginationParams, buildPaginationResult } from "@/lib/utils/pagination";
import { getClientIp } from "@/lib/security/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    const hasPermission = ["SUPER_ADMIN", "ADMIN", "DATA_ENTRY", "VIEWER"].includes(role || "");
    if (!hasPermission) return forbidden();

    const { searchParams } = new URL(req.url);
    const { page, pageSize } = getPaginationParams(searchParams);

    const filters = {
      search: searchParams.get("search") || undefined,
      district: searchParams.get("district") || undefined,
      taluk: searchParams.get("taluk") || undefined,
      status: searchParams.get("status") || undefined,
      page,
      pageSize,
    };

    const { members, total } = await getMembers(filters);
    const result = buildPaginationResult(members, total, page, pageSize);

    return paginatedOk(result.data, result.pagination);
  } catch (err) {
    console.error("GET /members error:", err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    const hasPermission = ["SUPER_ADMIN", "ADMIN", "DATA_ENTRY"].includes(role || "");
    if (!hasPermission) return forbidden("Insufficient permissions to create members");

    const body = await req.json();
    const parsed = createMemberSchema.safeParse(body);

    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const userId = req.headers.get("x-user-id");
    const { aadhaar, dateOfBirth, weddingDate, ...rest } = parsed.data;

    const member = await createMember({
      ...rest,
      email: rest.email || undefined,
      aadhaarHash: aadhaar || undefined,
      dateOfBirth: (dateOfBirth && dateOfBirth !== "") ? new Date(dateOfBirth) : undefined,
      weddingDate: (weddingDate && weddingDate !== "") ? new Date(weddingDate) : undefined,
      createdById: userId ? parseInt(userId) : undefined,
    });

    await createAuditLog({
      userId: userId ? parseInt(userId) : undefined,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "CREATE",
      resource: "members",
      resourceId: member.id,
      newValues: { membershipId: member.membershipId, name: member.name },
      ipAddress: getClientIp(req),
    });

    return created(member, "Member created successfully");
  } catch (err) {
    const uniqueErrors = parseMemberUniqueError(err);
    if (uniqueErrors) return error("Duplicate value", 409, uniqueErrors);
    console.error("POST /members error:", err);
    return serverError();
  }
}
