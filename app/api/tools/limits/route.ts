// API endpoint: GET /api/tools/limits
// Returns all key orchestration/tooling limits (maxToolsPerTurn, toolTimeoutMs, maxTokens, maxVisionTokens, maxVideoFrames, maxVideoSizeBytes)
import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { tools } from "@/lib/tools/index";

export async function GET(_req: NextRequest) {
  const openai = appConfig.openai;
  // Build per-tool limits
  const perTool: Record<string, { timeoutMs?: number; maxCallsPerSession?: number; rateLimits?: { perMinute?: number; perHour?: number; perDay?: number } }> = {};
  for (const [name, tool] of Object.entries(tools)) {
    perTool[name] = {};
    if (typeof tool.timeoutMs === 'number') perTool[name].timeoutMs = tool.timeoutMs;
    if (typeof tool.maxCallsPerSession === 'number') perTool[name].maxCallsPerSession = tool.maxCallsPerSession;
    if (tool.rateLimits) perTool[name].rateLimits = tool.rateLimits;
  }
  return NextResponse.json({
    maxToolsPerTurn: openai.maxToolsPerTurn,
    toolTimeoutMs: appConfig.toolTimeoutMs,
    maxTokens: openai.maxTokens,
    maxVisionTokens: openai.maxVisionTokens,
    maxVideoFrames: (appConfig.openai as any).maxVideoFrames ?? null,
    maxVideoSizeBytes: (appConfig.openai as any).maxVideoSizeBytes ?? null,
    perTool,
  });
}

export function POST() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 