import { ok, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const row = await prisma.$queryRaw<any[]>`
      SELECT enableMemberRegistration, enableIdCard, idCardSettings, name, tagline, logo1Url
      FROM association_settings WHERE id = 1 LIMIT 1
    `;
    const r = row[0];
    let idCardSettings = null;
    if (r?.idCardSettings) {
      try { idCardSettings = typeof r.idCardSettings === "string" ? JSON.parse(r.idCardSettings) : r.idCardSettings; } catch {}
    }
    return ok({
      enableMemberRegistration: r?.enableMemberRegistration ?? true,
      enableIdCard: r?.enableIdCard ?? true,
      idCardSettings,
      name: r?.name,
      tagline: r?.tagline,
      logo1Url: r?.logo1Url,
    });
  } catch (err) {
    console.error("GET /api/settings/app error:", err);
    return serverError();
  }
}
