"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Printer, ArrowLeft, ShieldOff, Calendar, MapPin, Phone, Mail, Briefcase, BadgeCheck } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

interface IdCardSettings {
  primaryColor?: string;
  secondaryColor?: string;
  headerTextColor?: string;
  showPhoto?: boolean;
  showMembershipId?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showAddress?: boolean;
  showDateOfBirth?: boolean;
  showBusinessName?: boolean;
  showPosition?: boolean;
  showJoinedAt?: boolean;
  cardTitle?: string;
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
}

const DEFAULT_SETTINGS: Required<IdCardSettings> = {
  primaryColor: "#1e40af",
  secondaryColor: "#ffffff",
  headerTextColor: "#ffffff",
  showPhoto: true,
  showMembershipId: true,
  showPhone: true,
  showEmail: false,
  showAddress: true,
  showDateOfBirth: false,
  showBusinessName: true,
  showPosition: true,
  showJoinedAt: true,
  cardTitle: "Member ID Card",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

export default function IdCardPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

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

  function handlePrint() {
    window.print();
  }

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
          <p className="text-gray-500 text-sm mb-6">The ID card could not be found or the member is no longer active.</p>
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

  const primary = settings.primaryColor;
  const secondary = settings.secondaryColor;
  const headerText = settings.headerTextColor;

  const address = [member.village, member.taluk, member.district, member.state].filter(Boolean).join(", ");

  return (
    <>
      {/* Print-only global styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #id-card-print-area, #id-card-print-area * { visibility: visible !important; }
          #id-card-print-area { position: fixed !important; top: 0; left: 0; width: 100vw; display: flex; align-items: center; justify-content: center; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center px-4 py-8">
        <Toaster position="top-right" />

        {/* Action bar */}
        <div className="no-print flex items-center justify-between w-full max-w-sm mb-4">
          <button
            onClick={() => router.push("/members/id-card")}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>

        {/* ID Card */}
        <div id="id-card-print-area">
          <div
            ref={cardRef}
            className="w-80 rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: secondary, fontFamily: "Inter, sans-serif" }}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ backgroundColor: primary, color: headerText }}
            >
              {association?.logo1Url && (
                <img
                  src={association.logo1Url}
                  alt="Logo"
                  className="h-10 w-10 object-contain rounded-full bg-white/20 p-0.5"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-tight opacity-90 truncate">
                  {association?.name || "Association"}
                </p>
                {association?.nameTamil && (
                  <p className="text-xs opacity-75 truncate">{association.nameTamil}</p>
                )}
                <p className="text-xs font-bold mt-0.5 opacity-80">{settings.cardTitle}</p>
              </div>
              {association?.logo2Url && (
                <img
                  src={association.logo2Url}
                  alt="Logo 2"
                  className="h-10 w-10 object-contain rounded-full bg-white/20 p-0.5"
                />
              )}
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <div className="flex gap-4 items-start mb-4">
                {/* Photo */}
                {settings.showPhoto && (
                  <div
                    className="flex-shrink-0 h-20 w-20 rounded-xl overflow-hidden border-2"
                    style={{ borderColor: primary }}
                  >
                    {member.photoUrl ? (
                      <img
                        src={member.photoUrl}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex items-center justify-center text-2xl font-bold"
                        style={{ backgroundColor: `${primary}20`, color: primary }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                {/* Name + ID */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-800 leading-tight">{member.name}</h2>
                  {member.nameTamil && (
                    <p className="text-sm text-gray-600 mt-0.5">{member.nameTamil}</p>
                  )}
                  {settings.showMembershipId && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <BadgeCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ color: primary }} />
                      <span className="text-xs font-mono font-semibold" style={{ color: primary }}>
                        {member.membershipId}
                      </span>
                    </div>
                  )}
                  {settings.showPosition && member.position && (
                    <p className="text-xs text-gray-500 mt-1">{member.position}</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2">
                {settings.showBusinessName && member.businessName && (
                  <div className="flex items-start gap-2">
                    <Briefcase className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{member.businessName}</p>
                      {member.businessNameTamil && (
                        <p className="text-xs text-gray-500 truncate">{member.businessNameTamil}</p>
                      )}
                    </div>
                  </div>
                )}

                {settings.showAddress && address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                    <p className="text-xs text-gray-600">{address}</p>
                  </div>
                )}

                {settings.showPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <p className="text-xs text-gray-700">{member.phone}</p>
                  </div>
                )}

                {settings.showEmail && member.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <p className="text-xs text-gray-600 truncate">{member.email}</p>
                  </div>
                )}

                {settings.showDateOfBirth && member.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <p className="text-xs text-gray-600">DOB: {formatDate(member.dateOfBirth)}</p>
                  </div>
                )}

                {settings.showJoinedAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <p className="text-xs text-gray-500">Member since {formatDate(member.joinedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-2 text-center"
              style={{ backgroundColor: `${primary}15` }}
            >
              {association?.regNumber && (
                <p className="text-xs text-gray-500">Reg. No: {association.regNumber}</p>
              )}
              {association?.tagline && (
                <p className="text-xs text-gray-400 mt-0.5">{association.tagline}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
