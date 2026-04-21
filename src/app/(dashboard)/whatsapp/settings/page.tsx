"use client";

import { useEffect, useState } from "react";
import { Settings, Loader2, Save, RefreshCw, Eye, EyeOff, Link, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface Vendor { id: number; name: string }
interface Template { id: number; vendorId: number; templateName: string; category: string }

interface WaSettings {
  activeVendorId: number | null;
  retryAttempts: number;
  cronTime: string;
  enableBirthday: boolean;
  enableAnniversary: boolean;
  enableEvents: boolean;
  birthdayTemplateId: number | null;
  countryCode: string;
  countryName: string;
  birthdayVariables: Record<string, string> | null;
  anniversaryTemplateId: number | null;
  anniversaryVariables: Record<string, string> | null;
  enableExternalCron: boolean;
  externalCronSecret: string | null;
  cronSecret?: string;
}

const MEMBER_FIELDS = [
  { label: "Full Name", value: "name" },
  { label: "Membership ID", value: "membershipId" },
  { label: "Phone Number", value: "phone" },
  { label: "Position", value: "position" },
  { label: "Business Name", value: "businessName" },
  { label: "District", value: "district" },
  { label: "Taluk", value: "taluk" },
  { label: "Village", value: "village" },
  { label: "Email Address", value: "email" },
  { label: "State", value: "state" },
];

const COUNTRIES = [
  { name: "India", code: "+91" },
  { name: "United Arab Emirates", code: "+971" },
  { name: "Saudi Arabia", code: "+966" },
  { name: "Oman", code: "+968" },
  { name: "Qatar", code: "+974" },
  { name: "Kuwait", code: "+965" },
  { name: "Bahrain", code: "+973" },
  { name: "Sri Lanka", code: "+94" },
  { name: "Singapore", code: "+65" },
  { name: "Malaysia", code: "+60" },
  { name: "United Kingdom", code: "+44" },
  { name: "USA / Canada", code: "+1" },
];

export default function WhatsAppSettingsPage() {
  const { hasPermission } = useAuthStore();
  const canManage = hasPermission("whatsapp:manage");

  const [settings, setSettings] = useState<WaSettings | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggeringCron, setTriggeringCron] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [sRes, vRes, tRes] = await Promise.all([
          fetch("/api/whatsapp/settings"),
          fetch("/api/whatsapp/vendors"),
          fetch("/api/whatsapp/templates"),
        ]);
        const [sJson, vJson, tJson] = await Promise.all([sRes.json(), vRes.json(), tRes.json()]);
        if (sJson.success) setSettings(sJson.data);
        if (vJson.success) setVendors(vJson.data);
        if (tJson.success) setTemplates(tJson.data);
      } catch { toast.error("Failed to load settings"); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.data); // sync state with what DB actually saved
        toast.success("Settings saved");
      } else {
        toast.error(json.message || "Failed to save");
      }
    } catch { toast.error("Network error"); }
    finally { setSaving(false); }
  };

  const handleTriggerCron = async () => {
    setTriggeringCron(true);
    try {
      const res = await fetch("/api/whatsapp/cron/trigger", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        const d = json.data;
        if (d.stoppedReason) {
          toast.error(`Cron stopped: ${d.stoppedReason}`, { duration: 6000 });
        } else if (d.enqueued === 0) {
          const diag = d.diagnostics;
          let reason = "0 messages queued.";
          if (diag) {
            if (!diag.birthdayEnabled && !diag.anniversaryEnabled) reason += " Birthday & anniversary both disabled.";
            else if (diag.birthdaysToday === 0 && diag.anniversariesToday === 0) reason += ` No birthdays/anniversaries on ${diag.istDate}.`;
            else if (!diag.birthdayTemplateConfigured && diag.birthdaysToday > 0) reason += " Birthday template not selected.";
            else if (!diag.anniversaryTemplateConfigured && diag.anniversariesToday > 0) reason += " Anniversary template not selected.";
          }
          toast(`${reason} Skipped: ${d.skipped}`, { icon: "ℹ️", duration: 6000 });
        } else {
          toast.success(`Cron done — ${d.enqueued} queued, ${d.skipped} skipped`);
        }
      } else {
        toast.error(json.message || "Cron trigger failed");
      }
    } catch { toast.error("Network error"); }
    finally { setTriggeringCron(false); }
  };

  const birthdayTemplates = templates.filter(t => t.category === "birthday" || t.category === "custom");
  const anniversaryTemplates = templates.filter(t => t.category === "anniversary" || t.category === "custom");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="py-20 text-center text-slate-400">
        <p>Failed to load settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Breadcrumb items={[{ label: "WhatsApp", href: "/whatsapp" }, { label: "Settings" }]} />
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings size={22} className="text-green-600" />
            WhatsApp Settings
          </h1>
          <p className="text-slate-500 text-sm">Configure automation and vendor preferences</p>
        </div>
        <button
          onClick={handleTriggerCron}
          disabled={triggeringCron || !canManage}
          className="btn btn-outline"
          title="Run daily cron job now"
        >
          {triggeringCron
            ? <><Loader2 size={14} className="animate-spin" /> Running...</>
            : <><RefreshCw size={14} /> Run Cron Now</>
          }
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Active Vendor */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Vendor</h2>
          <div>
            <label className="form-label">Active Vendor</label>
            <select
              className="form-input"
              value={settings.activeVendorId ?? ""}
              onChange={e => setSettings(s => s && ({ ...s, activeVendorId: e.target.value ? Number(e.target.value) : null }))}
              disabled={!canManage}
            >
              <option value="">— No active vendor —</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">Messages will only be sent when a vendor is active and has wallet balance.</p>
          </div>
        </div>

        {/* Scheduler */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Scheduler</h2>
          <div>
            <label className="form-label">Daily Cron Time (IST)</label>
            <input
              type="time"
              className="form-input w-40"
              value={settings.cronTime}
              onChange={e => setSettings(s => s && ({ ...s, cronTime: e.target.value }))}
              disabled={!canManage}
            />
            <p className="text-xs text-slate-400 mt-1">Birthday and anniversary messages are queued at this time every day.</p>
          </div>
          <div>
            <label className="form-label">Retry Attempts</label>
            <input
              type="number"
              className="form-input w-24"
              value={settings.retryAttempts}
              onChange={e => {
                const v = e.target.valueAsNumber;
                setSettings(s => s && ({ ...s, retryAttempts: isNaN(v) ? 0 : Math.min(5, Math.max(0, v)) }));
              }}
              min={0} max={5}
              disabled={!canManage}
            />
          </div>
        </div>

        {/* External Trigger */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <ExternalLink size={18} className="text-blue-600" />
              External Trigger
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Status:</span>
              <button
                type="button"
                onClick={() => setSettings(s => s && ({ ...s, enableExternalCron: !s.enableExternalCron }))}
                disabled={!canManage}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.enableExternalCron ? "bg-green-600" : "bg-slate-200"}`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${settings.enableExternalCron ? "translate-x-4" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 leading-relaxed">
            Allow triggering the daily WhatsApp delivery from external services (like cron-job.org).
          </p>
          
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                Authorized Secret Key
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showSecret ? "text" : "password"}
                    className="form-input text-xs font-mono pr-10 bg-slate-50 cursor-default"
                    placeholder="Auto-generated secret"
                    value={settings.externalCronSecret || ""}
                    readOnly
                    disabled={!canManage}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  title="Generate random secret"
                  onClick={() => {
                    const randomSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    setSettings(s => s && ({ ...s, externalCronSecret: randomSecret }));
                    toast.success("New secret generated (Save to apply)");
                  }}
                  disabled={!canManage}
                  className="btn btn-outline py-1 px-3"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Click the refresh icon to generate a new secure key. Remember to save your changes.</p>
            </div>

            <div className={`transition-opacity duration-300 ${settings.enableExternalCron ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Trigger URL (GET/POST)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  className="form-input text-xs font-mono bg-slate-50 flex-1 truncate"
                  value={settings?.cronSecret || settings?.externalCronSecret ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/whatsapp/cron/trigger?secret=${settings.externalCronSecret || settings.cronSecret}` : "Loading URL..."}
                />
                <button
                  type="button"
                  onClick={() => {
                    const secret = settings.externalCronSecret || settings.cronSecret;
                    if (!secret) return;
                    const url = `${window.location.origin}/api/whatsapp/cron/trigger?secret=${secret}`;
                    navigator.clipboard.writeText(url);
                    toast.success("URL copied to clipboard");
                  }}
                  className="btn btn-outline py-1 px-3 text-xs"
                >
                  Copy
                </button>
              </div>
            </div>

            {!settings.enableExternalCron && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-700 leading-normal flex items-center gap-2">
                <span className="shrink-0 w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                External access is currently disabled. The trigger URL above will return a 403 Forbidden error.
              </div>
            )}
          </div>
        </div>

        {/* Localization */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            🌏 Localization
          </h2>
          <div>
            <label className="form-label">Default Country (For Phone Prefix)</label>
            <select
              className="form-input"
              value={`${settings.countryName}|${settings.countryCode}`}
              onChange={e => {
                const [name, code] = e.target.value.split("|");
                setSettings(s => s && ({ ...s, countryName: name, countryCode: code }));
              }}
              disabled={!canManage}
            >
              {COUNTRIES.map(c => (
                <option key={c.code} value={`${c.name}|${c.code}`}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1.5 italic">
              When India is selected, the system will automatically format 10-digit numbers as <span className="text-slate-600 font-medium">91XXXXXXXXXX</span>.
            </p>
          </div>
        </div>

        {/* Automation Toggles */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-slate-900">Automation</h2>

          <div className="space-y-3">
            {/* Birthday */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
              <input
                type="checkbox"
                id="enableBirthday"
                checked={settings.enableBirthday}
                onChange={e => setSettings(s => s && ({ ...s, enableBirthday: e.target.checked }))}
                disabled={!canManage}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor="enableBirthday" className="font-medium text-slate-700 text-sm cursor-pointer">
                  🎂 Birthday Messages
                </label>
                <p className="text-xs text-slate-400">Send a WhatsApp message on member birthdays</p>
              </div>
            </div>
            {settings.enableBirthday && (
              <div className="ml-6 space-y-4">
                <div>
                  <label className="form-label">Birthday Template</label>
                  <select
                    className="form-input"
                    value={settings.birthdayTemplateId ?? ""}
                    onChange={e => setSettings(s => s && ({ ...s, birthdayTemplateId: e.target.value ? Number(e.target.value) : null }))}
                    disabled={!canManage}
                  >
                    <option value="">— Select template —</option>
                    {birthdayTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.templateName}</option>
                    ))}
                  </select>
                </div>

                {settings.birthdayTemplateId && (
                  <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Variable Mapping</p>
                    {(() => {
                      const t = templates.find(temp => temp.id === settings.birthdayTemplateId);
                      const vars = Array.isArray((t as any)?.variables) ? (t as any).variables : [];
                      if (vars.length === 0) return <p className="text-xs text-slate-400 italic">No variables detected in this template.</p>;
                      
                      return vars.map((v: string) => (
                        <div key={v} className="grid grid-cols-2 gap-3 items-center">
                          <label className="text-xs font-medium text-slate-600">Placeholder {"{{"}{v}{"}}"}</label>
                          <select
                            className="form-input text-xs h-8"
                            value={settings.birthdayVariables?.[v] || ""}
                            onChange={e => {
                              const newVars = { ...(settings.birthdayVariables || {}), [v]: e.target.value };
                              setSettings(s => s && ({ ...s, birthdayVariables: newVars }));
                            }}
                            disabled={!canManage}
                          >
                            <option value="">— Map to field —</option>
                            {MEMBER_FIELDS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Anniversary */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
              <input
                type="checkbox"
                id="enableAnniversary"
                checked={settings.enableAnniversary}
                onChange={e => setSettings(s => s && ({ ...s, enableAnniversary: e.target.checked }))}
                disabled={!canManage}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor="enableAnniversary" className="font-medium text-slate-700 text-sm cursor-pointer">
                  💍 Anniversary Messages
                </label>
                <p className="text-xs text-slate-400">Send a WhatsApp message on member wedding anniversaries</p>
              </div>
            </div>
            {settings.enableAnniversary && (
              <div className="ml-6 space-y-4">
                <div>
                  <label className="form-label">Anniversary Template</label>
                  <select
                    className="form-input"
                    value={settings.anniversaryTemplateId ?? ""}
                    onChange={e => setSettings(s => s && ({ ...s, anniversaryTemplateId: e.target.value ? Number(e.target.value) : null }))}
                    disabled={!canManage}
                  >
                    <option value="">— Select template —</option>
                    {anniversaryTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.templateName}</option>
                    ))}
                  </select>
                </div>

                {settings.anniversaryTemplateId && (
                  <div className="bg-slate-50 p-4 rounded-lg space-y-3 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Variable Mapping</p>
                    {(() => {
                      const t = templates.find(temp => temp.id === settings.anniversaryTemplateId);
                      const vars = Array.isArray((t as any)?.variables) ? (t as any).variables : [];
                      if (vars.length === 0) return <p className="text-xs text-slate-400 italic">No variables detected in this template.</p>;
                      
                      return vars.map((v: string) => (
                        <div key={v} className="grid grid-cols-2 gap-3 items-center">
                          <label className="text-xs font-medium text-slate-600">Placeholder {"{{"}{v}{"}}"}</label>
                          <select
                            className="form-input text-xs h-8"
                            value={settings.anniversaryVariables?.[v] || ""}
                            onChange={e => {
                              const newVars = { ...(settings.anniversaryVariables || {}), [v]: e.target.value };
                              setSettings(s => s && ({ ...s, anniversaryVariables: newVars }));
                            }}
                            disabled={!canManage}
                          >
                            <option value="">— Map to field —</option>
                            {MEMBER_FIELDS.map(f => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* Events */}
            <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
              <input
                type="checkbox"
                id="enableEvents"
                checked={settings.enableEvents}
                onChange={e => setSettings(s => s && ({ ...s, enableEvents: e.target.checked }))}
                disabled={!canManage}
                className="mt-0.5"
              />
              <div className="flex-1">
                <label htmlFor="enableEvents" className="font-medium text-slate-700 text-sm cursor-pointer">
                  🎉 Festival / Event Messages
                </label>
                <p className="text-xs text-slate-400">Send scheduled event messages to all active members</p>
              </div>
            </div>
          </div>
        </div>

        {canManage && (
          <button type="submit" disabled={saving} className="btn btn-primary w-full sm:w-auto">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Save size={14} /> Save Settings</>}
          </button>
        )}
      </form>
    </div>
  );
}
