"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Printer, User, Phone, Mail, MapPin, Building2, Cake, Heart,
  CreditCard, Home, Bell, Edit2, Trash2, Share2, Loader2, X, Check,
} from "lucide-react";
import Image from "next/image";
import { formatDate, calculateAge } from "@/lib/utils/format";
import toast from "react-hot-toast";
import { TAMIL_NADU_DISTRICTS } from "@/constants/districts";

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
  validUntil?: string;
  createdBy?: { name: string; email: string };
}

const statusColors: Record<string, string> = {
  ACTIVE:    "badge badge-green",
  INACTIVE:  "badge badge-gray",
  SUSPENDED: "badge badge-red",
  EXPIRED:   "badge badge-yellow",
  PENDING:   "badge badge-yellow",
};

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
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
  const params  = useParams();
  const router  = useRouter();

  const [member,         setMember]        = useState<MemberDetail | null>(null);
  const [loading,        setLoading]       = useState(true);
  const [notifyBirthday, setNotifyBirthday] = useState(true);
  const [notifyWedding,  setNotifyWedding]  = useState(true);
  const [savingNotify,   setSavingNotify]   = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState<Partial<MemberDetail>>({});
  const [saving,   setSaving]   = useState(false);

  // Delete confirm
  const [showDelete, setShowDelete] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  // Share PNG
  const [sharing, setSharing] = useState(false);

  const districts = Object.keys(TAMIL_NADU_DISTRICTS).sort();

  // ── Fetch member ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/members/${params.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) { setMember(j.data); setEditData(j.data); }
        else router.push("/members");
      })
      .catch(() => router.push("/members"))
      .finally(() => setLoading(false));
  }, [params.id, router]);

  // ── Fetch notification prefs ──────────────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/members/${params.id}/notifications`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) { setNotifyBirthday(j.data.notifyBirthday); setNotifyWedding(j.data.notifyWedding); }
      })
      .catch(() => {});
  }, [params.id]);

  const handleNotifyToggle = async (field: "notifyBirthday" | "notifyWedding", value: boolean) => {
    if (field === "notifyBirthday") setNotifyBirthday(value); else setNotifyWedding(value);
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
      if (field === "notifyBirthday") setNotifyBirthday(!value); else setNotifyWedding(!value);
    } finally {
      setSavingNotify(false);
    }
  };

  // ── Edit save ─────────────────────────────────────────────────────────────
  const handleEditSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/members/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editData,
          dateOfBirth: editData.dateOfBirth
            ? new Date(editData.dateOfBirth).toISOString().split("T")[0] : undefined,
          weddingDate: editData.weddingDate
            ? new Date(editData.weddingDate).toISOString().split("T")[0] : undefined,
        }),
      });
      const j = await res.json();
      if (j.success) {
        setMember(j.data);
        setEditData(j.data);
        setShowEdit(false);
        toast.success("Member updated");
      } else {
        toast.error(j.message || "Update failed");
      }
    } catch {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/members/${params.id}`, { method: "DELETE" });
      const j = await res.json();
      if (j.success) { toast.success("Member deleted"); router.push("/members"); }
      else toast.error(j.message || "Delete failed");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  };

  // ── Share as PDF ─────────────────────────────────────────────────────────
  const handleSharePdf = async () => {
    if (!member) return;
    setSharing(true);
    try {
      const res = await apiFetch(`/api/members/card/${member.uuid}/pdf`);
      if (!res.ok) {
        let msg = `Failed to generate PDF (Status: ${res.status})`;
        if (res.status === 403) msg = "ID card unavailable — member must be Active";
        toast.error(msg);
        return;
      }
      const blob     = await res.blob();
      const filename = `${member.membershipId}-id-card.pdf`;
      const file     = new File([blob], filename, { type: "application/pdf" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${member.name} — ID Card`, files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
        toast.success("ID card saved as PDF");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        toast.error("Failed to generate PDF");
        console.error(err);
      }
    } finally {
      setSharing(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
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

  const toDateInput = (v?: string) => {
    if (!v) return "";
    try { return new Date(v).toISOString().split("T")[0]; } catch { return ""; }
  };

  const selectedDistrict = editData.district || "";
  const taluks = TAMIL_NADU_DISTRICTS[selectedDistrict] ?? [];

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* ── Nav bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Link
            href="/members"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Members
          </Link>

          <div className="flex items-center gap-2">
            {/* Share PNG */}
            <button
              onClick={handleSharePdf}
              disabled={sharing}
              className="btn btn-secondary flex-1 sm:flex-none justify-center gap-2"
              title="Share ID card as PDF"
            >
              {sharing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Share2 size={16} />
              )}
              {sharing ? "Preparing PDF..." : "Share ID Card"}
            </button>

            {/* Print PDF */}
            <button
              onClick={() => window.open(`/api/members/card/${member.uuid}/pdf`, "_blank")}
              className="btn btn-outline text-sm py-1.5"
              title="Print ID card PDF"
            >
              <Printer size={14} /> {/* Print */}
            </button>

            {/* Edit */}
            <button
              onClick={() => { setEditData(member); setShowEdit(true); }}
              className="btn btn-outline text-sm py-1.5"
              title="Edit member"
            >
              <Edit2 size={14} /> {/* Edit */}
            </button>

            {/* Delete */}
            <button
              onClick={() => setShowDelete(true)}
              className="btn text-sm py-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
              title="Delete member"
            >
              <Trash2 size={14} /> {/* Delete */}
            </button>
          </div>
        </div>

        {/* ── Profile card ─────────────────────────────────────────────── */}
        <div className="card overflow-hidden">
          {/* Hero */}
          <div className="bg-gradient-to-b from-slate-50 to-white px-6 pt-8 pb-6 flex flex-col items-center text-center border-b border-slate-100">
            <div className="mb-4 relative">
              {member.photoUrl ? (
                <Image src={member.photoUrl} alt={member.name} width={96} height={96}
                  className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white ring-4 ring-white shadow-md flex items-center justify-center border border-slate-200">
                  <User size={36} className="text-slate-300" />
                </div>
              )}
              <span className={`${statusColors[member.status] || "badge badge-gray"} absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap shadow-sm`}>
                {member.status}
              </span>
            </div>

            <h1 className="text-xl font-bold text-slate-900 mt-2">{member.name}</h1>
            {member.nameTamil && <p className="text-slate-500 tamil text-sm mt-0.5">{member.nameTamil}</p>}
            {member.position && <p className="text-sm text-slate-500 mt-1">{member.position}</p>}

            {(member.businessName || member.businessNameTamil) && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 max-w-sm w-full">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">Business / நிறுவனம்</p>
                {member.businessName && <p className="text-slate-800 font-bold">{member.businessName}</p>}
                {member.businessNameTamil && <p className="text-slate-600 tamil text-sm mt-0.5">{member.businessNameTamil}</p>}
              </div>
            )}

            <div className="mt-3 flex flex-col items-center gap-1">
              <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-primary bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">
                {member.membershipId}
              </span>
              <p className="text-xs text-slate-400">Member since {formatDate(member.joinedAt)}</p>
            </div>
          </div>

          {/* Info rows */}
          <div className="px-4 divide-y divide-slate-100">
            <InfoRow icon={<Phone size={15} />} label="Phone" value={member.phone} mono />
            {member.email && <InfoRow icon={<Mail size={15} />} label="Email" value={member.email} />}
            <InfoRow icon={<MapPin size={15} />} label="District, Taluk & Village"
              value={`${member.district}, ${member.taluk}${member.village ? `, ${member.village}` : ""}`} />
            {member.industry && <InfoRow icon={<Building2 size={15} />} label="Industry" value={member.industry} />}
            {member.dateOfBirth && (
              <InfoRow icon={<Cake size={15} />} label="Date of Birth"
                value={`${formatDate(member.dateOfBirth)}  ·  ${calculateAge(member.dateOfBirth)} years old`} />
            )}
            {member.weddingDate && <InfoRow icon={<Heart size={15} />} label="Wedding Date" value={formatDate(member.weddingDate)} />}
            {member.aadhaarHash && <InfoRow icon={<CreditCard size={15} />} label="Aadhaar Number" value={member.aadhaarHash} mono />}
            <InfoRow icon={<Home size={15} />} label="Address" value={member.address} />
            <InfoRow icon={<MapPin size={15} />} label="State / மாநிலம்" value={member.state} />
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
                    <button onClick={() => handleNotifyToggle("notifyBirthday", !notifyBirthday)} disabled={savingNotify}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${notifyBirthday ? "bg-pink-500" : "bg-slate-200"}`}>
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
                    <button onClick={() => handleNotifyToggle("notifyWedding", !notifyWedding)} disabled={savingNotify}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-60 ${notifyWedding ? "bg-rose-500" : "bg-slate-200"}`}>
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
              {member.createdBy && <> · by <span className="font-medium text-slate-500">{member.createdBy.name}</span></>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Edit Member</h2>
              <button onClick={() => setShowEdit(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              {/* Personal */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 w-full">
                  <span className="flex-1 border-t border-slate-100" />Personal<span className="flex-1 border-t border-slate-100" />
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                    <input className="form-input" value={editData.name || ""} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Name in Tamil</label>
                    <input className="form-input" style={{ fontFamily: "'NotoSansTamil', sans-serif" }}
                      value={editData.nameTamil || ""}
                      onChange={e => setEditData(p => ({ ...p, nameTamil: e.target.value.replace(/[A-Za-z]/g, "") }))} />
                  </div>
                  <div>
                    <label className="form-label">Phone <span className="text-red-500">*</span></label>
                    <input className="form-input" inputMode="numeric" maxLength={10} value={editData.phone || ""}
                      onChange={e => setEditData(p => ({ ...p, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={editData.email || ""} onChange={e => setEditData(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input className="form-input" type="date" value={toDateInput(editData.dateOfBirth)} onChange={e => setEditData(p => ({ ...p, dateOfBirth: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Wedding Anniversary</label>
                    <input className="form-input" type="date" value={toDateInput(editData.weddingDate)} onChange={e => setEditData(p => ({ ...p, weddingDate: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select className="form-input" value={editData.status || "ACTIVE"} onChange={e => setEditData(p => ({ ...p, status: e.target.value }))}>
                      <option value="ACTIVE">Active</option>
                      <option value="PENDING">Pending</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Position / Role</label>
                    <input className="form-input" value={editData.position || ""} onChange={e => setEditData(p => ({ ...p, position: e.target.value }))} />
                  </div>
                </div>
              </fieldset>

              {/* Business */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 w-full">
                  <span className="flex-1 border-t border-slate-100" />Business<span className="flex-1 border-t border-slate-100" />
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Business Name (EN)</label>
                    <input className="form-input" value={editData.businessName || ""} onChange={e => setEditData(p => ({ ...p, businessName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">Business Name (TA)</label>
                    <input className="form-input" style={{ fontFamily: "'NotoSansTamil', sans-serif" }}
                      value={editData.businessNameTamil || ""}
                      onChange={e => setEditData(p => ({ ...p, businessNameTamil: e.target.value.replace(/[A-Za-z]/g, "") }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Industry / Trade</label>
                    <input className="form-input" value={editData.industry || ""} onChange={e => setEditData(p => ({ ...p, industry: e.target.value }))} />
                  </div>
                </div>
              </fieldset>

              {/* Location */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 w-full">
                  <span className="flex-1 border-t border-slate-100" />Location<span className="flex-1 border-t border-slate-100" />
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">District <span className="text-red-500">*</span></label>
                    <select className="form-input" value={editData.district || ""}
                      onChange={e => setEditData(p => ({ ...p, district: e.target.value, taluk: "" }))}>
                      <option value="">Select district</option>
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Taluk <span className="text-red-500">*</span></label>
                    {taluks.length > 0 ? (
                      <select className="form-input" value={editData.taluk || ""}
                        onChange={e => setEditData(p => ({ ...p, taluk: e.target.value }))}>
                        <option value="">Select taluk</option>
                        {taluks.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input className="form-input" value={editData.taluk || ""} onChange={e => setEditData(p => ({ ...p, taluk: e.target.value }))} />
                    )}
                  </div>
                  <div>
                    <label className="form-label">Village / Town</label>
                    <input className="form-input" value={editData.village || ""} onChange={e => setEditData(p => ({ ...p, village: e.target.value }))} />
                  </div>
                  <div>
                    <label className="form-label">State</label>
                    <input className="form-input" value={editData.state || "Tamil Nadu"} onChange={e => setEditData(p => ({ ...p, state: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Full Address <span className="text-red-500">*</span></label>
                    <textarea rows={3} className="form-input resize-none" value={editData.address || ""}
                      onChange={e => setEditData(p => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>
              </fieldset>

              {/* Remark */}
              <div>
                <label className="form-label">Remarks</label>
                <textarea rows={2} className="form-input resize-none" value={editData.remark || ""}
                  onChange={e => setEditData(p => ({ ...p, remark: e.target.value }))} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={() => setShowEdit(false)} className="btn btn-outline text-sm">Cancel</button>
              <button onClick={handleEditSave} disabled={saving} className="btn btn-primary text-sm">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">Delete Member?</h2>
            <p className="text-slate-500 text-sm mb-6">
              This will permanently remove <strong>{member.name}</strong> ({member.membershipId}) from the system. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="btn btn-outline text-sm flex-1">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="btn text-sm flex-1 bg-red-600 hover:bg-red-700 text-white border-transparent">
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
