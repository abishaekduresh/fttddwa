import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import { parse } from "yaml";

/**
 * GET /api/docs
 * Serves the OpenAPI 3.0 specification as JSON.
 * Converts the YAML file in /docs/openapi.yaml to a JSON response
 * and dynamically injects the current host as the primary server.
 */
export async function GET(req: NextRequest) {
  try {
    const yamlPath = path.join(process.cwd(), "docs", "openapi.yaml");
    const yamlContent = readFileSync(yamlPath, "utf-8");

    // Parse YAML → JSON
    const spec = parse(yamlContent);

    // Inject dynamic server base on current request
    const origin = req.nextUrl.origin;
    const currentApiUrl = `${origin}/api`;

    if (!spec.servers) spec.servers = [];

    // Filter out if current host matches any existing hardcoded URLs to avoid duplicates
    // and place the current host at the top
    spec.servers = [
      { url: currentApiUrl, description: "Current Host (Auto-detected)" },
      ...spec.servers.filter((s: any) => s.url !== currentApiUrl && s.url !== `${currentApiUrl}/`)
    ];

    return NextResponse.json(spec, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, max-age=0",
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
