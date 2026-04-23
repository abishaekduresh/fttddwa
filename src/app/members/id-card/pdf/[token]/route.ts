import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { consumePdfToken } from "@/lib/pdf-tokens";
import { getMemberCardByUuid } from "@/lib/services/member.service";
import { prisma } from "@/lib/prisma";

function fmtDate(d: string | Date | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return ""; }
}

async function fetchImageAsJpeg(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer())).jpeg({ quality: 85 }).toBuffer();
  } catch { return null; }
}

/**
 * GET /members/id-card/pdf/[token]
 *
 * Validates a single-use, 10-minute PDF token issued by the lookup endpoint.
 * On success: generates and returns the membership ID card as a PDF.
 * On failure (expired / already used): returns a 410 Gone response.
 *
 * Token is consumed immediately — the link can only be opened once.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // ── Validate & consume token ──────────────────────────────────────────────
  const memberUuid = consumePdfToken(token);
  if (!memberUuid) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Link Expired | FTTDDWA</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --error: #ef4444;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --bg: #f8fafc;
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: radial-gradient(circle at top right, #e2e8f0, var(--bg));
            color: var(--text-main);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 1.5rem;
          }
          .card {
            background: #ffffff;
            padding: 2.5rem 2rem;
            border-radius: 1.5rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
            max-width: 440px;
            width: 100%;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(8px);
          }
          .icon-box {
            width: 64px;
            height: 64px;
            background: #fef2f2;
            border-radius: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            color: var(--error);
          }
          h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-main);
            margin-bottom: 0.75rem;
            letter-spacing: -0.025em;
          }
          p {
            color: var(--text-muted);
            font-size: 0.9375rem;
            line-height: 1.6;
            margin-bottom: 2rem;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: var(--primary);
            color: #ffffff;
            padding: 0.75rem 1.75rem;
            border-radius: 0.75rem;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9375rem;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
          }
          .btn:hover {
            background: var(--primary-hover);
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
          }
          .btn:active {
            transform: translateY(0);
          }
          @media (max-width: 480px) {
            .card { padding: 2rem 1.5rem; }
            h2 { font-size: 1.25rem; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h2>Link Expired or Already Used</h2>
          <p>This secure PDF link is single-use and valid for 10 minutes only. Please verify your details again to generate a new link.</p>
          <a href="/members/id-card" class="btn">Verify Again</a>
        </div>
      </body>
      </html>`,
      { status: 410, headers: { "Content-Type": "text/html" } }
    );
  }

  // ── Load member + settings ─────────────────────────────────────────────────
  const [memberRow, settingRows] = await Promise.all([
    getMemberCardByUuid(memberUuid),
    prisma.$queryRaw<any[]>`
      SELECT enableIdCard, idCardSettings, name, shortName, logo1Url, logo2Url, tagline, regNumber
      FROM association_settings WHERE id = 1 LIMIT 1
    `,
  ]);

  const setting = settingRows[0];
  if (!(setting?.enableIdCard ?? true) || !memberRow) {
    return new NextResponse("Not found", { status: 404 });
  }

  // ── Merge idCardSettings with defaults ─────────────────────────────────────
  let cs: Record<string, unknown> = {};
  try {
    if (setting?.idCardSettings) {
      cs = typeof setting.idCardSettings === "string"
        ? JSON.parse(setting.idCardSettings)
        : setting.idCardSettings;
    }
  } catch {}

  const s = {
    primaryColor:     (cs.primaryColor    as string)  || "#1e40af",
    secondaryColor:   (cs.secondaryColor  as string)  || "#ffffff",
    headerTextColor:  (cs.headerTextColor as string)  || "#ffffff",
    cardTitle:        (cs.cardTitle       as string)  || "Member ID Card",
    showPhoto:        (cs.showPhoto        as boolean) ?? true,
    showMembershipId: (cs.showMembershipId as boolean) ?? true,
    showPhone:        (cs.showPhone        as boolean) ?? true,
    showEmail:        (cs.showEmail        as boolean) ?? false,
    showAddress:      (cs.showAddress      as boolean) ?? true,
    showDateOfBirth:  (cs.showDateOfBirth  as boolean) ?? false,
    showBusinessName: (cs.showBusinessName as boolean) ?? true,
    showPosition:     (cs.showPosition     as boolean) ?? true,
    showJoinedAt:     (cs.showJoinedAt     as boolean) ?? true,
  };

  // ── Fetch images ───────────────────────────────────────────────────────────
  const [logo1Buf, logo2Buf, photoBuf] = await Promise.all([
    setting?.logo1Url ? fetchImageAsJpeg(setting.logo1Url) : Promise.resolve(null),
    setting?.logo2Url ? fetchImageAsJpeg(setting.logo2Url) : Promise.resolve(null),
    (s.showPhoto && memberRow.photoUrl) ? fetchImageAsJpeg(memberRow.photoUrl) : Promise.resolve(null),
  ]);

  // ── Build PDF ──────────────────────────────────────────────────────────────
  const W = 400, H = 260;
  const HEADER_H = 72, FOOTER_H = 26;
  const BODY_Y = HEADER_H, BODY_H = H - HEADER_H - FOOTER_H;
  const PAD = 14, PHOTO_SIZE = 72, LOGO_SIZE = 46;

  const doc = new PDFDocument({
    size: [W, H], margin: 0,
    info: { Title: `${memberRow.membershipId} — Member ID Card`, Author: setting?.name || "Association" },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const pdfDone = new Promise<void>((resolve) => doc.on("end", resolve));

  // Header
  doc.rect(0, 0, W, HEADER_H).fill(s.primaryColor);

  const hasLogo = Boolean(logo1Buf || logo2Buf);
  const logoPad = hasLogo ? LOGO_SIZE + 16 : PAD;
  const textW = W - logoPad * 2;
  const LOGO_Y = (HEADER_H - LOGO_SIZE) / 2;

  if (logo1Buf) { try { doc.image(logo1Buf, 12, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {} }
  if (logo2Buf) { try { doc.image(logo2Buf, W - LOGO_SIZE - 12, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {} }

  doc.fillColor(s.headerTextColor).font("Helvetica-Bold").fontSize(10.5)
     .text(setting?.name || "Association", logoPad, 14, { width: textW, align: "center", lineBreak: false });
  doc.font("Helvetica").fontSize(7.5)
     .text(s.cardTitle, logoPad, 30, { width: textW, align: "center", lineBreak: false });
  doc.moveTo(logoPad + 10, 46).lineTo(W - logoPad - 10, 46).lineWidth(0.4).strokeColor(s.headerTextColor).stroke();
  if (setting?.shortName) {
    doc.fillColor(s.headerTextColor).font("Helvetica").fontSize(7)
       .text(setting.shortName, 0, 53, { width: W, align: "center", lineBreak: false });
  }

  // Body
  doc.rect(0, BODY_Y, W, BODY_H).fill(s.secondaryColor);

  const PHOTO_X = PAD;
  const PHOTO_Y_POS = BODY_Y + (BODY_H - PHOTO_SIZE) / 2 - 2;
  const CONTENT_X = s.showPhoto ? PHOTO_X + PHOTO_SIZE + 10 : PAD;
  const CONTENT_W = W - CONTENT_X - PAD;

  if (s.showPhoto) {
    doc.rect(PHOTO_X, PHOTO_Y_POS, PHOTO_SIZE, PHOTO_SIZE).lineWidth(1.5).strokeColor(s.primaryColor).stroke();
    if (photoBuf) {
      try {
        doc.image(photoBuf, PHOTO_X + 2, PHOTO_Y_POS + 2, {
          width: PHOTO_SIZE - 4, height: PHOTO_SIZE - 4, cover: [PHOTO_SIZE - 4, PHOTO_SIZE - 4],
        });
      } catch {
        doc.rect(PHOTO_X + 2, PHOTO_Y_POS + 2, PHOTO_SIZE - 4, PHOTO_SIZE - 4).fill(`${s.primaryColor}22`);
        doc.fillColor(s.primaryColor).font("Helvetica-Bold").fontSize(28)
           .text(memberRow.name.charAt(0).toUpperCase(), PHOTO_X, PHOTO_Y_POS + 18, { width: PHOTO_SIZE, align: "center", lineBreak: false });
      }
    } else {
      doc.rect(PHOTO_X + 2, PHOTO_Y_POS + 2, PHOTO_SIZE - 4, PHOTO_SIZE - 4).fill(`${s.primaryColor}22`);
      doc.fillColor(s.primaryColor).font("Helvetica-Bold").fontSize(28)
         .text(memberRow.name.charAt(0).toUpperCase(), PHOTO_X, PHOTO_Y_POS + 18, { width: PHOTO_SIZE, align: "center", lineBreak: false });
    }
  }

  // Content
  const LINE_GAP = 13, SMALL_GAP = 11;
  let cy = BODY_Y + 10;

  doc.fillColor("#111111").font("Helvetica-Bold").fontSize(12.5)
     .text(memberRow.name, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
  cy += LINE_GAP + 2;

  if (s.showMembershipId) {
    doc.fillColor(s.primaryColor).font("Helvetica-Bold").fontSize(9)
       .text(`\u2713  ${memberRow.membershipId}`, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
    cy += LINE_GAP;
  }
  if (s.showPosition && memberRow.position) {
    doc.fillColor("#666666").font("Helvetica-Oblique").fontSize(8.5)
       .text(memberRow.position, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
    cy += SMALL_GAP;
  }
  if (s.showBusinessName && memberRow.businessName) {
    doc.fillColor("#2d2d2d").font("Helvetica").fontSize(8.5)
       .text(memberRow.businessName, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
    cy += SMALL_GAP;
  }
  if (s.showAddress) {
    const addr = [memberRow.taluk, memberRow.district, memberRow.state].filter(Boolean).join(", ");
    if (addr) {
      doc.fillColor("#555555").font("Helvetica").fontSize(8)
         .text(addr, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
      cy += SMALL_GAP;
    }
  }
  if (s.showPhone) {
    doc.fillColor("#222222").font("Helvetica").fontSize(8.5)
       .text(memberRow.phone, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
    cy += SMALL_GAP;
  }
  if (s.showEmail && memberRow.email) {
    doc.fillColor("#555555").font("Helvetica").fontSize(8)
       .text(memberRow.email, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
    cy += SMALL_GAP;
  }
  if (s.showDateOfBirth && memberRow.dateOfBirth) {
    doc.fillColor("#666666").font("Helvetica").fontSize(8)
       .text(`DOB: ${fmtDate(memberRow.dateOfBirth)}`, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
    cy += SMALL_GAP;
  }
  if (s.showJoinedAt) {
    doc.fillColor("#888888").font("Helvetica").fontSize(7.5)
       .text(`Member since ${fmtDate(memberRow.joinedAt)}`, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
  }

  // Footer
  doc.rect(0, H - FOOTER_H, W, FOOTER_H).fill("#eef2ff");
  const footerLine = [
    setting?.regNumber ? `Reg. No: ${setting.regNumber}` : null,
    setting?.tagline || null,
  ].filter(Boolean).join("   |   ");
  if (footerLine) {
    doc.fillColor("#6b7280").font("Helvetica").fontSize(7.5)
       .text(footerLine, 0, H - FOOTER_H + 9, { width: W, align: "center", lineBreak: false });
  }

  doc.end();
  await pdfDone;

  return new NextResponse(Buffer.concat(chunks), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${memberRow.membershipId}-id-card.pdf"`,
      "Cache-Control": "no-store", // single-use — must not be cached
    },
  });
}
