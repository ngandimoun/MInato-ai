// API endpoint: GET /api/tools/metadata/providers
// Returns metadata for each provider: provider name, count, and tool names (for analytics, UI, auditing)
import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools/index";

export async function GET(_req: NextRequest) {
  const providerMap: { [provider: string]: { tools: string[] } } = {};
  Object.values(tools).forEach(tool => {
    const provider = tool.metadata?.provider || "unknown";
    if (!providerMap[provider]) providerMap[provider] = { tools: [] };
    providerMap[provider].tools.push(tool.name);
  });
  const result = Object.entries(providerMap).map(([provider, data]) => ({
    provider,
    count: data.tools.length,
    tools: data.tools,
  }));
  return NextResponse.json(result);
}

export function POST() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 