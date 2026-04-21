import { NextRequest } from "next/server";
import { forbidden, serverError, paginatedOk } from "@/lib/api/response";
import { logFilterSchema } from "@/lib/validation/whatsapp.schema";
import { getWhatsappLogs } from "@/lib/services/whatsapp-log.service";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY", "VIEWER"].includes(role || "")) {
      return forbidden();
    }

    const { searchParams } = req.nextUrl;
    const rawParams = Object.fromEntries(searchParams);

    // Strip any empty-string values before Zod parsing to prevent enum validation errors
    const cleanParams = Object.fromEntries(
      Object.entries(rawParams).filter(([, v]) => v !== "")
    );

    const parsed = logFilterSchema.safeParse(cleanParams);
    if (!parsed.success) {
      const { error } = await import("@/lib/api/response");
      return error("Invalid filters", 400);
    }

    const { logs, total } = await getWhatsappLogs(parsed.data);
    const { page, pageSize } = parsed.data;
    const totalPages = Math.ceil(total / pageSize);

    return paginatedOk(logs, {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    });
  } catch (err) {
    return serverError(err);
  }
}
