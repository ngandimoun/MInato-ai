// API endpoint: POST /api/tools/execute-multi
// Accepts { toolCalls: [{ toolName, arguments }], userId? } and executes all in parallel, returning results for each
import { NextRequest, NextResponse } from "next/server";
import { tools, toolAliases } from "@/lib/tools/index";
import Ajv from "ajv";

export async function POST(req: NextRequest) {
  try {
    const { toolCalls, userId = null } = await req.json();
    if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'toolCalls' array." }, { status: 400 });
    }
    const ajv = new Ajv({ allErrors: true, strict: false });
    const results = await Promise.all(toolCalls.map(async (call) => {
      const { toolName, arguments: toolArgs } = call || {};
      let canonicalName = tools[toolName] ? toolName : toolAliases[toolName];
      if (!canonicalName || !tools[canonicalName]) {
        return { toolName, error: `Tool '${toolName}' not found.`, result: null, structuredData: null };
      }
      const tool = tools[canonicalName];
      
      // Check if the tool is enabled
      if (tool.enabled === false) {
        return { 
          toolName, 
          error: `Tool '${toolName}' is currently disabled.`, 
          result: "This feature is currently unavailable. It will be available in a future upgrade.", 
          structuredData: null 
        };
      }
      
      const validate = ajv.compile(tool.argsSchema);
      const valid = validate(toolArgs || {});
      if (!valid) {
        return { toolName, error: `Invalid arguments: ${JSON.stringify(validate.errors)}`, result: null, structuredData: null };
      }
      try {
        const output = await tool.execute({ ...(toolArgs || {}), userId });
        return {
          toolName,
          result: output.result ?? null,
          error: output.error ?? null,
          structuredData: output.structuredData ?? null,
        };
      } catch (e) {
        return { toolName, error: `Execution error: ${e instanceof Error ? e.message : String(e)}`, result: null, structuredData: null };
      }
    }));
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request body or server error." }, { status: 400 });
  }
}

export function GET() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 