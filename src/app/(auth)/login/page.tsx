"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, Loader2, UserPlus, Timer } from "lucide-react";
import Link from "next/link";
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
  const [countdown, setCountdown] = useState<number | null>(null);

  // ─── Countdown Logic ───
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      setCountdown(null);
      return;
    }
    const timer = setInterval(() => setCountdown((prev) => (prev && prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatCountdown = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  // ─── Session Check ───
  useEffect(() => {
    async function checkSession() {
      try {
        let meRes = await fetch("/api/auth/me");

        // access_token expired — try silent refresh
        if (meRes.status === 401) {
          const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
          if (refreshRes.ok) {
            meRes = await fetch("/api/auth/me");
          }
        }

        if (meRes.ok) {
          const meJson = await meRes.json();
          setUser(meJson.data);
          router.push("/dashboard");
          return;
        }

        // No valid session — clear any stale cookies and show the form
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (err) {
        console.error("[Login] Session check failed:", err);
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
        const errorMsg = json.message || "Invalid credentials. Please check your email and password.";

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") || "900", 10);
          setCountdown(retryAfter);
          toast.error(`Too many attempts. Please wait ${formatCountdown(retryAfter)}.`, {
            id: "rate-limit-toast",
            duration: 5000,
          });
        } else {
          toast.error(errorMsg);
        }
        return;
      }

      // Fetch user profile — 0 DB queries, reads from JWT headers
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) {
        toast.error("Session could not be established.");
        return;
      }
      const meJson = await meRes.json();
      setUser(meJson.data);
      toast.success(`Welcome back, ${json.name || meJson.data.name}!`);
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error(`Network error: ${msg}`);
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
        {countdown !== null && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md text-sm flex items-center gap-3 animate-pulse">
            <Timer size={18} className="shrink-0" />
            <div>
              <p className="font-semibold">Security Lock Active</p>
              <p className="text-xs">Please wait <span className="font-bold">{formatCountdown(countdown)}</span> before trying again.</p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="form-label">Email Address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="admin@fttddwa.org"
            disabled={countdown !== null}
            className={`form-input ${errors.email ? "form-input-error" : ""} ${countdown !== null ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
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
              disabled={countdown !== null}
              className={`form-input pr-10 ${errors.password ? "form-input-error" : ""} ${countdown !== null ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={countdown !== null}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-50"
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
          disabled={loading || countdown !== null}
          className="btn btn-primary w-full py-2.5"
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Signing in...</>
          ) : countdown !== null ? (
            <><Timer size={16} /> Locked ({formatCountdown(countdown)})</>
          ) : (
            <><LogIn size={16} /> Sign In</>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-500">
          Not yet a member?{" "}
          <Link
            href="/members/register"
            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium"
          >
            <UserPlus size={13} />
            Register here
          </Link>
        </p>
      </div>
    </>
  );
}
