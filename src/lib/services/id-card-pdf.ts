import PDFDocument from "pdfkit";
import sharp from "sharp";
import path from "path";
import QRCode from "qrcode";
import { getMemberCardByUuid } from "@/lib/services/member.service";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LAYOUT, type LayoutElement } from "@/lib/id-card-layout";

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
  FOOTER_WAVE = "#2d6a4f",
) {
  const rc = (c?: string) => {
    if (!c) return "#000000";
    if (c === "headerText")  return HDR_TEXT;
    if (c === "primary")     return PRIMARY;
    if (c === "primaryDark") return PRIMARY_DARK;
    if (c === "footerWave")  return FOOTER_WAVE;
    return c;
  };

  // Within the same stack group sort by y (top-to-bottom) so stacking works correctly
  // regardless of each element's zIndex.  Elements in different groups (or no group) sort
  // by zIndex first so visual layering is preserved.
  const sorted = [...layout]
    .filter(e => e.visible)
    .sort((a, b) => {
      if (a.stackGroup && a.stackGroup === b.stackGroup) return a.y - b.y;
      return a.zIndex - b.zIndex || a.y - b.y;
    });

  // groupY  = actual rendered bottom of the last element in the group
  // groupOrigBottom = original layout bottom of the last processed element (rendered or skipped)
  // These are initialised for each group from its first element
  const groupY:         Record<string, number> = {};
  const groupOrigBottom: Record<string, number> = {};

  const applyStack = (el: LayoutElement): number => {
    const g = el.stackGroup!;
    // First element in the group — render at its designed y
    if (groupY[g] === undefined) {
      groupY[g]          = el.y;          // will be updated after render
      groupOrigBottom[g] = el.y;          // sentinel: treat "previous bottom" as this element's top
      return el.y;
    }
    // Gap in the original design between previous element's bottom and this element's top
    const origGap = Math.max(0, el.y - groupOrigBottom[g]);
    // Respect optional minY floor (e.g. divider must stay below photo bottom)
    return Math.max(el.minY ?? 0, groupY[g] + origGap);
  };

  const commitStack = (el: LayoutElement, currentY: number, renderedH: number) => {
    const g = el.stackGroup!;
    groupY[g]          = currentY + renderedH;
    groupOrigBottom[g] = el.y + (el.h || renderedH);
  };

  // Separate pass: skip stacks an element by advancing origBottom only (no visual output)
  const skipStack = (el: LayoutElement) => {
    const g = el.stackGroup!;
    if (groupY[g] === undefined) {
      // First element is empty — initialise with zero height so next element starts at its designed y
      groupY[g]          = el.y;
      groupOrigBottom[g] = el.y + (el.h || 0);
    } else {
      groupOrigBottom[g] = el.y + (el.h || 0);
    }
  };

  for (const el of sorted) {
    switch (el.type) {

      case "rect": {
        const currentY = el.stackGroup ? applyStack(el) : el.y;
        if (el.bgColor === "footerWave") {
          // Convex bezier arch — top edge curves upward (toward card top) in the middle.
          // Arch edge (at card sides) ≈ y + h*0.5 ; Arch peak (center) ≈ y + h*0.25
          const archEdgeY = currentY + el.h * 0.5;
          const archPeakY = currentY + el.h * 0.25;
          const cpX = el.w * 0.25;
          doc.save()
             .moveTo(el.x, archEdgeY)
             .bezierCurveTo(el.x + cpX, archPeakY, el.x + el.w - cpX, archPeakY, el.x + el.w, archEdgeY)
             .lineTo(el.x + el.w, currentY + el.h)
             .lineTo(el.x, currentY + el.h)
             .closePath()
             .fill(FOOTER_WAVE);
          doc.restore();
        } else if (el.gradient || el.bgColor === "primary" || el.bgColor === "primaryDark") {
          const base = rc(el.bgColor);
          const g = doc.linearGradient(el.x, currentY, el.x + el.w, currentY + el.h);
          g.stop(0, base).stop(1, PRIMARY_DARK);
          doc.rect(el.x, currentY, el.w, el.h).fill(g);
        } else {
          doc.rect(el.x, currentY, el.w, el.h).fill(rc(el.bgColor) || "#f0f0f0");
        }
        if (el.stackGroup) commitStack(el, currentY, el.h);
        break;
      }

      case "line": {
        const currentY = el.stackGroup ? applyStack(el) : el.y;
        const lh = Math.max(el.h, 0.5);
        doc.moveTo(el.x, currentY).lineTo(el.x + el.w, currentY)
           .lineWidth(lh).strokeColor(el.color || "#e2e8f0").stroke();
        if (el.stackGroup) commitStack(el, currentY, lh);
        break;
      }

      case "text": {
        const value = el.staticText ?? data[el.field || ""] ?? "";
        if (!value) {
          if (el.stackGroup) skipStack(el);
          break;
        }
        const currentY = el.stackGroup ? applyStack(el) : el.y;
        const font = el.fontTamil ? "Tamil" : el.fontBold ? "Helvetica-Bold" : "Helvetica";
        doc.fillColor(rc(el.color)).font(font).fontSize(el.fontSize || 9);
        const renderedH = doc.heightOfString(value, { width: el.w });
        doc.text(value, el.x, currentY, { width: el.w, align: el.align || "left", lineGap: 1 });
        if (el.stackGroup) commitStack(el, currentY, renderedH);
        break;
      }

      case "row": {
        const value = el.staticText ?? data[el.field || ""] ?? "";
        if (!value) {
          if (el.stackGroup) skipStack(el);
          break;
        }
        const currentY = el.stackGroup ? applyStack(el) : el.y;
        const vx  = el.valueX ?? (el.x + 82);
        const vw  = el.w - (vx - el.x);
        const fs  = el.fontSize || 9;

        // Measure value height (may wrap)
        const valFont = el.fontTamil ? "Tamil" : "Helvetica-Bold";
        doc.font(valFont).fontSize(fs);
        const valH = doc.heightOfString(value, { width: vw });

        // Draw label
        doc.fillColor(el.labelColor || "#64748b").font("Helvetica").fontSize(fs)
           .text(el.labelText || "", el.x, currentY, { width: vx - el.x - 4, lineGap: 1 });
        // Draw value
        doc.fillColor(rc(el.valueColor) || "#334155").font(valFont).fontSize(fs)
           .text(value, vx, currentY, { width: vw, align: "left", lineGap: 1 });

        const renderedH = Math.max(el.h || 16, valH);
        if (el.stackGroup) commitStack(el, currentY, renderedH);
        break;
      }

      case "image": {
        const currentY = el.stackGroup ? applyStack(el) : el.y;
        const buf = images[el.field || ""];
        if (!buf) {
          if (el.stackGroup) commitStack(el, currentY, el.h);
          break;
        }
        try {
          doc.save();
          if (el.shape === "circle") {
            const cx = el.x + el.w / 2, cy = currentY + el.h / 2, r = Math.min(el.w, el.h) / 2;
            doc.circle(cx, cy, r).clip();
          } else {
            doc.rect(el.x, currentY, el.w, el.h).clip();
          }
          doc.image(buf, el.x, currentY, { width: el.w, height: el.h, cover: [el.w, el.h] });
          doc.restore();

          // Draw border if requested (after restore so it's not clipped/obscured)
          if (el.borderWidth && el.borderWidth > 0) {
            doc.save();
            const bWidth = el.borderWidth;
            const bColor = rc(el.borderColor) || "#000000";
            
            doc.lineWidth(bWidth).strokeColor(bColor);
            
            if (el.shape === "circle") {
              const cx = el.x + el.w / 2, cy = currentY + el.h / 2, r = Math.min(el.w, el.h) / 2;
              doc.circle(cx, cy, r).stroke();
            } else {
              // Draw exactly on the edge
              doc.rect(el.x, currentY, el.w, el.h).stroke();
            }
            doc.restore();
          }
        } catch (err) {
          console.error("PDF Gen: Image render error", err);
        }
        if (el.stackGroup) commitStack(el, currentY, el.h);
        break;
      }

      case "qrcode": {
        const text = el.staticText ?? data[el.field || ""] ?? "";
        if (!text) {
          if (el.stackGroup) skipStack(el);
          break;
        }
        const currentY = el.stackGroup ? applyStack(el) : el.y;
        try {
          // Generate a high-resolution QR code buffer (600px)
          // Using Level L (Low) to keep blocks large and clear like the sample provided
          const qrBuf = await QRCode.toBuffer(text, { 
            margin: 4, 
            errorCorrectionLevel: 'L',
            width: 600,
            color: { dark: "#000000", light: "#ffffff" }
          });
          doc.image(qrBuf, el.x, currentY, { width: el.w, height: el.h });
        } catch (err) {
          console.error("PDF Gen: QR Error", err);
        }
        if (el.stackGroup) commitStack(el, currentY, el.h);
        break;
      }
    }
  }
}

/** Format date as DD.MM.YYYY (physical card style). */
function fmtDOB(d: Date | string | null): string {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return `${dt.getDate().toString().padStart(2, "0")}.${(dt.getMonth() + 1).toString().padStart(2, "0")}.${dt.getFullYear()}`;
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

  if (!setting || !memberRow || !setting.enableIdCard) {
    return null;
  }

  // 2. Load idCardSettings safely
  let cs: Record<string, any> = {};
  try {
    const rawSettings = setting?.idCardSettings;
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
    showDateOfBirth:       (cs.showDateOfBirth       as boolean) ?? true,
    showBusinessName:      (cs.showBusinessName      as boolean) ?? true,
    showBusinessNameTamil: (cs.showBusinessNameTamil as boolean) ?? true,
    showJoinedAt:          (cs.showJoinedAt          as boolean) ?? true,
    footerWaveColor:       (cs.footerWaveColor        as string)  || "#2d6a4f",
  };

  // Resolve active template — overrides direct layout and colors when set
  let activeLayout: LayoutElement[] | null = null;
  let activePrimary    = s.primaryColor;
  let activeHdrText    = s.headerTextColor;
  let activeWaveColor  = s.footerWaveColor;

  if (cs.activeTemplateId && Array.isArray(cs.templates)) {
    const tpl = (cs.templates as Record<string, unknown>[]).find(t => t.id === cs.activeTemplateId);
    if (tpl && Array.isArray(tpl.layout) && (tpl.layout as unknown[]).length > 0) {
      activeLayout    = tpl.layout as LayoutElement[];
      if (tpl.primaryColor)    activePrimary   = tpl.primaryColor    as string;
      if (tpl.headerTextColor) activeHdrText   = tpl.headerTextColor as string;
      if (tpl.footerWaveColor) activeWaveColor = tpl.footerWaveColor as string;
    }
  }

  const PRIMARY      = activePrimary;
  const PRIMARY_DARK = darkenHex(PRIMARY, 40);
  const HDR_TEXT     = activeHdrText;

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

  // ── Render custom layout (active template takes priority, then direct layout) ──
  // activeLayout is set when a template is marked as primary; otherwise fall through
  // to the direct cs.layout or DEFAULT_LAYOUT fallback.
  const customLayout = activeLayout ?? (Array.isArray(cs.layout) && cs.layout.length > 0 ? cs.layout as LayoutElement[] : null);

  if (customLayout) {
    const startYr = new Date(memberRow.joinedAt).getFullYear();
    const pdfData: Record<string, string> = {
      "member.uuid":              memberRow.uuid,
      "uuid":                     memberRow.uuid,
      "member.name":              memberRow.name,
      "member.nameTamil":         memberRow.nameTamil         || "",
      "member.position":          memberRow.position          || "",
      "member.businessName":      memberRow.businessName      || "",
      "member.businessNameTamil": memberRow.businessNameTamil || "",
      "businessName":             memberRow.businessName      || "",
      "businessNameTamil":        memberRow.businessNameTamil || "",
      "member.industry":          memberRow.industry          || "",
      "member.village":           memberRow.village           || "",
      "village":                  memberRow.village           || "",
      "member.phone":             memberRow.phone,
      "phone":                    memberRow.phone,
      "member.membershipId":      memberRow.membershipId,
      "membershipId":             memberRow.membershipId,
      "member.location":          [memberRow.village, memberRow.taluk, memberRow.district].filter(Boolean).join(", "),
      "member.validity":          `${startYr} – ${memberRow.validUntil ? new Date(memberRow.validUntil).getFullYear() : (startYr + (cs.validityYears || 2))}`,
      "member.email":             memberRow.email || "",
      "member.dateOfBirth":       fmtDOB(memberRow.dateOfBirth),
      "member.address":           memberRow.address || "",
      "address":                  memberRow.address || "",
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
    await renderFromLayout(doc, customLayout, pdfData, pdfImages, PRIMARY, PRIMARY_DARK, HDR_TEXT, activeWaveColor);
    doc.end();
    await pdfDone;
    return Buffer.concat(chunks);
  }

  // ── Fallback: use DEFAULT_LAYOUT (respects same showXxx settings as custom layout) ──
  const startYr = new Date(memberRow.joinedAt).getFullYear();
  const fallbackData: Record<string, string> = {
    "member.uuid":              memberRow.uuid,
    "uuid":                     memberRow.uuid,
    "member.name":              memberRow.name,
    "member.nameTamil":         memberRow.nameTamil         || "",
    "member.position":          memberRow.position          || "",
    "member.businessName":      memberRow.businessName      || "",
    "member.businessNameTamil": memberRow.businessNameTamil || "",
    "businessName":             memberRow.businessName      || "",
    "businessNameTamil":        memberRow.businessNameTamil || "",
    "member.industry":          memberRow.industry          || "",
    "member.village":           memberRow.village           || "",
    "village":                  memberRow.village           || "",
    "member.phone":             memberRow.phone,
    "phone":                    memberRow.phone,
    "member.membershipId":      memberRow.membershipId,
    "membershipId":             memberRow.membershipId,
    "member.location":          [memberRow.village, memberRow.taluk, memberRow.district].filter(Boolean).join(", "),
    "member.validity":          `${startYr} – ${memberRow.validUntil ? new Date(memberRow.validUntil).getFullYear() : (startYr + (cs.validityYears || 2))}`,
    "member.email":             memberRow.email || "",
    "member.dateOfBirth":       fmtDOB(memberRow.dateOfBirth),
    "member.address":           memberRow.address || "",
    "address":                  memberRow.address || "",
    "association.name":         setting?.name     || "",
    "association.nameTamil":    setting?.nameTamil || "",
    "association.regNumber":    setting?.regNumber ? `பதிவு எண்: ${setting.regNumber}` : "",
    "association.address":      setting?.address  || "",
    "association.statePhone":   [setting?.state, setting?.phone ? `Cell: ${setting.phone}` : ""].filter(Boolean).join(" | "),
    "settings.footerTitle":     s.footerTitle,
    "settings.cardTitle":       s.cardTitle,
  };
  const fallbackImages: Record<string, Buffer | null> = {
    "association.logo1Url":       logo1Buf,
    "association.logo2Url":       logo2Buf,
    "member.photoUrl":            photoBuf,
    "association.sigChairmanUrl": sigBuf,
  };

  // Apply showXxx setting flags as visibility overrides on the DEFAULT_LAYOUT
  const visOverrides: Record<string, boolean> = {
    "photo":             s.showPhoto,
    "member-name":       s.showName,
    "member-name-tamil": s.showNameTamil,
    "position":          s.showPosition,
    "biz-name-tamil":    s.showBusinessNameTamil,
    "biz-name-en":       s.showBusinessName,
    "member-village":    s.showAddress,
    "row-phone":         s.showPhone,
    "row-dob":           s.showDateOfBirth,
    "row-validity":      s.showJoinedAt,
    "row-id":            s.showMembershipId,
  };
  const fallbackLayout = DEFAULT_LAYOUT.map(el =>
    visOverrides[el.id] !== undefined ? { ...el, visible: visOverrides[el.id] } : el
  );

  await renderFromLayout(doc, fallbackLayout, fallbackData, fallbackImages, PRIMARY, PRIMARY_DARK, HDR_TEXT, activeWaveColor);

  doc.end();
  await pdfDone;
  return Buffer.concat(chunks);
}
