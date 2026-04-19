"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2, Shield, CheckCircle, XCircle, Clock, Calendar } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { canManageRole, getRoleWeight } from "@/lib/security/hierarchy";

interface User {
  id: number;
  uniqueId?: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  failedLoginCount: number;
  roleId: number;
  role: { name: string; displayName: string };
}

interface Role {
  id: number;
  name: string;
  displayName: string;
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "badge badge-red",
  ADMIN: "badge badge-blue",
  DATA_ENTRY: "badge badge-green",
  VIEWER: "badge badge-gray",
};

const roleAvatarColors: Record<string, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-700",
  ADMIN: "bg-blue-100 text-blue-700",
  DATA_ENTRY: "bg-green-100 text-green-700",
  VIEWER: "bg-slate-100 text-slate-600",
};

export default function UsersPage() {
  const { isRole } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", roleId: 0 });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    const json = await res.json();
    if (json.success) setUsers(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetch("/api/roles").then((r) => r.json()).then((j) => setRoles(j.data || []));
  }, [fetchUsers]);

  const openCreate = () => {
    setEditUser(null);
    setFormData({ name: "", email: "", password: "", roleId: roles[0]?.id || 0 });
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setFormData({ name: user.name, email: user.email, password: "", roleId: user.roleId || 0 });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editUser ? `/api/users/${editUser.id}` : "/api/users";
      const method = editUser ? "PATCH" : "POST";
      const body = editUser
        ? { name: formData.name, email: formData.email, roleId: Number(formData.roleId) }
        : { ...formData, roleId: Number(formData.roleId) };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(editUser ? "User updated" : "User created");
        setShowModal(false);
        fetchUsers();
      } else {
        toast.error(json.message || "Operation failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/users/${confirmDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("User deleted");
        setConfirmDelete(null);
        fetchUsers();
      } else {
        toast.error(json.message || "Delete failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (user: User) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const json = await res.json();
    if (json.success) { toast.success(`User ${user.isActive ? "deactivated" : "activated"}`); fetchUsers(); }
    else toast.error(json.message || "Failed to update status");
  };

  const userActions = (user: User, compact = false) => {
    const { user: currentUser } = useAuthStore.getState();
    const canManage = currentUser ? canManageRole(currentUser.role, user.role.name) : false;
    const isSelf = currentUser?.id === user.id;
    
    // You can manage yourself to some extent, but hierarchy applies to others
    const allowed = canManage && !isSelf;

    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => toggleActive(user)}
          disabled={!allowed}
          className={`p-1.5 rounded transition-colors ${!allowed ? "opacity-30 cursor-not-allowed" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"}`}
          title={!allowed ? "Insufficient rank" : (user.isActive ? "Deactivate" : "Activate")}
        >
          {user.isActive ? <XCircle size={15} /> : <CheckCircle size={15} />}
        </button>
        <button
          onClick={() => openEdit(user)}
          disabled={!allowed}
          className={`p-1.5 rounded transition-colors ${!allowed ? "opacity-30 cursor-not-allowed" : "text-slate-400 hover:text-blue-600 hover:bg-blue-50"}`}
          title={!allowed ? "Insufficient rank" : "Edit"}
        >
          <Edit size={15} />
        </button>
        {isRole("SUPER_ADMIN") && (
          <button
            onClick={() => setConfirmDelete(user)}
            disabled={isSelf}
            className={`p-1.5 rounded transition-colors ${isSelf ? "opacity-30 cursor-not-allowed" : "text-slate-400 hover:text-red-600 hover:bg-red-50"}`}
            title={isSelf ? "Cannot delete yourself" : "Delete"}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm">{users.length} system users</p>
        </div>
        {isRole("SUPER_ADMIN", "ADMIN") && (
          <button onClick={openCreate} className="btn btn-primary">
            <Plus size={16} />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>

      {/* Mobile card list — hidden on md+ */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="card py-12 text-center text-slate-400">
            <p className="font-medium">No users found</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="card p-4 space-y-3">
              {/* Top row: avatar + name + actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold ${roleAvatarColors[user.role.name] || "bg-slate-100 text-slate-600"}`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900 truncate">{user.name}</p>
                      {user.uniqueId && (
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          {user.uniqueId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                {userActions(user, true)}
              </div>

              {/* Middle row: badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={roleColors[user.role.name] || "badge badge-gray"}>
                  <Shield size={10} className="mr-1" />
                  {user.role.displayName}
                </span>
                <span className={`badge ${user.isActive ? "badge-green" : "badge-gray"}`}>
                  {user.isActive ? "Active" : "Inactive"}
                </span>
                {user.failedLoginCount > 0 && (
                  <span className="badge badge-yellow">{user.failedLoginCount} failed logins</span>
                )}
              </div>

              {/* Bottom row: last login + created */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 border-t border-slate-100 pt-2">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never logged in"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table — hidden below md */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-slate-500 font-medium whitespace-nowrap">User ID</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">User</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Role</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Last Login</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Created</th>
                <th className="text-right px-5 py-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 bg-slate-100 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs font-semibold text-slate-500">
                      {user.uniqueId || `ID-${user.id}`}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${roleAvatarColors[user.role.name] || "bg-slate-100 text-slate-600"}`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={roleColors[user.role.name] || "badge badge-gray"}>
                      <Shield size={11} className="mr-1" />
                      {user.role.displayName}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`badge ${user.isActive ? "badge-green" : "badge-gray"}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {userActions(user)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-lg text-slate-900">
                {editUser ? "Edit User" : "Create User"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {!editUser && (
                <div>
                  <label className="form-label">Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="form-label">Role *</label>
                <select
                  className="form-input"
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: Number(e.target.value) })}
                >
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? "Saving..." : editUser ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete User"
          message={`Delete "${confirmDelete.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          loading={deleting}
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
