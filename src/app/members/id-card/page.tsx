"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2, CreditCard, ShieldOff, Printer, RotateCcw, Download,
  BadgeCheck, MapPin, Phone, Mail, Briefcase, Calendar,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ─── Validation schema ────────────────────────────────────────────────────────
const lookupSchema = z.object({
  memberId: z
    .string()
    .min(1, "Membership ID is required")
    .transform((v) => v.trim().toUpperCase()),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
});

type LookupInput = z.infer<typeof lookupSchema>;

// ─── Types ────────────────────────────────────────────────────────────────────
interface IdCardSettings {
  primaryColor?: string;
  secondaryColor?: string;
  headerTextColor?: string;
  cardTitle?: string;
  showPhoto?: boolean;
  showMembershipId?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showAddress?: boolean;
  showDateOfBirth?: boolean;
  showBusinessName?: boolean;
  showPosition?: boolean;
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

const DEFAULTS: Required<IdCardSettings> = {
  primaryColor: "#1e40af",
  secondaryColor: "#ffffff",
  headerTextColor: "#ffffff",
  cardTitle: "Member ID Card",
  showPhoto: true,
  showMembershipId: true,
  showPhone: true,
  showEmail: false,
  showAddress: true,
  showDateOfBirth: false,
  showBusinessName: true,
  showPosition: true,
  showJoinedAt: true,
};

function fmt(d: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); } catch { return ""; }
}

// ─── ID Card Component ────────────────────────────────────────────────────────

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function IdCardLookupPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [appSettings, setAppSettings] = useState<{ name?: string; logo1Url?: string; tagline?: string } | null>(null);
  const [fetching, setFetching] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LookupInput>({ resolver: zodResolver(lookupSchema) });

  useEffect(() => {
    fetch("/api/settings/app")
      .then((r) => r.json())
      .then((j) => {
        setEnabled(j.data?.enableIdCard ?? true);
        setAppSettings(j.data);
      })
      .catch(() => setEnabled(true));
  }, []);

  const onSubmit = async (data: LookupInput) => {
    setFetching(true);
    try {
      // Step 1: lookup uuid and issue a one-time PDF token
      const lookupRes = await fetch(
        `/api/members/card/lookup?memberId=${encodeURIComponent(data.memberId)}&phone=${encodeURIComponent(data.phone)}`
      );
      const lookupJson = await lookupRes.json();

      if (!lookupRes.ok || !lookupJson.data?.pdfToken) {
        toast.error(lookupJson.message || "No active member found with that combination.");
        return;
      }

      // Step 2: Directly redirect to the proxied PDF URL
      toast.success("Identity verified! Opening your ID card...");
      
      // Small delay to let the toast be seen, then redirect
      setTimeout(() => {
        window.location.href = `/members/id-card/${lookupJson.data.pdfToken}.pdf`;
      }, 1000);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      // We don't setFetching(false) immediately because we are navigating away
      setTimeout(() => setFetching(false), 2000);
    }
  };


  // ── Loading ──
  if (enabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ── Feature disabled ──
  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Toaster position="top-right" />
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <ShieldOff className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">ID Card Unavailable</h2>
          <p className="text-gray-500 text-sm">The member ID card feature is currently disabled. Please contact the association.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print CSS: only show the card area when printing */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #id-card-print-area, #id-card-print-area * { visibility: visible !important; }
          #id-card-print-area {
            position: fixed !important; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4 py-10">
        <Toaster position="top-right" />

        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md no-print">
          {/* Branding */}
          <div className="text-center mb-6">
            {appSettings?.logo1Url && (
              <img src={appSettings.logo1Url} alt="Logo" className="mx-auto h-16 w-16 object-contain mb-3" />
            )}
            <h1 className="text-xl font-bold text-gray-800">{appSettings?.name || "Association"}</h1>
            {appSettings?.tagline && <p className="text-sm text-gray-500 mt-1">{appSettings.tagline}</p>}
          </div>

          <div className="flex items-center gap-2 justify-center mb-6">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-700">View Your ID Card</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Membership ID */}
            <div>
              <label htmlFor="memberId" className="block text-sm font-medium text-gray-700 mb-1">
                Membership ID <span className="text-red-500">*</span>
              </label>
              <input
                id="memberId"
                type="text"
                autoComplete="off"
                placeholder="e.g. FTTD260001"
                disabled={fetching}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.memberId ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-300"
                }`}
                {...register("memberId")}
              />
              {errors.memberId && (
                <p className="text-red-500 text-xs mt-1">{errors.memberId.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Registered Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="off"
                placeholder="10-digit mobile number"
                disabled={fetching}
                maxLength={10}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.value = el.value.replace(/\D/g, "").slice(0, 10);
                }}
                className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  errors.phone ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-300"
                }`}
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={fetching}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
            >
              {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {fetching ? "Verifying..." : "View ID Card"}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            Both fields must match your registered details. Only active members can view their ID card.
          </p>
        </div>
      </div>
    </>
  );
}
