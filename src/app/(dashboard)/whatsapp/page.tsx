"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  MessageCircle, ChevronLeft, ChevronRight,
  Send, Settings, Building2, LayoutTemplate, RefreshCw, Eye, X,
  Clock, CheckCircle, AlertCircle, SkipForward, Zap,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface WaLog {
  id: number;
  messageType: string;
  templateName: string | null;
  messageBody: string | null;
  messageBodyResolved: string | null;
  recipientPhone: string;
  vendorMessageId: string | null;
  status: string;
  retryCount: number;
  errorMessage: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  scheduledDate: string;
  createdAt: string;
  updatedAt: string;
  vendor: { id: number; name: string };
  member: { id: number; membershipId: string; name: string; phone: string };
  creditLogs?: { amount: string | number }[];
}

interface Pagination {
  page: number; pageSize: number; total: number;
  totalPages: number; hasNext: boolean; hasPrev: boolean;
}

const statusColors: Record<string, string> = {
  pending:    "badge badge-yellow",
  processing: "badge badge-yellow",
  sent:       "badge badge-blue",
  delivered:  "badge badge-green",
  read:       "badge badge-green",
  failed:     "badge badge-red",
};

const typeColors: Record<string, string> = {
  birthday:    "bg-pink-50 text-pink-700 border border-pink-200",
  anniversary: "bg-purple-50 text-purple-700 border border-purple-200",
  festival:    "bg-orange-50 text-orange-700 border border-orange-200",
  custom:      "bg-blue-50 text-blue-700 border border-blue-200",
  manual:      "bg-slate-50 text-slate-700 border border-slate-200",
  otp:         "bg-green-50 text-green-700 border border-green-200",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function formatDateOnly(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function parseMessageBody(body: string | null): Record<string, string> | string | null {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed === "object" && parsed !== null) return parsed as Record<string, string>;
    return body;
  } catch {
    return body;
  }
}

// ─── Log Detail Modal ─────────────────────────────────────────────────────────

function LogDetailModal({ log, onClose }: { log: WaLog; onClose: () => void }) {
  const variables = parseMessageBody(log.messageBody);

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-slate-800 break-all flex-1">{value ?? "—"}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <MessageCircle size={16} className="text-green-600" />
            <span className="font-semibold text-slate-900">Message Log #{log.id}</span>
            <span className={`${statusColors[log.status] || "badge badge-gray"} ml-1`}>
              {(log.status.charAt(0).toUpperCase() + log.status.slice(1))}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-5">

          {/* Member */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recipient</p>
            <div className="bg-slate-50 rounded-lg px-4 py-1">
              <Row label="Name" value={
                <Link href={`/members/${log.member.id}`} className="text-primary hover:underline font-medium">
                  {log.member.name}
                </Link>
              } />
              <Row label="Membership ID" value={<span className="font-mono">{log.member.membershipId}</span>} />
              <Row label="Phone (member)" value={<span className="font-mono">{log.member.phone}</span>} />
              <Row label="Sent to" value={<span className="font-mono">{log.recipientPhone}</span>} />
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Message</p>
            <div className="bg-slate-50 rounded-lg px-4 py-1">
              <Row label="Type" value={
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeColors[log.messageType] || ""}`}>
                  {log.messageType}
                </span>
              } />
              <Row label="Template" value={log.templateName ? <span className="font-mono">{log.templateName}</span> : null} />
              <Row label="Vendor" value={log.vendor.name} />
              <Row label="Credits Consumed" value={
                log.creditLogs && log.creditLogs.length > 0 ? (
                  <span className="font-bold text-primary">{log.creditLogs[0].amount} cr</span>
                ) : (
                  <span className="text-slate-400 italic">No credit log found</span>
                )
              } />
            </div>
          </div>

          {/* Full Resolved Message */}
          {log.messageBodyResolved && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Complete Message Reference
              </p>
              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 relative">
                <div className="absolute top-2 right-3 text-[10px] font-bold text-primary/40 uppercase tracking-widest">Sent Text</div>
                <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {log.messageBodyResolved}
                </div>
              </div>
            </div>
          )}

          {/* Variables / Message Body */}
          {log.messageBody && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Message Content Details
              </p>
              {typeof variables === "object" && variables !== null ? (
                <div className="bg-slate-900 rounded-lg p-4 space-y-1.5 shadow-inner">
                  {Object.entries(variables as Record<string, string>).map(([k, v]) => (
                    <div key={k} className="flex gap-3 font-mono text-xs">
                      <span className="text-slate-500 shrink-0 w-8">{`{{${k}}}`}</span>
                      <span className="text-green-400 break-all">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 whitespace-pre-wrap break-all shadow-inner">
                  {String(variables)}
                </div>
              )}
            </div>
          )}

          {/* Delivery */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Delivery</p>
            <div className="bg-slate-50 rounded-lg px-4 py-1">
              <Row label="Vendor Msg ID" value={log.vendorMessageId ? <span className="font-mono">{log.vendorMessageId}</span> : null} />
              <Row label="Retry Count" value={log.retryCount > 0 ? <span className="text-orange-600 font-medium">{log.retryCount}</span> : "0"} />
              <Row label="Created" value={formatDateTime(log.createdAt)} />
              <Row label="Sent At" value={formatDateTime(log.sentAt)} />
              <Row label="Delivered At" value={formatDateTime(log.deliveredAt)} />
              <Row label="Read At" value={formatDateTime(log.readAt)} />
              <Row label="Scheduled Date" value={formatDateOnly(log.scheduledDate)} />
            </div>
          </div>

          {/* Error */}
          {log.errorMessage && (
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Error from Vendor</p>
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-red-400 whitespace-pre-wrap break-all">
                {log.errorMessage}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="btn btn-outline btn-sm px-5">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Usage Statistics ────────────────────────────────────────────────────────
interface UsageData {
  today:     { credits: number; messages: number };
  yesterday: { credits: number; messages: number };
  total:     number;
  byVendor:  { vendorId: number; vendorName: string; totalCredits: number; messageCount: number }[];
  byType:    { type: string; totalCredits: number; messageCount: number }[];
}

function UsageStats() {
  const [stats, setStats] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/whatsapp/stats/usage");
        const json = await res.json();
        if (json.success) setStats(json.data);
      } catch (err) {
        console.error("Failed to fetch stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
    </div>
  );

  if (!stats) return null;

  const topCards = [
    {
      label: "Today",
      sublabel: "credits used",
      credits: stats.today.credits,
      messages: stats.today.messages,
      accent: "bg-green-600",
      text: "text-white",
    },
    {
      label: "Yesterday",
      sublabel: "credits used",
      credits: stats.yesterday.credits,
      messages: stats.yesterday.messages,
      accent: "bg-slate-700",
      text: "text-white",
    },
    {
      label: "All-time Total",
      sublabel: "credits consumed",
      credits: stats.total,
      messages: null,
      accent: "bg-primary",
      text: "text-white",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {topCards.map(card => (
          <div key={card.label} className={`${card.accent} rounded-xl p-5 relative overflow-hidden`}>
            <div className={`${card.text} opacity-70 text-xs font-semibold uppercase tracking-wider mb-1`}>{card.label}</div>
            <div className={`${card.text} text-3xl font-bold mb-0.5`}>
              {card.credits.toLocaleString()}
              <span className="text-sm font-normal opacity-60 ml-1">cr</span>
            </div>
            {card.messages !== null && (
              <div className={`${card.text} text-[11px] opacity-60`}>{card.messages} message{card.messages !== 1 ? "s" : ""}</div>
            )}
            <div className="absolute -right-3 -bottom-3 opacity-10">
              <MessageCircle size={80} className={card.text} />
            </div>
          </div>
        ))}
      </div>

      {/* Breakdowns — only show when there is data */}
      {stats.total > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Vendor Breakdown */}
          {stats.byVendor.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">By Vendor</p>
              <div className="space-y-3">
                {stats.byVendor.map(v => (
                  <div key={v.vendorId} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-slate-700">{v.vendorName}</span>
                      <span className="text-slate-500">{v.totalCredits.toLocaleString()} cr · {v.messageCount} msgs</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (v.totalCredits / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type Breakdown */}
          {stats.byType.length > 0 && (
            <div className="card p-5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">By Category</p>
              <div className="flex flex-wrap gap-2">
                {stats.byType.map(t => (
                  <div key={t.type} className="flex flex-col bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-lg min-w-[110px]">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase w-fit mb-1 ${typeColors[t.type] || "bg-slate-100 text-slate-600"}`}>
                      {t.type}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {t.totalCredits.toLocaleString()}
                      <span className="text-[10px] font-normal text-slate-400 ml-0.5">cr</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{t.messageCount} messages</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cron Logs ────────────────────────────────────────────────────────────────

interface CronLog {
  id: number;
  triggeredBy: string;
  istDate: string;
  processed: number;
  enqueued: number;
  skipped: number;
  failed: number;
  stoppedReason: string | null;
  skippedDetails: { memberId: number; name: string; messageType: string; reason: string }[];
  errors: string[];
  diagnostics: Record<string, unknown>;
  durationMs: number | null;
  createdAt: string;
}

function CronLogs() {
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [pagination, setPagination] = useState<{ page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp/cron/logs?page=${page}&pageSize=20`);
      const json = await res.json();
      if (json.success) { setLogs(json.data.logs); setPagination(json.data.pagination); }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const triggerColors: Record<string, string> = {
    scheduler: "bg-blue-50 text-blue-700 border border-blue-200",
    manual:    "bg-purple-50 text-purple-700 border border-purple-200",
    admin:     "bg-orange-50 text-orange-700 border border-orange-200",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{pagination?.total ?? 0} cron runs recorded</p>
        <button onClick={fetchLogs} className="btn btn-outline btn-sm">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">No cron runs yet</p>
            <p className="text-xs mt-1">Run the cron manually or wait for the scheduler</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map(log => (
              <div key={log.id}>
                {/* Row */}
                <button
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status icon */}
                    {log.stoppedReason ? (
                      <AlertCircle size={16} className="text-orange-500 shrink-0" />
                    ) : log.failed > 0 ? (
                      <AlertCircle size={16} className="text-red-400 shrink-0" />
                    ) : (
                      <CheckCircle size={16} className="text-green-500 shrink-0" />
                    )}

                    {/* Date + time */}
                    <span className="text-sm font-semibold text-slate-800 min-w-[80px]">{log.istDate}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST
                    </span>

                    {/* Triggered by */}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${triggerColors[log.triggeredBy] || "bg-slate-100 text-slate-600"}`}>
                      {log.triggeredBy}
                    </span>

                    {/* Stats chips */}
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        <Zap size={10} /> {log.enqueued} sent
                      </span>
                      {log.skipped > 0 && (
                        <span className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          <SkipForward size={10} /> {log.skipped} skipped
                        </span>
                      )}
                      {log.failed > 0 && (
                        <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <AlertCircle size={10} /> {log.failed} errors
                        </span>
                      )}
                      {log.durationMs != null && (
                        <span className="text-xs text-slate-400">{(log.durationMs / 1000).toFixed(1)}s</span>
                      )}
                    </div>
                  </div>

                  {/* Stopped reason */}
                  {log.stoppedReason && (
                    <p className="text-xs text-orange-600 mt-1 text-left">⚠ {log.stoppedReason}</p>
                  )}
                </button>

                {/* Expanded detail */}
                {expanded === log.id && (
                  <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100 space-y-3">
                    {/* Diagnostics */}
                    {log.diagnostics && Object.keys(log.diagnostics).length > 0 && (
                      <div className="pt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Diagnostics</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(log.diagnostics).map(([k, v]) => (
                            <div key={k} className="bg-white border border-slate-100 rounded px-3 py-1.5">
                              <span className="text-[10px] text-slate-400 block">{k}</span>
                              <span className="text-xs font-semibold text-slate-700">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skipped details */}
                    {log.skippedDetails.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Skipped ({log.skippedDetails.length})</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {log.skippedDetails.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-white border border-slate-100 rounded px-3 py-1.5">
                              <span className="font-medium text-slate-700 flex-1">{s.name}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${typeColors[s.messageType] || "bg-slate-100 text-slate-600"}`}>{s.messageType}</span>
                              <span className="text-slate-400">{s.reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Errors */}
                    {log.errors.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Errors ({log.errors.length})</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {log.errors.map((e, i) => (
                            <p key={i} className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-1.5 font-mono break-all">{e}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">{pagination.total} total runs</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-slate-600 px-2">{pagination.page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WhatsAppLogsPage() {
  const { hasPermission } = useAuthStore();
  const [logs, setLogs] = useState<WaLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [messageType, setMessageType] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState<WaLog | null>(null);
  const [activeTab, setActiveTab] = useState<"messages" | "cron">("messages");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: "20" });
      if (messageType) params.set("messageType", messageType);
      if (status) params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/whatsapp/logs?${params}`);
      const json = await res.json();
      if (json.success) { setLogs(json.data); setPagination(json.pagination); }
      else toast.error(json.message || "Failed to load logs");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, [page, messageType, status, dateFrom, dateTo]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      // 1. Trigger vendor status sync (Check from vendors)
      const pollRes = await fetch("/api/whatsapp/dlr/poll", { method: "POST" });
      const pollJson = await pollRes.json();
      
      if (pollJson.success && pollJson.data?.updated > 0) {
        toast.success(`${pollJson.data.updated} statuses updated from vendors`);
      }
    } catch (err) {
      console.error("Poll failed", err);
    } finally {
      // 2. Fetch logs from DB (Refresh UI)
      fetchLogs();
    }
  };

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const paginationControls = pagination && pagination.totalPages > 1 && (
    <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-slate-500">
        {pagination.total.toLocaleString()} total messages
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage(p => p - 1)} disabled={!pagination.hasPrev}
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm text-slate-600 px-2">{pagination.page} / {pagination.totalPages}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext}
          className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-40 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb items={[{ label: "WhatsApp" }]} />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle size={22} className="text-green-600" />
            WhatsApp
          </h1>
          <p className="text-slate-500 text-sm">Message delivery logs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission("whatsapp:send") && (
            <Link href="/whatsapp/send" className="btn btn-primary">
              <Send size={15} />
              <span className="hidden sm:inline">Send Message</span>
            </Link>
          )}
          {hasPermission("whatsapp:manage") && (
            <>
              <Link href="/whatsapp/templates" className="btn btn-outline">
                <LayoutTemplate size={15} />
                <span className="hidden sm:inline">Templates</span>
              </Link>
              <Link href="/whatsapp/vendors" className="btn btn-outline">
                <Building2 size={15} />
                <span className="hidden sm:inline">Vendors</span>
              </Link>
              <Link href="/whatsapp/settings" className="btn btn-outline">
                <Settings size={15} />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </>
          )}
          <button onClick={handleRefresh} className="btn btn-outline" title="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Usage Statistics */}
      <UsageStats />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("messages")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === "messages" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
        >
          Message Logs
        </button>
        <button
          onClick={() => setActiveTab("cron")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === "cron" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Clock size={13} />
          Cron Runs
        </button>
      </div>

      {activeTab === "cron" && <CronLogs />}

      {activeTab === "messages" && <>
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <select value={messageType} onChange={e => { setMessageType(e.target.value); setPage(1); }}
            className="form-input w-full sm:w-auto">
            <option value="">All Types</option>
            <option value="birthday">🎂 Birthday</option>
            <option value="anniversary">💍 Anniversary</option>
            <option value="festival">🎉 Festival</option>
            <option value="custom">📝 Custom</option>
            <option value="manual">✋ Manual</option>
            <option value="otp">🔐 OTP</option>
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="form-input w-full sm:w-auto">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
            className="form-input w-full sm:w-auto" title="From date" />
          <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
            className="form-input w-full sm:w-auto" title="To date" />
        </div>
      </div>

      {/* Mobile cards */}
      <div className="card overflow-hidden md:hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 animate-pulse space-y-2">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <MessageCircle size={32} className="mx-auto mb-2 opacity-40" />
            <p className="font-medium">No messages found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map(log => (
              <div key={log.id} className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <Link href={`/members/${log.member.id}`}
                      className="font-medium text-slate-900 hover:text-primary text-sm">
                      {log.member.name}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono">{log.member.membershipId}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`${statusColors[log.status] || "badge badge-gray"} text-xs`}>
                      {(log.status.charAt(0).toUpperCase() + log.status.slice(1))}
                    </span>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                      title="View details"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeColors[log.messageType] || ""}`}>
                    {log.messageType}
                  </span>
                  <span className="text-slate-400 font-mono">{log.recipientPhone}</span>
                </div>
                <div className="text-xs text-slate-400">
                  {log.templateName || "—"} · {formatDateTime(log.sentAt || log.createdAt)}
                </div>
                {log.errorMessage && (
                  <p className="text-xs text-red-500 truncate">{log.errorMessage}</p>
                )}
              </div>
            ))}
          </div>
        )}
        {paginationControls}
      </div>

      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Member</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Template</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Phone</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Retries</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Sent At</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Scheduled</th>
                <th className="text-center px-4 py-3 text-slate-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-slate-400">
                    <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="font-medium">No messages found</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/members/${log.member.id}`}
                        className="font-medium text-slate-900 hover:text-primary">
                        {log.member.name}
                      </Link>
                      <p className="text-xs text-slate-400 font-mono">{log.member.membershipId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[log.messageType] || ""}`}>
                        {log.messageType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                      {log.templateName || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {log.recipientPhone}
                    </td>
                    <td className="px-4 py-3">
                      <span className={statusColors[log.status] || "badge badge-gray"}>
                        {(log.status.charAt(0).toUpperCase() + log.status.slice(1))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">
                      {log.retryCount > 0 ? (
                        <span className="text-orange-600 font-medium">{log.retryCount}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {formatDateTime(log.sentAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {formatDateOnly(log.scheduledDate)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                        title="View full details"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {paginationControls}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
      </>}
    </div>
  );
}
