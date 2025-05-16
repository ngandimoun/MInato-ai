import { randomUUID } from "crypto";
import OpenAI from "openai";
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory";
import {
  MemoryFrameworkMessage,
  UserState,
  AnyToolStructuredData,
  ChatMessage,
  OrchestratorResponse,
  StoredMemoryUnit,
  ReminderDetails,
  PredefinedPersona,
  UserPersona,
  OpenAITtsVoice,
  ExtractedInfo,
  ChatMessageContentPart,
} from "@/lib/types/index";
import { BaseTool, ToolInput, ToolOutput } from "../tools/base-tool";
import { tools as appToolsRegistry } from "../tools/index";
import { MemoryTool } from "../tools/MemoryTool";
import { InternalTaskTool } from "../tools/InternalTaskTool";
import { TTSService } from "../providers/tts_service";
import { STTService } from "../providers/stt_service";
import { supabaseAdmin } from "../supabaseClient";
import { getSupabaseAdminClient } from "../supabase/server";
import { Security } from "../utils/security";
import {
  MAX_CHAT_HISTORY,
  SESSION_ID_PREFIX,
  DEFAULT_USER_NAME,
  MEMORY_SEARCH_LIMIT_DEFAULT,
  DEFAULT_PERSONA_ID,
  DEFAULT_TOOL_TIMEOUT_MS,
  ALLOWED_IMAGE_TYPES,
  MEDIA_UPLOAD_BUCKET,
} from "../constants";
import { appConfig, injectPromptVariables } from "../config";
import {
  generateAgentResponse, // Updated to use Responses API
  generateVisionCompletion, // Updated to use Responses API
  generateEmbeddingLC,
  generateResponseWithIntent, // Updated to use Responses API
} from "../providers/llm_clients";
import { RESPONSE_SYNTHESIS_PROMPT_TEMPLATE } from "../prompts";
import { logger } from "../../memory-framework/config";
import { safeJsonParse } from "../../memory-framework/core/utils";
import { WorkflowEngine } from "./workflow-engine";
import { CompletionUsage } from "openai/resources";

// Types for OpenAI Responses API tools
type SdkResponsesApiTool = OpenAI.Responses.Tool; // This is the correct type for defining tools for responses.create
type SdkResponsesApiFunctionCall = any; // Use 'any' or define the structure if needed

const TTS_INSTRUCTION_MAP: Record<string, string> = {
  neutral: "Tone: Warm, Pace: Natural, Pitch: Medium",
  greeting: "Tone: Friendly and welcoming, Pace: Natural, Pitch: Medium",
  farewell: "Tone: Warm and concluding, Pace: Natural, Pitch: Slightly lower",
  confirmation_positive: "Tone: Affirming and clear, Pace: Natural, Pitch: Medium",
  confirmation_negative: "Tone: Neutral but clear, Pace: Natural, Pitch: Medium",
  clarification: "Tone: Inquisitive and helpful, Pace: Slightly slower, Pitch: Rising slightly",
  celebratory: "Tone: Excited, Pace: Slightly faster, Emphasis: Moderate (20%), Pitch: Slightly higher",
  happy: "Tone: Bright, Pace: Natural, Pitch: Slightly higher",
  encouraging: "Tone: Supportive, Pace: Natural, Volume: Slightly softer",
  apologetic: "Tone: Soft, Pace: Slower, Pauses: Moderate, Pitch: Slightly lower",
  empathy: "Tone: Caring and understanding, Pace: Gentle, Pitch: Soft",
  concerned: "Tone: Serious, Pace: Slightly slower, Pitch: Slightly lower, Volume: Normal",
  disappointed: "Tone: Subdued, Pace: Slower, Pitch: Lower, Volume: -5%",
  urgent: "Tone: Firm, Pace: Rapid, Volume: +10%, Emphasis: Strong (30%)",
  calm: "Tone: Soothing, Pace: Slower, Volume: -5%",
  gentle: "Tone: Soft, Pace: Slower, Pitch: Medium-Low",
  informative: "Tone: Clear, Pace: Natural, Volume: Normal",
  instructional: "Tone: Clear and guiding, Pace: Deliberate, Pitch: Medium",
  questioning: "Tone: Curious, Pace: Natural, Intonation Contour: Rising at end",
  assertive: "Tone: Confident, Pace: Natural, Volume: +5%",
  formal: "Tone: Neutral-Serious, Pace: Measured, Articulation: Precise",
  whispering: "Tone: Breathy, Volume: -40%, Pace: Natural, Pitch: Low",
  sarcastic: "Tone: Exaggeratedly Sweet OR Flat/Monotone, Pace: Maybe slightly slower, Emphasis: Unusual stress",
  humorous: "Tone: Playful, Pace: Variable, Pitch: Variable highs/lows, Emphasis: Playful stress",
  roasting: "Tone: Playful Teasing OR Mock-Serious, Pace: Slightly faster, Emphasis: Pointed but light",
  flirtatious: "Tone: Playful-Warm, Pace: Slightly slower, Pitch: Slightly lower, Breathiness: Slight increase",
  intimate: "Tone: Soft, Warm, Pace: Slower, Pitch: Low, Volume: -15%, Breathiness: Moderate",
  thinking: "Tone: Neutral, Pace: Slowed, Pauses: Frequent short pauses",
  error: "Tone: Neutral and informative, Pace: Clear, Pitch: Medium",
  workflow_update: "Tone: Neutral and informative, Pace: Natural, Pitch: Medium",
};
const DEFAULT_INSTRUCTIONS = TTS_INSTRUCTION_MAP.neutral;

type DebugFlowType = NonNullable<NonNullable<OrchestratorResponse["debugInfo"]>["flow_type"]>;

function getDynamicInstructions(intentType?: string | null): string {
  if (intentType && TTS_INSTRUCTION_MAP[intentType]) {
    return TTS_INSTRUCTION_MAP[intentType];
  }
  logger.warn(`[Orch getDynamicInstructions] Unknown intent type "${intentType}", using default.`);
  return DEFAULT_INSTRUCTIONS;
}

function summarizeChatHistory(
  history: ChatMessage[],
  maxLength: number = 1000
): string {
  if (!history || history.length === 0) return "No recent conversation history.";
  return history
    .slice(-MAX_CHAT_HISTORY * 2) // Keep it reasonable for context length
    .map((msg) => {
      let contentPreview = "";
      if (typeof msg.content === "string") {
        contentPreview = msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : "");
      } else if (Array.isArray(msg.content)) {
        const textPart = msg.content.find((p) => p.type === "text")?.text;
        const imagePart = msg.content.find((p) => p.type === "input_image");
        contentPreview = textPart ? textPart.substring(0, 80) + (textPart.length > 80 ? "..." : "") : "";
        if (imagePart) contentPreview += " [Image]";
      } else if (msg.tool_calls) {
        contentPreview = `[Tool Call: ${msg.tool_calls[0]?.function?.name || "unknown"}]`;
      } else if (msg.role === "tool") {
        contentPreview = `[Tool Result for ${msg.name || msg.tool_call_id?.substring(0, 6) || "unknown"}]`;
      }
      const roleDisplay = msg.role === "assistant" ? "Minato" : msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
      return `${roleDisplay}: ${contentPreview || "[Empty/Non-Text Content]"}`;
    })
    .join("\n")
    .substring(0, maxLength);
}

function summarizeUserState(userState: UserState | null): string {
  if (!userState) return "No user state information available.";
  const parts: string[] = [];
  if (userState.user_first_name) parts.push(`User Name: ${userState.user_first_name}`);
  if (userState.preferred_locale) parts.push(`Preferred Locale: ${userState.preferred_locale}`);
  if (userState.latitude && userState.longitude) parts.push(`Location: ~ Lat ${userState.latitude.toFixed(2)}, Lon ${userState.longitude.toFixed(2)}`);
  if (userState.timezone) parts.push(`Timezone: ${userState.timezone}`);
  if (userState.active_persona_id) parts.push(`Active Persona: ${userState.active_persona_id}`);
  if (userState.workflow_preferences) {
    const prefCount = Object.keys(userState.workflow_preferences).filter(k => !!userState!.workflow_preferences![k as keyof typeof userState.workflow_preferences]).length;
    if (prefCount > 0) parts.push(`Workflow Prefs: ${prefCount} items`);
  }
  return parts.length > 0 ? parts.join(" | ") : "No specific user state info available.";
}

function isValidOpenAITtsVoice(voice: string | null | undefined): voice is OpenAITtsVoice {
  if (!voice) return false;
  return (appConfig.openai.ttsVoices as ReadonlyArray<string>).includes(voice);
}

export class Orchestrator {
  private ttsService = new TTSService();
  private sttService = new STTService();
  private toolRegistry: { [key: string]: BaseTool };
  private memoryFramework: CompanionCoreMemory;
  private availableToolsSchema: SdkResponsesApiTool[] = []; // Use Responses API tool type
  private workflowEngine: WorkflowEngine;

  constructor() {
    logger.info("[Orch] Initializing Orchestrator (v4.1 - OpenAI Responses API)...");
    try {
      this.memoryFramework = new CompanionCoreMemory();
      logger.info("[Orch] Memory Framework initialized.");
    } catch (memError: any) {
      logger.error("[Orch] CRITICAL: Failed init Memory Framework:", memError.message, memError.stack);
      throw new Error(`Memory init failed: ${memError.message}`);
    }
    this.workflowEngine = new WorkflowEngine();
    logger.info("[Orch] Workflow Engine initialized.");

    const memoryToolInstance = new MemoryTool(this.memoryFramework);
    const internalTaskToolInstance = new InternalTaskTool(this.memoryFramework);
    this.toolRegistry = {
      ...appToolsRegistry,
      [memoryToolInstance.name]: memoryToolInstance,
      [internalTaskToolInstance.name]: internalTaskToolInstance,
    };

    // Map BaseTool schemas to SdkResponsesApiTool[]
    this.availableToolsSchema = Object.values(this.toolRegistry)
      .filter(tool => (tool as BaseTool).enabled !== false)
      .map(tool => {
        const sanitizedParams = (tool as BaseTool).argsSchema && (tool as BaseTool).argsSchema.hasOwnProperty('properties') ? 
            appConfig.openai.apiKey ?
                (global as any).sanitizeJsonSchemaForTools((tool as BaseTool).argsSchema as Record<string, any>) : 
                (tool as BaseTool).argsSchema
            : { type: "object", properties: {}, required: [], additionalProperties: false };
        return {
          type: "function" as const,
          name: (tool as BaseTool).name,
          description: (tool as BaseTool).description,
          parameters: sanitizedParams as OpenAI.FunctionDefinition["parameters"],
          strict: true,
        } as SdkResponsesApiTool;
      });

    const toolNames = this.availableToolsSchema.map(t => (t as any).name).filter(name => name); // Get names from SdkResponsesApiTool
    logger.info(`[Orch] Registered tools for Responses API (${toolNames.length}): ${toolNames.join(', ')}`);
    if (this.availableToolsSchema.some(t => !(t as any).name || typeof (t as any).name !== 'string' || (t as any).name.trim() === '')) {
      logger.error("[Orch] CRITICAL: Tool schema generation error: Invalid name found for Responses API tool schema.");
    }
  }

  private async logInteraction(
    logData: Partial<{
      id: number | null; user_id: string; session_id: string | null; run_id: string | null;
      user_query: string | null; query_timestamp?: string; workflow_triggered_id: string | null;
      dynamic_plan_goal: string | null; flow_type: DebugFlowType; tool_calls: any | null;
      final_response_source: string | null; response_timestamp?: string; latency_ms: number | null;
      error_message: string | null; metadata?: any | null;
    }>,
    isUpdate: boolean = false,
    logIdToUpdate?: number | null
  ): Promise<number | null> {
    // ... (logging logic remains the same)
    if (!logData.user_id) {
        logger.error("[Orch InteractionLog] Cannot log without user_id.");
        return null;
    }
    const tableName = "interaction_logs";
    try {
        const adminClient = getSupabaseAdminClient();
        if (!adminClient) {
            logger.warn(`[Orch InteractionLog ${isUpdate ? "Update" : "Insert"}] Admin client unavailable.`);
            return isUpdate ? (logIdToUpdate ?? null) : null;
        }

        if (isUpdate && logIdToUpdate) {
            const { error } = await adminClient.from(tableName)
                .update({ ...logData, response_timestamp: new Date().toISOString() })
                .eq("id", logIdToUpdate);
            if (error) logger.error(`[Orch InteractionLog Update] Failed log ID ${logIdToUpdate} for user ${logData.user_id.substring(0,8)}:`, error);
            else logger.debug(`[Orch InteractionLog Update] Updated log ID ${logIdToUpdate} for user ${logData.user_id.substring(0,8)}.`);
            return logIdToUpdate;
        } else {
            const { data, error } = await adminClient.from(tableName)
                .insert({ ...logData, user_query: logData.user_query ?? "", query_timestamp: logData.query_timestamp || new Date().toISOString(), flow_type: logData.flow_type || 'pending'})
                .select("id").single();
            if (error) logger.error(`[Orch InteractionLog Insert] Failed for user ${logData.user_id.substring(0,8)}:`, error);
            else logger.debug(`[Orch InteractionLog Insert] Created log ID ${data?.id} for user ${logData.user_id.substring(0,8)}.`);
            return data?.id || null;
        }
    } catch (dbError: any) {
        logger.error(`[Orch InteractionLog] DB exception for user ${logData.user_id.substring(0,8)}:`, dbError);
        return null;
    }
  }

  private async getUserFirstName(userId: string): Promise<string> {
    // ... (remains the same)
    if (!userId) { logger.warn("[Orch getUserFirstName] No userId."); return DEFAULT_USER_NAME; }
    try {
        const state = await supabaseAdmin.getUserState(userId);
        if (state?.user_first_name?.trim()) return state.user_first_name.trim();
        const profile = await supabaseAdmin.getUserProfile(userId);
        return profile?.first_name?.trim() || profile?.full_name?.trim()?.split(" ")[0] || DEFAULT_USER_NAME;
    } catch (error: any) {
        logger.warn(`[Orch getUserFirstName] Failed fetch for user ${userId.substring(0,8)}:`, error.message);
        return DEFAULT_USER_NAME;
    }
  }

  // Updated to handle SdkResponsesApiFunctionCall[]
  private async executeToolCalls(
    userId: string,
    toolCallsFromResponsesApi: SdkResponsesApiFunctionCall[], // Changed type
    apiContext: Record<string, any>,
    userState: UserState | null
  ): Promise<{ messages: ChatMessage[]; lastStructuredData: AnyToolStructuredData | null; llmUsage: null }> {
    const logPrefix = `[ToolExecutor User:${userId.substring(0, 8)} Sess:${apiContext?.sessionId?.substring(0, 6)}]`;
    const toolResultsMessages: ChatMessage[] = [];
    const structuredDataMap: Map<string, AnyToolStructuredData | null> = new Map();

    // Map SdkResponsesApiFunctionCall to the internal ChatCompletionMessageToolCall format if necessary for downstream,
    // or adapt the rest of the logic to use SdkResponsesApiFunctionCall directly.
    // For now, let's assume direct usage or simple mapping.
    // The key difference is `call_id` vs `id` and `arguments` (string) vs `function.arguments` (string).

    const executionPromises = toolCallsFromResponsesApi.map(async (toolCall) => {
      // toolCall is now SdkResponsesApiFunctionCall, so it doesn't have a `type` property directly.
      // It *is* a function call.
      const toolName = toolCall.name;
      const tool = this.toolRegistry[toolName];
      const callId = toolCall.call_id; // Use call_id

      if (!tool) {
        logger.error(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0,6)}) not found.`);
        return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: Tool '${toolName}' is not available.` };
      }

      let toolArgs: Record<string, any> = {};
      try {
        toolArgs = JSON.parse(toolCall.arguments || "{}"); // toolCall.arguments is directly the JSON string
        logger.info(`${logPrefix} Executing tool '${toolName}' (ID: ${callId.substring(0,6)}) Args: ${JSON.stringify(toolArgs).substring(0,100)}`);
      } catch (parseError: any) {
        logger.error(`${logPrefix} Arg parse error for '${toolName}' (ID: ${callId.substring(0,6)}): ${parseError.message}. Raw: ${toolCall.arguments}`);
        return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: Invalid args for '${toolName}'.` };
      }

      const abortController = new AbortController();
      const timeoutDuration = (tool as any).timeoutMs || appConfig.toolTimeoutMs || DEFAULT_TOOL_TIMEOUT_MS;
      const timeoutId = setTimeout(() => {
        logger.warn(`${logPrefix} Timeout (${timeoutDuration}ms) for '${toolName}' (ID: ${callId.substring(0,6)})`);
        abortController.abort();
      }, timeoutDuration);

      try {
        const toolInput: ToolInput = {
          ...toolArgs,
          userId,
          lang: apiContext?.lang || userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0],
          sessionId: apiContext?.sessionId,
          context: {
            ...(apiContext || {}),
            locale: userState?.preferred_locale || appConfig.defaultLocale,
            countryCode: userState?.country_code || apiContext?.countryCode || null,
            userState,
            runId: apiContext?.runId,
            latitude: userState?.latitude ?? apiContext?.latitude,
            longitude: userState?.longitude ?? apiContext?.longitude,
            timezone: userState?.timezone ?? apiContext?.timezone,
            abortSignal: abortController.signal,
            userName: await this.getUserFirstName(userId),
          },
        };
        const output: ToolOutput = await tool.execute(toolInput, abortController.signal);
        clearTimeout(timeoutId);
        logger.info(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0,6)}) finished. Success: ${!output.error}`);
        if (!output.error && output.structuredData) structuredDataMap.set(callId, output.structuredData);
        else structuredDataMap.set(callId, null);
        const resultString = output.error ? `Error from ${toolName}: ${output.error}` : String(output.result || `${toolName} completed.`).substring(0, 4000);
        return { role: "tool" as const, tool_call_id: callId, name: toolName, content: resultString };
      } catch (error: any) {
        clearTimeout(timeoutId);
        const isAbort = error.name === 'AbortError' || abortController.signal.aborted;
        const errorMsg = isAbort ? `Tool '${toolName}' timed out.` : `Tool '${toolName}' error: ${error.message}`;
        logger.error(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0,6)}) ${isAbort ? "TIMEOUT" : "EXCEPTION"}: ${error.message}`);
        structuredDataMap.set(callId, null);
        return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: ${errorMsg}` };
      }
    });

    const settledResults = await Promise.allSettled(executionPromises);
    let lastSuccessfulStructuredData: AnyToolStructuredData | null = null;

    for (let i = 0; i < settledResults.length; i++) {
        const result = settledResults[i];
        const originalCallId = toolCallsFromResponsesApi[i].call_id; // Use call_id
        if (result.status === "fulfilled" && result.value) {
            toolResultsMessages.push(result.value as ChatMessage);
            if (!result.value.content.startsWith("Error:") && structuredDataMap.has(originalCallId)) {
                const data = structuredDataMap.get(originalCallId);
                if (data) lastSuccessfulStructuredData = data;
            }
        } else if (result.status === "rejected") {
            logger.error(`${logPrefix} Unexpected parallel exec error for tool call ID ${originalCallId}:`, result.reason);
            toolResultsMessages.push({ role: "tool", tool_call_id: originalCallId, name: toolCallsFromResponsesApi[i].name, content: `Error: Internal error executing tool.` } as ChatMessage);
        }
    }
    return { messages: toolResultsMessages, lastStructuredData: lastSuccessfulStructuredData, llmUsage: null };
  }


  public async runOrchestration(
    userId: string,
    userInput: string | ChatMessageContentPart[],
    history: ChatMessage[] = [],
    apiContext?: Record<string, any>
  ): Promise<OrchestratorResponse> {
    const overallStartTime = Date.now();
    const runId = apiContext?.sessionId || apiContext?.runId || `${SESSION_ID_PREFIX}${randomUUID()}`;
    const turnIdentifier = `OrchRun User:${userId.substring(0,8)} Run:${runId.substring(0,6)}`;
    logger.info(`--- ${turnIdentifier} Starting Orchestration Run (Responses API v2) ---`);

    let initialQueryTextForLog: string | null = null;
    if (typeof userInput === 'string') initialQueryTextForLog = userInput;
    else if (Array.isArray(userInput)) initialQueryTextForLog = userInput.find(p => p.type === 'text')?.text || "[Multimodal Input]";
    else initialQueryTextForLog = "[Unknown Input Type]";

    let logEntryId: number | null = await this.logInteraction({
        user_id: userId, session_id: apiContext?.sessionId || null, run_id: runId,
        user_query: initialQueryTextForLog, flow_type: 'pending'
    });

    let finalStructuredResult: AnyToolStructuredData | null = null;
    let cacheHit = false;
    let cacheSourceApi: string | null = null;
    let finalResponseText: string | null = null;
    let clarificationQuestionFromWorkflow: string | null = null;
    let responseGenMs_total: number = 0;
    let memoryAddStartTime: number | undefined, memoryAddMs: number | undefined;
    let embeddingMs_total: number = 0, cacheCheckMs_total: number = 0;
    let toolExecutionMs_total: number = 0;
    let responseIntentType: string | null = "neutral";
    let llmUsage_total: CompletionUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let workflowFeedback: OrchestratorResponse['workflowFeedback'] = null;
    let finalFlowType: DebugFlowType = "error";
    let finalToolCallsLog: any | null = null; // For logging the calls made by the LLM
    let finalResponseSource: string | null = "Error";
    let finalAudioUrl: string | null = null;

    const userName = await this.getUserFirstName(userId);
    const userState: UserState | null = await supabaseAdmin.getUserState(userId);
    let lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en";
    const effectiveApiContext = { ...(apiContext || {}), userName, lang, locale: userState?.preferred_locale || appConfig.defaultLocale };
    let workflowRunResultFromEngine: Awaited<ReturnType<WorkflowEngine['startOrContinueWorkflow']>> | null = null;

    // --- Persona Fetch and System Instructions Construction ---
    let baseSystemInstructions = RESPONSE_SYNTHESIS_PROMPT_TEMPLATE; // Default base
    let personaNameForPrompt = "Minato"; // Default if no persona found
    let personaSpecificInstructions = "You are Minato, a helpful, friendly, and knowledgeable assistant."; // Default
    let personaId = userState?.active_persona_id || DEFAULT_PERSONA_ID;

    try {
      // Use memoryFramework.getPersonaById, ensuring userId is passed for user-specific personas
      const persona = await this.memoryFramework.getPersonaById(personaId, userId);
      if (persona && persona.system_prompt) {
        personaSpecificInstructions = persona.system_prompt;
        personaNameForPrompt = persona.name || personaId;
        logger.info(`[${turnIdentifier}] Loaded persona: '${personaNameForPrompt}' (ID: ${personaId})`);
      } else {
        logger.warn(`[${turnIdentifier}] Persona ID '${personaId}' not found or missing system_prompt. Using default persona.`);
      }
    } catch (personaError: any) {
      logger.error(`[${turnIdentifier}] Error fetching persona ${personaId}:`, personaError.message);
    }
    // Inject persona instructions into the base template
    // The `RESPONSE_SYNTHESIS_PROMPT_TEMPLATE` already has placeholders like {personaName} and {personaInstructions}
    // The `instructions` param for responses.create will take this fully formed prompt.

    try {
      let primaryQueryText: string | null;
      let fullInputContent: ChatMessage["content"] = userInput; // This can be string | ChatMessageContentPart[]
      let multimodalInput = Array.isArray(userInput) && userInput.some(p => p.type === "input_image");

      if (typeof userInput === 'string') primaryQueryText = userInput;
      else if (Array.isArray(userInput)) primaryQueryText = userInput.find(p => p.type === 'text')?.text || (multimodalInput ? "[Visual Analysis Query]" : "[Empty Query]");
      else primaryQueryText = "[Unknown Input Type]";

      if (!primaryQueryText?.trim() && !multimodalInput) {
        logger.warn(`[${turnIdentifier}] Empty input.`);
        finalFlowType = "error"; responseIntentType = "questioning";
        finalResponseText = `Is there something I can help you with, ${userName}?`;
      } else {
        logger.info(`[${turnIdentifier}] Attempting workflow for query: "${primaryQueryText?.substring(0,100)}..."`);
        workflowRunResultFromEngine = await this.workflowEngine.startOrContinueWorkflow(runId, userId, primaryQueryText || "", history, userState, effectiveApiContext);
        workflowFeedback = workflowRunResultFromEngine.workflowFeedback;
        if (workflowRunResultFromEngine.llmUsage) {
            llmUsage_total.prompt_tokens += workflowRunResultFromEngine.llmUsage.prompt_tokens || 0;
            llmUsage_total.completion_tokens += workflowRunResultFromEngine.llmUsage.completion_tokens || 0;
            llmUsage_total.total_tokens += workflowRunResultFromEngine.llmUsage.total_tokens || 0;
        }
        responseIntentType = workflowRunResultFromEngine.intentType || "neutral";
        let proceedToStandardLLM = false;

        if (workflowRunResultFromEngine.error) {
          finalFlowType = "error"; finalResponseSource = workflowFeedback?.workflowName ? `Workflow Error (${workflowFeedback.workflowName})` : "Workflow Error";
          finalResponseText = workflowRunResultFromEngine.responseText || `I encountered an issue with that request, ${userName}.`;
          finalStructuredResult = workflowRunResultFromEngine.structuredData;
          logger.error(`[${turnIdentifier}] Workflow failed: ${workflowRunResultFromEngine.error}`);
        } else if (!workflowRunResultFromEngine.isComplete) {
          finalFlowType = "clarification"; finalResponseSource = workflowFeedback?.workflowName ? `Workflow Clarification (${workflowFeedback.workflowName})` : "Workflow Clarification";
          clarificationQuestionFromWorkflow = injectPromptVariables(workflowRunResultFromEngine.clarificationQuestion || `I need a bit more info, {userName}.`, { userName });
          finalResponseText = workflowRunResultFromEngine.responseText;
          finalStructuredResult = workflowRunResultFromEngine.structuredData;
          logger.info(`[${turnIdentifier}] Workflow requires clarification: ${clarificationQuestionFromWorkflow}`);
        } else if (workflowRunResultFromEngine.isComplete && (workflowRunResultFromEngine.responseText || workflowRunResultFromEngine.structuredData)) {
          finalFlowType = "workflow"; finalResponseSource = workflowFeedback?.workflowName || "Workflow Completion";
          finalResponseText = injectPromptVariables(workflowRunResultFromEngine.responseText || `The process is complete, {userName}.`, { userName });
          finalStructuredResult = workflowRunResultFromEngine.structuredData;
          logger.info(`[${turnIdentifier}] Workflow completed. Response: "${finalResponseText.substring(0,100)}..."`);
        } else {
          logger.info(`[${turnIdentifier}] Workflow undecided. Proceeding to standard LLM.`);
          proceedToStandardLLM = true;
        }

        if (proceedToStandardLLM) {
          finalFlowType = "direct_llm"; finalResponseSource = "LLM Response";
          const memSearchStart = Date.now();
          // Pass persona context to memory search for potential biasing/filtering
          const personaContextForMemory = {
            traits: (effectiveApiContext as any).personaTraits,
            preferredTools: (effectiveApiContext as any).preferredTools,
            avoidTools: (effectiveApiContext as any).avoidTools,
            style: (effectiveApiContext as any).style,
            tone: (effectiveApiContext as any).tone,
          };
          const memoryResults = await this.memoryFramework.search_memory(
            primaryQueryText || "", userId,
            { limit: MEMORY_SEARCH_LIMIT_DEFAULT, offset: 0 }, runId,
            { enableHybridSearch: true, enableGraphSearch: true, enableConflictResolution: true },
            personaContextForMemory
          );
          embeddingMs_total += (Date.now() - memSearchStart);
          const retrievedMemoryContext = memoryResults.results.length > 0
            ? `INTERNAL CONTEXT - RELEVANT MEMORIES (Use these to personalize your response for ${userName}):\n${memoryResults.results.map(r => `- ${r.content} (Score: ${r.final_score?.toFixed(2)}) ${r.is_latest_fact === false ? "[Possibly Outdated]" : ""}`).join("\n")}`
            : "INTERNAL CONTEXT - RELEVANT MEMORIES: None found for this query.";

          let semanticCacheUsed = false;
          if (!multimodalInput && primaryQueryText && primaryQueryText.length > 10 && appConfig.semanticCache.enabled) {
            const embedStart = Date.now();
            const queryEmbeddingResult = await generateEmbeddingLC(primaryQueryText);
            embeddingMs_total += (Date.now() - embedStart);
            if (!("error" in queryEmbeddingResult)) {
              const cacheStart = Date.now();
              const cachedEntry = await this.memoryFramework.checkSemanticCache(primaryQueryText, queryEmbeddingResult);
              cacheCheckMs_total += (Date.now() - cacheStart);
              if (cachedEntry) {
                cacheHit = true; cacheSourceApi = cachedEntry.source_api; finalStructuredResult = cachedEntry.structured_result;
                semanticCacheUsed = true; finalFlowType = "cache_hit"; finalResponseSource = `Cache (${cacheSourceApi})`;
                
                const systemInstructionsForCacheResponse = injectPromptVariables(RESPONSE_SYNTHESIS_PROMPT_TEMPLATE, {
                  userName, personaName: personaNameForPrompt, personaInstructions: personaSpecificInstructions, language: lang,
                  available_tools_summary: "N/A (cached)", retrieved_memory_context: retrievedMemoryContext,
                  tool_results_summary: `Cached info from ${cachedEntry.source_api} for ${userName}. Data: ${JSON.stringify(cachedEntry.structured_result, null, 2).substring(0, 300)}...`,
                  original_query: primaryQueryText,
                });
                const llmRespIntent = await generateResponseWithIntent(
                    systemInstructionsForCacheResponse,
                    `User ${userName} asked: "${primaryQueryText}". Cached info found. Synthesize response.`,
                    [], appConfig.openai.extractionModel, 250, userId
                );
                if ("error" in llmRespIntent) {
                    finalResponseText = `Found cached info for ${userName}, but had trouble presenting it.`; responseIntentType = "apologetic";
                } else {
                    finalResponseText = llmRespIntent.responseText; responseIntentType = llmRespIntent.intentType;
                }
              }
            } else {
              logger.warn(`[${turnIdentifier}] Embedding fail for cache: ${queryEmbeddingResult.error}`);
            }
          }

          if (!semanticCacheUsed) {
            const systemInstructionsForLoop = injectPromptVariables(RESPONSE_SYNTHESIS_PROMPT_TEMPLATE, {
              userName, personaName: personaNameForPrompt, personaInstructions: personaSpecificInstructions, language: lang,
              available_tools_summary: this.availableToolsSchema.map(t => `- ${(t as any).name}: ${(t as any).description?.substring(0, 100)}...`).join('\n'),
              retrieved_memory_context: retrievedMemoryContext,
              tool_results_summary: "", // Initially empty for the first LLM call
              original_query: primaryQueryText,
            });

            let currentMessages: ChatMessage[] = [
              ...history,
              { role: "user", content: fullInputContent, name: userName, timestamp: Date.now() },
            ];
            const MAX_TOOL_ITERATIONS = 3;
            let iteration = 0;
            let latestStructuredDataFromLoop: AnyToolStructuredData | null = null;

            while (iteration < MAX_TOOL_ITERATIONS) {
              iteration++;
              logger.info(`[${turnIdentifier}] LLM Loop Iter ${iteration} (Model: ${appConfig.openai.chatModel}). Msgs: ${currentMessages.length}`);
              const llmStartTime = Date.now();

              // Use generateAgentResponse (which now uses Responses API)
              const agentResponse = await generateAgentResponse(
                currentMessages,
                this.availableToolsSchema as any, // Cast if SdkResponsesApiTool[] is not directly assignable
                                                  // to OpenAI.Chat.Completions.ChatCompletionTool[] (it shouldn't be)
                                                  // This needs to be SdkResponsesApiTool[]
                "auto", // tool_choice
                appConfig.openai.chatModel, // model
                undefined, // maxTokens
                userId,
                iteration > 1 ? injectPromptVariables(RESPONSE_SYNTHESIS_PROMPT_TEMPLATE, { // Update tool_results_summary for subsequent iterations
                    userName, personaName: personaNameForPrompt, personaInstructions: personaSpecificInstructions, language: lang,
                    available_tools_summary: this.availableToolsSchema.map(t => `- ${(t as any).name}: ${(t as any).description?.substring(0, 100)}...`).join('\n'),
                    retrieved_memory_context: retrievedMemoryContext,
                    tool_results_summary: currentMessages.filter(m => m.role === 'tool').map(m => `Result for ${m.name}: ${typeof m.content === 'string' ? m.content.substring(0,100) : '[complex content]' }`).join('\n') || "No tool results yet.",
                    original_query: primaryQueryText,
                  }) : systemInstructionsForLoop // instructions
              );
              responseGenMs_total += (Date.now() - llmStartTime);
              if (agentResponse.usage) {
                  llmUsage_total.prompt_tokens += agentResponse.usage.prompt_tokens || 0;
                  llmUsage_total.completion_tokens += agentResponse.usage.completion_tokens || 0;
                  llmUsage_total.total_tokens += agentResponse.usage.total_tokens || 0;
              }
              if (agentResponse.error) throw new Error(`LLM agent error: ${agentResponse.error}`);

              const assistantMessageContent = agentResponse.responseContent;
              // The tool_calls from generateAgentResponse are now our internal ChatCompletionMessageToolCall[]
              // We need to map them to SdkResponsesApiFunctionCall[] if we were to pass them back to the *same* Responses API.
              // However, here we are *executing* them. So, the internal ChatCompletionMessageToolCall[] is fine.
              const toolCallsToExecute = agentResponse.toolCalls;
              const finishReason = agentResponse.finishReason;
              let assistantResponseText = assistantMessageContent;
              let intentFromLLM = "neutral";

              // Check if assistantMessageContent itself is the JSON for intent
              if (assistantMessageContent && assistantMessageContent.startsWith("{") && assistantMessageContent.includes('"responseText"')) {
                const parsed = safeJsonParse<any>(assistantMessageContent);
                if (parsed && parsed.responseText && parsed.intentType) {
                  assistantResponseText = parsed.responseText;
                  intentFromLLM = parsed.intentType;
                } else {
                  logger.warn(`[${turnIdentifier}] Failed to parse intent JSON from LLM content: ${assistantMessageContent.substring(0,100)}`);
                }
              }

              const assistantMessageForHistory: ChatMessage = {
                role: "assistant", content: assistantResponseText,
                tool_calls: toolCallsToExecute ? toolCallsToExecute.map(tc => ({
                    id: tc.id,
                    type: tc.type, // 'function'
                    function: { name: tc.function.name, arguments: tc.function.arguments }
                })) : undefined,
                timestamp: Date.now()
              };
              if (!assistantResponseText && toolCallsToExecute && toolCallsToExecute.length > 0) {
                assistantMessageForHistory.content = null; // If only tool calls, content can be null
              }
              currentMessages.push(assistantMessageForHistory);

              if (finishReason === "stop" || (assistantResponseText && (!toolCallsToExecute || toolCallsToExecute.length === 0))) {
                finalResponseText = assistantResponseText;
                responseIntentType = intentFromLLM;
                finalStructuredResult = latestStructuredDataFromLoop;
                logger.info(`[${turnIdentifier}] LLM final response iter ${iteration}. Finish: ${finishReason}.`);
                break;
              } else if (toolCallsToExecute && toolCallsToExecute.length > 0) {
                finalFlowType = "single_tool";
                finalResponseSource = `Tool(s): ${toolCallsToExecute.map(tc => tc.function.name).join(', ')}`;
                finalToolCallsLog = toolCallsToExecute.map(tc => ({ toolName: tc.function.name, args: safeJsonParse(tc.function.arguments) || tc.function.arguments }));
                logger.info(`[${turnIdentifier}] LLM requests ${toolCallsToExecute.length} tool(s) iter ${iteration}.`);

                // Map our internal ChatCompletionMessageToolCall[] to SdkResponsesApiFunctionCall[] for executeToolCalls
                const sdkToolCallsForExecution: SdkResponsesApiFunctionCall[] = toolCallsToExecute.map(tc => ({
                    type: "function_call", // This is the type for the *output* item from Responses API, not an input type
                    call_id: tc.id,
                    name: tc.function.name,
                    arguments: tc.function.arguments
                }));

                const toolExecStart = Date.now();
                const toolExecResult = await this.executeToolCalls(userId, sdkToolCallsForExecution, effectiveApiContext, userState);
                toolExecutionMs_total += (Date.now() - toolExecStart);
                currentMessages.push(...toolExecResult.messages); // These are already ChatMessage[]
                if (toolExecResult.lastStructuredData) latestStructuredDataFromLoop = toolExecResult.lastStructuredData;
              } else {
                logger.warn(`[${turnIdentifier}] Loop iter ${iteration} ended unexpectedly. Reason: ${finishReason}. Content: "${assistantResponseText ? assistantResponseText.substring(0,50) : "None"}"`);
                finalResponseText = assistantResponseText || `Apologies, ${userName}, my thoughts trailed off.`;
                responseIntentType = intentFromLLM;
                finalStructuredResult = latestStructuredDataFromLoop;
                break;
              }
              if (iteration === MAX_TOOL_ITERATIONS) {
                logger.warn(`[${turnIdentifier}] Max tool iterations reached.`);
                finalResponseText = assistantResponseText || `I've tried a few things, ${userName}, but couldn't fully resolve. Rephrase?`;
                responseIntentType = intentFromLLM;
                finalStructuredResult = latestStructuredDataFromLoop;
                break;
              }
            }
          }
        }
      }

      // ... (memory add logic - should be fine if input is correctly typed) ...
      const userMemoryMsgForAdd: MemoryFrameworkMessage | null = fullInputContent ? { role: 'user', content: typeof fullInputContent === 'string' ? fullInputContent : JSON.stringify(fullInputContent), name: userName } : null;
      const finalAssistantMemoryMsg: MemoryFrameworkMessage | null = finalResponseText ? { role: 'assistant', content: finalResponseText, name: "Minato" } : null;
      const finalTurnForMemory: MemoryFrameworkMessage[] = [userMemoryMsgForAdd, finalAssistantMemoryMsg].filter((m): m is MemoryFrameworkMessage => m !== null);

      if (finalTurnForMemory.length > 0) {
          memoryAddStartTime = Date.now();
          this.memoryFramework.add_memory(finalTurnForMemory, userId, runId, null)
              .then(success => {
                  memoryAddMs = Date.now() - (memoryAddStartTime || Date.now());
                  logger.info(`[${turnIdentifier}] Async memory add OK: ${success} (${memoryAddMs}ms).`);
                  if (logEntryId && memoryAddMs !== undefined) this.logInteraction({ user_id: userId, metadata: { memoryAddMs } }, true, logEntryId).catch(e => logger.error("Log update error:", e));
              })
              .catch(e => logger.error(`[${turnIdentifier}] Async memory add FAIL:`, e.message));
      } else {
          logger.warn(`[${turnIdentifier}] Skipping memory write: incomplete/empty turn.`);
      }


      const orchestrationMs = Date.now() - overallStartTime;
      finalResponseText = finalResponseText ? injectPromptVariables(finalResponseText, { userName }) : null;
      clarificationQuestionFromWorkflow = clarificationQuestionFromWorkflow ? injectPromptVariables(clarificationQuestionFromWorkflow, { userName }) : null;
      if (finalResponseText && !finalResponseText.toLowerCase().includes("minato")) {
         // finalResponseText += " - Minato"; // Removed as per user request that Minato always refer his name
      }
      const finalTtsInstructionsResolved = getDynamicInstructions(responseIntentType);
      if (finalFlowType === "error" && !clarificationQuestionFromWorkflow && finalResponseText) {
          finalFlowType = "direct_llm";
      }

      const debugInfoInternal: OrchestratorResponse['debugInfo'] = {
          flow_type: finalFlowType,
          llmModelUsed: appConfig.openai.chatModel, // Main model used in loop
          llmUsage: llmUsage_total,
          workflowPlannerModelUsed: appConfig.openai.planningModel,
          cacheHit, cacheSourceApi,
          latencyMs: orchestrationMs,
          toolExecutionMs: toolExecutionMs_total,
          responseGenMs: responseGenMs_total,
          memoryAddMs, embeddingMs: embeddingMs_total, cacheCheckMs: cacheCheckMs_total,
          sttModelUsed: null, ttsModelUsed: null,
          visionModelUsed: multimodalInput ? appConfig.openai.visionModel : null,
          realtimeModelUsed: null,
          toolCalls: finalToolCallsLog,
          toolResultsSummary: {}, // Could populate this if needed for debug
          usage: llmUsage_total
      };

      logger.info(`--- ${turnIdentifier} Orchestration complete (${orchestrationMs}ms). Flow: ${finalFlowType} ---`);
      if (logEntryId) {
          this.logInteraction({
              user_id: userId, latency_ms: orchestrationMs, flow_type: finalFlowType, tool_calls: finalToolCallsLog,
              final_response_source: finalResponseSource,
              error_message: finalFlowType === 'error' ? workflowRunResultFromEngine?.error || "Orch error" : null,
              workflow_triggered_id: workflowFeedback?.workflowName,
              metadata: { intent: responseIntentType, cacheHit, cacheSourceApi, llmUsage: llmUsage_total }
          }, true, logEntryId).catch(e => logger.error("Log update error:", e));
      }

      return {
        sessionId: runId,
        response: finalResponseText,
        intentType: responseIntentType,
        ttsInstructions: finalTtsInstructionsResolved,
        clarificationQuestion: clarificationQuestionFromWorkflow || undefined,
        error: finalFlowType === 'error' ? (workflowRunResultFromEngine?.error || "Processing error") : null,
        lang: lang,
        structuredData: finalStructuredResult,
        workflowFeedback,
        debugInfo: debugInfoInternal,
        audioUrl: finalAudioUrl,
        transcription: apiContext?.transcription || null,
        llmUsage: llmUsage_total,
      };

    } catch (error: any) {
      // ... (error handling remains largely the same, ensure it returns all fields of OrchestratorResponse) ...
      const duration = Date.now() - overallStartTime;
      logger.error(`[${turnIdentifier}] Orchestration FAILED (${duration}ms):`, error.message, error.stack);
      let errorMsg = error.message || "Orchestration process failed unexpectedly.";
      if (error.cause) errorMsg = `${errorMsg} (Cause: ${error.cause})`;
      finalFlowType = 'error'; finalResponseSource = "Orchestration Exception";

      const failureSummaryForMemory = `Minato encountered an internal error for ${userName || 'user'}: ${errorMsg}`.substring(0,350);
      this.memoryFramework.add_memory([], userId, runId, failureSummaryForMemory)
          .catch(memErr => logger.error(`[${turnIdentifier}] Failed logging orch error to memory:`, memErr));

      if (logEntryId) {
          this.logInteraction({
              user_id: userId, latency_ms: duration, flow_type: 'error', error_message: errorMsg.substring(0,500)
          }, true, logEntryId).catch(e => logger.error("Log update error:", e));
      } else {
           this.logInteraction({
              user_id: userId, session_id: apiContext?.sessionId || null, run_id: runId,
              user_query: initialQueryTextForLog, flow_type: 'error',
              latency_ms: duration, error_message: errorMsg.substring(0,500)
          }).catch(e => logger.error("Initial error log insert fail:", e));
      }
      const userNameForError = userName || DEFAULT_USER_NAME;
      responseIntentType = "apologetic";

      const debugInfoOnError: OrchestratorResponse['debugInfo'] = {
          flow_type: 'error',
          llmUsage: llmUsage_total,
          latencyMs: duration,
          toolExecutionMs: toolExecutionMs_total,
          responseGenMs: responseGenMs_total,
          memoryAddMs, embeddingMs: embeddingMs_total, cacheCheckMs: cacheCheckMs_total,
          workflowPlannerModelUsed: appConfig.openai.planningModel,
      };
      return {
          sessionId: runId,
          response: `I apologize, ${userNameForError}. I encountered an internal error. Minato is looking into it.`,
          error: errorMsg,
          lang: lang,
          audioUrl: null,
          intentType: responseIntentType,
          ttsInstructions: getDynamicInstructions(responseIntentType),
          debugInfo: debugInfoOnError,
          workflowFeedback,
          clarificationQuestion: undefined,
          structuredData: null,
          transcription: apiContext?.transcription || null,
          llmUsage: llmUsage_total,
      };
    }
  }

  // processTextMessage and processVisionMessage remain largely the same,
  // as they delegate to runOrchestration which now handles the Responses API.
  // The key is that the `userInput` and `apiContext` are correctly formed.

  async processTextMessage(
    userId: string,
    text: string | null, // Text can be null if it's just an image upload without text.
    history: ChatMessage[] = [],
    sessionId?: string,
    apiContext?: Record<string, any>
  ): Promise<OrchestratorResponse> {
    const userState = await supabaseAdmin.getUserState(userId);
    const lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en";
    const effectiveSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;
    const effectiveApiContext = { ...apiContext, sessionId: effectiveSessionId, locale: userState?.preferred_locale || appConfig.defaultLocale, lang, userName: await this.getUserFirstName(userId) };

    const inputText = text ?? ""; // Ensure userInput is a string for runOrchestration if no images

    const result = await this.runOrchestration(userId, inputText, history, effectiveApiContext);
    return {
      sessionId: effectiveSessionId,
      response: result.response,
      intentType: result.intentType,
      ttsInstructions: result.ttsInstructions,
      clarificationQuestion: result.clarificationQuestion,
      error: result.error,
      lang: result.lang || lang,
      structuredData: result.structuredData,
      workflowFeedback: result.workflowFeedback,
      debugInfo: result.debugInfo,
      audioUrl: result.audioUrl,
      transcription: result.transcription,
      llmUsage: result.llmUsage,
    };
  }

  async processVisionMessage(
    userId: string,
    textPrompt: string, // This is the text part of the multimodal input
    media: Array<{ mimeType: string; data: string }>, // Base64 encoded media
    history: ChatMessage[] = [],
    sessionId?: string,
    apiContext?: Record<string, any>
  ): Promise<OrchestratorResponse> {
    const visionIsEnabled = appConfig.openai.enableVision === true;
    const logPrefix = `[Orch Vision User:${userId.substring(0,8)}]`;
    const effectiveSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;

    if (!visionIsEnabled) {
        logger.warn(`${logPrefix} Vision processing disabled.`);
        return { sessionId: effectiveSessionId, error: "Vision processing is disabled.", debugInfo: { flow_type: 'error' }, llmUsage: null, clarificationQuestion: null, structuredData: null, response: null, intentType: "error", ttsInstructions: null, lang: apiContext?.lang || "en", workflowFeedback: null, audioUrl: null, transcription: null };
    }

    // Construct ChatMessageContentPart[] for runOrchestration
    const visionInputContentParts: ChatMessageContentPart[] = [];
    if (textPrompt && textPrompt.trim()) {
        visionInputContentParts.push({ type: "text", text: Security.sanitizeText(textPrompt).trim() });
    }

    const imageContentParts: ChatMessageContentPart[] = media
      .filter(item => item.mimeType?.startsWith("image/") && ALLOWED_IMAGE_TYPES.includes(item.mimeType) && item.data)
      .map(item => ({
        type: "input_image",
        image_url: `data:${item.mimeType};base64,${item.data}`,
        detail: appConfig.openai.visionDetail as "auto" | "low" | "high",
      }));

    if (imageContentParts.length === 0 && visionInputContentParts.length === 0) { // If no text and no valid images
        logger.warn(`${logPrefix} No valid images or text prompt for vision.`);
        return { sessionId: effectiveSessionId, error: "No valid images or text provided for vision analysis.", debugInfo: { flow_type: 'error' }, llmUsage: null, clarificationQuestion: null, structuredData: null, response: null, intentType: "error", ttsInstructions: null, lang: apiContext?.lang || "en", workflowFeedback: null, audioUrl: null, transcription: null };
    }
    
    const fullVisionInput: ChatMessageContentPart[] = [...visionInputContentParts, ...imageContentParts];
    if (fullVisionInput.length === 0) { // Fallback if logic above somehow missed it
        logger.warn(`${logPrefix} Constructed vision input is empty.`);
        return { sessionId: effectiveSessionId, error: "No content for vision analysis.", debugInfo: { flow_type: 'error' }, llmUsage: null, clarificationQuestion: null, structuredData: null, response: null, intentType: "error", ttsInstructions: null, lang: apiContext?.lang || "en", workflowFeedback: null, audioUrl: null, transcription: null };
    }


    const userState = await supabaseAdmin.getUserState(userId);
    const lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || "en";
    const effectiveApiContext = { ...apiContext, sessionId: effectiveSessionId, locale: userState?.preferred_locale || appConfig.defaultLocale, lang, userName: await this.getUserFirstName(userId) };

    // Call runOrchestration with the ChatMessageContentPart[]
    const result = await this.runOrchestration(userId, fullVisionInput, history, effectiveApiContext);

    return {
      sessionId: effectiveSessionId,
      response: result.response,
      intentType: result.intentType,
      ttsInstructions: result.ttsInstructions,
      clarificationQuestion: result.clarificationQuestion,
      error: result.error,
      lang: result.lang || lang,
      structuredData: result.structuredData,
      workflowFeedback: result.workflowFeedback,
      debugInfo: { ...(result.debugInfo || {}), visionModelUsed: appConfig.openai.visionModel, flow_type: result.debugInfo?.flow_type || 'direct_llm' },
      audioUrl: result.audioUrl,
      transcription: result.transcription,
      llmUsage: result.llmUsage,
    };
  }

  // processAudioMessage remains unchanged as it uses dedicated STT/TTS services
  // and then calls runOrchestration with the transcribed text.
  async processAudioMessage(
    userId: string,
    audioSignedUrl: string,
    history: ChatMessage[] = [],
    sessionId?: string,
    apiContext?: Record<string, any>
  ): Promise<OrchestratorResponse> {
    // ... (this method's logic remains the same as it correctly uses STTService and then runOrchestration)
    const currentSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;
    const startTime = Date.now();
    const turnIdentifier = `Req[Audio] User:${userId.substring(0,8)} Sess:${currentSessionId.substring(0,6)}`;
    let transcribedText: string | null = null;
    let detectedLang: string | null = null;
    let audioFetchDuration: number | undefined, sttDuration: number | undefined, ttsDuration: number | undefined;
    let orchResult: OrchestratorResponse | null = null;
    let logEntryId: number | null = await this.logInteraction({
        user_id: userId, session_id: currentSessionId, run_id: currentSessionId, flow_type: 'pending'
    });

    try {
        const fetchStart = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const fetchResponse = await fetch(audioSignedUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!fetchResponse.ok) throw new Error(`Audio fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
        const audioBuffer = Buffer.from(await fetchResponse.arrayBuffer());
        audioFetchDuration = Date.now() - fetchStart;
        if (audioBuffer.length === 0) throw new Error("Fetched audio is empty.");

        const sttStart = Date.now();
        const contentTypeHeader = fetchResponse.headers.get("content-type") || undefined;
        const transcriptionResult = await this.sttService.transcribeAudio(audioBuffer, undefined, undefined, contentTypeHeader);
        sttDuration = Date.now() - sttStart;
        if (transcriptionResult.error || !transcriptionResult.text?.trim()) throw new Error(transcriptionResult.error || "Empty transcription.");
        transcribedText = transcriptionResult.text;
        detectedLang = transcriptionResult.language || null;
        logger.info(`[${turnIdentifier}] STT OK. Lang: ${detectedLang || "unk"}. Text: "${transcribedText.substring(0,50)}..."`);
        if (logEntryId) this.logInteraction({ user_id: userId, user_query: transcribedText }, true, logEntryId).catch(e => logger.error("Log update fail:", e));

        const userState = await supabaseAdmin.getUserState(userId);
        const lang = detectedLang || apiContext?.lang || userState?.preferred_locale?.split("-")[0] || "en";
        const effectiveApiContext = { ...apiContext, sessionId: currentSessionId, runId: currentSessionId, locale: userState?.preferred_locale || appConfig.defaultLocale, lang, detectedLanguage: detectedLang, userName: await this.getUserFirstName(userId), transcription: transcribedText };

        orchResult = await this.runOrchestration(userId, transcribedText, history, effectiveApiContext);

        if (orchResult && orchResult.error && !orchResult.clarificationQuestion) throw new Error(orchResult.error);

        if (orchResult && orchResult.clarificationQuestion) {
            const duration = Date.now() - startTime;
            const debugInfoForClarification: OrchestratorResponse['debugInfo'] = { ...(orchResult.debugInfo || {}), latencyMs: duration, audioFetchMs: audioFetchDuration, sttMs: sttDuration, sttModelUsed: appConfig.openai.sttModel, llmUsage: orchResult.llmUsage, flow_type: 'clarification' };
            if (logEntryId) this.logInteraction({ user_id: userId, latency_ms: duration, flow_type: 'clarification', error_message: null, metadata: { intent: orchResult.intentType, llmUsage: orchResult.llmUsage }, final_response_source: "Workflow Clarification" }, true, logEntryId).catch(e => logger.error("Log update fail:", e));
            return { sessionId: currentSessionId, clarificationQuestion: orchResult.clarificationQuestion, transcription: transcribedText, lang, workflowFeedback: orchResult.workflowFeedback, debugInfo: debugInfoForClarification, response: orchResult.response, intentType: orchResult.intentType, ttsInstructions: orchResult.ttsInstructions, error: null, audioUrl: null, structuredData: orchResult.structuredData, llmUsage: orchResult.llmUsage };
        }

        let ttsUrl: string | null = null;
        if (orchResult.response) {
            let selectedVoice = appConfig.openai.ttsDefaultVoice;
            // Use memoryFramework to fetch persona, ensuring userId is passed
            const persona = userState?.active_persona_id ? await this.memoryFramework.getPersonaById(userState.active_persona_id, userId) : null;
            if (persona?.voice_id && isValidOpenAITtsVoice(persona.voice_id)) selectedVoice = persona.voice_id;
            else if (userState?.chainedvoice && isValidOpenAITtsVoice(userState.chainedvoice)) selectedVoice = userState.chainedvoice;
            
            const ttsStart = Date.now();
            const ttsResult = await this.ttsService.generateAndStoreSpeech(orchResult.response, userId, selectedVoice as OpenAITtsVoice, orchResult.ttsInstructions);
            ttsDuration = Date.now() - ttsStart;
            if (ttsResult.url) ttsUrl = ttsResult.url;
            else logger.error(`[${turnIdentifier}] TTS failed: ${ttsResult.error}.`);
            orchResult.audioUrl = ttsUrl;
        }

        supabaseAdmin.updateState(userId, { last_interaction_at: new Date().toISOString(), preferred_locale: effectiveApiContext.locale }).catch((err: any) => logger.error(`Err state update:`, err));
        supabaseAdmin.incrementStreak(userId, "daily_voice").catch((err:any) => logger.error(`Err streak:`, err));

        const duration = Date.now() - startTime;
        logger.info(`[${turnIdentifier}] AUDIO complete (${duration}ms).`);
        const finalFlowTypeResolved: DebugFlowType = orchResult.debugInfo?.flow_type || (orchResult.workflowFeedback ? 'workflow' : (orchResult.structuredData?.source_api === 'internal_memory' ? 'single_tool' : 'direct_llm'));
        if (logEntryId) this.logInteraction({ user_id: userId, latency_ms: duration, flow_type: finalFlowTypeResolved, error_message: orchResult.error, metadata: { intent: orchResult.intentType, ttsUrl, llmUsage: orchResult.llmUsage }, final_response_source: orchResult.debugInfo?.cacheSourceApi || "LLM/Workflow" }, true, logEntryId).catch(e => logger.error("Log update fail:", e));

        const finalDebugInfo: OrchestratorResponse['debugInfo'] = { ...(orchResult.debugInfo || {}), audioFetchMs: audioFetchDuration, sttMs: sttDuration, ttsMs: ttsDuration, sttModelUsed: appConfig.openai.sttModel, ttsModelUsed: ttsUrl ? appConfig.openai.ttsModel : null, latencyMs: duration, flow_type: finalFlowTypeResolved };

        return { sessionId: currentSessionId, response: orchResult.response, intentType: orchResult.intentType, ttsInstructions: orchResult.ttsInstructions, clarificationQuestion: orchResult.clarificationQuestion, error: orchResult.error, lang, transcription: transcribedText, audioUrl: orchResult.audioUrl, structuredData: orchResult.structuredData, workflowFeedback: orchResult.workflowFeedback, debugInfo: finalDebugInfo, llmUsage: orchResult.llmUsage };

    } catch (error: any) {
        // ... (error handling for audio message remains the same) ...
        const duration = Date.now() - startTime;
        logger.error(`[Orch Audio] Error (${duration}ms):`, error.message, error.stack);
        const userNameForError = apiContext?.userName || DEFAULT_USER_NAME;
        const errorMsgForLog = `Audio processing failed for ${userNameForError}: ${error.message}`.substring(0,350);
        if (userId) {
            this.memoryFramework.add_memory([], userId, currentSessionId, errorMsgForLog)
                .catch(memErr => logger.error(`[${turnIdentifier}] Failed logging orch error to memory:`, memErr));
            if (logEntryId) this.logInteraction({ user_id: userId, latency_ms: duration, flow_type: 'error', error_message: error.message.substring(0,500) }, true, logEntryId).catch(e => logger.error("Log update fail:", e));
            else this.logInteraction({
                user_id: userId, session_id: currentSessionId, run_id: currentSessionId, user_query: transcribedText || "[Audio Input]",
                flow_type: 'error', latency_ms: duration, error_message: error.message.substring(0,500)
            }).catch(e => logger.error("Initial error log insert fail:", e));
        }
        const responseIntentTypeOnError = "apologetic";
        const debugInfoOnError: OrchestratorResponse['debugInfo'] = { ...(orchResult ? orchResult.debugInfo : {}), latencyMs: duration, audioFetchMs: audioFetchDuration, sttMs: sttDuration, ttsMs: ttsDuration, sttModelUsed: appConfig.openai.sttModel, flow_type: 'error' };
        return { sessionId: currentSessionId, error: error.message || `Failed processing audio for ${userNameForError}.`, transcription: transcribedText, lang: detectedLang || apiContext?.lang || "en", workflowFeedback: orchResult ? orchResult.workflowFeedback : null, debugInfo: debugInfoOnError, intentType: responseIntentTypeOnError, ttsInstructions: getDynamicInstructions(responseIntentTypeOnError), response: null, audioUrl: null, structuredData: null, clarificationQuestion: null, llmUsage: orchResult ? orchResult.llmUsage : null };
    }
  }

  public getWorkflowEngine(): WorkflowEngine {
    return this.workflowEngine;
  }
}

// Augment CompanionCoreMemory interface for new methods if they were added outside this file
declare module "../../memory-framework/core/CompanionCoreMemory" {
  interface CompanionCoreMemory {
    add_memory_extracted(conversationTurn: MemoryFrameworkMessage[], userId: string, runId: string | null, toolSummary: string | null, extractedInfo: ExtractedInfo | null): Promise<boolean>;
    // getPersonaById was already declared, ensure it matches:
    getPersonaById(personaId: string, userId: string): Promise<PredefinedPersona | UserPersona | null>; // Added userId
    getDueReminders(dueBefore: string, userId?: string | null, limit?: number): Promise<StoredMemoryUnit[] | null>;
    updateReminderStatus(memoryId: string, status: ReminderDetails["status"], errorMessage?: string | null): Promise<boolean>;
  }
}

// Helper function to be globally available for tool schema sanitization if needed by Orchestrator constructor
// This is a simplified version; a more robust one would handle all JSON schema complexities.
(global as any).sanitizeJsonSchemaForTools = (schema: Record<string, any>): Record<string, any> => {
    if (!schema || typeof schema !== 'object' || schema.type !== 'object') {
        return { type: "object", properties: {}, required: [], additionalProperties: false };
    }
    const newSchema: any = { type: "object", properties: {}, required: [], additionalProperties: false };
    if (schema.properties && typeof schema.properties === 'object') {
        for (const propKey in schema.properties) {
            const prop = schema.properties[propKey];
            // Corrige le type readonly[] -> mutable []
            if (Array.isArray(prop.type)) {
                // Si un seul type, simplifie en string
                if (prop.type.length === 1) {
                    prop.type = prop.type[0];
                } else {
                    prop.type = Array.from(prop.type);
                }
            }
            newSchema.properties[propKey] = prop;
        }
        newSchema.required = Array.isArray(schema.required)
          ? schema.required
          : Object.keys(newSchema.properties);
    }
    newSchema.additionalProperties = false;
    return newSchema;
};
