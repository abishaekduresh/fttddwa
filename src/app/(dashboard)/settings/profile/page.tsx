"use client";

import { useAuthStore } from "@/store/auth.store";
import { User as UserIcon, BadgeCheck, Mail, Fingerprint } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuthStore();

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    DATA_ENTRY: "Data Entry Operator",
    VIEWER: "Viewer",
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-8 bg-gradient-to-br from-white to-slate-50/50">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <UserIcon size={18} className="text-primary" />
          Profile Information
        </h2>

        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-white shadow-inner">
            <span className="text-primary text-3xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3">
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Mail size={14} />
                {user?.email}
              </span>
              <span className="badge badge-blue flex items-center gap-1">
                <BadgeCheck size={12} />
                {roleLabels[user?.role || ""] || user?.role}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-100 space-y-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Fingerprint size={12} />
              User ID
            </p>
            <p className="font-mono text-sm font-semibold text-slate-700">
              {`ID-${user?.id}`}
            </p>
          </div>
          {/* You can add more profile fields here if they exist in the user object */}
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-400 bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-100 flex items-start gap-3">
            <span className="mt-1">ℹ️</span>
            Your account is managed by the association. Please contact a Super Admin if you need to update your name or role permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
