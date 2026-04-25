
import { cookies, headers } from "next/headers";
import { verifyAccessToken } from "@/lib/jwt";
import type { AccessTokenPayload } from "@/lib/jwt";

export async function getServerAuth() {
  const cookieStore = await cookies();
  const headerList = await headers();
  
  const token = cookieStore.get("access_token")?.value || 
                headerList.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return {
      user: null,
      isAuthenticated: false,
      hasPermission: () => false,
      isRole: () => false
    };
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return {
      user: null,
      isAuthenticated: false,
      hasPermission: () => false,
      isRole: () => false
    };
  }

  return {
    user: payload as AccessTokenPayload,
    isAuthenticated: true,
    hasPermission: (permission: string) => {
      if (payload.role === "SUPER_ADMIN") return true;
      return payload.permissions?.includes(permission) || false;
    },
    isRole: (role: string) => payload.role === role
  };
}
