// API endpoint: GET /api/tools/metadata/versions
// Returns metadata for each tool version: version, count, and tool names (for analytics/debugging/UX)
import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools/index";

export async function GET(_req: NextRequest) {
  const versionMap: { [version: string]: { tools: string[] } } = {};
  Object.values(tools).forEach(tool => {
    const version = tool.version || "unknown";
    if (!versionMap[version]) versionMap[version] = { tools: [] };
    versionMap[version].tools.push(tool.name);
  });
  const result = Object.entries(versionMap).map(([version, data]) => ({
    version,
    count: data.tools.length,
    tools: data.tools,
  }));
  return NextResponse.json(result);
}

export function POST() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 