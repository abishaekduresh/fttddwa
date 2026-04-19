import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { sanitizeText } from "@/lib/security/sanitizer";
import { generateUserUniqueId } from "@/lib/utils/user-id";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleId: number;
}


export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new Error("Email already in use");

  const uniqueId = await generateUserUniqueId();
  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      name: sanitizeText(input.name),
      email: input.email.toLowerCase(),
      uniqueId,
      passwordHash,
      roleId: input.roleId,
    },
    select: { 
      id: true, name: true, email: true, uniqueId: true, roleId: true, isActive: true, createdAt: true,
      role: { select: { name: true, displayName: true } } 
    },
  });
}

export async function getUsers(page = 1, pageSize = 20) {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: { isDeleted: false },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, uniqueId: true, roleId: true, isActive: true,
        lastLoginAt: true, createdAt: true, failedLoginCount: true, status: true,
        role: { select: { name: true, displayName: true } },
      },
    }),
    prisma.user.count({ where: { isDeleted: false } }),
  ]);

  return { users, total };
}

export async function getUserById(id: number) {
  return prisma.user.findFirst({
    where: { id, isDeleted: false },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });
}

export async function updateUser(id: number, input: { name?: string; email?: string; roleId?: number; isActive?: boolean }) {
  const data: Record<string, unknown> = {};
  if (input.name) data.name = sanitizeText(input.name);
  if (input.email) data.email = input.email.toLowerCase();
  if (input.roleId !== undefined) data.roleId = input.roleId;
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
    data.status = input.isActive ? "ACTIVE" : "INACTIVE";
  }

  return prisma.user.update({
    where: { id },
    data,
    select: { 
      id: true, name: true, email: true, uniqueId: true, roleId: true, isActive: true,
      role: { select: { name: true, displayName: true } } 
    },
  });
}

export async function deleteUser(id: number, currentUserId: number) {
  if (id === currentUserId) throw new Error("Cannot delete your own account");
  return prisma.user.update({
    where: { id },
    data: { isDeleted: true, status: "DELETED", isActive: false, deletedAt: new Date() }
  });
}

export async function resetUserPassword(id: number, newPassword: string) {
  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { passwordHash } });
  // Revoke all active sessions
  await prisma.session.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
}

export async function getRoles() {
  return prisma.role.findMany({
    include: {
      _count: { select: { users: true } },
      permissions: { include: { permission: true } },
    },
    orderBy: { id: "asc" },
  });
}
