"use client";

import { apiFetch } from "@/lib/api/client-fetch";

import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Upload, Building2, Palette, Phone, Wand2, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { associationSettingsSchema, type AssociationSettingsInput } from "@/lib/validation/association.schema";
import { translateToTamil } from "@/lib/utils/translation";

interface AssociationSettingsFormProps {
  initialData?: AssociationSettingsInput;
}

export function AssociationSettingsForm({ initialData }: AssociationSettingsFormProps) {
  const [tab, setTab] = useState<"basic" | "branding" | "contact" | "signatures">("basic");
  const [loading, setLoading] = useState(false);
  const [uploadingLogo1, setUploadingLogo1] = useState(false);
  const [uploadingLogo2, setUploadingLogo2] = useState(false);
  const [translatingField, setTranslatingField] = useState<string | null>(null);
  const [logo1Url, setLogo1Url] = useState(initialData?.logo1Url || "");
  const [logo2Url, setLogo2Url] = useState(initialData?.logo2Url || "");
  const [sigUrls, setSigUrls] = useState({
    sigChairmanUrl: initialData?.sigChairmanUrl || "",
    sigPresidentUrl: initialData?.sigPresidentUrl || "",
    sigVicePresidentUrl: initialData?.sigVicePresidentUrl || "",
    sigSecretaryUrl: initialData?.sigSecretaryUrl || "",
    sigJointSecretaryUrl: initialData?.sigJointSecretaryUrl || "",
    sigTreasurerUrl: initialData?.sigTreasurerUrl || "",
  });
  const [uploadingSigs, setUploadingSigs] = useState<Record<string, boolean>>({});
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<AssociationSettingsInput>({
    resolver: zodResolver(associationSettingsSchema),
    defaultValues: initialData || {},
  });

  const watchedValues = watch();

  const handleTranslate = async (sourceField: keyof AssociationSettingsInput, targetField: keyof AssociationSettingsInput) => {
    const text = watchedValues[sourceField];
    if (!text) {
      toast.error(`Please enter ${sourceField} first`);
      return;
    }

    setTranslatingField(targetField);
    try {
      const tamilText = await translateToTamil(text as string);
      if (tamilText) {
        setValue(targetField as any, tamilText, { shouldDirty: true });
        toast.success("Translated to Tamil");
      } else {
        toast.error("Translation failed");
      }
    } catch {
      toast.error("Translation error");
    } finally {
      setTranslatingField(null);
    }
  };

  useEffect(() => {
    if (initialData) {
      reset(initialData);
      setLogo1Url(initialData.logo1Url || "");
      setLogo2Url(initialData.logo2Url || "");
      setSigUrls({
        sigChairmanUrl: initialData.sigChairmanUrl || "",
        sigPresidentUrl: initialData.sigPresidentUrl || "",
        sigVicePresidentUrl: initialData.sigVicePresidentUrl || "",
        sigSecretaryUrl: initialData.sigSecretaryUrl || "",
        sigJointSecretaryUrl: initialData.sigJointSecretaryUrl || "",
        sigTreasurerUrl: initialData.sigTreasurerUrl || "",
      });
    }
  }, [initialData, reset]);

  const handleLogoUpload = async (file: File, index: 1 | 2) => {
    const setUploading = index === 1 ? setUploadingLogo1 : setUploadingLogo2;
    const setUrl = index === 1 ? setLogo1Url : setLogo2Url;

    if (file.size > 1024 * 1024) {
      toast.error("Logo must be less than 1MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);

    try {
      const res = await apiFetch("/api/upload?type=branding", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setUrl(json.data.url);
        setValue(`logo${index}Url` as any, json.data.url, { shouldDirty: true });
        toast.success(`Logo ${index} uploaded`);
      } else {
        toast.error(json.message || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSignatureUpload = async (file: File, field: keyof AssociationSettingsInput) => {
    if (file.size > 512 * 1024) {
      toast.error("Signature must be less than 500KB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploadingSigs(prev => ({ ...prev, [field]: true }));

    try {
      const res = await apiFetch("/api/upload?type=signatures", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setSigUrls(prev => ({ ...prev, [field]: json.data.url }));
        setValue(field as any, json.data.url, { shouldDirty: true });
        toast.success("Signature uploaded");
      } else {
        toast.error(json.message || "Upload failed");
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingSigs(prev => ({ ...prev, [field]: false }));
    }
  };

  const onValidationError = (errs: FieldErrors<AssociationSettingsInput>) => {
    // Required fields live in the "basic" tab — switch there and tell the user
    const basicFields = ["name", "shortName"] as const;
    const hasBasicError = basicFields.some((f) => f in errs);
    if (hasBasicError) {
      setTab("basic");
      toast.error("Please fill in the required fields: Association Name and Short Name.");
      return;
    }
    // Email is in the "contact" tab
    if ("email" in errs) {
      setTab("contact");
      toast.error("Please enter a valid email address.");
      return;
    }
    toast.error("Please fix the validation errors before saving.");
  };

  const onSubmit = async (data: AssociationSettingsInput) => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/settings/association", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Settings updated successfully");
        reset(data);
        // Refresh page to apply branding changes globally
        window.location.reload();
      } else {
        toast.error(json.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        {[
          { key: "basic", label: "Basic Details", icon: Building2 },
          { key: "branding", label: "Branding", icon: Palette },
          { key: "contact", label: "Contact Info", icon: Phone },
          { key: "signatures", label: "Signatures", icon: Save },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit, onValidationError)} className="space-y-6">
        {tab === "basic" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Association Name (English) *</label>
                <button 
                  type="button" 
                  onClick={() => handleTranslate("name", "nameTamil")}
                  className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                >
                  {translatingField === "nameTamil" ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                  Auto-generate Tamil
                </button>
              </div>
              <input type="text" className={`form-input ${errors.name ? "form-input-error" : ""}`} {...register("name")} placeholder="Full Name in English" />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Association Name (Tamil)</label>
                <a href="https://www.google.com/intl/en/inputtools/try/" target="_blank" className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-600">
                  <ExternalLink size={10} /> Google Input Tools
                </a>
              </div>
              <input type="text" className="form-input tamil" dir="auto" {...register("nameTamil")} placeholder="சங்கத்தின் பெயர்" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Short Name (English) *</label>
                <button 
                  type="button" 
                  onClick={() => handleTranslate("shortName", "shortNameTamil")}
                  className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                >
                  {translatingField === "shortNameTamil" ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                  Auto-generate Tamil
                </button>
              </div>
              <input type="text" className={`form-input ${errors.shortName ? "form-input-error" : ""}`} {...register("shortName")} placeholder="e.g. FTTDDWA" />
              {errors.shortName && <p className="text-red-600 text-xs mt-1">{errors.shortName.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Short Name (Tamil)</label>
                <a href="https://www.google.com/intl/en/inputtools/try/" target="_blank" className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-600">
                  <ExternalLink size={10} /> Google Input Tools
                </a>
              </div>
              <input type="text" className="form-input tamil" dir="auto" {...register("shortNameTamil")} placeholder="சுருக்கப் பெயர்" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Registration Number</label>
              <input type="text" className="form-input" {...register("regNumber")} placeholder="e.g. TN-123/2024" />
            </div>
          </div>
        )}

        {tab === "branding" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo 1 */}
              <div>
                <label className="form-label">Primary Logo (Square/Icon)</label>
                <div 
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => fileInput1Ref.current?.click()}
                >
                  {logo1Url ? (
                    <img src={logo1Url} alt="Logo 1" className="w-20 h-20 object-contain drop-shadow-sm mb-2" />
                  ) : (
                    <Upload size={32} className="text-slate-300 mb-2" />
                  )}
                  <p className="text-xs font-medium text-slate-500">
                    {uploadingLogo1 ? "Uploading..." : "Upload Primary Logo"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">1080x1080px | PNG, WebP (Max 1MB)</p>
                </div>
                <input type="file" hidden ref={fileInput1Ref} onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 1)} accept="image/*" />
              </div>

              {/* Logo 2 */}
              <div>
                <label className="form-label">Secondary Logo (Banner/Seal)</label>
                <div 
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => fileInput2Ref.current?.click()}
                >
                  {logo2Url ? (
                    <img src={logo2Url} alt="Logo 2" className="w-20 h-20 object-contain drop-shadow-sm mb-2" />
                  ) : (
                    <Upload size={32} className="text-slate-300 mb-2" />
                  )}
                  <p className="text-xs font-medium text-slate-500">
                    {uploadingLogo2 ? "Uploading..." : "Upload Secondary Logo"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">1080x1080px | PNG, WebP (Max 1MB)</p>
                </div>
                <input type="file" hidden ref={fileInput2Ref} onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0], 2)} accept="image/*" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label mb-0">Tagline (English)</label>
                  <button 
                    type="button" 
                    onClick={() => handleTranslate("tagline", "taglineTamil")}
                    className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                  >
                    {translatingField === "taglineTamil" ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                    Auto-generate Tamil
                  </button>
                </div>
                <input type="text" className="form-input" {...register("tagline")} placeholder="e.g. Serving Tent Dealers since 1990" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label mb-0">Tagline (Tamil)</label>
                  <a href="https://www.google.com/intl/en/inputtools/try/" target="_blank" className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-600">
                    <ExternalLink size={10} /> Google Input Tools
                  </a>
                </div>
                <input type="text" className="form-input tamil" dir="auto" {...register("taglineTamil")} placeholder="முழக்கம் / குறிக்கோள்" />
              </div>
            </div>
          </div>
        )}

        {tab === "contact" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" {...register("email")} placeholder="contact@association.org" />
                {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="form-label">Phone Number</label>
                <input type="tel" className="form-input" {...register("phone")} placeholder="+91 9XXXXXXXXX" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label mb-0">State (English)</label>
                  <button 
                    type="button" 
                    onClick={() => handleTranslate("state", "stateTamil")}
                    className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                  >
                    {translatingField === "stateTamil" ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                    Auto-generate Tamil
                  </button>
                </div>
                <input type="text" className="form-input" {...register("state")} placeholder="e.g. Tamil Nadu" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label mb-0">State (Tamil)</label>
                  <a href="https://www.google.com/intl/en/inputtools/try/" target="_blank" className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-600">
                    <ExternalLink size={10} /> Google Input Tools
                  </a>
                </div>
                <input type="text" className="form-input tamil" dir="auto" {...register("stateTamil")} placeholder="மாநிலம்" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Office Address (English)</label>
                <button 
                  type="button" 
                  onClick={() => handleTranslate("address", "addressTamil")}
                  className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                >
                  {translatingField === "addressTamil" ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                  Auto-generate Tamil
                </button>
              </div>
              <textarea rows={2} className="form-input" {...register("address")} placeholder="Full registered address..." />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Office Address (Tamil)</label>
                <a href="https://www.google.com/intl/en/inputtools/try/" target="_blank" className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-600">
                  <ExternalLink size={10} /> Google Input Tools
                </a>
              </div>
              <textarea rows={2} className="form-input tamil" dir="auto" {...register("addressTamil")} placeholder="அலுவலக முகவரி" />
            </div>
          </div>
        )}
        {tab === "signatures" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { field: "sigChairmanUrl", label: "Chairman Signature" },
                { field: "sigPresidentUrl", label: "President Signature" },
                { field: "sigVicePresidentUrl", label: "Vice President Signature" },
                { field: "sigSecretaryUrl", label: "Secretary Signature" },
                { field: "sigJointSecretaryUrl", label: "Joint Secretary Signature" },
                { field: "sigTreasurerUrl", label: "Treasurer Signature" },
              ].map((s) => (
                <div key={s.field}>
                  <label className="form-label">{s.label}</label>
                  <div 
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleSignatureUpload(file, s.field as any);
                      };
                      input.click();
                    }}
                  >
                    {(sigUrls as any)[s.field] ? (
                      <div className="relative w-full h-20">
                        <img src={(sigUrls as any)[s.field]} alt={s.label} className="w-full h-full object-contain mix-blend-multiply" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                          <Upload size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ) : (
                      <Upload size={24} className="text-slate-300 mb-1" />
                    )}
                    <p className="text-[10px] font-medium text-slate-500 mt-1">
                      {uploadingSigs[s.field] ? "Uploading..." : (sigUrls as any)[s.field] ? "Change Signature" : "Upload Signature"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs text-amber-700 leading-relaxed">
                <strong>Tip:</strong> For best results, use images with a transparent background (PNG) or a clean white background. Signatures should be horizontal and well-lit.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button 
            type="submit" 
            disabled={loading || !isDirty} 
            className="btn btn-primary min-w-[120px]"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Saving...</>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
