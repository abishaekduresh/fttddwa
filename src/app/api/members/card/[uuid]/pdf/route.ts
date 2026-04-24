import { NextRequest, NextResponse } from "next/server";
import { generateIdCardPdf } from "@/lib/services/id-card-pdf";
import { rateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { verifyAccessToken } from "@/lib/jwt";

/**
 * GET /api/members/card/[uuid]/pdf
 *
 * Authenticated route — requires a valid user session.
 * The parent path /api/members/card is public (for QR scan), so auth is
 * verified inline here rather than relying on middleware injection.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  // Verify user token — accept cookie or Authorization header
  const token =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.cookies.get("access_token")?.value;

  if (!token) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return new NextResponse(
      JSON.stringify({ success: false, message: "Invalid or expired token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`admin-card-pdf:${payload.userId}`, 20, 60 * 1000);
  if (!limit.success) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  const { uuid } = await params;

  // Basic UUID format check
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    return new NextResponse("Invalid UUID", { status: 400 });
  }

  const pdfBuffer = await generateIdCardPdf(uuid);
  if (!pdfBuffer) {
    return new NextResponse("Member not found or feature disabled", { status: 404 });
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${uuid}-id-card.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
