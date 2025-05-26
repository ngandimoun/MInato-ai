// API endpoint: POST /api/tools/validate
// Validates tool arguments against the tool's argsSchema. Returns { valid, errors, expectedSchema }.
import { NextRequest, NextResponse } from "next/server";
import { tools, toolAliases } from "@/lib/tools/index";
import Ajv from "ajv";

export async function POST(req: NextRequest) {
  try {
    const { toolName, arguments: toolArgs } = await req.json();
    if (!toolName || typeof toolName !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'toolName' field." }, { status: 400 });
    }
    // Resolve canonical name
    let canonicalName = tools[toolName] ? toolName : toolAliases[toolName];
    if (!canonicalName || !tools[canonicalName]) {
      return NextResponse.json({ error: `Tool '${toolName}' not found.` }, { status: 404 });
    }
    const tool = tools[canonicalName];
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(tool.argsSchema);
    const valid = validate(toolArgs || {});
    return NextResponse.json({
      valid,
      errors: valid ? null : validate.errors,
      expectedSchema: tool.argsSchema,
    });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request body or server error." }, { status: 400 });
  }
}

export function GET() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 