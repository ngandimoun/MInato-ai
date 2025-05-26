// API endpoint: GET /api/tools/list
// Returns a JSON array of all available tools (name, description, enabled, argsSchema, aliases, categories, version, metadata)
// Supports filtering by:
//   - category: /api/tools/list?category=sports&category=search
//   - enabled: /api/tools/list?enabled=true or enabled=false
//   - version: /api/tools/list?version=1.0.0
import { NextRequest, NextResponse } from "next/server";
import { tools, toolAliases } from "@/lib/tools/index";

// Build alias map from single source of truth
const aliasMap: { [canonical: string]: string[] } = {};
for (const [alias, canonical] of Object.entries(toolAliases)) {
  if (!aliasMap[canonical]) aliasMap[canonical] = [];
  aliasMap[canonical].push(alias);
}
for (const canonical of Object.keys(tools)) {
  if (!aliasMap[canonical]) aliasMap[canonical] = [];
  aliasMap[canonical].push(canonical); // Always include canonical name
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const categoryParams = url.searchParams.getAll("category");
  const enabledParam = url.searchParams.get("enabled");
  const versionParam = url.searchParams.get("version");
  let filteredTools = Object.values(tools);
  if (categoryParams.length > 0) {
    filteredTools = filteredTools.filter(tool =>
      Array.isArray(tool.categories) && tool.categories.some(cat => categoryParams.includes(cat))
    );
  }
  if (enabledParam !== null) {
    const enabledBool = enabledParam === "true";
    filteredTools = filteredTools.filter(tool =>
      (typeof tool.enabled === "undefined" ? true : tool.enabled) === enabledBool
    );
  }
  if (versionParam !== null) {
    filteredTools = filteredTools.filter(tool => tool.version === versionParam);
  }
  const toolList = filteredTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    enabled: typeof tool.enabled === "undefined" ? true : tool.enabled,
    argsSchema: tool.argsSchema,
    aliases: aliasMap[tool.name] || [],
    categories: tool.categories || [],
    version: tool.version || null,
    metadata: tool.metadata || {},
  }));
  return NextResponse.json(toolList);
}

export function POST() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
export function PUT() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
export function DELETE() {
  return new NextResponse("Method Not Allowed", { status: 405 });
} 