import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { getMemberCardByUuid } from "@/lib/services/member.service";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/security/rate-limiter";

function fmtDate(d: string | Date | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return ""; }
}

/** Fetch an image URL and convert to JPEG buffer for pdfkit compatibility. */
async function fetchImageAsJpeg(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return await sharp(buf).jpeg({ quality: 85 }).toBuffer();
  } catch {
    return null;
  }
}

/**
 * GET /api/members/card/[uuid]/pdf
 *
 * Generates and streams a membership ID card as a PDF.
 * Public endpoint — rate-limited 10 req/min per IP.
 * Opens inline in browser (Chrome/Firefox will display the PDF directly).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const ip = getClientIp(req);
  const limit = rateLimit(`card-pdf:${ip}`, 10, 60 * 1000);
  if (!limit.success) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  try {
    const { uuid } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
      return new NextResponse("Not found", { status: 404 });
    }

    const [memberRow, settingRows] = await Promise.all([
      getMemberCardByUuid(uuid),
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
    if (setting?.idCardSettings) {
      try {
        cs = typeof setting.idCardSettings === "string"
          ? JSON.parse(setting.idCardSettings)
          : setting.idCardSettings;
      } catch {}
    }
    const s = {
      primaryColor:     (cs.primaryColor    as string) || "#1e40af",
      secondaryColor:   (cs.secondaryColor  as string) || "#ffffff",
      headerTextColor:  (cs.headerTextColor as string) || "#ffffff",
      cardTitle:        (cs.cardTitle       as string) || "Member ID Card",
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

    // ── Fetch images concurrently ──────────────────────────────────────────────
    const [logo1Buf, logo2Buf, photoBuf] = await Promise.all([
      setting?.logo1Url ? fetchImageAsJpeg(setting.logo1Url) : Promise.resolve(null),
      setting?.logo2Url ? fetchImageAsJpeg(setting.logo2Url) : Promise.resolve(null),
      (s.showPhoto && memberRow.photoUrl) ? fetchImageAsJpeg(memberRow.photoUrl) : Promise.resolve(null),
    ]);

    // ── Build PDF ──────────────────────────────────────────────────────────────
    const W = 400;
    const H = 260;
    const HEADER_H = 72;
    const FOOTER_H = 26;
    const BODY_Y = HEADER_H;
    const BODY_H = H - HEADER_H - FOOTER_H;
    const PAD = 14;
    const PHOTO_SIZE = 72;
    const LOGO_SIZE = 46;

    const doc = new PDFDocument({
      size: [W, H],
      margin: 0,
      info: {
        Title: `${memberRow.membershipId} — Member ID Card`,
        Author: setting?.name || "Association",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    const pdfDone = new Promise<void>((resolve) => doc.on("end", resolve));

    // ── Header ──────────────────────────────────────────────────────────────────
    doc.rect(0, 0, W, HEADER_H).fill(s.primaryColor);

    const hasLogo = Boolean(logo1Buf || logo2Buf);
    const logoPad = hasLogo ? LOGO_SIZE + 16 : PAD;
    const textW = W - logoPad * 2;
    const LOGO_Y = (HEADER_H - LOGO_SIZE) / 2;

    if (logo1Buf) {
      try { doc.image(logo1Buf, 12, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {}
    }
    if (logo2Buf) {
      try { doc.image(logo2Buf, W - LOGO_SIZE - 12, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {}
    }

    doc.fillColor(s.headerTextColor)
       .font("Helvetica-Bold").fontSize(10.5)
       .text(setting?.name || "Association", logoPad, 14, { width: textW, align: "center", lineBreak: false });

    doc.font("Helvetica").fontSize(7.5)
       .text(s.cardTitle, logoPad, 30, { width: textW, align: "center", lineBreak: false });

    doc.moveTo(logoPad + 10, 46).lineTo(W - logoPad - 10, 46)
       .lineWidth(0.4).strokeColor(s.headerTextColor).stroke();

    if (setting?.shortName) {
      doc.fillColor(s.headerTextColor).font("Helvetica").fontSize(7)
         .text(setting.shortName, 0, 53, { width: W, align: "center", lineBreak: false });
    }

    // ── Body background ────────────────────────────────────────────────────────
    doc.rect(0, BODY_Y, W, BODY_H).fill(s.secondaryColor);

    // ── Photo area ─────────────────────────────────────────────────────────────
    const PHOTO_X = PAD;
    const PHOTO_Y_POS = BODY_Y + (BODY_H - PHOTO_SIZE) / 2 - 2;
    const CONTENT_X = s.showPhoto ? PHOTO_X + PHOTO_SIZE + 10 : PAD;
    const CONTENT_W = W - CONTENT_X - PAD;

    if (s.showPhoto) {
      doc.rect(PHOTO_X, PHOTO_Y_POS, PHOTO_SIZE, PHOTO_SIZE)
         .lineWidth(1.5).strokeColor(s.primaryColor).stroke();

      if (photoBuf) {
        try {
          doc.image(photoBuf, PHOTO_X + 2, PHOTO_Y_POS + 2, {
            width: PHOTO_SIZE - 4, height: PHOTO_SIZE - 4,
            cover: [PHOTO_SIZE - 4, PHOTO_SIZE - 4],
          });
        } catch {
          // fallback: initial letter
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

    // ── Member details ─────────────────────────────────────────────────────────
    const LINE_GAP = 12;
    const SMALL_GAP = 11;
    let cy = BODY_Y + 10;

    doc.fillColor("#111111").font("Helvetica-Bold").fontSize(12.5)
       .text(memberRow.name, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
    cy += LINE_GAP + 2;

    if (s.showMembershipId) {
      doc.fillColor(s.primaryColor).font("Helvetica-Bold").fontSize(9)
         .text(`\u2713 ${memberRow.membershipId}`, CONTENT_X, cy, { width: CONTENT_W, lineBreak: false });
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

    // ── Footer ──────────────────────────────────────────────────────────────────
    doc.rect(0, H - FOOTER_H, W, FOOTER_H).fill("#eef2ff");

    const footerLine = [
      setting?.regNumber ? `Reg. No: ${setting.regNumber}` : null,
      setting?.tagline   ? setting.tagline                  : null,
    ].filter(Boolean).join("   |   ");

    if (footerLine) {
      doc.fillColor("#6b7280").font("Helvetica").fontSize(7.5)
         .text(footerLine, 0, H - FOOTER_H + 9, { width: W, align: "center", lineBreak: false });
    }

    // ── Finalise ────────────────────────────────────────────────────────────────
    doc.end();
    await pdfDone;

    return new NextResponse(Buffer.concat(chunks), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${memberRow.membershipId}-id-card.pdf"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("GET /api/members/card/[uuid]/pdf error:", err);
    return new NextResponse("PDF generation failed", { status: 500 });
  }
}
