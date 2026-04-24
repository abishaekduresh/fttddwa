"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Printer, User, Phone, Mail, MapPin, Building2, Cake, Heart, CreditCard, Home, Bell, BellOff } from "lucide-react";
import { formatDate, calculateAge } from "@/lib/utils/format";
import toast from "react-hot-toast";

interface MemberDetail {
  id: number;
  uuid: string;
  membershipId: string;
  name: string;
  nameTamil?: string;
  businessName?: string;
  businessNameTamil?: string;
  position?: string;
  address: string;
  district: string;
  taluk: string;
  village?: string;
  state: string;
  remark?: string;
  industry?: string;
  dateOfBirth?: string;
  weddingDate?: string;
  aadhaarHash?: string;
  phone: string;
  email?: string;
  photoUrl?: string;
  status: string;
  joinedAt: string;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

const statusColors: Record<string, string> = {
  ACTIVE: "badge badge-green",
  INACTIVE: "badge badge-gray",
  SUSPENDED: "badge badge-red",
  EXPIRED: "badge badge-yellow",
};

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400 uppercase tracking-wider leading-none">{label}</p>
        <p className={`text-slate-800 mt-0.5 break-words ${mono ? "font-mono text-sm" : ""}`}>{value}</p>
      </div>
    </div>
  );
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifyBirthday, setNotifyBirthday] = useState(true);
  const [notifyWedding, setNotifyWedding] = useState(true);
  const [savingNotify, setSavingNotify] = useState(false);

  useEffect(() => {
    fetch(`/api/members/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setMember(j.data);
        else router.push("/members");
      })
      .catch(() => router.push("/members"))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/members/${params.id}/notifications`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setNotifyBirthday(j.data.notifyBirthday);
          setNotifyWedding(j.data.notifyWedding);
        }
      })
      .catch(() => {});
  }, [params.id]);

  const handleNotifyToggle = async (field: "notifyBirthday" | "notifyWedding", value: boolean) => {
    if (field === "notifyBirthday") setNotifyBirthday(value);
    else setNotifyWedding(value);
    setSavingNotify(true);
    try {
      const res = await apiFetch(`/api/members/${params.id}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      toast.success("Notification setting saved");
    } catch {
      toast.error("Failed to save");
      if (field === "notifyBirthday") setNotifyBirthday(!value);
      else setNotifyWedding(!value);
    } finally {
      setSavingNotify(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-4">
        <div className="h-8 w-40 bg-slate-100 rounded" />
        <div className="card">
          <div className="p-6 flex flex-col items-center gap-4 border-b border-slate-100">
            <div className="w-24 h-24 rounded-full bg-slate-100" />
            <div className="space-y-2 text-center">
              <div className="h-5 bg-slate-100 rounded w-40" />
              <div className="h-4 bg-slate-100 rounded w-28" />
              <div className="h-5 bg-slate-100 rounded w-20 mx-auto" />
            </div>
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-16" />
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Nav bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/members"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Members
        </Link>
        <button
          onClick={() => window.open(`/api/members/card/${member.uuid}/pdf`, "_blank")}
          className="btn btn-outline text-sm py-1.5"
        >
          <Printer size={14} /> Print ID Card
        </button>
      </div>

      {/* Profile card */}
      <div className="card overflow-hidden">
        {/* Hero — photo, name, status */}
        <div className="bg-gradient-to-b from-slate-50 to-white px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-slate-100">
          {/* Photo */}
          <div className="mb-4 relative">
            {member.photoUrl ? (
              <img
                src={member.photoUrl}
                alt={member.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white ring-4 ring-white shadow-md flex items-center justify-center border border-slate-200">
                <User size={36} className="text-slate-300" />
              </div>
            )}
            <span className={`${statusColors[member.status] || "badge badge-gray"} absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-sm`}>
              {member.status}
            </span>
          </div>

          {/* Name */}
          <h1 className="text-xl font-bold text-slate-900 mt-2">{member.name}</h1>
          {member.nameTamil && (
            <p className="text-slate-500 tamil text-sm mt-0.5">{member.nameTamil}</p>
          )}
          {member.position && (
            <p className="text-sm text-slate-500 mt-1">{member.position}</p>
          )}

          {/* Business Name */}
          {(member.businessName || member.businessNameTamil) && (
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 max-w-sm w-full">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Business / நிறுவனம்</p>
              {member.businessName && <p className="text-slate-800 font-bold">{member.businessName}</p>}
              {member.businessNameTamil && <p className="text-slate-600 tamil text-sm mt-0.5">{member.businessNameTamil}</p>}
            </div>
          )}

          {/* Membership ID + since */}
          <div className="mt-3 flex flex-col items-center gap-1">
            <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-primary bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
              {member.membershipId}
            </span>
            <p className="text-xs text-slate-400">
              Member since {formatDate(member.joinedAt)}
            </p>
          </div>
        </div>

        {/* Info rows */}
        <div className="px-4 divide-y divide-slate-100">
          <InfoRow icon={<Phone size={15} />} label="Phone" value={member.phone} mono />

          {member.email && (
            <InfoRow icon={<Mail size={15} />} label="Email" value={member.email} />
          )}

          <InfoRow
            icon={<MapPin size={15} />}
            label="District, Taluk & Village"
            value={`${member.district}, ${member.taluk}${member.village ? `, ${member.village}` : ""}`}
          />

          {member.industry && (
            <InfoRow icon={<Building2 size={15} />} label="Industry" value={member.industry} />
          )}

          {member.dateOfBirth && (
            <InfoRow
              icon={<Cake size={15} />}
              label="Date of Birth"
              value={`${formatDate(member.dateOfBirth)}  ·  ${calculateAge(member.dateOfBirth)} years old`}
            />
          )}

          {member.weddingDate && (
            <InfoRow icon={<Heart size={15} />} label="Wedding Date" value={formatDate(member.weddingDate)} />
          )}

          {member.aadhaarHash && (
            <InfoRow icon={<CreditCard size={15} />} label="Aadhaar Number" value={member.aadhaarHash} mono />
          )}

          <InfoRow icon={<Home size={15} />} label="Address" value={member.address} />

          <InfoRow
            icon={<MapPin size={15} />}
            label="State / மாநிலம்"
            value={member.state}
          />

          {member.remark && (
            <div className="flex items-start gap-3 py-3">
              <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-500">
                <Building2 size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 uppercase tracking-wider leading-none">Remarks / குறிப்பு</p>
                <p className="text-slate-700 mt-1 text-sm bg-orange-50/50 p-2 rounded-md border border-orange-100/50 italic whitespace-pre-wrap">{member.remark}</p>
              </div>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        {(member.dateOfBirth || member.weddingDate) && (
          <div className="px-4 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              {savingNotify
                ? <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
                : <Bell size={12} />}
              Notification Preferences / அறிவிப்பு அமைப்புகள்
            </p>
            <div className="space-y-3">
              {member.dateOfBirth && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Cake size={14} className="text-pink-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Birthday Reminder (பிறந்தநாள்)</span>
                  </div>
                  <button
                    onClick={() => handleNotifyToggle("notifyBirthday", !notifyBirthday)}
                    disabled={savingNotify}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${notifyBirthday ? "bg-pink-500" : "bg-slate-200"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${notifyBirthday ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                  </button>
                </div>
              )}
              {member.weddingDate && (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Heart size={14} className="text-rose-500 flex-shrink-0" />
                    <span className="text-sm text-slate-700">Anniversary Reminder (திருமண நாள்)</span>
                  </div>
                  <button
                    onClick={() => handleNotifyToggle("notifyWedding", !notifyWedding)}
                    disabled={savingNotify}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${notifyWedding ? "bg-rose-500" : "bg-slate-200"}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${notifyWedding ? "translate-x-[18px]" : "translate-x-[3px]"}`} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Added on {formatDate(member.createdAt)}
            {member.createdBy && (
              <> · by <span className="font-medium text-slate-500">{member.createdBy.name}</span></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
