"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Printer, ArrowLeft, ShieldOff } from "lucide-react";
import { Toaster } from "react-hot-toast";

interface IdCardSettings {
  primaryColor?: string;
  secondaryColor?: string;
  headerTextColor?: string;
  cardTitle?: string;
  footerTitle?: string;
  showPhoto?: boolean;
  showName?: boolean;
  showNameTamil?: boolean;
  showMembershipId?: boolean;
  showPosition?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showAddress?: boolean;
  showDateOfBirth?: boolean;
  showBusinessName?: boolean;
  showBusinessNameTamil?: boolean;
  showJoinedAt?: boolean;
}

interface MemberCard {
  uuid: string;
  membershipId: string;
  name: string;
  nameTamil: string | null;
  businessName: string | null;
  businessNameTamil: string | null;
  position: string | null;
  district: string;
  taluk: string;
  village: string | null;
  state: string;
  phone: string;
  email: string | null;
  photoUrl: string | null;
  status: string;
  dateOfBirth: string | null;
  joinedAt: string;
}

interface Association {
  name: string | null;
  nameTamil: string | null;
  shortName: string | null;
  logo1Url: string | null;
  logo2Url: string | null;
  tagline: string | null;
  regNumber: string | null;
  phone: string | null;
  address: string | null;
  addressTamil: string | null;
  state: string | null;
  sigChairmanUrl: string | null;
}

const DEFAULT_SETTINGS: Required<IdCardSettings> = {
  primaryColor: "#1e293b",
  secondaryColor: "#ffffff",
  headerTextColor: "#ffffff",
  cardTitle: "MEMBER ID CARD",
  footerTitle: "STATE CHAIRMAN",
  showPhoto: true,
  showName: true,
  showNameTamil: false,
  showMembershipId: true,
  showPosition: true,
  showPhone: true,
  showEmail: false,
  showAddress: true,
  showDateOfBirth: false,
  showBusinessName: true,
  showBusinessNameTamil: false,
  showJoinedAt: true,
};

function formatDate(d: string | null) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return ""; }
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function darkenHex(hex: string, amount = 30): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0xff) - amount);
  const b = Math.max(0, (num & 0xff) - amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── Corporate ID Card ─────────────────────────────────────────────────────────
function CorporateIdCard({
  member,
  association,
  settings,
}: {
  member: MemberCard;
  association: Association;
  settings: Required<IdCardSettings>;
}) {
  const primary = settings.primaryColor;
  const primaryDark = darkenHex(primary, 40);
  const headerText = settings.headerTextColor;
  const primaryRgb = hexToRgb(primary);

  const validityStart = new Date(member.joinedAt).getFullYear();
  const validityEnd = validityStart + 2;
  const location = [member.village, member.taluk, member.district].filter(Boolean).join(", ");
  const fullAddress = [location, member.state].filter(Boolean).join(", ");

  const rows: { label: string; value: string }[] = [];
  if (settings.showPhone) rows.push({ label: "Cell No", value: member.phone });
  if (settings.showJoinedAt) rows.push({ label: "Validity", value: `${validityStart} – ${validityEnd}` });
  if (settings.showMembershipId) rows.push({ label: "ID Number", value: member.membershipId });
  if (settings.showDateOfBirth && member.dateOfBirth) rows.push({ label: "Date of Birth", value: formatDate(member.dateOfBirth) });
  if (settings.showEmail && member.email) rows.push({ label: "Email", value: member.email });
  if (settings.showAddress && fullAddress) rows.push({ label: "District", value: [member.village, member.taluk, member.district].filter(Boolean).join(", ") });

  return (
    <div
      id="id-card-print-area"
      className="w-[320px] rounded-2xl overflow-hidden shadow-2xl select-none"
      style={{ backgroundColor: "#ffffff", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
    >
      {/* ── Header ── */}
      <div
        className="relative px-4 pt-5 pb-4 flex items-start gap-3"
        style={{
          background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
          color: headerText,
        }}
      >
        {/* Logo left */}
        {association.logo1Url ? (
          <img
            src={association.logo1Url}
            alt="Logo"
            className="h-11 w-11 rounded-full bg-white/20 object-contain p-0.5 flex-shrink-0 ring-2 ring-white/30"
          />
        ) : (
          <div className="h-11 w-11 rounded-full bg-white/20 flex-shrink-0" />
        )}

        {/* Centre text */}
        <div className="flex-1 text-center min-w-0">
          <p className="text-[11px] font-bold leading-tight tracking-wide uppercase" style={{ color: headerText }}>
            {association.name || "Association"}
          </p>
          {association.nameTamil && (
            <p className="text-[9px] opacity-80 mt-0.5" style={{ color: headerText }}>{association.nameTamil}</p>
          )}
          {association.regNumber && (
            <p className="text-[8.5px] opacity-70 mt-0.5" style={{ color: headerText }}>
              Reg. No: {association.regNumber}
            </p>
          )}
          {association.addressTamil && (
            <p className="text-[8px] opacity-65 mt-0.5 truncate" style={{ color: headerText, fontFamily: "'NotoSansTamil', sans-serif" }}>{association.addressTamil}</p>
          )}
          {!association.addressTamil && association.address && (
            <p className="text-[8px] opacity-65 mt-0.5 truncate" style={{ color: headerText }}>{association.address}</p>
          )}
          {association.phone && (
            <p className="text-[8px] opacity-70 mt-0.5" style={{ color: headerText }}>
              {association.state ? `${association.state} | ` : ""}Cell: {association.phone}
            </p>
          )}
        </div>

        {/* Logo right */}
        {association.logo2Url ? (
          <img
            src={association.logo2Url}
            alt="Logo 2"
            className="h-11 w-11 rounded-full bg-white/20 object-contain p-0.5 flex-shrink-0 ring-2 ring-white/30"
          />
        ) : (
          <div className="h-11 w-11 rounded-full bg-white/20 flex-shrink-0" />
        )}
      </div>

      {/* ── Thin accent stripe ── */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${primary}, ${primaryDark})` }} />

      {/* ── Identity Section ── */}
      <div className="px-5 pt-5 pb-3 flex gap-4 items-start">
        {/* Photo */}
        {settings.showPhoto && (
          <div
            className="flex-shrink-0 w-[84px] h-[100px] overflow-hidden rounded-lg ring-2"
            style={{ boxShadow: `0 0 0 2px ${primary}` }}
          >
            {member.photoUrl ? (
              <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: `rgba(${primaryRgb}, 0.1)`, color: primary }}
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Name + Position */}
        <div className="flex-1 min-w-0 pt-1">
          {settings.showName && (
            <h2 className="text-[14px] font-extrabold text-slate-900 leading-tight tracking-tight uppercase">
              {member.name}
            </h2>
          )}
          {settings.showNameTamil && member.nameTamil && (
            <p className="text-[11px] text-slate-600 mt-0.5 leading-tight">{member.nameTamil}</p>
          )}
          {settings.showPosition && member.position && (
            <p
              className="text-[11px] font-bold mt-1 uppercase tracking-wide"
              style={{ color: "#ca8a04" }}
            >
              {member.position}
            </p>
          )}
          {settings.showBusinessName && member.businessName && (
            <p className="text-[10px] text-slate-500 mt-1.5 leading-tight font-medium">
              {member.businessName}
            </p>
          )}
          {settings.showBusinessNameTamil && member.businessNameTamil && (
            <p className="text-[9.5px] text-slate-400 mt-0.5 leading-tight">{member.businessNameTamil}</p>
          )}
          {settings.showAddress && location && (
            <p className="text-[9.5px] text-slate-400 mt-1 leading-tight">{location}</p>
          )}
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 border-t border-slate-100" />

      {/* ── Data Rows ── */}
      {rows.length > 0 && (
        <div className="px-5 py-3 space-y-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{label}</span>
              <span
                className="text-[11px] font-bold text-slate-800 text-right"
                style={label === "ID Number" ? { color: primary, fontFamily: "monospace" } : {}}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Signature Area ── */}
      {association.sigChairmanUrl && (
        <div className="px-5 pt-1 pb-2 flex justify-end">
          <div className="text-right">
            <img
              src={association.sigChairmanUrl}
              alt="Signature"
              className="h-9 object-contain ml-auto opacity-90"
            />
            <p className="text-[9px] font-semibold mt-0.5" style={{ color: primary }}>
              {settings.footerTitle}
            </p>
          </div>
        </div>
      )}

      {/* ── Footer Bar ── */}
      <div
        className="px-5 py-3 text-center"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)` }}
      >
        <p className="text-[11px] font-bold tracking-widest uppercase" style={{ color: headerText }}>
          {settings.footerTitle || settings.cardTitle}
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function IdCardPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberCard | null>(null);
  const [association, setAssociation] = useState<Association | null>(null);
  const [settings, setSettings] = useState<Required<IdCardSettings>>(DEFAULT_SETTINGS);
  const [notFound, setNotFound] = useState(false);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    if (!uuid) return;
    fetch(`/api/members/card/${uuid}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) {
          if (j.message?.includes("not available")) setDisabled(true);
          else setNotFound(true);
          return;
        }
        setMember(j.data.member);
        setAssociation(j.data.association);
        if (j.data.idCardSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...j.data.idCardSettings });
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <ShieldOff className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">ID Card Unavailable</h2>
          <p className="text-gray-500 text-sm">The member ID card feature is currently disabled.</p>
        </div>
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <Toaster position="top-right" />
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Member Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">
            The ID card could not be found or the member is no longer active.
          </p>
          <button
            onClick={() => router.push("/members/id-card")}
            className="text-blue-600 text-sm hover:underline"
          >
            ← Back to lookup
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #id-card-print-area, #id-card-print-area * { visibility: visible !important; }
          #id-card-print-area {
            position: fixed !important; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center px-4 py-8">
        <Toaster position="top-right" />

        {/* Action bar */}
        <div className="no-print flex items-center justify-between w-full max-w-sm mb-5">
          <button
            onClick={() => router.push("/members/id-card")}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            style={{ backgroundColor: settings.primaryColor }}
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>

        <CorporateIdCard
          member={member}
          association={association as Association}
          settings={settings}
        />

        <p className="no-print text-xs text-slate-400 mt-5 text-center">
          For official use only &bull; {association?.name}
        </p>
      </div>
    </>
  );
}
