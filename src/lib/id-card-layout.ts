// ─── Shared ID Card Layout Types & Defaults ───────────────────────────────────
// Imported by both the designer (client) and PDF service (server).
// Coordinates are in PDF pt units (card = 260 × 420 pt).

export type ElemType = "rect" | "text" | "image" | "line" | "row";
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
  color?: string;        // hex, or "headerText" | "primary" | "primaryDark"
  align?: Align;
  // ── row extras ──
  valueX?: number;       // absolute x of the value column (PDF pt)
  labelColor?: string;
  valueColor?: string;   // hex or "primary"
  // ── rect ──
  bgColor?: string;      // hex, or "primary" | "primaryDark"
  gradient?: boolean;
  opacity?: number;
  // ── image ──
  shape?: "rect" | "circle";
  stackGroup?: string;   // elements with same group will stack vertically if one is empty/hidden
}

/** Default layout — matches the current hardcoded PDF design. */
export const DEFAULT_LAYOUT: LayoutElement[] = [
  // ── Backgrounds ──────────────────────────────────────────────────────────
  { id: "header-bg",        label: "Header Background", type: "rect",  x: 0,   y: 0,   w: 260, h: 103, visible: true,  zIndex: 0, bgColor: "primary",     gradient: true  },
  { id: "accent-stripe",    label: "Accent Stripe",     type: "rect",  x: 0,   y: 100, w: 260, h: 3,   visible: true,  zIndex: 1, bgColor: "primaryDark" },
  { id: "footer-bg",        label: "Footer Bar",        type: "rect",  x: 0,   y: 382, w: 260, h: 38,  visible: true,  zIndex: 0, bgColor: "primary",     gradient: true  },

  // ── Header content ────────────────────────────────────────────────────────
  { id: "logo1",            label: "Logo (Left)",       type: "image", field: "association.logo1Url",       x: 14,  y: 12,  w: 42, h: 42,  visible: true,  zIndex: 2, shape: "circle" },
  { id: "logo2",            label: "Logo (Right)",      type: "image", field: "association.logo2Url",       x: 204, y: 12,  w: 42, h: 42,  visible: true,  zIndex: 2, shape: "circle" },
  { id: "assoc-name-tamil", label: "Org Name (Tamil)",  type: "text",  field: "association.nameTamil",      x: 62,  y: 14,  w: 136, h: 14, visible: true,  zIndex: 3, fontSize: 9.5, fontBold: true,  fontTamil: true, color: "headerText", align: "center" },
  { id: "assoc-name-en",    label: "Org Name (English)",type: "text",  field: "association.name",           x: 62,  y: 30,  w: 136, h: 10, visible: true,  zIndex: 3, fontSize: 7.5, fontBold: true,  color: "headerText", align: "center" },
  { id: "assoc-reg",        label: "Reg. Number",       type: "text",  field: "association.regNumber",      x: 62,  y: 42,  w: 136, h: 10, visible: true,  zIndex: 3, fontSize: 7,   color: "headerText", align: "center" },
  { id: "assoc-address",    label: "Address",           type: "text",  field: "association.address",        x: 62,  y: 53,  w: 136, h: 10, visible: true,  zIndex: 3, fontSize: 7,   fontTamil: true, color: "headerText", align: "center" },
  { id: "assoc-phone",      label: "State & Phone",     type: "text",  field: "association.statePhone",     x: 62,  y: 64,  w: 136, h: 10, visible: true,  zIndex: 3, fontSize: 7,   color: "headerText", align: "center" },

  // ── Member identity ───────────────────────────────────────────────────────
  { id: "photo",            label: "Photo",             type: "image", field: "member.photoUrl",            x: 14,  y: 114, w: 78, h: 96,  visible: true,  zIndex: 2, shape: "rect" },
  { id: "member-name",      label: "Member Name",       type: "text",  field: "member.name",                x: 105, y: 124, w: 141, h: 16, visible: true,  zIndex: 3, fontSize: 12,  fontBold: true,  color: "#0f172a",  align: "left", stackGroup: "identity" },
  { id: "member-name-tamil",label: "Name (Tamil)",      type: "text",  field: "member.nameTamil",           x: 105, y: 142, w: 141, h: 12, visible: true,  zIndex: 3, fontSize: 9,   fontTamil: true, color: "#334155",  align: "left", stackGroup: "identity" },
  { id: "position",         label: "Position",          type: "text",  field: "member.position",            x: 105, y: 155, w: 141, h: 12, visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  color: "#b45309",  align: "left", stackGroup: "identity" },
  { id: "business-name",    label: "Business Name",     type: "text",  field: "member.businessName",        x: 105, y: 169, w: 141, h: 12, visible: true,  zIndex: 3, fontSize: 8.5, fontBold: true,  color: "#be185d",  align: "left", stackGroup: "identity" },
  { id: "business-tamil",   label: "Business (Tamil)",  type: "text",  field: "member.businessNameTamil",   x: 105, y: 182, w: 141, h: 11, visible: true,  zIndex: 3, fontSize: 8,   fontTamil: true, color: "#334155",  align: "left", stackGroup: "identity" },
  { id: "location",         label: "Location",          type: "text",  field: "member.location",            x: 105, y: 194, w: 141, h: 11, visible: true,  zIndex: 3, fontSize: 7.5, color: "#2563eb",  align: "left", stackGroup: "identity" },

  // ── Divider ───────────────────────────────────────────────────────────────
  { id: "divider",          label: "Divider",           type: "line",  x: 20,  y: 228, w: 220, h: 1,   visible: true,  zIndex: 2, color: "#e2e8f0", stackGroup: "identity" },

  // ── Data rows ─────────────────────────────────────────────────────────────
  { id: "row-phone",    label: "Cell No",    type: "row", field: "member.phone",        x: 28, y: 244, w: 204, h: 16, visible: true, zIndex: 3, fontSize: 9, labelText: "Cell No",    valueX: 110, labelColor: "#64748b", valueColor: "#334155", stackGroup: "rows" },
  { id: "row-validity", label: "Validity",   type: "row", field: "member.validity",     x: 28, y: 261, w: 204, h: 16, visible: true, zIndex: 3, fontSize: 9, labelText: "Validity",   valueX: 110, labelColor: "#64748b", valueColor: "#334155", stackGroup: "rows" },
  { id: "row-id",       label: "ID Number",  type: "row", field: "member.membershipId", x: 28, y: 278, w: 204, h: 16, visible: true, zIndex: 3, fontSize: 9, labelText: "ID Number",  valueX: 110, labelColor: "#64748b", valueColor: "primary",  stackGroup: "rows" },
  { id: "row-address",  label: "Address",    type: "row", field: "member.address",      x: 28, y: 295, w: 204, h: 16, visible: true, zIndex: 3, fontSize: 9, labelText: "Address",    valueX: 110, labelColor: "#64748b", valueColor: "#334155", stackGroup: "rows" },

  // ── Signature ─────────────────────────────────────────────────────────────
  { id: "signature",  label: "Signature",       type: "image", field: "association.sigChairmanUrl", x: 175, y: 314, w: 65, h: 28, visible: true, zIndex: 2, shape: "rect" },
  { id: "sig-title",  label: "Signature Title", type: "text",  field: "settings.footerTitle",       x: 170, y: 344, w: 75, h: 10, visible: true, zIndex: 3, fontSize: 7.5, fontBold: true, color: "#be185d", align: "center" },

  // ── Footer ────────────────────────────────────────────────────────────────
  { id: "footer-title", label: "Footer Title", type: "text", field: "settings.footerTitle", x: 0, y: 396, w: 260, h: 14, visible: true, zIndex: 3, fontSize: 10, fontBold: true, color: "headerText", align: "center" },
];

/** Sample data shown in the designer canvas preview. */
export const PREVIEW_DATA: Record<string, string> = {
  "member.name":              "P.D.P PONRAJ",
  "member.nameTamil":         "பி.டி.பி பொன்ராஜ்",
  "member.position":          "CHAIRMAN",
  "member.businessName":      "ABC TENT SERVICES",
  "member.businessNameTamil": "ஏபிசி கூடார சேவைகள்",
  "member.phone":             "9976607033",
  "member.membershipId":      "TN7200001",
  "member.location":          "Koyambedu, Chennai",
  "member.validity":          "2026 - 2028",
  "member.email":             "member@example.com",
  "member.address":           "123, Sample Street, Chennai, Tamil Nadu",
  "association.name":         "FEDERATION OF TAMILNADU TENT DEALERS & DECORATORS WELFARE ASSOCIATION",
  "association.nameTamil":    "தமிழ்நாடு டெண்ட் டீலர்ஸ் மற்றும் டெக்கரேட்டர்ஸ் நல சங்கம்",
  "association.regNumber":    "பதிவு எண்: 34/2019",
  "association.address":      "Tamil Nadu",
  "association.statePhone":   "Tamil Nadu | Cell: 8883339090",
  "settings.footerTitle":     "STATE CHAIRMAN",
  "settings.cardTitle":       "MEMBER ID CARD",
};
