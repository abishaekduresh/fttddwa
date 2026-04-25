"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api/client-fetch";
import {
  Loader2, Save, RotateCcw, ArrowLeft,
  Eye, EyeOff, Type, Image as ImgIcon, Square, Minus, Rows3,
  AlignLeft, AlignCenter, AlignRight, Bold, Trash2, Copy, QrCode,
  ChevronDown, ChevronRight, PlusCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import {
  DEFAULT_LAYOUT, PREVIEW_DATA,
  type LayoutElement, type ElemType, type Align,
} from "@/lib/id-card-layout";


// ─── Canvas constants ──────────────────────────────────────────────────────────
const CARD_W = 260;  // PDF pt
const CARD_H = 420;  // PDF pt
const SCALE  = 1.5;  // canvas px per PDF pt → 390 × 630 px canvas
const GRID   = 2;    // snap grid in pt

// ─── Helpers ──────────────────────────────────────────────────────────────────
function darkenHex(hex: string, amount = 40): string {
  try {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (n >> 16) - amount);
    const g = Math.max(0, ((n >> 8) & 0xff) - amount);
    const b = Math.max(0, (n & 0xff) - amount);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } catch { return hex; }
}

function ElemIcon({ type }: { type: ElemType }) {
  const cls = "flex-shrink-0";
  switch (type) {
    case "text":  return <Type   size={11} className={cls} />;
    case "image": return <ImgIcon size={11} className={cls} />;
    case "rect":  return <Square  size={11} className={cls} />;
    case "line":  return <Minus   size={11} className={cls} />;
    case "row":   return <Rows3   size={11} className={cls} />;
    case "qrcode": return <QrCode size={11} className={cls} />;
  }
}

// ─── Designer Page ─────────────────────────────────────────────────────────────
export default function IdCardDesignerPage() {
  const router = useRouter();

  const [loading,          setLoading]         = useState(true);
  const [saving,           setSaving]          = useState(false);
  const [elements,         setElements]        = useState<LayoutElement[]>(DEFAULT_LAYOUT);
  const [selected,         setSelected]        = useState<string | null>(null);
  const [primaryColor,     setPrimaryColor]    = useState("#1e293b");
  const [headerTextColor,  setHeaderTextColor] = useState("#ffffff");
  const [footerWaveColor,  setFooterWaveColor] = useState("#2d6a4f");
  // stored so we can deep-merge on save (preserves showXxx flags etc.)
  const [existingSettings, setExistingSettings] = useState<Record<string, unknown>>({});
  // live preview data — real association values merged over PREVIEW_DATA defaults
  const [previewData,   setPreviewData]   = useState<Record<string, string>>(PREVIEW_DATA);
  // real image URLs for canvas preview
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});

  const [showFieldPicker, setShowFieldPicker] = useState(false);

  // Use refs for drag/resize to avoid stale-closure issues in global listeners
  const dragRef    = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef  = useRef<{ id: string; sx: number; sy: number; ow: number; oh: number } | null>(null);
  const elemsRef   = useRef(elements);
  useEffect(() => { elemsRef.current = elements; }, [elements]);

  // ── Load existing settings + real association data for preview ────────────
  useEffect(() => {
    Promise.all([
      apiFetch("/api/settings/app").then(r => r.json()),
      fetch("/api/settings/association").then(r => r.json()),
    ])
      .then(([appJson, assocJson]) => {
        // ── App / idCard settings ──
        const cs = appJson.data?.idCardSettings ?? {};
        setExistingSettings(cs);
        if (cs.primaryColor)    setPrimaryColor(cs.primaryColor);
        if (cs.headerTextColor) setHeaderTextColor(cs.headerTextColor);
        if (cs.footerWaveColor) setFooterWaveColor(cs.footerWaveColor);
        if (Array.isArray(cs.layout) && cs.layout.length > 0) {
          setElements(cs.layout as LayoutElement[]);
        }

        // ── Association data → live preview ──
        const a = assocJson.data ?? {};
        const startYear = new Date().getFullYear();

        const live: Record<string, string> = {
          ...PREVIEW_DATA,
          // overwrite with real association values
          "association.name":      a.name      || PREVIEW_DATA["association.name"],
          "association.nameTamil": a.nameTamil || PREVIEW_DATA["association.nameTamil"],
          "association.regNumber": a.regNumber ? `பதிவு எண்: ${a.regNumber}` : PREVIEW_DATA["association.regNumber"],
          "association.address":   a.address   || PREVIEW_DATA["association.address"],
          "association.statePhone": [
            a.state || "",
            a.phone ? `Cell: ${a.phone}` : "",
          ].filter(Boolean).join(" | ") || PREVIEW_DATA["association.statePhone"],
          "member.address": PREVIEW_DATA["member.address"],
          // settings values
          "settings.footerTitle": cs.footerTitle || PREVIEW_DATA["settings.footerTitle"],
          "settings.cardTitle":   cs.cardTitle   || PREVIEW_DATA["settings.cardTitle"],
        };
        setPreviewData(live);

        // Real image URLs
        const imgs: Record<string, string> = {};
        if (a.logo1Url)       imgs["association.logo1Url"]       = a.logo1Url;
        if (a.logo2Url)       imgs["association.logo2Url"]       = a.logo2Url;
        if (a.sigChairmanUrl) imgs["association.sigChairmanUrl"] = a.sigChairmanUrl;
        setPreviewImages(imgs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Update preview data when settings change
  useEffect(() => {
    if (loading) return;
    const startYear = new Date().getFullYear();
    const vYears = Number(existingSettings.validityYears) || 2;
    setPreviewData(prev => ({
      ...prev,
      "member.validity": `${startYear} – ${startYear + vYears}`,
      "settings.footerTitle": (existingSettings.footerTitle as string) || PREVIEW_DATA["settings.footerTitle"],
      "settings.cardTitle":   (existingSettings.cardTitle as string)   || PREVIEW_DATA["settings.cardTitle"],
    }));
  }, [existingSettings.validityYears, existingSettings.footerTitle, existingSettings.cardTitle, loading]);

  // ── Global drag / resize listeners ────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const { id, sx, sy, ox, oy } = dragRef.current;
        const el = elemsRef.current.find(el => el.id === id);
        if (!el) return;
        const nx = Math.max(0, Math.min(CARD_W - el.w, Math.round((ox + (e.clientX - sx) / SCALE) / GRID) * GRID));
        const ny = Math.max(0, Math.min(CARD_H - el.h, Math.round((oy + (e.clientY - sy) / SCALE) / GRID) * GRID));
        setElements(prev => prev.map(el => el.id === id ? { ...el, x: nx, y: ny } : el));
      }
      if (resizeRef.current) {
        const { id, sx, sy, ow, oh } = resizeRef.current;
        const el = elemsRef.current.find(el => el.id === id);
        if (!el) return;
        const nw = Math.max(10, Math.round((ow + (e.clientX - sx) / SCALE) / GRID) * GRID);
        const nh = Math.max(2,  Math.round((oh + (e.clientY - sy) / SCALE) / GRID) * GRID);
        setElements(prev => prev.map(el => el.id === id
          ? { ...el, w: Math.min(nw, CARD_W - el.x), h: Math.min(nh, CARD_H - el.y) }
          : el
        ));
      }
    };
    const onUp = () => {
      dragRef.current   = null;
      resizeRef.current = null;
      document.body.style.cursor = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
  }, []);

  // ── Interaction handlers ───────────────────────────────────────────────────
  const onElemDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setSelected(id);
    const el = elemsRef.current.find(el => el.id === id);
    if (!el) return;
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y };
    document.body.style.cursor = "move";
  }, []);

  const onResizeDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    const el = elemsRef.current.find(el => el.id === id);
    if (!el) return;
    resizeRef.current = { id, sx: e.clientX, sy: e.clientY, ow: el.w, oh: el.h };
    document.body.style.cursor = "se-resize";
  }, []);

  const patch = useCallback((id: string, data: Partial<LayoutElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...data } : el));
  }, []);

  const removeLayer = useCallback((id: string, label: string) => {
    toast(
      (t) => (
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-700">
            Remove <strong>{label}</strong>?
          </span>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => {
                setElements(prev => prev.filter(el => el.id !== id));
                setSelected(prev => prev === id ? null : prev);
                toast.dismiss(t.id);
                toast.success(`"${label}" removed`);
              }}
              className="px-2.5 py-1 rounded text-xs font-medium bg-red-500 text-white hover:bg-red-600"
            >
              Remove
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 6000 }
    );
  }, []);

  const duplicateLayer = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const newId = `${el.type}-${Date.now()}`;
    const newEl: LayoutElement = {
      ...el,
      id: newId,
      label: `${el.label} (Copy)`,
      x: Math.min(CARD_W - el.w, el.x + 10),
      y: Math.min(CARD_H - el.h, el.y + 10),
      zIndex: elements.reduce((max, e) => Math.max(max, e.zIndex), 0) + 1,
    };
    setElements(prev => [...prev, newEl]);
    setSelected(newId);
    toast.success(`Duplicated "${el.label}"`);
  }, [elements]);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/app/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCardSettings: { ...existingSettings, primaryColor, headerTextColor, footerWaveColor, layout: elements },
        }),
      });
      const j = await res.json();
      if (j.success) {
        toast.success("Layout saved — PDF will use this design");
        setExistingSettings(prev => ({ ...prev, primaryColor, headerTextColor, footerWaveColor, layout: elements }));
      } else {
        toast.error(j.message || "Save failed");
      }
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Color resolver ────────────────────────────────────────────────────────
  const rc = useCallback((c?: string) => {
    if (!c) return "#000000";
    if (c === "headerText")  return headerTextColor;
    if (c === "primary")     return primaryColor;
    if (c === "primaryDark") return darkenHex(primaryColor);
    if (c === "footerWave")  return footerWaveColor;
    return c;
  }, [primaryColor, headerTextColor, footerWaveColor]);

  // ── Canvas element renderer ───────────────────────────────────────────────
  function renderOnCanvas(el: LayoutElement) {
    switch (el.type) {
      case "rect": {
        if (el.bgColor === "footerWave") {
          // Render convex bezier arch using SVG — matches PDF renderer geometry exactly
          const eW = el.w * SCALE;
          const eH = el.h * SCALE;
          const archEdge = eH * 0.5;
          const archPeak = eH * 0.25;
          const cpX = eW * 0.25;
          return (
            <svg width={eW} height={eH} viewBox={`0 0 ${eW} ${eH}`}
              style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}>
              <path
                d={`M 0,${archEdge} C ${cpX},${archPeak} ${eW - cpX},${archPeak} ${eW},${archEdge} L ${eW},${eH} L 0,${eH} Z`}
                fill={footerWaveColor}
              />
            </svg>
          );
        }
        const bg = el.gradient
          ? `linear-gradient(135deg, ${rc(el.bgColor)}, ${darkenHex(rc(el.bgColor) || primaryColor, 50)})`
          : rc(el.bgColor) || "#e2e8f0";
        return <div style={{ width: "100%", height: "100%", background: bg, opacity: el.opacity ?? 1 }} />;
      }

      case "line":
        return <div style={{ width: "100%", height: "100%", backgroundColor: el.color || "#e2e8f0" }} />;

      case "text": {
        const val = el.staticText ?? previewData[el.field || ""] ?? `[${el.label}]`;
        return (
          <div style={{
            width: "100%", height: "100%", overflow: "hidden",
            fontSize: Math.round((el.fontSize || 9) * SCALE * 1.2),
            fontWeight: el.fontBold ? "700" : "400",
            fontFamily: el.fontTamil ? "'NotoSansTamil', sans-serif" : "inherit",
            color: rc(el.color),
            textAlign: el.align || "left",
            lineHeight: 1.2,
            display: "flex", alignItems: "center",
          }}>
            {val}
          </div>
        );
      }

      case "row": {
        const val  = el.staticText ?? previewData[el.field || ""] ?? "—";
        const fs   = Math.round((el.fontSize || 9) * SCALE * 1.2);
        const valX = ((el.valueX ?? 110) - el.x) * SCALE;
        return (
          <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "flex-start" }}>
            <span style={{ 
              position: "absolute", left: 0, top: 0, 
              fontSize: fs, color: el.labelColor || "#64748b", 
              fontFamily: "inherit", whiteSpace: "nowrap" 
            }}>
              {el.labelText || el.label}
            </span>
            <span style={{ 
              position: "absolute", left: valX, top: 0, right: 0,
              fontSize: fs, fontWeight: "700", 
              color: rc(el.valueColor) || "#334155", 
              fontFamily: el.fontTamil ? "'NotoSansTamil', sans-serif" : "inherit",
              wordBreak: "break-word",
              lineHeight: 1.1
            }}>
              {val}
            </span>
          </div>
        );
      }

      case "image": {
        const field    = el.field || "";
        const realUrl  = previewImages[field];          // real logo/sig URL from association
        const isPhoto  = field.includes("photo");
        const isLogo   = field.includes("logo");
        const isSig    = field.includes("sig");

        if (realUrl) {
          return (
            <div style={{
              width: "100%", height: "100%", overflow: "hidden",
              borderRadius: el.shape === "circle" ? "50%" : 3,
              boxSizing: "border-box",
              border: el.borderWidth ? `${el.borderWidth * SCALE}px solid ${el.borderColor || "#000000"}` : undefined,
            }}>
              <img
                src={realUrl}
                alt={el.label}
                style={{
                  width: "100%", height: "100%",
                  objectFit: isSig ? "contain" : "cover",
                  display: "block",
                }}
              />
            </div>
          );
        }

        // Fallback placeholder when no real image
        const emoji = isLogo ? "🏛" : isPhoto ? "👤" : isSig ? "✍" : "🖼";
        return (
          <div style={{
            width: "100%", height: "100%",
            background: isLogo ? "rgba(255,255,255,0.18)" : isPhoto ? "#d1d5db" : "rgba(100,116,139,0.08)",
            borderRadius: el.shape === "circle" ? "50%" : 3,
            boxSizing: "border-box",
            border: el.borderWidth 
              ? `${el.borderWidth * SCALE}px solid ${el.borderColor || "#000000"}` 
              : "1.5px dashed rgba(100,116,139,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: Math.min(el.w, el.h) * SCALE * 0.38,
          }}>
            {emoji}
          </div>
        );
      }

      case "qrcode": {
        return (
          <div className="w-full h-full bg-white flex flex-col items-center justify-center border border-slate-200">
            <QrCode size={Math.min(el.w, el.h) * SCALE * 0.7} className="text-slate-800" />
            <span className="text-[7px] text-slate-400 mt-0.5 uppercase font-bold">QR Code</span>
          </div>
        );
      }

      default: return null;
    }
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const selEl = elements.find(e => e.id === selected) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      <Toaster position="top-center" toastOptions={{ style: { maxWidth: 420 } }} />

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0 shadow-sm">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={15} /> Settings
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <h1 className="text-sm font-semibold text-slate-800 flex-1">ID Card Designer</h1>

        {/* Card colors — quick access in top bar */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <label className="flex items-center gap-1.5">
            Header
            <input type="color" value={primaryColor}
              onChange={e => setPrimaryColor(e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-slate-200 p-0.5" />
          </label>
          <label className="flex items-center gap-1.5">
            Text
            <input type="color" value={headerTextColor}
              onChange={e => setHeaderTextColor(e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-slate-200 p-0.5" />
          </label>
          <label className="flex items-center gap-1.5">
            Wave
            <input type="color" value={footerWaveColor}
              onChange={e => setFooterWaveColor(e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-slate-200 p-0.5" />
          </label>
        </div>

        <button
          onClick={() => { setElements(DEFAULT_LAYOUT); toast.success("Reset to default layout"); }}
          className="btn btn-outline text-xs flex items-center gap-1.5 py-1.5"
        >
          <RotateCcw size={13} /> Reset
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary text-xs flex items-center gap-1.5 py-1.5"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save Layout
        </button>
      </div>

      {/* ── Main workspace ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Layers panel */}
        <div className="w-52 bg-white border-r border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
          {/* Panel header */}
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Layers</p>
          </div>

          {/* Layer list */}
          <div className="flex-1 overflow-y-auto">
            {[...elements].reverse().map(el => (
              <div
                key={el.id}
                onClick={() => setSelected(el.id)}
                className={`group flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-slate-50 select-none text-xs
                  ${selected === el.id ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-slate-50 text-slate-600"}`}
              >
                <button
                  onClick={e => { e.stopPropagation(); patch(el.id, { visible: !el.visible }); }}
                  className={`flex-shrink-0 transition-opacity ${el.visible ? "text-slate-400 hover:text-slate-700" : "text-slate-200 hover:text-slate-400"}`}
                  title={el.visible ? "Hide" : "Show"}
                >
                  {el.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                </button>
                <span className={selected === el.id ? "text-blue-400" : "text-slate-300"}>
                  <ElemIcon type={el.type} />
                </span>
                <span className={`truncate flex-1 ${!el.visible ? "opacity-40 line-through" : ""}`}>
                  {el.label}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); duplicateLayer(el.id); }}
                  className="flex-shrink-0 text-slate-200 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100 mr-1"
                  title="Duplicate"
                >
                  <Copy size={11} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); removeLayer(el.id, el.label); }}
                  className="flex-shrink-0 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove layer"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Add layer buttons */}
          <div className="border-t border-slate-100 bg-slate-50 p-2">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Add Layer</p>
            <div className="grid grid-cols-2 gap-1">
              {([
                { type: "text"  as ElemType, icon: <Type size={11} />,    label: "Text",  defaults: { staticText: "Custom Text", x: 20, y: 210, w: 220, h: 18, fontSize: 10, fontBold: false, color: "#334155", align: "center" as Align } },
                { type: "rect"  as ElemType, icon: <Square size={11} />,  label: "Shape", defaults: { x: 20, y: 210, w: 220, h: 30, bgColor: "#e2e8f0", gradient: false } },
                { type: "line"  as ElemType, icon: <Minus size={11} />,   label: "Line",  defaults: { x: 20, y: 220, w: 220, h: 1, color: "#e2e8f0" } },
                { type: "row"   as ElemType, icon: <Rows3 size={11} />,   label: "Row",   defaults: { labelText: "Label", staticText: "Value", x: 28, y: 210, w: 204, h: 16, fontSize: 9, labelColor: "#64748b", valueColor: "#334155", valueX: 110 } },
                { type: "qrcode" as ElemType, icon: <QrCode size={11} />, label: "QR Code",defaults: { field: "member.uuid", x: 14, y: 290, w: 60, h: 60 } },
              ] as { type: ElemType; icon: React.ReactNode; label: string; defaults: Partial<LayoutElement> }[]).map(({ type, icon, label, defaults }) => (
                <button
                  key={type}
                  onClick={() => {
                    const id = `${type}-${Date.now()}`;
                    const newEl: LayoutElement = {
                      id,
                      label: `New ${label}`,
                      type,
                      visible: true,
                      zIndex: 5,
                      x: 20, y: 210, w: 220, h: 18,
                      ...defaults,
                    };
                    setElements(prev => [...prev, newEl]);
                    setSelected(id);
                    toast.success(`${label} layer added`);
                  }}
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] text-slate-600 bg-white hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-300 transition-colors"
                >
                  {icon} {label}
                </button>
              ))}
            </div>

            {/* ── Data Field Picker ── */}
            {(() => {
              const currentIds = new Set(elements.map(e => e.id));
              const available = DEFAULT_LAYOUT.filter(d => !currentIds.has(d.id));
              return (
                <div className="border-t border-slate-100 mt-1">
                  <button
                    onClick={() => setShowFieldPicker(v => !v)}
                    className="w-full flex items-center justify-between px-1 py-1 text-[9px] font-semibold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <PlusCircle size={11} /> Add Field ({available.length})
                    </span>
                    {showFieldPicker ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  </button>
                  {showFieldPicker && (
                    <div className="max-h-44 overflow-y-auto border border-slate-100 rounded bg-white">
                      {available.length === 0 ? (
                        <p className="text-[10px] text-slate-400 text-center py-3">All fields are in the layout</p>
                      ) : (
                        available.map(d => (
                          <button
                            key={d.id}
                            onClick={() => {
                              setElements(prev => [...prev, { ...d }]);
                              setSelected(d.id);
                              toast.success(`"${d.label}" added`);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                          >
                            <span className="text-slate-300 flex-shrink-0"><ElemIcon type={d.type} /></span>
                            <span className="truncate">{d.label}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Center: Canvas */}
        <div
          className="flex-1 overflow-auto flex items-start justify-center p-10"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative bg-white shadow-2xl flex-shrink-0"
            style={{
              width: CARD_W * SCALE,
              height: CARD_H * SCALE,
              borderRadius: 6,
              overflow: "hidden",
              userSelect: "none",
            }}
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const groupY: Record<string, number> = {};
              const groupLastY: Record<string, number> = {};
              
              return [...elements].sort((a, b) => a.zIndex - b.zIndex).map(el => {
                const isSelected = selected === el.id;
                
                let currentY = el.y;
                let hiddenInDesigner = !el.visible;

                // Check if the field is empty in the preview data
                const value = el.staticText ?? previewData[el.field || ""] ?? "";
                if (!value && (el.type === "text" || el.type === "row")) {
                  hiddenInDesigner = true;
                }

                if (el.stackGroup) {
                  if (groupY[el.stackGroup] !== undefined) {
                    const prevOrigY = groupLastY[el.stackGroup] || 0;
                    const gap = Math.max(0, el.y - prevOrigY);
                    currentY = groupY[el.stackGroup] + gap;
                  }
                }

                const rendered = (
                  <div
                    key={el.id}
                    className={`absolute ${hiddenInDesigner ? "opacity-20" : ""}`}
                    style={{
                      left:    el.x * SCALE,
                      top:     currentY * SCALE,
                      width:   el.w * SCALE,
                      height:  Math.max(el.type === "line" ? 1 : 6, el.h * SCALE),
                      zIndex:  el.zIndex * 10 + (isSelected ? 500 : 0),
                      cursor:  "move",
                      boxSizing: "border-box",
                      outline: isSelected ? "2px solid #3b82f6" : undefined,
                      outlineOffset: isSelected ? "1px" : undefined,
                      pointerEvents: isSelected || !hiddenInDesigner ? "auto" : "none",
                    }}
                    onMouseDown={e => onElemDown(e, el.id)}
                  >
                    {renderOnCanvas(el)}

                    {/* Resize handle */}
                    {isSelected && el.type !== "line" && (
                      <div
                        className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 z-50"
                        style={{ cursor: "se-resize", borderRadius: "2px 0 0 0" }}
                        onMouseDown={e => onResizeDown(e, el.id)}
                      />
                    )}
                  </div>
                );

                // Update stack tracking
                if (el.stackGroup && !hiddenInDesigner) {
                  groupY[el.stackGroup] = currentY + el.h;
                  groupLastY[el.stackGroup] = el.y + el.h;
                }

                return rendered;
              });
            })()}
          </div>
        </div>

        {/* Right: Properties panel */}
        <div className="w-72 bg-white border-l border-slate-200 flex flex-col overflow-hidden flex-shrink-0">
          {selEl ? (
            <>
              {/* Panel header */}
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <span className="text-slate-400"><ElemIcon type={selEl.type} /></span>
                <p className="text-xs font-semibold text-slate-700 truncate flex-1">{selEl.label}</p>
                <span className="text-[9px] text-slate-400 uppercase bg-slate-200 px-1.5 py-0.5 rounded">
                  {selEl.type}
                </span>
                <button
                  onClick={() => duplicateLayer(selEl.id)}
                  className="text-slate-300 hover:text-blue-500 transition-colors"
                  title="Duplicate layer"
                >
                  <Copy size={13} />
                </button>
                <button
                  onClick={() => removeLayer(selEl.id, selEl.label)}
                  className="text-slate-300 hover:text-red-500 transition-colors ml-1"
                  title="Remove layer"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">

                {/* ── Position & Size ── */}
                <section>
                  <p className="prop-section-title">Position & Size</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["x", "y", "w", "h"] as const).map(k => (
                      <label key={k} className="block">
                        <span className="prop-label">{k.toUpperCase()} (pt)</span>
                        <input type="number" value={selEl[k]}
                          onChange={e => patch(selEl.id, { [k]: Number(e.target.value) })}
                          className="form-input py-1 px-2 text-xs font-mono w-full mt-0.5" />
                      </label>
                    ))}
                  </div>
                </section>

                {/* ── Visibility & Z-Index ── */}
                <section>
                  <p className="prop-section-title">Layer</p>
                  <div className="flex gap-3 items-end">
                    <label className="flex-1 block">
                      <span className="prop-label">Z-Index</span>
                      <input type="number" value={selEl.zIndex}
                        onChange={e => patch(selEl.id, { zIndex: Number(e.target.value) })}
                        className="form-input py-1 px-2 text-xs font-mono w-full mt-0.5" />
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-1.5 cursor-pointer">
                      <input type="checkbox" checked={selEl.visible}
                        onChange={e => patch(selEl.id, { visible: e.target.checked })}
                        className="rounded border-slate-300" />
                      Visible
                    </label>
                  </div>
                </section>

                {/* ── Text / Data style ── */}
                {(selEl.type === "text" || selEl.type === "row" || selEl.type === "qrcode") && (
                  <section>
                    <p className="prop-section-title">Text</p>
                    <div className="space-y-2.5">

                      <label className="block">
                        <span className="prop-label">Data Field (Binding)</span>
                        <select
                          value={selEl.field || ""}
                          onChange={e => patch(selEl.id, { field: e.target.value || undefined })}
                          className="form-input py-1 px-2 text-xs w-full mt-0.5"
                        >
                          <option value="">(None / Static Text)</option>
                          <optgroup label="Member Data">
                            <option value="member.name">Name (English)</option>
                            <option value="member.nameTamil">Name (Tamil)</option>
                            <option value="member.position">Position</option>
                            <option value="member.businessName">Business Name (English)</option>
                            <option value="member.businessNameTamil">Business Name (Tamil)</option>
                            <option value="member.membershipId">ID Number</option>
                            <option value="member.phone">Phone Number</option>
                            <option value="member.address">Full Address</option>
                            <option value="member.village">Village</option>
                            <option value="member.taluk">Taluk</option>
                            <option value="member.district">District</option>
                            <option value="member.validity">Validity (2026 - 2028)</option>
                            <option value="member.email">Email</option>
                            <option value="member.uuid">Unique ID (UUID)</option>
                          </optgroup>
                          <optgroup label="Association Data">
                            <option value="association.name">Assoc Name (English)</option>
                            <option value="association.nameTamil">Assoc Name (Tamil)</option>
                            <option value="association.regNumber">Registration Number</option>
                            <option value="association.address">Assoc Address</option>
                            <option value="association.statePhone">Assoc State/Phone</option>
                            <option value="association.logo1Url">Logo 1 URL</option>
                            <option value="association.logo2Url">Logo 2 URL</option>
                            <option value="association.sigChairmanUrl">Signature URL</option>
                          </optgroup>
                          <optgroup label="Settings">
                            <option value="settings.footerTitle">Footer Title</option>
                            <option value="settings.cardTitle">Card Title</option>
                          </optgroup>
                        </select>
                      </label>

                      {/* Custom / static text content */}
                      <label className="block">
                        <span className="prop-label">
                          {selEl.field ? "Static Override (optional)" : "Text Content"}
                        </span>
                        <textarea
                          rows={2}
                          value={selEl.staticText ?? ""}
                          onChange={e => patch(selEl.id, { staticText: e.target.value || undefined })}
                          placeholder={selEl.field ? "Leave empty to use data field" : "Enter text…"}
                          className="form-input py-1 px-2 text-xs w-full mt-0.5 resize-none"
                        />
                      </label>
                      <div className="flex gap-2 items-end">
                        <label className="flex-1 block">
                          <span className="prop-label">Font Size (pt)</span>
                          <input type="number" step="0.5" value={selEl.fontSize || 9}
                            onChange={e => patch(selEl.id, { fontSize: Number(e.target.value) })}
                            className="form-input py-1 px-2 text-xs w-full mt-0.5" />
                        </label>
                        <label className="flex items-center gap-1 text-xs text-slate-600 pb-1.5 cursor-pointer" title="Bold">
                          <input type="checkbox" checked={!!selEl.fontBold}
                            onChange={e => patch(selEl.id, { fontBold: e.target.checked })}
                            className="rounded border-slate-300" />
                          <Bold size={12} />
                        </label>
                        <label className="flex items-center gap-1 text-xs text-slate-600 pb-1.5 cursor-pointer" title="Tamil font">
                          <input type="checkbox" checked={!!selEl.fontTamil}
                            onChange={e => patch(selEl.id, { fontTamil: e.target.checked })}
                            className="rounded border-slate-300" />
                          <span className="text-sm">த</span>
                        </label>
                      </div>

                      <label className="block">
                        <span className="prop-label">Color</span>
                        <div className="flex gap-1 mt-0.5">
                          <input type="color"
                            value={selEl.color?.startsWith("#") ? selEl.color : "#000000"}
                            onChange={e => patch(selEl.id, { color: e.target.value })}
                            className="h-7 w-8 cursor-pointer rounded border border-slate-200 p-0.5 flex-shrink-0" />
                          <input type="text" value={selEl.color || ""}
                            onChange={e => patch(selEl.id, { color: e.target.value })}
                            placeholder="hex / headerText / primary"
                            className="form-input py-1 px-2 text-xs flex-1 font-mono" />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">Keywords: headerText · primary</p>
                      </label>

                      {selEl.type === "text" && (
                        <label className="block">
                          <span className="prop-label">Align</span>
                          <div className="flex gap-1 mt-0.5">
                            {(["left", "center", "right"] as Align[]).map(a => (
                              <button key={a}
                                onClick={() => patch(selEl.id, { align: a })}
                                className={`flex-1 py-1.5 rounded border text-xs flex items-center justify-center transition-colors
                                  ${selEl.align === a ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                              >
                                {a === "left"   ? <AlignLeft   size={12} /> :
                                 a === "center" ? <AlignCenter size={12} /> :
                                                  <AlignRight  size={12} />}
                              </button>
                            ))}
                          </div>
                        </label>
                      )}
                    </div>
                  </section>
                )}

                {/* ── Row settings ── */}
                {selEl.type === "row" && (
                  <section>
                    <p className="prop-section-title">Row</p>
                    <div className="space-y-2.5">
                      <label className="block">
                        <span className="prop-label">Label Text</span>
                        <input type="text" value={selEl.labelText || ""}
                          onChange={e => patch(selEl.id, { labelText: e.target.value })}
                          className="form-input py-1 px-2 text-xs w-full mt-0.5" />
                      </label>
                      <label className="block">
                        <span className="prop-label">Value Column X (pt)</span>
                        <input type="number" value={selEl.valueX ?? 110}
                          onChange={e => patch(selEl.id, { valueX: Number(e.target.value) })}
                          className="form-input py-1 px-2 text-xs w-full mt-0.5 font-mono" />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="prop-label">Label Color</span>
                          <input type="color" value={selEl.labelColor || "#64748b"}
                            onChange={e => patch(selEl.id, { labelColor: e.target.value })}
                            className="h-7 w-full cursor-pointer rounded border border-slate-200 p-0.5 mt-0.5" />
                        </label>
                        <label className="block">
                          <span className="prop-label">Value Color</span>
                          <div className="flex gap-1 mt-0.5">
                            <input type="color"
                              value={selEl.valueColor?.startsWith("#") ? selEl.valueColor : "#334155"}
                              onChange={e => patch(selEl.id, { valueColor: e.target.value })}
                              className="h-7 w-8 cursor-pointer rounded border border-slate-200 p-0.5" />
                            <input type="text" value={selEl.valueColor || ""}
                              onChange={e => patch(selEl.id, { valueColor: e.target.value })}
                              placeholder="hex / primary"
                              className="form-input py-1 px-2 text-xs flex-1 font-mono" />
                          </div>
                        </label>
                      </div>
                    </div>
                  </section>
                )}

                {/* ── Rect settings ── */}
                {selEl.type === "rect" && (
                  <section>
                    <p className="prop-section-title">Background</p>
                    <div className="space-y-2.5">
                      <label className="block">
                        <span className="prop-label">Color</span>
                        <div className="flex gap-1 mt-0.5">
                          <input type="color"
                            value={selEl.bgColor?.startsWith("#") ? selEl.bgColor : "#1e293b"}
                            onChange={e => patch(selEl.id, { bgColor: e.target.value })}
                            className="h-7 w-8 cursor-pointer rounded border border-slate-200 p-0.5 flex-shrink-0" />
                          <input type="text" value={selEl.bgColor || ""}
                            onChange={e => patch(selEl.id, { bgColor: e.target.value })}
                            placeholder="hex / primary / primaryDark"
                            className="form-input py-1 px-2 text-xs flex-1 font-mono" />
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">Keywords: primary · primaryDark</p>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={!!selEl.gradient}
                          onChange={e => patch(selEl.id, { gradient: e.target.checked })}
                          className="rounded border-slate-300" />
                        Gradient effect
                      </label>
                    </div>
                  </section>
                )}

                {/* ── Image settings ── */}
                {selEl.type === "image" && (
                  <section>
                    <p className="prop-section-title">Image</p>
                    <label className="block">
                      <span className="prop-label">Shape</span>
                      <div className="flex gap-1 mt-0.5">
                        {(["rect", "circle"] as const).map(s => (
                          <button key={s}
                            onClick={() => patch(selEl.id, { shape: s })}
                            className={`flex-1 py-1.5 rounded text-xs border capitalize transition-colors
                              ${selEl.shape === s ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </label>
                    <div className="space-y-2.5 mt-2.5">
                      <label className="block">
                        <span className="prop-label">Border Width (pt)</span>
                        <input type="number" step="0.5" value={selEl.borderWidth || 0}
                          onChange={e => patch(selEl.id, { borderWidth: Number(e.target.value) })}
                          className="form-input py-1 px-2 text-xs w-full mt-0.5" />
                      </label>
                      <label className="block">
                        <span className="prop-label">Border Color</span>
                        <input type="color" value={selEl.borderColor || "#000000"}
                          onChange={e => patch(selEl.id, { borderColor: e.target.value })}
                          className="h-7 w-full cursor-pointer rounded border border-slate-200 p-0.5 mt-0.5" />
                      </label>
                    </div>
                  </section>
                )}

                {/* ── Line settings ── */}
                {selEl.type === "line" && (
                  <section>
                    <p className="prop-section-title">Line</p>
                    <label className="block">
                      <span className="prop-label">Color</span>
                      <div className="flex gap-1 mt-0.5">
                        <input type="color" value={selEl.color || "#e2e8f0"}
                          onChange={e => patch(selEl.id, { color: e.target.value })}
                          className="h-7 w-8 cursor-pointer rounded border border-slate-200 p-0.5" />
                        <input type="text" value={selEl.color || "#e2e8f0"}
                          onChange={e => patch(selEl.id, { color: e.target.value })}
                          className="form-input py-1 px-2 text-xs flex-1 font-mono" />
                      </div>
                    </label>
                  </section>
                )}

              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <RotateCcw size={14} />
                  </div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Global ID Settings</p>
                </div>
                
                <div className="space-y-5">
                  <label className="block">
                    <span className="prop-label">Validity Period (Years)</span>
                    <div className="flex items-center gap-3 mt-1.5">
                      <input 
                        type="number" 
                        min="1"
                        max="20"
                        value={Number(existingSettings.validityYears ?? 2)}
                        onChange={e => setExistingSettings(prev => ({ ...prev, validityYears: Number(e.target.value) }))}
                        className="form-input py-1.5 px-3 text-sm w-24 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 transition-all font-mono" 
                      />
                      <span className="text-xs text-slate-400">years from join date</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                      Determines the "Valid Till" year on the member's card. 
                      Example: Joined 2024 + 2 years = 2026.
                    </p>
                  </label>
                </div>
              </section>

              <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                <Rows3 size={32} className="text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-400">No element selected</p>
                <p className="text-[11px] text-slate-300 mt-1 max-w-[180px] mx-auto">
                  Click any layer on the canvas to edit its specific colors, fonts and positions.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @font-face {
          font-family: 'NotoSansTamil';
          src: url('/fonts/NotoSansTamil.ttf') format('truetype');
          font-weight: 100 900;
          font-display: swap;
        }
        .prop-section-title { font-size: 10px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .prop-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
      `}</style>
    </div>
  );
}
