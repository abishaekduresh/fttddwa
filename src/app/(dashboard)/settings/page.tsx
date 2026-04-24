"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { Eye, EyeOff, Loader2, Lock, User, Building2, SlidersHorizontal, PenLine } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { AssociationSettingsForm } from "@/components/settings/association-settings-form";

interface IdCardSettingsValues {
  primaryColor: string;
  secondaryColor: string;
  headerTextColor: string;
  cardTitle: string;
  footerTitle: string;
  showPhoto: boolean;
  showName: boolean;
  showNameTamil: boolean;
  showMembershipId: boolean;
  showPosition: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showAddress: boolean;
  showDateOfBirth: boolean;
  showBusinessName: boolean;
  showBusinessNameTamil: boolean;
  showJoinedAt: boolean;
  validityYears?: number;
}

const ID_CARD_DEFAULTS: IdCardSettingsValues = {
  primaryColor: "#1e40af",
  secondaryColor: "#ffffff",
  headerTextColor: "#ffffff",
  cardTitle: "Member ID Card",
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
  validityYears: 2,
};

function IdCardCustomizer({
  settings,
  saving,
  onSave,
}: {
  settings: Partial<IdCardSettingsValues> | null;
  saving: boolean;
  onSave: (s: IdCardSettingsValues) => void;
}) {
  const [vals, setVals] = useState<IdCardSettingsValues>({ ...ID_CARD_DEFAULTS, ...(settings ?? {}) });

  const toggle = (key: keyof IdCardSettingsValues) =>
    setVals((v) => ({ ...v, [key]: !v[key] }));
  const set = (key: keyof IdCardSettingsValues, value: string) =>
    setVals((v) => ({ ...v, [key]: value }));

  const FIELD_TOGGLES: { key: keyof IdCardSettingsValues; label: string }[] = [
    { key: "showPhoto",             label: "Photo" },
    { key: "showName",              label: "Name (English)" },
    { key: "showNameTamil",         label: "Name (Tamil)" },
    { key: "showMembershipId",      label: "Membership ID" },
    { key: "showPosition",          label: "Position / Role" },
    { key: "showPhone",             label: "Phone number" },
    { key: "showEmail",             label: "Email address" },
    { key: "showAddress",           label: "District / Address" },
    { key: "showDateOfBirth",       label: "Date of birth" },
    { key: "showBusinessName",      label: "Business name" },
    { key: "showBusinessNameTamil", label: "Business name (Tamil)" },
    { key: "showJoinedAt",          label: "Member since / Validity" },
  ];

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900">ID Card Customization</h2>
          <p className="text-xs text-slate-500">Configure the appearance of the public member ID card.</p>
        </div>
        <Link
          href="/settings/id-card-designer"
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline whitespace-nowrap flex-shrink-0"
        >
          <PenLine size={13} /> Open Designer
        </Link>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-3 gap-4">
        {([ ["primaryColor", "Header Color"], ["secondaryColor", "Card Background"], ["headerTextColor", "Header Text"] ] as [keyof IdCardSettingsValues, string][]).map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={vals[key] as string}
                onChange={(e) => set(key, e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-slate-200 p-0.5"
              />
              <input
                type="text"
                value={vals[key] as string}
                onChange={(e) => set(key, e.target.value)}
                className="flex-1 text-xs font-mono form-input py-1.5 px-2"
                maxLength={7}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Titles & Validity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="form-label text-xs font-semibold text-slate-600">Card Title</label>
          <input
            type="text"
            value={vals.cardTitle}
            onChange={(e) => set("cardTitle", e.target.value)}
            className="form-input text-sm"
            maxLength={60}
            placeholder="Member ID Card"
          />
        </div>
        <div>
          <label className="form-label text-xs font-semibold text-slate-600">Footer Title</label>
          <input
            type="text"
            value={vals.footerTitle}
            onChange={(e) => set("footerTitle", e.target.value)}
            className="form-input text-sm"
            maxLength={60}
            placeholder="STATE CHAIRMAN"
          />
        </div>
        <div>
          <label className="form-label text-xs font-semibold text-slate-600">Validity (Years)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={20}
              value={vals.validityYears || 2}
              onChange={(e) => set("validityYears", e.target.value)}
              className="form-input text-sm font-mono"
            />
            <span className="text-[10px] text-slate-400 whitespace-nowrap">years duration</span>
          </div>
        </div>
      </div>

      {/* Field visibility toggles */}
      <div>
        <p className="text-xs font-medium text-slate-700 mb-2">Visible Fields</p>
        <div className="grid grid-cols-2 gap-2">
          {FIELD_TOGGLES.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={vals[key] as boolean}
                onChange={() => toggle(key)}
                className="rounded border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSave(vals)}
        disabled={saving}
        className="btn btn-primary w-full"
      >
        {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : "Save ID Card Settings"}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { user, hasPermission } = useAuthStore();
  const [tab, setTab] = useState<"profile" | "security" | "association" | "app">("profile");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [assocSettings, setAssocSettings] = useState<any>(null);
  const [loadingAssoc, setLoadingAssoc] = useState(false);
  const [appSettings, setAppSettings] = useState<{
    enableMemberRegistration: boolean;
    enableIdCard: boolean;
    idCardSettings: Record<string, unknown> | null;
  } | null>(null);
  const [savingApp, setSavingApp] = useState(false);
  const [savingIdCard, setSavingIdCard] = useState(false);

  const canManageAssoc = hasPermission("association:manage");
  const canManageApp = hasPermission("app_settings:manage") || user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (canManageAssoc && tab === "association" && !assocSettings) {
      loadAssocSettings();
    }
  }, [tab, canManageAssoc, assocSettings]);

  useEffect(() => {
    if (canManageApp && tab === "app" && !appSettings) {
      fetch("/api/settings/app")
        .then((r) => r.json())
        .then((j) => {
          if (j.success) {
            setAppSettings({
              enableMemberRegistration: j.data.enableMemberRegistration ?? true,
              enableIdCard: j.data.enableIdCard ?? true,
              idCardSettings: j.data.idCardSettings ?? null,
            });
          }
        })
        .catch(() => toast.error("Failed to load app settings"));
    }
  }, [tab, canManageApp, appSettings]);

  const handleToggleAppSetting = async (key: string, value: boolean) => {
    setSavingApp(true);
    try {
      const res = await apiFetch("/api/settings/app/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const json = await res.json();
      if (json.success) {
        setAppSettings((prev) => prev ? { ...prev, [key]: value } : prev);
        toast.success("Setting updated");
      } else {
        toast.error(json.message || "Failed to update setting");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingApp(false);
    }
  };

  const handleSaveIdCardSettings = async (patch: Record<string, unknown>) => {
    setSavingIdCard(true);
    try {
      const res = await apiFetch("/api/settings/app/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (json.success) {
        setAppSettings((prev) => prev ? { ...prev, ...patch } : prev);
        toast.success("ID card settings saved");
      } else {
        toast.error(json.message || "Failed to save");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingIdCard(false);
    }
  };

  const loadAssocSettings = async () => {
    setLoadingAssoc(true);
    try {
      const res = await apiFetch("/api/settings/association");
      const json = await res.json();
      if (json.success) {
        setAssocSettings(json.data);
      }
    } catch {
      toast.error("Failed to load association settings");
    } finally {
      setLoadingAssoc(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await apiFetch("/api/auth/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Password changed. Please log in again.");
        setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      } else {
        toast.error(json.message || "Failed to change password");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setChangingPassword(false);
    }
  };

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin", ADMIN: "Admin", DATA_ENTRY: "Data Entry Operator", VIEWER: "Viewer",
  };

  const tabs = [
    { key: "profile", label: "Profile", icon: User, show: true },
    { key: "security", label: "Security", icon: Lock, show: true },
    { key: "association", label: "Association", icon: Building2, show: canManageAssoc },
    { key: "app", label: "App Settings", icon: SlidersHorizontal, show: canManageApp },
  ].filter(t => t.show);

  return (
    <div className="max-w-2xl space-y-5 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm">Manage your profile and association settings</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="card p-6 animate-in fade-in duration-300">
          <h2 className="font-semibold text-slate-900 mb-4">Profile Information</h2>
          <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
              <span className="text-white text-xl font-bold">{user?.name?.charAt(0)}</span>
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <span className="badge badge-blue mt-1">{roleLabels[user?.role || ""] || user?.role}</span>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Contact your administrator to update your profile information.
          </p>
        </div>
      )}

      {tab === "security" && (
        <div className="card p-6 animate-in fade-in duration-300">
          <h2 className="font-semibold text-slate-900 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="form-label">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? "text" : "password"}
                  className="form-input pr-10"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPasswords(!showPasswords)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label">New Password</label>
              <input type={showPasswords ? "text" : "password"} className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Confirm New Password</label>
              <input type={showPasswords ? "text" : "password"} className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <div className="text-xs text-slate-500 bg-slate-50 rounded p-3 space-y-1">
              <p className="font-medium">Password requirements:</p>
              <p className={newPassword.length >= 8 ? "text-green-600" : ""}>• At least 8 characters</p>
              <p className={/[A-Z]/.test(newPassword) ? "text-green-600" : ""}>• One uppercase letter</p>
              <p className={/[a-z]/.test(newPassword) ? "text-green-600" : ""}>• One lowercase letter</p>
              <p className={/[0-9]/.test(newPassword) ? "text-green-600" : ""}>• One number</p>
            </div>
            <button type="submit" disabled={changingPassword} className="btn btn-primary w-full">
              {changingPassword ? <><Loader2 size={15} className="animate-spin" /> Changing...</> : "Change Password"}
            </button>
          </form>
        </div>
      )}

      {tab === "association" && (
        <div className="card p-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900">Association Settings</h2>
              <p className="text-xs text-slate-500">Configure global branding and association details.</p>
            </div>
            {loadingAssoc && <Loader2 size={16} className="animate-spin text-slate-400" />}
          </div>
          {assocSettings ? (
            <AssociationSettingsForm initialData={assocSettings} />
          ) : !loadingAssoc && (
            <div className="py-10 text-center">
              <button onClick={loadAssocSettings} className="btn btn-secondary text-sm">Retry Loading</button>
            </div>
          )}
        </div>
      )}

      {tab === "app" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="card p-6">
            <div className="mb-4">
              <h2 className="font-semibold text-slate-900">App Settings</h2>
              <p className="text-xs text-slate-500">Control which features are publicly accessible.</p>
            </div>

            {!appSettings ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {/* Member Registration toggle */}
                <div className="flex items-start justify-between py-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Public Member Registration</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Allow anyone to self-register at{" "}
                      <span className="font-mono text-slate-600">/members/register</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingApp}
                    onClick={() => handleToggleAppSetting("enableMemberRegistration", !appSettings.enableMemberRegistration)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                      appSettings.enableMemberRegistration ? "bg-primary" : "bg-slate-300"
                    }`}
                    role="switch"
                    aria-checked={appSettings.enableMemberRegistration}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${appSettings.enableMemberRegistration ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                {/* ID Card toggle */}
                <div className="flex items-start justify-between py-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Public Member ID Card</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Allow members to view their ID card at{" "}
                      <span className="font-mono text-slate-600">/members/id-card</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingApp}
                    onClick={() => handleToggleAppSetting("enableIdCard", !appSettings.enableIdCard)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                      appSettings.enableIdCard ? "bg-primary" : "bg-slate-300"
                    }`}
                    role="switch"
                    aria-checked={appSettings.enableIdCard}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${appSettings.enableIdCard ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ID Card Customization */}
          {appSettings && (
            <IdCardCustomizer
              settings={appSettings.idCardSettings as any}
              saving={savingIdCard}
              onSave={(s) => handleSaveIdCardSettings({ idCardSettings: s })}
            />
          )}
        </div>
      )}
    </div>
  );
}
