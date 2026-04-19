import { NextRequest } from "next/server";
import {
  ok,
  forbidden,
  notFound,
  error,
  serverError,
} from "@/lib/api/response";
import { updateVendorSchema, manualBalanceSchema } from "@/lib/validation/whatsapp.schema";
import {
  getWhatsappVendorById,
  updateWhatsappVendor,
  deleteWhatsappVendor,
  refreshVendorBalance,
  manualUpdateVendorBalance,
} from "@/lib/services/whatsapp-vendor.service";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY", "VIEWER"].includes(role || "")) {
      return forbidden();
    }

    const { id } = await params;
    const vendor = await getWhatsappVendorById(parseInt(id));
    if (!vendor) return notFound("Vendor not found");

    return ok(vendor);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
      return forbidden();
    }

    const { id } = await params;
    const vendorId = parseInt(id);

    const existing = await getWhatsappVendorById(vendorId);
    if (!existing) return notFound("Vendor not found");

    const body = await req.json();

    // Special action: refresh balance from vendor API
    if (body.action === "refresh_balance") {
      const balance = await refreshVendorBalance(vendorId);
      return ok({ balance }, "Balance refreshed");
    }

    if (body.action === "manual_balance") {
      const parsed = manualBalanceSchema.safeParse(body);
      if (!parsed.success) {
        return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      }

      const adminPass = process.env.WHATSAPP_ADMIN_PASSWORD;
      if (!adminPass || parsed.data.password !== adminPass) {
        return error("Invalid administrative password", 403);
      }

      const vendor = await manualUpdateVendorBalance(vendorId, parsed.data.balance);

      await createAuditLog({
        userId: parseInt(req.headers.get("x-user-id") || "0"),
        userEmail: req.headers.get("x-user-email") || undefined,
        action: "UPDATE",
        resource: "whatsapp_vendor",
        resourceId: String(vendorId),
        oldValues: { walletBalance: existing.walletBalance },
        newValues: { walletBalance: vendor.walletBalance },
        ipAddress: getClientIp(req),
        userAgent: req.headers.get("user-agent") || undefined,
        status: "SUCCESS",
      });

      return ok(vendor, "Balance updated manually");
    }

    const parsed = updateVendorSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const vendor = await updateWhatsappVendor(vendorId, parsed.data);

    await createAuditLog({
      userId: parseInt(req.headers.get("x-user-id") || "0"),
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "UPDATE",
      resource: "whatsapp_vendor",
      resourceId: String(vendorId),
      oldValues: { name: existing.name, isActive: existing.isActive },
      newValues: { name: vendor.name, isActive: vendor.isActive },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      status: "SUCCESS",
    });

    return ok(vendor, "Vendor updated successfully");
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
      return forbidden();
    }

    const { id } = await params;
    const vendorId = parseInt(id);

    const existing = await getWhatsappVendorById(vendorId);
    if (!existing) return notFound("Vendor not found");

    await deleteWhatsappVendor(vendorId);

    await createAuditLog({
      userId: parseInt(req.headers.get("x-user-id") || "0"),
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "DELETE",
      resource: "whatsapp_vendor",
      resourceId: String(vendorId),
      oldValues: { name: existing.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      status: "SUCCESS",
    });

    return ok(null, "Vendor deleted successfully");
  } catch (err) {
    return serverError(err);
  }
}
