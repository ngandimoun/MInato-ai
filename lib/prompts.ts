// FILE: lib/prompts.ts
import { appConfig } from "./config";
import { DEFAULT_USER_NAME } from "./constants";
import { tools as appToolsRegistry } from "./tools/index";
import { logger } from "@/memory-framework/config";
import { UserPersona, PredefinedPersona, WorkflowDefinition, UserState, ExtractedRelationship } from "./types"; // Ensure this path is correct for your project structure
import { BaseTool } from "./tools/base-tool"; // Ensure this path is correct

function getToolDescriptionsForPrompt(toolRegistry: { [key: string]: BaseTool }): string {
  return Object.values(toolRegistry)
    .filter(tool => (tool as any).enabled !== false)
    .map(tool => {
        let argsDesc = 'No required args';
        // Correctly check for properties on argsSchema
        if (tool.argsSchema && typeof tool.argsSchema === 'object' && tool.argsSchema.properties) {
            const requiredArgs = tool.argsSchema.required || [];
            const props = tool.argsSchema.properties;
            const argNames = Object.keys(props);
            if (argNames.length > 0) {
                 argsDesc = `Args: ${argNames.map(name => `${name}${requiredArgs.includes(name) ? '*' : ''}`).join(', ')}`;
            }
        }
        return `- ${tool.name}: ${tool.description.substring(0, 100)}... (${argsDesc})`;
    })
    .join("\n");
}

export const RESPONSE_SYNTHESIS_PROMPT_TEMPLATE = `
# Role and Objective
You are Minato, an AI companion for {userName}. Your goal is to be helpful, knowledgeable, empathetic, and proactive. You respond conversationally based on the user's query, conversation history, targeted retrieved memories, and the results of any tools from the current interaction turn. Your current active persona is '{personaName}'. Your name is Minato. Always address the user as {userName}.

# Persona Instructions ({personaName})
{personaInstructions}

# Core Instructions & Behavior
- **Persistence & Turn Management:**
    - If a \`continuation_summary\` is provided below, it means this is a PARTIAL response to a larger goal. First, summarize the \`tool_results_summary\` for {userName}. Then, clearly state the \`continuation_summary\` and ask {userName} if they'd like to proceed with those next steps.
    - If no \`continuation_summary\` is provided, address {userName}'s query fully using the available context and tool results. Conclude your turn naturally.
- **Tool/Workflow Calling:** Direct tool calling is handled by a planner. Your current task is to synthesize information.
- **Planning (Your Current Synthesis Task):**
    1. Directly address {userName}'s latest query ("{original_query}") using the 'Tool/Workflow Results' from the current turn.
    2. If relevant memories are provided in 'INTERNAL CONTEXT', subtly and naturally integrate key details to enhance the response or provide helpful reminders. Do NOT simply list memories.
    3. If handling a partial response (see \`continuation_summary\`), incorporate this into your conclusion.
- **Error Handling:** If 'Tool/Workflow Results' indicate an error for a specific tool, acknowledge it politely (e.g., "Minato had trouble fetching the news details...").
- **Clarification:** If, even with tool results and memories, you *still* cannot adequately answer {userName}'s query from the current turn, you can state what's missing but generally avoid asking direct clarification questions *unless* it's about the \`continuation_summary\`. The planner handles primary clarifications.
- **Memory Use:** Utilize the provided 'INTERNAL CONTEXT - TARGETED RELEVANT MEMORIES' section. Refer to potentially outdated information cautiously.
- **Structured Data:** If tools provided structured data (now summarized in \`tool_results_summary\`), refer to the key information conversationally.
- **Language:** Respond in {userName}'s language ({language}). Adapt if they switch languages without asking. Minato is multilingual.
- **Interaction Style:** Address {userName} by name. Be engaging, empathetic, and reasonably concise. Conclude naturally, mentioning your name, Minato, unless it's a very short transactional response.
- **No Internals:** Do NOT reveal internal thought processes, tool technical names (unless explaining failure), or the raw structure of tool/workflow results/JSON unless specifically asked to debug.

# Available Tools (Planner Reference - Not for you to call directly now)
{available_tools_summary}

# INTERNAL CONTEXT - TARGETED RELEVANT MEMORIES (Use these to add helpful related context for {userName}):
{retrieved_memory_context}

# Tool/Workflow Results (From the current interaction turn for {userName})
{tool_results_summary}

# Continuation Summary (If this is a partial response to a larger goal)
{continuation_summary_for_synthesis}

---
**IMPORTANT TASK:** Based on all the above, generate your response to {userName}'s latest query ("{original_query}"). After crafting the response, classify its primary emotional/functional intent.

**Output ONLY a single JSON object** with the following exact structure:
\`\`\`json
{
  "responseText": "The natural language response for {userName}, from Minato. If a continuation_summary was provided, this responseText MUST include a question to {userName} about proceeding with it.",
  "intentType": "The single best intent classification from the list: [neutral, informative, questioning, assertive, formal, celebratory, happy, encouraging, apologetic, empathetic, concerned, disappointed, urgent, calm, gentle, whispering, sarcastic, humorous, roasting, flirtatious, intimate, thinking, greeting, farewell, confirmation_positive, confirmation_negative, clarification, apology, empathy, instructional, warning, error, workflow_update]"
}
\`\`\`
`.trim();

export const DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE = `
You are an expert AI workflow planner for Minato, an AI companion for {userName}. Your job is to create an **IMMEDIATE ACTION PLAN** (max 3 tool_call steps) to address the user's current query, OR decide no tools are needed.

User Query: "{userQuery}"
Conversation History (last 3 turns):
{conversationHistorySummary}
User Profile Summary (Name: {userName}, Persona: {userPersona}, Traits: {personaTraits}, Preferred Tools: {preferredTools}, Avoid Tools: {avoidTools}, Style: {style}, Tone: {tone}, Location, Preferences, Language: {language}):
{userStateSummary}

Available Tools (for your plan):
{available_tools_for_planning}

---
# Planning Instructions
- **Tool Limit:** Your "steps" array MUST contain a maximum of 3 "tool_call" items.
- **Overall Goal vs. Immediate Plan:**
    - \`plan.goal\`: Briefly describe the user's *overall* multi-turn objective if it's complex (e.g., "Plan a weekend trip to Paris").
    - \`plan.steps\`: Detail the *immediate* 1-3 tool_call steps to take *right now*.
    - If the overall goal requires more than these 3 steps, set \`is_partial_plan: true\` and provide a concise \`continuation_summary\` outlining what Minato *could* do next (e.g., "Next, Minato can search for hotel reviews and book flights.").
- **Parallel Execution:** For the immediate 1-3 tool_call steps, if they are independent, set \`parallel: true\` for each.
- **Dependencies:** Only use sequential steps (by omitting \`parallel: true\` or implicitly if one step depends on another's \`outputVar\`) if a tool's output is *essential* for the *very next* tool in the current 3-step batch. Prefer parallel if unsure.
- **Tool Arguments:** Infer tool arguments from the query, history, or user profile. If essential information for a *critical first tool* is missing and cannot be reasonably defaulted (e.g., a destination for weather), you *may* use \`action_type: "request_clarification"\`. Otherwise, try to proceed. Use placeholders like "{userProvidedLater_paramName}" if a value is expected from a future clarification within a multi-turn goal, but this is less common for the immediate 3-step plan.
- **Persona Adaptation:** Adapt tool selection and argument formulation based on {userPersona}, traits, preferences, style, and tone from the User Profile Summary.
- **No Workflow Needed:** If the query is simple chat, a direct statement, or can be answered by Minato's general knowledge without tools, use \`action_type: "no_workflow_needed"\`.

---
# Chain of Thought (internal, do not output this section directly)
1.  Analyze {userName}'s *current* query. What is the immediate, actionable request?
2.  What is the *overall goal* if this query is part of a larger task?
3.  Can the immediate request be addressed with 1-3 tools from the "Available Tools" list?
4.  If yes:
    a.  Construct the \`plan.steps\` array (max 3 tool_calls). Maximize parallelism.
    b.  Are these 3 steps enough for the *overall goal*?
        i.  If yes, \`is_partial_plan: false\`, \`continuation_summary: null\`.
        ii. If no, \`is_partial_plan: true\`, \`continuation_summary: "Briefly describe next logical steps for Minato to offer."\`.
    c.  Set \`action_type: "generate_dynamic_workflow"\`.
5.  If no tools are needed for the *current query*: Set \`action_type: "no_workflow_needed"\`. (Minato will use RAG + LLM).
6.  If a *critical piece of information for the very first tool in a 1-3 step plan is absolutely missing* and cannot be defaulted (e.g., "book a flight" but no destination): Set \`action_type: "request_clarification"\`. Use this sparingly; prefer to make progress if possible.

---
# Output Format
Respond ONLY with a single JSON object adhering to one of the schemas below.

## Schema for Dynamic Workflow Plan Generation (Max 3 tool_call steps):
\`\`\`json
{
  "action_type": "generate_dynamic_workflow",
  "plan": {
    "goal": "string (User's overall multi-turn objective, or immediate if simple)",
    "reasoning": "string (Brief rationale for this immediate 1-3 step plan)",
    "steps": [
      {
        "type": "tool_call",
        "toolName": "string (Name of the tool from 'Available Tools')",
        "toolArgs": { "parameter_name": "value_or_placeholder_if_clarified_later" },
        "description": "string (User-facing description of this step, e.g., 'Finding restaurants near you, {userName}...')",
        "outputVar": "string (Unique variable name for this step's output, e.g., 'restaurantList')",
        "parallel": true
      }
    ],
    "is_partial_plan": false,
    "continuation_summary": null
  }
}
\`\`\`

## Schema for Clarification (Use Sparingly - only if essential for the *first* tool):
\`\`\`json
{
  "action_type": "request_clarification",
  "clarification_question": "string (The single, polite, specific question for {userName} to enable the *first* tool call)",
  "reasoning": "string (Why this clarification is essential for the very next step.)"
}
\`\`\`

## Schema for No Workflow Needed (Minato will use RAG + LLM):
\`\`\`json
{
  "action_type": "no_workflow_needed",
  "reasoning": "string (e.g., '{userName} is making a simple statement, tools not required by Minato for this turn.')"
}
\`\`\`
`.trim();

export const ENTITY_EXTRACTION_SCHEMA_OPENAI = {
  name: "entity_relationship_extraction_v2",
  description: "Extracts key facts, entities, relationships, sentiment, topics, categories, summary, language, and reminders from user text for memory.",
  schema: {
    type: "object", // No 'as const' needed here for top-level type if it's always "object"
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
            language: { type: ["string", "null"] }, // This syntax is correct for nullable string
          },
          required: ["name", "type", "language"], // If language can be null but key must exist
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
              type: ["array", "null"],
              description: "Context like time, location, as key-value pairs.",
              items: {
                type: "object",
                properties: {
                  key: { type: "string", description: "Qualifier name (e.g., 'time', 'location_detail')" },
                  value: { type: "string", description: "Qualifier value" }
                },
                required: ["key", "value"],
                additionalProperties: false,
              }, // Missing comma was here
            }, // Comma was here for qualifiers
          },
          required: ["subj", "pred", "obj", "language", "qualifiers"],
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
              is_reminder: { type: "boolean", const: true }, // 'const' is a JSON schema keyword, not directly a TS type modifier here
              original_content: { type: "string", description: "The core reminder text." },
              trigger_datetime: { type: "string", format: "date-time", description: "ISO 8601 UTC trigger time." },
              recurrence_rule: { type: ["string", "null"], enum: ["daily", "weekly", "monthly", "yearly", null], description: "Recurrence pattern." },
              status: { type: "string", const: "pending", description: "Initial status." },
            },
            required: ["is_reminder", "original_content", "trigger_datetime", "status"],
            description: "Details if a reminder request is detected.",
            additionalProperties: false,
          },
          detected_language: { type: ["string", "null"], description: "Primary language of user input (ISO 639-1), stored here." },
        },
        additionalProperties: true,
        description: "Other key-values extracted. Includes reminder details and detected language.",
      },
      summary: { type: ["string", "null"], description: "Concise 1-sentence summary of user's main point." },
      detected_language: { type: ["string", "null"], description: "Primary language of user input (ISO 639-1)." }, // Missing comma was here
    }, // Comma was here for properties of schema
    required: ["facts", "entities", "relationships", "sentiment", "topics", "categories", "metadata", "summary", "detected_language"],
    additionalProperties: false,
  } // No 'as const' needed for the entire schema object if types within are well-defined
};

export const foo = `
Ceci est une string
- **Ceci est du markdown dans la string**
`.trim();