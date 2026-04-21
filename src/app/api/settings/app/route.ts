import { ok, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const row = await prisma.$queryRaw<any[]>`
      SELECT enableMemberRegistration, name, tagline, logo1Url FROM association_settings WHERE id = 1 LIMIT 1
    `;
    return ok({
      enableMemberRegistration: row[0]?.enableMemberRegistration ?? true,
      name: row[0]?.name,
      tagline: row[0]?.tagline,
      logo1Url: row[0]?.logo1Url,
    });
  } catch (err) {
    console.error("GET /api/settings/app error:", err);
    return serverError();
  }
}
