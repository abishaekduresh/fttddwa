import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import { unauthorized, forbidden } from "@/lib/api/response";
import type { AccessTokenPayload } from "@/lib/jwt";

export interface AuthenticatedRequest extends NextRequest {
  user: AccessTokenPayload;
}

type RouteHandler = (req: NextRequest, ctx: { params: Record<string, string> }) => Promise<Response>;
type AuthRouteHandler = (req: NextRequest & { user: AccessTokenPayload }, ctx: { params: Record<string, string> }) => Promise<Response>;

export function withAuth(handler: AuthRouteHandler, requiredPermission?: string): RouteHandler {
  return async (req: NextRequest, ctx) => {
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.cookies.get("access_token")?.value;

    if (!token) return unauthorized();

    const payload = await verifyAccessToken(token);
    if (!payload) return unauthorized("Invalid or expired token");

    if (requiredPermission) {
      const hasPermission = await checkPermission(payload.roleId, requiredPermission);
      if (!hasPermission) return forbidden("Insufficient permissions");
    }

    const authenticatedReq = req as NextRequest & { user: AccessTokenPayload };
    authenticatedReq.user = payload;

    return handler(authenticatedReq, ctx);
  };
}

async function checkPermission(roleId: number, permissionName: string): Promise<boolean> {
  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      roleId,
      permission: { name: permissionName },
    },
  });
  return !!rolePermission;
}

export function getUserFromRequest(req: NextRequest): AccessTokenPayload | null {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.cookies.get("access_token")?.value;
  if (!token) return null;
  return null; // Sync version — use in middleware context only
}
