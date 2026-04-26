import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadsDir } from "@/lib/utils/storage";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { path: segments } = await params;
    const uploadsRoot = getUploadsDir();

    // Prevent path traversal attacks
    const safePath = segments.map((s) => path.basename(s)).join(path.sep);
    const filePath = path.resolve(uploadsRoot, safePath);

    // Only allow files inside the uploads directory
    if (!filePath.startsWith(uploadsRoot)) {
      return new NextResponse(null, { status: 403 });
    }

    const fileBuffer = await readFile(filePath);
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse(null, { status: 404 });
    }
    return new NextResponse(null, { status: 500 });
  }
}
