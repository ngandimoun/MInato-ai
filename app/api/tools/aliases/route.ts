// API endpoint: GET /api/tools/aliases
// Returns a JSON object mapping each canonical tool name to an array of all its known aliases (including the canonical name itself)
import { NextRequest, NextResponse } from "next/server";
import { tools, toolAliases } from "@/lib/tools/index";

export async function GET(_req: NextRequest) {
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
  return NextResponse.json(aliasMap);
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