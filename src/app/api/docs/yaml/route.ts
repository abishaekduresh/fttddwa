import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

/**
 * GET /api/docs/yaml
 * Serves the raw OpenAPI YAML file as a downloadable file.
 */
export async function GET() {
  try {
    const yamlPath = path.join(process.cwd(), "docs", "openapi.yaml");
    const content = readFileSync(yamlPath, "utf-8");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/yaml",
        "Content-Disposition": "attachment; filename=fttddwa-openapi.yaml",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Spec file not found" }, { status: 404 });
  }
}
