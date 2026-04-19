"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false); // start closed (mobile-first)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-open sidebar on large screens
    if (window.innerWidth >= 1024) setSidebarOpen(true);
  }, []);

  useEffect(() => {
    const silentRefresh = async (): Promise<boolean> => {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      return res.ok;
    };

    const initAuth = async () => {
      try {
        let res = await fetch("/api/auth/me");

        if (res.status === 401) {
          // Access token expired — attempt silent refresh
          const refreshed = await silentRefresh();
          if (!refreshed) {
            router.push("/login");
            return;
          }
          res = await fetch("/api/auth/me");
        }

        if (res.ok) {
          const json = await res.json();
          setUser(json.data);
        } else {
          router.push("/login");
        }
      } catch {
        toast.error("Connection error. Please sign in again.");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Proactively refresh the access token every 12 minutes (before 15-min expiry)
    const refreshInterval = setInterval(async () => {
      const ok = await silentRefresh();
      if (!ok) {
        router.push("/login");
      }
    }, 12 * 60 * 1000);

    return () => clearInterval(refreshInterval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile backdrop overlay */}
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
