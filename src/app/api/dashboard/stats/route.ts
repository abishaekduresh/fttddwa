import { NextRequest } from "next/server";
import { getDashboardStats } from "@/lib/services/dashboard.service";
import { ok, serverError } from "@/lib/api/response";

export async function GET(_req: NextRequest) {
  try {
    const stats = await getDashboardStats();
    return ok(stats);
  } catch {
    return serverError();
  }
}
