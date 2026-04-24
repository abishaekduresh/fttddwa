"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CreditCard, ShieldOff, UserPlus } from "lucide-react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

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

export default function IdCardLookupPage() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [appSettings, setAppSettings] = useState<{ name?: string; nameTamil?: string; logo1Url?: string; logo2Url?: string; tagline?: string } | null>(null);
  const [fetching, setFetching] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LookupInput>({
    resolver: zodResolver(lookupSchema),
  });

  useEffect(() => {
    fetch("/api/settings/app")
      .then((r) => r.json())
      .then((j) => { setEnabled(j.data?.enableIdCard ?? true); setAppSettings(j.data); })
      .catch(() => setEnabled(true));
  }, []);

  const onSubmit = async (data: LookupInput) => {
    setFetching(true);
    try {
      const res = await fetch(
        `/api/members/card/lookup?memberId=${encodeURIComponent(data.memberId)}&phone=${encodeURIComponent(data.phone)}`
      );
      const json = await res.json();

      if (!res.ok || !json.success || !json.data?.pdfToken) {
        toast.error(json.message || "No active member found with that Membership ID and phone number.");
        return;
      }

      toast.success("Identity verified! Opening your ID card...");
      setTimeout(() => {
        window.location.href = `/members/id-card/pdf/${json.data.pdfToken}`;
      }, 800);
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setTimeout(() => setFetching(false), 1500);
    }
  };

  if (enabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Toaster position="top-center" />
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
    <style>{`@font-face { font-family: 'NotoSansTamil'; src: url('/fonts/NotoSansTamil.ttf') format('truetype'); }`}</style>
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4 py-10">
      <Toaster position="top-center" />

      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Branding */}
        <div className="flex items-center gap-3 mb-6">
          {appSettings?.logo1Url ? (
            <img src={appSettings.logo1Url} alt="Logo" className="h-14 w-14 object-contain flex-shrink-0" />
          ) : (
            <div className="h-14 w-14 flex-shrink-0" />
          )}
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-base font-bold text-gray-800 leading-tight">{appSettings?.name || "Association"}</h1>
            {/* {appSettings?.nameTamil && (
              <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: "'NotoSansTamil', sans-serif" }}>{appSettings.nameTamil}</p>
            )} */}
            {appSettings?.tagline && <p className="text-xs text-gray-500 mt-0.5">{appSettings.tagline}</p>}
          </div>
          {appSettings?.logo2Url ? (
            <img src={appSettings.logo2Url} alt="Logo 2" className="h-14 w-14 object-contain flex-shrink-0" />
          ) : (
            <div className="h-14 w-14 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2 justify-center mb-6">
          {/* <CreditCard className="h-5 w-5 text-blue-600" /> */}
          <h2 className="text-lg font-semibold text-gray-700">View Your ID Card</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="memberId" className="block text-sm font-medium text-gray-700 mb-1">
              Membership ID <span className="text-red-500">*</span>
            </label>
            <input
              id="memberId"
              type="text"
              autoComplete="off"
              placeholder="e.g. TN7200001"
              disabled={fetching}
              className={`w-full px-4 py-2.5 border rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                errors.memberId ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-300"
              }`}
              {...register("memberId")}
            />
            {errors.memberId && <p className="text-red-500 text-xs mt-1">{errors.memberId.message}</p>}
          </div>

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
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
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

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Not yet a member?{" "}
            <Link
              href="/members/register"
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
            >
              <UserPlus size={13} />
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
