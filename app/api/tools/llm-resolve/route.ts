// API endpoint: POST /api/tools/llm-resolve
// Accepts { toolName: string } and returns the canonical tool name as resolved by the LLM-based resolver
import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools/index";
import { resolveToolNameWithLLM } from "@/lib/providers/llm_clients";

export async function POST(req: NextRequest) {
  try {
    const { toolName } = await req.json();
    if (!toolName || typeof toolName !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'toolName' field." }, { status: 400 });
    }
    const canonicalNames = Object.keys(tools);
    const result = await resolveToolNameWithLLM(toolName, canonicalNames);
    if (typeof result === "string") {
      // If only a string is returned, confidence is unknown
      return NextResponse.json({ resolvedToolName: result, confidence: "unknown", canonicalNames });
    }
    // If result is an object with resolved_tool_name and confidence
    return NextResponse.json({
      resolvedToolName: result.resolved_tool_name || result,
      confidence: result.confidence || "unknown",
      canonicalNames,
    });
  } catch (e) {
    return NextResponse.json({ error: "Internal error resolving tool name." }, { status: 500 });
  }
}

export function GET() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 