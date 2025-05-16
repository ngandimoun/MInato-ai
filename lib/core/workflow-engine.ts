// lib/core/workflow_engine.ts

import {
  WorkflowDefinition,
  WorkflowStep,
  ToolCallStep,
  LLMProcessStep,
  ClarificationQueryStep,
  DynamicWorkflowPlan,
  WorkflowState,
  ChatMessage,
  AnyToolStructuredData,
  OpenAIPlanningModel,
  OpenAILLMFast,
  UserState,
  OrchestratorResponse,
  ToolOutput,
  OpenAILLMComplex,
  ChatMessageContentPart,
  ExtractedRelationship,
} from "@/lib/types/index";
import { BaseTool, ToolInput } from "@/lib/tools/base-tool";
import { tools as appToolsRegistry } from "@/lib/tools/index";
import {
  generateStructuredJson,
  generateResponseWithIntent,
} from "@/lib/providers/llm_clients";
import { logger } from "../../memory-framework/config"; // Assuming this path is correct
import { appConfig, injectPromptVariables } from "@/lib/config";
import { DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE } from "@/lib/prompts";
import OpenAI from "openai";
import { getProperty } from "dot-prop";

// --- Model Constants ---
const WORKFLOW_PLANNING_MODEL: OpenAIPlanningModel = appConfig.llm.planningModel || "o4-mini-2025-04-16";
const DYNAMIC_WORKFLOW_DESIGN_MODEL: OpenAIPlanningModel = appConfig.llm.planningModel || "o4-mini-2025-04-16";
const DEFAULT_LLM_STEP_MODEL: OpenAILLMFast = appConfig.llm.extractionModel || "gpt-4.1-nano-2025-04-14";
const COMPLEX_LLM_STEP_MODEL: OpenAI.Chat.Completions.ChatCompletionCreateParams["model"] = appConfig.llm.complexModel || appConfig.llm.chatModel || "gpt-4.1-2025-04-14";


// --- HELPERS ---
function summarizeChatHistoryForWorkflow(history: ChatMessage[], maxLength: number = 300): string {
    if (!history || history.length === 0) return "No recent history.";
    return history.slice(-3).map(m => {
        let contentPreview = "";
        if (typeof m.content === 'string') {
            contentPreview = m.content.substring(0, 50) + (m.content.length > 50 ? "..." : "");
        } else if (Array.isArray(m.content)) {
            const textPart = m.content.find(p => p.type === 'text')?.text;
            contentPreview = textPart ? textPart.substring(0, 40) + (textPart.length > 40 ? "..." : "") : "[multimodal]";
        }
        return `${m.role}: ${contentPreview || "[no text content]"}`;
    }).join("\n").substring(0, maxLength);
}

function summarizeUserStateForWorkflow(userState: UserState | null, maxLength: number = 200): string {
    if (!userState) return "No user state.";
    const parts = [];
    if (userState.user_first_name) parts.push(`Name: ${userState.user_first_name}`);
    if (userState.preferred_locale) parts.push(`Locale: ${userState.preferred_locale}`);
    if (userState.latitude && userState.longitude) parts.push(`Loc: ~${userState.latitude.toFixed(1)},${userState.longitude.toFixed(1)}`);
    if (userState.timezone) parts.push(`TZ: ${userState.timezone}`);
    return parts.join(" | ").substring(0, maxLength) || "Basic user state.";
}


const WORKFLOW_LLM_PROMPT_TEMPLATES: Record<string, string> = {
  personalizedBriefingSummary: `Hey {userName}! Minato here with your {briefingTime} briefing:
- **Location Context**: {userLocationData?.structuredData?.place?.displayName || 'your current location'} ({userLocationData?.structuredData?.place?.category || 'details unavailable'})
- **Weather**: {weatherInfo?.result || 'Weather data unavailable'}
- **Today's Calendar ({calendarEvents?.structuredData?.events?.length || 0} events)**: {calendarEvents?.result || 'No calendar events found or access unavailable.'}
- **Top News ({generalNews?.structuredData?.articles?.length || 0} articles)**: {generalNews?.result || 'No relevant news found.'}
- **Relevant Emails ({emailSummary?.structuredData?.emails?.length || 0} new)**: {emailSummary?.result || 'No important emails found or access unavailable.'}
- **Sports Update**: {sportsInfo?.result || 'No sports updates found.'}
Minato wishes you a fantastic and productive {briefingTime}, {userName}! Let me know if you'd like to dive deeper into any of these.`,
  businessLaunchNavigatorSummary: `Comprehensive Report for {userName} on launching a '{businessType}' in {targetCity}: /* ... (content from previous version) ... */`,
  aiDataAnalystFinalSummary: `{userName}, Minato has completed the analysis of '{parsedData?.structuredData?.data?.fileName || 'your data file'}': /* ... (content from previous version) ... */`,
  smartShopperSummary: `Okay {userName}, Minato has scouted the deals for '{productQuery}'!: /* ... (content from previous version) ... */`,
  cryptoInvestmentAnalysisSummary: `Crypto Investment Analysis for {cryptoAsset} in {targetCountry}, {userName}: /* ... (content from previous version) ... */`,
};

const PREDEFINED_WORKFLOW_TEMPLATES: WorkflowDefinition[] = [
    {
        id: "personalized_briefing",
        name: "Personalized Briefing",
        description: "Provides a daily summary including weather, calendar events, top news, and optionally emails or sports.",
        triggers: [
            "briefing for {briefingTime:morning|afternoon|evening}",
            "my {briefingTime:morning|afternoon|evening} update",
            "{briefingTime:morning|afternoon|evening} summary",
        ],
        steps: [
            { type: "tool_call", toolName: "GeolocationTool", toolArgs: {}, outputVar: "userLocationData", description: "Checking your current location, {userName}...", parallel: true },
            { type: "clarification_query", questionToUser: "For your {briefingTime} briefing, {userName}, shall Minato include your calendar, recent important emails, or sports updates for {userState.workflow_preferences.favoriteSportsTeam || 'your favorite team'}?", expectedResponseVar: "briefingPrefs", description: "Checking your briefing preferences, {userName}..." },
            { type: "tool_call", toolName: "GoogleCalendarReaderTool", toolArgs: { maxResults: 7 }, outputVar: "calendarEvents", description: "Let's see what's on your Google Calendar for today, {userName}...", parallel: true, depends_on_var: "briefingPrefs.includeCalendar" },
            { type: "tool_call", toolName: "GoogleGmailReaderTool", toolArgs: { maxResults: 3, query: "is:important is:unread category:primary", summarize_body: true, summarize_limit: 1 }, outputVar: "emailSummary", description: "Scanning for important new emails, {userName}...", parallel: true, depends_on_var: "briefingPrefs.includeEmails" },
            { type: "tool_call", toolName: "NewsAggregatorTool", toolArgs: { query: "{userState.workflow_preferences.newsKeywords[0]}", category: "general", limit: 3, country: "{userLocationData.structuredData.place.countryCode}" }, outputVar: "generalNews", description: "Grabbing top news headlines for you, {userName}...", depends_on_var: "userLocationData", parallel: true },
            { type: "tool_call", toolName: "SportsInfoTool", toolArgs: { teamName: "{userState.workflow_preferences.favoriteSportsTeam}", queryType: "last_game" }, outputVar: "sportsInfo", description: "Checking sports updates for {userState.workflow_preferences.favoriteSportsTeam || 'your team'}...", depends_on_var: "briefingPrefs.includeSports", parallel: true },
            { type: "tool_call", toolName: "WeatherTool", toolArgs: { location: "{userLocationData.structuredData.place.displayName}" }, outputVar: "weatherInfo", description: "Fetching the latest weather forecast for {userLocationData.structuredData.place.displayName || 'your location'}...", depends_on_var: "userLocationData" },
            { type: "llm_process", promptTemplateKey: "personalizedBriefingSummary", inputVars: ["userName", "briefingTime", "userLocationData", "weatherInfo", "calendarEvents", "generalNews", "emailSummary", "sportsInfo"], outputVar: "finalBriefingResult", description: "Putting together your personalized {briefingTime} briefing, {userName}...", model: DEFAULT_LLM_STEP_MODEL, depends_on_var: "weatherInfo" },
        ],
        expectedFinalOutputVars: ["finalBriefingResult"],
        finalResponsePromptTemplateKey: "personalizedBriefingSummary",
    },
];

function autoParallelizeWorkflowSteps(steps: WorkflowStep[], variables: Record<string, any>): WorkflowStep[] {
  let i = 0;
  while (i < steps.length) {
    if (
      steps[i].type === "tool_call" &&
      (!(steps[i] as ToolCallStep).depends_on_var ||
        getProperty(variables, (steps[i] as ToolCallStep).depends_on_var || "") !== undefined)
    ) {
      let j = i + 1;
      while (
        j < steps.length &&
        steps[j].type === "tool_call" &&
        (!(steps[j] as ToolCallStep).depends_on_var ||
          getProperty(variables, (steps[j] as ToolCallStep).depends_on_var || "") !== undefined)
      ) {
        j++;
      }
      if (j - i > 1) { // Only mark as parallel if there's more than one potential parallel step
        for (let k = i; k < j; k++) {
          (steps[k] as ToolCallStep).parallel = true;
        }
      }
      i = j;
    } else {
      i++;
    }
  }
  return steps;
}

export class WorkflowEngine {
  private toolRegistry: { [key: string]: BaseTool };
  private activeWorkflows: Map<string, WorkflowState> = new Map();

  constructor() {
    this.toolRegistry = appToolsRegistry;
    logger.info(`[WorkflowEngine] Initialized with ${Object.keys(this.toolRegistry).length} tools.`);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private extractDynamicParams(userQuery: string, trigger: string): Record<string, string> {
    const params: Record<string, string> = {};
    const placeholderRegex = /\{([^}]+)\}/g;
    let match;
    const paramNames: string[] = [];
    placeholderRegex.lastIndex = 0;
    while ((match = placeholderRegex.exec(trigger)) !== null) {
        paramNames.push(match[1]);
    }

    // If trigger has no placeholders, simple inclusion check
    if (paramNames.length === 0) {
        return userQuery.toLowerCase().includes(trigger.toLowerCase()) ? {} : {}; // Return empty if no match, {} if match
    }

    // Build regex from trigger
    let regexPattern = "^";
    let lastIndex = 0;
    placeholderRegex.lastIndex = 0; // Reset regex index
    while ((match = placeholderRegex.exec(trigger)) !== null) {
        regexPattern += this.escapeRegExp(trigger.substring(lastIndex, match.index));
        regexPattern += `(.*?)`; // Non-greedy match for the placeholder content
        lastIndex = placeholderRegex.lastIndex;
    }
    regexPattern += this.escapeRegExp(trigger.substring(lastIndex)) + "$";

    try {
        const queryMatch = new RegExp(regexPattern, "i").exec(userQuery);
        if (queryMatch) {
            paramNames.forEach((name, i) => {
                // Extract the base name (e.g., "briefingTime" from "briefingTime:morning|afternoon|evening")
                params[name.split(":")[0]] = queryMatch[i+1]?.trim() || "";
            });
            return params;
        }
    } catch (e: any) {
        logger.error(`[WF Engine ExtractParams] Regex error for trigger "${trigger}" and query "${userQuery}"`, e.message);
    }
    return {}; // Return empty object if no match or error
  }

  public async selectWorkflow(
    userQuery: string,
    userId: string,
    history: ChatMessage[],
    userName: string,
    userState: UserState | null
  ): Promise<{
    definition: WorkflowDefinition | DynamicWorkflowPlan;
    extractedParams: Record<string, string>; // Simplified: selectWorkflow will ensure it's Record<string, string>
    isPredefined: boolean;
  } | null> {
    const logPrefix = `[WF Select User:${userId.substring(0,8)}] Query:"${userQuery.substring(0,30)}..."`;

    let bestMatch: { definition: WorkflowDefinition; params: Record<string, string>; matchStrength: number; } | null = null;
    for (const wfTemplate of PREDEFINED_WORKFLOW_TEMPLATES) {
      for (const trigger of wfTemplate.triggers) {
        const params = this.extractDynamicParams(userQuery, trigger);
        const hasPlaceholders = /\{[^}]+\}/.test(trigger);
        // A match occurs if:
        // 1. Trigger has placeholders AND extractDynamicParams returned at least one param (meaning regex matched)
        // 2. Trigger has NO placeholders AND userQuery includes the trigger text (case-insensitive)
        const isMatch = (hasPlaceholders && Object.keys(params).length > 0) ||
                        (!hasPlaceholders && userQuery.toLowerCase().includes(trigger.toLowerCase()));

        if (isMatch) {
          const placeholdersInTrigger = (trigger.match(/\{[^:]+:/g) || trigger.match(/\{[^}]+\}/g) || []).map(p => p.substring(1, p.indexOf(":") > 0 ? p.indexOf(":") : p.length - 1));
          const matchedPlaceholdersCount = placeholdersInTrigger.filter(pKey => params[pKey] && params[pKey] !== "").length;
          const staticPartLength = trigger.replace(/\{[^}]+\}/g, "").length;
          const currentMatchStrength = matchedPlaceholdersCount * 10 + staticPartLength;

          if (!bestMatch || currentMatchStrength > bestMatch.matchStrength) {
            bestMatch = { definition: wfTemplate, params, matchStrength: currentMatchStrength };
          }
        }
      }
    }

    if (bestMatch) {
      logger.info(`${logPrefix} Predefined template triggered: '${bestMatch.definition.name}'. Dynamic params: ${JSON.stringify(bestMatch.params)}`);
      return { definition: bestMatch.definition, extractedParams: bestMatch.params, isPredefined: true };
    }

    logger.info(`${logPrefix} No direct trigger match. Using LLM for dynamic workflow planning (Model: ${DYNAMIC_WORKFLOW_DESIGN_MODEL}).`);
    const availablePredefinedWfSummaries = PREDEFINED_WORKFLOW_TEMPLATES.map(wf => `- ID: ${wf.id}, Name: ${wf.name}, Triggers: "${wf.triggers.join('", "')}", Desc: ${wf.description.substring(0,70)}...`).join("\n");
    const availableToolsForPlanning = Object.values(this.toolRegistry)
        .filter(t => !["DataParsingTool", "DataProfilingTool", "DataAnalysisTool", "VisualizationTool", "MemoryTool", "InternalTaskTool"].includes(t.name))
        .map(t => {
            const argsSchemaObj = t.argsSchema as { properties?: Record<string, any>; };
            const args = argsSchemaObj.properties ? Object.keys(argsSchemaObj.properties) : [];
            return `- ${t.name}: ${t.description.substring(0,100)}... Args: ${JSON.stringify(args)}`;
        }).join("\n");
    const language = userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en";
    const personaContextString = userState?.active_persona_id ? `Active Persona ID: ${userState.active_persona_id}` : "No specific persona context provided.";

    const injectedPrompt = injectPromptVariables(DYNAMIC_WORKFLOW_GENERATION_PROMPT_TEMPLATE, {
        userQuery, userName,
        conversationHistorySummary: summarizeChatHistoryForWorkflow(history),
        userStateSummary: summarizeUserStateForWorkflow(userState),
        available_predefined_workflow_summaries: availablePredefinedWfSummaries,
        available_tools_for_planning: availableToolsForPlanning,
        language: language,
        userPersona: personaContextString,
        personaTraits: (userState as any)?.active_persona_traits?.join(', ') || 'default',
        preferredTools: (userState as any)?.active_persona_preferredTools?.join(', ') || 'any',
        avoidTools: (userState as any)?.active_persona_avoidTools?.join(', ') || 'none',
        style: (userState as any)?.active_persona_style || 'default',
        tone: (userState as any)?.active_persona_tone || 'default',
    });

    const llmChoiceSchema = {
      type: "object" as const,
      properties: {
        action_type: {
          type: "string" as const,
          enum: [
            "select_predefined_workflow",
            "generate_dynamic_workflow",
            "request_clarification",
            "no_workflow_needed",
          ],
        },
        workflow_id: { type: ["string", "null"] as const },
        reasoning: { type: "string" as const },
        extracted_params: {
          type: ["array", "null"] as const,
          description: "Array of key-value pairs for extracted dynamic parameters.",
          items: {
            type: "object" as const,
            properties: {
              key: { type: "string" as const, description: "Parameter name" },
              value: { type: "string" as const, description: "Parameter value" }
            },
            required: ["key", "value"],
            additionalProperties: false,
          }
        },
        clarification_question: { type: ["string", "null"] as const },
        plan: {
          type: ["object", "null"] as const,
          properties: {
            goal: { type: "string" as const },
            reasoning: { type: "string" as const },
            steps: {
              type: "array" as const,
              items: {
                type: "object" as const,
                properties: {
                  type: { type: "string" as const, enum: ["tool_call", "llm_process", "clarification_query"]},
                  toolName: { type: ["string", "null"] as const },
                  toolArgs: {
                    type: ["object", "null"] as const,
                    properties: {},
                    required: [],
                    additionalProperties: false, // Stricter: allow only empty or known properties if defined
                  },
                  customPrompt: { type: ["string", "null"] as const },
                  promptTemplateKey: { type: ["string", "null"] as const },
                  inputVars: { type: ["array", "null"] as const, items: { type: "string" as const } },
                  outputSchemaName: { type: ["string", "null"] as const },
                  outputSchema: {
                    type: ["object", "null"] as const,
                    properties: {}, required: [], additionalProperties: false
                  },
                  questionToUser: { type: ["string", "null"] as const },
                  expectedResponseVar: { type: ["string", "null"] as const },
                  description: { type: "string" as const },
                  outputVar: { type: "string" as const },
                  parallel: { type: ["boolean", "null"] as const },
                  depends_on_var: { type: ["string", "null"] as const },
                },
                required: ["type", "description", "outputVar"], // As per the second file (simpler requirement for plan steps)
                additionalProperties: false,
              },
            },
          },
          required: ["goal", "reasoning", "steps"],
          additionalProperties: false,
        },
      },
      required: ["action_type", "reasoning"], // As per the second file (simpler top-level requirement)
      additionalProperties: false,
    };

    const schemaNameForLLM = "dynamic_workflow_plan_generation_v9"; // From the second file
    logger.debug(`${logPrefix} Using schema name for LLM: ${schemaNameForLLM}`);

    const llmChoiceResult = await generateStructuredJson<any>(
      injectedPrompt,
      "Based on the user query and context, decide on the best course of action using the provided schemas.",
      llmChoiceSchema,
      schemaNameForLLM,
      [],
      DYNAMIC_WORKFLOW_DESIGN_MODEL,
      userId
    );

    if ("error" in llmChoiceResult || !llmChoiceResult || !llmChoiceResult.action_type) {
      logger.error(
        `${logPrefix} LLM failed to select/plan workflow: ${(llmChoiceResult as any)?.error || "Invalid response structure"}. Raw: ${JSON.stringify(llmChoiceResult)}`
      );
      return null;
    }

    const llmChoice = llmChoiceResult;
    logger.debug(`${logPrefix} LLM workflow decision: ${JSON.stringify(llmChoice, null, 2)}`);

    let processedExtractedParams: Record<string, string> = {};
    if (Array.isArray(llmChoice.extracted_params)) {
        llmChoice.extracted_params.forEach((pair: {key: string, value: string}) => {
            if (pair && typeof pair.key === 'string' && typeof pair.value === 'string') {
                processedExtractedParams[pair.key] = pair.value;
            }
        });
    } else if (llmChoice.extracted_params && typeof llmChoice.extracted_params === 'object') {
        // Fallback if schema adherence fails and it's an object (though schema enforces array or null)
        // This case is less likely if the schema is strictly followed by the LLM.
        logger.warn(`${logPrefix} LLM returned extracted_params as an object instead of an array of key-value pairs. Attempting to process.`);
        processedExtractedParams = llmChoice.extracted_params as Record<string, string>;
    }
    // If llmChoice.extracted_params is null, processedExtractedParams remains {}


    switch (llmChoice.action_type) {
      case "select_predefined_workflow":
        const selectedWf = PREDEFINED_WORKFLOW_TEMPLATES.find(wf => wf.id === llmChoice.workflow_id);
        if (selectedWf) {
          logger.info(`${logPrefix} LLM selected predefined workflow: '${selectedWf.name}' (Reason: ${llmChoice.reasoning || "N/A"})`);
          return { definition: selectedWf, extractedParams: processedExtractedParams, isPredefined: true };
        }
        logger.warn(`${logPrefix} LLM selected non-existent predefined workflow ID: ${llmChoice.workflow_id}.`);
        break;
      case "generate_dynamic_workflow":
        if (llmChoice.plan && Array.isArray(llmChoice.plan.steps) && llmChoice.plan.steps.length > 0 &&
            llmChoice.plan.steps.every((s: any) => s.type && s.outputVar && s.description)) {
          logger.info(`${logPrefix} LLM generated dynamic plan for "${llmChoice.plan.goal}" with ${llmChoice.plan.steps.length} steps. Reasoning: ${llmChoice.plan.reasoning || "N/A"}`);
          // Dynamic plans use their own internal variable management, not query-extracted params in the same way.
          return { definition: llmChoice.plan as DynamicWorkflowPlan, extractedParams: {}, isPredefined: false };
        }
        logger.warn(`${logPrefix} LLM indicated dynamic plan but plan was invalid. Raw: ${JSON.stringify(llmChoice.plan)}`);
        break;
      case "request_clarification":
        if (llmChoice.clarification_question) {
          logger.info(`${logPrefix} LLM requests clarification: ${llmChoice.clarification_question}. Reasoning: ${llmChoice.reasoning || "N/A"}`);
          return {
            definition: {
              goal: "clarification_needed",
              reasoning: llmChoice.reasoning || "Further information needed.",
              steps: [{ type: "clarification_query", questionToUser: llmChoice.clarification_question, expectedResponseVar: "userClarificationResponse", description: "Asking user for more details." } as ClarificationQueryStep],
              requires_clarification: true,
              clarification_question: llmChoice.clarification_question,
            } as DynamicWorkflowPlan,
            extractedParams: {},
            isPredefined: false,
          };
        }
        logger.warn(`${logPrefix} LLM indicated clarification but no question provided.`);
        break;
      case "no_workflow_needed":
        logger.info(`${logPrefix} LLM indicated no workflow needed. Reasoning: ${llmChoice.reasoning || "N/A"}`);
        return null;
      default:
        logger.warn(`${logPrefix} LLM returned unknown action_type: ${llmChoice.action_type}`);
    }
    return null;
  }

  private substituteVariables(argValue: any, variables: Record<string, any>, userQueryFromState: string): any {
    if (typeof argValue === "string") {
        let substitutedValue = argValue;
        const currentTurnInput = variables.latestUserInputForStep || userQueryFromState;
        // Specific global placeholders
        substitutedValue = substitutedValue.replace(/{userInput}/g, userQueryFromState);
        substitutedValue = substitutedValue.replace(/{latestUserInput}/g, currentTurnInput);

        // Generic variable placeholders (e.g., {someTool.result.data})
        const placeholderRegex = /\{([\w.-]+(?:\[\d+\])?(?:[.][\w-]+)*)\}/g;
        // Iterative substitution to handle nested placeholders (e.g., {toolA.output_{toolB.result}})
        for (let i = 0; i < 5; i++) { // Limit iterations to prevent infinite loops
            let changedInIter = false;
            let matchResult;
            // Re-create regex for each iteration as lastIndex is stateful
            const currentIterRegex = new RegExp(placeholderRegex.source, "g");
            while ((matchResult = currentIterRegex.exec(substitutedValue)) !== null) {
                const fullPlaceholder = matchResult[0];
                const varPath = matchResult[1];

                // Skip already handled global placeholders
                if (varPath === "userInput" || varPath === "latestUserInput") continue;

                let value = getProperty(variables, varPath);

                if (value !== undefined) {
                    // If the entire string is a placeholder for a non-string/number/boolean value, return the value directly
                    if (substitutedValue === fullPlaceholder && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
                        return value;
                    }
                    const replacement = String(value ?? ""); // Convert to string for replacement (handles null/undefined)
                    if (substitutedValue.includes(fullPlaceholder)) { // Check if placeholder still exists before replacing
                        substitutedValue = substitutedValue.replace(fullPlaceholder, replacement);
                        changedInIter = true;
                    }
                } else {
                    logger.warn(`[WF Engine Substitute] Variable path '${varPath}' for placeholder '${fullPlaceholder}' not found or undefined in variables. Known top-level vars: ${Object.keys(variables).join(", ")}`);
                    // Placeholder remains if variable not found
                }
            }
            if (!changedInIter) break; // If no substitutions in this iteration, resolution is complete
        }
        return substitutedValue;
    } else if (Array.isArray(argValue)) {
        return argValue.map(item => this.substituteVariables(item, variables, userQueryFromState));
    } else if (typeof argValue === "object" && argValue !== null) {
        const newObj: Record<string, any> = {};
        for (const key in argValue) {
            if (Object.prototype.hasOwnProperty.call(argValue, key)) {
                newObj[key] = this.substituteVariables(argValue[key], variables, userQueryFromState);
            }
        }
        return newObj;
    }
    return argValue;
  }

  public async startOrContinueWorkflow(
    sessionId: string,
    userId: string,
    latestUserInput: string,
    history: ChatMessage[],
    userState: UserState | null,
    apiContext?: Record<string, any>
  ): Promise<{
    responseText: string | null;
    structuredData: AnyToolStructuredData | null;
    workflowFeedback: OrchestratorResponse["workflowFeedback"];
    error?: string | null;
    isComplete: boolean;
    clarificationQuestion?: string | null;
    llmUsage: OpenAI.CompletionUsage | null;
    intentType?: string | null;
    ttsInstructions?: string | null;
  }> {
    const logPrefix = `[WF Engine User:${userId.substring(0,8)} Sess:${sessionId.substring(0,6)}]`;
    let wfState = this.activeWorkflows.get(sessionId);
    let currentWorkflowDefinitionOrPlan: WorkflowDefinition | DynamicWorkflowPlan | null = null;
    let totalLlmUsage: OpenAI.CompletionUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const userName = apiContext?.userName || userState?.user_first_name || "User";
    let responseIntentType: string | null = "neutral";

    if (!wfState || wfState.status === "completed" || wfState.status === "failed") {
        logger.info(`${logPrefix} Initiating new workflow for input: "${latestUserInput.substring(0,50)}..."`);
        const selectionResult = await this.selectWorkflow(latestUserInput, userId, history, userName, userState);

        if (!selectionResult) {
            logger.info(`${logPrefix} No suitable workflow determined.`);
            return { responseText: null, structuredData: null, workflowFeedback: null, isComplete: true, llmUsage: null, intentType: null, ttsInstructions: null };
        }
        currentWorkflowDefinitionOrPlan = selectionResult.definition;
        // selectionResult.extractedParams is guaranteed to be Record<string, string> by selectWorkflow's return type
        const initialParams: Record<string, string> = selectionResult.extractedParams;

        if ((currentWorkflowDefinitionOrPlan as DynamicWorkflowPlan).requires_clarification && (currentWorkflowDefinitionOrPlan as DynamicWorkflowPlan).clarification_question) {
            const dynPlan = currentWorkflowDefinitionOrPlan as DynamicWorkflowPlan;
            const questionToUser = injectPromptVariables(dynPlan.clarification_question || "Minato needs more information from you, {userName}.", { userName, ...initialParams });
            logger.info(`${logPrefix} Workflow planner requests initial clarification: ${questionToUser}`);
            const initialClarificationState: WorkflowState = {
                sessionId, currentStepIndex: 0,
                variables: { userInput: latestUserInput, userId, userName, userState, ...initialParams },
                status: "waiting_for_user", dynamicPlan: dynPlan, startTime: Date.now(),
            };
            this.activeWorkflows.set(sessionId, initialClarificationState);
            responseIntentType = "questioning";
            return {
                responseText: null, structuredData: null,
                workflowFeedback: { workflowName: dynPlan.goal || "Dynamic Plan", currentStepDescription: `Minato needs a bit more info, ${userName}...`, status: "waiting_for_user" },
                clarificationQuestion: questionToUser, isComplete: false, llmUsage: null, intentType: responseIntentType, ttsInstructions: null,
            };
        }
        wfState = {
            sessionId, currentStepIndex: 0,
            variables: { userInput: latestUserInput, userId, userName, userState, ...initialParams },
            status: "pending",
            activeWorkflowId: selectionResult.isPredefined ? (currentWorkflowDefinitionOrPlan as WorkflowDefinition).id : undefined,
            dynamicPlan: selectionResult.isPredefined ? null : (currentWorkflowDefinitionOrPlan as DynamicWorkflowPlan),
            startTime: Date.now(),
        };
        this.activeWorkflows.set(sessionId, wfState);
        logger.info(`${logPrefix} Initialized new workflow: '${wfState.activeWorkflowId || wfState.dynamicPlan?.goal}'. Initial params: ${JSON.stringify(initialParams)}`);
    } else {
        logger.info(`${logPrefix} Resuming workflow: '${wfState.activeWorkflowId || wfState.dynamicPlan?.goal}' at step ${wfState.currentStepIndex}`);
        currentWorkflowDefinitionOrPlan = wfState.dynamicPlan || PREDEFINED_WORKFLOW_TEMPLATES.find(wf => wf.id === wfState!.activeWorkflowId) || null;

        if (!currentWorkflowDefinitionOrPlan) {
            logger.error(`${logPrefix} Resumed workflow, but definition/plan is missing. ID: ${wfState.activeWorkflowId}`);
            this.activeWorkflows.delete(sessionId);
            responseIntentType = "error";
            return { responseText: null, structuredData: null, workflowFeedback: { status: "failed", currentStepDescription: "Internal error: Minato lost track of the current task." }, error: "Workflow data lost.", isComplete: true, llmUsage: null, intentType: responseIntentType, ttsInstructions: null };
        }

        if (wfState.status === "waiting_for_user") {
            const currentPlanSteps = currentWorkflowDefinitionOrPlan.steps;
            if (wfState.currentStepIndex < currentPlanSteps.length) {
                const stepAwaitingClarification = currentPlanSteps[wfState.currentStepIndex];
                if (stepAwaitingClarification.type === "clarification_query") {
                    const clarificationStep = stepAwaitingClarification as ClarificationQueryStep;
                    wfState.variables[clarificationStep.expectedResponseVar] = latestUserInput;
                    wfState.currentStepIndex++; // Advance after processing clarification
                    wfState.status = "running";
                    logger.info(`${logPrefix} Received clarification: "${latestUserInput.substring(0,30)}...". Resuming workflow from step ${wfState.currentStepIndex}.`);
                } else {
                    // This case should ideally not happen if status is waiting_for_user
                    wfState.status = "running"; // Force to running if state is inconsistent
                    logger.warn(`${logPrefix} Resumed in 'waiting_for_user' but current step isn't 'clarification_query'. Forcing 'running'.`);
                }
            } else {
                 logger.warn(`${logPrefix} Resumed in 'waiting_for_user' but currentStepIndex is out of bounds. Resetting workflow.`);
                this.clearWorkflowState(sessionId);
                return this.startOrContinueWorkflow(sessionId, userId, latestUserInput, history, userState, apiContext);
            }
        }
    }

    const steps = autoParallelizeWorkflowSteps(currentWorkflowDefinitionOrPlan.steps, wfState.variables);
    let lastToolOutputData: AnyToolStructuredData | null = null;
    wfState.status = "running";
    wfState.variables.latestUserInputForStep = latestUserInput; // Store latest input for potential {latestUserInput} placeholder

    while (wfState.currentStepIndex < steps.length && wfState.status === "running") {
        const step = steps[wfState.currentStepIndex];
        const stepNumber = wfState.currentStepIndex + 1;

        // --- Parallel Tool Execution Block ---
        if (step.type === "tool_call" && (step as ToolCallStep).parallel === true) {
            const parallelSteps: { idx: number; step: ToolCallStep }[] = [];
            let lookahead = wfState.currentStepIndex;
            // Gather all contiguous, runnable parallel steps
            while (lookahead < steps.length &&
                   steps[lookahead].type === "tool_call" &&
                   (steps[lookahead] as ToolCallStep).parallel === true &&
                   (!(steps[lookahead] as ToolCallStep).depends_on_var || // No dependency
                    getProperty(wfState.variables, (steps[lookahead] as ToolCallStep).depends_on_var || "") !== undefined) // Dependency met
                  ) {
                parallelSteps.push({ idx: lookahead, step: steps[lookahead] as ToolCallStep });
                lookahead++;
            }

            if (parallelSteps.length > 0) {
                if (parallelSteps.length > 1) {
                    logger.info(`${logPrefix} Executing ${parallelSteps.length} parallel tool steps: ${parallelSteps.map(ps => ps.step.toolName).join(", ")}`);
                } else {
                     logger.info(`${logPrefix} Executing single parallel-marked tool step: ${parallelSteps[0].step.toolName}`);
                }

                const toolPromises = parallelSteps.map(({ idx, step: toolCallStep }) => {
                    const tool = this.toolRegistry[toolCallStep.toolName];
                    if (!tool) return Promise.reject(new Error(`Tool '${toolCallStep.toolName}' not found in Minato's registry.`));

                    let actualToolArgs = this.substituteVariables(toolCallStep.toolArgs, wfState.variables, wfState.variables.userInput);
                    if (typeof actualToolArgs !== "object" || actualToolArgs === null) actualToolArgs = { loneArg: actualToolArgs };

                    const toolInput: ToolInput = {
                        ...(actualToolArgs as Record<string, any>), userId: userId,
                        lang: userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0],
                        sessionId: sessionId,
                        context: { ...(apiContext || {}), userState, sessionId, runId: sessionId, userName, workflowVariables: { ...wfState.variables } },
                    };
                    logger.debug(`${logPrefix} [Parallel] Calling tool ${tool.name} with args: ${JSON.stringify(toolInput).substring(0,500)}`);
                    return tool.execute(toolInput).then(toolOutput => ({ idx, toolCallStep, toolOutput, toolName: tool.name }));
                });

                try {
                    const results = await Promise.all(toolPromises);
                    for (const { toolCallStep, toolOutput, toolName } of results) {
                        if (toolOutput.error) {
                            logger.error(`${logPrefix} [Parallel] Minato's ${toolName} reported an issue: ${toolOutput.error}`);
                            wfState.status = "failed"; wfState.error = `Parallel tool '${toolName}' error: ${toolOutput.error}`;
                            this.activeWorkflows.set(sessionId, wfState); responseIntentType = "error";
                            return { responseText: `I encountered an issue, ${userName}, while running tool '${toolName}' in parallel. The error was: ${toolOutput.error}. Minato will stop this task for now.`, structuredData: lastToolOutputData, workflowFeedback: { workflowName: wfState.activeWorkflowId || wfState.dynamicPlan?.goal, currentStepDescription: `Error in parallel tool '${toolName}'`, status: "failed" }, error: wfState.error, isComplete: true, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null };
                        }
                        if (toolCallStep.outputVar) wfState.variables[toolCallStep.outputVar] = toolOutput;
                        if (toolOutput.structuredData) lastToolOutputData = toolOutput.structuredData; // Keep track of last structured data
                        logger.info(`${logPrefix} [Parallel] Tool ${toolName} executed. Result snippet: ${String(toolOutput.result).substring(0,70)}...`);
                    }
                    wfState.currentStepIndex += parallelSteps.length; // Advance past all executed parallel steps
                    continue; // Continue to the next iteration of the main while loop
                } catch (err: any) {
                    logger.error(`${logPrefix} [Parallel] Error in parallel tool execution: ${err.message}`, { error: err });
                    wfState.status = "failed"; wfState.error = `Parallel tool execution error: ${err.message}`;
                    this.activeWorkflows.set(sessionId, wfState); responseIntentType = "error";
                    return { responseText: `I encountered an issue, ${userName}, during parallel tool execution. The error was: ${err.message}. Minato will stop this task for now.`, structuredData: lastToolOutputData, workflowFeedback: { workflowName: wfState.activeWorkflowId || wfState.dynamicPlan?.goal, currentStepDescription: `Error in parallel tool execution`, status: "failed" }, error: wfState.error, isComplete: true, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null };
                }
            }
        }
        // --- End Parallel Tool Execution Block ---


        if (step.depends_on_var && getProperty(wfState.variables, step.depends_on_var) === undefined) {
            const errorMsg = `Step ${stepNumber} ('${step.description || step.type}') depends on unavailable variable '${step.depends_on_var}'. Minato needs this information to proceed with your request, {userName}.`;
            logger.error(`${logPrefix} ${injectPromptVariables(errorMsg, { userName })}`);
            wfState.status = "failed"; wfState.error = injectPromptVariables(errorMsg, { userName });
            this.activeWorkflows.set(sessionId, wfState); responseIntentType = "error";
            return { responseText: `Minato hit a snag, ${userName}. I'm missing some information from a previous step ('${step.depends_on_var}') needed to continue this task. Could you please provide more details or try rephrasing?`, structuredData: lastToolOutputData, workflowFeedback: { workflowName: wfState.activeWorkflowId || wfState.dynamicPlan?.goal, currentStepDescription: injectPromptVariables(errorMsg, { userName }), status: "failed" }, error: wfState.error, isComplete: true, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null };
        }

        const userFacingStepDescription = injectPromptVariables(step.description || `Minato is performing step ${stepNumber} for you, {userName}`, { userName, ...wfState.variables });
        logger.info(`${logPrefix} Executing step ${stepNumber}/${steps.length}: ${step.type} - ${userFacingStepDescription}`);
        const currentStepFeedback: OrchestratorResponse['workflowFeedback'] = {
            workflowName: wfState.activeWorkflowId || wfState.dynamicPlan?.goal || "Minato's Task in Progress",
            currentStepDescription: userFacingStepDescription, status: "in_progress",
            progress: Math.round((stepNumber / steps.length) * 100),
        };
        wfState.variables[`_workflowFeedback_step_${wfState.currentStepIndex}`] = currentStepFeedback;

        try {
          if (step.type === "tool_call") { // Handles non-parallel tool calls
            const toolCallStep = step as ToolCallStep;
            const tool = this.toolRegistry[toolCallStep.toolName];
            if (!tool) throw new Error(`Tool '${toolCallStep.toolName}' not found in Minato's registry.`);
            let actualToolArgs = this.substituteVariables(toolCallStep.toolArgs, wfState.variables, wfState.variables.userInput);
            if (typeof actualToolArgs !== "object" || actualToolArgs === null) actualToolArgs = { loneArg: actualToolArgs };
            const toolInput: ToolInput = {
                ...(actualToolArgs as Record<string, any>), userId: userId,
                lang: userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0],
                sessionId: sessionId,
                context: { ...(apiContext || {}), userState, sessionId, runId: sessionId, userName, workflowVariables: { ...wfState.variables } },
            };
            logger.debug(`${logPrefix} Calling tool ${tool.name} with args: ${JSON.stringify(toolInput).substring(0,500)}`);
            const toolOutput: ToolOutput = await tool.execute(toolInput);
            if (toolOutput.error) throw new Error(`Minato's ${tool.name} reported an issue: ${toolOutput.error}`);
            if (toolCallStep.outputVar) wfState.variables[toolCallStep.outputVar] = toolOutput;
            if (toolOutput.structuredData) lastToolOutputData = toolOutput.structuredData;
            logger.info(`${logPrefix} Tool ${tool.name} executed. Result snippet: ${String(toolOutput.result).substring(0,70)}...`);

          } else if (step.type === "llm_process") {
            const llmStep = step as LLMProcessStep;
            const promptInputs: Record<string, any> = { userName }; // Start with userName
            (llmStep.inputVars || []).forEach(varName => {
                let value: any = getProperty(wfState!.variables, varName);
                if (value === undefined) value = `[Data for ${varName} unavailable for {userName}]`;
                promptInputs[varName.replace(/\./g, "_")] = value; // Sanitize varName for prompt keys
            });
            const promptTemplate = llmStep.customPrompt || WORKFLOW_LLM_PROMPT_TEMPLATES[llmStep.promptTemplateKey || ""] || "Process inputs: {inputVars[0]}"; // Default fallback
            const systemInstructionsForLLMStep = injectPromptVariables(promptTemplate, promptInputs);
            const llmModelForStep = llmStep.model || DEFAULT_LLM_STEP_MODEL;

            logger.debug(`${logPrefix} LLM Process with ${llmModelForStep}. Template: '${llmStep.promptTemplateKey || "custom"}'. Instructions start: ${systemInstructionsForLLMStep.substring(0,150)}...`);
            const llmResponse = await generateResponseWithIntent(
                systemInstructionsForLLMStep,
                `Based on the provided information, please generate the required output.`, // Generic user prompt
                [], // History (usually not needed here as prompt is self-contained)
                llmModelForStep,
                appConfig?.llm?.maxTokens, // Use maxTokens
                userId
            );
            if ("error" in llmResponse) throw new Error(`LLM process step failed: ${llmResponse.error}`);
            if (llmStep.outputVar) wfState!.variables[llmStep.outputVar] = llmResponse.responseText; // Store text response
            responseIntentType = llmResponse.intentType || responseIntentType; // Capture intent
            const usage = (llmResponse as any).usage as OpenAI.CompletionUsage | undefined;
            if (usage) {
                totalLlmUsage.prompt_tokens += usage.prompt_tokens || 0;
                totalLlmUsage.completion_tokens += usage.completion_tokens || 0;
                totalLlmUsage.total_tokens += usage.total_tokens || 0;
            }
            logger.info(`${logPrefix} LLM Process step '${llmStep.description || llmStep.promptTemplateKey}' completed for ${userName}. Output var '${llmStep.outputVar}' set.`);

          } else if (step.type === "clarification_query") {
            const clarificationStep = step as ClarificationQueryStep;
            const questionToUser = injectPromptVariables(clarificationStep.questionToUser, { userName, ...wfState.variables });
            logger.info(`${logPrefix} Workflow needs clarification: ${questionToUser}`);
            wfState.status = "waiting_for_user";
            this.activeWorkflows.set(sessionId, wfState); // Save state before returning
            responseIntentType = "questioning";
            return {
                responseText: null, // No direct response, orchestrator handles clarification prompt
                structuredData: lastToolOutputData,
                workflowFeedback: currentStepFeedback,
                clarificationQuestion: questionToUser,
                isComplete: false,
                llmUsage: totalLlmUsage,
                intentType: responseIntentType,
                ttsInstructions: null, // TTS handled by orchestrator
            };
          }
        } catch (error: any) {
            const descriptiveStepName = step.description || step.type + (step.type === "tool_call" ? `(${(step as ToolCallStep).toolName})` : "");
            logger.error(`${logPrefix} Error in step ${stepNumber} ('${descriptiveStepName}'): ${error.message}`, { error });
            wfState.status = "failed"; wfState.error = `Error during '${descriptiveStepName}': ${error.message.substring(0,150)}`;
            this.activeWorkflows.set(sessionId, wfState); responseIntentType = "error";
            return { responseText: `I encountered an issue, ${userName}, while ${injectPromptVariables(descriptiveStepName, { userName } )}. The error was: ${error.message.substring(0,100)}. Minato will stop this task for now.`, structuredData: lastToolOutputData, workflowFeedback: { workflowName: wfState.activeWorkflowId || wfState.dynamicPlan?.goal, currentStepDescription: `Error at step ${stepNumber}: ${injectPromptVariables(descriptiveStepName, {userName})}`, status: "failed" }, error: wfState.error, isComplete: true, llmUsage: totalLlmUsage, intentType: responseIntentType, ttsInstructions: null };
        }
        if (wfState.status === "running") wfState.currentStepIndex++; // Advance step if not waiting or failed
    } // End while loop

    if (wfState.currentStepIndex >= steps.length && wfState.status === "running") {
        wfState.status = "completed";
    }

    // --- Final Response Generation ---
    let finalResponseTextResolved = `The '${(currentWorkflowDefinitionOrPlan as WorkflowDefinition)?.name || wfState.dynamicPlan?.goal}' workflow completed successfully, ${userName}. Minato has gathered the information.`;
    if (wfState.status === "completed") {
        responseIntentType = "confirmation_positive";
    } else if (wfState.status === "failed" as typeof wfState.status) {
        // If it somehow exited loop but was marked failed (e.g. by parallel step)
        responseIntentType = "error";
        finalResponseTextResolved = wfState.error || `Minato encountered an issue finishing the task, ${userName}.`;
        logger.warn(`${logPrefix} Workflow ended with status '${wfState.status}' but outside main error path. Final response based on error: ${wfState.error}`);
        this.activeWorkflows.delete(sessionId);
        return {
            responseText: finalResponseTextResolved,
            structuredData: lastToolOutputData,
            workflowFeedback: {
                workflowName: wfState.activeWorkflowId || wfState.dynamicPlan?.goal || "Workflow",
                status: "failed",
                currentStepDescription: wfState.error || `Task failed to complete, ${userName}.`,
            },
            error: wfState.error,
            isComplete: true,
            llmUsage: totalLlmUsage,
            intentType: responseIntentType,
            ttsInstructions: null,
        };
    }


    const finalResponsePromptKey = (currentWorkflowDefinitionOrPlan as WorkflowDefinition)?.finalResponsePromptTemplateKey;
    if (wfState.status === "completed" && finalResponsePromptKey && WORKFLOW_LLM_PROMPT_TEMPLATES[finalResponsePromptKey]) {
        const finalPromptTemplate = WORKFLOW_LLM_PROMPT_TEMPLATES[finalResponsePromptKey];
        const finalPromptInputs: Record<string, any> = { userName };
        // Gather all relevant variables for the final prompt
        const allVarsForPrompt = new Set((currentWorkflowDefinitionOrPlan as WorkflowDefinition)?.expectedFinalOutputVars || []);
        Object.keys(wfState.variables).forEach(k => allVarsForPrompt.add(k));

        allVarsForPrompt.forEach(varName => {
            let value: any = getProperty(wfState!.variables, varName);
            if (value instanceof BaseTool || typeof value === 'function') return; // Skip complex objects
            if (value === undefined) value = `[Data for ${varName} unavailable for {userName}]`;

            const cleanVarName = varName.replace(/\./g, "_");
            // Smart stringification for objects/arrays, limit length
            if (typeof value === 'object' && value !== null) {
                try {
                    const jsonString = JSON.stringify(value);
                    finalPromptInputs[cleanVarName] = jsonString.length > 1000 ? jsonString.substring(0, 997) + "..." : jsonString;
                } catch {
                    finalPromptInputs[cleanVarName] = "[unserializable object]";
                }
            } else {
                finalPromptInputs[cleanVarName] = String(value ?? "").substring(0,1500); // Ensure string and limit length
            }
        });

        const systemInstructionsForFinalResponse = injectPromptVariables(finalPromptTemplate, finalPromptInputs);
        logger.debug(`${logPrefix} Generating final workflow response with template '${finalResponsePromptKey}'. System Instructions (start): ${systemInstructionsForFinalResponse.substring(0,250)}...`);

        const finalLlmResponse = await generateResponseWithIntent(
            systemInstructionsForFinalResponse,
            `Okay, ${userName}, Minato has completed the '${(currentWorkflowDefinitionOrPlan as WorkflowDefinition)?.name || wfState.dynamicPlan?.goal}' task. Provide a summary based on the gathered information.`,
            [],
            appConfig?.llm?.chatModel || DEFAULT_LLM_STEP_MODEL, // Prefer chatModel for final summary
            appConfig?.llm?.maxTokens,
            userId
        );

        if (!("error" in finalLlmResponse) && finalLlmResponse.responseText) {
            finalResponseTextResolved = finalLlmResponse.responseText;
            responseIntentType = finalLlmResponse.intentType || responseIntentType;
        } else {
            logger.warn(`${logPrefix} Failed to generate final response using template ${finalResponsePromptKey}. Error: ${("error" in finalLlmResponse) ? finalLlmResponse.error : "Unknown"}. Falling back.`);
            // Fallback already set
        }
        const usage = (finalLlmResponse as any).usage as OpenAI.CompletionUsage | undefined;
        if (usage) {
            totalLlmUsage.prompt_tokens += usage.prompt_tokens || 0;
            totalLlmUsage.completion_tokens += usage.completion_tokens || 0;
            totalLlmUsage.total_tokens += usage.total_tokens || 0;
        }
    } else if (wfState.status === "completed" && (currentWorkflowDefinitionOrPlan as WorkflowDefinition)?.expectedFinalOutputVars && (currentWorkflowDefinitionOrPlan as WorkflowDefinition).expectedFinalOutputVars!.length > 0) {
        const primaryOutputVar = (currentWorkflowDefinitionOrPlan as WorkflowDefinition).expectedFinalOutputVars![0];
        const outputValue = getProperty(wfState.variables, primaryOutputVar);
        if (typeof outputValue === 'string') {
            finalResponseTextResolved = outputValue;
        } else if (outputValue && typeof outputValue === 'object' && "result" in outputValue && typeof (outputValue as ToolOutput).result === 'string') {
            finalResponseTextResolved = (outputValue as ToolOutput).result!;
            if ((outputValue as ToolOutput).structuredData) lastToolOutputData = (outputValue as ToolOutput).structuredData!;
        } else if (outputValue) {
            try {
                 finalResponseTextResolved = `Minato has completed the task for you, ${userName}. Result for ${primaryOutputVar}: ${JSON.stringify(outputValue, null, 2).substring(0,500)}...`;
            } catch {
                 finalResponseTextResolved = `Minato has completed the task for you, ${userName}. Result for ${primaryOutputVar} is available but cannot be fully displayed here.`;
            }
        }
        // else, fallback response already set
    }

    logger.info(`${logPrefix} Workflow '${wfState.activeWorkflowId || wfState.dynamicPlan?.goal}' status: ${wfState.status}. Final output for ${userName}: ${finalResponseTextResolved.substring(0,100)}...`);
    this.activeWorkflows.delete(sessionId); // Clear state after completion or final failure handling

    return {
        responseText: finalResponseTextResolved,
        structuredData: lastToolOutputData,
        workflowFeedback: {
            workflowName: wfState.activeWorkflowId || wfState.dynamicPlan?.goal || "Workflow",
            status: wfState.status, // Reflect final status
            currentStepDescription: wfState.status === "completed" ? `All steps finished successfully, ${userName}! Here is what Minato found.` : (wfState.error || `Task ended with status: ${wfState.status}`),
        },
        isComplete: true,
        llmUsage: totalLlmUsage,
        intentType: responseIntentType,
        ttsInstructions: null, // TTS handled by orchestrator
    };
  }

  public clearWorkflowState(sessionId: string): void {
    this.activeWorkflows.delete(sessionId);
    logger.info(`[WF Engine] Cleared active workflow state for session ${sessionId}`);
  }
}