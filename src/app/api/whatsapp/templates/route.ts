import { NextRequest } from "next/server";
import { ok, forbidden, serverError } from "@/lib/api/response";
import { getWhatsappTemplates } from "@/lib/services/whatsapp-template.service";

export async function GET(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY", "VIEWER"].includes(role || "")) {
      return forbidden();
    }

    const { searchParams } = req.nextUrl;
    const vendorId = searchParams.get("vendorId");

    const templates = await getWhatsappTemplates(vendorId ? parseInt(vendorId) : undefined);
    return ok(templates);
  } catch (err) {
    return serverError(err);
  }
}
