"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export function useAuth() {
  const { user, setUser, hasPermission, isRole, logout } = useAuthStore();
  const router = useRouter();

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        setUser(json.data);
      } else if (res.status === 401) {
        // Try refresh
        const refresh = await fetch("/api/auth/refresh", { method: "POST" });
        if (refresh.ok) {
          const res2 = await fetch("/api/auth/me");
          if (res2.ok) {
            const json2 = await res2.json();
            setUser(json2.data);
            return;
          }
        }
        await logout();
        router.push("/login");
      }
    } catch {
      // Network error — keep current user from store
    }
  };

  return { user, setUser, hasPermission, isRole, logout, fetchCurrentUser };
}
