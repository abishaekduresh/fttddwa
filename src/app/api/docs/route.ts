import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import { parse } from "yaml";

/**
 * GET /api/docs
 * Serves the OpenAPI 3.0 specification as JSON.
 * Converts the YAML file in /docs/openapi.yaml to a JSON response.
 */
export async function GET() {
  try {
    const yamlPath = path.join(process.cwd(), "docs", "openapi.yaml");
    const yamlContent = readFileSync(yamlPath, "utf-8");

    // Parse YAML → JSON
    const spec = parse(yamlContent);

    return NextResponse.json(spec, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Failed to serve OpenAPI spec:", err);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to load API specification",
        error: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}
