"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useEffect, useState, useCallback } from "react";
import { Building2, Plus, Trash2, RefreshCw, Eye, EyeOff, Loader2, Wallet, Zap, Pencil } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface Vendor {
  id: number;
  name: string;
  apiBaseUrl: string;
  isActive: boolean;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  rateLimitPerSec: number;
  retryLimit: number;
  walletBalance: string;
  createdAt: string;
}

const emptyForm = { 
  name: "", 
  apiBaseUrl: "", 
  apiKey: "", 
  provider: "generic",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "DELETED",
  appKey: "", 
  authKey: "", 
  deviceId: "",
  rateLimitPerSec: 10, 
  retryLimit: 3 
};

export default function VendorsPage() {
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission("whatsapp:manage");

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [manualBalanceModal, setManualBalanceModal] = useState<{ id: number, name: string, balance: number } | null>(null);
  const [manualBalanceInput, setManualBalanceInput] = useState({ amount: "", password: "" });

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/whatsapp/vendors");
      const json = await res.json();
      if (json.success) setVendors(json.data);
      else toast.error(json.message || "Failed to load vendors");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/whatsapp/vendors/${editingId}` : "/api/whatsapp/vendors";
      const method = editingId ? "PUT" : "POST";
      
      const submitData: any = { ...form };
      
      // Handle WABridge JSON API Key construction
      if (form.provider === "wabridge") {
        if (!editingId || (form.appKey || form.authKey || form.deviceId)) {
          submitData.apiKey = JSON.stringify({
            appKey: form.appKey,
            authKey: form.authKey,
            deviceId: form.deviceId
          });
        }
      }

      // Cleanup internal fields
      delete submitData.provider;
      delete submitData.appKey;
      delete submitData.authKey;
      delete submitData.deviceId;

      // For updates, only send apiKey if it was entered
      if (editingId && !submitData.apiKey) delete submitData.apiKey;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? "Vendor updated" : "Vendor added");
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        fetchVendors();
      } else {
        toast.error(json.message || `Failed to ${editingId ? "update" : "add"} vendor`);
      }
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  };

  const handleEdit = (vendor: Vendor) => {
    const isWabridge = vendor.name.toLowerCase().includes("wabridge");
    setForm({
      name: vendor.name,
      apiBaseUrl: vendor.apiBaseUrl,
      apiKey: "", 
      provider: isWabridge ? "wabridge" : "generic",
      status: vendor.status,
      appKey: "",
      authKey: "",
      deviceId: "",
      rateLimitPerSec: vendor.rateLimitPerSec,
      retryLimit: vendor.retryLimit,
    });
    setEditingId(vendor.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleManualBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBalanceModal) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/whatsapp/vendors/${manualBalanceModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "manual_balance",
          balance: parseFloat(manualBalanceInput.amount),
          password: manualBalanceInput.password,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Balance updated manually");
        setManualBalanceModal(null);
        setManualBalanceInput({ amount: "", password: "" });
        fetchVendors();
      } else {
        toast.error(json.message || "Update failed");
      }
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (vendor: Vendor) => {
    const nextStatus = vendor.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await apiFetch(`/api/whatsapp/vendors/${vendor.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, isActive: nextStatus === "ACTIVE" }),
      });
      const json = await res.json();
      if (json.success) {
        setVendors(v => v.map(x => x.id === vendor.id ? { ...x, status: nextStatus, isActive: nextStatus === "ACTIVE" } : x));
      } else {
        toast.error(json.message || "Failed to update vendor");
      }
    } catch { toast.error("Network error"); }
  };

  const handleRefreshBalance = async (id: number) => {
    setRefreshingId(id);
    try {
      const res = await apiFetch(`/api/whatsapp/vendors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh_balance" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Balance refreshed");
        fetchVendors();
      } else {
        toast.error(json.message || "Failed to refresh balance");
      }
    } catch { toast.error("Network error"); }
    finally { setRefreshingId(null); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      const res = await apiFetch(`/api/whatsapp/vendors/${confirmDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Vendor deleted");
        setVendors(v => v.filter(x => x.id !== confirmDelete.id));
      } else {
        toast.error(json.message || "Failed to delete vendor");
      }
    } catch { toast.error("Network error"); }
    finally { setDeletingId(null); setConfirmDelete(null); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Breadcrumb items={[{ label: "WhatsApp", href: "/whatsapp" }, { label: "Vendors" }]} />
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={22} className="text-green-600" />
            WhatsApp Vendors
          </h1>
          <p className="text-slate-500 text-sm">Manage API vendor credentials</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(s => !s)} className="btn btn-primary">
            <Plus size={15} /> Add Vendor
          </button>
        )}
      </div>

      {/* Add/Edit Vendor Form */}
      {showForm && canManage && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-4">{editingId ? "Edit Vendor" : "New Vendor"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Vendor Name</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. WABridge" required />
              </div>
              <div>
                <label className="form-label">Provider Type</label>
                <select className="form-select" value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value, name: f.name || e.target.value === "wabridge" ? "WABridge" : "" }))}>
                  <option value="generic">Generic (Bearer Token)</option>
                  <option value="wabridge">WABridge (Multi-Key)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="form-label">API Base URL</label>
                <input className="form-input" value={form.apiBaseUrl} onChange={e => setForm(f => ({ ...f, apiBaseUrl: e.target.value }))} placeholder="https://web.wabridge.com/api" required />
              </div>

              {form.provider === "generic" ? (
                <div className="sm:col-span-2">
                  <label className="form-label">API Key (Bearer Token)</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      className="form-input pr-10"
                      value={form.apiKey}
                      onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                      placeholder={editingId ? "Leave blank to keep current" : "Paste your API key"}
                      required={!editingId}
                    />
                    <button type="button" onClick={() => setShowKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="form-label">App Key</label>
                    <input className="form-input" value={form.appKey} onChange={e => setForm(f => ({ ...f, appKey: e.target.value }))} placeholder="Enter WABridge App Key" required={!editingId} />
                  </div>
                  <div>
                    <label className="form-label">Auth Key</label>
                    <input className="form-input" value={form.authKey} onChange={e => setForm(f => ({ ...f, authKey: e.target.value }))} placeholder="Enter WABridge Auth Key" required={!editingId} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="form-label">Device ID</label>
                    <input className="form-input" value={form.deviceId} onChange={e => setForm(f => ({ ...f, deviceId: e.target.value }))} placeholder="Enter WABridge Device ID" required={!editingId} />
                  </div>
                </>
              )}

              <div>
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="form-label text-xs">Rate Limit (msg/s)</label>
                  <input type="number" className="form-input" value={form.rateLimitPerSec} onChange={e => setForm(f => ({ ...f, rateLimitPerSec: Number(e.target.value) }))} min={1} max={100} required />
                </div>
                <div className="flex-1">
                  <label className="form-label text-xs">Retry Limit</label>
                  <input type="number" className="form-input" value={form.retryLimit} onChange={e => setForm(f => ({ ...f, retryLimit: Number(e.target.value) }))} min={0} max={5} required />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }} className="btn btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : (editingId ? "Update Vendor" : "Add Vendor")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Vendors List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex gap-4">
                <div className="h-10 w-10 bg-slate-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : vendors.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Building2 size={32} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">No vendors configured</p>
            {canManage && <p className="text-sm mt-1">Add your first WhatsApp API vendor above</p>}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {vendors.map(vendor => (
              <div key={vendor.id} className="p-4 flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                  <Building2 size={18} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900">{vendor.name}</p>
                    <span className={`badge ${
                      vendor.status === "ACTIVE" ? "badge-green" : 
                      vendor.status === "INACTIVE" ? "badge-amber" : 
                      "badge-gray"
                    }`}>
                      {vendor.status.charAt(0) + vendor.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate">{vendor.apiBaseUrl}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Wallet size={11} />
                      Balance: <span className={Number(vendor.walletBalance) <= 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                        {Number(vendor.walletBalance).toLocaleString("en-IN")}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Zap size={11} />
                      {vendor.rateLimitPerSec} msg/s
                    </span>
                    <span>Retry: {vendor.retryLimit}x</span>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRefreshBalance(vendor.id)}
                      disabled={refreshingId === vendor.id}
                      className="btn btn-outline text-xs py-1.5"
                      title="Refresh wallet balance"
                    >
                      <RefreshCw size={13} className={refreshingId === vendor.id ? "animate-spin" : ""} />
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <button
                      onClick={() => {
                        setManualBalanceModal({ id: vendor.id, name: vendor.name, balance: parseFloat(vendor.walletBalance) });
                        setManualBalanceInput({ amount: vendor.walletBalance.toString(), password: "" });
                      }}
                      className="btn btn-outline text-xs py-1.5"
                      title="Manual balance update"
                    >
                      <Wallet size={13} />
                      <span className="hidden sm:inline">Manual</span>
                    </button>
                    <button
                      onClick={() => handleEdit(vendor)}
                      className="btn btn-outline text-xs py-1.5"
                      title="Edit vendor"
                    >
                      <Pencil size={13} />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleToggleActive(vendor)}
                      className="btn btn-outline text-xs py-1.5"
                    >
                      {vendor.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete({ id: vendor.id, name: vendor.name })}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete vendor"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Vendor"
          message={`Remove "${confirmDelete.name}"? This cannot be undone and may affect queued messages.`}
          confirmLabel="Delete"
          danger
          loading={deletingId !== null}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Manual Balance Modal */}
      {manualBalanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Manual Balance Update</h3>
              <p className="text-sm text-slate-500 mt-1">Adjusting balance for <span className="font-semibold">{manualBalanceModal.name}</span></p>
            </div>
            <form onSubmit={handleManualBalance} className="p-6 space-y-4">
              <div>
                <label className="form-label mb-1.5 font-medium text-slate-700">New Balance (Amount)</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</div>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input pl-8"
                    value={manualBalanceInput.amount}
                    onChange={e => setManualBalanceInput(f => ({ ...f, amount: e.target.value }))}
                    required
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="form-label mb-1.5 font-medium text-slate-700">Administrative Password</label>
                <input
                  type="password"
                  className="form-input text-slate-900"
                  value={manualBalanceInput.password}
                  onChange={e => setManualBalanceInput(f => ({ ...f, password: e.target.value }))}
                  required
                  placeholder="Enter admin password"
                />
                <p className="text-[10px] text-slate-400 mt-1.5 italic">Check .env for WHATSAPP_ADMIN_PASSWORD</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setManualBalanceModal(null)} 
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="btn btn-primary flex-1"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : "Update Balance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
