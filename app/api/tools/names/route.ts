// API endpoint: GET /api/tools/names
// Returns all canonical tool names and all known aliases (for UI/LLM prompt engineering)
import { NextRequest, NextResponse } from "next/server";
import { tools, toolAliases } from "@/lib/tools/index";

export async function GET(_req: NextRequest) {
  const canonicalNames = Object.keys(tools);
  return NextResponse.json({
    canonicalNames,
    aliases: toolAliases,
  });
}

export function POST() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 