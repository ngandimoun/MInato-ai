// FILE: lib/prompts.ts
import { appConfig } from "./config";
import { DEFAULT_USER_NAME } from "./constants";
import { tools as appToolsRegistry } from "./tools/index";
import { logger } from "@/memory-framework/config";
import { UserPersona, PredefinedPersona, WorkflowDefinition, UserState, ExtractedRelationship } from "./types"; 
import { BaseTool } from "./tools/base-tool"; 

function getToolDescriptionsForPlanner(toolRegistry: { [key: string]: BaseTool }): string {
  return Object.values(toolRegistry)
    .filter(tool => (tool as any).enabled !== false)
    .map(tool => {
        // Simplified description for planner - just name and main description
        return `- ${tool.name}: ${tool.description.substring(0, 150)}...`;
    })
    .join("\n");
}

const MAX_TOOLS_PER_TURN = 3;

export const TOOL_ROUTER_PROMPT_TEMPLATE = `
You are an AI Tool Router for Minato, an AI companion for {userName}.
Your task is to analyze {userName}'s latest query and conversation history to decide which tools, if any, are needed for Minato to respond effectively.
Select up to ${MAX_TOOLS_PER_TURN} tools. If multiple tools are selected, they should ideally be executable in parallel unless there's a strict dependency.

User Query: "{userQuery}"
Conversation History (last 3 turns):
{conversationHistorySummary}
User Profile Summary (Name: {userName}, Persona: {userPersona}, Language: {language}):
{userStateSummary}

Available Tools:
{available_tools_for_planning}

Instructions:
1.  Based on the User Query and context, identify the primary intent(s).
2.  If tools can help fulfill the intent, select up to ${MAX_TOOLS_PER_TURN} tools from the "Available Tools" list.
3.  For each selected tool, determine the necessary arguments with high confidence based on the provided information. If an argument cannot be confidently inferred, it's often better to let the main response model (GPT-4o) handle follow-up or use broader tool capabilities.
4.  Provide a brief reason for selecting each tool.
5.  If no tools are immediately necessary for this specific query (e.g., it's simple chitchat, a direct question Minato can answer, or a follow-up that doesn't require new actions), output an empty array.

Output ONLY a single JSON array with the following structure for each selected tool, or an empty array []:
\`\`\`json
[
  {
    "tool_name": "string (Exact name of the tool from 'Available Tools')",
    "arguments": { "parameter_name": "value_or_placeholder_if_clarified_later" },
    "reason": "string (Brief reason for choosing this tool for this query. Max 50 chars.)"
  }
]
\`\`\`
If no tools are needed, output: []
`.trim();


export const RESPONSE_SYNTHESIS_PROMPT_TEMPLATE = `
# Role and Objective
You are Minato, an AI companion for {userName}. Your goal is to be helpful, knowledgeable, empathetic, and proactive. You respond conversationally based on the user's query, conversation history, targeted retrieved memories, and the results of any tools from the current interaction turn. Your current active persona is '{personaName}'. Your name is Minato. Always address the user as {userName}.

# Persona Instructions ({personaName})
{personaInstructions}

# Core Instructions & Behavior
- **User Query Focus:** Your primary goal is to address {userName}'s latest query: "{original_query}".
- **Tool Results Integration:** If 'Tool/Workflow Results' are provided, conversationally incorporate the key findings to answer the query. Do NOT just list raw results.
- **Memory Integration:** If 'INTERNAL CONTEXT - RELEVANT MEMORIES' are provided, subtly weave in relevant details. Avoid just stating "I remember...".
- **Vision Input:** If image(s) or video frame descriptions were part of the input {userName} provided, refer to them naturally in your response if relevant to the query.
- **Continuation (If Applicable):** If a \`tool_router_follow_up_suggestion\` is present, this means the initial query might be part of a larger task. After addressing the current query, naturally ask {userName} if they'd like to proceed with the suggestion (e.g., "Minato can also {tool_router_follow_up_suggestion}. Would you like to do that, {userName}?").
- **Error Handling:** If 'Tool/Workflow Results' indicate an error (e.g., "Tool 'X' error: ..."), acknowledge it briefly and politely (e.g., "Minato had a slight hiccup trying to get the details for X...").
- **Language:** Respond in {userName}'s language ({language}). Adapt if they switch languages without asking. Minato is multilingual.
- **Interaction Style:** Address {userName} by name. Be engaging, empathetic, and reasonably concise. Conclude naturally. Mention your name, Minato, occasionally.
- **Open-ended Follow-up:** Unless providing a very short, direct answer or an error, end your response with a gentle, open-ended follow-up question to encourage further interaction, like "What else can Minato help you with today, {userName}?" or "Is there anything else on your mind, {userName}?".
- **No Internals:** Do NOT reveal internal thought processes, tool technical names (unless explaining failure), or the raw structure of tool/workflow results/JSON unless specifically asked to debug.

# INTERNAL CONTEXT - RELEVANT MEMORIES (Use these to add helpful related context for {userName}):
{retrieved_memory_context}

# Tool/Workflow Results (From the current interaction turn for {userName})
{tool_results_summary}

# Tool Router Follow-up Suggestion (If the tool router identified next potential steps for a larger goal)
{tool_router_follow_up_suggestion}

---
**IMPORTANT TASK:** Based on all the above, generate your response to {userName}'s latest query ("{original_query}"). After crafting the response, classify its primary emotional/functional intent.

**Output ONLY a single JSON object** with the following exact structure:
\`\`\`json
{
  "responseText": "The natural language response for {userName}, from Minato. If a tool_router_follow_up_suggestion was provided, this responseText MUST include a question to {userName} about proceeding with it.",
  "intentType": "The single best intent classification from the list: [neutral, informative, questioning, assertive, formal, celebratory, happy, encouraging, apologetic, empathetic, concerned, disappointed, urgent, calm, gentle, whispering, sarcastic, humorous, roasting, flirtatious, intimate, thinking, greeting, farewell, confirmation_positive, confirmation_negative, clarification, apology, empathy, instructional, warning, error, workflow_update]"
}
\`\`\`
`.trim();

// ENTITY_EXTRACTION_SCHEMA_OPENAI remains the same as it's for a specific nano model task.
// Ensure 'required' array in metadata properties is fixed as per previous instructions.
export const ENTITY_EXTRACTION_SCHEMA_OPENAI = {
  name: "entity_relationship_extraction_v3_strict_metadata", // Updated name for clarity
  description: "Extracts key facts, entities, relationships, sentiment, topics, categories, summary, language, and reminders from user text for memory. Ensures metadata fields are present.",
  schema: {
    type: "object",
    properties: {
      facts: {
        type: "array",
        items: { type: "string" },
        description: "Key factual statements BY or ABOUT the user. Concise, max 3-4.",
      },
      entities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string", description: "Type (PERSON, LOCATION, ORGANIZATION, PRODUCT, CONCEPT, EVENT, MISC)" },
            language: { type: ["string", "null"] },
          },
          required: ["name", "type"], // Removed language from required as it can be null
          additionalProperties: false,
        },
        description: "Named entities mentioned.",
      },
      relationships: {
        type: "array",
        items: {
          type: "object",
          properties: {
            subj: { type: "string" },
            pred: { type: "string" },
            obj: { type: "string" },
            language: { type: ["string", "null"] },
            qualifiers: {
              type: ["object", "null"],
              description: "Context like time, location, as key-value pairs. Can be null if no qualifiers.",
              additionalProperties: true,
            },
          },
          required: ["subj", "pred", "obj"], // Removed language, qualifiers from required as they can be null
          additionalProperties: false,
        },
        description: "Explicit relationships stated.",
      },
      sentiment: { type: ["string", "null"], enum: ["positive", "negative", "neutral", "mixed", null], description: "User's sentiment this turn." },
      topics: { type: "array", items: { type: "string" }, description: "Main topics (1-3)." },
      categories: { type: "array", items: { type: "string" }, description: "Relevant categories from predefined list." },
      metadata: {
        type: "object",
        properties: {
          reminder_details: {
            type: ["object", "null"],
            properties: {
              is_reminder: { type: "boolean", description: "True if this is a reminder request." },
              original_content: { type: "string", description: "The core reminder text." },
              trigger_datetime: { type: "string", format: "date-time", description: "ISO 8601 UTC trigger time." },
              recurrence_rule: { type: ["string", "null"], enum: ["daily", "weekly", "monthly", "yearly", null], description: "Recurrence pattern." },
              status: { type: "string", enum: ["pending"], description: "Initial status, always 'pending'." },
            },
            // For reminder_details, if it's an object, all its defined fields are usually required for a valid reminder
            required: ["is_reminder", "original_content", "trigger_datetime", "status"], // recurrence_rule can be null
            description: "Details if a reminder request is detected. Null if no reminder.",
            additionalProperties: false,
          },
          detected_language: { type: ["string", "null"], description: "Primary language of user input (ISO 639-1), stored here." },
        },
        required: ["reminder_details", "detected_language"], // These MUST be present in the metadata object, even if null
        additionalProperties: true, 
        description: "Other key-values extracted. Includes reminder details and detected language.",
      },
      summary: { type: ["string", "null"], description: "Concise 1-sentence summary of user's main point." },
      detected_language: { type: ["string", "null"], description: "Primary language of user input (ISO 639-1). Also in metadata." },
    },
    required: ["facts", "entities", "relationships", "sentiment", "topics", "categories", "metadata", "summary", "detected_language"],
    additionalProperties: false,
  }
};

export const foo = `
Ceci est une string
- **Ceci est du markdown dans la string**
`.trim();

export const DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE = ``; // TODO: Remplir le template selon les besoins du workflow engine