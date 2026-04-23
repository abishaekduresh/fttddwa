import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { error, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || "2097152"); // 2MB for public uploads
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const UPLOAD_DIR = process.env.UPLOAD_DIR || "";

/**
 * POST /api/members/register/upload
 * Public endpoint for uploading member photos during registration.
 * Resizes to 600x771 (passport size) and converts to WebP.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Check if registration is enabled
    const row = await prisma.$queryRaw<{ enableMemberRegistration: boolean }[]>`
      SELECT enableMemberRegistration FROM association_settings WHERE id = 1 LIMIT 1
    `;
    const enabled = row[0]?.enableMemberRegistration ?? true;
    if (!enabled) {
      return error("Member registration is currently disabled.", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return error("No file provided");
    if (!ALLOWED_TYPES.includes(file.type)) {
      return error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
    }
    if (file.size > MAX_SIZE) {
      return error(`File too large. Max size is ${MAX_SIZE / 1024 / 1024}MB`);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // member: 600x771 portrait (passport)
    const width = 600;
    const height = 771;
    const subDir = "members";

    const processedBuffer = await sharp(buffer)
      .resize(width, height, { fit: "cover", position: "center" })
      .webp({ quality: 85 })
      .toBuffer();

    const filename = `reg-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
    let fileUrl = "";

    if (UPLOAD_DIR) {
      // Local Storage
      const targetDir = path.join(process.cwd(), UPLOAD_DIR, subDir);
      await fs.mkdir(targetDir, { recursive: true });
      const filePath = path.join(targetDir, filename);
      await fs.writeFile(filePath, processedBuffer);
      
      const publicPath = UPLOAD_DIR.replace(/^\.\//, "");
      fileUrl = `/${publicPath}/${subDir}/${filename}`;
    } else if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Vercel Blob Storage
      const blob = await put(`${subDir}/${filename}`, processedBuffer, {
        access: "public",
        contentType: "image/webp",
      });
      fileUrl = blob.url;
    } else {
      throw new Error("No storage provider configured");
    }

    return NextResponse.json({ 
      success: true, 
      data: { url: fileUrl, filename } 
    });
  } catch (err) {
    console.error("Public registration upload error:", err);
    return serverError(err);
  }
}
