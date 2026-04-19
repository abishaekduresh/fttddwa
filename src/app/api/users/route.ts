import { NextRequest } from "next/server";
import { createUser, getUsers } from "@/lib/services/user.service";
import { createUserSchema } from "@/lib/validation/user.schema";
import { ok, created, error, forbidden, serverError, paginatedOk } from "@/lib/api/response";
import { createAuditLog } from "@/lib/services/audit.service";
import { getPaginationParams, buildPaginationResult } from "@/lib/utils/pagination";
import { getClientIp } from "@/lib/security/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) return forbidden();

    const { searchParams } = new URL(req.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const { users, total } = await getUsers(page, pageSize);
    const result = buildPaginationResult(users, total, page, pageSize);
    return paginatedOk(result.data, result.pagination);
  } catch {
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) return forbidden("Insufficient permissions");

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const user = await createUser(parsed.data).catch((e: Error) => {
      if (e.message === "Email already in use") return null;
      throw e;
    });

    if (!user) return error("Email already in use", 409);

    const userId = req.headers.get("x-user-id");
    await createAuditLog({
      userId: userId ? parseInt(userId) : undefined,
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "CREATE",
      resource: "users",
      resourceId: (user as { id: number }).id,
      newValues: { email: parsed.data.email, role: parsed.data.roleId },
      ipAddress: getClientIp(req),
    });

    return created(user, "User created successfully");
  } catch {
    return serverError();
  }
}
