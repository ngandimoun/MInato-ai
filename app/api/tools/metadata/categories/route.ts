// API endpoint: GET /api/tools/metadata/categories
// Returns metadata for each tool category: name, count, tool names, and example descriptions (for UI/LLM prompt engineering)
import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools/index";

export async function GET(_req: NextRequest) {
  const categoryMap: { [category: string]: { tools: string[]; descriptions: string[] } } = {};
  Object.values(tools).forEach(tool => {
    if (Array.isArray(tool.categories)) {
      tool.categories.forEach(cat => {
        if (!categoryMap[cat]) categoryMap[cat] = { tools: [], descriptions: [] };
        categoryMap[cat].tools.push(tool.name);
        categoryMap[cat].descriptions.push(tool.description);
      });
    }
  });
  const result = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    count: data.tools.length,
    tools: data.tools,
    exampleDescriptions: data.descriptions.slice(0, 3), // Up to 3 example descriptions
  }));
  return NextResponse.json(result);
}

export function POST() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 