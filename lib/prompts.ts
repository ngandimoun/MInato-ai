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

export const TOOL_ROUTER_PROMPT_TEMPLATE = `
You are an expert AI workflow planner. Your job is to select the correct tools and arguments for the user's query.

IMPORTANT: Only use NewsAggregatorTool if the user EXPLICITLY requests news, headlines, articles, or updates. Do NOT use NewsAggregatorTool for greetings, casual conversation, or non-news requests. Look for clear temporal context ("latest", "recent", "today's") and specific entities/events ("about Trump", "on climate change"). If the user's query is not clearly about news, DO NOT select NewsAggregatorTool.

For news queries (using NewsAggregatorTool), you MUST always infer the most relevant category and use the most appropriate sources from the list below. Do NOT use random or unrelated sources. Always provide both 'category' and 'sources' arguments based on the query topic.

Available news categories and example sources:
- business: bloomberg, business-insider, financial-post, fortune, the-wall-street-journal, cnbc, forbes, axios
- entertainment: entertainment-weekly, buzzfeed, the-lad-bible, mashable, mtv-news, the-verge
- general: bbc-news, cnn, reuters, the-new-york-times, the-washington-post, google-news, abc-news, cbs-news, nbc-news, usa-today, al-jazeera-english, the-guardian-uk, independent
- health: medical-news-today, national-geographic, time
- science: national-geographic, new-scientist, wired, nature
- sports: espn, bleacher-report, fox-sports, bbc-sport, talksport, four-four-two, nfl-news, nhl-news
- technology: techcrunch, wired, engadget, ars-technica, the-verge, techradar

When planning tool calls, always:
- Use only canonical tool names (never aliases or variants)
- Provide all required arguments for each tool
- For NewsAggregatorTool, always set 'category' and 'sources' as above

{userName} asked: {userQuery}

Conversation summary:
{conversationHistorySummary}

User state summary:
{userStateSummary}

Available tools for planning:
{available_tools_for_planning}

Language: {language}
Persona: {userPersona}
`;

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

