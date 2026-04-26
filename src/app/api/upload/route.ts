import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { forbidden, error, serverError } from "@/lib/api/response";
import { createAuditLog } from "@/lib/services/audit.service";
import { getUploadsDir } from "@/lib/utils/storage";

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || "1048576"); // 1MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  try {
    const role = req.headers.get("x-user-role");
    if (!["SUPER_ADMIN", "ADMIN", "DATA_ENTRY"].includes(role || "")) {
      return forbidden();
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "member";

    if (!file) return error("No file provided");
    if (!ALLOWED_TYPES.includes(file.type)) {
      return error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
    }
    if (file.size > MAX_SIZE) {
      return error(`File too large. Max size is ${MAX_SIZE / 1024 / 1024}MB`);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // branding: 1080x1080 square | member: 600x771 portrait (passport)
    let width = 600;
    let height = 771;
    let subDir = "members";

    if (type === "branding") {
      width = 1080;
      height = 1080;
      subDir = "branding";
    } else if (type === "signatures") {
      width = 650;
      height = 300;
      subDir = "signatures";
    }

    const processedBuffer = await sharp(buffer)
      .resize(width, height, { fit: "cover", position: "center" })
      .webp({ quality: 85 })
      .toBuffer();

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    
    // Local Storage
    const uploadsDir = getUploadsDir();
    const targetDir = path.join(uploadsDir, subDir);
    await fs.mkdir(targetDir, { recursive: true });
    const filePath = path.join(targetDir, filename);
    await fs.writeFile(filePath, processedBuffer);
    
    // Construct local URL (served via API rewrite /uploads/ -> /api/files/)
    const fileUrl = `/uploads/${subDir}/${filename}`;

    await createAuditLog({
      userId: parseInt(req.headers.get("x-user-id") || "0") || undefined,
      userEmail: req.headers.get("x-user-email") ?? undefined,
      action: "UPLOAD",
      resource: type === "branding" ? "settings" : "members",
      newValues: { filename, type, storage: "local" },
    });

    return NextResponse.json({ success: true, data: { url: fileUrl, filename } });
  } catch (err) {
    console.error("Upload error:", err);
    return serverError(err);
  }
}
