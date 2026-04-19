import { NextRequest } from "next/server";
import { getRoles } from "@/lib/services/user.service";
import { ok, serverError } from "@/lib/api/response";

export async function GET(_req: NextRequest) {
  try {
    const roles = await getRoles();
    return ok(roles);
  } catch {
    return serverError();
  }
}
