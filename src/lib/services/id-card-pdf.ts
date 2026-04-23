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
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer())).jpeg({ quality: 85 }).toBuffer();
  } catch { return null; }
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
      SELECT enableIdCard, idCardSettings, name, nameTamil, shortName, shortNameTamil, logo1Url, logo2Url, tagline, taglineTamil, regNumber, address, addressTamil, state, stateTamil, email, phone
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
    primaryColor:     (cs.primaryColor    as string) || "#1e40af",
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
  const [logo1Buf, logo2Buf, photoBuf] = await Promise.all([
    setting?.logo1Url ? fetchImageAsJpeg(setting.logo1Url) : Promise.resolve(null),
    setting?.logo2Url ? fetchImageAsJpeg(setting.logo2Url) : Promise.resolve(null),
    (s.showPhoto && memberRow.photoUrl) ? fetchImageAsJpeg(memberRow.photoUrl) : Promise.resolve(null),
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
  const COLOR_DARK = "#1a1a1a";
  const COLOR_PINK = "#e91e63";
  const COLOR_BLUE = "#0277bd";
  const COLOR_GREEN = "#4caf50";
  const COLOR_WHITE = "#ffffff";

  // Header Section
  const HEADER_H = 100;
  doc.rect(0, 0, W, HEADER_H).fill(COLOR_DARK);

  const LOGO_SIZE = 48;
  const LOGO_Y = 10;
  if (logo1Buf) { try { doc.image(logo1Buf, 10, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {} }
  if (logo2Buf) { try { doc.image(logo2Buf, W - LOGO_SIZE - 10, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {} }

  doc.fillColor(COLOR_WHITE).font("Helvetica-Bold").fontSize(9)
     .text(setting?.name || "Association", 65, 15, { width: W - 130, align: "center" });
  
  doc.font("Helvetica").fontSize(7)
     .text(setting?.regNumber ? `Reg. No: ${setting.regNumber}` : "", 0, 45, { width: W, align: "center" })
     .text(setting?.address || "", 0, 55, { width: W, align: "center" })
     .text(setting?.state || "Tamil Nadu", 0, 65, { width: W, align: "center" })
     .text(`Cell : ${setting?.phone || ""}`, 0, 75, { width: W, align: "center" });

  // Identity Section (Photo + Name Bar)
  const PHOTO_W = 75, PHOTO_H = 85;
  const PHOTO_X = 15, PHOTO_Y = HEADER_H + 15;
  
  doc.rect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H).lineWidth(1).strokeColor("#880e4f").stroke();
  if (photoBuf) {
    try {
      doc.image(photoBuf, PHOTO_X + 2, PHOTO_Y + 2, {
        width: PHOTO_W - 4, height: PHOTO_H - 4, cover: [PHOTO_W - 4, PHOTO_H - 4],
      });
    } catch {
      doc.rect(PHOTO_X + 2, PHOTO_Y + 2, PHOTO_W - 4, PHOTO_H - 4).fill("#f5f5f5");
    }
  }

  const BAR_X = PHOTO_X + PHOTO_W + 5;
  const BAR_Y = PHOTO_Y + 20;
  const BAR_W = W - BAR_X - 10;
  const BAR_H = 35;
  doc.rect(BAR_X, BAR_Y, BAR_W, BAR_H).fill(COLOR_DARK);
  
  doc.fillColor(COLOR_WHITE).font("Helvetica-Bold").fontSize(11)
     .text(memberRow.name.toUpperCase(), BAR_X + 5, BAR_Y + 6, { width: BAR_W - 10, align: "center", lineBreak: false });
  doc.fontSize(8)
     .text(memberRow.position?.toUpperCase() || "MEMBER", BAR_X + 5, BAR_Y + 20, { width: BAR_W - 10, align: "center", lineBreak: false });

  // Business Section
  let cy = PHOTO_Y + PHOTO_H + 15;
  if (s.showBusinessName && memberRow.businessName) {
    doc.fillColor(COLOR_PINK).font("Helvetica-Bold").fontSize(12)
       .text(memberRow.businessName.toUpperCase(), 0, cy, { width: W, align: "center" });
    cy += 16;
    
    const location = [memberRow.village, memberRow.taluk].filter(Boolean).join(", ");
    doc.fillColor(COLOR_BLUE).font("Helvetica-Bold").fontSize(11)
       .text(location, 0, cy, { width: W, align: "center" });
    cy += 20;
  }

  doc.moveTo(20, cy).lineTo(W - 20, cy).lineWidth(0.5).strokeColor("#dddddd").stroke();
  cy += 10;

  // Details Section
  const LABEL_X = 35, VALUE_X = 100;
  const ROW_H = 18;
  doc.fillColor(COLOR_BLUE).font("Helvetica-Bold").fontSize(10);

  const drawRow = (label: string, value: string) => {
    doc.text(label, LABEL_X, cy)
       .text(":", VALUE_X - 10, cy)
       .text(value, VALUE_X, cy);
    cy += ROW_H;
  };

  if (s.showPhone) drawRow("Cell", memberRow.phone);
  if (s.showDateOfBirth && memberRow.dateOfBirth) drawRow("DOB", fmtDate(memberRow.dateOfBirth));
  
  if (s.showJoinedAt) {
    const start = new Date(memberRow.joinedAt).getFullYear();
    drawRow("Valid", `${start} - ${start + 2}`);
  }
  
  if (s.showMembershipId) drawRow("ID. No.", memberRow.membershipId);

  // Footer Section
  const FOOTER_Y = H - 35;
  const FOOTER_H_RECT = 35;
  doc.rect(0, FOOTER_Y, W, FOOTER_H_RECT).fill(COLOR_GREEN);

  doc.fillColor("#880e4f").font("Helvetica-Oblique").fontSize(10)
     .text(memberRow.name, W - 110, FOOTER_Y - 15, { width: 100, align: "center" });
  
  doc.fillColor(COLOR_WHITE).font("Helvetica").fontSize(9)
     .text("State Chairman", 0, FOOTER_Y + 12, { width: W, align: "center" });

  doc.end();
  await pdfDone;
  return Buffer.concat(chunks);
}
