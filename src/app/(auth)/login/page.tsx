"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validation/auth.schema";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

import { useAssociation } from "@/hooks/use-association";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const { settings } = useAssociation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // ─── Silent Refresh ───
  // Try to restore session automatically if a refresh token exists
  useEffect(() => {
    async function checkSession() {
      try {
        const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
        if (refreshRes.ok) {
          const meRes = await fetch("/api/auth/me");
          if (meRes.ok) {
            const meJson = await meRes.json();
            setUser(meJson.data);
            router.push("/dashboard");
            return;
          }
        }
      } catch (err) {
        console.error("[Login] Silent refresh failed:", err);
      } finally {
        setCheckingSession(false);
      }
    }
    checkSession();
  }, [router, setUser]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 size={32} className="animate-spin text-primary mb-4" />
        <p className="text-slate-500 font-medium">Restoring session...</p>
      </div>
    );
  }

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          toast.error("Too many login attempts. Please wait.");
        } else {
          const isDev = process.env.NODE_ENV !== "production";
          const detail = isDev && json.debug?.stack
            ? `\n\n[Dev] ${json.debug.stack.slice(0, 3).join("\n")}`
            : "";
          setError("root", { message: (json.message || "Login failed") + detail });
        }
        return;
      }

      // Fetch user from JWT cookie — never use data from login response body
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        const meJson = await meRes.json().catch(() => ({}));
        setError("root", { message: meJson.message || "Authentication failed after login" });
        return;
      }
      const meJson = await meRes.json();
      setUser(meJson.data);
      toast.success(`Welcome back, ${meJson.data.name}!`);
      router.push("/dashboard");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center mb-6">
        {settings?.logo1Url && (
          <img src={settings.logo1Url} alt="Logo" className="w-16 h-16 object-contain mb-4" />
        )}
        <h2 className="text-2xl font-bold text-slate-900 text-center">
          {settings?.name || "Sign in"}
        </h2>
        <p className="text-slate-500 text-sm text-center">
          {settings?.tagline || "Enter your credentials to access the portal"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {errors.root && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm whitespace-pre-wrap break-all">
            {errors.root.message}
          </div>
        )}

        <div>
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@fttddwa.org"
            className={`form-input ${errors.email ? "form-input-error" : ""}`}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-red-600 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="form-label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`form-input pr-10 ${errors.password ? "form-input-error" : ""}`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-600 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-2.5"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Signing in...</>
          ) : (
            <><LogIn size={16} /> Sign In</>
          )}
        </button>
      </form>
    </>
  );
}
