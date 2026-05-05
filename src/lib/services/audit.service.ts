import { prisma } from "@/lib/prisma";

interface AuditParams {
  userId?: number;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string | number;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status?: "SUCCESS" | "FAILURE";
}

export async function createAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userEmail: params.userEmail,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId?.toString(),
        oldValues: params.oldValues as object,
        newValues: params.newValues as object,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        status: params.status || "SUCCESS",
      },
    });
  } catch (err) {
    // Audit log failures should never crash the main operation
    console.error("Audit log failed:", err);
  }
}

export async function getAuditLogs(params: {
  page: number;
  pageSize: number;
  userId?: number;
  resource?: string;
  action?: string;
}) {
  const { page, pageSize, userId, resource, action } = params;
  const where = {
    ...(userId && { userId }),
    ...(resource && { resource }),
    ...(action && { action }),
  };

  const [logs, total] = await Promise.all([
    (prisma.auditLog as any).findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } } as any,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}
