import { NextRequest, NextResponse } from "next/server";
import { getMembers } from "@/lib/services/member.service";
import { forbidden, serverError } from "@/lib/api/response";
import ExcelJS from "exceljs";
import { formatDate } from "@/lib/utils/format";
import { createAuditLog } from "@/lib/services/audit.service";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
      return forbidden("Insufficient permissions to export");
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "excel";
    const district = searchParams.get("district") || undefined;
    const status = searchParams.get("status") || undefined;

    const { members } = await getMembers({ district, status, pageSize: 10000 });

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "FTTDDWA";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Members", {
        pageSetup: { paperSize: 9, orientation: "landscape" },
      });

      sheet.columns = [
        { header: "Membership ID", key: "membershipId", width: 15 },
        { header: "Name", key: "name", width: 25 },
        { header: "Tamil Name", key: "nameTamil", width: 25 },
        { header: "Position", key: "position", width: 20 },
        { header: "District", key: "district", width: 20 },
        { header: "Taluk", key: "taluk", width: 20 },
        { header: "Address", key: "address", width: 40 },
        { header: "Industry", key: "industry", width: 20 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Email", key: "email", width: 30 },
        { header: "Date of Birth", key: "dateOfBirth", width: 15 },
        { header: "Status", key: "status", width: 12 },
        { header: "Joined Date", key: "joinedAt", width: 15 },
      ];

      // Style header row
      sheet.getRow(1).eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
        cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });

      for (const member of members) {
        sheet.addRow({
          membershipId: member.membershipId,
          name: member.name,
          nameTamil: member.nameTamil || "",
          position: member.position || "",
          district: member.district,
          taluk: member.taluk,
          address: member.address,
          industry: member.industry || "",
          phone: member.phone,
          email: member.email || "",
          dateOfBirth: member.dateOfBirth ? formatDate(member.dateOfBirth) : "",
          status: member.status,
          joinedAt: formatDate(member.joinedAt),
        });
      }

      // Auto-filter
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      await createAuditLog({
        userId: parseInt(req.headers.get("x-user-id") || "0") || undefined,
        userEmail: req.headers.get("x-user-email") ?? undefined,
        action: "EXPORT",
        resource: "members",
        newValues: { format, district: district ?? "all", status: status ?? "all", count: members.length },
      });
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="fttddwa-members-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        },
      });
    }

    return serverError("Unsupported format");
  } catch (err) {
    console.error("Export error:", err);
    return serverError();
  }
}
