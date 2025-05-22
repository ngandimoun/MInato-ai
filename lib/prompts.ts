// FILE: lib/prompts.ts
import { appConfig } from "./config";
import { DEFAULT_USER_NAME } from "./constants";
import { tools as appToolsRegistry } from "./tools/index";
import { logger } from "@/memory-framework/config";
import { UserPersona, PredefinedPersona, WorkflowDefinition, UserState, ExtractedRelationship } from "./types";
import { BaseTool, OpenAIToolParameterProperties } from "./tools/base-tool";

function getToolDescriptionsForPlanner(toolRegistry: { [key: string]: BaseTool }): string {
    return Object.values(toolRegistry)
        .filter(tool => (tool as any).enabled !== false)
        .map(tool => {
            return `- ${tool.name}: ${tool.description.substring(0, 150)}...`;
        })
        .join("\n");
}

const MAX_TOOLS_PER_TURN = appConfig.openai.maxToolsPerTurn || 3;

export const TOOL_ROUTER_PROMPT_TEMPLATE = `You are an AI Tool Router for Minato, an AI companion for {userName}.
Your task is to analyze {userName}'s latest query and conversation history to decide which tools, if any, are needed for Minato to respond effectively.
Select up to ${MAX_TOOLS_PER_TURN} tools. If multiple tools are selected, they should ideally be executable in parallel unless there's a strict dependency.
When [Video Context] is present:
1. FIRST analyze the visual content thoroughly
2. Use tools ONLY if they can directly enhance understanding of the video
3. Valid tool types for videos:
   - ObjectIdentificationTool: Identify items/actions
   - SceneAnalysisTool: Understand settings/context
   - GenericVisualTool: General image/video processing
4. If no suitable tools, respond naturally using the video context.`;

export const RESPONSE_SYNTHESIS_PROMPT_TEMPLATE = `You are Minato, an AI companion for {userName}. Your goal is to be helpful, knowledgeable, empathetic, and proactive.`;

export const ENTITY_EXTRACTION_SCHEMA_OPENAI = {
    name: "entity_relationship_extraction_v3_strict_metadata",
    description: "Extracts key facts, entities, relationships, sentiment, topics, categories, summary, language, and reminders from user text for memory. Ensures metadata fields are present.",
    schema: {
        type: "object" as const,
        properties: {
            facts: {
                type: "array" as const,
                items: {
                    type: "string" as const
                },
                description: "Key factual statements BY or ABOUT the user. Concise, max 3-4."
            },
            entities: {
                type: "array" as const,
                items: {
                    type: "object" as const,
                    properties: {
                        name: { type: "string" as const },
                        type: { type: "string" as const },
                        language: { type: ["string", "null"] as const }
                    },
                    required: ["name", "type", "language"],
                    additionalProperties: false as const
                }
            },
            relationships: {
                type: "array" as const,
                items: {
                    type: "object" as const,
                    properties: {
                        subj: { type: "string" as const },
                        pred: { type: "string" as const },
                        obj: { type: "string" as const },
                        language: { type: ["string", "null"] as const }
                    },
                    required: ["subj", "pred", "obj", "language"],
                    additionalProperties: false as const
                }
            },
            sentiment: {
                type: ["string", "null"] as const,
                enum: ["positive", "negative", "neutral", "mixed", null]
            },
            topics: {
                type: "array" as const,
                items: { type: "string" as const }
            },
            categories: {
                type: "array" as const,
                items: { type: "string" as const }
            },
            metadata: {
                type: "object" as const,
                properties: {
                    reminder_details: {
                        type: ["object", "null"] as const,
                        properties: {
                            is_reminder: { type: "boolean" as const },
                            original_content: { type: "string" as const },
                            trigger_datetime: { type: "string" as const },
                            status: { type: "string" as const, enum: ["pending"] }
                        },
                        required: ["is_reminder", "original_content", "trigger_datetime", "status"],
                        additionalProperties: false as const
                    },
                    detected_language: { type: ["string", "null"] as const }
                },
                required: ["reminder_details", "detected_language"],
                additionalProperties: false as const
            },
            summary: { type: ["string", "null"] as const },
            detected_language: { type: ["string", "null"] as const }
        },
        required: ["facts", "entities", "relationships", "sentiment", "topics", "categories", "metadata", "summary", "detected_language"],
        additionalProperties: false as const
    }
};

export const foo = `
Ceci est une string
Ceci est du markdown dans la string
`.trim();

// DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE was empty, removing unless a new template is provided.
// export const DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE = ``;

