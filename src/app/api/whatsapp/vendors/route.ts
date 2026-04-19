import { NextRequest } from "next/server";
import {
  ok,
  created,
  forbidden,
  error,
  serverError,
} from "@/lib/api/response";
import { createVendorSchema } from "@/lib/validation/whatsapp.schema";
import {
  getWhatsappVendors,
  createWhatsappVendor,
} from "@/lib/services/whatsapp-vendor.service";
import { createAuditLog } from "@/lib/services/audit.service";
import { getClientIp } from "@/lib/security/rate-limiter";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY", "VIEWER"].includes(role || "")) {
      return forbidden();
    }

    const vendors = await getWhatsappVendors();
    return ok(vendors);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN"].includes(role || "")) {
      return forbidden();
    }

    const body = await req.json();
    const parsed = createVendorSchema.safeParse(body);
    if (!parsed.success) {
      return error("Validation failed", 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
    }

    const vendor = await createWhatsappVendor(parsed.data);

    await createAuditLog({
      userId: parseInt(req.headers.get("x-user-id") || "0"),
      userEmail: req.headers.get("x-user-email") || undefined,
      action: "CREATE",
      resource: "whatsapp_vendor",
      resourceId: String(vendor.id),
      newValues: { name: vendor.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent") || undefined,
      status: "SUCCESS",
    });

    return created(vendor, "Vendor created successfully");
  } catch (err) {
    return serverError(err);
  }
}
