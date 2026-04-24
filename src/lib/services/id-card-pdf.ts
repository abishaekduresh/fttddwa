import PDFDocument from "pdfkit";
import sharp from "sharp";
import path from "path";
import { getMemberCardByUuid } from "@/lib/services/member.service";
import { prisma } from "@/lib/prisma";
import type { LayoutElement } from "@/lib/id-card-layout";

const TAMIL_FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSansTamil.ttf");

// ─── Layout-based renderer ─────────────────────────────────────────────────────
async function renderFromLayout(
  doc: InstanceType<typeof PDFDocument>,
  layout: LayoutElement[],
  data: Record<string, string>,
  images: Record<string, Buffer | null>,
  PRIMARY: string,
  PRIMARY_DARK: string,
  HDR_TEXT: string,
) {
  const rc = (c?: string) => {
    if (!c) return "#000000";
    if (c === "headerText")  return HDR_TEXT;
    if (c === "primary")     return PRIMARY;
    if (c === "primaryDark") return PRIMARY_DARK;
    return c;
  };

  const sorted = [...layout].filter(e => e.visible).sort((a, b) => a.zIndex - b.zIndex);
  
  // Track dynamic Y positions for stack groups
  const groupY: Record<string, number> = {};
  const groupLastY: Record<string, number> = {};

  for (const el of sorted) {
    let currentX = el.x;
    let currentY = el.y;

    // Apply stacking if in a group
    if (el.stackGroup) {
      if (groupY[el.stackGroup] !== undefined) {
        // Calculate the relative gap from the original layout
        const prevOrigY = groupLastY[el.stackGroup] || 0;
        const gap = Math.max(0, el.y - prevOrigY);
        currentY = groupY[el.stackGroup] + gap;
      }
    }

    switch (el.type) {
      case "rect": {
        if (el.gradient || el.bgColor === "primary" || el.bgColor === "primaryDark") {
          const base = rc(el.bgColor);
          const g = doc.linearGradient(currentX, currentY, currentX + el.w, currentY + el.h);
          g.stop(0, base).stop(1, PRIMARY_DARK);
          doc.rect(currentX, currentY, el.w, el.h).fill(g);
        } else {
          doc.rect(currentX, currentY, el.w, el.h).fill(rc(el.bgColor) || "#f0f0f0");
        }
        if (el.stackGroup) {
          groupY[el.stackGroup] = currentY + el.h;
          groupLastY[el.stackGroup] = el.y + el.h;
        }
        break;
      }

      case "line":
        doc.moveTo(currentX, currentY).lineTo(currentX + el.w, currentY)
           .lineWidth(Math.max(el.h, 0.5)).strokeColor(el.color || "#e2e8f0").stroke();
        if (el.stackGroup) {
          groupY[el.stackGroup] = currentY + Math.max(el.h, 0.5);
          groupLastY[el.stackGroup] = el.y + Math.max(el.h, 0.5);
        }
        break;

      case "text": {
        const value = el.staticText ?? data[el.field || ""] ?? "";
        if (!value) break; // Hidden/Empty -> Don't update groupY
        
        doc.fillColor(rc(el.color))
           .font(el.fontTamil ? "Tamil" : el.fontBold ? "Helvetica-Bold" : "Helvetica")
           .fontSize(el.fontSize || 9);
        
        const textHeight = doc.heightOfString(value, { width: el.w, align: el.align || "left" });
        doc.text(value, currentX, currentY, { width: el.w, align: el.align || "left" });

        if (el.stackGroup) {
          groupY[el.stackGroup] = currentY + textHeight;
          groupLastY[el.stackGroup] = el.y + el.h; // Use original h for gap calculation
        }
        break;
      }

      case "row": {
        const value = el.staticText ?? data[el.field || ""] ?? "";
        if (!value) break;
        const vx = el.valueX ?? (currentX + 82);
        const vw = el.w - (vx - currentX);
        
        doc.fillColor(el.labelColor || "#64748b").font("Helvetica").fontSize(el.fontSize || 9)
           .text(el.labelText || "", currentX, currentY);
        
        doc.fillColor(rc(el.valueColor) || "#334155").font("Helvetica-Bold").fontSize(el.fontSize || 9);
        const valHeight = doc.heightOfString(value, { width: vw, align: "left" });
        doc.text(value, vx, currentY, { width: vw, align: "left" });

        if (el.stackGroup) {
          groupY[el.stackGroup] = currentY + Math.max(el.h || 16, valHeight);
          groupLastY[el.stackGroup] = el.y + (el.h || 16);
        }
        break;
      }

      case "image": {
        const buf = images[el.field || ""];
        if (!buf) break;
        try {
          doc.save();
          if (el.shape === "circle") {
            const cx = currentX + el.w / 2, cy = currentY + el.h / 2, r = Math.min(el.w, el.h) / 2;
            doc.circle(cx, cy, r).clip();
          } else {
            doc.rect(currentX, currentY, el.w, el.h).clip();
          }
          doc.image(buf, currentX, currentY, { width: el.w, height: el.h, cover: [el.w, el.h] });
          doc.restore();

          if (el.stackGroup) {
            groupY[el.stackGroup] = currentY + el.h;
            groupLastY[el.stackGroup] = el.y + el.h;
          }
        } catch {}
        break;
      }
    }
  }
}

function fmtDate(d: string | Date | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return ""; }
}

/** Fetch and convert any image to PNG buffer (handles WebP, JPEG, etc.) */
async function processImageForPdf(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    let finalUrl = url;
    if (url.startsWith("/")) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      finalUrl = `${baseUrl}${url}`;
    }
    const res = await fetch(finalUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await sharp(Buffer.from(await res.arrayBuffer())).png().toBuffer();
  } catch (err) {
    console.error(`PDF Gen: Failed to process image ${url}`, err);
    return null;
  }
}

/** Darken a hex color by reducing each channel by `amount` */
function darkenHex(hex: string, amount = 40): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}


export async function generateIdCardPdf(memberUuid: string): Promise<Buffer | null> {
  const [memberRow, setting] = await Promise.all([
    getMemberCardByUuid(memberUuid),
    prisma.associationSetting.findUnique({ where: { id: 1 } }),
  ]);

  if (!(setting?.enableIdCard ?? true) || !memberRow) {
    return null;
  }

  // 2. Load idCardSettings safely
  let cs: Record<string, any> = {};
  try {
    const rawSettings = setting.idCardSettings;
    if (rawSettings) {
      if (typeof rawSettings === "string") {
        cs = JSON.parse(rawSettings);
      } else if (Buffer.isBuffer(rawSettings)) {
        cs = JSON.parse(rawSettings.toString("utf-8"));
      } else if (typeof rawSettings === "object") {
        cs = rawSettings as Record<string, any>;
      }
    }
  } catch (err) {
    console.error("PDF Gen: Failed to parse idCardSettings", err);
  }

  const s = {
    primaryColor:          (cs.primaryColor          as string)  || "#1e293b",
    headerTextColor:       (cs.headerTextColor       as string)  || "#ffffff",
    cardTitle:             (cs.cardTitle             as string)  || "MEMBER ID CARD",
    footerTitle:           (cs.footerTitle           as string)  || "STATE CHAIRMAN",
    showPhoto:             (cs.showPhoto             as boolean) ?? true,
    showName:              (cs.showName              as boolean) ?? true,
    showNameTamil:         (cs.showNameTamil         as boolean) ?? false,
    showMembershipId:      (cs.showMembershipId      as boolean) ?? true,
    showPosition:          (cs.showPosition          as boolean) ?? true,
    showPhone:             (cs.showPhone             as boolean) ?? true,
    showEmail:             (cs.showEmail             as boolean) ?? false,
    showAddress:           (cs.showAddress           as boolean) ?? true,
    showDateOfBirth:       (cs.showDateOfBirth       as boolean) ?? false,
    showBusinessName:      (cs.showBusinessName      as boolean) ?? true,
    showBusinessNameTamil: (cs.showBusinessNameTamil as boolean) ?? false,
    showJoinedAt:          (cs.showJoinedAt          as boolean) ?? true,
  };

  const PRIMARY      = s.primaryColor;
  const PRIMARY_DARK = darkenHex(PRIMARY, 40);
  const HDR_TEXT     = s.headerTextColor;

  // 3. Fetch images
  const [logo1Buf, logo2Buf, photoBuf, sigBuf] = await Promise.all([
    setting?.logo1Url   ? processImageForPdf(setting.logo1Url)       : Promise.resolve(null),
    setting?.logo2Url   ? processImageForPdf(setting.logo2Url)       : Promise.resolve(null),
    (s.showPhoto && memberRow.photoUrl) ? processImageForPdf(memberRow.photoUrl) : Promise.resolve(null),
    setting?.sigChairmanUrl ? processImageForPdf(setting.sigChairmanUrl) : Promise.resolve(null),
  ]);

  // ── Document setup ─────────────────────────────────────────────────────────
  const W = 260, H = 420;
  const doc = new PDFDocument({
    size: [W, H], margin: 0,
    info: { Title: `${memberRow.membershipId} — ${s.cardTitle}`, Author: setting?.name || "Association" },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const pdfDone = new Promise<void>((resolve) => doc.on("end", resolve));

  // Register Tamil Unicode font
  doc.registerFont("Tamil", TAMIL_FONT_PATH);

  // ── If a custom layout was saved by the designer, use it ──────────────────
  if (Array.isArray(cs.layout) && cs.layout.length > 0) {
    const startYr = new Date(memberRow.joinedAt).getFullYear();
    const pdfData: Record<string, string> = {
      "member.name":              memberRow.name,
      "member.nameTamil":         memberRow.nameTamil         || "",
      "member.position":          memberRow.position          || "",
      "member.businessName":      memberRow.businessName      || "",
      "member.businessNameTamil": memberRow.businessNameTamil || "",
      "member.phone":             memberRow.phone,
      "member.membershipId":      memberRow.membershipId,
      "member.location":          [memberRow.village, memberRow.taluk, memberRow.district].filter(Boolean).join(", "),
      "member.validity":          `${startYr} – ${startYr + 2}`,
      "member.email":             memberRow.email || "",
      "member.address":           memberRow.address || "",
      "association.name":         setting?.name     || "",
      "association.nameTamil":    setting?.nameTamil || "",
      "association.regNumber":    setting?.regNumber ? `பதிவு எண்: ${setting.regNumber}` : "",
      "association.address":      setting?.address  || "",
      "association.statePhone":   [setting?.state, setting?.phone ? `Cell: ${setting.phone}` : ""].filter(Boolean).join(" | "),
      "settings.footerTitle":     s.footerTitle,
      "settings.cardTitle":       s.cardTitle,
    };
    const pdfImages: Record<string, Buffer | null> = {
      "association.logo1Url":      logo1Buf,
      "association.logo2Url":      logo2Buf,
      "member.photoUrl":           photoBuf,
      "association.sigChairmanUrl": sigBuf,
    };
    await renderFromLayout(doc, cs.layout as LayoutElement[], pdfData, pdfImages, PRIMARY, PRIMARY_DARK, HDR_TEXT);
    doc.end();
    await pdfDone;
    return Buffer.concat(chunks);
  }

  // ── Fallback: hardcoded layout (used when no designer layout is saved) ─────
  const COLOR_SLATE9 = "#0f172a";
  const COLOR_SLATE7 = "#334155";
  const COLOR_SLATE5 = "#64748b";
  const COLOR_SLATE2 = "#e2e8f0";
  const COLOR_GOLD   = "#b45309";  // Amber-700 (readable on white)
  const COLOR_PINK   = "#be185d";  // Pink-700

  // ── 1. Header background gradient ─────────────────────────────────────────
  const HEADER_H = 100;
  const grad = doc.linearGradient(0, 0, W, HEADER_H);
  grad.stop(0, PRIMARY).stop(1, PRIMARY_DARK);
  doc.rect(0, 0, W, HEADER_H).fill(grad);

  // Thin bottom stripe of header
  doc.rect(0, HEADER_H, W, 3).fill(PRIMARY_DARK);

  // ── 2. Logos ──────────────────────────────────────────────────────────────
  const LOGO_SIZE = 42;
  const LOGO_Y    = 12;

  if (logo1Buf) {
    try { doc.image(logo1Buf, 14, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {}
  }
  if (logo2Buf) {
    try { doc.image(logo2Buf, W - LOGO_SIZE - 14, LOGO_Y, { width: LOGO_SIZE, height: LOGO_SIZE }); } catch {}
  }

  // ── 3. Association Name & Details in header ────────────────────────────────
  const textAreaX = 14 + LOGO_SIZE + 6;
  const textAreaW = W - (14 + LOGO_SIZE + 6) * 2;

  doc.fillColor(HDR_TEXT).font("Helvetica-Bold").fontSize(9.5)
     .text((setting?.name || "Association").toUpperCase(), textAreaX, LOGO_Y + 2, {
       width: textAreaW, align: "center", lineGap: 1.5,
     });

  let hdY = LOGO_Y + 2 + doc.fontSize(9.5).heightOfString(
    (setting?.name || "Association").toUpperCase(),
    { width: textAreaW }
  ) + 3;

  if (setting?.regNumber) {
    doc.font("Helvetica").fontSize(7).fillColor(HDR_TEXT)
       .text(`Reg. No: ${setting.regNumber}`, textAreaX, hdY, { width: textAreaW, align: "center" });
    hdY += 10;
  }
  if (setting?.address) {
    doc.font("Helvetica").fontSize(7).fillColor(HDR_TEXT)
       .text(setting.address, textAreaX, hdY, { width: textAreaW, align: "center" });
    hdY += 10;
  }
  if (setting?.state || setting?.phone) {
    const line = [setting?.state, setting?.phone ? `Cell: ${setting.phone}` : ""].filter(Boolean).join(" | ");
    doc.font("Helvetica").fontSize(7).fillColor(HDR_TEXT)
       .text(line, textAreaX, hdY, { width: textAreaW, align: "center" });
  }

  // ── 4. Identity section ────────────────────────────────────────────────────
  const PHOTO_X = 14, PHOTO_Y = HEADER_H + 14;
  const PHOTO_W = 78, PHOTO_H = 96;

  // Photo border
  doc.save();
  doc.rect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H).lineWidth(1.5).strokeColor(PRIMARY).stroke();

  if (photoBuf) {
    try {
      doc.rect(PHOTO_X + 2, PHOTO_Y + 2, PHOTO_W - 4, PHOTO_H - 4).clip();
      doc.image(photoBuf, PHOTO_X + 2, PHOTO_Y + 2, {
        width: PHOTO_W - 4, height: PHOTO_H - 4, cover: [PHOTO_W - 4, PHOTO_H - 4],
      });
    } catch {
      doc.rect(PHOTO_X + 2, PHOTO_Y + 2, PHOTO_W - 4, PHOTO_H - 4).fill("#f1f5f9");
    }
  } else {
    doc.rect(PHOTO_X + 2, PHOTO_Y + 2, PHOTO_W - 4, PHOTO_H - 4).fill("#f1f5f9");
    doc.fillColor("#94a3b8").font("Helvetica").fontSize(7.5)
       .text("NO PHOTO", PHOTO_X, PHOTO_Y + PHOTO_H / 2 - 5, { width: PHOTO_W, align: "center" });
  }
  doc.restore();

  // Name & Position
  const NX = PHOTO_X + PHOTO_W + 10;
  const NW = W - NX - 14;
  let ny = PHOTO_Y + 10;

  if (s.showName) {
    doc.fillColor(COLOR_SLATE9).font("Helvetica-Bold").fontSize(12)
       .text(memberRow.name.toUpperCase(), NX, ny, { width: NW });
    ny += doc.fontSize(12).heightOfString(memberRow.name.toUpperCase(), { width: NW }) + 4;
  }

  if (s.showNameTamil && memberRow.nameTamil) {
    doc.fillColor(COLOR_SLATE7).font("Tamil").fontSize(9)
       .text(memberRow.nameTamil, NX, ny, { width: NW });
    ny += 13;
  }

  if (s.showPosition && memberRow.position) {
    doc.fillColor(COLOR_GOLD).font("Helvetica-Bold").fontSize(9)
       .text(memberRow.position.toUpperCase(), NX, ny, { width: NW });
    ny += 13;
  }

  if (s.showBusinessName && memberRow.businessName) {
    doc.fillColor(COLOR_PINK).font("Helvetica-Bold").fontSize(8.5)
       .text(memberRow.businessName.toUpperCase(), NX, ny, { width: NW });
    ny += 12;
  }

  if (s.showBusinessNameTamil && memberRow.businessNameTamil) {
    doc.fillColor(COLOR_SLATE7).font("Tamil").fontSize(8.5)
       .text(memberRow.businessNameTamil, NX, ny, { width: NW });
    ny += 12;
  }

  if (s.showAddress) {
    const loc = [memberRow.village, memberRow.taluk, memberRow.district].filter(Boolean).join(", ");
    if (loc) {
      doc.fillColor("#2563eb").font("Helvetica").fontSize(7.5)
         .text(loc, NX, ny, { width: NW });
    }
  }

  // ── 5. Divider ─────────────────────────────────────────────────────────────
  let cy = PHOTO_Y + PHOTO_H + 14;
  doc.moveTo(20, cy).lineTo(W - 20, cy).lineWidth(0.5).strokeColor(COLOR_SLATE2).stroke();
  cy += 12;

  // ── 6. Data rows ───────────────────────────────────────────────────────────
  const LX = 28, VX = 110;
  const ROW_H = 16;
  doc.fontSize(9);

  const drawRow = (label: string, value: string, isId = false) => {
    doc.fillColor(COLOR_SLATE5).font("Helvetica").text(label, LX, cy, { width: VX - LX - 4 });
    doc.fillColor(isId ? PRIMARY : COLOR_SLATE7).font("Helvetica-Bold").text(value, VX, cy, { width: W - VX - 20 });
    cy += ROW_H;
  };

  if (s.showPhone) drawRow("Cell No", memberRow.phone);
  if (s.showJoinedAt) {
    const yr = new Date(memberRow.joinedAt).getFullYear();
    drawRow("Validity", `${yr} – ${yr + 2}`);
  }
  if (s.showMembershipId) drawRow("ID Number", memberRow.membershipId, true);
  if (s.showDateOfBirth && memberRow.dateOfBirth) drawRow("Date of Birth", fmtDate(memberRow.dateOfBirth));
  if (s.showEmail && memberRow.email) drawRow("Email", memberRow.email);

  // ── 7. Signature ───────────────────────────────────────────────────────────
  const FOOTER_H = 38;
  const FOOTER_Y = H - FOOTER_H;

  if (sigBuf) {
    try {
      const SIG_W = 65, SIG_H = 28;
      const SIG_X = W - SIG_W - 18;
      const SIG_Y = FOOTER_Y - SIG_H - 4;
      doc.image(sigBuf, SIG_X, SIG_Y, { width: SIG_W, height: SIG_H, fit: [SIG_W, SIG_H] });
      doc.fillColor(COLOR_PINK).font("Helvetica-Bold").fontSize(7.5)
         .text(s.footerTitle.toUpperCase(), SIG_X - 5, FOOTER_Y - 11, { width: SIG_W + 10, align: "center" });
    } catch {}
  }

  // ── 8. Footer bar ──────────────────────────────────────────────────────────
  const footerGrad = doc.linearGradient(0, FOOTER_Y, W, FOOTER_Y + FOOTER_H);
  footerGrad.stop(0, PRIMARY).stop(1, PRIMARY_DARK);
  doc.rect(0, FOOTER_Y, W, FOOTER_H).fill(footerGrad);

  doc.fillColor(HDR_TEXT).font("Helvetica-Bold").fontSize(10)
     .text(s.footerTitle.toUpperCase(), 0, FOOTER_Y + 14, { width: W, align: "center", characterSpacing: 1.5 });

  doc.end();
  await pdfDone;
  return Buffer.concat(chunks);
}
