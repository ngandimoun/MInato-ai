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
DynamicWorkflowPlan,
WorkflowState,
ChatMessageContentPartText,
ResponseApiInputContent,
} from "@/lib/types/index";
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "../tools/base-tool";
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
MEDIA_UPLOAD_BUCKET,
} from "../constants";
import { appConfig, injectPromptVariables } from "../config";
import {
generateAgentResponse,
generateVisionCompletion,
generateEmbeddingLC,
generateResponseWithIntent,
} from "../providers/llm_clients";
import { RESPONSE_SYNTHESIS_PROMPT_TEMPLATE } from "../prompts";
import { logger } from "../../memory-framework/config";
import { safeJsonParse } from "../../memory-framework/core/utils";
import { WorkflowEngine, DYNAMIC_WORKFLOW_DESIGN_MODEL } from "./workflow-engine";
import { CompletionUsage } from "openai/resources";
type SdkResponsesApiTool = OpenAI.Chat.Completions.ChatCompletionTool;
type SdkResponsesApiFunctionCall = ChatCompletionMessageToolCall;
type DynamicWorkflowPlanWithPartial = DynamicWorkflowPlan & {
is_partial_plan?: boolean;
continuation_summary?: string | null;
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
return history
.slice(-MAX_CHAT_HISTORY * 2)
.map((msg) => {
let contentPreview = "";
if (typeof msg.content === "string") {
contentPreview = msg.content.substring(0, 100) + (msg.content.length > 100 ? "..." : "");
} else if (Array.isArray(msg.content)) {
// Corrected to match ChatMessageContentPart structure from lib/types
const textPartObject = msg.content.find((p): p is ChatMessageContentPartText => p.type === "text");
const textPart = textPartObject?.text;
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
function isValidOpenAITtsVoice(voice: string | null | undefined): voice is OpenAITtsVoice {
if (!voice) return false;
return (appConfig.openai.ttsVoices as ReadonlyArray<string>).includes(voice);
}
function sanitizeToolParameterSchemaForOpenAI(originalSchema: BaseTool['argsSchema']): OpenAI.FunctionDefinition["parameters"] {
if (!originalSchema || originalSchema.type !== 'object' || !originalSchema.properties) {
return { type: "object", properties: {} };
}
const sanitizedProperties: Record<string, OpenAIToolParameterProperties> = {};
let newRequired: string[] = [];
for (const key in originalSchema.properties) {
    if (Object.prototype.hasOwnProperty.call(originalSchema.properties, key)) {
        const prop = JSON.parse(JSON.stringify(originalSchema.properties[key])); 

        delete prop.const;
        delete prop.default;

        if (Array.isArray(prop.type) && prop.type.length === 1 && prop.type[0] === "null") {
            prop.type = ["string", "null"]; 
        }
        
        if (prop.type === "object" || (Array.isArray(prop.type) && prop.type.includes("object"))) {
            if (prop.properties) {
                const nestedSchemaDef = {
                    type: "object",
                    properties: prop.properties,
                    required: prop.required, 
                    additionalProperties: prop.additionalProperties === undefined ? false : prop.additionalProperties,
                };
                const sanitizedNested = sanitizeToolParameterSchemaForOpenAI(nestedSchemaDef as any); 
                if (sanitizedNested) {
                    prop.properties = sanitizedNested.properties || {};
                    prop.required = sanitizedNested.required;
                    prop.additionalProperties = sanitizedNested.additionalProperties;
                }
            } else {
                prop.properties = {}; 
                delete prop.required; 
            }
        } else if (prop.type === "array" || (Array.isArray(prop.type) && prop.type.includes("array"))) {
            if (prop.items && typeof prop.items === 'object') {
                prop.items = sanitizeToolParameterSchemaForOpenAI(prop.items as any);
            } else if (prop.items && typeof prop.items !== 'object') {
            } else {
                prop.items = { type: "string" };
            }
        }
        sanitizedProperties[key] = prop;
        newRequired.push(key); 
    }
}

const finalRequired = newRequired.filter(rKey => sanitizedProperties.hasOwnProperty(rKey));

return {
    type: "object",
    properties: sanitizedProperties,
    ...(finalRequired.length > 0 && { required: finalRequired }),
    additionalProperties: !!originalSchema.additionalProperties, 
};
}
export class Orchestrator {
private ttsService = new TTSService();
private sttService = new STTService();
private toolRegistry: { [key: string]: BaseTool };
private memoryFramework: CompanionCoreMemory;
private availableToolsSchemaForPlanner: SdkResponsesApiTool[] = [];
private workflowEngine: WorkflowEngine;
constructor() {
logger.info("[Orch] Initializing Orchestrator (Planner-First, Max 3 Tools/Turn, Strategic Memory)...");
try {
this.memoryFramework = new CompanionCoreMemory();
logger.info("[Orch] Memory Framework initialized.");
} catch (memError: any) {
logger.error("[Orch] CRITICAL: Failed init Memory Framework:", memError.message, memError.stack);
throw new Error(`Memory init failed: ${memError.message}`);
}
const memoryToolInstance = new MemoryTool(this.memoryFramework);
const internalTaskToolInstance = new InternalTaskTool(this.memoryFramework);
this.toolRegistry = {
...appToolsRegistry,
[memoryToolInstance.name]: memoryToolInstance,
[internalTaskToolInstance.name]: internalTaskToolInstance,
};
this.workflowEngine = new WorkflowEngine(this.toolRegistry);
logger.info("[Orch] Workflow Engine initialized.");
this.availableToolsSchemaForPlanner = Object.values(this.toolRegistry)
.filter(tool => (tool as BaseTool).enabled !== false)
.map(tool => {
const baseTool = tool as BaseTool;
const sanitizedParams = sanitizeToolParameterSchemaForOpenAI(baseTool.argsSchema);
return {
type: "function" as const,
function: {
name: baseTool.name,
description: baseTool.description,
parameters: sanitizedParams,
}
} as SdkResponsesApiTool;
});
const toolNamesForPlanner = this.availableToolsSchemaForPlanner.map(t => (t.type === 'function' ? t.function.name : t.type)).filter(name => name);
logger.info(`[Orch] Registered tools for LLM Planner & Execution (${toolNamesForPlanner.length}): ${toolNamesForPlanner.join(', ')}`);
if (this.availableToolsSchemaForPlanner.some(t => (t.type === 'function' && (!t.function.name || typeof t.function.name !== 'string' || t.function.name.trim() === '')))) {
logger.error("[Orch] CRITICAL: Tool schema generation error: Invalid name found for Responses API tool schema.");
}
}
private async logInteraction(logData: Partial<{ id: number | null; user_id: string; session_id: string | null; run_id: string | null; user_query: string | null; query_timestamp?: string; workflow_triggered_id: string | null; dynamic_plan_goal: string | null; flow_type: DebugFlowType; tool_calls: any | null; final_response_source: string | null; response_timestamp?: string; latency_ms: number | null; error_message: string | null; metadata?: any | null; }>, isUpdate: boolean = false, logIdToUpdate?: number | null): Promise<number | null> {
if (!logData.user_id) { logger.error("[Orch InteractionLog] Cannot log without user_id."); return null; }
const tableName = "interaction_logs";
try {
const adminClient = getSupabaseAdminClient();
if (!adminClient) { logger.warn(`[Orch InteractionLog ${isUpdate ? "Update" : "Insert"}] Admin client unavailable.`); return isUpdate ? (logIdToUpdate ?? null) : null; }
if (isUpdate && logIdToUpdate) {
const { error } = await adminClient.from(tableName).update({ ...logData, response_timestamp: new Date().toISOString() }).eq("id", logIdToUpdate);
if (error) logger.error(`[Orch InteractionLog Update] Failed log ID ${logIdToUpdate} for user ${logData.user_id?.substring(0,8)}:`, error);
else logger.debug(`[Orch InteractionLog Update] Updated log ID ${logIdToUpdate} for user ${logData.user_id?.substring(0,8)}.`);
return logIdToUpdate;
} else {
const { data, error } = await adminClient.from(tableName).insert({ ...logData, user_query: logData.user_query ?? "", query_timestamp: logData.query_timestamp || new Date().toISOString(), flow_type: logData.flow_type || 'pending'}).select("id").single();
if (error) logger.error(`[Orch InteractionLog Insert] Failed for user ${logData.user_id?.substring(0,8)}:`, error);
else logger.debug(`[Orch InteractionLog Insert] Created log ID ${data?.id} for user ${logData.user_id?.substring(0,8)}.`);
return data?.id || null;
}
} catch (dbError: any) { logger.error(`[Orch InteractionLog] DB exception for user ${logData.user_id?.substring(0,8)}:`, dbError); return null; }
}
private async getUserFirstName(userId: string): Promise<string> {
if (!userId) { logger.warn("[Orch getUserFirstName] No userId."); return DEFAULT_USER_NAME; }
try {
const state = await supabaseAdmin.getUserState(userId);
if (state?.user_first_name?.trim()) return state.user_first_name.trim();
const profile = await supabaseAdmin.getUserProfile(userId);
return profile?.first_name?.trim() || profile?.full_name?.trim()?.split(" ")[0] || DEFAULT_USER_NAME;
} catch (error: any) { logger.warn(`[Orch getUserFirstName] Failed fetch for user ${userId.substring(0,8)}: ${error.message}`); return DEFAULT_USER_NAME; }
}
private async executeToolCalls( userId: string, toolCallsFromResponsesApi: SdkResponsesApiFunctionCall[], apiContext: Record<string, any>, userState: UserState | null ): Promise<{ messages: ChatMessage[]; lastStructuredData: AnyToolStructuredData | null; llmUsage: null }> {
const logPrefix = `ToolExecutor User:${userId.substring(0, 8)} Sess:${apiContext?.sessionId?.substring(0, 6)}`;
const toolResultsMessages: ChatMessage[] = [];
const structuredDataMap: Map<string, AnyToolStructuredData | null> = new Map();
const executionPromises = toolCallsFromResponsesApi.map(async (toolCall) => {
const toolName = toolCall.function.name;
const tool = this.toolRegistry[toolName];
const callId = toolCall.id;
if (!tool) { logger.error(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0,6)}) not found.`); return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: Tool '${toolName}' is not available.` }; }
let parsedLlmArgs: Record<string, any> = {};
try { parsedLlmArgs = JSON.parse(toolCall.function.arguments || "{}"); logger.info(`${logPrefix} Executing tool '${toolName}' (ID: ${callId.substring(0,6)}) with raw LLM Args: ${JSON.stringify(parsedLlmArgs).substring(0,100)}`); }
catch (parseError: any) { logger.error(`${logPrefix} Arg parse error for '${toolName}' (ID: ${callId.substring(0,6)}): ${parseError.message}. Raw: ${toolCall.function.arguments}`); return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: Invalid JSON arguments for '${toolName}'.` }; }
const validatedAndFilteredArgs: Record<string, any> = {};
const toolSchemaProperties = tool.argsSchema.properties;
const toolSchemaRequired = tool.argsSchema.required || [];
for (const expectedArgName in toolSchemaProperties) {
if (parsedLlmArgs.hasOwnProperty(expectedArgName)) { validatedAndFilteredArgs[expectedArgName] = parsedLlmArgs[expectedArgName]; }
else if (toolSchemaRequired.includes(expectedArgName)) { logger.warn(`${logPrefix} Planner missed required arg '${expectedArgName}' for tool '${toolName}'. Tool may fail or use default.`); }
}
for (const receivedArgName in parsedLlmArgs) { if (!toolSchemaProperties.hasOwnProperty(receivedArgName)) { logger.warn(`${logPrefix} Planner provided superfluous argument '${receivedArgName}' for tool '${toolName}'. Stripping it.`); } }
const abortController = new AbortController();
const timeoutDuration = (tool as any).timeoutMs || appConfig.toolTimeoutMs || DEFAULT_TOOL_TIMEOUT_MS;
const timeoutId = setTimeout(() => { logger.warn(`${logPrefix} Timeout (${timeoutDuration}ms) for '${toolName}' (ID: ${callId.substring(0,6)})`); abortController.abort(); }, timeoutDuration);
try {
let finalToolInputArgs = { ...validatedAndFilteredArgs };
if (tool.name === "InternalTaskTool" && !finalToolInputArgs.action && parsedLlmArgs.action) {
  logger.warn(`${logPrefix} Propagating 'action' from raw LLM args for InternalTaskTool: '${parsedLlmArgs.action}'`);
  finalToolInputArgs.action = parsedLlmArgs.action;
}
if (tool.name === "InternalTaskTool" && !finalToolInputArgs.action) {
  const criticalErrorMsg = `Critical: 'action' argument is still missing for InternalTaskTool (ID: ${callId.substring(0,6)}) after attempting propagation. Original LLM Args: ${JSON.stringify(parsedLlmArgs).substring(0,100)}`;
  logger.error(criticalErrorMsg);
  throw new Error(criticalErrorMsg);
}
const toolInput: ToolInput = { ...finalToolInputArgs, userId, lang: apiContext?.lang || userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0], sessionId: apiContext?.sessionId, context: { ...(apiContext || {}), locale: userState?.preferred_locale || appConfig.defaultLocale, countryCode: userState?.country_code || apiContext?.countryCode || null, userState, runId: apiContext?.runId, latitude: userState?.latitude ?? apiContext?.latitude, longitude: userState?.longitude ?? apiContext?.longitude, timezone: userState?.timezone ?? apiContext?.timezone, abortSignal: abortController.signal, userName: await this.getUserFirstName(userId), }, };
    const output: ToolOutput = await tool.execute(toolInput, abortController.signal);
    clearTimeout(timeoutId);
    logger.info(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0,6)}) finished. Success: ${!output.error}`);
    if (!output.error && output.structuredData) {
      structuredDataMap.set(callId, output.structuredData);
    } else {
      structuredDataMap.set(callId, null);
    }
    const resultString = output.error ? `Error from ${toolName}: ${String(output.error)}` : String(output.result || `${toolName} completed.`).substring(0, 4000); 
    return { role: "tool" as const, tool_call_id: callId, name: toolName, content: resultString };
  } catch (error: any) { 
    clearTimeout(timeoutId); 
    const isAbort = error.name === 'AbortError' || abortController.signal.aborted; 
    const errorMsg = isAbort ? `Tool '${toolName}' timed out.` : `Tool '${toolName}' error: ${String(error?.message || error)}`; 
    logger.error(`${logPrefix} Tool '${toolName}' (ID: ${callId.substring(0,6)}) ${isAbort ? "TIMEOUT" : "EXCEPTION"}: ${String(error?.message || error)}`); 
    structuredDataMap.set(callId, null); 
    return { role: "tool" as const, tool_call_id: callId, name: toolName, content: `Error: ${errorMsg}` }; 
  }
});
const settledResults = await Promise.allSettled(executionPromises);
let lastSuccessfulStructuredData: AnyToolStructuredData | null = null;
for (let i = 0; i < settledResults.length; i++) {
    const result = settledResults[i]; const originalCallId = toolCallsFromResponsesApi[i].id;
    if (result.status === "fulfilled" && result.value) { toolResultsMessages.push(result.value as ChatMessage); if (!result.value.content.startsWith("Error:") && structuredDataMap.has(originalCallId)) { const data = structuredDataMap.get(originalCallId); if (data) lastSuccessfulStructuredData = data; } }
    else if (result.status === "rejected") { logger.error(`${logPrefix} Unexpected parallel exec error for tool call ID ${originalCallId}:`, result.reason); toolResultsMessages.push({ role: "tool", tool_call_id: originalCallId, name: toolCallsFromResponsesApi[i].function.name, content: `Error: Internal error executing tool.` } as ChatMessage); }
}
return { messages: toolResultsMessages, lastStructuredData: lastSuccessfulStructuredData, llmUsage: null };

}
public async runOrchestration( userId: string, userInput: string | ChatMessageContentPart[], history: ChatMessage[] = [], apiContext?: Record<string, any> ): Promise<OrchestratorResponse> {
const overallStartTime = Date.now();
const runId = apiContext?.sessionId || apiContext?.runId || `${SESSION_ID_PREFIX}${randomUUID()}`;
const turnIdentifier = `OrchRun User:${userId.substring(0,8)} Run:${runId.substring(0,6)}`;
logger.info(`--- ${turnIdentifier} Starting Orchestration Run (Planner-First, Max 3 Tools/Turn, Strategic Memory) ---`);
let initialQueryTextForLog: string | null = typeof userInput === 'string' ? userInput : ((userInput.find(p => p.type === 'text') as ChatMessageContentPartText | undefined)?.text || "[Multimodal Input]");
let logEntryId: number | null = await this.logInteraction({ user_id: userId, session_id: apiContext?.sessionId || null, run_id: runId, user_query: initialQueryTextForLog, flow_type: 'pending' });
let finalStructuredResult: AnyToolStructuredData | null = null;
let finalResponseText: string | null = null;
let responseIntentType: string | null = "neutral";
let ttsInstructionsForFinalResponse: string | null = null;
let clarificationQuestionForUser: string | null = null;
let workflowFeedback: OrchestratorResponse['workflowFeedback'] = null;
let llmUsage_total: CompletionUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
let finalFlowType: DebugFlowType = "error";
let finalToolCallsLogged: any[] = [];
let finalResponseSource: string | null = "Error";
let isContinuationNeeded = false;
let continuationSummaryForUser: string | null = null;
let currentTurnToolResultsSummary: string | null = null;
let assistantContentForMemory: string | null = finalResponseText || null;
const userName = await this.getUserFirstName(userId);
const userState: UserState | null = await supabaseAdmin.getUserState(userId);
let lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en";
const effectiveApiContext = { ...(apiContext || {}), userName, lang, locale: userState?.preferred_locale || appConfig.defaultLocale, runId };
let personaNameForPrompt = "Minato";
let personaSpecificInstructions = "You are Minato, a helpful, friendly, and knowledgeable assistant.";
let personaId = userState?.active_persona_id || DEFAULT_PERSONA_ID;
try {
const persona = await this.memoryFramework.getPersonaById(personaId, userId);
if (persona?.system_prompt) {
personaSpecificInstructions = persona.system_prompt;
personaNameForPrompt = persona.name || personaId;
} else if (personaId !== DEFAULT_PERSONA_ID) {
logger.warn(`[${turnIdentifier}] Custom persona ID '${personaId}' provided but not found or has no system prompt. Using default behavior.`);
}
}
catch (e: any) { logger.error(`[${turnIdentifier}] Error fetching persona:`, e.message); }
try {
  const primaryQueryText = typeof userInput === 'string' ? userInput : ((userInput.find(p => p.type === 'text') as ChatMessageContentPartText | undefined)?.text || "[Visual Query]");
  let currentMessages: ChatMessage[] = [...history, { role: "user", content: userInput, name: userName, timestamp: Date.now() }];
  let existingWfState = this.workflowEngine.getActiveWorkflowState(runId);
  let plannerDecision: Awaited<ReturnType<WorkflowEngine['selectAndPlanWorkflow']>> | undefined;
  let workflowGoal: string | undefined = undefined;
  let batchExecutionResult: Awaited<ReturnType<WorkflowEngine['startOrContinueWorkflow']>> | null = null;

  if (existingWfState && existingWfState.status === "waiting_for_user") {
    logger.info(`[${turnIdentifier}] Resuming existing workflow for session ${runId}. Status: ${existingWfState.status}`);
    batchExecutionResult = await this.workflowEngine.startOrContinueWorkflow( runId, userId, primaryQueryText, history, userState, effectiveApiContext, null, existingWfState );
    if (batchExecutionResult) {
      const variables = batchExecutionResult.variables;
      if (variables && typeof variables === 'object') {
        const executedToolCalls = Object.keys(variables)
          .filter(key => variables[key] && typeof variables[key] === 'object' && 'toolName' in variables[key])
          .map(key => ({ toolName: (variables[key] as any).toolName, args: (variables[key] as any).toolArgs }));
        if (executedToolCalls.length > 0) {
          finalToolCallsLogged.push(...executedToolCalls);
        }
      }
    }
  } else {
    logger.info(`[${turnIdentifier}] Invoking LLM Planner for new/non-resumable interaction...`);
    plannerDecision = await this.workflowEngine.selectAndPlanWorkflow(primaryQueryText, userId, history, userName, userState);
    workflowGoal = plannerDecision.plan?.goal; 
    if(plannerDecision.llmUsage) { llmUsage_total.prompt_tokens += plannerDecision.llmUsage.prompt_tokens || 0; llmUsage_total.completion_tokens += plannerDecision.llmUsage.completion_tokens || 0; llmUsage_total.total_tokens += plannerDecision.llmUsage.total_tokens || 0;}
    finalToolCallsLogged = plannerDecision.plan?.steps.filter((s): s is import("@/lib/types/index").ToolCallStep => s.type === "tool_call").map(s => ({ toolName: s.toolName, args: s.toolArgs })) || [];

    if (plannerDecision.actionType === "error" || (plannerDecision.actionType === "generate_dynamic_workflow" && !plannerDecision.plan)) {
        finalFlowType = "error"; finalResponseSource = "Planner Error";
        finalResponseText = `I'm having a little trouble planning that out, ${userName}. Could you try rephrasing? ${plannerDecision.error || ""}`.trim();
        logger.error(`[${turnIdentifier}] Planner failed or returned invalid plan. ActionType: ${plannerDecision.actionType}, Plan: ${!!plannerDecision.plan}, Error: ${plannerDecision.error}`);
    } else if (plannerDecision.actionType === "request_clarification" && plannerDecision.clarificationQuestion) {
        finalFlowType = "clarification"; finalResponseSource = "Planner Clarification";
        clarificationQuestionForUser = injectPromptVariables(plannerDecision.clarificationQuestion, { userName });
        logger.info(`[${turnIdentifier}] Planner requests clarification: ${clarificationQuestionForUser}`);
    } else if (plannerDecision.actionType === "no_workflow_needed") {
        finalFlowType = "direct_llm"; finalResponseSource = "LLM (No Tools Planned)";
        logger.info(`[${turnIdentifier}] Planner: No tools needed.`);
    } else if (plannerDecision.actionType === "generate_dynamic_workflow" && plannerDecision.plan) {
      const plan = plannerDecision.plan;
      finalFlowType = "workflow";
      finalResponseSource = `Workflow: ${plan.goal.substring(0,30)}...`;
      logger.info(`[${turnIdentifier}] Planner returned dynamic plan. Goal: "${plan.goal}". Steps: ${plan.steps.length}`);

      if (plan.steps.length > 0) {
        const workflowEngineInputState: WorkflowState = {
          sessionId: runId,
          currentStepIndex: 0,
          variables: {
            userInput: primaryQueryText,
            userId,
            userName,
            userState,
            originalGoal: plan.goal, 
            latestUserInputForStep: primaryQueryText
          },
          status: "running",
          dynamicPlan: plan,
          startTime: Date.now(),
          executedStepsHistory: [], 
          clarificationPending: null,
          isPartialPlan: (plan as DynamicWorkflowPlanWithPartial).is_partial_plan || false,
          continuationSummary: (plan as DynamicWorkflowPlanWithPartial).continuation_summary || null,
          fullPlanGoal: plan.goal, 
          error: null,
          activeWorkflowId: null, 
        };
        logger.debug(`[${turnIdentifier}] Calling startOrContinueWorkflow with NEWLY CONSTRUCTED initial state for runId ${runId}. Plan Goal: ${plan.goal}`);

        batchExecutionResult = await this.workflowEngine.startOrContinueWorkflow(
          runId,
          userId,
          primaryQueryText,
          currentMessages.slice(0,-1),
          userState,
          { ...effectiveApiContext },
          plan, 
          workflowEngineInputState 
        );
      } else {
        logger.info(`[${turnIdentifier}] Planner: Dynamic plan with no steps. Treating as 'no_workflow_needed'.`);
        finalFlowType = "direct_llm";
        finalResponseSource = "LLM (No Tools)";
      }
    }
  }

  if (batchExecutionResult) {
    if (batchExecutionResult.llmUsage) { llmUsage_total.prompt_tokens += batchExecutionResult.llmUsage.prompt_tokens || 0; llmUsage_total.completion_tokens += batchExecutionResult.llmUsage.completion_tokens || 0; llmUsage_total.total_tokens += batchExecutionResult.llmUsage.total_tokens || 0; }
    finalStructuredResult = batchExecutionResult.structuredData || finalStructuredResult;
    workflowFeedback = batchExecutionResult.workflowFeedback;
    currentTurnToolResultsSummary = Object.entries(batchExecutionResult.variables || {}).filter(([key, value]) => value && typeof value === 'object' && 'result' in value && !key.startsWith("_workflowFeedback")).map(([key, value]) => `${String((value as ToolOutput).result || "Completed.")} (From step: ${key})`).join("\n") || "Minato performed some actions based on the plan."; 

    if (batchExecutionResult.error) {
        finalFlowType = "error";
        finalResponseSource = `Workflow Error: ${workflowFeedback?.workflowName || "Task"}`;
        const toolError = batchExecutionResult.error;
        if (toolError && toolError.includes("GeolocationTool") && toolError.includes("Private IP detected")) {
            finalResponseText = `Minato tried to find your location, ${userName}, but it seems you're on a private network (like Wi-Fi at home or work), so I can't get a precise public location. If you need location-specific help, could you provide a city or address?`;
        } else {
            finalResponseText = batchExecutionResult.responseText || `An error occurred during the task, ${userName}. ${toolError}`;
        }
        logger.error(`[${turnIdentifier}] Workflow batch execution error: ${batchExecutionResult.error}`);
    } else if (batchExecutionResult.clarificationQuestion) {
        finalFlowType = "clarification";
        finalResponseSource = `Workflow Clarification: ${workflowFeedback?.workflowName || "Task"}`;
        clarificationQuestionForUser = injectPromptVariables(batchExecutionResult.clarificationQuestion, { userName });
    } else { 
        isContinuationNeeded = batchExecutionResult.isPartialPlan || false;
        continuationSummaryForUser = batchExecutionResult.continuationSummary || null;
        finalFlowType = "workflow";
        logger.info(`[${turnIdentifier}] Batch complete. Continuation Summary: "${continuationSummaryForUser}" Partial: ${isContinuationNeeded}`);
        if (!isContinuationNeeded && batchExecutionResult.isComplete) {
             finalResponseText = batchExecutionResult.responseText || `Minato has completed the task: ${workflowGoal || String(currentMessages.slice(-1)[0]?.content) || "your request"}.`;
        }
    }
  }


  let retrievedMemoryContext = "INTERNAL CONTEXT - TARGETED RELEVANT MEMORIES: None found or not applicable for this turn.";
  if (finalFlowType !== "clarification" && finalFlowType !== "error") {
    const entitiesForMemorySearch: string[] = []; if (primaryQueryText && primaryQueryText !== "[Visual Query]") entitiesForMemorySearch.push(primaryQueryText.substring(0,70));
    if (finalStructuredResult) { if ('place' in finalStructuredResult && (finalStructuredResult as any).place?.displayName) { entitiesForMemorySearch.push((finalStructuredResult as any).place.displayName); } else if ('weather' in finalStructuredResult && (finalStructuredResult as any).weather?.locationName) { entitiesForMemorySearch.push((finalStructuredResult as any).weather.locationName); } }
    if (entitiesForMemorySearch.length > 0) {
        logger.info(`[${turnIdentifier}] Performing targeted memory search based on: ${entitiesForMemorySearch.join(" | ").substring(0,100)}...`);
        const personaContextForMemory = { traits: (userState as any)?.active_persona_traits, preferredTools: (userState as any)?.active_persona_preferredTools, avoidTools: (userState as any)?.active_persona_avoidTools, style: (userState as any)?.active_persona_style, tone: (userState as any)?.active_persona_tone };
        const memoryResults = await this.memoryFramework.search_memory(entitiesForMemorySearch.join(" "), userId, { limit: 2, offset: 0 }, runId, { enableHybridSearch: true, enableGraphSearch: false, enableConflictResolution: true }, personaContextForMemory);
        if (memoryResults.results.length > 0) { retrievedMemoryContext = `INTERNAL CONTEXT - TARGETED RELEVANT MEMORIES (Use these to add helpful related context for ${userName}):\n${memoryResults.results.map(r => `- ${r.content.substring(0,150)}... (Score: ${r.final_score?.toFixed(2)})`).join("\n")}`; }
    } else { logger.debug(`[${turnIdentifier}] Skipping targeted memory search: no strong entities.`); }
  }

  if (!clarificationQuestionForUser && finalFlowType !== "error" && !(batchExecutionResult?.isComplete && batchExecutionResult?.responseText)) {
    const toolResultsSummaryForPrompt = currentTurnToolResultsSummary || (finalToolCallsLogged && finalToolCallsLogged.length > 0 ? `Minato performed action(s) related to: ${finalToolCallsLogged.map(t=>t.toolName).join(', ')}.` : "No specific tools were used by Minato this turn, but I've considered your request.");
    const continuationSummaryForPrompt = (isContinuationNeeded && continuationSummaryForUser) ? continuationSummaryForUser : "This task is complete.";

    const systemInstructionsForSynthesis = injectPromptVariables(RESPONSE_SYNTHESIS_PROMPT_TEMPLATE, { userName, personaName: personaNameForPrompt, personaInstructions: personaSpecificInstructions, language: lang, available_tools_summary: "Tools were handled by the planner.", retrieved_memory_context: retrievedMemoryContext, tool_results_summary: toolResultsSummaryForPrompt, original_query: primaryQueryText, continuation_summary_for_synthesis: continuationSummaryForPrompt });
    logger.info(`[${turnIdentifier}] Synthesizing final response (Model: ${appConfig.openai.chatModel}). Partial: ${isContinuationNeeded}`);
    const synthesisResult = await generateResponseWithIntent(systemInstructionsForSynthesis, `User ${userName} asked: "${primaryQueryText}". Actions taken. Memory context available. Continuation: "${continuationSummaryForPrompt}". Formulate Minato's response.`, currentMessages, appConfig.openai.chatModel, appConfig.openai.maxTokens, userId );
    if ("error" in synthesisResult) { finalResponseText = `I've processed your request, ${userName}, but I'm having a bit of trouble wording my reply. ${synthesisResult.error.substring(0,100)}`; responseIntentType = "apologetic"; logger.error(`[${turnIdentifier}] Synthesis LLM failed: ${synthesisResult.error}`); }
    else { finalResponseText = synthesisResult.responseText; responseIntentType = synthesisResult.intentType; }
    const synthesisUsage = (synthesisResult as any).usage as OpenAI.CompletionUsage | undefined;
    if (synthesisUsage) { llmUsage_total.prompt_tokens += synthesisUsage.prompt_tokens || 0; llmUsage_total.completion_tokens += synthesisUsage.completion_tokens || 0; llmUsage_total.total_tokens += synthesisUsage.total_tokens || 0; }
    ttsInstructionsForFinalResponse = getDynamicInstructions(responseIntentType);
  } else if (batchExecutionResult?.isComplete && batchExecutionResult?.responseText) {
    finalResponseText = batchExecutionResult.responseText;
    responseIntentType = batchExecutionResult.intentType || "neutral";
    ttsInstructionsForFinalResponse = batchExecutionResult.ttsInstructions || getDynamicInstructions(responseIntentType);
  }


  const userMemoryMsgForAdd: MemoryFrameworkMessage | null = userInput ? { role: 'user', content: typeof userInput === 'string' ? userInput : JSON.stringify(userInput), name: userName } : null;
  const finalAssistantMemoryMsg: MemoryFrameworkMessage | null = assistantContentForMemory ? { role: 'assistant', content: assistantContentForMemory, name: "Minato" } : null;
  const finalTurnForMemory: MemoryFrameworkMessage[] = [userMemoryMsgForAdd, finalAssistantMemoryMsg].filter((m): m is MemoryFrameworkMessage => m !== null);
  if (finalTurnForMemory.length > 0) { this.memoryFramework.add_memory(finalTurnForMemory, userId, runId, null).then(success => logger.info(`[${turnIdentifier}] Async memory add OK: ${success}.`)).catch(e => logger.error(`[${turnIdentifier}] Async memory add FAIL:`, e.message)); }
  const orchestrationMs = Date.now() - overallStartTime;
  finalResponseText = finalResponseText ? injectPromptVariables(finalResponseText, { userName }) : null;
  clarificationQuestionForUser = clarificationQuestionForUser ? injectPromptVariables(clarificationQuestionForUser, { userName }) : null;
  let finalWorkflowFeedback = workflowFeedback;
  if (!finalWorkflowFeedback) {
      if (finalFlowType === 'error') finalWorkflowFeedback = { status: 'failed', currentStepDescription: finalResponseText || "An error occurred."};
      else if (clarificationQuestionForUser) finalWorkflowFeedback = { status: 'waiting_for_user', currentStepDescription: "Minato needs more information."};
      else finalWorkflowFeedback = { status: 'completed', workflowName: workflowGoal || existingWfState?.dynamicPlan?.goal, currentStepDescription: "Task complete."};
  }
  const debugInfoInternal: OrchestratorResponse['debugInfo'] = { flow_type: finalFlowType, llmModelUsed: appConfig.openai.chatModel, llmUsage: llmUsage_total, workflowPlannerModelUsed: String(DYNAMIC_WORKFLOW_DESIGN_MODEL), latencyMs: orchestrationMs, toolCalls: finalToolCallsLogged };
  logger.info(`--- ${turnIdentifier} Orchestration complete (${orchestrationMs}ms). Flow: ${finalFlowType}. Continuation: ${isContinuationNeeded} ---`);
  if (logEntryId) this.logInteraction({ user_id: userId, latency_ms: orchestrationMs, flow_type: finalFlowType, tool_calls: finalToolCallsLogged, final_response_source: finalResponseSource, error_message: finalFlowType === 'error' ? (finalResponseText || "Processing error") : null, workflow_triggered_id: finalWorkflowFeedback?.workflowName, metadata: { intent: responseIntentType, llmUsage: llmUsage_total } }, true, logEntryId).catch(e => logger.error("Log update error:", e));
  return { sessionId: runId, response: finalResponseText, intentType: responseIntentType, ttsInstructions: ttsInstructionsForFinalResponse, clarificationQuestion: clarificationQuestionForUser, error: finalFlowType === 'error' ? (finalResponseText || "Processing error") : null, lang: lang, structuredData: finalStructuredResult, workflowFeedback: finalWorkflowFeedback, debugInfo: debugInfoInternal, audioUrl: null, transcription: apiContext?.transcription || null, llmUsage: llmUsage_total, };
} catch (error: any) {
  const duration = Date.now() - overallStartTime;
  const errorMessageString = String(error?.message || error || "Orchestration process failed unexpectedly.");
  logger.error(`--- ${turnIdentifier} Orchestration FAILED (${duration}ms):`, errorMessageString, error.stack);
  let errorMsg = errorMessageString; if (error.cause) errorMsg = `${errorMsg} (Cause: ${String(error.cause)})`;
  finalFlowType = 'error'; finalResponseSource = "Orchestration Exception";
  if (userId) { const errorMemText = `Minato error for ${userName}: ${errorMsg}`.substring(0,350); this.memoryFramework.add_memory([], userId, runId, errorMemText).catch(memErr => logger.error(`[${turnIdentifier}] Failed logging orch error to memory:`, memErr)); if (logEntryId) this.logInteraction({ user_id: userId, latency_ms: duration, flow_type: 'error', error_message: errorMsg.substring(0,500) }, true, logEntryId).catch(e => logger.error("Log update error:", e)); else this.logInteraction({ user_id: userId, session_id: apiContext?.sessionId || null, run_id: runId, user_query: initialQueryTextForLog, flow_type: 'error', latency_ms: duration, error_message: errorMsg.substring(0,500) }).catch(e => logger.error("Initial error log insert fail:", e));}
  const userNameForError = userName || DEFAULT_USER_NAME; responseIntentType = "apologetic";
  return { sessionId: runId, response: `I apologize, ${userNameForError}. I encountered an internal error. Minato is looking into it.`, error: errorMsg, lang: lang, audioUrl: null, intentType: responseIntentType, ttsInstructions: getDynamicInstructions(responseIntentType), debugInfo: { flow_type: 'error', llmUsage: llmUsage_total, latencyMs: duration }, workflowFeedback, clarificationQuestion: undefined, structuredData: null, transcription: apiContext?.transcription || null, llmUsage: llmUsage_total, };
}
}
async processTextMessage(userId: string, text: string | null, history: ChatMessage[] = [], sessionId?: string, apiContext?: Record<string, any>): Promise<OrchestratorResponse> {
const userState = await supabaseAdmin.getUserState(userId);
const lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en";
const effectiveSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;
const userName = await this.getUserFirstName(userId);
const effectiveApiContext = { ...apiContext, sessionId: effectiveSessionId, locale: userState?.preferred_locale || appConfig.defaultLocale, lang, userName };
const inputText = text ?? "";
const result = await this.runOrchestration(userId, inputText, history, effectiveApiContext);
return { ...result, sessionId: effectiveSessionId, lang: result.lang || lang };
}
async processVisionMessage(userId: string, textPrompt: string, media: Array<{ mimeType: string; data: string }>, history: ChatMessage[] = [], sessionId?: string, apiContext?: Record<string, any>): Promise<OrchestratorResponse> {
const visionIsEnabled = appConfig.openai.enableVision === true;
const effectiveSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;
if (!visionIsEnabled) { return { sessionId: effectiveSessionId, error: "Vision processing is disabled.", debugInfo: { flow_type: 'error' }, llmUsage: null, clarificationQuestion: null, structuredData: null, response: null, intentType: "error", ttsInstructions: null, lang: apiContext?.lang || "en", workflowFeedback: null, audioUrl: null, transcription: null }; }
const visionInputContentParts: ChatMessageContentPart[] = [];
if (textPrompt && textPrompt.trim()) { visionInputContentParts.push({ type: "input_text" as any, text: Security.sanitizeText(textPrompt).trim() }); }
const imageContentParts: ChatMessageContentPart[] = media.filter(item => item.mimeType?.startsWith("image/") && (appConfig.openai as any).allowedImageTypes.includes(item.mimeType) && item.data).map(item => ({
  type: "input_image",
  image_url: `data:${item.mimeType};base64,${item.data}`,
  detail: appConfig.openai.visionDetail as "auto" | "low" | "high"
}));
if (imageContentParts.length === 0 && visionInputContentParts.length === 0) { return { sessionId: effectiveSessionId, error: "No valid images or text provided for vision analysis.", debugInfo: { flow_type: 'error' }, llmUsage: null, clarificationQuestion: null, structuredData: null, response: null, intentType: "error", ttsInstructions: null, lang: apiContext?.lang || "en", workflowFeedback: null, audioUrl: null, transcription: null };}
const fullVisionInput: ChatMessageContentPart[] = [...visionInputContentParts, ...imageContentParts];
const userState = await supabaseAdmin.getUserState(userId);
const lang = apiContext?.lang || userState?.preferred_locale?.split("-")[0] || "en";
const userName = await this.getUserFirstName(userId);
const effectiveApiContext = { ...apiContext, sessionId: effectiveSessionId, locale: userState?.preferred_locale || appConfig.defaultLocale, lang, userName };
const result = await this.runOrchestration(userId, fullVisionInput, history, effectiveApiContext);
return { ...result, sessionId: effectiveSessionId, lang: result.lang || lang, debugInfo: { ...(result.debugInfo || {}), visionModelUsed: appConfig.openai.visionModel }};
}
async processAudioMessage(userId: string, audioSignedUrl: string, history: ChatMessage[] = [], sessionId?: string, apiContext?: Record<string, any>): Promise<OrchestratorResponse> {
const currentSessionId = sessionId || `${SESSION_ID_PREFIX}${randomUUID()}`;
const startTime = Date.now();
const turnIdentifier = `Req[Audio] User:${userId.substring(0,8)} Sess:${currentSessionId.substring(0,6)}`;
let transcribedText: string | null = null;
let detectedLang: string | null = null;
let audioFetchDuration: number | undefined, sttDuration: number | undefined, ttsDuration: number | undefined;
let orchResult: OrchestratorResponse | null = null;
let logEntryId: number | null = await this.logInteraction({ user_id: userId, session_id: currentSessionId, run_id: currentSessionId, flow_type: 'pending' });
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
if (logEntryId) this.logInteraction({ user_id: userId, user_query: transcribedText }, true, logEntryId).catch(e => logger.error("Log update fail:", e));
const userState = await supabaseAdmin.getUserState(userId);
const lang = detectedLang || apiContext?.lang || userState?.preferred_locale?.split("-")[0] || "en";
const userName = await this.getUserFirstName(userId);
const effectiveApiContext = { ...apiContext, sessionId: currentSessionId, runId: currentSessionId, locale: userState?.preferred_locale || appConfig.defaultLocale, lang, detectedLanguage: detectedLang, userName, transcription: transcribedText };
orchResult = await this.runOrchestration(userId, transcribedText, history, effectiveApiContext);
if (orchResult && orchResult.error && !orchResult.clarificationQuestion) {
        logger.error(`--- ${turnIdentifier} Orchestration returned error: ${orchResult.error}`);
        throw new Error(orchResult.error);
    }

    if (orchResult && orchResult.clarificationQuestion) {
        const duration = Date.now() - startTime; const debugInfoForClarification: OrchestratorResponse['debugInfo'] = { ...(orchResult.debugInfo || {}), latencyMs: duration, audioFetchMs: audioFetchDuration, sttMs: sttDuration, sttModelUsed: appConfig.openai.sttModel, flow_type: 'clarification' };
        if (logEntryId && orchResult) this.logInteraction({ user_id: userId, latency_ms: duration, flow_type: 'clarification', error_message: null, metadata: { intent: orchResult.intentType, llmUsage: orchResult.llmUsage }, final_response_source: "Workflow Clarification" }, true, logEntryId).catch(e => logger.error("Log update fail:", e));
        let ttsUrlForClarification: string | null = null;
        if (orchResult.clarificationQuestion) {
            let voiceForClarification = (userState?.chainedvoice as OpenAITtsVoice) || appConfig.openai.ttsDefaultVoice;
            const ttsClarStart = Date.now();
            const ttsClarResult = await this.ttsService.generateAndStoreSpeech(
                orchResult.clarificationQuestion, userId, voiceForClarification,
                getDynamicInstructions("clarification")
            );
            ttsDuration = (ttsDuration || 0) + (Date.now() - ttsClarStart);
            if (ttsClarResult.url) ttsUrlForClarification = ttsClarResult.url;
            else logger.error(`--- ${turnIdentifier} TTS for clarification failed: ${ttsClarResult.error}.`);
        }
        return { sessionId: currentSessionId, clarificationQuestion: orchResult.clarificationQuestion, transcription: transcribedText, lang, workflowFeedback: orchResult.workflowFeedback, debugInfo: debugInfoForClarification, response: orchResult.response, intentType: orchResult.intentType, ttsInstructions: orchResult.ttsInstructions, error: null, audioUrl: ttsUrlForClarification, structuredData: orchResult.structuredData, llmUsage: orchResult.llmUsage };
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
        const ttsStart = Date.now(); const ttsResult = await this.ttsService.generateAndStoreSpeech(orchResult.response, userId, selectedVoice as OpenAITtsVoice, orchResult.ttsInstructions); ttsDuration = Date.now() - ttsStart;
        if (ttsResult.url) ttsUrl = ttsResult.url; else logger.error(`--- ${turnIdentifier} TTS failed: ${ttsResult.error}.`);
        if(orchResult) orchResult.audioUrl = ttsUrl;
    }
    supabaseAdmin.updateState(userId, { last_interaction_at: new Date().toISOString(), preferred_locale: effectiveApiContext.locale }).catch((err: any) => logger.error(`Err state update:`, err));
    supabaseAdmin.incrementStreak(userId, "daily_voice").catch((err:any) => logger.error(`Err streak:`, err));
    const duration = Date.now() - startTime; logger.info(`--- ${turnIdentifier} AUDIO complete (${duration}ms).`);
    const finalFlowTypeResolved: DebugFlowType = orchResult.debugInfo?.flow_type || (orchResult.workflowFeedback ? 'workflow' : (orchResult.structuredData?.source_api === 'internal_memory' ? 'single_tool' : 'direct_llm'));
    if (logEntryId && orchResult) this.logInteraction({ user_id: userId, latency_ms: duration, flow_type: finalFlowTypeResolved, error_message: orchResult.error, metadata: { intent: orchResult.intentType, ttsUrl, llmUsage: orchResult.llmUsage }, final_response_source: orchResult.debugInfo?.cacheSourceApi || "LLM/Workflow" }, true, logEntryId).catch(e => logger.error("Log update fail:", e));
    const finalDebugInfo: OrchestratorResponse['debugInfo'] = { ...(orchResult.debugInfo || {}), audioFetchMs: audioFetchDuration, sttMs: sttDuration, ttsMs: ttsDuration, sttModelUsed: appConfig.openai.sttModel, ttsModelUsed: ttsUrl ? appConfig.openai.ttsModel : null, latencyMs: duration, flow_type: finalFlowTypeResolved };
    return { sessionId: currentSessionId, response: orchResult.response, intentType: orchResult.intentType, ttsInstructions: orchResult.ttsInstructions, clarificationQuestion: orchResult.clarificationQuestion, error: orchResult.error, lang, transcription: transcribedText, audioUrl: orchResult.audioUrl, structuredData: orchResult.structuredData, workflowFeedback: orchResult.workflowFeedback, debugInfo: finalDebugInfo, llmUsage: orchResult.llmUsage };
} catch (error: any) {
  const duration = Date.now() - startTime;
  const errorMessageString = String(error?.message || error || "Orchestration process failed unexpectedly.");
  logger.error(`--- ${turnIdentifier} Error (${duration}ms): ${errorMessageString}`, error.stack);
  const userNameForError = apiContext?.userName || DEFAULT_USER_NAME;
  const userFacingError = errorMessageString.startsWith("I'm having a little trouble planning")
        ? errorMessageString 
        : (errorMessageString.startsWith("Parallel tool error:")) 
        ? errorMessageString
        : (errorMessageString.includes("GeolocationTool") && errorMessageString.includes("Private IP detected")) // Check for specific GeolocationTool error
        ? `Minato tried to find your location, ${userNameForError}, but it seems you're on a private network (like Wi-Fi at home or work), so I can't get a precise public location. If you need location-specific help, could you provide a city or address?`
        : `Failed processing audio for ${userNameForError}.`;


    const errorMsgForLog = `Audio processing failed for ${userNameForError}: ${errorMessageString}`.substring(0,350);
    if (userId) {
        this.memoryFramework.add_memory([], userId, currentSessionId, errorMsgForLog).catch(memErr => logger.error(`--- ${turnIdentifier} Failed logging orch error to memory:`, memErr));
        if (logEntryId) this.logInteraction({ user_id: userId, latency_ms: duration, flow_type: 'error', error_message: errorMessageString.substring(0,500) }, true, logEntryId).catch(e => logger.error("Log update error:", e));
        else this.logInteraction({ user_id: userId, session_id: currentSessionId, run_id: currentSessionId, user_query: transcribedText || "[Audio Input]", flow_type: 'error', latency_ms: duration, error_message: errorMessageString.substring(0,500) }).catch(e => logger.error("Initial error log insert fail:", e));
    }
    const responseIntentTypeOnError = "error";
    const debugInfoOnError: OrchestratorResponse['debugInfo'] = { ...(orchResult ? orchResult.debugInfo : {}), latencyMs: duration, audioFetchMs: audioFetchDuration, sttMs: sttDuration, ttsMs: ttsDuration, sttModelUsed: appConfig.openai.sttModel, flow_type: 'error' };

    let errorTtsUrl: string | null = null;
    try {
        const userState = await supabaseAdmin.getUserState(userId);
        const errorTtsResult = await this.ttsService.generateAndStoreSpeech(
            userFacingError, userId,
            (userState?.chainedvoice as OpenAITtsVoice) || appConfig.openai.ttsDefaultVoice,
            getDynamicInstructions(responseIntentTypeOnError)
        );
        if (errorTtsResult.url) errorTtsUrl = errorTtsResult.url;
    } catch (ttsErrorException: any) { logger.error(`--- ${turnIdentifier} Failed to generate TTS for error message:`, ttsErrorException.message); }

    return {
        sessionId: currentSessionId, error: userFacingError, transcription: transcribedText,
        lang: detectedLang || apiContext?.lang || "en",
        workflowFeedback: orchResult ? orchResult.workflowFeedback : null,
        debugInfo: debugInfoOnError, intentType: responseIntentTypeOnError,
        ttsInstructions: getDynamicInstructions(responseIntentTypeOnError),
        response: null, audioUrl: errorTtsUrl, structuredData: null,
        clarificationQuestion: null, llmUsage: orchResult ? orchResult.llmUsage : null
    };
}
}
public getWorkflowEngine(): WorkflowEngine {
return this.workflowEngine;
}
}
declare module "../../memory-framework/core/CompanionCoreMemory" {
interface CompanionCoreMemory {
add_memory_extracted(conversationTurn: MemoryFrameworkMessage[], userId: string, runId: string | null, toolSummary: string | null, extractedInfo: ExtractedInfo | null): Promise<boolean>;
getPersonaById(personaId: string, userId: string): Promise<PredefinedPersona | UserPersona | null>;
getDueReminders(dueBefore: string, userId?: string | null, limit?: number): Promise<StoredMemoryUnit[] | null>;
updateReminderStatus(memoryId: string, status: ReminderDetails["status"], errorMessage?: string | null): Promise<boolean>;
}
}
(global as any).sanitizeToolParameterSchemaForOpenAI = (schema: Record<string, any>): Record<string, any> => {
if (!schema || typeof schema !== 'object' || schema.type !== 'object') {
return { type: "object", properties: {}, additionalProperties: false };
}
const newSchema: any = {
    type: "object",
    properties: {},
    additionalProperties: false
};

if (schema.properties && typeof schema.properties === 'object') {
    const currentRequired: string[] = []; 
    for (const propKey in schema.properties) {
        if (Object.prototype.hasOwnProperty.call(schema.properties, propKey)) {
            const prop = JSON.parse(JSON.stringify(schema.properties[propKey])); 

            delete prop.const; delete prop.default;
            
            if (Array.isArray(prop.type) && prop.type.length === 1 && prop.type[0] === "null") {
                prop.type = ["string", "null"]; 
            }

            if (prop.type === "object" || (Array.isArray(prop.type) && prop.type.includes("object"))) {
                if (prop.properties) {
                    const nestedSchemaDef = {
                        type: "object",
                        properties: prop.properties,
                        required: prop.required, 
                        additionalProperties: prop.additionalProperties === undefined ? false : prop.additionalProperties,
                    };
                    const sanitizedNested = (global as any).sanitizeToolParameterSchemaForOpenAI(nestedSchemaDef as any); 
                    prop.properties = sanitizedNested.properties || {};
                    prop.required = sanitizedNested.required;
                    prop.additionalProperties = sanitizedNested.additionalProperties;
                } else {
                    prop.properties = {};
                }
            } else if (prop.type === "array" || (Array.isArray(prop.type) && prop.type.includes("array"))) {
                if (prop.items && typeof prop.items === 'object') {
                    prop.items = (global as any).sanitizeToolParameterSchemaForOpenAI(prop.items);
                } else if (!prop.items) {
                    prop.items = { type: "string" };
                }
            }
            newSchema.properties[propKey] = prop;
            currentRequired.push(propKey);
        }
    }
    const existingProps = Object.keys(newSchema.properties);
    newSchema.required = currentRequired.filter(rKey => existingProps.includes(rKey));
    if (newSchema.required.length === 0) {
        delete newSchema.required;
    }
}
return newSchema;
};