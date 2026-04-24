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
  borderColor?: string;
  borderWidth?: number;
  stackGroup?: string;   // elements with same group will stack vertically if one is empty/hidden
  minY?: number;         // stacking floor — element will never render above this Y (PDF pt)
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
  // ── Member identity ───────────────────────────────────────────────────────
  { id: "photo",            label: "Member Photo",      type: "image", field: "member.photoUrl",            x: 14,  y: 114, w: 78, h: 96,  visible: true,  zIndex: 2, shape: "rect", borderColor: "#e2e8f0", borderWidth: 1 },
  { id: "member-name",      label: "Member Name (EN)",  type: "text",  field: "member.name",                x: 105, y: 124, w: 141, h: 16, visible: true,  zIndex: 3, fontSize: 12,  fontBold: true,  color: "#0f172a",  align: "left" },
  { id: "member-name-tamil",label: "Member Name (TA)",  type: "text",  field: "member.nameTamil",           x: 105, y: 142, w: 141, h: 12, visible: true,  zIndex: 3, fontSize: 9,   fontTamil: true, color: "#334155",  align: "left" },
  { id: "position",         label: "Member Position",   type: "text",  field: "member.position",            x: 105, y: 155, w: 141, h: 12, visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  color: "#b45309",  align: "left" },
  { id: "business-name",    label: "Business Name (EN)",type: "text",  field: "member.businessName",        x: 105, y: 169, w: 141, h: 12, visible: true,  zIndex: 3, fontSize: 8.5, fontBold: true,  color: "#be185d",  align: "left" },
  { id: "business-tamil",   label: "Business Name (TA)",type: "text",  field: "member.businessNameTamil",   x: 105, y: 182, w: 141, h: 11, visible: true,  zIndex: 3, fontSize: 8,   fontTamil: true, color: "#334155",  align: "left" },
  { id: "member-village",   label: "Member Village",    type: "text",  field: "member.village",             x: 105, y: 194, w: 141, h: 11, visible: true,  zIndex: 3, fontSize: 7.5, color: "#2563eb",  align: "left" },

  // ── Data Fields (Value Only) ──────────────────────────────────────────────
  { id: "member-phone",     label: "Member Phone",      type: "text",  field: "member.phone",               x: 105, y: 210, w: 141, h: 12, visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  color: "#334155",  align: "left" },
  { id: "member-validity",  label: "Member Validity",   type: "text",  field: "member.validity",            x: 105, y: 222, w: 141, h: 12, visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  color: "#334155",  align: "left" },
  { id: "member-id",        label: "Membership ID",      type: "text",  field: "member.membershipId",        x: 105, y: 234, w: 141, h: 12, visible: true,  zIndex: 3, fontSize: 9,   fontBold: true,  color: "primary",  align: "left" },
  { id: "member-address",   label: "Member Address",    type: "text",  field: "member.address",             x: 28,  y: 260, w: 204, h: 24, visible: true,  zIndex: 3, fontSize: 8,   color: "#334155",  align: "left" },

  // ── Extra fields (hidden by default) ──────────────────────────────────────
  { id: "member-taluk",     label: "Member Taluk",      type: "text",  field: "member.taluk",               x: 28,  y: 285, w: 204, h: 12, visible: false, zIndex: 3, fontSize: 8,   color: "#334155",  align: "left" },
  { id: "member-district",  label: "Member District",   type: "text",  field: "member.district",            x: 28,  y: 297, w: 204, h: 12, visible: false, zIndex: 3, fontSize: 8,   color: "#334155",  align: "left" },

  // ── Signature ─────────────────────────────────────────────────────────────
  { id: "signature",  label: "Chairman Signature",  type: "image", field: "association.sigChairmanUrl", x: 175, y: 314, w: 65, h: 28, visible: true, zIndex: 2, shape: "rect" },
  { id: "sig-title",  label: "Signature Title",     type: "text",  field: "settings.footerTitle",       x: 170, y: 344, w: 75, h: 10, visible: true, zIndex: 3, fontSize: 7.5, fontBold: true, color: "#be185d", align: "center" },
 
  // ── Footer ────────────────────────────────────────────────────────────────
  { id: "footer-title", label: "Footer Title", type: "text", field: "settings.footerTitle", x: 0, y: 396, w: 260, h: 14, visible: true, zIndex: 3, fontSize: 10, fontBold: true, color: "headerText", align: "center" },

  // ── QR Code (UUID) ────────────────────────────────────────────────────────
  { id: "member-qr",    label: "Member QR Code", type: "qrcode", field: "member.uuid", x: 14, y: 290, w: 60, h: 60, visible: false, zIndex: 3 },
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
  "member.village":          "Thisayanvilai",
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
