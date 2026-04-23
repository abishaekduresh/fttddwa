import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";
import { parse, stringify } from "yaml";

/**
 * GET /api/docs/yaml
 * Serves the raw OpenAPI YAML file as a downloadable file,
 * with the current host dynamically injected as the primary server.
 */
export async function GET(req: NextRequest) {
  try {
    const yamlPath = path.join(process.cwd(), "docs", "openapi.yaml");
    const content = readFileSync(yamlPath, "utf-8");

    // Parse to modify
    const spec = parse(content);

    // Inject dynamic server
    const origin = req.nextUrl.origin;
    const currentApiUrl = `${origin}/api`;

    if (!spec.servers) spec.servers = [];

    // Filter duplicates and prepend current host
    spec.servers = [
      { url: currentApiUrl, description: "Current Host (Auto-detected)" },
      ...spec.servers.filter((s: any) => s.url !== currentApiUrl && s.url !== `${currentApiUrl}/`)
    ];

    // Stringify back to YAML
    const updatedYaml = stringify(spec);

    return new NextResponse(updatedYaml, {
      status: 200,
      headers: {
        "Content-Type": "application/yaml",
        "Content-Disposition": "attachment; filename=fttddwa-openapi.yaml",
        "Cache-Control": "no-store, max-age=0",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Failed to serve YAML OpenAPI spec:", err);
    return NextResponse.json({ error: "Spec file not found" }, { status: 404 });
  }
}
