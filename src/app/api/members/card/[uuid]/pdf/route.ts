import { NextRequest, NextResponse } from "next/server";
import { generateIdCardPdf } from "@/lib/services/id-card-pdf";
import { rateLimit, getClientIp } from "@/lib/security/rate-limiter";
import { verifyAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

/** Render a styled HTML error page shown in the new tab when PDF cannot be generated. */
function htmlErrorPage(title: string, message: string, statusCode: number): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      padding: 1.5rem;
    }
    .card {
      background: #fff;
      border-radius: 1rem;
      padding: 2.5rem 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.35);
    }
    .icon {
      width: 64px; height: 64px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.25rem;
      font-size: 2rem;
    }
    .icon.warn  { background: #fef3c7; color: #d97706; }
    .icon.error { background: #fee2e2; color: #dc2626; }
    .icon.lock  { background: #e0e7ff; color: #4f46e5; }
    h1 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: .5rem; }
    p  { font-size: .9rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }
    .badge {
      display: inline-block;
      background: #f1f5f9;
      color: #475569;
      font-size: .75rem;
      font-weight: 600;
      letter-spacing: .05em;
      text-transform: uppercase;
      padding: .3rem .85rem;
      border-radius: 999px;
      margin-bottom: 1.5rem;
    }
    a {
      display: inline-block;
      margin-top: .5rem;
      font-size: .85rem;
      color: #3b82f6;
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon ${statusCode === 403 ? "lock" : statusCode === 404 ? "error" : "warn"}">
      ${statusCode === 403 ? "🔒" : statusCode === 404 ? "👤" : "⚠️"}
    </div>
    <span class="badge">ID Card — Error ${statusCode}</span>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="javascript:window.close()">Close this tab</a>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: statusCode,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

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
    return htmlErrorPage("Invalid Request", "The member ID card link is malformed or expired.", 400);
  }

  // ── Pre-flight: check member exists and status before generating the PDF ──
  const member = await prisma.member.findFirst({
    where: { uuid },
    select: { id: true, name: true, status: true, deletedAt: true },
  });

  if (!member || member.deletedAt) {
    return htmlErrorPage(
      "Member Not Found",
      "No member record was found for this ID. The member may have been removed from the system.",
      404
    );
  }

  if (member.status !== "ACTIVE") {
    const statusLabel: Record<string, string> = {
      PENDING:  "Pending Approval",
      INACTIVE: "Inactive",
      DELETED:  "Deleted",
    };
    const label = statusLabel[member.status as string] ?? member.status;
    return htmlErrorPage(
      "ID Card Unavailable",
      `The ID card cannot be generated because <strong>${member.name}</strong>'s membership is currently <strong>${label}</strong>.<br><br>The member must be <strong>Active</strong> before an ID card can be printed. Please update the member's status and try again.`,
      403
    );
  }

  // ── Check if ID card feature is enabled ──
  const setting = await prisma.associationSetting.findUnique({
    where: { id: 1 },
    select: { enableIdCard: true },
  });

  if (!setting?.enableIdCard) {
    return htmlErrorPage(
      "Feature Disabled",
      "The ID card feature is currently disabled by the administrator. Please enable it in Settings before generating ID cards.",
      403
    );
  }

  const pdfBuffer = await generateIdCardPdf(uuid);
  if (!pdfBuffer) {
    return htmlErrorPage(
      "Could Not Generate PDF",
      "The ID card PDF could not be created. This may be a temporary issue — please try again. If the problem persists, contact the system administrator.",
      500
    );
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${uuid}-id-card.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
