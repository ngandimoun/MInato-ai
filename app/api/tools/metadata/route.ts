// API endpoint: GET /api/tools/metadata
// Returns global tool stats: total count, enabled/disabled counts, versions (with counts), categories (with counts)
import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools/index";

export async function GET(_req: NextRequest) {
  const allTools = Object.values(tools);
  const total = allTools.length;
  let enabled = 0, disabled = 0;
  const versionCounts: { [version: string]: number } = {};
  const categoryCounts: { [category: string]: number } = {};

  allTools.forEach(tool => {
    const isEnabled = typeof tool.enabled === "undefined" ? true : tool.enabled;
    if (isEnabled) enabled++; else disabled++;
    if (tool.version) {
      versionCounts[tool.version] = (versionCounts[tool.version] || 0) + 1;
    }
    if (Array.isArray(tool.categories)) {
      tool.categories.forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    }
  });

  return NextResponse.json({
    total,
    enabled,
    disabled,
    versions: Object.entries(versionCounts).map(([version, count]) => ({ version, count })),
    categories: Object.entries(categoryCounts).map(([category, count]) => ({ category, count })),
  });
}

export function POST() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 