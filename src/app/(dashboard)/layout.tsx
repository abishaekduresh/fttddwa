"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

const REFRESH_INTERVAL_MS = 12 * 60 * 1000;   // 12 minutes
const IDLE_THRESHOLD_MS   = 10 * 60 * 1000;   // 10 minutes — skip refresh if idle longer
const REFRESH_DEBOUNCE_KEY = "auth_last_refresh"; // localStorage key for multi-tab coordination
const REFRESH_DEBOUNCE_MS  = 30 * 1000;          // 30 s — only one tab refreshes at a time

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());

  useEffect(() => {
    if (window.innerWidth >= 1024) setSidebarOpen(true);
  }, []);

  // Track user activity to skip refresh for idle tabs
  useEffect(() => {
    const mark = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("click", mark);
    window.addEventListener("keydown", mark);
    window.addEventListener("scroll", mark, { passive: true });
    return () => {
      window.removeEventListener("click", mark);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("scroll", mark);
    };
  }, []);

  useEffect(() => {
    const silentRefresh = async (): Promise<boolean> => {
      // Multi-tab debounce: if another tab refreshed recently, skip
      const lastRefresh = parseInt(localStorage.getItem(REFRESH_DEBOUNCE_KEY) || "0", 10);
      if (Date.now() - lastRefresh < REFRESH_DEBOUNCE_MS) return true;

      const res = await fetch("/api/auth/refresh", { method: "POST" });
      if (res.ok) localStorage.setItem(REFRESH_DEBOUNCE_KEY, Date.now().toString());
      return res.ok;
    };

    const redirectToLogin = (message: string) => {
      toast.error(message, { id: "session-expired", duration: 4000 });
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      setTimeout(() => router.push(`/login?next=${next}`), 1500);
    };

    const initAuth = async () => {
      try {
        let res = await fetch("/api/auth/me");

        if (res.status === 401) {
          // Access token expired — attempt silent refresh
          const refreshed = await silentRefresh();
          if (!refreshed) {
            redirectToLogin("Session expired. Please sign in again.");
            return;
          }
          res = await fetch("/api/auth/me");
        }

        if (res.ok) {
          const json = await res.json();
          setUser(json.data);
        } else {
          redirectToLogin("Session expired. Please sign in again.");
        }
      } catch {
        redirectToLogin("Connection error. Please sign in again.");
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Proactively refresh access token before 15-min expiry,
    // but only if user was active in the last IDLE_THRESHOLD_MS.
    const refreshInterval = setInterval(async () => {
      const idle = Date.now() - lastActivityRef.current > IDLE_THRESHOLD_MS;
      if (idle) return; // skip refresh for inactive tabs

      const ok = await silentRefresh();
      if (!ok) {
        redirectToLogin("Session expired. Please sign in again.");
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(refreshInterval);
  }, [router, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-16"
        }`}
      >
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
    </div>
  );
}
