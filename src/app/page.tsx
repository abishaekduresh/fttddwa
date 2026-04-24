"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  LogIn,
  UserPlus,
  CreditCard,
  MapPin,
  Phone,
  Mail,
  Hash,
  Building2,
  ChevronRight,
  Shield,
  Users,
  Award,
} from "lucide-react";

interface AppSettings {
  enableMemberRegistration: boolean;
  enableIdCard: boolean;
  name?: string;
  nameTamil?: string;
  tagline?: string;
  logo1Url?: string;
  logo2Url?: string;
}

interface AssociationSettings {
  name?: string;
  nameTamil?: string;
  shortName?: string;
  tagline?: string;
  taglineTamil?: string;
  logo1Url?: string;
  logo2Url?: string;
  regNumber?: string;
  address?: string;
  addressTamil?: string;
  state?: string;
  email?: string;
  phone?: string;
}

export default function HomePage() {
  const [app, setApp] = useState<AppSettings | null>(null);
  const [assoc, setAssoc] = useState<AssociationSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/app").then((r) => r.json()),
      fetch("/api/settings/association").then((r) => r.json()),
    ])
      .then(([appJson, assocJson]) => {
        if (appJson.success) setApp(appJson.data);
        if (assocJson.success) setAssoc(assocJson.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const name = assoc?.name || app?.name || "FTTDDWA";
  const nameTamil = assoc?.nameTamil || app?.nameTamil;
  const tagline = assoc?.tagline || app?.tagline;
  const taglineTamil = assoc?.taglineTamil;
  const logo1 = assoc?.logo1Url || app?.logo1Url;
  const logo2 = assoc?.logo2Url || app?.logo2Url;
  const showRegister = app?.enableMemberRegistration ?? true;
  const showIdCard = app?.enableIdCard ?? true;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        @font-face {
          font-family: 'NotoSansTamil';
          src: url('/fonts/NotoSansTamil-Regular.ttf') format('truetype');
          font-weight: 400;
        }
        @font-face {
          font-family: 'NotoSansTamil';
          src: url('/fonts/NotoSansTamil-SemiBold.ttf') format('truetype');
          font-weight: 600;
        }
        .tamil { font-family: 'NotoSansTamil', sans-serif; }
        .hero-bg {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #1e40af 100%);
        }
        .card-shine {
          position: relative;
          overflow: hidden;
        }
        .card-shine::before {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
          transition: left 0.5s ease;
        }
        .card-shine:hover::before { left: 150%; }
        .action-card:hover { transform: translateY(-4px); }
        .action-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
      `}</style>

      <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }} className="min-h-screen bg-slate-50">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="hero-bg text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">

            {/* Logos + Name */}
            <div className="flex flex-col items-center text-center gap-6">

              {/* Logo row */}
              <div className="flex items-center justify-center gap-4 sm:gap-8">
                {logo1 && (
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-2 flex items-center justify-center flex-shrink-0">
                    <Image
                      src={logo1}
                      alt="Logo"
                      width={80}
                      height={80}
                      className="object-contain w-full h-full"
                      unoptimized
                    />
                  </div>
                )}

                {!logo1 && !logo2 && (
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    <Building2 className="w-10 h-10 sm:w-14 sm:h-14 text-blue-200" />
                  </div>
                )}

                {logo2 && (
                  <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-2 flex items-center justify-center flex-shrink-0">
                    <Image
                      src={logo2}
                      alt="Logo 2"
                      width={80}
                      height={80}
                      className="object-contain w-full h-full"
                      unoptimized
                    />
                  </div>
                )}
              </div>

              {/* Association name */}
              {loading ? (
                <div className="space-y-3">
                  <div className="h-8 w-80 bg-white/10 rounded-lg animate-pulse mx-auto" />
                  <div className="h-5 w-56 bg-white/10 rounded-lg animate-pulse mx-auto" />
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight tracking-tight text-white">
                    {name}
                  </h1>
                  {nameTamil && (
                    <p className="tamil mt-1 text-lg sm:text-xl text-blue-200 font-medium">
                      {nameTamil}
                    </p>
                  )}
                  {(tagline || taglineTamil) && (
                    <div className="mt-3">
                      {tagline && (
                        <p className="text-blue-100 text-sm sm:text-base font-light tracking-wide">
                          {tagline}
                        </p>
                      )}
                      {taglineTamil && (
                        <p className="tamil text-blue-200 text-sm mt-0.5">{taglineTamil}</p>
                      )}
                    </div>
                  )}
                  {assoc?.regNumber && (
                    <p className="mt-2 text-xs text-blue-300 font-medium tracking-widest uppercase">
                      Reg. No: {assoc.regNumber}
                    </p>
                  )}
                </div>
              )}

              {/* Stats strip */}
              <div className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-2">
                {[
                  { icon: Users, label: "Members", value: "1000+" },
                  { icon: MapPin, label: "Districts", value: "38" },
                  { icon: Award, label: "Est.", value: "2024" },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="text-center">
                    <div className="flex items-center justify-center gap-1.5 text-blue-200">
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Wave divider */}
          <div className="w-full overflow-hidden leading-none">
            <svg viewBox="0 0 1440 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <path d="M0 56L60 49C120 42 240 28 360 21C480 14 600 14 720 21C840 28 960 42 1080 46.7C1200 52 1320 47 1380 44.3L1440 42V56H1380C1320 56 1200 56 1080 56C960 56 840 56 720 56C600 56 480 56 360 56C240 56 120 56 60 56H0Z" fill="#f8fafc"/>
            </svg>
          </div>
        </section>

        {/* ── ACTION CARDS ─────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-12">
          <div className="text-center mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Quick Access</h2>
            <p className="text-slate-500 text-sm mt-1">Choose an option to get started</p>
          </div>

          <div className={`grid gap-5 ${[true, showRegister, showIdCard].filter(Boolean).length === 1 ? "grid-cols-1 max-w-sm mx-auto" : [true, showRegister, showIdCard].filter(Boolean).length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>

            {/* Admin Login */}
            <Link href="/login">
              <div className="action-card card-shine bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 cursor-pointer hover:shadow-xl hover:border-blue-200 group h-full">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:border-blue-600 transition-colors duration-200">
                    <LogIn className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                      Admin Login (நிர்வாக உள்நுழைவு)
                    </h3>
                    <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                      Staff and administrators — sign in to access the member management dashboard.
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                    <Shield className="w-3 h-3" /> Secured
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" />
                </div>
              </div>
            </Link>

            {/* Member Registration */}
            {showRegister && (
              <Link href="/members/register">
                <div className="action-card card-shine bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 cursor-pointer hover:shadow-xl hover:border-emerald-200 group h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-colors duration-200">
                      <UserPlus className="w-5 h-5 text-emerald-600 group-hover:text-white transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                        Join as Member (உறுப்பினராக சேரவும்)
                      </h3>
                      <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                        New to the association? Register your membership online — quick and easy.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <UserPlus className="w-3 h-3" /> Open Registration
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </Link>
            )}

            {/* ID Card */}
            {showIdCard && (
              <Link href="/members/id-card">
                <div className="action-card card-shine bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 cursor-pointer hover:shadow-xl hover:border-violet-200 group h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-600 group-hover:border-violet-600 transition-colors duration-200">
                      <CreditCard className="w-5 h-5 text-violet-600 group-hover:text-white transition-colors duration-200" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-800 group-hover:text-violet-700 transition-colors">
                        Get ID Card (அடையாள அட்டை பெறுக)
                      </h3>
                      <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                        Existing member? Verify your identity and download your digital membership ID card.
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full">
                      <CreditCard className="w-3 h-3" /> PDF Download
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>
              </Link>
            )}
          </div>
        </section>

        {/* ── ASSOCIATION DETAILS ──────────────────────────────────────────── */}
        {!loading && assoc && (assoc.address || assoc.phone || assoc.email || assoc.state) && (
          <section className="bg-white border-t border-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center mb-8">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Contact & Location</h2>
                <p className="text-slate-500 text-sm mt-1">Get in touch with the association</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
                {assoc.address && (
                  <div className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Address</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{assoc.address}</p>
                      {assoc.addressTamil && (
                        <p className="tamil text-xs text-slate-500 mt-1">{assoc.addressTamil}</p>
                      )}
                      {assoc.state && <p className="text-xs text-slate-500 mt-0.5">{assoc.state}</p>}
                    </div>
                  </div>
                )}

                {assoc.phone && (
                  <div className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                      <a
                        href={`tel:${assoc.phone}`}
                        className="text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                      >
                        {assoc.phone}
                      </a>
                    </div>
                  </div>
                )}

                {assoc.email && (
                  <div className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Mail className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</p>
                      <a
                        href={`mailto:${assoc.email}`}
                        className="text-sm font-medium text-violet-700 hover:text-violet-800 hover:underline break-all"
                      >
                        {assoc.email}
                      </a>
                    </div>
                  </div>
                )}

                {assoc.regNumber && (
                  <div className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Hash className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Registration No.</p>
                      <p className="text-sm font-medium text-slate-700">{assoc.regNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer className="bg-slate-900 text-slate-400">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm font-medium text-slate-300">{name}</p>
                {nameTamil && <p className="tamil text-xs text-slate-500 mt-0.5">{nameTamil}</p>}
              </div>
              <div className="flex items-center gap-5 text-xs">
                <Link href="/login" className="hover:text-slate-200 transition-colors">Admin Login</Link>
                {showRegister && (
                  <Link href="/members/register" className="hover:text-slate-200 transition-colors">Register</Link>
                )}
                {showIdCard && (
                  <Link href="/members/id-card" className="hover:text-slate-200 transition-colors">ID Card</Link>
                )}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-800 text-center text-xs text-slate-600">
              © {new Date().getFullYear()} {name}. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
