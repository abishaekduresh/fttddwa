import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { getMemberCardByUuid } from "@/lib/services/member.service";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/security/rate-limiter";
import { verifyAccessToken } from "@/lib/jwt";

const TAMIL_FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoSansTamil.ttf");

async function imgDataUri(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    let finalUrl = url;
    if (url.startsWith("/")) {
      finalUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}${url}`;
    }
    const res = await fetch(finalUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (err) { 
    console.error(`imgDataUri error for ${url}:`, err);
    return null; 
  }
}

/** XML-escape a string for SVG text content. */
function xe(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format a Date as DD.MM.YYYY. */
function fmtDate(d: Date | null | undefined): string {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
  } catch { return ""; }
}

/** Darken a hex color by reducing each channel. */
function darkenHex(hex: string, amount = 40): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * GET /api/members/card/[uuid]/image
 * Returns the ID card rendered as a PNG image (2× resolution, 520×840 px).
 * Uses SVG → sharp pipeline — no client-side PDF conversion needed.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const token =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.cookies.get("access_token")?.value;
  if (!token) return new NextResponse("Unauthorized", { status: 401 });
  const payload = await verifyAccessToken(token);
  if (!payload) return new NextResponse("Invalid token", { status: 401 });

  const limit = rateLimit(`card-image:${payload.userId}`, 10, 60_000);
  if (!limit.success) return new NextResponse("Too many requests", { status: 429 });

  const { uuid } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    return new NextResponse("Invalid UUID", { status: 400 });
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  const [memberRow, setting] = await Promise.all([
    getMemberCardByUuid(uuid),
    prisma.associationSetting.findUnique({ where: { id: 1 } }),
  ]);
  if (!memberRow || !setting) return new NextResponse("Member not found", { status: 404 });
  if (memberRow.status !== "ACTIVE") return new NextResponse("Member not active", { status: 403 });

  // Parse id-card settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cs: Record<string, any> = {};
  try {
    const raw = setting.idCardSettings;
    if (typeof raw === "string") cs = JSON.parse(raw);
    else if (Buffer.isBuffer(raw)) cs = JSON.parse(raw.toString("utf-8"));
    else if (typeof raw === "object" && raw !== null) cs = raw as typeof cs;
  } catch { /* use defaults */ }

  const PRIMARY      = (cs.primaryColor    as string) || "#1e293b";
  const PRIMARY_DARK = darkenHex(PRIMARY, 40);
  const WAVE_COLOR   = (cs.footerWaveColor as string) || "#2d6a4f";
  const FOOTER_TITLE = (cs.footerTitle     as string) || "STATE CHAIRMAN";

  // ── Images ──────────────────────────────────────────────────────────────────
  const [logo1, logo2, photo, sig] = await Promise.all([
    setting.logo1Url        ? imgDataUri(setting.logo1Url)        : null,
    setting.logo2Url        ? imgDataUri(setting.logo2Url)        : null,
    memberRow.photoUrl      ? imgDataUri(memberRow.photoUrl)      : null,
    setting.sigChairmanUrl  ? imgDataUri(setting.sigChairmanUrl)  : null,
  ]);

  // ── Tamil font (embedded so librsvg can render Tamil text) ──────────────────
  let tamilFont = "";
  try {
    tamilFont = fs.readFileSync(TAMIL_FONT_PATH).toString("base64");
  } catch { /* fall back to system Tamil font */ }

  // ── Computed values ─────────────────────────────────────────────────────────
  const startYr = new Date(memberRow.joinedAt).getFullYear();
  const endYr   = memberRow.validUntil
    ? new Date(memberRow.validUntil).getFullYear()
    : startYr + (Number(cs.validityYears) || 2);
  const validity = `${startYr} \u2013 ${endYr}`;
  const dob      = fmtDate(memberRow.dateOfBirth);

  // ── SVG layout constants (2× PDF pt → CSS px) ──────────────────────────────
  // Card: 260×420 pt → 520×840 px
  const W = 520;

  // Section Y boundaries (px)
  const HDR_H     = 216;   // 108 pt header
  const NAMEBAR_Y = 216;   // photo + name bar starts
  const NAMEBAR_H = 224;   // 112 pt
  const BIZ_Y     = 440;   // 220 pt
  const BIZ_H     = 116;   // 58 pt
  const DATA_Y    = 556;   // 278 pt
  const DATA_H    = 160;   // 80 pt
  const FOOTER_Y  = 716;   // 358 pt
  // Footer wave arch control points
  const ARCH_EDGE = FOOTER_Y + 124 * 0.5;   // 778
  const ARCH_PEAK = FOOTER_Y + 124 * 0.25;  // 747
  const CP_X      = W * 0.25;               // 130

  const fontFace = tamilFont
    ? `@font-face { font-family: 'NotoSansTamil'; src: url('data:font/truetype;base64,${tamilFont}') format('truetype'); }`
    : "";
  const TAMIL = tamilFont ? "NotoSansTamil, " : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
    width="${W}" height="840" viewBox="0 0 ${W} 840">
  <defs>
    <style>${fontFace}</style>
    <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${PRIMARY}"/>
      <stop offset="100%" stop-color="${PRIMARY_DARK}"/>
    </linearGradient>
    <clipPath id="cl1"><circle cx="50" cy="50" r="50"/></clipPath>
    <clipPath id="cl2"><circle cx="50" cy="50" r="50"/></clipPath>
    <clipPath id="clp"><rect width="172" height="${NAMEBAR_H}"/></clipPath>
  </defs>

  <!-- ── Background ────────────────────────────────────────────────────────── -->
  <rect width="${W}" height="840" fill="#ffffff"/>

  <!-- ── Header ────────────────────────────────────────────────────────────── -->
  <rect x="0" y="0" width="${W}" height="${HDR_H}" fill="url(#hg)"/>

  <!-- Logos -->
  ${logo1 ? `<g transform="translate(12,16)"><image href="${logo1}" width="100" height="100" clip-path="url(#cl1)"/></g>` : ""}
  ${logo2 ? `<g transform="translate(${W - 112},16)"><image href="${logo2}" width="100" height="100" clip-path="url(#cl2)"/></g>` : ""}

  <!-- Org name Tamil -->
  ${setting.nameTamil ? `<text x="${W / 2}" y="64" font-family="${TAMIL}sans-serif" font-size="19" font-weight="bold" fill="#ffffff" text-anchor="middle">${xe(setting.nameTamil)}</text>` : ""}
  <!-- Reg number -->
  ${setting.regNumber ? `<text x="${W / 2}" y="108" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.82)" text-anchor="middle">பதிவு எண்: ${xe(setting.regNumber)}</text>` : ""}
  <!-- Address -->
  ${setting.address ? `<text x="${W / 2}" y="136" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.78)" text-anchor="middle">${xe(setting.address)}</text>` : ""}
  <!-- State / Phone -->
  ${setting.phone ? `<text x="${W / 2}" y="164" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,0.78)" text-anchor="middle">${xe([setting.state, `Cell: ${setting.phone}`].filter(Boolean).join(" | "))}</text>` : ""}

  <!-- ── Photo ──────────────────────────────────────────────────────────────── -->
  <g transform="translate(0,${NAMEBAR_Y})">
    ${photo
      ? `<image href="${photo}" width="172" height="${NAMEBAR_H}" clip-path="url(#clp)" preserveAspectRatio="xMidYMid slice"/>`
      : `<rect width="172" height="${NAMEBAR_H}" fill="#334155"/>`}
  </g>

  <!-- ── Name bar ──────────────────────────────────────────────────────────── -->
  <rect x="172" y="${NAMEBAR_Y}" width="${W - 172}" height="${NAMEBAR_H}" fill="url(#hg)"/>
  <text x="182" y="${NAMEBAR_Y + 46}" font-family="sans-serif" font-size="23" font-weight="bold" fill="#ffffff">${xe(memberRow.name)}</text>
  ${memberRow.nameTamil ? `<text x="182" y="${NAMEBAR_Y + 80}" font-family="${TAMIL}sans-serif" font-size="19" fill="#dbeafe">${xe(memberRow.nameTamil)}</text>` : ""}
  ${memberRow.position  ? `<text x="182" y="${NAMEBAR_Y + 110}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#bfdbfe">${xe(memberRow.position)}</text>` : ""}

  <!-- ── Business section ───────────────────────────────────────────────────── -->
  <line x1="0" y1="${BIZ_Y}" x2="${W}" y2="${BIZ_Y}" stroke="${PRIMARY}" stroke-width="2"/>
  ${memberRow.businessNameTamil ? `<text x="${W / 2}" y="${BIZ_Y + 44}" font-family="${TAMIL}sans-serif" font-size="24" font-weight="bold" fill="#1e293b" text-anchor="middle">${xe(memberRow.businessNameTamil)}</text>` : ""}
  ${memberRow.businessName      ? `<text x="${W / 2}" y="${BIZ_Y + 76}" font-family="sans-serif" font-size="17" font-weight="bold" fill="#374151" text-anchor="middle">${xe(memberRow.businessName)}</text>` : ""}
  ${memberRow.village           ? `<text x="${W / 2}" y="${BIZ_Y + 104}" font-family="sans-serif" font-size="16" fill="#64748b" text-anchor="middle">${xe(memberRow.village)}</text>` : ""}
  <line x1="0" y1="${BIZ_Y + BIZ_H}" x2="${W}" y2="${BIZ_Y + BIZ_H}" stroke="${PRIMARY}" stroke-width="1.5"/>

  <!-- ── Data section ───────────────────────────────────────────────────────── -->
  <rect x="0" y="${DATA_Y}" width="${W}" height="${DATA_H}" fill="#eef4ff"/>

  <!-- Cell -->
  <text x="40"  y="${DATA_Y + 36}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#475569">Cell  :</text>
  <text x="192" y="${DATA_Y + 36}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1e293b">${xe(memberRow.phone)}</text>

  <!-- DOB -->
  ${dob ? `<text x="40"  y="${DATA_Y + 72}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#475569">DOB   :</text>
  <text x="192" y="${DATA_Y + 72}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1e293b">${xe(dob)}</text>` : ""}

  <!-- Validity -->
  <text x="40"  y="${DATA_Y + 108}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#475569">Valid  :</text>
  <text x="192" y="${DATA_Y + 108}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#1e293b">${xe(validity)}</text>

  <!-- ID No. -->
  <text x="40"  y="${DATA_Y + 144}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#475569">ID. No.:</text>
  <text x="192" y="${DATA_Y + 144}" font-family="sans-serif" font-size="18" font-weight="bold" fill="${PRIMARY}">${xe(memberRow.membershipId)}</text>

  <!-- ── Footer wave (convex bezier arch) ───────────────────────────────────── -->
  <path d="M 0,${ARCH_EDGE} C ${CP_X},${ARCH_PEAK} ${W - CP_X},${ARCH_PEAK} ${W},${ARCH_EDGE} L ${W},840 L 0,840 Z"
    fill="${WAVE_COLOR}"/>

  <!-- Signature -->
  ${sig ? `<image href="${sig}" x="316" y="${FOOTER_Y + 4}" width="164" height="64" preserveAspectRatio="xMidYMid meet"/>` : ""}

  <!-- Footer title -->
  <text x="398" y="818" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">${xe(FOOTER_TITLE)}</text>
</svg>`;

  // ── Render SVG → PNG via sharp ───────────────────────────────────────────────
  try {
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${memberRow.membershipId}-id-card.png"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    console.error("SVG to PNG conversion failed:", err);
    return new NextResponse("Failed to generate image", { status: 500 });
  }
}
