// API endpoint: GET /api/tools/categories
// Returns a JSON array of all unique tool categories (with optional count of tools per category)
import { NextRequest, NextResponse } from "next/server";
import { tools } from "@/lib/tools/index";

export async function GET(_req: NextRequest) {
  const categoryCounts: { [category: string]: number } = {};
  Object.values(tools).forEach(tool => {
    if (Array.isArray(tool.categories)) {
      tool.categories.forEach(cat => {
        if (!categoryCounts[cat]) categoryCounts[cat] = 0;
        categoryCounts[cat]++;
      });
    }
  });
  // Return as array of { category, count }
  const categories = Object.entries(categoryCounts).map(([category, count]) => ({ category, count }));
  return NextResponse.json(categories);
}

export function POST() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 