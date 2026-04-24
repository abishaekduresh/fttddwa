"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus, CheckCircle2, ArrowLeft, ShieldOff, Camera, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import { createMemberSchema, type CreateMemberInput } from "@/lib/validation/member.schema";
import { TAMIL_NADU_DISTRICTS } from "@/constants/districts";

export default function MemberRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ membershipId: string; name: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);
  const [settings, setSettings] = useState<{ logo1Url?: string; logo2Url?: string; name?: string; nameTamil?: string; tagline?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/app")
      .then((r) => r.json())
      .then((j) => {
        setRegistrationEnabled(j.data?.enableMemberRegistration ?? true);
        setSettings(j.data);
      })
      .catch(() => setRegistrationEnabled(true)); // fail open
  }, []);

  const districts = Object.keys(TAMIL_NADU_DISTRICTS).sort();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CreateMemberInput>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      state: "Tamil Nadu",
      position: "Member",
    },
  });

  const selectedDistrict = watch("district");
  const [isOtherDistrict, setIsOtherDistrict] = useState(false);
  const [districtSelect, setDistrictSelect] = useState("");
  const taluks = (!isOtherDistrict && selectedDistrict) ? (TAMIL_NADU_DISTRICTS[selectedDistrict] ?? []) : [];

  const onPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (1MB)
    if (file.size > 1 * 1024 * 1024) {
      toast.error("Photo is too large (max 1MB)");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/members/register/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Upload failed");

      setValue("photoUrl", json.data.url);
      setPreviewUrl(json.data.url);
      toast.success("Photo uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    setValue("photoUrl", "");
    setPreviewUrl(null);
  };

  const onSubmit = async (data: CreateMemberInput) => {
    setLoading(true);
    setServerError(null);
    try {
      const res = await fetch("/api/members/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409 && json.errors) {
          for (const [field, messages] of Object.entries(json.errors as Record<string, string[]>)) {
            const msg = (messages as string[])[0];
            setError(field as keyof CreateMemberInput, { message: msg });
            toast.error(msg);
          }
          return;
        }
        setServerError(json.message || "Registration failed. Please try again.");
        return;
      }
      setSuccess(json.data);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (registrationEnabled === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    );
  }

  if (!registrationEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="flex items-center gap-3 mb-4">
            {settings?.logo1Url ? (
              <img src={settings.logo1Url} alt="Logo" className="h-14 w-14 object-contain flex-shrink-0" />
            ) : (
              <div className="h-14 w-14 flex-shrink-0" />
            )}
            <div className="flex-1 text-center min-w-0">
              <h1 className="text-base font-bold text-white leading-tight">{settings?.name || "FTTDDWA"}</h1>
              {/* {settings?.nameTamil && (
                <p className="text-xs text-white/75 mt-0.5" style={{ fontFamily: "'NotoSansTamil', sans-serif" }}>{settings.nameTamil}</p>
              )} */}
            </div>
            {settings?.logo2Url ? (
              <img src={settings.logo2Url} alt="Logo 2" className="h-14 w-14 object-contain flex-shrink-0" />
            ) : (
              <div className="h-14 w-14 flex-shrink-0" />
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <ShieldOff size={48} className="text-slate-300 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">Registration Unavailable</h2>
            <p className="text-slate-500 text-sm mb-6">
              Online member registration is currently disabled. Please contact the association office to apply for membership.
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <style>{`@font-face { font-family: 'NotoSansTamil'; src: url('/fonts/NotoSansTamil.ttf') format('truetype'); }`}</style>
    <Toaster position="top-right" toastOptions={{ duration: 5000 }} />
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          {settings?.logo1Url ? (
            <img src={settings.logo1Url} alt="Logo" className="h-14 w-14 object-contain flex-shrink-0" />
          ) : (
            <div className="h-14 w-14 flex-shrink-0" />
          )}
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-base font-bold text-white leading-tight">{settings?.name || "FTTDDWA"}</h1>
            {/* {settings?.nameTamil && (
              <p className="text-xs text-white/75 mt-0.5" style={{ fontFamily: "'NotoSansTamil', sans-serif" }}>{settings.nameTamil}</p>
            )} */}
            <p className="text-primary-200 text-xs mt-0.5">
              {settings?.tagline || "Federation of Tamil Nadu Tent Dealers & Decorators"}
            </p>
          </div>
          {settings?.logo2Url ? (
            <img src={settings.logo2Url} alt="Logo 2" className="h-14 w-14 object-contain flex-shrink-0" />
          ) : (
            <div className="h-14 w-14 flex-shrink-0" />
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
          {success ? (
            // ── Success State ──────────────────────────────────────────────
            <div className="text-center py-8">
              <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Registration Submitted!</h2>
              <p className="text-slate-500 mb-4">
                Thank you, <strong>{success.name}</strong>. Your membership application has been received
                and is pending approval by the association.
              </p>
              <div className="bg-slate-50 rounded-lg px-6 py-4 inline-block mb-6">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Your Membership ID</p>
                <p className="text-2xl font-bold text-primary tracking-wider">{success.membershipId}</p>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                Please note your membership ID for future reference. An administrator will review your
                application and activate your membership.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            // ── Registration Form ──────────────────────────────────────────
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900">Member Registration</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Fill in your details to apply for FTTDDWA membership.
                </p>
              </div>

              {serverError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-5">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
                {/* ── Photo & Personal Information ── */}
                <fieldset>
                  <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="flex-1 border-t border-slate-100" />
                    Personal Information
                    <span className="flex-1 border-t border-slate-100" />
                  </legend>

                  <div className="flex flex-col sm:flex-row gap-6 mb-6">
                    {/* Photo Upload */}
                    <div className="flex-shrink-0">
                      <label className="form-label mb-2 block">Member Photo</label>
                      <div className="relative group w-32 h-40">
                        {previewUrl ? (
                          <>
                            <img
                              src={previewUrl}
                              alt="Preview"
                              className="w-full h-full object-cover rounded-xl border-2 border-slate-100 shadow-sm transition-opacity group-hover:opacity-75"
                            />
                            <button
                              type="button"
                              onClick={removePhoto}
                              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                            {uploading && (
                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl">
                                    <Loader2 size={24} className="animate-spin text-primary" />
                                </div>
                            )}
                          </>
                        ) : (
                          <label className={`
                            flex flex-col items-center justify-center w-full h-full 
                            border-2 border-dashed rounded-xl cursor-pointer transition-all
                            ${uploading ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-300 hover:border-primary-500 hover:bg-primary-50'}
                          `}>
                            {uploading ? (
                              <Loader2 size={24} className="animate-spin text-slate-400" />
                            ) : (
                              <>
                                <Camera size={24} className="text-slate-400 mb-1" />
                                <span className="text-[10px] font-medium text-slate-500 uppercase">Upload Photo</span>
                              </>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={onPhotoChange} disabled={uploading} />
                          </label>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-2 text-center">Passport size (max 1MB)</p>
                      <input type="hidden" {...register("photoUrl")} />
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-1 gap-4">
                      <div>
                        <label className="form-label">Full Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g. Ravi Kumar"
                          className={`form-input ${errors.name ? "form-input-error" : ""}`}
                          {...register("name")}
                        />
                        {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
                      </div>
                      <div>
                        <label className="form-label">Name in Tamil</label>
                        <input
                          type="text"
                          placeholder="e.g. ரவி குமார்"
                          className="form-input"
                          {...register("nameTamil")}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Phone Number <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        className={`form-input ${errors.phone ? "form-input-error" : ""}`}
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
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        placeholder="your@email.com"
                        className={`form-input ${errors.email ? "form-input-error" : ""}`}
                        {...register("email")}
                      />
                      {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">Date of Birth</label>
                      <input
                        type="date"
                        className="form-input"
                        {...register("dateOfBirth")}
                      />
                    </div>
                    <div>
                      <label className="form-label">Wedding Anniversary</label>
                      <input
                        type="date"
                        className="form-input"
                        {...register("weddingDate")}
                      />
                    </div>
                  </div>
                </fieldset>

                {/* ── Business Information ── */}
                <fieldset>
                  <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="flex-1 border-t border-slate-100" />
                    Business & Association
                    <span className="flex-1 border-t border-slate-100" />
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label text-slate-700">Business Name (English)</label>
                      <input
                        type="text"
                        placeholder="e.g. Ravi Tent House"
                        className="form-input"
                        {...register("businessName")}
                      />
                    </div>
                    <div>
                      <label className="form-label text-slate-700">Business Name (Tamil)</label>
                      <input
                        type="text"
                        placeholder="e.g. ரவி டென்ட் ஹவுஸ்"
                        className="form-input tamil"
                        dir="auto"
                        {...register("businessNameTamil")}
                      />
                    </div>
                    <div>
                      <label className="form-label">Position / Role</label>
                      <input type="hidden" {...register("position")} value="Member" />
                      <div className="form-input bg-slate-50 text-slate-500 cursor-not-allowed select-none">
                        Member
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Industry / Trade</label>
                      <input
                        type="text"
                        placeholder="e.g. Tent & Decoration"
                        className="form-input"
                        {...register("industry")}
                      />
                    </div>
                  </div>
                </fieldset>

                {/* ── Location ── */}
                <fieldset>
                  <legend className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="flex-1 border-t border-slate-100" />
                    Location
                    <span className="flex-1 border-t border-slate-100" />
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">District <span className="text-red-500">*</span></label>
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
                            placeholder="Enter your district name"
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
                      <label className="form-label">Taluk <span className="text-red-500">*</span></label>
                      {isOtherDistrict ? (
                        <input
                          type="text"
                          className={`form-input ${errors.taluk ? "form-input-error" : ""}`}
                          {...register("taluk")}
                          placeholder="Enter your taluk name"
                        />
                      ) : (
                        <select
                          className={`form-input ${errors.taluk ? "form-input-error" : ""}`}
                          {...register("taluk")}
                          disabled={!selectedDistrict}
                        >
                          <option value="">Select Taluk</option>
                          {taluks.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      )}
                      {errors.taluk && <p className="text-red-600 text-xs mt-1">{errors.taluk.message}</p>}
                    </div>
                    <div>
                      <label className="form-label">Village / Town</label>
                      <input
                        type="text"
                        placeholder="Village or town name"
                        className="form-input"
                        {...register("village")}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label">Full Address <span className="text-red-500">*</span></label>
                      <textarea
                        rows={3}
                        placeholder="Door no., Street, Area, City — at least 10 characters"
                        className={`form-input resize-none ${errors.address ? "form-input-error" : ""}`}
                        {...register("address")}
                      />
                      {errors.address && <p className="text-red-600 text-xs mt-1">{errors.address.message}</p>}
                    </div>
                  </div>
                </fieldset>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full py-2.5"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                  ) : (
                    <><UserPlus size={16} /> Submit Registration</>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
                >
                  <ArrowLeft size={13} />
                  Already a member? Sign in
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-primary-300 text-xs mt-6">
          &copy; {new Date().getFullYear()} FTTDDWA. All rights reserved.
        </p>
      </div>
    </div>
    </>
  );
}
