import { NextRequest } from "next/server";
import { ok, notFound, serverError } from "@/lib/api/response";
import { rateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { getMemberCardByUuid } from "@/lib/services/member.service";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/members/card/[uuid]
 *
 * Public endpoint. Returns the member's card data (public fields only)
 * plus the association's idCardSettings for rendering the card.
 *
 * Rate-limited: 30 requests per minute per IP.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const ip = getClientIp(req);
  const limit = rateLimit(`card-view:${ip}`, 30, 60 * 1000);
  if (!limit.success) {
    return new Response(
      JSON.stringify({ success: false, message: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((limit.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const { uuid } = await params;

    // Validate UUID format (basic check to avoid unnecessary DB queries)
    if (!uuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
      return notFound("Member not found.");
    }

    // Check feature enabled + fetch association settings in parallel
    const [memberRow, settingRows] = await Promise.all([
      getMemberCardByUuid(uuid),
      prisma.$queryRaw<any[]>`
        SELECT enableIdCard, idCardSettings, name, nameTamil, shortName, logo1Url, logo2Url, tagline, regNumber, address, addressTamil, state, phone, sigChairmanUrl
        FROM association_settings WHERE id = 1 LIMIT 1
      `,
    ]);

    const setting = settingRows[0];
    const enabled = setting?.enableIdCard ?? true;
    if (!enabled) {
      return notFound("ID card feature is not available.");
    }

    if (!memberRow) {
      return notFound("Member not found.");
    }

    let idCardSettings = null;
    if (setting?.idCardSettings) {
      try {
        idCardSettings = typeof setting.idCardSettings === "string"
          ? JSON.parse(setting.idCardSettings)
          : setting.idCardSettings;
      } catch {}
    }

    return ok({
      member: memberRow,
      association: {
        name: setting?.name,
        nameTamil: setting?.nameTamil,
        shortName: setting?.shortName,
        logo1Url: setting?.logo1Url,
        logo2Url: setting?.logo2Url,
        tagline: setting?.tagline,
        regNumber: setting?.regNumber,
        address: setting?.address,
        addressTamil: setting?.addressTamil,
        state: setting?.state,
        phone: setting?.phone,
        sigChairmanUrl: setting?.sigChairmanUrl,
      },
      idCardSettings,
    });
  } catch (err) {
    console.error("GET /api/members/card/[uuid] error:", err);
    return serverError();
  }
}
