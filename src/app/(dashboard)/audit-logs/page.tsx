"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils/format";

interface AuditLog {
  id: number;
  action: string;
  resource: string;
  resourceId?: string;
  userEmail?: string;
  ipAddress?: string;
  status: string;
  createdAt: string;
  user?: { name: string; email: string };
}

const actionColors: Record<string, string> = {
  CREATE:       "badge badge-green",
  UPDATE:       "badge badge-blue",
  DELETE:       "badge badge-red",
  LOGIN:        "badge badge-gray",
  LOGOUT:       "badge badge-gray",
  LOGIN_FAILED: "badge badge-yellow",
  EXPORT:       "badge badge-purple",
  UPLOAD:       "badge badge-purple",
  SYNC:         "badge badge-blue",
  TRIGGER:      "badge badge-orange",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState("");
  const [action, setAction] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: "25",
      ...(resource && { resource }),
      ...(action && { action }),
    });
    const res = await apiFetch(`/api/audit-logs?${params}`);
    const json = await res.json();
    if (json.success) {
      setLogs(json.data);
      setPagination(json.pagination);
    }
    setLoading(false);
  }, [page, resource, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const paginationControls = pagination && pagination.totalPages > 1 && (
    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
      <p className="text-sm text-slate-500">{pagination.total.toLocaleString()} logs</p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(page - 1)} disabled={!pagination.hasPrev} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm text-slate-600 px-2">{pagination.page} / {pagination.totalPages}</span>
        <button onClick={() => setPage(page + 1)} disabled={!pagination.hasNext} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-slate-500 text-sm">Track all system activity</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <select value={resource} onChange={(e) => { setResource(e.target.value); setPage(1); }} className="form-input w-full sm:w-auto">
          <option value="">All Resources</option>
          <option value="auth">Auth</option>
          <option value="members">Members</option>
          <option value="users">Users</option>
          <option value="settings">Settings</option>
          <option value="whatsapp_templates">WhatsApp Templates</option>
          <option value="whatsapp_cron">WhatsApp Cron</option>
        </select>
        <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="form-input w-full sm:w-auto">
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="EXPORT">Export</option>
          <option value="UPLOAD">Upload</option>
          <option value="SYNC">Sync</option>
          <option value="TRIGGER">Trigger</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
          <option value="LOGIN_FAILED">Login Failed</option>
        </select>
      </div>

      {/* Mobile card list — shown below md */}
      <div className="card overflow-hidden md:hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-2">
                <div className="flex justify-between">
                  <div className="h-5 bg-slate-100 rounded w-20" />
                  <div className="h-4 bg-slate-100 rounded w-28" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <p className="font-medium">No logs found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 space-y-1.5">
                {/* Action + status + time */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={actionColors[log.action] || "badge badge-gray"}>{log.action}</span>
                    {log.status === "SUCCESS" ? (
                      <CheckCircle size={14} className="text-green-500" />
                    ) : (
                      <XCircle size={14} className="text-red-500" />
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                </div>
                {/* Resource */}
                <p className="text-sm text-slate-700">
                  <span className="font-medium">{log.resource}</span>
                  {log.resourceId && <span className="text-slate-400 ml-1 text-xs">#{log.resourceId}</span>}
                </p>
                {/* User */}
                {(log.user?.name || log.userEmail) && (
                  <p className="text-xs text-slate-500">
                    {log.user?.name && <span className="font-medium">{log.user.name} · </span>}
                    {log.userEmail}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {paginationControls}
      </div>

      {/* Desktop table — hidden below md */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Action</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Resource</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">User</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">IP</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-slate-500 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-3"><div className="h-4 bg-slate-100 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className={actionColors[log.action] || "badge badge-gray"}>{log.action}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    <span className="font-medium">{log.resource}</span>
                    {log.resourceId && <span className="text-slate-400 text-xs ml-1">#{log.resourceId}</span>}
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-slate-700">{log.user?.name || "—"}</p>
                    <p className="text-xs text-slate-400">{log.userEmail}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">{log.ipAddress || "—"}</td>
                  <td className="px-5 py-3">
                    {log.status === "SUCCESS" ? (
                      <CheckCircle size={16} className="text-green-500" />
                    ) : (
                      <XCircle size={16} className="text-red-500" />
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {paginationControls}
      </div>
    </div>
  );
}
