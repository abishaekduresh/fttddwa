"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, X, User, Wand2, ExternalLink } from "lucide-react";
import { useState, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { createMemberSchema, type CreateMemberInput } from "@/lib/validation/member.schema";
import { TAMIL_NADU_DISTRICTS, STATE_CONFIG } from "@/constants/districts";
import { ASSOCIATION_POSITIONS } from "@/constants";
import { translateToTamil } from "@/lib/utils/translation";

interface MemberFormProps {
  defaultValues?: Partial<CreateMemberInput> & { photoUrl?: string };
  onSubmit: (data: CreateMemberInput & { photoUrl?: string }) => Promise<{ fieldErrors?: Record<string, string[]> } | void>;
  loading?: boolean;
  submitLabel?: string;
}

export function MemberForm({ defaultValues, onSubmit, loading, submitLabel = "Save Member" }: MemberFormProps) {
  const [photoUrl, setPhotoUrl] = useState(defaultValues?.photoUrl || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if the current position is in the predefined list
  const initialPosition = defaultValues?.position || "Member";
  const isInitiallyOther = initialPosition && !ASSOCIATION_POSITIONS.includes(initialPosition as any) && initialPosition !== "Other";
  const [customPosition, setCustomPosition] = useState(isInitiallyOther ? initialPosition : "");

  // "Others" district handling
  const allKnownDistricts = Object.values(STATE_CONFIG).flatMap((s) => Object.keys(s));
  const isInitiallyOtherDistrict = !!(defaultValues?.district && !allKnownDistricts.includes(defaultValues.district));
  const [isOtherDistrict, setIsOtherDistrict] = useState(isInitiallyOtherDistrict);
  const [districtSelect, setDistrictSelect] = useState(isInitiallyOtherDistrict ? "Others" : (defaultValues?.district || ""));

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    setError,
  } = useForm<CreateMemberInput>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      nameTamil: defaultValues?.nameTamil || "",
      position: isInitiallyOther ? "Other" : initialPosition,
      aadhaar: defaultValues?.aadhaar || "",
      address: defaultValues?.address || "",
      district: defaultValues?.district || "",
      taluk: defaultValues?.taluk || "",
      village: defaultValues?.village || "",
      state: defaultValues?.state || "Tamil Nadu",
      businessName: defaultValues?.businessName || "",
      businessNameTamil: defaultValues?.businessNameTamil || "",
      industry: defaultValues?.industry || "",
      dateOfBirth: defaultValues?.dateOfBirth || "",
      weddingDate: defaultValues?.weddingDate || "",
      phone: defaultValues?.phone || "",
      email: defaultValues?.email || "",
      remark: defaultValues?.remark || "",
    },
  });

  const state = watch("state");
  const district = watch("district");
  const selectedPosition = watch("position");
  const englishName = watch("name");
  const englishBusinessName = watch("businessName");

  const [translatingName, setTranslatingName] = useState(false);
  const [translatingBusinessName, setTranslatingBusinessName] = useState(false);

  const handleTranslate = async (field: "name" | "businessName") => {
    const text = field === "name" ? englishName : englishBusinessName;
    if (!text) {
      toast.error("Please enter English text first");
      return;
    }

    const setLoader = field === "name" ? setTranslatingName : setTranslatingBusinessName;
    const targetField = field === "name" ? "nameTamil" : "businessNameTamil";

    setLoader(true);
    try {
      const tamilText = await translateToTamil(text);
      if (tamilText) {
        setValue(targetField as any, tamilText, { shouldDirty: true });
        toast.success("Translated to Tamil");
      } else {
        toast.error("Translation failed. Try manual tool.");
      }
    } catch {
      toast.error("Translation error");
    } finally {
      setLoader(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validate File Size (Max 1MB)
    const MAX_SIZE = 1 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("File too large. Maximum size is 1MB.");
      return;
    }

    // 2. Validate Minimum Resolution
    const img = new (window as any).Image();
    const _URL = window.URL || window.webkitURL;
    img.src = _URL.createObjectURL(file);

    img.onload = async () => {
      if (img.width < 600 || img.height < 600) {
        toast.error("Image too small. Please upload at least 600×600px.");
        return;
      }

      // Proceed with upload if checks pass
      const formData = new FormData();
      formData.append("file", file);
      setUploadingPhoto(true);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const json = await res.json();
        if (json.success) {
          setPhotoUrl(json.data.url);
        } else {
          toast.error(json.message || "Upload failed");
        }
      } catch {
        toast.error("Upload failed. Please try again.");
      } finally {
        setUploadingPhoto(false);
      }
    };
  };

  const handleFormSubmit = async (data: CreateMemberInput) => {
    const finalData = { ...data };
    if (data.position === "Other") {
      finalData.position = customPosition;
    }
    const result = await onSubmit({ ...finalData, photoUrl });
    if (result?.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        setError(field as keyof CreateMemberInput, { message: messages[0] });
        toast.error(messages[0]);
      }
    }
  };

  const districtsData = STATE_CONFIG[state as keyof typeof STATE_CONFIG] || {};
  const districts = Object.keys(districtsData);
  const taluks = (districtsData as Record<string, string[]>)[district as string] || [];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photo Upload */}
        <div className="lg:col-span-1">
          <label className="form-label">Photo (Passport Size)</label>
          <div
            className="border-2 border-dashed border-slate-300 rounded-lg p-2 text-center cursor-pointer hover:border-primary transition-all bg-slate-50/50 hover:bg-slate-50"
            onClick={() => fileInputRef.current?.click()}
          >
            {photoUrl ? (
              <div className="relative">
                <img
                  src={photoUrl}
                  alt="Member photo"
                  className="w-32 h-[164px] object-cover rounded-lg mx-auto shadow-md border border-slate-200"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPhotoUrl(""); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <div className="py-4">
                {uploadingPhoto ? (
                  <Loader2 size={32} className="animate-spin mx-auto text-slate-400 mb-2" />
                ) : (
                  <User size={32} className="mx-auto text-slate-300 mb-2" />
                )}
                <p className="text-sm text-slate-500 font-medium">Click to upload photo</p>
                <p className="text-xs text-slate-400 mt-1">Required: 600 x 771 px (3.5cm x 4.5cm)</p>
                <p className="text-xs text-slate-400">JPEG, PNG, WebP — Max 1MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Basic Info */}
        <div className="lg:col-span-2 space-y-4">
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Full Name (English) *</label>
                <button 
                  type="button" 
                  onClick={() => handleTranslate("name")}
                  className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                  disabled={translatingName}
                >
                  {translatingName ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                  Auto-generate Tamil
                </button>
              </div>
              <input
                type="text"
                className={`form-input ${errors.name ? "form-input-error" : ""}`}
                {...register("name")}
                placeholder="As per Aadhaar"
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">பெயர் (Tamil)</label>
                <a 
                  href="https://www.google.com/intl/en/inputtools/try/" 
                  target="_blank" 
                  className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-600"
                >
                  <ExternalLink size={10} /> Google Input Tools
                </a>
              </div>
              <input
                type="text"
                className="form-input tamil"
                dir="auto"
                {...register("nameTamil")}
                placeholder="பெயர் தமிழில்"
              />
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Business Name (English)</label>
                <button 
                  type="button" 
                  onClick={() => handleTranslate("businessName")}
                  className="text-[10px] flex items-center gap-1 text-primary hover:underline"
                  disabled={translatingBusinessName}
                >
                  {translatingBusinessName ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />}
                  Auto-generate Tamil
                </button>
              </div>
              <input type="text" className="form-input" {...register("businessName")} placeholder="Shop/Company Name" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">நிறுவனத்தின் பெயர் (Tamil)</label>
                <a 
                  href="https://www.google.com/intl/en/inputtools/try/" 
                  target="_blank" 
                  className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-slate-600"
                >
                  <ExternalLink size={10} /> Google Input Tools
                </a>
              </div>
              <input type="text" className="form-input tamil" dir="auto" {...register("businessNameTamil")} placeholder="பெயர் தமிழில்" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Position / பதவி</label>
              <select 
                className="form-input" 
                {...register("position")}
              >
                {ASSOCIATION_POSITIONS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {selectedPosition === "Other" && (
              <div>
                <label className="form-label">Custom Position / விருப்ப பதவி *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={customPosition}
                  onChange={(e) => setCustomPosition(e.target.value)}
                  placeholder="Enter position"
                  required
                />
              </div>
            )}
            <div>
              <label className="form-label">Aadhaar Number (ஆதார் எண்)</label>
              <input
                type="text"
                maxLength={12}
                className={`form-input font-mono ${errors.aadhaar ? "form-input-error" : ""}`}
                {...register("aadhaar")}
                placeholder="XXXXXXXXXXXX"
              />
              {errors.aadhaar && <p className="text-red-600 text-xs mt-1">{errors.aadhaar.message}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Phone Number (தொலைபேசி) *</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={10}
            className={`form-input ${errors.phone ? "form-input-error" : ""}`}
            placeholder="9XXXXXXXXX"
            {...(() => {
              const { onChange, ...rest } = register("phone");
              return {
                ...rest,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                  onChange(e);
                },
              };
            })()}
          />
          {errors.phone && <p className="text-red-600 text-xs mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="form-label">Email (optional)</label>
          <input type="email" className="form-input" {...register("email")} placeholder="email@example.com" />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">State (மாநிலம்) *</label>
          <select
            className={`form-input ${errors.state ? "form-input-error" : ""}`}
            {...register("state")}
            onChange={(e) => {
              setValue("state", e.target.value);
              setValue("district", "");
              setValue("taluk", "");
              setValue("village", "");
              setDistrictSelect("");
              setIsOtherDistrict(false);
            }}
          >
            {Object.keys(STATE_CONFIG).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {errors.state && <p className="text-red-600 text-xs mt-1">{errors.state.message}</p>}
        </div>
        <div>
          <label className="form-label">District (மாவட்டம்) *</label>
          {isOtherDistrict ? (
            <div className="space-y-2">
              <select
                className="form-input"
                value="Others"
                onChange={(e) => {
                  if (e.target.value !== "Others") {
                    setIsOtherDistrict(false);
                    setDistrictSelect(e.target.value);
                    setValue("district", e.target.value);
                    setValue("taluk", "");
                  }
                }}
              >
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="Others">Others</option>
              </select>
              <input
                type="text"
                className={`form-input ${errors.district ? "form-input-error" : ""}`}
                {...register("district")}
                placeholder="Enter district name"
                autoFocus
              />
            </div>
          ) : (
            <select
              className={`form-input ${errors.district ? "form-input-error" : ""}`}
              value={districtSelect}
              onChange={(e) => {
                const val = e.target.value;
                setDistrictSelect(val);
                if (val === "Others") {
                  setIsOtherDistrict(true);
                  setValue("district", "");
                  setValue("taluk", "");
                } else {
                  setValue("district", val);
                  setValue("taluk", "");
                  setValue("village", "");
                }
              }}
            >
              <option value="">Select District</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
              <option value="Others">Others</option>
            </select>
          )}
          {errors.district && <p className="text-red-600 text-xs mt-1">{errors.district.message}</p>}
        </div>
        <div>
          <label className="form-label">Taluk (தாலுகா) *</label>
          {isOtherDistrict ? (
            <input
              type="text"
              className={`form-input ${errors.taluk ? "form-input-error" : ""}`}
              {...register("taluk")}
              placeholder="Enter taluk name"
            />
          ) : (
            <select
              className={`form-input ${errors.taluk ? "form-input-error" : ""}`}
              {...register("taluk")}
            >
              <option value="">Select Taluk</option>
              {taluks.map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
          {errors.taluk && <p className="text-red-600 text-xs mt-1">{errors.taluk.message}</p>}
        </div>
        <div>
          <label className="form-label">Village (கிராமம்)</label>
          <input
            type="text"
            className="form-input"
            {...register("village")}
            placeholder="Village name"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Address (முகவரி) *</label>
        <textarea
          rows={3}
          className={`form-input resize-none ${errors.address ? "form-input-error" : ""}`}
          {...register("address")}
          placeholder="Full address..."
        />
        {errors.address && <p className="text-red-600 text-xs mt-1">{errors.address.message}</p>}
      </div>

      {/* Other */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Industry (தொழில்)</label>
          <input type="text" className="form-input" {...register("industry")} placeholder="e.g. Tent & Decoration" />
        </div>
        <div>
          <label className="form-label">Date of Birth (பிறந்த தேதி)</label>
          <input type="date" className="form-input" {...register("dateOfBirth")} />
        </div>
        <div>
          <label className="form-label">Wedding Date (திருமண தேதி)</label>
          <input type="date" className="form-input" {...register("weddingDate")} />
        </div>
      </div>

      <div>
        <label className="form-label">Remarks (குறிப்புகள் / இதர தகவல்)</label>
        <textarea
          rows={2}
          className="form-input resize-none"
          {...register("remark")}
          placeholder="Any additional notes or details..."
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t border-slate-200">
        <button type="button" onClick={() => history.back()} className="btn btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading || uploadingPhoto} className="btn btn-primary">
          {loading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : submitLabel}
        </button>
      </div>
    </form>
  );
}
