import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/api/response";

function getISTDayRange(daysOffset: number) {
  const istFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const [y, m, d] = istFormatter.format(new Date()).split("-").map(Number);

  // IST midnight → UTC (IST = UTC+5:30)
  const startUTC = new Date(Date.UTC(y, m - 1, d + daysOffset) - 5.5 * 60 * 60 * 1000);
  const endUTC   = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);

  return { start: startUTC, end: endUTC };
}

export async function GET() {
  try {
    const today     = getISTDayRange(0);
    const yesterday = getISTDayRange(-1);

    const [
      vendorRows,
      typeRows,
      totalRows,
      todayRows,
      yesterdayRows,
    ] = await Promise.all([
      // By vendor
      prisma.$queryRaw<{ vendorId: number; vendorName: string; totalCredits: number; messageCount: number }[]>`
        SELECT cl.vendorId, v.name AS vendorName,
               CAST(SUM(cl.amount) AS DECIMAL(12,4)) AS totalCredits,
               COUNT(cl.id) AS messageCount
        FROM whatsapp_credit_logs cl
        JOIN whatsapp_vendors v ON v.id = cl.vendorId
        GROUP BY cl.vendorId, v.name
      `,
      // By type
      prisma.$queryRaw<{ type: string; totalCredits: number; messageCount: number }[]>`
        SELECT type,
               CAST(SUM(amount) AS DECIMAL(12,4)) AS totalCredits,
               COUNT(id) AS messageCount
        FROM whatsapp_credit_logs
        GROUP BY type
      `,
      // All-time total
      prisma.$queryRaw<{ total: number }[]>`
        SELECT CAST(COALESCE(SUM(amount), 0) AS DECIMAL(12,4)) AS total
        FROM whatsapp_credit_logs
      `,
      // Today (IST)
      prisma.$queryRaw<{ credits: number; messages: number }[]>`
        SELECT CAST(COALESCE(SUM(amount), 0) AS DECIMAL(12,4)) AS credits,
               COUNT(id) AS messages
        FROM whatsapp_credit_logs
        WHERE createdAt >= ${today.start} AND createdAt < ${today.end}
      `,
      // Yesterday (IST)
      prisma.$queryRaw<{ credits: number; messages: number }[]>`
        SELECT CAST(COALESCE(SUM(amount), 0) AS DECIMAL(12,4)) AS credits,
               COUNT(id) AS messages
        FROM whatsapp_credit_logs
        WHERE createdAt >= ${yesterday.start} AND createdAt < ${yesterday.end}
      `,
    ]);

    return ok({
      today:     { credits: Number(todayRows[0]?.credits || 0),     messages: Number(todayRows[0]?.messages || 0) },
      yesterday: { credits: Number(yesterdayRows[0]?.credits || 0), messages: Number(yesterdayRows[0]?.messages || 0) },
      total:     Number(totalRows[0]?.total || 0),
      byVendor:  vendorRows.map(r => ({ ...r, totalCredits: Number(r.totalCredits), messageCount: Number(r.messageCount) })),
      byType:    typeRows.map(r => ({ ...r, totalCredits: Number(r.totalCredits), messageCount: Number(r.messageCount) })),
    });
  } catch (err) {
    console.error("[WA Stats] Error fetching usage stats:", err);
    return serverError(err);
  }
}
