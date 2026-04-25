
import { NextRequest } from "next/server";
import { extendMemberValidity } from "@/lib/services/member.service";
import { ok, serverError, forbidden, notFound } from "@/lib/api/response";
import { useServerAuth } from "@/lib/api/server-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { hasPermission } = await useServerAuth();
  if (!hasPermission("members:update")) return forbidden();

  const { id: idStr } = await params;
  const id = parseInt(idStr);
  if (isNaN(id)) return notFound();

  try {
    const { years = 1 } = await req.json();
    const updated = await extendMemberValidity(id, years);
    return ok(updated);
  } catch (err: any) {
    console.error("Member Renewal Error:", err);
    return serverError(err.message || "Failed to renew member");
  }
}
