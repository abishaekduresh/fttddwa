import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/jwt";
import { createAuditLog } from "./audit.service";

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Include shape reused across queries
const userWithRoleInclude = {
  role: {
    include: {
      permissions: {
        include: { permission: { select: { name: true } } },
      },
    },
  },
} as const;

export interface LoginResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    roleId: number;
  };
  error?: string;
}

export async function loginUser(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<LoginResult> {
  // Single query: user + role + permissions
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: userWithRoleInclude,
  });

  if (!user) {
    await createAuditLog({
      userEmail: email,
      action: "LOGIN_FAILED",
      resource: "auth",
      ipAddress,
      status: "FAILURE",
    });
    return { success: false, error: "Invalid credentials" };
  }

  if (!user.isActive) {
    return { success: false, error: "Account is deactivated" };
  }

  // Check account lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return { success: false, error: `Account locked. Try again in ${minutesLeft} minutes` };
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    const newFailedCount = user.failedLoginCount + 1;
    const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: newFailedCount,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    });

    await createAuditLog({
      userId: user.id,
      userEmail: email,
      action: "LOGIN_FAILED",
      resource: "auth",
      ipAddress,
      status: "FAILURE",
    });

    if (shouldLock) {
      return { success: false, error: "Too many failed attempts. Account locked for 15 minutes." };
    }
    return { success: false, error: "Invalid credentials" };
  }

  // Successful login — reset counters
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const permissions = user.role?.permissions?.map((rp) => rp.permission.name) ?? [];

  const accessToken = await signAccessToken({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role?.name ?? "",
    roleId: user.roleId!,
    permissions,
  });

  // Create session first with a temp token, then re-sign with real session ID
  const tempToken = await signRefreshToken({ userId: user.id, sessionId: 0 });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: { userId: user.id, refreshToken: tempToken, ipAddress, userAgent, expiresAt },
  });

  const finalRefreshToken = await signRefreshToken({ userId: user.id, sessionId: session.id });
  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: finalRefreshToken },
  });

  await createAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: "LOGIN",
    resource: "auth",
    ipAddress,
    userAgent,
  });

  return {
    success: true,
    accessToken,
    refreshToken: finalRefreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role?.name ?? "",
      roleId: user.roleId!,
    },
  };
}

export async function refreshTokens(
  refreshToken: string,
  ipAddress?: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return null;

  // Single query: session + user + role + permissions
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: { include: userWithRoleInclude } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;

  const { user } = session;
  if (!user || !user.isActive) return null;

  const permissions = user.role?.permissions?.map((rp) => rp.permission.name) ?? [];

  const newAccessToken = await signAccessToken({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role?.name ?? "",
    roleId: user.roleId!,
    permissions,
  });

  const newRefreshToken = await signRefreshToken({
    userId: user.id,
    sessionId: session.id,
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { refreshToken: newRefreshToken, ipAddress },
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(refreshToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { refreshToken },
    data: { revokedAt: new Date() },
  });
}

export async function getUserById(userId: number) {
  // Single query: user + role + permissions (used for /api/auth/me fallback only)
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      roleId: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      role: {
        select: {
          id: true,
          name: true,
          displayName: true,
          permissions: {
            select: { permission: { select: { name: true } } },
          },
        },
      },
    },
  });
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found" };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return { success: false, error: "Current password is incorrect" };

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  // Revoke all sessions
  await prisma.session.updateMany({
    where: { userId },
    data: { revokedAt: new Date() },
  });

  return { success: true };
}
