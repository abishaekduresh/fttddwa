import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page     = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));
    const offset   = (page - 1) * pageSize;

    const [rows, countRows] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT id, triggeredBy, istDate, processed, enqueued, skipped, failed,
               stoppedReason, skippedDetails, errors, diagnostics, durationMs, createdAt
        FROM whatsapp_cron_logs
        ORDER BY createdAt DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `,
      prisma.$queryRaw<{ total: string }[]>`
        SELECT CAST(COUNT(*) AS CHAR) AS total FROM whatsapp_cron_logs
      `,
    ]);

    const total      = parseInt(countRows[0]?.total || "0", 10);
    const totalPages = Math.ceil(total / pageSize);

    const logs = rows.map(r => ({
      ...r,
      skippedDetails: typeof r.skippedDetails === "string" ? JSON.parse(r.skippedDetails) : (r.skippedDetails ?? []),
      errors:         typeof r.errors === "string"         ? JSON.parse(r.errors)         : (r.errors ?? []),
      diagnostics:    typeof r.diagnostics === "string"    ? JSON.parse(r.diagnostics)    : (r.diagnostics ?? {}),
    }));

    return ok({
      logs,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  } catch (err) {
    return serverError(err);
  }
}
