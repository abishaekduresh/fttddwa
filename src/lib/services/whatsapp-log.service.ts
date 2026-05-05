import { prisma } from "@/lib/prisma";
import { WaMessageType, WaLogStatus } from "@prisma/client";

export interface LogFilters {
  memberId?: number;
  messageType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  pageSize: number;
}

const VALID_LOG_STATUSES = new Set(["pending", "processing", "sent", "delivered", "read", "failed"]);
const VALID_MESSAGE_TYPES = new Set(["birthday", "anniversary", "festival", "custom", "otp", "manual"]);

export async function getWhatsappLogs(filters: LogFilters) {
  const { memberId, messageType, status, dateFrom, dateTo, page, pageSize } = filters;

  const where: Record<string, unknown> = {};
  if (memberId) where.memberId = memberId;
  if (messageType && VALID_MESSAGE_TYPES.has(messageType)) where.messageType = messageType as WaMessageType;
  if (status && VALID_LOG_STATUSES.has(status)) where.status = status as WaLogStatus;
  if (dateFrom || dateTo) {
    where.scheduledDate = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [logs, total] = await Promise.all([
    (prisma.whatsappLog as any).findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, name: true } },
        member: { select: { id: true, membershipId: true, name: true, phone: true } },
        creditLogs: { select: { amount: true } },
      },
    }),
    prisma.whatsappLog.count({ where }),
  ]);

  return { logs, total };
}

/**
 * Update a log's status when a webhook delivery event arrives.
 */
export async function updateLogStatusByVendorId(params: {
  vendorMessageId: string;
  status: "delivered" | "failed" | "sent";
  deliveredAt?: Date;
  errorMessage?: string;
}) {
  const log = await prisma.whatsappLog.findFirst({
    where: { vendorMessageId: params.vendorMessageId },
  });
  if (!log) return null;

  return prisma.whatsappLog.update({
    where: { id: log.id },
    data: {
      status: params.status,
      deliveredAt: params.deliveredAt,
      errorMessage: params.errorMessage,
    },
  });
}

/**
 * Check if a message was already sent (or is pending) today for this member + type.
 * Used by cron to prevent duplicates.
 */
export async function checkDuplicate(
  memberId: number,
  messageType: WaMessageType,
  scheduledDate: Date
) {
  const yesterday = new Date(scheduledDate);
  yesterday.setDate(yesterday.getDate() - 1);

  return prisma.whatsappLog.findFirst({
    where: {
      memberId,
      messageType,
      scheduledDate: { gte: yesterday },
      status: { in: ["pending", "sent", "delivered", "failed"] },
    },
  });
}
