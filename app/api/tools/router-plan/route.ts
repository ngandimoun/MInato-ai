// API endpoint: POST /api/tools/router-plan
// Accepts { userQuery, history?, userId? } and returns the LLM's planned tool calls (for debugging/planning)
import { NextRequest, NextResponse } from "next/server";
import { Orchestrator } from "@/lib/core/orchestrator";
import { TOOL_ROUTER_PROMPT_TEMPLATE } from "@/lib/prompts";
import { generateStructuredJson } from "@/lib/providers/llm_clients";
import { appConfig } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const { userQuery, history = [], userId = null } = await req.json();
    if (!userQuery || typeof userQuery !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'userQuery' field." }, { status: 400 });
    }
    // Prepare prompt for tool router
    const orchestrator = new Orchestrator();
    const prompt = TOOL_ROUTER_PROMPT_TEMPLATE.replace("{userQuery}", userQuery);
    const routerSchema = {
      type: "object",
      properties: {
        planned_tools: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tool_name: { type: "string" },
              arguments: { type: "object", additionalProperties: true, properties: {} },
              reason: { type: "string" },
            },
            required: ["tool_name", "reason", "arguments"],
            additionalProperties: false,
          },
        },
      },
      required: ["planned_tools"],
      additionalProperties: false,
    };
    const routerResult = await generateStructuredJson(
      prompt,
      userQuery,
      routerSchema,
      "tool_router_v1_1",
      history,
      appConfig.openai.planningModel,
      userId
    );
    if (routerResult && typeof routerResult === 'object' && 'error' in routerResult) {
      return NextResponse.json({ error: routerResult.error }, { status: 500 });
    }
    return NextResponse.json({
      planned_tools: (routerResult && typeof routerResult === 'object' && 'planned_tools' in routerResult) ? routerResult.planned_tools : [],
      raw: routerResult,
    });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request body or server error." }, { status: 400 });
  }
}

export function GET() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function PUT() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); }
export function DELETE() { return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 }); } 