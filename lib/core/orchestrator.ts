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
ResponseApiInputContent,
MessageAttachment,
ChatMessageContentPartInputImage,
} from "@/lib/types/index";
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "../tools/base-tool";
import { tools as appToolsRegistry, resolveToolName } from "../tools/index";
import { MemoryTool } from "../tools/MemoryTool";
import { TTSService } from "../providers/tts_service";
import { STTService } from "../providers/stt_service";
import { VideoAnalysisService } from "../services/VideoAnalysisService";
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
generateVisionCompletion,
} from "../providers/llm_clients";
import { TOOL_ROUTER_PROMPT_TEMPLATE } from "../prompts";
import { logger } from "../../memory-framework/config";
import { safeJsonParse } from "../../memory-framework/core/utils";
import { CompletionUsage } from "openai/resources";
import Ajv from "ajv";
import type { ValidateFunction } from "ajv";
type SdkResponsesApiTool = OpenAI.Chat.Completions.ChatCompletionTool;
type SdkResponsesApiFunctionCall = ChatCompletionMessageToolCall;
type ToolRouterPlanStep = {
tool_name: string;
arguments: Record<string, any>;
reason: string;
};
type ToolRouterPlan = {
planned_tools: ToolRouterPlanStep[];
};
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
} else if ((msg as any).tool_calls) {
contentPreview = `Tool Call: ${(msg as any).tool_calls[0]?.function?.name || "unknown"}`;
} else if (msg.role === "tool") {
contentPreview = `Tool Result for ${msg.name || (msg as any).tool_call_id?.substring(0, 6) || "unknown"}`;
}
const roleDisplay = msg.role === "assistant" ? "Minato" : msg.role.charAt(0).toUpperCase() + msg.role.slice(1);
return `${roleDisplay}: ${contentPreview || "[Empty/Non-Text Content]"}`;
})
.join("\n")
.substring(0, maxLength);
}
function isValidOpenAITtsVoice(voice: string | null | undefined): voice is OpenAITtsVoice {
if (!voice) return false;
return (appConfig as any).openai.ttsVoices.includes(voice);
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
const PLANNING_MODEL_NAME_ORCH = (appConfig as any).openai.planningModel;
const CHAT_VISION_MODEL_NAME_ORCH = (appConfig as any).openai.chatModel;
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
function chatMessageContentPartsToMessageParts(parts: ChatMessageContentPart[]): import("../../memory-framework/core/types").MessagePart[] {
return parts.map((p) => {
if (p.type === "text") {
return { type: "text", text: p.text };
} else if (p.type === "input_image") {
return { type: "image_url", image_url: { url: p.image_url, detail: p.detail } };
} else {
const exhaustiveCheck: never = p;
logger.warn(`[Orch chatMessageContentPartsToMessageParts] Unsupported part type: ${(p as any).type}`);
return { type: "text", text: "[Unsupported content]" };
}
});
}
export class Orchestrator {
private ttsService = new TTSService();
private sttService = new STTService();
private videoAnalysisService = new VideoAnalysisService();
private toolRegistry: { [key: string]: BaseTool };
private memoryFramework: CompanionCoreMemory;
private availableToolsForRouter: SdkResponsesApiTool[] = [];
constructor() {
logger.info(`[Orch] Initializing Orchestrator (Planning: ${PLANNING_MODEL_NAME_ORCH}, Chat/Vision: ${CHAT_VISION_MODEL_NAME_ORCH}, Max ${(appConfig as any).openai.maxToolsPerTurn} Tools/Turn)...`);
try {
this.memoryFramework = new CompanionCoreMemory();
logger.info("[Orch] Memory Framework initialized.");
} catch (memError: any) {
logger.error(`[Orch] CRITICAL: Failed init Memory Framework: ${memError.message}`, memError.stack);
throw new Error(`Memory init failed: ${memError.message}`);
}
const memoryToolInstance = new MemoryTool(this.memoryFramework);
this.toolRegistry = {
...appToolsRegistry,
[memoryToolInstance.name]: memoryToolInstance,
};
this.availableToolsForRouter = Object.values(this.toolRegistry)
.filter(tool => (tool as BaseTool).enabled !== false)
.map(tool => ({
type: "function",
function: {
name: tool.name,
description: tool.description,
parameters: sanitizeToolParameterSchemaForOpenAI(tool.argsSchema)
}
}));
// Add video-specific tool descriptions
const videoToolDescriptions = [
"VideoAnalysisTool: Analyzes video content including objects, actions, and visual themes",
"MakeupAssistantTool: Provides makeup tips and product recommendations based on visual analysis"
];
logger.info(`[Orch] Video tools registered: ${videoToolDescriptions.join(', ')}`);
const toolNamesForRouter = this.availableToolsForRouter.map(t => (t.type === 'function' ? t.function.name : t.type)).filter(name => name);
logger.info(`[Orch] Registered tools for Router (${toolNamesForRouter.length}): ${toolNamesForRouter.join(', ')}`);
}
private async logInteraction(logData: Partial<{ /* ... */ }>, isUpdate: boolean = false, logIdToUpdate?: number | null): Promise<number | null> { return null; }
private async getUserFirstName(userId: string): Promise<string> {
if (!userId) {
logger.warn("[Orch getUserFirstName] No userId.");
return DEFAULT_USER_NAME;
}
try {
const state = await supabaseAdmin.getUserState(userId);
if (state?.user_first_name?.trim()) return state.user_first_name.trim();
const profile = await supabaseAdmin.getUserProfile(userId);
return (
profile?.first_name?.trim() ||
profile?.full_name?.trim()?.split(" ")[0] ||
DEFAULT_USER_NAME
);
} catch (error: any) {
logger.warn(`[Orch getUserFirstName] Failed fetch for user ${userId.substring(0, 8)}: ${error.message}`);
return DEFAULT_USER_NAME;
}
}
private validateToolStep(step: ToolRouterPlanStep): boolean {
const tool = this.toolRegistry[step.tool_name];
if (!tool) {
logger.error(`Tool ${step.tool_name} not registered`);
return false;
}
if (tool.argsSchema) {
  const ajv = new Ajv();
  const validate: ValidateFunction = ajv.compile(tool.argsSchema);
  if (!validate(step.arguments)) {
    logger.error(`Invalid arguments for ${step.tool_name}:`,
      JSON.stringify(validate.errors));
    return false;
  }
}


return true;


}
private async executeToolCalls(
userId: string,
toolCallsFromRouter: ToolRouterPlanStep[],
apiContext: Record<string, any>,
userState: UserState | null
): Promise<{ messages: ChatMessage[]; lastStructuredData: AnyToolStructuredData | null; llmUsage: null; toolResultsSummary: string }> {
const logPrefix = `ToolExecutor User:${userId.substring(0, 8)} Sess:${apiContext?.sessionId?.substring(0, 6)}`;
const toolResultsMessages: ChatMessage[] = [];
const structuredDataMap: Map<string, AnyToolStructuredData | null> = new Map();
let toolResultsSummaryParts: string[] = [];
const executionPromises = toolCallsFromRouter
.filter(routedToolCall => this.validateToolStep(routedToolCall))
.map(async (routedToolCall) => {
const toolName = routedToolCall.tool_name;
const tool = resolveToolName(toolName);
const callId = `toolcall_${randomUUID()}`;
if (!tool) {
      logger.error(`${logPrefix} Tool '${toolName}' (from Router) not found.`);
      toolResultsSummaryParts.push(`Error: Tool '${toolName}' is not available.`);
      return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: Tool '${toolName}' is not available.` };
    }


    let actualToolArgs = JSON.parse(JSON.stringify(routedToolCall.arguments || {})); 

const searchToolsRequiringQuery = ["YouTubeSearchTool", "NewsAggregatorTool", "HackerNewsTool", "WebSearchTool", "MemoryTool", "PexelsSearchTool", "RecipeSearchTool"];
if (
  searchToolsRequiringQuery.includes(toolName) &&
  tool.argsSchema.required?.includes("query") && 
  (!actualToolArgs.query || typeof actualToolArgs.query !== 'string' || actualToolArgs.query.trim() === "") && 
  (apiContext?.userInput && typeof apiContext.userInput === 'string' && apiContext.userInput.trim())
) {
  logger.warn(`${logPrefix} Tool '${toolName}' called by Router without 'query'. Using main user input as query: "${String(apiContext.userInput).substring(0,50)}..."`);
  actualToolArgs.query = String(apiContext.userInput);
}

if (toolName === "SportsInfoTool" && tool.argsSchema.required?.includes("teamName") && (!actualToolArgs.teamName || typeof actualToolArgs.teamName !== 'string' || actualToolArgs.teamName.trim() === "")) {
    if (apiContext?.userInput && typeof apiContext.userInput === 'string' && apiContext.userInput.trim()) {
         logger.warn(`${logPrefix} SportsInfoTool called by Router without 'teamName'. Tool may fail or use a default if implemented by the tool itself based on user query: "${String(apiContext.userInput).substring(0,50)}..."`);
    } else {
         logger.error(`${logPrefix} SportsInfoTool requires 'teamName', but Router didn't provide it. Skipping.`);
         toolResultsSummaryParts.push(`Error: Tool '${toolName}' skipped (missing teamName).`);
         return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: Tool '${toolName}' could not execute (missing required 'teamName' argument).` };
    }
}
if (toolName === "RedditTool" && tool.argsSchema.required?.includes("subreddit") && (!actualToolArgs.subreddit || typeof actualToolArgs.subreddit !== 'string' || actualToolArgs.subreddit.trim() === "")) {
    if (apiContext?.userInput && typeof apiContext.userInput === 'string' && apiContext.userInput.trim()) {
        logger.warn(`${logPrefix} RedditTool called by Router without 'subreddit'. Tool might use a default or fail based on query: "${String(apiContext.userInput).substring(0,50)}..."`);
    } else {
         logger.error(`${logPrefix} RedditTool requires 'subreddit', but Router didn't provide it. Skipping.`);
         toolResultsSummaryParts.push(`Error: Tool '${toolName}' skipped (missing subreddit).`);
         return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: Tool '${toolName}' could not execute (missing required 'subreddit' argument).` };
    }
}
 if (toolName === "EventFinderTool" && tool.argsSchema.required?.includes("keyword") && 
    (!actualToolArgs.keyword || typeof actualToolArgs.keyword !== 'string' || actualToolArgs.keyword.trim() === "") &&
    (!actualToolArgs.classificationName && !actualToolArgs.location) 
  ) {
    if (apiContext?.userInput && typeof apiContext.userInput === 'string' && apiContext.userInput.trim()) {
        logger.warn(`${logPrefix} EventFinderTool called by Router without 'keyword' and other primary filters. Using main user input as keyword: "${String(apiContext.userInput).substring(0,50)}..."`);
        actualToolArgs.keyword = String(apiContext.userInput);
    } else {
         logger.warn(`${logPrefix} EventFinderTool requires 'keyword' or other filters, but Router provided none and no fallback. Tool may return broad or no results.`);
    }
}

const stepForValidation: ToolRouterPlanStep = { ...routedToolCall, arguments: actualToolArgs };
if (!this.validateToolStep(stepForValidation)) {
    logger.error(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0, 6)}) failed argument validation AFTER fallback. Arguments received: ${JSON.stringify(routedToolCall.arguments)}. Arguments after fallback: ${JSON.stringify(actualToolArgs)}. Skipping.`);
    toolResultsSummaryParts.push(`Error: Tool '${toolName}' skipped (invalid arguments after fallback).`);
    return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: Tool '${toolName}' could not execute due to invalid arguments even after attempting fallback.` };
}

logger.info(`${logPrefix} Executing tool '${toolName}' (ID: ${callId.substring(0, 6)}) from Router with final Args: ${JSON.stringify(actualToolArgs).substring(0, 100)}`);

const abortController = new AbortController();
const timeoutDuration = ('timeoutMs' in tool && typeof (tool as any).timeoutMs === 'number')
  ? (tool as any).timeoutMs
  : (appConfig as any).toolTimeoutMs || DEFAULT_TOOL_TIMEOUT_MS;
const timeoutId = setTimeout(() => { logger.warn(`${logPrefix} Timeout (${timeoutDuration}ms) for '${toolName}' (ID: ${callId.substring(0, 6)})`); abortController.abort(); }, timeoutDuration);

try {
  const toolInput: ToolInput = {
    ...(actualToolArgs as Record<string, any>),
    userId,
    lang: apiContext?.lang || userState?.preferred_locale?.split("-")[0] || (appConfig as any).defaultLocale.split("-")[0],
    sessionId: apiContext?.sessionId,
    context: { ...(apiContext || {}), userState, sessionId: apiContext?.sessionId, runId: apiContext?.runId, userName: await this.getUserFirstName(userId), abortSignal: abortController.signal, workflowVariables: {} },
  };
  const output: ToolOutput = await tool.execute(toolInput, abortController.signal);
  clearTimeout(timeoutId);
  logger.info(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0, 6)}) finished. Success: ${!output.error}`);

  if (!output.error && output.structuredData) {
    structuredDataMap.set(callId, output.structuredData);
  } else {
    structuredDataMap.set(callId, null);
  }
  const resultString = output.error ? `Error from ${toolName}: ${String(output.error)}` : String(output.result || `${toolName} completed.`).substring(0, 4000);
  toolResultsSummaryParts.push(`Result from ${toolName}: ${resultString.substring(0, 150)}...`);
  return { role: "tool" as const, tool_call_id: callId, name: toolName, content: resultString };
} catch (error: any) {
  clearTimeout(timeoutId);
  const isAbort = error.name === 'AbortError' || abortController.signal.aborted;
  const errorMsg = isAbort ? `Tool '${toolName}' timed out.` : `Tool '${toolName}' error: ${String(error?.message || error)}`;
  logger.error(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0, 6)}) ${isAbort ? "TIMEOUT" : "EXCEPTION"}: ${String(error?.message || error)}`);
  structuredDataMap.set(callId, null);
  toolResultsSummaryParts.push(`Error with ${toolName}: ${errorMsg.substring(0, 100)}...`);
  return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: ${errorMsg}` };
}
  });


const settledResults = await Promise.allSettled(executionPromises);
let lastSuccessfulStructuredData: AnyToolStructuredData | null = null;


for (let i = 0; i < settledResults.length; i++) {
  const result = settledResults[i];
  const originalRoutedCall = toolCallsFromRouter[i]; // Assuming toolCallsFromRouter matches the order of executionPromises
  if (result.status === "fulfilled" && result.value) {
    const toolMessage = result.value as ChatMessage; // Type assertion
    toolResultsMessages.push(toolMessage);
    const callId = (typeof (toolMessage as any).tool_call_id === 'string' && (toolMessage as any).tool_call_id) ? (toolMessage as any).tool_call_id : `fallback_id_${i}`;
    // Check if content indicates an error before considering structuredData
    if (
      typeof toolMessage.content === 'string' &&
      !toolMessage.content.startsWith("Error:") &&
      !toolMessage.content.startsWith(`Error from ${toolMessage.name}:`) &&
      structuredDataMap.has(callId)
    ) {
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
const turnIdentifier = `OrchRun User:${userId.substring(0, 8)} Run:${runId.substring(0, 6)}`;


// Log initialAttachments received by runOrchestration
if (initialAttachments) {
  logger.info(`[${turnIdentifier}] runOrchestration received initialAttachments. Count: ${initialAttachments.length}`);
  initialAttachments.forEach((att, index) => {
    logger.info(`[${turnIdentifier}] initialAttachment[${index}]: type=${att.type}, name=${att.name}, url=${att.url}, hasFile=${!!att.file}, storagePath=${att.storagePath}`);
  });
} else {
  logger.info(`[${turnIdentifier}] runOrchestration received NO initialAttachments (null or undefined).`);
}


logger.info(`--- ${turnIdentifier} Starting Orchestration Run (Planning: ${PLANNING_MODEL_NAME_ORCH}, Chat/Vision: ${CHAT_VISION_MODEL_NAME_ORCH}) ---`);
// Initialisation des variables
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
let textQueryForRouter: string = "";
let mainUserInputContent: ChatMessageContentPart[] = [];
let retrievedMemoryContext: string = "INTERNAL CONTEXT - RELEVANT MEMORIES: None found or not applicable for this turn.";
let messagesForGpt4o: ChatMessage[] = [];
let routedTools: ToolRouterPlan = { planned_tools: [] };
let userName: string = DEFAULT_USER_NAME;
let lang: string = "en";
// AJOUT: Initialisation de toolExecutionMessages
let toolExecutionMessages: ChatMessage[] = [];


const userState: UserState | null = await supabaseAdmin.getUserState(userId);
let personaId = userState?.active_persona_id || DEFAULT_PERSONA_ID;
let personaNameForPrompt = "Minato";
let personaSpecificInstructions = "You are Minato, a helpful, friendly, and knowledgeable AI assistant.";


try { // Bloc try principal
  userName = await this.getUserFirstName(userId);
  lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || (appConfig as any).defaultLocale.split("-")[0] || "en";
  const effectiveApiContext = { ...(apiContext || {}), userName, lang, locale: userState?.preferred_locale || (appConfig as any).defaultLocale, runId };


  try { // Bloc try pour la récupération de la persona (ceci est OK)
    const persona = await this.memoryFramework.getPersonaById(personaId, userId);
    if (persona?.system_prompt) {
      personaSpecificInstructions = persona.system_prompt;
      personaNameForPrompt = persona.name || personaId;
    }
  } catch (e: any) { logger.error(`[${turnIdentifier}] Error fetching persona:`, e.message); }


  // CHANGEMENT: Le bloc try interne problématique a été supprimé.
  // La logique suivante est maintenant directement dans le bloc try principal.


  if (typeof userInput === 'string') {
    textQueryForRouter = userInput;
    mainUserInputContent.push({ type: "text", text: userInput });
  } else {
    mainUserInputContent = [...userInput];
    const textPart = userInput.find(p => p.type === 'text') as ChatMessageContentPartText | undefined;
    textQueryForRouter = textPart?.text || "";


    // Pre-process image parts from mainUserInputContent if they have blob URLs or placeholder IDs
    // by finding their corresponding File object in initialAttachments and uploading.
    if (initialAttachments && initialAttachments.length > 0) {
      logger.debug(`[${turnIdentifier}] Processing ${initialAttachments.length} initial attachments for vision input preparation.`);
      const adminClient = getSupabaseAdminClient();
      if (!adminClient) {
          logger.error(`[${turnIdentifier}] Supabase admin client is not available. Cannot process file attachments for vision.`);
      } else {
          for (let i = 0; i < mainUserInputContent.length; i++) {
              const part = mainUserInputContent[i];
              if (part.type === "input_image") {
                  const imagePartToProcess = part as ChatMessageContentPartInputImage;
                  let matchingAttachment: MessageAttachment | undefined = undefined;
                  
                  if (imagePartToProcess.image_url.startsWith("blob:") || imagePartToProcess.image_url.startsWith("placeholder_id_")) {
                      const idToMatch = imagePartToProcess.image_url.startsWith("placeholder_id_") 
                          ? imagePartToProcess.image_url.substring("placeholder_id_".length) 
                          : imagePartToProcess.image_url; 
                      
                      matchingAttachment = initialAttachments.find(att => (att.url === idToMatch || att.id === idToMatch) && att.file);
                      logger.debug(`[${turnIdentifier}] Attempting to match content part URL/ID "${idToMatch.substring(0,60)}" with initial attachments. Found: ${!!matchingAttachment}, File: ${matchingAttachment?.file && matchingAttachment.file instanceof File ? matchingAttachment.file.name : 'unknown'}`);
                  }
    
                  if (matchingAttachment && matchingAttachment.file) {
                      try {
                          const fileToUpload = matchingAttachment.file;
                          const originalUrlForLog = imagePartToProcess.image_url;
                          const fileName = (fileToUpload instanceof File && fileToUpload.name) ? fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, "_") : randomUUID();
                          const fileExtension = (fileName.includes('.') ? fileName.split('.').pop() : 'bin') || 'bin';
                          const filePath = `user_uploads/${userId}/${Date.now()}_${randomUUID().substring(0,8)}.${fileExtension}`;
                          
                          logger.info(`[${turnIdentifier}] Uploading image "${fileName}" (from URL: ${originalUrlForLog.substring(0,60)}) to Supabase at ${MEDIA_UPLOAD_BUCKET}/${filePath}`);
                          
                          const { data: uploadData, error: uploadError } = await adminClient.storage
                              .from(MEDIA_UPLOAD_BUCKET)
                              .upload(filePath, fileToUpload, { contentType: fileToUpload.type || 'application/octet-stream', upsert: true });
    
                          if (uploadError) {
                              logger.error(`[${turnIdentifier}] Supabase image upload failed for "${fileName}": ${uploadError.message}`);
                              if (fileToUpload.size < 5 * 1024 * 1024) { 
                                const arrayBuffer = await fileToUpload.arrayBuffer();
                                const base64String = Buffer.from(arrayBuffer).toString('base64');
                                imagePartToProcess.image_url = `data:${fileToUpload.type || 'image/jpeg'};base64,${base64String}`;
                                logger.info(`[${turnIdentifier}] Used base64 data URL fallback for image "${fileName}".`);
                              } else {
                                imagePartToProcess.image_url = "error_uploading_image_too_large_for_base64";
                              }
                          } else {
                              const { data: publicUrlData } = adminClient.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(uploadData.path);
                              if (publicUrlData?.publicUrl) {
                                  imagePartToProcess.image_url = publicUrlData.publicUrl; 
                                  logger.info(`[${turnIdentifier}] Image "${fileName}" uploaded. Public URL for content part: ${publicUrlData.publicUrl.substring(0,100)}`);
                                  
                                  const attIndex = initialAttachments.findIndex(att => att.id === matchingAttachment!.id || att.url === originalUrlForLog);
                                  if (attIndex !== -1) {
                                    initialAttachments[attIndex].url = publicUrlData.publicUrl;
                                    initialAttachments[attIndex].storagePath = uploadData.path;
                                    delete initialAttachments[attIndex].file; 
                                  }
                              } else {
                                  logger.error(`[${turnIdentifier}] Failed to get public URL for uploaded image "${fileName}".`);
                                  imagePartToProcess.image_url = "error_getting_public_url";
                              }
                          }
                      } catch (e: any) {
                          logger.error(`[${turnIdentifier}] Exception during attachment image upload for URL ${imagePartToProcess.image_url}: ${e.message}`);
                          imagePartToProcess.image_url = "error_processing_image_upload";
                      }
                  } else if (imagePartToProcess.image_url.startsWith("blob:") || imagePartToProcess.image_url.startsWith("placeholder_id_")) {
                       logger.warn(`[${turnIdentifier}] Image part has URL ${imagePartToProcess.image_url.substring(0,60)} but no matching *File* attachment found or file was already processed.`);
                       if (!imagePartToProcess.image_url.startsWith("http") && !imagePartToProcess.image_url.startsWith("data:")) { 
                          imagePartToProcess.image_url = "error_missing_file_for_url";
                       }
                  }
              }
          }
      }
    }


    // Filter imageParts for vision from the potentially updated mainUserInputContent
    let imageParts = mainUserInputContent.filter(p => {
      if (p.type === 'input_image') {
        // Ensure we only process valid URLs, not error placeholders
        return !p.image_url.startsWith("error_");
      }
      return false;
    }) as import("@/lib/types/index").ChatMessageContentPartInputImage[];


    // FINAL FILTER: Only allow valid URLs (http/https) or data URLs (base64)
    imageParts = imageParts.filter(img => {
      const url = img.image_url;
      const isValid = (
        typeof url === 'string' && url !== null && (
          url.startsWith('http://') || url.startsWith('https://') ||
          (url.startsWith('data:image/') && url.includes(';base64,'))
        )
      );
      if (!isValid) {
        logger.warn(`[${turnIdentifier}] Skipping invalid image_url for vision: ${url}`);
      }
      return isValid;
    });


    if (imageParts.length > 0) {
      logger.info(`[${turnIdentifier}] Detected ${imageParts.length} image attachment(s). Generating descriptions.`);
      let imageDescriptions: string[] = [];
      try {
        const visionPromptForDescription = textQueryForRouter || "Describe the content of the provided image(s) in detail. What are the key objects, scenes, and actions?";
       
        // Construct ChatMessage[] for generateVisionCompletion
        const visionMessages: ChatMessage[] = [
          {
            role: "user",
            content: [
              { type: "text", text: visionPromptForDescription },
              ...imageParts.map(img => ({
                type: "input_image" as const, // This is our internal type
                image_url: img.image_url,
                detail: img.detail || "auto"
              } as import("@/lib/types/index").ChatMessageContentPartInputImage))
            ],
            timestamp: Date.now(),
            // name: userName, // Optional, can be added if needed by generateVisionCompletion or its internals
          }
        ];


        // Log the URLs being sent to generateVisionCompletion
        logger.info(`[${turnIdentifier}] Preparing to call generateVisionCompletion. Vision messages content:`);
        visionMessages.forEach((vm, vmIndex) => {
          if (Array.isArray(vm.content)) {
            vm.content.forEach((contentPart, cpIndex) => {
              if (contentPart.type === 'input_image') {
                logger.info(`[${turnIdentifier}] VisionMessage[${vmIndex}]-ContentPart[${cpIndex}](input_image) URL: ${contentPart.image_url}`);
              } else if (contentPart.type === 'text') {
                logger.info(`[${turnIdentifier}] VisionMessage[${vmIndex}]-ContentPart[${cpIndex}](text): ${(contentPart.text || "").substring(0, 100)}...`);
              }
            });
          }
        });
       
        const visionCompletionResult = await generateVisionCompletion(
          visionMessages, // messages: ChatMessage[]
          CHAT_VISION_MODEL_NAME_ORCH, // modelName?: string
          (appConfig.openai as any).maxVisionTokens || 2048, // maxTokens?: number
          userId // userId?: string
          // No 7th argument (interactionType was incorrect for this function)
        );


        if (visionCompletionResult.text) {
          imageDescriptions.push(visionCompletionResult.text);
          logger.info(`[${turnIdentifier}] Image description(s) generated successfully.`);
        } else if (visionCompletionResult.error) {
          logger.warn(`[${turnIdentifier}] Image description generation failed: ${visionCompletionResult.error}. Proceeding without image summary.`);
          imageDescriptions.push("[Image analysis attempted but failed to produce summary.]");
        } else {
           logger.warn(`[${turnIdentifier}] Image description generation returned no text and no error.`);
           imageDescriptions.push("[Image content present but no textual summary generated.]");
        }


      } catch (visionError: any) {
        logger.error(`[${turnIdentifier}] Error during image description generation: ${visionError.message}`);
        imageDescriptions.push("[Error during image analysis.]");
      }
     
      if (imageDescriptions.length > 0) {
        textQueryForRouter += (textQueryForRouter ? "\n" : "") + `[Image Content Summary: ${imageDescriptions.join("\n")}]`;
      } else {
        textQueryForRouter += (textQueryForRouter ? " " : "") + "[User sent images/frames - summary unavailable]";
      }
    }
  }


  const videoAttachment = initialAttachments?.find(att => att.type === 'video' && att.file);
  if (videoAttachment && videoAttachment.file) {
    logger.info(`[${turnIdentifier}] Detected video attachment: ${videoAttachment.name}. Initiating analysis.`);
    const videoBuffer = Buffer.from(await videoAttachment.file.arrayBuffer());
    const videoAnalysisResult = await this.videoAnalysisService.analyzeVideo(
      videoBuffer, videoAttachment.name || "uploaded_video",
      videoAttachment.mimeType || "video/mp4",
      textQueryForRouter || "Describe this video.", userId
    );
    if (videoAnalysisResult.summary) {
      videoSummaryForContext = videoAnalysisResult.summary;
      textQueryForRouter += (textQueryForRouter ? "\n" : "") + `[Video Content Summary: ${videoSummaryForContext.substring(0, 200)}...]`;
      
      // Add visual QA validation (new code)
      try {
        const visualQAResult = await this.videoAnalysisService.generateQA(
          videoBuffer,
          "What are 3 key visual elements? What's the main action? What colors dominate?",
          userId
        );
        
        if (visualQAResult?.answers?.length > 0) {
          const qaText = `[Visual QA: ${visualQAResult.answers.join("; ").substring(0, 150)}]`;
          textQueryForRouter += `\n${qaText}`;
          logger.info(`${turnIdentifier} Added visual QA to context: ${qaText}`);
        }
      } catch (qaError) {
        const qaErrorMsg = qaError instanceof Error ? qaError.message : String(qaError);
        logger.warn(`${turnIdentifier} Visual QA failed but continuing: ${qaErrorMsg}`);
      }
    } else if (videoAnalysisResult.error) {
      logger.warn(`[${turnIdentifier}] Video analysis failed: ${videoAnalysisResult.error}. Proceeding without video summary.`);
      textQueryForRouter += (textQueryForRouter ? "\n" : "") + "[Video analysis attempted but failed to produce summary.]";
    }
  }


  // CHANGEMENT: Suppression de la redéclaration de routedTools. La variable de la portée supérieure sera utilisée.
  // let routedTools: ToolRouterPlan = { planned_tools: [] }; // <= LIGNE SUPPRIMÉE


  const toolRouterPrompt = injectPromptVariables(TOOL_ROUTER_PROMPT_TEMPLATE, {
    userName, userQuery: textQueryForRouter,
    conversationHistorySummary: summarizeChatHistory(history),
    userStateSummary: summarizeUserStateForWorkflow(userState),
    available_tools_for_planning: this.availableToolsForRouter.map(t => `- ${t.function.name}: ${t.function.description?.substring(0, 100)}...`).join("\n"),
    language: lang, userPersona: personaNameForPrompt,
  });


  logger.info(`[${turnIdentifier}] Invoking Tool Router (${PLANNING_MODEL_NAME_ORCH})... Query for router: "${textQueryForRouter.substring(0, 70)}"`);


  const routerSchema = {
    type: "object" as const,
    properties: {
      planned_tools: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            tool_name: { type: "string" as const },
            arguments: {
              type: "object" as const,
              additionalProperties: false,
              properties: {}
            },
            reason: { type: "string" as const }
          },
          required: ["tool_name", "reason", "arguments"],
          additionalProperties: false
        }
      }
    },
    required: ["planned_tools"],
    additionalProperties: false
  };


  const routerResult = await generateStructuredJson<ToolRouterPlan>(
    toolRouterPrompt, textQueryForRouter,
    routerSchema,
    "tool_router_v1_1",
    history.filter(m => typeof m.content === 'string'),
    PLANNING_MODEL_NAME_ORCH, userId
  );


  if ("error" in routerResult) {
    logger.error(`[${turnIdentifier}] Tool Router (${PLANNING_MODEL_NAME_ORCH}) failed: ${routerResult.error}. Proceeding without tools.`);
    finalFlowType = "direct_llm_after_router_fail";
  } else {
    routedTools = routerResult; // Assignation à la variable routedTools de la portée supérieure
    finalToolCallsLogged = routedTools.planned_tools.map(rt => ({ toolName: rt.tool_name, args: rt.arguments, reason: rt.reason }));
    logger.info(`[${turnIdentifier}] Tool Router selected ${routedTools.planned_tools.length} tools: ${routedTools.planned_tools.map(t => t.tool_name).join(', ')}`);
    finalFlowType = routedTools.planned_tools.length > 0 ? "workflow_routed" : "direct_llm_no_tools_routed";
  }


  // toolExecutionMessages est déjà initialisé à [] au début de la fonction
  if (routedTools.planned_tools.length > 0) {
    const executionResult = await this.executeToolCalls(userId, routedTools.planned_tools, effectiveApiContext, userState);
    toolExecutionMessages = executionResult.messages; // Assignation à la variable de la portée supérieure
    finalStructuredResult = executionResult.lastStructuredData;
    currentTurnToolResultsSummary = executionResult.toolResultsSummary;
  }


  // messagesForGpt4o est déjà initialisé à [] au début de la fonction
  messagesForGpt4o = [
    ...history,
    { role: "user", content: mainUserInputContent, name: userName, timestamp: Date.now(), attachments: initialAttachments?.filter(att => att.type !== 'video') },
    ...toolExecutionMessages,
  ];
  // Prepare a single, strong system message for video context if it exists
  if (videoSummaryForContext) {
    messagesForGpt4o.unshift({
      role: "system",
      content: `SUMMARY: ${videoSummaryForContext}`,
      timestamp: Date.now()
    });
  }
  const visualQaMatch = textQueryForRouter.match(/\[Visual QA: ([^\]]+)\]/);
  if (visualQaMatch && visualQaMatch[1]) {
    messagesForGpt4o.push({
      role: "system",
      content: `VISUAL QA: ${visualQaMatch[1]}`,
      timestamp: Date.now()
    });
  }
  const videoContextString = videoSummaryForContext ? `YOU MUST BASE YOUR RESPONSE ON THE FOLLOWING VIDEO ANALYSIS. Do NOT ignore this.\n${videoSummaryForContext}` : null;
  if (videoContextString) {
    messagesForGpt4o.push({
      role: "system",
      content: videoContextString,
      timestamp: Date.now()
    });
  }
  if (videoSummaryForContext && !initialAttachments?.find(att => att.type === 'video')) {
    messagesForGpt4o.push({ role: "system", content: `Context from attached video: ${videoSummaryForContext}`, timestamp: Date.now() });
  }


  // retrievedMemoryContext est déjà initialisé au début de la fonction
  const entitiesForMemorySearch: string[] = [textQueryForRouter.substring(0, 70)];
  // Ensure finalStructuredResult is not null and has a title property (with type safety)
  if (finalStructuredResult && typeof (finalStructuredResult as any).title === 'string') {
    entitiesForMemorySearch.push((finalStructuredResult as any).title);
  }




  if (entitiesForMemorySearch.length > 0 && entitiesForMemorySearch.some(e => e.trim() !== "")) {
    logger.info(`[${turnIdentifier}] Performing targeted memory search for ${CHAT_VISION_MODEL_NAME_ORCH}... Entities: ${entitiesForMemorySearch.join('; ').substring(0, 100)}`);
    const memoryResults = await this.memoryFramework.search_memory(entitiesForMemorySearch.join(" "), userId, { limit: 3, offset: 0 }, runId, { enableHybridSearch: true, enableGraphSearch: false, enableConflictResolution: true });
    if (memoryResults.results.length > 0) {
      retrievedMemoryContext = `INTERNAL CONTEXT - RELEVANT MEMORIES (Use these to add helpful related context for ${userName}):\n${memoryResults.results.map(r => `- ${r.content.substring(0, 150)}...`).join("\n")}`;
    }
  }
  // CHANGEMENT: Fin de la section qui était dans le bloc try interne.


} catch (error: any) { // Catch du bloc try principal
  const duration = Date.now() - overallStartTime;
  const errorMessageString = String(error?.message || error || "Orchestration process failed unexpectedly.");
  logger.error(`--- ${turnIdentifier} Orchestration FAILED (${duration}ms): ${errorMessageString}`, error.stack);
  let errorMsg = errorMessageString; if (error.cause) errorMsg = `${errorMsg} (Cause: ${String(error.cause)})`;
  finalFlowType = 'error'; finalResponseSource = "Orchestration Exception";
  if (userId) { const errorMemText = `Minato error for ${userName}: ${errorMsg}`.substring(0, 350); this.memoryFramework.add_memory([], userId, runId, errorMemText).catch(memErr => logger.error(`[${turnIdentifier}] Failed logging orch error to memory:`, memErr)); }
  const userNameForError = userName || DEFAULT_USER_NAME; responseIntentType = "apologetic";
  return { sessionId: runId, response: `I apologize, ${userNameForError}. I encountered an internal error. Minato is looking into it.`, error: errorMsg, lang: lang, audioUrl: null, intentType: responseIntentType, ttsInstructions: getDynamicInstructions(responseIntentType), debugInfo: { flow_type: 'error', llmUsage: llmUsage_total, latencyMs: duration }, workflowFeedback: null, clarificationQuestion: undefined, structuredData: null, transcription: typeof userInput === 'string' && apiContext?.transcription ? apiContext.transcription : null, llmUsage: llmUsage_total, attachments: initialAttachments };
}


// Prepare video context for synthesis prompt
let videoContextParts: string[] = [];
if (videoSummaryForContext) videoContextParts.push(`SUMMARY: ${videoSummaryForContext}`);
const visualQaMatch = textQueryForRouter.match(/\[Visual QA: ([^\]]+)\]/);
if (visualQaMatch && visualQaMatch[1]) {
  videoContextParts.push(`VISUAL QA: ${visualQaMatch[1]}`);
}
const videoContextString = videoContextParts.length
  ? `YOU MUST BASE YOUR RESPONSE ON THE FOLLOWING VIDEO ANALYSIS. Do NOT ignore this.\n${videoContextParts.join('\n')}`
  : null;

const synthesisSystemPrompt = injectPromptVariables(TOOL_ROUTER_PROMPT_TEMPLATE, {
  userName, personaName: personaNameForPrompt, personaInstructions: personaSpecificInstructions, language: lang,
  retrieved_memory_context: retrievedMemoryContext,
  tool_results_summary: currentTurnToolResultsSummary || "No tools were executed by Minato this turn, or their results are directly integrated.",
  original_query: textQueryForRouter,
  tool_router_follow_up_suggestion: toolRouterFollowUpSuggestion || `Is there anything else Minato can help you with today, ${userName}?`,
  videoContextFallback: videoContextString
});


logger.info(`[${turnIdentifier}] Synthesizing final response (${CHAT_VISION_MODEL_NAME_ORCH})...`);
const synthesisResult = await generateStructuredJson<{ responseText: string; intentType: string }>(
  synthesisSystemPrompt, textQueryForRouter, // textQueryForRouter for user message context in synthesis
  {
    type: "object",
    properties: { responseText: { type: "string" }, intentType: { type: "string", enum: Object.keys(TTS_INSTRUCTION_MAP) } },
    required: ["responseText", "intentType"],
    additionalProperties: false,
  },
  "minato_gpt4o_synthesis_v1",
  messagesForGpt4o, // messagesForGpt4o contains full context including tool results
  CHAT_VISION_MODEL_NAME_ORCH,
  userId
);


const synthesisLlmUsage = (synthesisResult as any).usage as CompletionUsage | undefined;
if (synthesisLlmUsage) {
  llmUsage_total.prompt_tokens += synthesisLlmUsage.prompt_tokens || 0;
  llmUsage_total.completion_tokens += synthesisLlmUsage.completion_tokens || 0;
  llmUsage_total.total_tokens += synthesisLlmUsage.total_tokens || 0;
}


if ("error" in synthesisResult) {
  finalResponseText = `I've processed your request, ${userName}, but I'm having a bit of trouble wording my reply. ${synthesisResult.error?.substring(0, 100) || "Could you try rephrasing?"}`;
  responseIntentType = "apologetic";
  finalFlowType = "synthesis_error"; // Keep this distinct from direct_llm_after_router_fail
  logger.error(`[${turnIdentifier}] ${CHAT_VISION_MODEL_NAME_ORCH} Synthesis LLM failed: ${synthesisResult.error}`);
} else {
  finalResponseText = synthesisResult.responseText;
  responseIntentType = synthesisResult.intentType;
  if (finalFlowType !== "direct_llm_after_router_fail") { // Only update if not already set by router failure
    finalFlowType = routedTools.planned_tools.length > 0 ? "workflow_synthesis" : "direct_llm_synthesis";
  }
}
ttsInstructionsForFinalResponse = getDynamicInstructions(responseIntentType);
finalResponseSource = CHAT_VISION_MODEL_NAME_ORCH + " Synthesis";


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
  llmModelUsed: CHAT_VISION_MODEL_NAME_ORCH,
  workflowPlannerModelUsed: PLANNING_MODEL_NAME_ORCH,
  llmUsage: llmUsage_total,
  latencyMs: orchestrationMs,
  toolCalls: finalToolCallsLogged,
  videoSummaryUsed: videoSummaryForContext ? videoSummaryForContext.substring(0, 100) + "..." : null,
};
logger.info(`--- ${turnIdentifier} Orchestration complete (${orchestrationMs}ms). Flow: ${finalFlowType}. ---`);


// Limit the number of planned tools to a maximum of four
routedTools.planned_tools = routedTools.planned_tools.slice(0, 4);


return {
  sessionId: runId, response: finalResponseText,
  intentType: responseIntentType,
  ttsInstructions: ttsInstructionsForFinalResponse,
  clarificationQuestion: clarificationQuestionForUser,
  error: (typeof finalFlowType === 'string' && finalFlowType.includes("error")) ? (finalResponseText || "Processing error") : null,
  lang: lang, structuredData: finalStructuredResult,
  workflowFeedback: null, debugInfo: debugInfoInternal, audioUrl: null,
  transcription: typeof userInput === 'string' && apiContext?.transcription ? apiContext.transcription : (textQueryForRouter !== (typeof userInput === 'string' ? userInput : (userInput.find(p => p.type === 'text') as ChatMessageContentPartText)?.text || '')) ? textQueryForRouter : null,
  llmUsage: llmUsage_total,
  attachments: [], // Ensure attachments are handled if needed in the response
};


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
const lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || (appConfig as any).defaultLocale.split("-")[0] || "en";
const effectiveSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;
const userName = await this.getUserFirstName(userId);
const effectiveApiContext = { ...apiContext, sessionId: effectiveSessionId, locale: userState?.preferred_locale || (appConfig as any).defaultLocale, lang, userName };
const inputText = text ?? "";
let orchestratorInput: string | ChatMessageContentPart[] = inputText;


// Ensure proper handling of attachments to create ChatMessageContentPartInputImage
if (attachments && attachments.length > 0) {
  const contentParts: ChatMessageContentPart[] = [{ type: "text", text: inputText }];
  let hasImageAttachment = false;


  for (const att of attachments) {
    if (att.type === "image") {
      hasImageAttachment = true;
      if (att.file) { // If a file object exists, prioritize it for creating an input_image part
        const imageUrlForPart = (att.url && att.url.startsWith("blob:"))
          ? att.url
          : `placeholder_id_${att.id || randomUUID()}`; // Use placeholder if URL is not blob or missing
        contentParts.push({ type: "input_image", image_url: imageUrlForPart, detail: "auto" });
      } else if (att.url) { // No file, but an existing URL (e.g., http, supabase_storage)
        contentParts.push({ type: "input_image", image_url: att.url, detail: "auto" });
      }
    } else if (att.type === "video" && att.file) {
      // Video files are handled by initialAttachments in runOrchestration, not as content parts here.
      // We just need to ensure attachments array is passed.
    }
    // Other attachment types like 'document' or 'audio' are not typically converted to input_image parts.
  }


  if (hasImageAttachment || contentParts.length > 1) { // If images were added, or if initial text was only for context to multiple images
    // If the only text part is empty and images were added, remove the empty text part.
    if (contentParts.length > 1 && contentParts[0].type === "text" && (contentParts[0] as ChatMessageContentPartText).text === "") {
        contentParts.shift();
    }
    orchestratorInput = contentParts;
  }
  // If no image attachments were processed into contentParts, and inputText was not empty,
  // orchestratorInput remains inputText (string). If inputText was empty and no images, it also remains string (empty).
}




const result = await this.runOrchestration(userId, orchestratorInput, history, effectiveApiContext, attachments);
return { ...result, sessionId: effectiveSessionId, lang: result.lang || lang };


}
private async fetchAudioBuffer(url: string): Promise<Buffer> {
const logPrefix = "[Orchestrator fetchAudioBuffer]";
try {
const supabaseStorageUrl = (appConfig as any).supabase.storageUrl;
// Validate if the URL is from Supabase storage to avoid arbitrary fetches.
if (!url.startsWith(supabaseStorageUrl)) {
logger.error(`${logPrefix} Invalid audio URL: ${url}. Must be a Supabase storage URL.`);
throw new Error(`Invalid audio URL: Must be a Supabase storage URL.`);
}
const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    logger.warn(`${logPrefix} Fetch audio from Supabase timed out for URL: ${url.substring(0,100)}...`);
    controller.abort();
  }, 15000); // 15-second timeout


  logger.debug(`${logPrefix} Fetching audio from Supabase storage: ${url.substring(0,100)}...`);
  const response = await fetch(url, {
    signal: controller.signal,
    // No 'Content-Type' or 'Authorization' headers needed for Supabase signed GET URLs
  });
  clearTimeout(timeoutId);


  if (!response.ok) {
    const errorText = await response.text().catch(() => `Status ${response.statusText}`);
    logger.error(`${logPrefix} Supabase storage error: ${response.status} ${response.statusText}. URL: ${url.substring(0,100)}... Response body: ${errorText.substring(0,200)}`);
    throw new Error(`Supabase storage error: ${response.status} ${response.statusText}`);
  }


  const arrayBuffer = await response.arrayBuffer();
  logger.debug(`${logPrefix} Audio fetched successfully from ${url.substring(0,100)}... Size: ${arrayBuffer.byteLength} bytes.`);
  return Buffer.from(arrayBuffer);
} catch (error: any) {
  logger.error(`${logPrefix} Audio fetch failed for URL ${url.substring(0,100)}... Error: ${error.message}`, error.stack);
  throw new Error(`Audio processing error: ${error.message}`);
}


}
public async processAudioMessage(
userId: string,
audioSignedUrl: string,
history: ChatMessage[] = [],
sessionId?: string,
apiContext?: Record<string, any>
): Promise<OrchestratorResponse> {
try {
const supabaseStorageUrl = (appConfig as any).supabase.storageUrl;
if (!audioSignedUrl.startsWith(supabaseStorageUrl)) {
throw new Error(`Invalid audio URL: Must start with ${supabaseStorageUrl}`);
}
const audioBuffer = await this.fetchAudioBuffer(audioSignedUrl);
  const currentSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;
  const startTime = Date.now();
  let transcribedText: string | null = null;
  let detectedLang: string | null = null;
  let audioFetchDuration: number | undefined = undefined; // Will be part of overall unless fetchAudioBuffer measures it
  let sttDuration: number | undefined = undefined;
  let ttsDuration: number | undefined = undefined;
  let orchResult: OrchestratorResponse | null = null;
  let userName: string = apiContext?.userName || DEFAULT_USER_NAME;
  const turnIdentifier = `Req[Audio] User:${userId.substring(0, 8)} Sess:${currentSessionId.substring(0, 6)}`;
  try {
    userName = apiContext?.userName || await this.getUserFirstName(userId) || DEFAULT_USER_NAME;
    const sttStart = Date.now();
    const transcriptionResult = await this.sttService.transcribeAudio(audioBuffer, undefined, undefined, apiContext?.detectedMimeType);
    sttDuration = Date.now() - sttStart;
    if (transcriptionResult.error || !transcriptionResult.text?.trim()) {
      logger.error(`--- ${turnIdentifier} STT Error: ${transcriptionResult.error || "Empty transcription."}`);
      throw new Error(transcriptionResult.error || "Empty transcription.");
    }
    transcribedText = transcriptionResult.text;
    detectedLang = transcriptionResult.language || null;
    logger.info(`--- ${turnIdentifier} STT OK. Lang: ${detectedLang || "unk"}. Text: "${transcribedText.substring(0, 50)}..."`);


    const userState = await supabaseAdmin.getUserState(userId);
    const lang = detectedLang || apiContext?.lang || userState?.preferred_locale?.split("-")[0] || (appConfig as any).defaultLocale.split("-")[0] || "en";
    const effectiveApiContext = { ...apiContext, sessionId: currentSessionId, runId: currentSessionId, locale: userState?.preferred_locale || (appConfig as any).defaultLocale, lang, detectedLanguage: detectedLang, userName, transcription: transcribedText };


    orchResult = await this.runOrchestration(userId, transcribedText, history, effectiveApiContext);


    // Compare orchestrator response with what would be sent in a text flow
    if (orchResult && orchResult.response) {
      // In the text flow, the same orchestrator.runOrchestration would be called with the user's text input
      // Here, we use the transcribedText as input, so if the transcription is off, the response may differ
      logger.debug(`[Audio/Text Sync Check] Orchestrator response for audio (transcribed): "${orchResult.response.substring(0, 200)}"`);
      // Optionally, you could log the transcribedText and the original audio URL for further debugging
      logger.debug(`[Audio/Text Sync Check] Transcribed text: "${transcribedText}" (audio URL: ${audioSignedUrl})`);
    }


    let ttsUrl: string | null = null;
    if (orchResult?.response) { // Only generate TTS if there's a response text
      let selectedVoice = isValidOpenAITtsVoice((appConfig as any).openai.ttsDefaultVoice)
        ? (appConfig as any).openai.ttsDefaultVoice
        : 'nova' as OpenAITtsVoice;
      const persona = userState?.active_persona_id ? await this.memoryFramework.getPersonaById(userState.active_persona_id, userId) : null;
      if (persona?.voice_id && isValidOpenAITtsVoice(persona.voice_id)) {
        selectedVoice = persona.voice_id;
      } else if (userState?.chainedvoice && isValidOpenAITtsVoice(userState.chainedvoice)) {
        selectedVoice = userState.chainedvoice as OpenAITtsVoice;
      }
      const ttsStart = Date.now();
      const ttsInstructions = orchResult.ttsInstructions || getDynamicInstructions(orchResult.intentType);
      const ttsResult = await this.ttsService.generateAndStoreSpeech(orchResult.response, userId, selectedVoice, ttsInstructions);
      ttsDuration = Date.now() - ttsStart;
      if (ttsResult.url) ttsUrl = ttsResult.url; else logger.error(`--- ${turnIdentifier} TTS failed: ${ttsResult.error}.`);
      if (orchResult) orchResult.audioUrl = ttsUrl; // Update orchResult directly
    }


    // Update state and streak regardless of TTS success if core processing was attempted
    supabaseAdmin.updateState(userId, { last_interaction_at: new Date().toISOString(), preferred_locale: effectiveApiContext.locale }).catch((err: any) => logger.error(`Err state update:`, err));
    supabaseAdmin.incrementStreak(userId, "daily_voice").catch((err: any) => logger.error(`Err streak:`, err));


    const duration = Date.now() - startTime;
    logger.info(`--- ${turnIdentifier} AUDIO complete (${duration}ms).`);


    const finalDebugInfo: OrchestratorResponse['debugInfo'] = {
      ...(orchResult?.debugInfo || {}), // Spread debugInfo from orchestration
      audioFetchMs: audioFetchDuration,
      sttMs: sttDuration, ttsMs: ttsDuration,
      sttModelUsed: (appConfig as any).openai.sttModel,
      ttsModelUsed: ttsUrl ? (appConfig as any).openai.ttsModel : null, // Only log ttsModel if URL was generated
      latencyMs: duration, // Overall latency for audio processing
      assistantMessageId: (orchResult as any)?.id, // If orchestrator response has an ID
    };


    // Ensure all parts of OrchestratorResponse are correctly populated from orchResult
    return {
      sessionId: currentSessionId,
      response: orchResult?.response || null,
      intentType: orchResult?.intentType || null,
      ttsInstructions: orchResult?.ttsInstructions || getDynamicInstructions(orchResult?.intentType),
      clarificationQuestion: orchResult?.clarificationQuestion || null,
      error: orchResult?.error || null,
      lang: effectiveApiContext.lang, // Use the determined lang
      transcription: transcribedText,
      audioUrl: orchResult?.audioUrl || null, // Updated audioUrl
      structuredData: orchResult?.structuredData || null,
      workflowFeedback: orchResult?.workflowFeedback || null,
      debugInfo: finalDebugInfo,
      llmUsage: orchResult?.llmUsage || null,
      attachments: orchResult?.attachments || []
    };


  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessageString = String(error?.message || error || `Failed processing audio for ${userName}.`);
    logger.error(`--- ${turnIdentifier} Error (${duration}ms): ${errorMessageString}`, error.stack);


    const userFacingError = `I'm sorry, ${userName}, I encountered an issue processing your audio. Please try again.`; // Simplified user-facing error
    const responseIntentTypeOnError = "error";
    const debugInfoOnError: OrchestratorResponse['debugInfo'] = { latencyMs: duration, audioFetchMs: audioFetchDuration, sttMs: sttDuration, sttModelUsed: (appConfig as any).openai.sttModel, flow_type: 'error' };


    let errorTtsUrl: string | null = null;
    try {
      // Attempt to generate TTS for the error message itself
      const userStateOnError = await supabaseAdmin.getUserState(userId); // Fetch state again for voice preference
      const errorTtsVoice = (userStateOnError?.chainedvoice && isValidOpenAITtsVoice(userStateOnError.chainedvoice))
        ? userStateOnError.chainedvoice
        : (isValidOpenAITtsVoice((appConfig as any).openai.ttsDefaultVoice) ? (appConfig as any).openai.ttsDefaultVoice : 'nova');
      const errorTtsResult = await this.ttsService.generateAndStoreSpeech(
        userFacingError, userId,
        errorTtsVoice,
        getDynamicInstructions(responseIntentTypeOnError)
      );
      if (errorTtsResult.url) errorTtsUrl = errorTtsResult.url;
    } catch (ttsErrorException: any) {
      logger.error(`--- ${turnIdentifier} Failed to generate TTS for error message:`, ttsErrorException.message);
    }


    return {
      sessionId: currentSessionId,
      response: userFacingError, // Provide the text error message
      error: errorMessageString, // Provide detailed error for internal logging/debugging
      transcription: transcribedText, // If transcription was successful before error
      lang: detectedLang || apiContext?.lang || (appConfig as any).defaultLocale.split("-")[0] || "en",
      workflowFeedback: null,
      debugInfo: debugInfoOnError,
      intentType: responseIntentTypeOnError,
      ttsInstructions: getDynamicInstructions(responseIntentTypeOnError),
      audioUrl: errorTtsUrl,
      structuredData: null,
      clarificationQuestion: null,
      llmUsage: null,
      attachments: []
    };
  }
} catch (error: any) {
  logger.error(`Audio processing failed for ${userId}: ${error.message}`);
  // This rethrow will be caught by the outer try...catch in the API route
  throw error;
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
export type { ToolRouterPlan };
export { TTS_INSTRUCTION_MAP };
