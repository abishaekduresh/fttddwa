import { NextRequest } from "next/server";
import { getAuditLogs } from "@/lib/services/audit.service";
import { forbidden, paginatedOk, serverError } from "@/lib/api/response";
import { getPaginationParams, buildPaginationResult } from "@/lib/utils/pagination";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) return forbidden();

    const { searchParams } = new URL(req.url);
    const { page, pageSize } = getPaginationParams(searchParams);
    const resource = searchParams.get("resource") || undefined;
    const action = searchParams.get("action") || undefined;

    const { logs, total } = await getAuditLogs({ page, pageSize, resource, action });
    const result = buildPaginationResult(logs, total, page, pageSize);
    return paginatedOk(result.data, result.pagination);
  } catch {
    return serverError();
  }
}
