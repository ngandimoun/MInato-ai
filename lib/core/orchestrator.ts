// FILE: lib/core/orchestrator.ts
import { randomUUID } from "crypto";
import OpenAI from "openai";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
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
ChatMessageContentPartText,
ResponseApiInputContent, // Keep if formatMessagesForResponsesApi uses it
MessageAttachment,
} from "@/lib/types/index";
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "../tools/base-tool";
import { tools as appToolsRegistry } from "../tools/index";
import { MemoryTool } from "../tools/MemoryTool";
import { TTSService } from "../providers/tts_service";
import { STTService } from "../providers/stt_service";
import { VideoAnalysisService } from "../services/VideoAnalysisService"; // NEW
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
MEDIA_UPLOAD_BUCKET,
} from "../constants";
import { appConfig, injectPromptVariables } from "../config";
import {
generateAgentResponse,
generateStructuredJson,
generateVisionCompletion, // May not be directly called if VideoAnalysisService handles it
} from "../providers/llm_clients";
import { RESPONSE_SYNTHESIS_PROMPT_TEMPLATE, TOOL_ROUTER_PROMPT_TEMPLATE } from "../prompts";
import { logger } from "../../memory-framework/config";
import { safeJsonParse } from "../../memory-framework/core/utils";
import { CompletionUsage } from "openai/resources";

type SdkResponsesApiTool = OpenAI.Chat.Completions.ChatCompletionTool;
type SdkResponsesApiFunctionCall = ChatCompletionMessageToolCall;

type ToolRouterPlanStep = {
  tool_name: string;
  arguments: Record<string, any>;
  reason?: string;
};
type ToolRouterPlan = ToolRouterPlanStep[];


const TTS_INSTRUCTION_MAP: Record<string, string> = { /* ... (as before) ... */ 
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
    if (intentType && TTS_INSTRUCTION_MAP[intentType]) { return TTS_INSTRUCTION_MAP[intentType]; }
    logger.warn(`[Orch getDynamicInstructions] Unknown intent type "${intentType}", using default.`);
    return DEFAULT_INSTRUCTIONS;
}

function summarizeChatHistory(history: ChatMessage[], maxLength: number = 1000): string {
    if (!history || history.length === 0) return "No recent conversation history.";
    return history.slice(-MAX_CHAT_HISTORY * 2) 
        .map((msg) => {
            let contentPreview = "";
            if (typeof msg.content === 'string') {
                contentPreview = msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : "");
            } else if (Array.isArray(msg.content)) {
                const textPartObject = msg.content.find((p): p is ChatMessageContentPartText => p.type === "text");
                const textPart = textPartObject?.text;
                const imagePart = msg.content.find((p) => (p as any).type === "input_image" || (p as any).type === "image_url");
                contentPreview = textPart ? textPart.substring(0, 80) + (textPart.length > 80 ? "..." : "") : "";
                if (imagePart) contentPreview += " [Image Present]";
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

function isValidOpenAITtsVoice(voice: string | null | undefined): voice is OpenAITtsVoice {
    if (!voice) return false;
    return (appConfig.openai.ttsVoices as ReadonlyArray<string>).includes(voice);
}

function sanitizeToolParameterSchemaForOpenAI(originalSchema: BaseTool['argsSchema']): OpenAI.FunctionDefinition["parameters"] {
  if (!originalSchema || originalSchema.type !== 'object' || !originalSchema.properties) {
    return { type: "object", properties: {} };
  }
  return {
    type: "object",
    properties: originalSchema.properties as any, 
    required: originalSchema.required,
    additionalProperties: originalSchema.additionalProperties,
  };
}

const PLANNING_MODEL_NAME = appConfig.openai.planningModel;
const CHAT_VISION_MODEL_NAME = appConfig.openai.chatModel; // GPT-4o handles both text and vision

function summarizeUserStateForWorkflow(userState: UserState | null, maxLength: number = 200): string {
  if (!userState) return "No user state.";
  const parts: string[] = [];
  if (userState.user_first_name) parts.push(`Name: ${userState.user_first_name}`);
  if (userState.preferred_locale) parts.push(`Locale: ${userState.preferred_locale}`);
  if (userState.latitude && userState.longitude) parts.push(`Loc: ~${userState.latitude.toFixed(1)},${userState.longitude.toFixed(1)}`);
  if (userState.timezone) parts.push(`TZ: ${userState.timezone}`);
  if (userState.active_persona_id) parts.push(`Persona: ${userState.active_persona_id}`);
  const personaTraits = (userState as any)?.active_persona_traits?.join(', ') || 'helpful, friendly';
  parts.push(`Traits: ${personaTraits}`);
  return parts.join(" | ").substring(0, maxLength) || "Basic user state.";
}

// Utilitaire pour convertir ChatMessageContentPart[] en MessagePart[]
function chatMessageContentPartsToMessageParts(parts: ChatMessageContentPart[]): import("../../memory-framework/core/types").MessagePart[] {
  return parts.map((p) => {
    if (p.type === "text") {
      return { type: "text", text: p.text };
    } else if (p.type === "input_image") {
      return { type: "image_url", image_url: { url: p.image_url, detail: p.detail } };
    } else {
      // fallback: ignore unknown types
      return { type: "text", text: "[Unsupported content]" };
    }
  });
}

export class Orchestrator {
  private ttsService = new TTSService();
  private sttService = new STTService();
  private videoAnalysisService = new VideoAnalysisService(); // NEW
  private toolRegistry: { [key: string]: BaseTool };
  private memoryFramework: CompanionCoreMemory;
  private availableToolsForRouter: SdkResponsesApiTool[] = [];

  constructor() {
    logger.info("[Orch] Initializing Orchestrator (GPT-4.1 Tool Router, GPT-4o Main, Max 3 Tools/Turn)...");
    try {
      this.memoryFramework = new CompanionCoreMemory();
      logger.info("[Orch] Memory Framework initialized.");
    } catch (memError: any) {
      logger.error("[Orch] CRITICAL: Failed init Memory Framework:", memError.message, memError.stack);
      throw new Error(`Memory init failed: ${memError.message}`);
    }
    const memoryToolInstance = new MemoryTool(this.memoryFramework);
    this.toolRegistry = {
      ...appToolsRegistry,
      [memoryToolInstance.name]: memoryToolInstance,
    };

    this.availableToolsForRouter = Object.values(this.toolRegistry)
      .filter(tool => (tool as BaseTool).enabled !== false)
      .map(tool => {
        const baseTool = tool as BaseTool;
        const sanitizedParams = sanitizeToolParameterSchemaForOpenAI(baseTool.argsSchema);
        return {
          type: "function" as const,
          function: {
            name: baseTool.name,
            description: baseTool.description.substring(0, 1024),
            parameters: sanitizedParams,
          }
        } as SdkResponsesApiTool;
      });
    const toolNamesForRouter = this.availableToolsForRouter.map(t => (t.type === 'function' ? t.function.name : t.type)).filter(name => name);
    logger.info(`[Orch] Registered tools for GPT-4.1 Router (${toolNamesForRouter.length}): ${toolNamesForRouter.join(', ')}`);
  }

  private async logInteraction(logData: Partial<{ /* ... */ }>, isUpdate: boolean = false, logIdToUpdate?: number | null): Promise<number | null> { /* ... (as before, simplified) ... */ return null;}
  private async getUserFirstName(userId: string): Promise<string> { /* ... (as before) ... */ if (!userId) { logger.warn("[Orch getUserFirstName] No userId."); return DEFAULT_USER_NAME; } try { const state = await supabaseAdmin.getUserState(userId); if (state?.user_first_name?.trim()) return state.user_first_name.trim(); const profile = await supabaseAdmin.getUserProfile(userId); return profile?.first_name?.trim() || profile?.full_name?.trim()?.split(" ")[0] || DEFAULT_USER_NAME; } catch (error: any) { logger.warn(`[Orch getUserFirstName] Failed fetch for user ${userId.substring(0,8)}: ${error.message}`); return DEFAULT_USER_NAME; } }

  private async executeToolCalls(
    userId: string,
    toolCallsFromRouter: ToolRouterPlan, 
    apiContext: Record<string, any>,
    userState: UserState | null
  ): Promise<{ messages: ChatMessage[]; lastStructuredData: AnyToolStructuredData | null; llmUsage: null; toolResultsSummary: string }> {
    const logPrefix = `ToolExecutor User:${userId.substring(0, 8)} Sess:${apiContext?.sessionId?.substring(0, 6)}`;
    const toolResultsMessages: ChatMessage[] = [];
    const structuredDataMap: Map<string, AnyToolStructuredData | null> = new Map();
    let toolResultsSummaryParts: string[] = [];

    const executionPromises = toolCallsFromRouter.map(async (routedToolCall) => {
      const toolName = routedToolCall.tool_name;
      const tool = this.toolRegistry[toolName];
      const callId = `toolcall_${randomUUID()}`; 

      if (!tool) {
        logger.error(`${logPrefix} Tool '${toolName}' (from Router) not found.`);
        toolResultsSummaryParts.push(`Error: Tool '${toolName}' is not available.`);
        return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: Tool '${toolName}' is not available.` };
      }
      
      logger.info(`${logPrefix} Executing tool '${toolName}' (ID: ${callId.substring(0,6)}) from Router with Args: ${JSON.stringify(routedToolCall.arguments).substring(0,100)}`);
      
      const abortController = new AbortController();
      const timeoutDuration = (tool as any).timeoutMs || appConfig.toolTimeoutMs || DEFAULT_TOOL_TIMEOUT_MS;
      const timeoutId = setTimeout(() => { logger.warn(`${logPrefix} Timeout (${timeoutDuration}ms) for '${toolName}' (ID: ${callId.substring(0,6)})`); abortController.abort(); }, timeoutDuration);

      try {
        const toolInput: ToolInput = { 
            ...(routedToolCall.arguments || {}), 
            userId, 
            lang: apiContext?.lang || userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0], 
            sessionId: apiContext?.sessionId, 
            context: { ...(apiContext || {}), userState, sessionId: apiContext?.sessionId, runId: apiContext?.runId, userName: await this.getUserFirstName(userId), abortSignal: abortController.signal },
        };
        const output: ToolOutput = await tool.execute(toolInput, abortController.signal);
        clearTimeout(timeoutId);
        logger.info(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0,6)}) finished. Success: ${!output.error}`);
        
        if (!output.error && output.structuredData) {
            structuredDataMap.set(callId, output.structuredData);
        } else {
            structuredDataMap.set(callId, null);
        }
        const resultString = output.error ? `Error from ${toolName}: ${String(output.error)}` : String(output.result || `${toolName} completed.`).substring(0, 4000);
        toolResultsSummaryParts.push(`Result from ${toolName}: ${resultString.substring(0,150)}...`);
        return { role: "tool" as const, tool_call_id: callId, name: toolName, content: resultString };
      } catch (error: any) {
        clearTimeout(timeoutId);
        const isAbort = error.name === 'AbortError' || abortController.signal.aborted;
        const errorMsg = isAbort ? `Tool '${toolName}' timed out.` : `Tool '${toolName}' error: ${String(error?.message || error)}`;
        logger.error(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0,6)}) ${isAbort ? "TIMEOUT" : "EXCEPTION"}: ${String(error?.message || error)}`);
        structuredDataMap.set(callId, null);
        toolResultsSummaryParts.push(`Error with ${toolName}: ${errorMsg.substring(0,100)}...`);
        return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: ${errorMsg}` };
      }
    });

    const settledResults = await Promise.allSettled(executionPromises);
    let lastSuccessfulStructuredData: AnyToolStructuredData | null = null;

    for (let i = 0; i < settledResults.length; i++) {
      const result = settledResults[i];
      const originalRoutedCall = toolCallsFromRouter[i]; 
      if (result.status === "fulfilled" && result.value) {
        toolResultsMessages.push(result.value as ChatMessage);
        const callId = (result.value as ChatMessage).tool_call_id!; 
        if (!result.value.content?.startsWith("Error:") && structuredDataMap.has(callId)) {
          const data = structuredDataMap.get(callId);
          if (data) lastSuccessfulStructuredData = data;
        }
      } else if (result.status === "rejected") {
        logger.error(`${logPrefix} Unexpected parallel exec error for tool call ${originalRoutedCall.tool_name}:`, result.reason);
        toolResultsMessages.push({ role: "tool", tool_call_id: `toolcall_${randomUUID()}`, name: originalRoutedCall.tool_name, content: `Error: Internal error executing ${originalRoutedCall.tool_name}.` } as ChatMessage);
        toolResultsSummaryParts.push(`Error: Internal error executing ${originalRoutedCall.tool_name}.`);
      }
    }
    return { messages: toolResultsMessages, lastStructuredData: lastSuccessfulStructuredData, llmUsage: null, toolResultsSummary: toolResultsSummaryParts.join("\n") || "Tools executed." };
  }


  public async runOrchestration(
    userId: string,
    userInput: string | ChatMessageContentPart[],
    history: ChatMessage[] = [],
    apiContext?: Record<string, any>,
    initialAttachments?: MessageAttachment[]
  ): Promise<OrchestratorResponse> {
    const overallStartTime = Date.now();
    const runId = apiContext?.sessionId || apiContext?.runId || `${SESSION_ID_PREFIX}${randomUUID()}`;
    const turnIdentifier = `OrchRun User:${userId.substring(0,8)} Run:${runId.substring(0,6)}`;
    logger.info(`--- ${turnIdentifier} Starting Orchestration Run (GPT-4.1 Router, GPT-4o Main) ---`);

    let finalStructuredResult: AnyToolStructuredData | null = null;
    let finalResponseText: string | null = null;
    let responseIntentType: string | null = "neutral";
    let ttsInstructionsForFinalResponse: string | null = null;
    let clarificationQuestionForUser: string | null = null;
    let llmUsage_total: CompletionUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    let finalFlowType: DebugFlowType = "error";
    let finalResponseSource: string | null = "Error";
    let currentTurnToolResultsSummary: string | null = null;
    let toolRouterFollowUpSuggestion: string | null = null;
    let finalToolCallsLogged: any[] = [];
    let videoSummaryForContext: string | null = null;

    const userName = await this.getUserFirstName(userId);
    const userState: UserState | null = await supabaseAdmin.getUserState(userId);
    let lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en";
    const effectiveApiContext = { ...(apiContext || {}), userName, lang, locale: userState?.preferred_locale || appConfig.defaultLocale, runId };
    
    let personaNameForPrompt = "Minato";
    let personaSpecificInstructions = "You are Minato, a helpful, friendly, and knowledgeable AI assistant.";
    let personaId = userState?.active_persona_id || DEFAULT_PERSONA_ID;
    try {
        const persona = await this.memoryFramework.getPersonaById(personaId, userId);
        if (persona?.system_prompt) {
            personaSpecificInstructions = persona.system_prompt;
            personaNameForPrompt = persona.name || personaId;
        }
    } catch (e: any) { logger.error(`[${turnIdentifier}] Error fetching persona:`, e.message); }

    try {
      let textQueryForRouter: string;
      let mainUserInputContent: ChatMessageContentPart[] = [];

      if (typeof userInput === 'string') {
        textQueryForRouter = userInput;
        mainUserInputContent.push({ type: "text", text: userInput });
      } else { // userInput is ChatMessageContentPart[]
        mainUserInputContent = [...userInput];
        const textPart = userInput.find(p => p.type === 'text') as ChatMessageContentPartText | undefined;
        textQueryForRouter = textPart?.text || ""; // Start with text
        if (userInput.some(p => (p as any).type === 'input_image' || (p as any).type === 'image_url')) {
            textQueryForRouter += (textQueryForRouter ? " " : "") + "[User sent images/frames]";
        }
      }

      // Handle video attachment analysis if present
      const videoAttachment = initialAttachments?.find(att => att.type === 'video' && att.file);
      if (videoAttachment && videoAttachment.file) {
        logger.info(`[${turnIdentifier}] Detected video attachment: ${videoAttachment.name}. Initiating analysis.`);
        const videoAnalysisResult = await this.videoAnalysisService.analyzeVideo(
          Buffer.from(await videoAttachment.file.arrayBuffer()), // Convert Blob to Buffer
          videoAttachment.name || "uploaded_video",
          videoAttachment.mimeType || "video/mp4",
          textQueryForRouter || "Describe this video.", // Use existing query as prompt for video
          userId
        );
        if (videoAnalysisResult.summary) {
          videoSummaryForContext = videoAnalysisResult.summary;
          textQueryForRouter += (textQueryForRouter ? "\n" : "") + `[Video Content Summary: ${videoSummaryForContext.substring(0,200)}...]`;
          logger.info(`[${turnIdentifier}] Video analysis successful. Summary added to router query.`);
          // Optionally, add the summary as a "tool_result" like message for GPT-4o if needed,
          // or just ensure it's part of the context for RESPONSE_SYNTHESIS_PROMPT_TEMPLATE.
        } else if (videoAnalysisResult.error) {
          logger.warn(`[${turnIdentifier}] Video analysis failed: ${videoAnalysisResult.error}. Proceeding without video summary.`);
          textQueryForRouter += (textQueryForRouter ? "\n" : "") + "[Video analysis attempted but failed to produce summary.]";
        }
      }

      // Tool Router (GPT-4.1)
      let routedTools: ToolRouterPlan = [];
      const toolRouterPrompt = injectPromptVariables(TOOL_ROUTER_PROMPT_TEMPLATE, {
          userName, userQuery: textQueryForRouter,
          conversationHistorySummary: summarizeChatHistory(history),
          userStateSummary: summarizeUserStateForWorkflow(userState),
          available_tools_for_planning: this.availableToolsForRouter.map(t => `- ${t.function.name}: ${t.function.description?.substring(0,100)}...`).join("\n"),
          language: lang, userPersona: personaNameForPrompt,
      });
      
      logger.info(`[${turnIdentifier}] Invoking Tool Router (GPT-4.1)... Query for router: "${textQueryForRouter.substring(0,70)}"`);
      const routerResult = await generateStructuredJson<ToolRouterPlan>(
          toolRouterPrompt,
          textQueryForRouter,
          { type: "array", items: { type: "object", properties: { tool_name: {type: "string"}, arguments: {type: "object", additionalProperties: false /* Corrected */}, reason: {type: "string"}}, required: ["tool_name", "arguments"] } },
          "minato_tool_router_v1",
          history.filter(m => typeof m.content === 'string'),
          PLANNING_MODEL_NAME,
          userId
      );

      if ("error" in routerResult) {
          logger.error(`[${turnIdentifier}] Tool Router (GPT-4.1) failed: ${routerResult.error}. Proceeding without tools.`);
          finalFlowType = "direct_llm_after_router_fail";
      } else {
          routedTools = routerResult;
          finalToolCallsLogged = routedTools.map(rt => ({toolName: rt.tool_name, args: rt.arguments, reason: rt.reason}));
          logger.info(`[${turnIdentifier}] Tool Router selected ${routedTools.length} tools: ${routedTools.map(t=>t.tool_name).join(', ')}`);
          finalFlowType = routedTools.length > 0 ? "workflow_routed" : "direct_llm_no_tools_routed";
      }

      // Execute Tools
      let toolExecutionMessages: ChatMessage[] = [];
      if (routedTools.length > 0) {
          const executionResult = await this.executeToolCalls(userId, routedTools, effectiveApiContext, userState);
          toolExecutionMessages = executionResult.messages;
          finalStructuredResult = executionResult.lastStructuredData;
          currentTurnToolResultsSummary = executionResult.toolResultsSummary;
      }
      
      // Prepare context for GPT-4o (Main Response Synthesis)
      const messagesForGpt4o: ChatMessage[] = [
        ...history,
        { role: "user", content: mainUserInputContent, name: userName, timestamp: Date.now(), attachments: initialAttachments?.filter(att => att.type !== 'video') }, // Send original multimodal input, filter out raw video if summary was used
        ...toolExecutionMessages,
      ];
      if (videoSummaryForContext && !initialAttachments?.find(att => att.type === 'video')) {
          // If video summary was generated but original video wasn't part of mainUserInputContent (e.g. handled via attachment only)
          // Add a system-like message indicating the video summary context
          messagesForGpt4o.push({ role: "system", content: `Context from attached video: ${videoSummaryForContext}`, timestamp: Date.now() });
      }


      let retrievedMemoryContext = "INTERNAL CONTEXT - RELEVANT MEMORIES: None found or not applicable for this turn.";
      const entitiesForMemorySearch: string[] = [textQueryForRouter.substring(0,70)];
      if (finalStructuredResult) { /* ... */ }
      if (entitiesForMemorySearch.length > 0) {
          logger.info(`[${turnIdentifier}] Performing targeted memory search for GPT-4o...`);
          const memoryResults = await this.memoryFramework.search_memory(entitiesForMemorySearch.join(" "), userId, { limit: 3, offset: 0 }, runId, { enableHybridSearch: true, enableGraphSearch: false, enableConflictResolution: true });
          if (memoryResults.results.length > 0) { retrievedMemoryContext = `INTERNAL CONTEXT - RELEVANT MEMORIES (Use these to add helpful related context for ${userName}):\n${memoryResults.results.map(r => `- ${r.content.substring(0,150)}...`).join("\n")}`; }
      }

      // Call GPT-4o for Response Synthesis
      const synthesisSystemPrompt = injectPromptVariables(RESPONSE_SYNTHESIS_PROMPT_TEMPLATE, {
          userName, personaName: personaNameForPrompt, personaInstructions: personaSpecificInstructions, language: lang,
          retrieved_memory_context: retrievedMemoryContext,
          tool_results_summary: currentTurnToolResultsSummary || "No tools were executed by Minato this turn, or their results are directly integrated.",
          original_query: textQueryForRouter, // Use router query which might include video summary context
          tool_router_follow_up_suggestion: toolRouterFollowUpSuggestion || `Is there anything else Minato can help you with today, ${userName}?`
      });
      
      logger.info(`[${turnIdentifier}] Synthesizing final response (GPT-4o)...`);
      const synthesisResult = await generateStructuredJson<{ responseText: string; intentType: string }>(
          synthesisSystemPrompt,
          textQueryForRouter, // Main query text for context
          { 
            type: "object",
            properties: { responseText: {type: "string"}, intentType: {type: "string", enum: Object.keys(TTS_INSTRUCTION_MAP)} },
            required: ["responseText", "intentType"],
            additionalProperties: false, // Ensure synthesis schema is also strict
          },
          "minato_gpt4o_synthesis_v1",
          messagesForGpt4o, // Pass the potentially multimodal history
          CHAT_VISION_MODEL_NAME, // GPT-4o
          userId
      );
      
      const synthesisLlmUsage = (synthesisResult as any).usage as CompletionUsage | undefined;
      if (synthesisLlmUsage) { llmUsage_total.prompt_tokens += synthesisLlmUsage.prompt_tokens || 0; llmUsage_total.completion_tokens += synthesisLlmUsage.completion_tokens || 0; llmUsage_total.total_tokens += synthesisLlmUsage.total_tokens || 0; }

      if ("error" in synthesisResult) {
        finalResponseText = `I've processed your request, ${userName}, but I'm having a bit of trouble wording my reply. ${synthesisResult.error?.substring(0,100) || "Could you try rephrasing?"}`;
        responseIntentType = "apologetic";
        finalFlowType = "synthesis_error";
        logger.error(`[${turnIdentifier}] GPT-4o Synthesis LLM failed: ${synthesisResult.error}`);
      } else {
        finalResponseText = synthesisResult.responseText;
        responseIntentType = synthesisResult.intentType;
        if (typeof finalFlowType === 'string' && finalFlowType === 'direct_llm_after_router_fail') { /* Keep this */ }
        else finalFlowType = routedTools.length > 0 ? "workflow_synthesis" : "direct_llm_synthesis";
      }
      ttsInstructionsForFinalResponse = getDynamicInstructions(responseIntentType);
      finalResponseSource = "GPT-4o Synthesis";

      // Add to Memory
      // Ensure mainUserInputContent (which is ChatMessageContentPart[]) is used for memory if input was multimodal
      const userMemoryMsgForAdd: MemoryFrameworkMessage | null = mainUserInputContent.length > 0
        ? { role: 'user', content: chatMessageContentPartsToMessageParts(mainUserInputContent), name: userName }
        : null;
      const finalAssistantMemoryMsg: MemoryFrameworkMessage | null = finalResponseText ? { role: 'assistant', content: finalResponseText, name: "Minato" } : null;
      const finalTurnForMemory: MemoryFrameworkMessage[] = [userMemoryMsgForAdd, finalAssistantMemoryMsg].filter((m): m is MemoryFrameworkMessage => m !== null);
      if (finalTurnForMemory.length > 0) { this.memoryFramework.add_memory(finalTurnForMemory, userId, runId, null).then(success => logger.info(`[${turnIdentifier}] Async memory add OK: ${success}.`)).catch(e => logger.error(`[${turnIdentifier}] Async memory add FAIL:`, e.message)); }
      
      const orchestrationMs = Date.now() - overallStartTime;
      finalResponseText = finalResponseText ? injectPromptVariables(finalResponseText, { userName }) : null;
      
      const debugInfoInternal: OrchestratorResponse['debugInfo'] = { 
          flow_type: finalFlowType, 
          llmModelUsed: CHAT_VISION_MODEL_NAME, 
          workflowPlannerModelUsed: PLANNING_MODEL_NAME, 
          llmUsage: llmUsage_total, 
          latencyMs: orchestrationMs, 
          toolCalls: finalToolCallsLogged,
          videoSummaryUsed: videoSummaryForContext ? videoSummaryForContext.substring(0, 100) + "..." : null,
      };
      logger.info(`--- ${turnIdentifier} Orchestration complete (${orchestrationMs}ms). Flow: ${finalFlowType}. ---`);
      
      return { 
          sessionId: runId, 
          response: finalResponseText, 
          intentType: responseIntentType, 
          ttsInstructions: ttsInstructionsForFinalResponse, 
          clarificationQuestion: clarificationQuestionForUser, 
          error: (typeof finalFlowType === 'string' && finalFlowType.includes("error")) ? (finalResponseText || "Processing error") : null, 
          lang: lang, 
          structuredData: finalStructuredResult, 
          workflowFeedback: null, 
          debugInfo: debugInfoInternal, 
          audioUrl: null, 
          transcription: typeof userInput === 'string' && apiContext?.transcription ? apiContext.transcription : (textQueryForRouter !== userInput ? textQueryForRouter : null), // Include router query if different
          llmUsage: llmUsage_total,
          attachments: [], // Assistant doesn't re-attach user's video
      };

    } catch (error: any) {
      const duration = Date.now() - overallStartTime;
      const errorMessageString = String(error?.message || error || "Orchestration process failed unexpectedly.");
      logger.error(`--- ${turnIdentifier} Orchestration FAILED (${duration}ms):`, errorMessageString, error.stack);
      let errorMsg = errorMessageString; if (error.cause) errorMsg = `${errorMsg} (Cause: ${String(error.cause)})`;
      finalFlowType = 'error'; finalResponseSource = "Orchestration Exception";
      if (userId) { const errorMemText = `Minato error for ${userName}: ${errorMsg}`.substring(0,350); this.memoryFramework.add_memory([], userId, runId, errorMemText).catch(memErr => logger.error(`[${turnIdentifier}] Failed logging orch error to memory:`, memErr));}
      const userNameForError = userName || DEFAULT_USER_NAME; responseIntentType = "apologetic";
      return { sessionId: runId, response: `I apologize, ${userNameForError}. I encountered an internal error. Minato is looking into it.`, error: errorMsg, lang: lang, audioUrl: null, intentType: responseIntentType, ttsInstructions: getDynamicInstructions(responseIntentType), debugInfo: { flow_type: 'error', llmUsage: llmUsage_total, latencyMs: duration }, workflowFeedback: null, clarificationQuestion: undefined, structuredData: null, transcription: typeof userInput === 'string' && apiContext?.transcription ? apiContext.transcription : null, llmUsage: llmUsage_total, attachments: initialAttachments };
    }
  }

  async processTextMessage(
    userId: string,
    text: string | null,
    history: ChatMessage[] = [],
    sessionId?: string,
    apiContext?: Record<string, any>,
    attachments?: MessageAttachment[]
  ): Promise<OrchestratorResponse> {
    const userState = await supabaseAdmin.getUserState(userId);
    const lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en";
    const effectiveSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;
    const userName = await this.getUserFirstName(userId);
    const effectiveApiContext = { ...apiContext, sessionId: effectiveSessionId, locale: userState?.preferred_locale || appConfig.defaultLocale, lang, userName };
    
    const inputText = text ?? ""; 
    let orchestratorInput: string | ChatMessageContentPart[] = inputText;

    // If attachments are present (e.g., images), construct multimodal input
    // Video attachments are handled within runOrchestration if `initialAttachments` is populated correctly
    if (attachments && attachments.some(att => att.type === 'image')) {
        const contentParts: ChatMessageContentPart[] = [{type: "text", text: inputText}];
        for (const att of attachments) {
            if (att.type === "image" && att.url) { // Assuming URL is already public or data URI
                contentParts.push({type: "input_image", image_url: att.url});
            }
        }
        orchestratorInput = contentParts;
    }

    const result = await this.runOrchestration(userId, orchestratorInput, history, effectiveApiContext, attachments);
    return { ...result, sessionId: effectiveSessionId, lang: result.lang || lang };
  }

  async processAudioMessage(
    userId: string,
    audioSignedUrl: string,
    history: ChatMessage[] = [],
    sessionId?: string,
    apiContext?: Record<string, any>
  ): Promise<OrchestratorResponse> {
    const currentSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;
    const startTime = Date.now();
    const turnIdentifier = `Req[Audio] User:${userId.substring(0,8)} Sess:${currentSessionId.substring(0,6)}`;
    let transcribedText: string | null = null;
    let detectedLang: string | null = null;
    let audioFetchDuration: number | undefined, sttDuration: number | undefined, ttsDuration: number | undefined;
    let orchResult: OrchestratorResponse | null = null;
    
    try {
      const fetchStart = Date.now();
      const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 15000);
      const fetchResponse = await fetch(audioSignedUrl, { signal: controller.signal }); clearTimeout(timeoutId);
      if (!fetchResponse.ok) throw new Error(`Audio fetch failed: ${fetchResponse.status} ${fetchResponse.statusText}`);
      const audioBuffer = Buffer.from(await fetchResponse.arrayBuffer()); audioFetchDuration = Date.now() - fetchStart;
      if (audioBuffer.length === 0) throw new Error("Fetched audio is empty.");

      const sttStart = Date.now(); const contentTypeHeader = fetchResponse.headers.get("content-type") || undefined;
      const transcriptionResult = await this.sttService.transcribeAudio(audioBuffer, undefined, undefined, contentTypeHeader);
      sttDuration = Date.now() - sttStart;
      if (transcriptionResult.error || !transcriptionResult.text?.trim()) throw new Error(transcriptionResult.error || "Empty transcription.");
      transcribedText = transcriptionResult.text; detectedLang = transcriptionResult.language || null;
      logger.info(`--- ${turnIdentifier} STT OK. Lang: ${detectedLang || "unk"}. Text: "${transcribedText.substring(0,50)}..."`);

      const userState = await supabaseAdmin.getUserState(userId);
      const lang = detectedLang || apiContext?.lang || userState?.preferred_locale?.split("-")[0] || "en";
      const userName = await this.getUserFirstName(userId);
      const effectiveApiContext = { ...apiContext, sessionId: currentSessionId, runId: currentSessionId, locale: userState?.preferred_locale || appConfig.defaultLocale, lang, detectedLanguage: detectedLang, userName, transcription: transcribedText };
      
      orchResult = await this.runOrchestration(userId, transcribedText, history, effectiveApiContext);
      
      if (orchResult && orchResult.error && !orchResult.clarificationQuestion) {
        throw new Error(orchResult.error);
      }

      let ttsUrl: string | null = null;
      if (orchResult?.response) {
          let selectedVoice = appConfig.openai.ttsDefaultVoice;
          const persona = userState?.active_persona_id ? await this.memoryFramework.getPersonaById(userState.active_persona_id, userId) : null;
          if (persona?.voice_id && isValidOpenAITtsVoice(persona.voice_id)) {
              selectedVoice = persona.voice_id;
          } else if (userState?.chainedvoice && isValidOpenAITtsVoice(userState.chainedvoice)) {
              selectedVoice = userState.chainedvoice;
          }
          const ttsStart = Date.now(); 
          const ttsResult = await this.ttsService.generateAndStoreSpeech(orchResult.response, userId, selectedVoice as OpenAITtsVoice, orchResult.ttsInstructions); 
          ttsDuration = Date.now() - ttsStart;
          if (ttsResult.url) ttsUrl = ttsResult.url; else logger.error(`--- ${turnIdentifier} TTS failed: ${ttsResult.error}.`);
          if(orchResult) orchResult.audioUrl = ttsUrl; 
      }
      
      supabaseAdmin.updateState(userId, { last_interaction_at: new Date().toISOString(), preferred_locale: effectiveApiContext.locale }).catch((err: any) => logger.error(`Err state update:`, err));
      supabaseAdmin.incrementStreak(userId, "daily_voice").catch((err:any) => logger.error(`Err streak:`, err));
      
      const duration = Date.now() - startTime;
      logger.info(`--- ${turnIdentifier} AUDIO complete (${duration}ms).`);
      
      const finalDebugInfo: OrchestratorResponse['debugInfo'] = { 
          ...(orchResult?.debugInfo || {}), 
          audioFetchMs: audioFetchDuration, 
          sttMs: sttDuration, ttsMs: ttsDuration, 
          sttModelUsed: appConfig.openai.sttModel, 
          ttsModelUsed: ttsUrl ? appConfig.openai.ttsModel : null, 
          latencyMs: duration 
      };
      
      return { 
          sessionId: currentSessionId, 
          response: orchResult?.response || null, 
          intentType: orchResult?.intentType || null, 
          ttsInstructions: orchResult?.ttsInstructions || null, 
          clarificationQuestion: orchResult?.clarificationQuestion || null, 
          error: orchResult?.error || null, 
          lang, 
          transcription: transcribedText, 
          audioUrl: orchResult?.audioUrl || null, 
          structuredData: orchResult?.structuredData || null, 
          workflowFeedback: orchResult?.workflowFeedback || null, 
          debugInfo: finalDebugInfo, 
          llmUsage: orchResult?.llmUsage || null,
          attachments: orchResult?.attachments || []
      };

    } catch (error: any) { 
      const duration = Date.now() - startTime;
      const errorMessageString = String(error?.message || error || "Audio processing failed unexpectedly.");
      logger.error(`--- ${turnIdentifier} Error (${duration}ms): ${errorMessageString}`, error.stack);
      const userNameForError = apiContext?.userName || await this.getUserFirstName(userId) || DEFAULT_USER_NAME;
      
      const userFacingError = `Failed processing audio for ${userNameForError}.`;
      const responseIntentTypeOnError = "error";
      const debugInfoOnError: OrchestratorResponse['debugInfo'] = { latencyMs: duration, audioFetchMs: audioFetchDuration, sttMs: sttDuration, sttModelUsed: appConfig.openai.sttModel, flow_type: 'error' };

      let errorTtsUrl: string | null = null;
      try {
          const userStateOnError = await supabaseAdmin.getUserState(userId);
          const errorTtsResult = await this.ttsService.generateAndStoreSpeech(
              userFacingError, userId,
              (userStateOnError?.chainedvoice as OpenAITtsVoice) || appConfig.openai.ttsDefaultVoice,
              getDynamicInstructions(responseIntentTypeOnError)
          );
          if (errorTtsResult.url) errorTtsUrl = errorTtsResult.url;
      } catch (ttsErrorException: any) { logger.error(`--- ${turnIdentifier} Failed to generate TTS for error message:`, ttsErrorException.message); }

      return {
          sessionId: currentSessionId, error: userFacingError, transcription: transcribedText,
          lang: detectedLang || apiContext?.lang || "en",
          workflowFeedback: null, debugInfo: debugInfoOnError, intentType: responseIntentTypeOnError,
          ttsInstructions: getDynamicInstructions(responseIntentTypeOnError),
          response: null, audioUrl: errorTtsUrl, structuredData: null,
          clarificationQuestion: null, llmUsage: null, attachments: []
      };
    }
  }
}

declare module "../../memory-framework/core/CompanionCoreMemory" {
  interface CompanionCoreMemory {
    getPersonaById(personaId: string, userId: string): Promise<PredefinedPersona | UserPersona | null>;
    getDueReminders(dueBefore: string, userId?: string | null, limit?: number): Promise<StoredMemoryUnit[] | null>;
    updateReminderStatus(memoryId: string, status: ReminderDetails["status"], errorMessage?: string | null): Promise<boolean>;
  }
}