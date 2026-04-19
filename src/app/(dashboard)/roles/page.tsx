"use client";

import { useEffect, useState } from "react";
import { Shield, Users, Check } from "lucide-react";

interface Role {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;
  _count: { users: number };
  permissions: Array<{ permission: { name: string; displayName: string; resource: string; action: string } }>;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/roles").then((r) => r.json()).then((j) => { setRoles(j.data || []); setLoading(false); });
  }, []);

  const groupPermissions = (permissions: Role["permissions"]) => {
    const groups: Record<string, string[]> = {};
    for (const rp of permissions) {
      const { resource, displayName } = rp.permission;
      if (!groups[resource]) groups[resource] = [];
      groups[resource].push(displayName);
    }
    return groups;
  };

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: "bg-red-50 border-red-200",
    ADMIN: "bg-blue-50 border-blue-200",
    DATA_ENTRY: "bg-green-50 border-green-200",
    VIEWER: "bg-slate-50 border-slate-200",
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
        <p className="text-slate-500 text-sm">View role definitions and permission matrices</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-64 bg-slate-50 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => {
            const groups = groupPermissions(role.permissions);
            return (
              <div key={role.id} className={`card p-5 border ${roleColors[role.name] || "border-slate-200"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-primary" />
                    <div>
                      <h3 className="font-semibold text-slate-900">{role.displayName}</h3>
                      {role.description && <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Users size={12} />
                    <span>{role._count.users} users</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(groups).map(([resource, perms]) => (
                    <div key={resource}>
                      <p className="text-xs font-medium text-slate-600 capitalize mb-1">{resource}</p>
                      <div className="flex flex-wrap gap-1">
                        {perms.map((p) => (
                          <span key={p} className="inline-flex items-center gap-0.5 text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">
                            <Check size={9} className="text-green-500" /> {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {role.permissions.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No permissions assigned</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
