import { NextRequest } from "next/server";
import { ok, error, serverError } from "@/lib/api/response";
import { rateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { lookupMemberByBothFields } from "@/lib/services/member.service";
import { createPdfToken } from "@/lib/pdf-tokens";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/members/card/lookup?memberId=FTTD260001&phone=9876543210
 *
 * Public endpoint. Both memberId and phone are required and must match the same
 * ACTIVE member. Returns the member's UUID on success.
 *
 * Rate-limited: 10 requests per minute per IP.
 */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = rateLimit(`card-lookup:${ip}`, 10, 60 * 1000);
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
    const setting = await prisma.$queryRaw<{ enableIdCard: boolean }[]>`
      SELECT enableIdCard FROM association_settings WHERE id = 1 LIMIT 1
    `;
    if (!(setting[0]?.enableIdCard ?? true)) {
      return error("ID card feature is not available.");
    }

    const memberId = req.nextUrl.searchParams.get("memberId")?.trim();
    const phone = req.nextUrl.searchParams.get("phone")?.trim();

    if (!memberId) return error("Membership ID is required.");
    if (!phone) return error("Phone number is required.");
    if (!/^\d{10}$/.test(phone)) return error("Phone number must be exactly 10 digits.");
    if (memberId.length < 3) return error("Invalid Membership ID.");

    const uuid = await lookupMemberByBothFields(memberId, phone);
    if (!uuid) {
      return error("No active member found with that Membership ID and phone number combination.");
    }

    // Issue a single-use, 10-minute PDF token so the client can open the
    // clean PDF URL (/members/id-card/pdf/[token]) without an /api/ path.
    const pdfToken = createPdfToken(uuid);

    return ok({ uuid, pdfToken });
  } catch (err) {
    console.error("GET /api/members/card/lookup error:", err);
    return serverError();
  }
}
