"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useEffect, useState, useCallback } from "react";
import { Send, Search, Loader2, User } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";

interface Member {
  id: number;
  membershipId: string;
  name: string;
  phone: string;
  nameTamil?: string;
  businessName?: string;
  businessNameTamil?: string;
  district?: string;
  taluk?: string;
  village?: string;
}

interface Vendor {
  id: number;
  name: string;
  status: string;
}

interface Template {
  id: number;
  vendorId: number;
  templateName: string;
  category: string;
  body: string | null;
  variables?: string[] | null;
}

export default function SendMessagePage() {
  const { hasPermission } = useAuthStore();
  const router = useRouter();

  const canSend = hasPermission("whatsapp:send");

  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchingMembers, setSearchingMembers] = useState(false);


  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | "">("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | "">("");
  const [variables, setVariables] = useState<Record<string, string>>({});

  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!canSend) {
      toast.error("You don't have permission to send messages");
      router.push("/whatsapp");
    }
  }, [canSend, router]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [tRes, vRes] = await Promise.all([
          fetch("/api/whatsapp/templates"),
          fetch("/api/whatsapp/vendors"),
        ]);
        const [tJson, vJson] = await Promise.all([tRes.json(), vRes.json()]);
        if (tJson.success) setTemplates(tJson.data);
        if (vJson.success) {
          const activeVendors = vJson.data.filter((v: Vendor) => v.status === "ACTIVE");
          setVendors(activeVendors);
        }
      } catch { /* silent */ }
    };
    fetchInitialData();
  }, []);

  const searchMembers = useCallback(async (q: string) => {
    if (q.length < 2) { setMemberResults([]); return; }
    setSearchingMembers(true);
    try {
      const res = await apiFetch(`/api/members?search=${encodeURIComponent(q)}&pageSize=8`);
      const json = await res.json();
      if (json.success) setMemberResults(json.data);
    } catch { /* silent */ }
    finally { setSearchingMembers(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchMembers(memberSearch), 300);
    return () => clearTimeout(t);
  }, [memberSearch, searchMembers]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const templateVarNames: string[] = selectedTemplate?.variables
    ? (Array.isArray(selectedTemplate.variables) ? selectedTemplate.variables as string[] : [])
    : [];

  const handleVendorChange = (id: number | "") => {
    setSelectedVendorId(id);
    setSelectedTemplateId(""); // Reset template when vendor changes
    setVariables({});
  };

  const handleTemplateChange = (id: number | "") => {
    setSelectedTemplateId(id);
    setVariables({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) { toast.error("Select a member"); return; }
    if (!selectedTemplateId) { toast.error("Select a template"); return; }

    const variablesArray = templateVarNames.map(name => variables[name] || "");
    const payload = {
      memberId: selectedMember.id,
      templateId: selectedTemplateId,
      vendorId: selectedVendorId || undefined,
      variables: variablesArray.length > 0 ? variablesArray : undefined,
    };

    setSending(true);
    try {
      const res = await apiFetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        const { status, errorMessage } = json.data ?? {};
        if (status === "sent" || status === "delivered") {
          toast.success("Message sent successfully!");
          router.push("/whatsapp");
        } else if (status === "failed") {
          toast.error(errorMessage || "Message failed to send", { duration: 8000 });
          // stay on page so user can retry
        } else {
          toast.success("Message queued for delivery");
          router.push("/whatsapp");
        }
      } else {
        toast.error(json.message || "Failed to send message", { duration: 8000 });
      }
    } catch (err) {
      console.error("[WA Send] Network Error:", err);
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  if (!canSend) return null;

  return (
    <div className="space-y-4 max-w-xl">
      {/* Header */}
      <div className="space-y-1">
        <Breadcrumb items={[{ label: "WhatsApp", href: "/whatsapp" }, { label: "Send Message" }]} />
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Send size={22} className="text-green-600" />
          Send WhatsApp Message
        </h1>
        <p className="text-slate-500 text-sm">Send a manual message to a member using an approved template</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Member Picker */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">1. Select Member</h2>

          {selectedMember ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{selectedMember.name}</p>
                <p className="text-xs text-slate-500 font-mono">{selectedMember.membershipId} · {selectedMember.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedMember(null); setMemberSearch(""); }}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="form-input pl-9"
                  placeholder="Search by name or membership ID..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  autoFocus
                />
                {searchingMembers && (
                  <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                )}
              </div>
              {memberResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md mt-1 z-10 overflow-hidden">
                  {memberResults.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => { setSelectedMember(m); setMemberSearch(""); setMemberResults([]); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b last:border-b-0 border-slate-100"
                    >
                      <p className="text-sm font-medium text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-400 font-mono">{m.membershipId} · {m.phone}</p>
                    </button>
                  ))}
                </div>
              )}
              {memberSearch.length >= 2 && !searchingMembers && memberResults.length === 0 && (
                <p className="text-xs text-slate-400 mt-2">No members found</p>
              )}
            </div>
          )}
        </div>

        {/* Vendor Picker */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">2. Select Vendor</h2>
          <select
            className="form-input"
            value={selectedVendorId}
            onChange={e => handleVendorChange(e.target.value ? Number(e.target.value) : "")}
            required
          >
            <option value="">— Choose a vendor —</option>
            {vendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Template Picker */}
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">3. Select Template</h2>
          <select
            className="form-input"
            value={selectedTemplateId}
            onChange={e => handleTemplateChange(e.target.value ? Number(e.target.value) : "")}
            required
            disabled={!selectedVendorId}
          >
            <option value="">{selectedVendorId ? "— Choose a template —" : "Select a vendor first"}</option>
            {templates
              .filter(t => !selectedVendorId || t.vendorId === selectedVendorId)
              .map(t => (
                <option key={t.id} value={t.id}>{t.templateName} ({t.category})</option>
              ))
            }
          </select>

          {/* Live Preview Box */}
          {selectedTemplate && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Message Preview</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative shadow-inner">
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedTemplate.body ? (
                    selectedTemplate.body.split(/(\{\{\d+\}\})/).map((part, i) => {
                      const match = part.match(/\{\{(\d+)\}\}/);
                      if (match) {
                        const varName = match[1];
                        const val = variables[varName];
                        return val ? (
                          <span key={i} className="font-bold text-slate-900 bg-yellow-100 px-1 rounded">{val}</span>
                        ) : (
                          <span key={i} className="font-bold text-red-500 bg-red-50 px-1 rounded border border-red-100">{part}</span>
                        );
                      }
                      return part;
                    })
                  ) : (
                    <span className="italic text-slate-400 font-mono">No template body available...</span>
                  )}
                </div>
                {/* Visual indicator of a WhatsApp bubble */}
                <div className="absolute -left-2 top-4 w-4 h-4 bg-slate-50 border-l border-t border-slate-200 rotate-[-45deg]" />
              </div>
            </div>
          )}
        </div>

        {/* Variables */}
        {templateVarNames.length > 0 && (
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-slate-900 text-sm">4. Template Variables</h2>
            <p className="text-xs text-slate-400">Fill placeholders with member data or custom text.</p>
            <div className="space-y-4">
              {templateVarNames.map(varName => (
                <div key={varName} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="form-label mb-0">{`{{${varName}}}`}</label>
                    
                    {/* Quick Fill Button */}
                    <div className="relative group">
                      <button
                        type="button"
                        disabled={!selectedMember}
                        className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-green-700 disabled:opacity-40 transition-colors"
                      >
                        <User size={12} strokeWidth={3} />
                        QUICK FILL
                      </button>
                      
                      {/* Hover Menu */}
                      {selectedMember && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden divide-y divide-slate-50">
                          {[
                            { label: "Full Name", value: selectedMember.name },
                            { label: "Name (Tamil)", value: selectedMember.nameTamil },
                            { label: "Membership ID", value: selectedMember.membershipId },
                            { label: "Phone Number", value: selectedMember.phone },
                            { label: "Business Name", value: selectedMember.businessName },
                            { label: "Business (Tamil)", value: selectedMember.businessNameTamil },
                            { label: "District", value: selectedMember.district },
                            { label: "Taluk", value: selectedMember.taluk },
                            { label: "Village", value: selectedMember.village },
                          ].filter(opt => opt.value).map(opt => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setVariables(v => ({ ...v, [varName]: String(opt.value) }))}
                              className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors flex justify-between gap-2"
                            >
                              <span>{opt.label}</span>
                              <span className="text-[9px] text-slate-300 font-mono text-right truncate max-w-[80px]">{opt.value}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <input
                    className="form-input"
                    value={variables[varName] || ""}
                    onChange={e => setVariables(v => ({ ...v, [varName]: e.target.value }))}
                    placeholder={`Value for ${varName}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button type="button" onClick={() => router.push("/whatsapp")} className="btn btn-outline flex-1">
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending || !selectedMember || !selectedTemplateId}
            className="btn btn-primary flex-1"
          >
            {sending
              ? <><Loader2 size={14} className="animate-spin" /> Sending...</>
              : <><Send size={14} /> Send Message</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
