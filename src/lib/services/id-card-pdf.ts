import PDFDocument from "pdfkit";
import sharp from "sharp";
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
  if (!url) return null;
  try {
    let finalUrl = url;
    if (url.startsWith("/")) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      finalUrl = `${baseUrl}${url}`;
    }
    const res = await fetch(finalUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer())).jpeg({ quality: 85 }).toBuffer();
  } catch (err) { 
    console.error(`PDF Gen: Failed to fetch image ${url}`, err);
    return null; 
  }
}

/**
 * Generates the Member ID Card PDF.
 * Returns a Buffer containing the PDF data.
 */
export async function generateIdCardPdf(memberUuid: string): Promise<Buffer | null> {
  // 1. Load member + settings
  const [memberRow, settingRows] = await Promise.all([
    getMemberCardByUuid(memberUuid),
    prisma.$queryRaw<any[]>`
      SELECT 
        enableIdCard, idCardSettings, name, nameTamil, shortName, shortNameTamil, 
        logo1Url, logo2Url, tagline, taglineTamil, regNumber, address, addressTamil, 
        state, stateTamil, email, phone,
        sigChairmanUrl, sigPresidentUrl, sigVicePresidentUrl, sigSecretaryUrl, sigJointSecretaryUrl, sigTreasurerUrl
      FROM association_settings WHERE id = 1 LIMIT 1
    `,
  ]);

  const setting = settingRows[0];
  if (!(setting?.enableIdCard ?? true) || !memberRow) {
    return null;
  }

  // 2. Merge idCardSettings with defaults
  let cs: Record<string, unknown> = {};
  try {
    if (setting?.idCardSettings) {
      cs = typeof setting.idCardSettings === "string"
        ? JSON.parse(setting.idCardSettings)
        : setting.idCardSettings;
    }
  } catch {}

  const s = {
    primaryColor:     (cs.primaryColor    as string) || "#1e293b", // Default to Slate-800
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

  // 3. Fetch images
  const [logo1Buf, logo2Buf, photoBuf, sigBuf] = await Promise.all([
    setting?.logo1Url ? fetchImageAsJpeg(setting.logo1Url) : Promise.resolve(null),
    setting?.logo2Url ? fetchImageAsJpeg(setting.logo2Url) : Promise.resolve(null),
    (s.showPhoto && memberRow.photoUrl) ? fetchImageAsJpeg(memberRow.photoUrl) : Promise.resolve(null),
    setting?.sigChairmanUrl ? fetchImageAsJpeg(setting.sigChairmanUrl) : Promise.resolve(null),
  ]);

  // 4. Build PDF
  const W = 260, H = 410; // Portrait orientation
  const doc = new PDFDocument({
    size: [W, H], margin: 0,
    info: { Title: `${memberRow.membershipId} — Member ID Card`, Author: setting?.name || "Association" },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const pdfDone = new Promise<void>((resolve) => doc.on("end", resolve));

  // Colors
  const PRIMARY = s.primaryColor;
  const ACCENT = "#0f172a"; // Slate-900
  const COLOR_TEXT = "#334155"; // Slate-700
  const COLOR_MUTED = "#64748b"; // Slate-500
  const COLOR_WHITE = "#ffffff";
  const COLOR_GOLD = "#ca8a04"; // Professional accent
  const COLOR_PINK = "#db2777"; // Pink-600
  const COLOR_BLUE = "#2563eb"; // Blue-600

  // --- Header Section ---
  const HEADER_H = 110;
  
  // Gradient background for header
  const grad = doc.linearGradient(0, 0, 0, HEADER_H);
  grad.stop(0, "#1e293b").stop(1, "#0f172a");
  doc.rect(0, 0, W, HEADER_H).fill(grad);

  // Logos
  const LOGO_SIZE = 44;
  const LOGO_Y = 15;
  if (logo1Buf) { try { doc.image(logo1Buf, 15, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {} }
  if (logo2Buf) { try { doc.image(logo2Buf, W - LOGO_SIZE - 15, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {} }

  // Association Name & Details
  doc.fillColor(COLOR_WHITE).font("Helvetica-Bold").fontSize(10)
     .text(setting?.name || "Association", 65, LOGO_Y + 2, { width: W - 130, align: "center", lineGap: 1 });
  
  doc.font("Helvetica").fontSize(7).fillColor("#cbd5e1")
     .text(setting?.regNumber ? `Reg. No: ${setting.regNumber}` : "", 0, 50, { width: W, align: "center" })
     .text(setting?.address || "", 15, 60, { width: W - 30, align: "center" })
     .text(`${setting?.state || "Tamil Nadu"} | Cell: ${setting?.phone || ""}`, 0, 80, { width: W, align: "center" });

  // --- Identity Section ---
  const PHOTO_W = 85, PHOTO_H = 100;
  const PHOTO_X = 15, PHOTO_Y = HEADER_H + 20;
  
  // Photo with clean border and shadow
  doc.save();
  doc.rect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H).lineWidth(1.5).strokeColor("#e2e8f0").stroke();
  
  if (photoBuf) {
    try {
      doc.image(photoBuf, PHOTO_X + 2, PHOTO_Y + 2, {
        width: PHOTO_W - 4, height: PHOTO_H - 4, cover: [PHOTO_W - 4, PHOTO_H - 4],
      });
    } catch {
      doc.rect(PHOTO_X + 2, PHOTO_Y + 2, PHOTO_W - 4, PHOTO_H - 4).fill("#f8fafc");
    }
  } else {
    // Placeholder if no photo
    doc.rect(PHOTO_X + 2, PHOTO_Y + 2, PHOTO_W - 4, PHOTO_H - 4).fill("#f1f5f9");
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(8)
       .text("NO PHOTO", PHOTO_X, PHOTO_Y + 45, { width: PHOTO_W, align: "center" });
  }
  doc.restore();

  // Name & Position Bar
  const NAME_X = PHOTO_X + PHOTO_W + 12;
  const NAME_Y = PHOTO_Y + 15;
  const NAME_W = W - NAME_X - 15;

  doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(13)
     .text(memberRow.name.toUpperCase(), NAME_X, NAME_Y, { width: NAME_W, align: "left" });
  
  doc.fillColor(COLOR_GOLD).font("Helvetica-Bold").fontSize(9)
     .text(memberRow.position?.toUpperCase() || "MEMBER", NAME_X, NAME_Y + 18, { width: NAME_W, align: "left" });

  // --- Business Section ---
  let cy = PHOTO_Y + PHOTO_H + 20;
  
  if (s.showBusinessName && memberRow.businessName) {
    doc.fillColor(COLOR_PINK).font("Helvetica-Bold").fontSize(11)
       .text(memberRow.businessName.toUpperCase(), 15, cy, { width: W - 30, align: "center" });
    cy += 14;
    
    const location = [memberRow.village, memberRow.taluk, memberRow.district].filter(Boolean).join(", ");
    doc.fillColor(COLOR_BLUE).font("Helvetica-Bold").fontSize(9)
       .text(location, 15, cy, { width: W - 30, align: "center" });
    cy += 20;
  }

  // Divider
  doc.moveTo(25, cy).lineTo(W - 25, cy).lineWidth(0.5).strokeColor("#e2e8f0").stroke();
  cy += 15;

  // --- Details Grid ---
  const LABEL_X = 30, VALUE_X = 95;
  const ROW_H = 18;
  doc.fontSize(9.5);

  const drawRow = (label: string, value: string) => {
    doc.fillColor(COLOR_MUTED).font("Helvetica").text(label, LABEL_X, cy)
       .fillColor(COLOR_TEXT).font("Helvetica-Bold").text(value, VALUE_X, cy);
    cy += ROW_H;
  };

  if (s.showPhone) drawRow("Cell No", memberRow.phone);
  
  if (s.showJoinedAt) {
    const startYear = new Date(memberRow.joinedAt).getFullYear();
    drawRow("Validity", `${startYear} - ${startYear + 2}`);
  }
  
  if (s.showMembershipId) drawRow("ID Number", memberRow.membershipId);

  // --- Footer Section ---
  const FOOTER_H = 45;
  const FOOTER_Y = H - FOOTER_H;

  // Signature placement
  if (sigBuf) {
    try {
      const SIG_W = 70;
      doc.image(sigBuf, W - SIG_W - 20, FOOTER_Y - 45, { width: SIG_W, height: 30, fit: [SIG_W, 30] });
    } catch {}
  }
  
  // Signature text/name above the bar
  doc.fillColor(COLOR_PINK).font("Helvetica-Oblique").fontSize(9)
     .text(memberRow.name, W - 115, FOOTER_Y - 12, { width: 100, align: "center" });

  // Bottom Bar
  doc.rect(0, FOOTER_Y, W, FOOTER_H).fill("#16a34a"); // Success-600 Green
  
  doc.fillColor(COLOR_WHITE).font("Helvetica-Bold").fontSize(10)
     .text("STATE CHAIRMAN", 0, FOOTER_Y + 16, { width: W, align: "center" });

  doc.end();
  await pdfDone;
  return Buffer.concat(chunks);
}
