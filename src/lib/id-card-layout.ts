// ─── Shared ID Card Layout Types & Defaults ───────────────────────────────────
// Imported by both the designer (client) and PDF service (server).
// Coordinates are in PDF pt units (card = 260 × 420 pt).

export type ElemType = "rect" | "text" | "image" | "line" | "row" | "qrcode";
export type Align    = "left" | "center" | "right";

export interface LayoutElement {
  id: string;
  label: string;
  type: ElemType;
  field?: string;        // data key → resolved at render time
  staticText?: string;   // custom text — overrides field lookup when set
  labelText?: string;    // row type: static label string
  x: number;            // PDF pt from card origin
  y: number;
  w: number;
  h: number;
  visible: boolean;
  zIndex: number;
  // ── text / row ──
  fontSize?: number;
  fontBold?: boolean;
  fontTamil?: boolean;
  color?: string;        // hex, or "headerText" | "primary" | "primaryDark" | "footerWave"
  align?: Align;
  // ── row extras ──
  valueX?: number;       // absolute x of the value column (PDF pt)
  labelColor?: string;
  valueColor?: string;   // hex or "primary"
  // ── rect ──
  bgColor?: string;      // hex, or "primary" | "primaryDark" | "footerWave"
  gradient?: boolean;
  opacity?: number;
  borderRadius?: number; // pt
  // ── image ──
  shape?: "rect" | "circle";
  borderColor?: string;
  borderWidth?: number;
  padding?: number;      // image padding (pt)
  stackGroup?: string;   // elements with same group will stack vertically if one is empty/hidden
  minY?: number;         // stacking floor — element will never render above this Y (PDF pt)
}

/**
 * Default layout — matches the physical FTTDDWA member card design.
 *
 * Sections (260 × 420 pt):
 *  ┌─────────────────────────────────────┐  y=0
 *  │  Header (dark primary gradient)     │  y=0–108  (logos + org name + reg/address/phone)
 *  ├──────────┬──────────────────────────┤  y=108
 *  │  Photo   │  Name bar (primary bg)   │  y=108–220 (photo left, name+position right)
 *  ├──────────┴──────────────────────────┤  y=220
 *  │  Business section (white)           │  y=220–278 (Tamil biz name + English + village)
 *  ├─────────────────────────────────────┤  y=278
 *  │  Data rows (light-blue #eef4ff)     │  y=278–358 (Cell, DOB, Valid, ID. No.)
 *  ├─────────────────────────────────────┤  y=358
 *  │  Footer arch (footerWave color)     │  y=358–420 (convex bezier arch + signature)
 *  └─────────────────────────────────────┘  y=420
 *
 * The "footerWave" bgColor triggers a bezier convex-arch shape in the renderer.
 * Footer wave color is controlled by the footerWaveColor setting (default #2d6a4f).
 */
export const DEFAULT_LAYOUT: LayoutElement[] = [

  // ── Header Background ─────────────────────────────────────────────────────
  { id: "header-bg",         label: "Header Background",        type: "rect",   x: 0,   y: 0,   w: 260, h: 108, visible: true,  zIndex: 0, bgColor: "primary",    gradient: true  },

  // ── Header Logos ──────────────────────────────────────────────────────────
  { id: "logo1",             label: "Logo (Left)",               type: "image",  field: "association.logo1Url",       x: 6,   y: 8,   w: 50,  h: 50,  visible: true,  zIndex: 2, shape: "circle" },
  { id: "logo2",             label: "Logo (Right)",              type: "image",  field: "association.logo2Url",       x: 204, y: 8,   w: 50,  h: 50,  visible: true,  zIndex: 2, shape: "circle" },

  // ── Header Text ───────────────────────────────────────────────────────────
  { id: "assoc-name-tamil",  label: "Org Name (Tamil)",          type: "text",   field: "association.nameTamil",      x: 62,  y: 10,  w: 136, h: 22,  visible: true,  zIndex: 3, fontSize: 9.5, fontBold: true,  fontTamil: true, color: "headerText", align: "center" },
  { id: "assoc-name-en",     label: "Org Name (English)",        type: "text",   field: "association.name",           x: 62,  y: 34,  w: 136, h: 10,  visible: false, zIndex: 3, fontSize: 7,   fontBold: true,  color: "headerText", align: "center" },
  { id: "assoc-reg",         label: "Reg. Number",               type: "text",   field: "association.regNumber",      x: 62,  y: 46,  w: 136, h: 9,   visible: true,  zIndex: 3, fontSize: 7,   color: "headerText", align: "center" },
  { id: "assoc-address",     label: "Address",                   type: "text",   field: "association.address",        x: 62,  y: 57,  w: 136, h: 9,   visible: true,  zIndex: 3, fontSize: 7,   fontTamil: true, color: "headerText", align: "center" },
  { id: "assoc-phone",       label: "State & Phone",             type: "text",   field: "association.statePhone",     x: 62,  y: 68,  w: 136, h: 9,   visible: true,  zIndex: 3, fontSize: 7,   color: "headerText", align: "center" },

  // ── Photo (flush left, no border) ─────────────────────────────────────────
  { id: "photo",             label: "Member Photo",              type: "image",  field: "member.photoUrl",            x: 0,   y: 108, w: 86,  h: 112, visible: true,  zIndex: 2, shape: "rect"   },

  // ── Name Bar Background (right of photo) ──────────────────────────────────
  { id: "name-bar-bg",       label: "Name Bar Background",       type: "rect",   x: 86,  y: 108, w: 174, h: 112, visible: true,  zIndex: 1, bgColor: "primary",    gradient: true  },

  // ── Name Bar Text ─────────────────────────────────────────────────────────
  { id: "member-name",       label: "Member Name (EN)",          type: "text",   field: "member.name",                x: 91,  y: 116, w: 163, h: 20,  visible: true,  zIndex: 3, fontSize: 11.5, fontBold: true,  color: "#ffffff",  align: "left" },
  { id: "member-name-tamil", label: "Member Name (TA)",          type: "text",   field: "member.nameTamil",           x: 91,  y: 140, w: 163, h: 14,  visible: true,  zIndex: 3, fontSize: 9.5,  fontTamil: true, color: "#dbeafe",  align: "left" },
  { id: "position",          label: "Member Position",           type: "text",   field: "member.position",            x: 91,  y: 157, w: 163, h: 12,  visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  color: "#bfdbfe",  align: "left" },
  // (optional extras in name bar — hidden by default; users can enable via designer)
  { id: "name-bar-biz-en",   label: "Business (EN) in Name Bar", type: "text",  field: "member.businessName",        x: 91,  y: 172, w: 163, h: 12,  visible: false, zIndex: 3, fontSize: 8.5,  fontBold: true,  color: "#fef08a",  align: "left" },
  { id: "name-bar-biz-ta",   label: "Business (TA) in Name Bar", type: "text",  field: "member.businessNameTamil",   x: 91,  y: 186, w: 163, h: 11,  visible: false, zIndex: 3, fontSize: 8.5,  fontTamil: true, color: "#fef9c3",  align: "left" },

  // ── Business Section (white area) ─────────────────────────────────────────
  { id: "biz-divider-top",   label: "Business Top Divider",      type: "line",   x: 0,   y: 220, w: 260, h: 2,   visible: true,  zIndex: 1, color: "primaryDark" },
  { id: "biz-name-tamil",    label: "Business Name (TA)",        type: "text",   field: "member.businessNameTamil",   x: 10,  y: 226, w: 240, h: 22,  visible: true,  zIndex: 3, fontSize: 12,  fontBold: true,  fontTamil: true, color: "#1e293b",  align: "center" },
  { id: "biz-name-en",       label: "Business Name (EN)",        type: "text",   field: "member.businessName",        x: 10,  y: 250, w: 240, h: 12,  visible: true,  zIndex: 3, fontSize: 8.5,  fontBold: true,  color: "#374151",  align: "center" },
  { id: "member-village",    label: "Village / Location",        type: "text",   field: "member.village",             x: 10,  y: 264, w: 240, h: 10,  visible: true,  zIndex: 3, fontSize: 8,   color: "#64748b",  align: "center" },
  { id: "biz-divider-bot",   label: "Business Bottom Divider",   type: "line",   x: 0,   y: 276, w: 260, h: 1.5, visible: true,  zIndex: 1, color: "primaryDark" },

  // ── Data Section (light-blue background) ──────────────────────────────────
  { id: "data-bg",           label: "Data Section Background",   type: "rect",   x: 0,   y: 278, w: 260, h: 80,  visible: true,  zIndex: 0, bgColor: "#eef4ff"  },
  { id: "row-phone",         label: "Cell Phone",                type: "row",    field: "member.phone",               x: 20,  y: 284, w: 220, h: 16,  visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  labelText: "Cell  :",  labelColor: "#475569", valueColor: "#1e293b", valueX: 96 },
  { id: "row-dob",           label: "Date of Birth",             type: "text",   field: "member.dateOfBirth",         x: 96,  y: 300, w: 144, h: 16,  visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  color: "#1e293b", align: "left" },
  { id: "row-validity",      label: "Validity",                  type: "text",   field: "member.validity",            x: 96,  y: 316, w: 144, h: 16,  visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  color: "#1e293b", align: "left" },
  { id: "row-id",            label: "Membership ID",             type: "row",    field: "member.membershipId",        x: 20,  y: 332, w: 220, h: 16,  visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  labelText: "ID. No.:", labelColor: "#475569", valueColor: "primary", valueX: 96 },

  // ── Footer Wave Arch ──────────────────────────────────────────────────────
  // bgColor "footerWave" renders as a convex bezier arch (not a plain rect).
  // Arch edge (at card sides): y ≈ 389  |  Arch peak (center): y ≈ 374
  { id: "footer-bg",         label: "Footer Wave Arch",          type: "rect",   x: 0,   y: 358, w: 260, h: 62,  visible: true,  zIndex: 0, bgColor: "footerWave" },

  // ── Signature (renders on top of arch) ────────────────────────────────────
  { id: "signature",         label: "Chairman Signature",        type: "image",  field: "association.sigChairmanUrl", x: 158, y: 358, w: 82,  h: 32,  visible: true,  zIndex: 2, shape: "rect"   },
  { id: "sig-title",         label: "Signature Title",           type: "text",   field: "settings.footerTitle",       x: 153, y: 393, w: 92,  h: 12,  visible: true,  zIndex: 3, fontSize: 8,   fontBold: true,  color: "#ffffff",  align: "center" },

  // ── QR Code (hidden by default) ────────────────────────────────────────────
  { id: "member-qr",         label: "Member QR Code",            type: "qrcode", field: "member.uuid",                x: 14,  y: 360, w: 55,  h: 55,  visible: false, zIndex: 3 },
];

/** Sample data shown in the designer canvas preview. */
export const PREVIEW_DATA: Record<string, string> = {
  "member.uuid":              "019dbbbd-b41b-72bd-92b3-22a79618b8c1",
  "member.name":              "P.D.P PONRAJ",
  "member.nameTamil":         "பி.டி.பி பொன்ராஜ்",
  "member.position":          "CHAIRMAN",
  "member.businessName":      "ABC TENT SERVICES",
  "member.businessNameTamil": "ஏபிசி கூடார சேவைகள்",
  "member.phone":             "9976607033",
  "member.membershipId":      "TN7200001",
  "member.village":           "Thisayanvilai",
  "member.validity":          "2024 – 2026",
  "member.email":             "member@example.com",
  "member.address":           "123, Sample Street, Chennai, Tamil Nadu",
  "member.dateOfBirth":       "15.08.1980",
  "association.name":         "FEDERATION OF TAMILNADU TENT DEALERS & DECORATORS WELFARE ASSOCIATION",
  "association.nameTamil":    "தமிழ்நாடு டெண்ட் டீலர்ஸ் மற்றும் டெக்கரேட்டர்ஸ் நல சங்கம்",
  "association.regNumber":    "பதிவு எண்: 34/2019",
  "association.address":      "Tamil Nadu",
  "association.statePhone":   "Tamil Nadu | Cell: 8883339090",
  "settings.footerTitle":     "STATE CHAIRMAN",
  "settings.cardTitle":       "MEMBER ID CARD",
};
