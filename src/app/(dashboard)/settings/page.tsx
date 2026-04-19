"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { Eye, EyeOff, Loader2, Lock, User, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { AssociationSettingsForm } from "@/components/settings/association-settings-form";

export default function SettingsPage() {
  const { user, hasPermission } = useAuthStore();
  const [tab, setTab] = useState<"profile" | "security" | "association">("profile");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [assocSettings, setAssocSettings] = useState<any>(null);
  const [loadingAssoc, setLoadingAssoc] = useState(false);

  const canManageAssoc = hasPermission("association:manage");

  useEffect(() => {
    if (canManageAssoc && tab === "association" && !assocSettings) {
      loadAssocSettings();
    }
  }, [tab, canManageAssoc, assocSettings]);

  const loadAssocSettings = async () => {
    setLoadingAssoc(true);
    try {
      const res = await fetch("/api/settings/association");
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
      const res = await fetch("/api/auth/me", {
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
    </div>
  );
}
