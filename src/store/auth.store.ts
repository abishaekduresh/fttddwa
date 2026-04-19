"use client";

import { create } from "zustand";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  roleId: number;
  permissions?: string[];
}

interface AuthState {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  hasPermission: (permission: string) => boolean;
  isRole: (...roles: string[]) => boolean;
  logout: () => Promise<void>;
}

// Remove any legacy plaintext user data left by the old persist middleware
if (typeof window !== "undefined") {
  localStorage.removeItem("fttddwa-auth");
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,

  setUser: (user) => set({ user }),

  hasPermission: (permission) => {
    const { user } = get();
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true;
    return user.permissions?.includes(permission) ?? false;
  },

  isRole: (...roles) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role);
  },

  logout: async () => {
    set({ user: null });
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore — cookies are cleared server-side; local state already wiped
    }
  },
}));
