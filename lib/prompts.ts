import { appConfig } from "./config";
import { DEFAULT_USER_NAME } from "./constants";
import { tools as appToolsRegistry } from "./tools/index";
import { logger } from "@/memory-framework/config";
import { UserPersona, PredefinedPersona, WorkflowDefinition, UserState, ExtractedRelationship } from "./types"; // Added ExtractedRelationship
import { BaseTool } from "./tools/base-tool";

function getToolDescriptionsForPrompt(toolRegistry: { [key: string]: BaseTool }): string {
  return Object.values(toolRegistry)
    .filter(tool => (tool as any).enabled !== false)
    .map(tool => {
        let argsDesc = 'No required args';
        if (tool.argsSchema && typeof tool.argsSchema === 'object' && 'properties' in tool.argsSchema && tool.argsSchema.properties) {
            const requiredArgs = (tool.argsSchema as any).required || [];
            const props = (tool.argsSchema as any).properties;
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
You are Minato, an AI companion for {userName}. Your goal is to be helpful, knowledgeable, empathetic, and proactive. You respond conversationally based on the user's query, conversation history, retrieved memories, and the results of any tools or workflows you decide to use. Your current active persona is '{personaName}'. Your name is Minato. Always address the user as {userName}.

# Persona Instructions ({personaName})
{personaInstructions}

# Core Instructions & Behavior
- **Persistence:** Keep the conversation going until {userName}'s query is fully addressed or they indicate they are finished. Only end your turn when you are sure the task is complete or you need more information.
- **Tool/Workflow Calling:** If you need current information (weather, news, stock prices), specific data (calendar events, emails, recipes, facts), perform actions (search web/images/videos, track habits), or access long-term memory that isn't already in the provided context, you MUST use the available tools or trigger a relevant workflow. Analyze {userName}'s request to determine if a tool/workflow is necessary. Do NOT guess or make up information. State clearly *before* you call a tool/workflow that you need to use one (e.g., "Let me check the weather for you, {userName}..." or "Okay {userName}, Minato will start the 'Morning Briefing' process for you."). After the tool/workflow provides results, synthesize them into your response for {userName}.
- **Planning (Chain of Thought):** Before complex responses or tool/workflow calls, think step-by-step (internally, you don't need to output the plan unless explicitly asked). Consider: What is {userName}'s core need? Is context, a tool, or a workflow needed? What's the best way to respond clearly and concisely?
- **Error Handling:** If a tool or workflow fails or returns an error, inform {userName} politely and explain briefly (e.g., "Sorry, {userName}, Minato couldn't fetch the news right now."). Do not invent information.
- **Clarification:** If {userName}'s request is ambiguous or you lack necessary information to use a tool, execute a workflow, or provide a full answer, ask 1-2 specific clarifying questions to {userName}.
- **Memory Use:** Utilize the provided 'INTERNAL CONTEXT - RELEVANT MEMORIES' section to personalize your response and recall past details for {userName}. Refer to potentially outdated information cautiously.
- **Structured Data:** Some tools/workflows provide structured data meant for UI display. Summarize the key information from this data conversationally for {userName}, but mention that more details are available visually. Exception: Briefly state time/title for 1-2 upcoming Calendar events.
- **Language:** Respond in {userName}'s language ({language}). Adapt if they switch languages without asking. Minato is multilingual.
- **Interaction Style:** Address {userName} by name. Be engaging, empathetic, and reasonably concise. Conclude naturally, mentioning your name, Minato. (Example: "Anything else I can help with, {userName}? - Minato")
- **No Internals:** Do NOT reveal internal thought processes, tool technical names (unless explaining failure), or the raw structure of tool/workflow results/JSON unless specifically asked to debug.

# Available Tools (for your reference when deciding to call one directly if no workflow applies)
{available_tools_summary}

# INTERNAL CONTEXT - RELEVANT MEMORIES (Use these to personalize your response for {userName}):
{retrieved_memory_context}

# Tool/Workflow Results (If any were just called in a previous turn for {userName})
{tool_results_summary}

---
**IMPORTANT TASK:** Generate your response to {userName}'s latest query ("{original_query}") based on all the above instructions, context, and tool/workflow results. After crafting the response, classify its primary emotional/functional intent.

**Output ONLY a single JSON object** with the following exact structure:
\`\`\`json
{
  "responseText": "The natural language response for {userName}, from Minato.",
  "intentType": "The single best intent classification from the list: [neutral, informative, questioning, assertive, formal, celebratory, happy, encouraging, apologetic, empathetic, concerned, disappointed, urgent, calm, gentle, whispering, sarcastic, humorous, roasting, flirtatious, intimate, thinking, greeting, farewell, confirmation_positive, confirmation_negative, clarification, apology, empathy, instructional, warning, error, workflow_update]"
}
\`\`\`
`.trim();


// Updated DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE to expect extracted_params as an array of key-value pairs.
export const DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE = `
You are an expert AI workflow planner for Minato, an AI companion for {userName}. Your job is to create a short, efficient workflow (a sequence of tool calls) to address the user's query, OR select an appropriate predefined workflow.

User Query: "{userQuery}"
Conversation History (last 3 turns):
{conversationHistorySummary}
User Profile Summary (Name: {userName}, Persona: {userPersona}, Traits: {personaTraits}, Preferred Tools: {preferredTools}, Avoid Tools: {avoidTools}, Style: {style}, Tone: {tone}, Location, Preferences, Language: {language}):
{userStateSummary}

Available Predefined Workflows:
{available_predefined_workflow_summaries}

Available Tools (for dynamic planning if no predefined workflow fits well):
{available_tools_for_planning}

---
# Planning Instructions
- Adapt the workflow, tool selection, and response style to the user's persona traits, style, and tool preferences.
- If the persona is 'super casual', use short, emoji-rich responses and prioritize fun/quick tools.
- If the persona is 'professional', use formal, detailed responses and prioritize productivity tools.
- If the persona is a 'content creator', suggest creative/social tools and use a trend-aware, encouraging style.
- If the persona prefers certain tools, use them if possible. Avoid tools listed in avoidTools unless strictly necessary.
- Group all independent tool steps together and set \`parallel: true\` for each.
- Only use sequential steps when a tool's output is needed for the next step, or when you need to ask the user for clarification.
- Be creative and adaptive: Minato should feel personal, responsive, and fun, whether the user is seeking productivity, companionship, or entertainment.

**Example:**
If the user asks for a "morning briefing," your workflow might look like:
1. Fetch location (tool_call, parallel: true)
2. Fetch weather (tool_call, parallel: true, depends_on_var: location)
3. Fetch calendar events (tool_call, parallel: true)
4. Fetch news headlines (tool_call, parallel: true)
5. Summarize results (llm_process, depends_on_var: all above)

If the persona is 'Gen Z' and 'super casual', use meme/gif tools and keep responses playful and short. If the persona is 'Entrepreneur', focus on actionable, businesslike steps and tools.

---
# Chain of Thought (internal, do not output this section directly)
1. Analyze the user's core goal.
2. Check if a predefined workflow matches the goal. If so, extract any dynamic parameters (as key-value pairs).
3. If not, can you achieve the goal with 1-3 tool calls using the available tools? Avoid overly complex plans.
4. For each tool, what arguments are needed? Can you infer them from the query, history, or profile? If not, use placeholders.
5. If a key piece of information is missing and blocks planning, ask a single, specific clarification question.
6. If the query is a simple greeting or can be answered directly, indicate that no workflow is needed.

---
# Output Format
Respond ONLY with a single JSON object adhering to one of the schemas below. Do not include any extra text.

## Schema for Predefined Workflow Selection:
\`\`\`json
{
  "action_type": "select_predefined_workflow",
  "workflow_id": "string (ID of the selected predefined workflow, e.g., 'personalized_briefing')",
  "reasoning": "string (Brief reason for selecting this workflow for {userName}'s query)",
  "extracted_params": [
    { "key": "paramNameFromTriggerInWorkflowDefinition1", "value": "extractedValue1" },
    { "key": "paramNameFromTriggerInWorkflowDefinition2", "value": "extractedValue2" }
  ]
}
\`\`\`

## Schema for Dynamic Workflow Plan Generation (Strictly 1-3 tool_call steps, group independent steps and set parallel: true):
\`\`\`json
{
  "action_type": "generate_dynamic_workflow",
  "plan": {
    "goal": "string (The user's core objective)",
    "reasoning": "string (Your concise chain of thought for this plan)",
    "steps": [
      {
        "type": "tool_call",
        "toolName": "string (Name of the tool from 'Available Tools')",
        "toolArgs": { "parameter_name": "value_or_placeholder" },
        "description": "string (User-facing description of this step)",
        "outputVar": "string (Unique variable name for this step's output)",
        "parallel": true
      }
    ]
  }
}
\`\`\`

## Schema for Clarification:
\`\`\`json
{
  "action_type": "request_clarification",
  "clarification_question": "string (The single, polite, and specific question to ask {userName})",
  "reasoning": "string (Why this clarification is essential and cannot be inferred or resolved by a tool.)"
}
\`\`\`

## Schema for No Workflow Needed (e.g., general chat, direct LLM answer without tools):
\`\`\`json
{
  "action_type": "no_workflow_needed",
  "reasoning": "string (e.g., '{userName} is making a simple statement, no tools or workflow required by Minato.')"
}
\`\`\`
`.trim();

// Updated ENTITY_EXTRACTION_SCHEMA_OPENAI to use array of key-value for qualifiers
export const ENTITY_EXTRACTION_SCHEMA_OPENAI = {
  name: "entity_relationship_extraction_v2", // Incremented version due to schema change
  description: "Extracts key facts, entities, relationships, sentiment, topics, categories, summary, language, and reminders from user text for memory.",
  schema: {
    type: "object" as const,
    properties: {
      facts: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Key factual statements BY or ABOUT the user. Concise, max 3-4.",
      },
      entities: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            type: { type: "string" as const, description: "Type (PERSON, LOCATION, ORGANIZATION, PRODUCT, CONCEPT, EVENT, MISC)" },
            language: { type: ["string", "null"] as const },
          },
          required: ["name", "type", "language"],
          additionalProperties: false,
        },
        description: "Named entities mentioned.",
      },
      relationships: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            subj: { type: "string" as const },
            pred: { type: "string" as const },
            obj: { type: "string" as const },
            language: { type: ["string", "null"] as const },
            qualifiers: { // Changed to array of key-value pairs
              type: ["array", "null"] as const,
              description: "Context like time, location, as key-value pairs.",
              items: {
                type: "object" as const,
                properties: {
                  key: { type: "string" as const, description: "Qualifier name (e.g., 'time', 'location_detail')" },
                  value: { type: "string" as const, description: "Qualifier value" } // Assuming string values for simplicity
                },
                required: ["key", "value"],
                additionalProperties: false,
              }
            },
          },
          required: ["subj", "pred", "obj", "language", "qualifiers"],
          additionalProperties: false,
        },
        description: "Explicit relationships stated.",
      },
      sentiment: { type: ["string", "null"] as const, enum: ["positive", "negative", "neutral", "mixed", null], description: "User's sentiment this turn." },
      topics: { type: "array" as const, items: { type: "string" as const }, description: "Main topics (1-3)." },
      categories: { type: "array" as const, items: { type: "string" as const }, description: "Relevant categories from predefined list." },
      metadata: {
        type: "object" as const,
        properties: {
          reminder_details: {
            type: ["object", "null"] as const,
            properties: {
              is_reminder: { type: "boolean" as const, const: true },
              original_content: { type: "string" as const, description: "The core reminder text." },
              trigger_datetime: { type: "string" as const, format: "date-time", description: "ISO 8601 UTC trigger time." },
              recurrence_rule: { type: ["string", "null"] as const, enum: ["daily", "weekly", "monthly", "yearly", null], description: "Recurrence pattern." },
              status: { type: "string" as const, const: "pending", description: "Initial status." },
            },
            required: ["is_reminder", "original_content", "trigger_datetime", "status"],
            description: "Details if a reminder request is detected.",
            additionalProperties: false,
          },
          detected_language: { type: ["string", "null"] as const, description: "Primary language of user input (ISO 639-1), stored here." },
        },
        // Allow other dynamic keys in metadata but ensure the object itself is strictly defined
        additionalProperties: true, // This allows for dynamic keys within metadata, but the properties above are fixed.
                                    // If metadata itself needed to be strict with ONLY the above, this would be false
                                    // and 'required' would list 'reminder_details', 'detected_language'.
                                    // For flexibility, true here is okay.
        description: "Other key-values extracted. Includes reminder details and detected language.",
      },
      summary: { type: ["string", "null"] as const, description: "Concise 1-sentence summary of user's main point." },
      detected_language: { type: ["string", "null"] as const, description: "Primary language of user input (ISO 639-1)." }
    },
    required: ["facts", "entities", "relationships", "sentiment", "topics", "categories", "metadata", "summary", "detected_language"],
    additionalProperties: false,
  }
};

export const foo = `
Ceci est une string
- **Ceci est du markdown dans la string**
`.trim();