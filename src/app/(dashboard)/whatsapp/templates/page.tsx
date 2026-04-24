"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useEffect, useState, useCallback } from "react";
import { LayoutTemplate, RefreshCw, Loader2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface Vendor {
  id: number;
  name: string;
}

interface Template {
  id: number;
  vendorId: number;
  templateName: string;
  language: string;
  category: string;
  isActive: boolean;
  body: string | null;
  headerText: string | null;
  headerFormat: string | null;
  footerText: string | null;
  buttons: any | null;
  status: "ACTIVE" | "INACTIVE" | "DELETED";
  vendor: { id: number; name: string };
  variables: string[] | null;
}

const exampleValues: Record<string, string[]> = {
  birthday: ["John Doe", "15th Aug"],
  anniversary: ["Mr. & Mrs. Smith", "20th Oct"],
  otp: ["123456"],
  festival: ["Deepavali"],
  utility: ["Your bill is generated", "25th of this month"],
};

function renderPreview(t: Template): React.ReactNode {
  const { body, headerText, footerText, buttons, category } = t;
  if (!body && !headerText) return <span className="text-slate-400 italic">No content</span>;
  
  const examples = exampleValues[category] || ["Example", "Data"];
  
  // Helper to replace {{n}} with highlighted example data
  const highlightVars = (text: string | null) => {
    if (!text) return null;
    let parts: (string | React.ReactNode)[] = [text];
    for (let i = 1; i <= 10; i++) {
        const placeholder = `{{${i}}}`;
        const example = examples[i-1] || `[Var${i}]`;
        parts = parts.flatMap(part => {
          if (typeof part !== "string") return [part];
          const chunks = part.split(placeholder);
          const result: (string | React.ReactNode)[] = [];
          for (let j = 0; j < chunks.length; j++) {
            result.push(chunks[j]);
            if (j < chunks.length - 1) {
              result.push(<span key={`${i}-${j}`} className="bg-yellow-100 text-yellow-800 px-1 rounded font-bold border border-yellow-200 decoration-none">{example}</span>);
            }
          }
          return result;
        });
    }
    return parts;
  };

  return (
    <div className="text-[11px] leading-relaxed space-y-1">
      {headerText && (
        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 mb-1">
          {highlightVars(headerText)}
        </div>
      )}
      <div className="whitespace-pre-wrap text-slate-700">
        {highlightVars(body)}
      </div>
      {footerText && (
        <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1 mt-1 font-medium">
          {highlightVars(footerText)}
        </div>
      )}
      {buttons && Array.isArray(buttons) && buttons.length > 0 && (
        <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-100 divide-y divide-slate-100">
          {buttons.map((btn: any, idx: number) => (
            <div key={idx} className="flex items-center justify-center gap-1.5 py-1 text-blue-600 font-semibold cursor-default hover:bg-slate-50 rounded">
              {btn.type === "PHONE_NUMBER" && <span className="rotate-12 translate-y-[-1px]">📞</span>}
              {btn.type === "URL" && <span>🔗</span>}
              {btn.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const categoryColors: Record<string, string> = {
  birthday:    "bg-pink-50 text-pink-700 border border-pink-200",
  anniversary: "bg-purple-50 text-purple-700 border border-purple-200",
  festival:    "bg-orange-50 text-orange-700 border border-orange-200",
  custom:      "bg-blue-50 text-blue-700 border border-blue-200",
  otp:         "bg-green-50 text-green-700 border border-green-200",
};

export default function TemplatesPage() {
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission("whatsapp:manage");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [filterVendor, setFilterVendor] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, vRes] = await Promise.all([
        fetch(`/api/whatsapp/templates${filterVendor ? `?vendorId=${filterVendor}` : ""}`),
        fetch("/api/whatsapp/vendors"),
      ]);
      const [tJson, vJson] = await Promise.all([tRes.json(), vRes.json()]);
      if (tJson.success) setTemplates(tJson.data);
      if (vJson.success) setVendors(vJson.data);
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, [filterVendor]);

  useEffect(() => { fetchAll(); setPage(1); }, [fetchAll]);

  const handleSync = async (vendorId: number) => {
    setSyncing(vendorId);
    try {
      const res = await apiFetch("/api/whatsapp/templates/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Sync done — ${json.data.created} created, ${json.data.updated} updated`);
        fetchAll();
      } else {
        toast.error(json.message || "Sync failed");
      }
    } catch { toast.error("Network error"); }
    finally { setSyncing(null); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      const res = await apiFetch(`/api/whatsapp/templates/${confirmDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Template deleted");
        setTemplates(ts => ts.filter(t => t.id !== confirmDelete.id));
      } else {
        toast.error(json.message || "Failed to delete template");
      }
    } catch { toast.error("Network error"); }
    finally { setDeletingId(null); setConfirmDelete(null); }
  };

  const totalPages = Math.max(1, Math.ceil(templates.length / PAGE_SIZE));
  const pagedTemplates = templates.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const paginationEl = totalPages <= 1 ? null : (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm">
      <span className="text-slate-500">
        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, templates.length)} of {templates.length}
      </span>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
          .reduce<(number | "…")[]>((acc, n, i, arr) => {
            if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("…");
            acc.push(n); return acc;
          }, [])
          .map((n, i) => n === "…"
            ? <span key={`e${i}`} className="px-1.5 text-slate-400">…</span>
            : <button key={n} onClick={() => setPage(n as number)}
                className={`w-7 h-7 rounded text-xs font-medium transition-colors ${page === n ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-600"}`}>
                {n}
              </button>
          )}
        <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
          className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Breadcrumb items={[{ label: "WhatsApp", href: "/whatsapp" }, { label: "Templates" }]} />
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutTemplate size={22} className="text-green-600" />
            WhatsApp Templates
          </h1>
          <p className="text-slate-500 text-sm">Approved templates synced from vendor</p>
        </div>
        {canManage && vendors.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {vendors.map(v => (
              <button
                key={v.id}
                onClick={() => handleSync(v.id)}
                disabled={syncing === v.id}
                className="btn btn-outline text-xs"
              >
                {syncing === v.id
                  ? <><Loader2 size={13} className="animate-spin" /> Syncing {v.name}...</>
                  : <><RefreshCw size={13} /> Sync {v.name}</>
                }
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      {vendors.length > 1 && (
        <div className="card p-4">
          <select
            value={filterVendor}
            onChange={e => setFilterVendor(e.target.value)}
            className="form-input w-full sm:w-auto"
          >
            <option value="">All Vendors</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-1/4">Template Name</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium w-2/5">Content Preview</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Language</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-slate-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : templates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                    <LayoutTemplate size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No templates found</p>
                    {canManage && <p className="text-sm mt-1">Use the Sync button to import from your vendor</p>}
                  </td>
                </tr>
              ) : (
                pagedTemplates.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{t.templateName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColors[t.category] || "bg-slate-50 text-slate-700 border border-slate-200"}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-100 rounded-lg p-3 bg-white shadow-sm ring-1 ring-slate-200">
                        {renderPreview(t)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs uppercase">
                      <div>{t.language}</div>
                      <div className="text-[10px] opacity-60">{t.vendor.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        t.status === "ACTIVE" ? "badge-green" : 
                        t.status === "INACTIVE" ? "badge-amber" : 
                        "badge-gray"
                      }`}>
                        {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmDelete({ id: t.id, name: t.templateName })}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete template"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {paginationEl}
      </div>

      {/* Mobile cards */}
      <div className="card overflow-hidden md:hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-2">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <LayoutTemplate size={32} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">No templates found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pagedTemplates.map(t => (
              <div key={t.id} className="p-4 space-y-1.5">
                <p className="font-mono text-xs text-slate-700 font-medium">{t.templateName}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${categoryColors[t.category] || "bg-slate-50 text-slate-700 border border-slate-200"}`}>
                    {t.category}
                  </span>
                  <span className="text-xs text-slate-400 uppercase">{t.language}</span>
                  <span className={`badge ${
                    t.status === "ACTIVE" ? "badge-green" : 
                    t.status === "INACTIVE" ? "badge-amber" : 
                    "badge-gray"
                  }`}>
                    {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm mt-1 ring-1 ring-slate-100">
                   {renderPreview(t)}
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-xs text-slate-400">{t.vendor.name}</p>
                  <button
                    onClick={() => setConfirmDelete({ id: t.id, name: t.templateName })}
                    className="p-1 text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {paginationEl}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Template"
          message={`Remove "${confirmDelete.name}"? This will hide it from the selection list.`}
          confirmLabel="Delete"
          danger
          loading={deletingId !== null}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
