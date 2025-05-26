// API endpoint: GET /api/tools/[toolName]
// Returns details for a single tool (by canonical name or alias), or 404 if not found
import { NextRequest, NextResponse } from "next/server";
import { tools, resolveToolName, toolAliases } from "@/lib/tools/index";

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

export async function GET(req: NextRequest, { params }: { params: { toolName: string } }) {
  const { toolName } = params;
  // Try canonical name first
  let canonical = tools[toolName] ? toolName : toolAliases[toolName.toLowerCase()];
  if (!canonical || !tools[canonical]) {
    return new NextResponse("Tool not found", { status: 404 });
  }
  const tool = tools[canonical];
  return NextResponse.json({
    name: tool.name,
    description: tool.description,
    enabled: typeof tool.enabled === "undefined" ? true : tool.enabled,
    argsSchema: tool.argsSchema,
    aliases: aliasMap[tool.name] || [],
    categories: tool.categories || [],
    version: tool.version || null,
    metadata: {
      ...tool.metadata,
      timeoutMs: typeof tool.timeoutMs === "number" ? tool.timeoutMs : undefined,
      maxCallsPerSession: typeof tool.maxCallsPerSession === "number" ? tool.maxCallsPerSession : undefined,
      rateLimits: tool.rateLimits ? tool.rateLimits : undefined,
    },
  });
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