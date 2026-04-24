import { NextRequest, NextResponse } from "next/server";
import { generateIdCardPdf } from "@/lib/services/id-card-pdf";
import { rateLimit, getClientIp } from "@/lib/security/rate-limiter";

/**
 * GET /api/members/card/[uuid]/pdf
 * 
 * Admin/Internal API route for generating the member ID card PDF.
 * Requires admin authentication (handled by middleware).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const ip = getClientIp(req);
  const limit = rateLimit(`admin-card-pdf:${ip}`, 20, 60 * 1000);
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

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${uuid}-id-card.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
