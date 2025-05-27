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
resolveToolNameWithLLM,
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
// --- In-memory Tool Execution Log (DEV/DEBUG ONLY) ---
// This log is NOT persistent and is for development/debugging only.
const TOOL_EXECUTION_LOG_MAX = 500;
const toolExecutionLog: Array<{
  timestamp: number;
  toolName: string;
  aliasUsed?: string;
  arguments: Record<string, any>;
  result?: any;
  error?: any;
  userId?: string;
  structuredData?: any;
  success: boolean;
}> = [];

/**
 * Add a tool execution entry to the in-memory log (circular buffer, dev only)
 */
function logToolExecution(entry: {
  toolName: string;
  aliasUsed?: string;
  arguments: Record<string, any>;
  result?: any;
  error?: any;
  userId?: string;
  structuredData?: any;
  success: boolean;
}) {
  if (toolExecutionLog.length >= TOOL_EXECUTION_LOG_MAX) toolExecutionLog.shift();
  toolExecutionLog.push({ ...entry, timestamp: Date.now() });
}

/**
 * Get tool execution history (dev only, not persistent)
 */
export function getToolExecutionHistory({ limit = 20, offset = 0, toolName, userId, success }: { limit?: number; offset?: number; toolName?: string; userId?: string; success?: boolean }) {
  let filtered = toolExecutionLog;
  if (toolName) filtered = filtered.filter(e => e.toolName === toolName);
  if (userId) filtered = filtered.filter(e => e.userId === userId);
  if (typeof success === 'boolean') filtered = filtered.filter(e => e.success === success);
  return {
    total: filtered.length,
    entries: filtered.slice(Math.max(0, filtered.length - offset - limit), filtered.length - offset).reverse(),
  };
}

// --- Per-user/session tool call count tracking (in-memory, not persistent) ---
const toolCallCounts: { [userId: string]: { [toolName: string]: number } } = {};
// --- Per-user, per-tool rate limit tracking (timestamps of calls) ---
const toolCallTimestamps: { [userId: string]: { [toolName: string]: number[] } } = {};

export class Orchestrator {
  private ttsService = new TTSService();
  private sttService = new STTService();
  private videoAnalysisService = new VideoAnalysisService();
  private toolRegistry: { [key: string]: BaseTool };
  private memoryFramework: CompanionCoreMemory;
  private availableToolsForRouter: SdkResponsesApiTool[] = [];
  private toolNameResolutionCache: Map<string, string> = new Map();
  constructor() {
    logger.info(`[Orch] Initializing Orchestrator (Planning: ${PLANNING_MODEL_NAME_ORCH}, Chat/Vision: ${CHAT_VISION_MODEL_NAME_ORCH}, Max ${(appConfig.openai.maxToolsPerTurn || 3)} Tools/Turn)...`);
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
    currentTurnUserInput: string, // ADDED: Explicit user input for the current turn
    toolCallsFromRouter: ToolRouterPlanStep[],
    apiContext: Record<string, any>,
    userState: UserState | null,
    history: ChatMessage[]
  ): Promise<{ messages: ChatMessage[]; lastSuccessfulStructuredData: AnyToolStructuredData | null; llmUsage: null; toolResultsSummary: string; clarificationQuestion?: string | null; clarificationDetails?: any }> {
    const logPrefix = `ToolExecutor User:${userId.substring(0, 8)} Sess:${apiContext?.sessionId?.substring(0, 6)}`;
    const toolResultsMessages: ChatMessage[] = [];
    const structuredDataMap: Map<string, AnyToolStructuredData | null> = new Map();
    let toolResultsSummaryParts: string[] = [];
    let clarificationQuestion: string | null = null;
    let clarificationDetails: any = null;
    const now = Date.now();
    const MS_PER_MINUTE = 60 * 1000;
    const MS_PER_HOUR = 60 * MS_PER_MINUTE;
    const MS_PER_DAY = 24 * MS_PER_HOUR;
    // --- Per-user/session tool call count logic ---
    if (!toolCallCounts[userId]) toolCallCounts[userId] = {};
    const executionPromises = toolCallsFromRouter
    .map(async (routedToolCall) => {
        const toolNameFromRouter = routedToolCall.tool_name;
        const callId = `toolcall_${randomUUID()}`;
        // Always resolve the tool name to the canonical tool instance
        const tool = resolveToolName(toolNameFromRouter);
        if (!tool) {
          logger.warn(`${logPrefix} Tool '${toolNameFromRouter}' could not be resolved to a registered tool. Skipping.`);
          toolResultsSummaryParts.push(`Error: Tool '${toolNameFromRouter}' is not available or recognized.`);
          return {
            role: "tool" as const,
            tool_call_id: callId,
            name: toolNameFromRouter,
            content: `Error: Tool '${toolNameFromRouter}' is not available or recognized by Minato.`,
          };
        }
        const canonicalToolName = tool.name;
        // PATCH/FALLBACK LOGIC FOR MISSING REQUIRED ARGUMENTS (e.g., 'query')
        let actualToolArgs = JSON.parse(JSON.stringify(routedToolCall.arguments || {}));
        // Move userInputForFallback up so it's always available
        // Use the new currentTurnUserInput as the primary source
        let userInputForFallback = currentTurnUserInput;
        if (!userInputForFallback) {
          // Try to extract from history if currentTurnUserInput was somehow empty
          const lastUserMsg = Array.isArray(history) ? history.slice().reverse().find(m => m.role === 'user' && m.content && (typeof m.content === 'string' || (Array.isArray(m.content) && m.content.some(p => p.type === 'text')))) : null;
          if (lastUserMsg) {
            if (typeof lastUserMsg.content === 'string') {
              userInputForFallback = lastUserMsg.content.trim();
            } else if (Array.isArray(lastUserMsg.content)) {
              const textPart = lastUserMsg.content.find(p => p.type === 'text') as ChatMessageContentPartText | undefined;
              userInputForFallback = textPart?.text.trim() || '';
            }
          } else {
            userInputForFallback = '';
          }
        }
        // As a last resort, try to use routedToolCall.reason if it contains the user query
        if (!userInputForFallback && typeof routedToolCall.reason === 'string' && routedToolCall.reason.trim()) {
          userInputForFallback = routedToolCall.reason;
        }
        // Or try to use a string from routedToolCall.arguments if any
        if (!userInputForFallback && routedToolCall.arguments) {
          const argString = Object.values(routedToolCall.arguments).find(v => typeof v === 'string' && v.trim());
          if (argString) userInputForFallback = argString;
        }
        // --- BEGIN: NewsAggregatorTool-specific fallback for required arguments ---
        if (canonicalToolName === "NewsAggregatorTool") {
          // Category-to-sources mapping for both prompt and post-processing
          const defaultCategorySources: Record<string, string[]> = {
            business: ["bloomberg", "business-insider", "financial-post", "fortune", "the-wall-street-journal", "cnbc", "forbes", "axios"],
            entertainment: ["entertainment-weekly", "buzzfeed", "the-lad-bible", "mashable", "mtv-news", "the-verge", "variety", "hollywood-reporter"],
            general: ["bbc-news", "cnn", "reuters", "the-new-york-times", "the-washington-post", "google-news", "abc-news", "cbs-news", "nbc-news", "usa-today", "al-jazeera-english", "the-guardian-uk", "independent", "associated-press"],
            health: ["medical-news-today", "national-geographic", "time", "stat-news", "who-int"],
            science: ["national-geographic", "new-scientist", "wired", "nature", "discover-magazine", "scientific-american"],
            sports: ["espn", "bbc-sport", "marca", "four-four-two", "nfl-news", "nhl-news", "fox-sports", "bleacher-report", "talksport"],
            technology: ["techcrunch", "wired", "engadget", "ars-technica", "the-verge", "techradar", "mit-technology-review"]
          };
          const availableSources = [
            "bbc-news", "cnn", "reuters", "the-new-york-times", "the-washington-post", "google-news", "abc-news", "cbs-news", "nbc-news", "usa-today", "al-jazeera-english", "the-guardian-uk", "independent", "bloomberg", "business-insider", "financial-post", "fortune", "the-wall-street-journal", "cnbc", "forbes", "axios", "entertainment-weekly", "buzzfeed", "the-lad-bible", "mashable", "mtv-news", "the-verge", "variety", "hollywood-reporter", "medical-news-today", "national-geographic", "time", "stat-news", "who-int", "new-scientist", "wired", "nature", "discover-magazine", "scientific-american", "espn", "bleacher-report", "fox-sports", "bbc-sport", "talksport", "four-four-two", "nfl-news", "nhl-news", "marca", "techcrunch", "engadget", "ars-technica", "techradar", "mit-technology-review", "associated-press"
          ];
          const availableCategories = ["general", "business", "entertainment", "health", "science", "sports", "technology"];

          function categorizeQuery(query?: string): string {
            if (!query) return "general";
            const q = query.toLowerCase();
            if (q.match(/\b(apple|google|microsoft|samsung|amazon|facebook|meta|ibm|intel|nvidia|amd|qualcomm|cisco|oracle|sap|salesforce|tesla|spacex|openai|alphagoog)\b/i)) return "technology";
            if (q.match(/\b(iphone|android|pixel|galaxy|windows|macos|linux|playstation|xbox|nintendo|vr|ar|ai|ml|llm|robotics|cybersecurity|cloud|aws|azure|gcp|saas|paas|iaas|devops|agile|bitcoin|ethereum|crypto|blockchain|nft|metaverse|quantum)\b/i)) return "technology";
            if (q.match(/\b(stock|market|finance|business|company|corporate|earnings|ipo|merger|acquisition|investment|economy|gdp|inflation|recession|trade|bank|bloomberg|forbes|fortune|cnbc|wsj|ft|revenue|profit|loss|share|bond|currency|nasdaq|dow|s&p|wall street|financial|entrepreneur|startup|venture capital|private equity)\b/i)) return "business";
            if (q.match(/\b(film|movie|tv|show|series|actor|actress|celebrity|entertainment|music|album|song|concert|band|singer|artist|grammy|oscar|emmy|tony|theater|theatre|hollywood|bollywood|netflix|hulu|disneyplus|hbo|amazon prime video|festival|art|dance|comedy|stand-up|podcast|youtube|tiktok|instagram|influencer)\b/i)) return "entertainment";
            if (q.match(/\b(health|medicine|medical|doctor|physician|nurse|hospital|clinic|pharma|pharmaceutical|fda|cdc|nih|who|disease|virus|covid|pandemic|vaccine|cancer|diabetes|heart|mental health|wellness|nutrition|fitness|exercise|diet|therapy|psychology|research|study|clinical trial|epidemic|outbreak|public health)\b/i)) return "health";
            if (q.match(/\b(science|research|study|experiment|discovery|space|nasa|esa|astronomy|astrophysics|physics|chemistry|biology|genetics|evolution|environment|climate change|ecology|geology|oceanography|archaeology|paleontology|scientist|laboratory|nature|innovation|nobel prize|quantum computing|biotechnology|nanotechnology)\b/i)) return "science";
            if (q.match(/\b(sports|football|nfl|soccer|mls|premier league|la liga|serie a|bundesliga|champions league|fifa|world cup|basketball|nba|wnba|baseball|mlb|hockey|nhl|olympics|tennis|golf|cricket|rugby|formula 1|nascar|esports|gaming|athlete|team|player|coach|match|game|tournament|championship|league|score|mvp|record)\b/i)) return "sports";
            return "general";
          }

          let userQuery = (typeof routedToolCall.arguments?.query === 'string' && routedToolCall.arguments.query.trim())
            ? routedToolCall.arguments.query.trim()
            : (userInputForFallback || "");

          let llmExtraction: { keywords: string; sources: string; category: string } | null = null;
          actualToolArgs = JSON.parse(JSON.stringify(routedToolCall.arguments || {}));
          const cleanUserQueryForExtraction = (userInputForFallback || "").replace(/^use\s+newstool\s*/i, '').trim();
          logger.info(`[NewsAggregatorTool] LLM extraction input: "${cleanUserQueryForExtraction}"`);

          if (cleanUserQueryForExtraction && cleanUserQueryForExtraction.trim().length > 0) {
            const sportsSources = defaultCategorySources.sports;
            const categorySourceMapping = `
Category-to-Sources Mapping:
- sports: ${defaultCategorySources.sports.join(", ")}
- technology: ${defaultCategorySources.technology.join(", ")}
- business: ${defaultCategorySources.business.join(", ")}
- entertainment: ${defaultCategorySources.entertainment.join(", ")}
- health: ${defaultCategorySources.health.join(", ")}
- science: ${defaultCategorySources.science.join(", ")}
- general: ${defaultCategorySources.general.join(", ")}
`;
            const extractionPrompt =
`You are an expert news search query formulator.
Given the user query: "${cleanUserQueryForExtraction.replace(/"/g, '\"')}"

${categorySourceMapping}

Your tasks are, in order:
1. Determine the single best news category from this list: ${availableCategories.join(", ")}.
2. Based on the determined category AND the user query, extract the most essential search keywords. Be concise. If the query is conversational (e.g., "tell me news about X"), extract only "X".
3. Critically, based *primarily on the category you selected in step 1*, identify up to 3-5 most relevant news sources from the mapping above. For example, if the category is 'sports', you MUST pick only from the sports sources listed. Do NOT pick general sources like 'bbc-news', 'cnn', or 'reuters' for sports unless the query is about general sports news, not a specific athlete, team, or event.
   If unsure or if the query is very generic despite a category, you can use broad sources like 'google-news', or leave sources empty.

Respond in STRICT JSON format:
{
  "keywords": "string (concise search keywords, e.g., 'Apple iPhone 15' or 'global warming impact')",
  "sources": "string (comma-separated source IDs, e.g., 'espn,marca' or 'techcrunch,the-verge' or '')",
  "category": "string (one of: ${availableCategories.join(", ")})"
}

Focus on accuracy and relevance for news aggregation. Ensure keywords are clean and sources strongly match the determined category.
Example 1 Query: "use newstool what's the latest on the Tesla Cybertruck"
Example 1 JSON:
{
  "keywords": "Tesla Cybertruck",
  "sources": "techcrunch,the-verge,ars-technica",
  "category": "technology"
}
Example 2 Query: "latest news about Lionel Messi transfer rumors"
Example 2 JSON:
{
  "keywords": "Lionel Messi transfer",
  "sources": "espn,marca,bbc-sport",
  "category": "sports"
}`;
            try {
              const llmResult = await generateStructuredJson<{ keywords: string; sources: string; category: string } | { error: string }>(
                extractionPrompt,
                cleanUserQueryForExtraction,
                {
                  type: "object",
                  properties: {
                    keywords: { type: "string" },
                    sources: { type: "string" },
                    category: { type: "string", enum: [...availableCategories, ""] }
                  },
                  required: ["keywords", "sources", "category"],
                  additionalProperties: false
                },
                "minato_news_query_extraction_v1",
                [],
                (appConfig.openai.extractionModel || "gpt-4o-mini-2024-07-18"),
                userId
              );
              logger.info(`[NewsAggregatorTool] LLM extraction result: ${JSON.stringify(llmResult)}`);
              if (
                llmResult &&
                typeof llmResult === "object" &&
                !llmResult.hasOwnProperty("error") &&
                (llmResult as { keywords: string }).keywords &&
                typeof (llmResult as { keywords: string }).keywords === "string" &&
                (llmResult as { keywords: string }).keywords.trim() !== ""
              ) {
                llmExtraction = llmResult as { keywords: string; sources: string; category: string };
              }
            } catch (e) {
              logger.warn(`${logPrefix} LLM news query extraction failed: ${((e as any).message) || e}`);
            }
          }

          if (llmExtraction) {
            let cleanedKeywords = llmExtraction.keywords.trim();
            if (cleanedKeywords.split(" ").length > 10) {
              logger.warn(`[NewsAggregatorTool] LLM extracted long keywords: "${cleanedKeywords}". Using as is, but ideally prompt should make it more concise.`);
            }
            actualToolArgs.query = cleanedKeywords;
            if (llmExtraction.sources && typeof llmExtraction.sources === 'string' && llmExtraction.sources.trim()) {
              actualToolArgs.sources = llmExtraction.sources.trim();
            }
            if (llmExtraction.category && typeof llmExtraction.category === 'string' && llmExtraction.category.trim() && availableCategories.includes(llmExtraction.category.trim())) {
              actualToolArgs.category = llmExtraction.category.trim();
            } else if (!actualToolArgs.category && actualToolArgs.query) {
              actualToolArgs.category = categorizeQuery(actualToolArgs.query);
            }
            // --- Post-processing: If category is set and sources do not include any mapped sources, override ---
            const cat = actualToolArgs.category && defaultCategorySources[actualToolArgs.category] ? actualToolArgs.category : null;
            if (
              cat &&
              (!actualToolArgs.sources || !actualToolArgs.sources.split(',').some((src: string) => defaultCategorySources[cat].includes(src.trim())))
            ) {
              actualToolArgs.sources = defaultCategorySources[cat].join(',');
              logger.warn(`[NewsAggregatorTool] Overriding sources to category-specific: "${actualToolArgs.sources}" for category '${cat}'.`);
            }
            // Always normalize sources string after any LLM or fallback assignment
            if (actualToolArgs.sources && typeof actualToolArgs.sources === 'string') {
              actualToolArgs.sources = actualToolArgs.sources
                .split(',')
                .map((s: string) => s.trim())
                .filter(Boolean)
                .join(',');
            }
          }

          // Fallback if LLM extraction didn't populate args or if query is still missing/problematic
          if (!actualToolArgs.query || typeof actualToolArgs.query !== 'string' || actualToolArgs.query.trim() === "" || actualToolArgs.query.toLowerCase().startsWith("use newstool")) {
            if (userInputForFallback && typeof userInputForFallback === 'string' && userInputForFallback.trim()) {
              let cleanedFallbackQuery = userInputForFallback.replace(/^use\s+newstool\s*/i, '').trim();
              cleanedFallbackQuery = cleanedFallbackQuery.replace(/^(latest news about|news about|get news on|find news about|tell me about news for)\s+/i, '').trim();
              actualToolArgs.query = cleanedFallbackQuery || "general news";
              logger.warn(`[NewsAggregatorTool] Fallback to cleaned user input for query: "${actualToolArgs.query}"`);
            } else {
              actualToolArgs.query = "latest news";
            }
          }

          if (!actualToolArgs.category || !availableCategories.includes(actualToolArgs.category)) {
            actualToolArgs.category = categorizeQuery(actualToolArgs.query);
            logger.warn(`[NewsAggregatorTool] Fallback to categorized query for category: "${actualToolArgs.category}" based on query "${actualToolArgs.query}"`);
          }

          if ((!actualToolArgs.sources || actualToolArgs.sources.trim() === "" || actualToolArgs.sources.trim().toLowerCase() === "all") && actualToolArgs.query) {
            const defaultCategorySources = {
              business: ["bloomberg", "business-insider", "financial-post", "fortune", "the-wall-street-journal", "cnbc", "forbes", "axios"],
              entertainment: ["entertainment-weekly", "buzzfeed", "the-lad-bible", "mashable", "mtv-news", "the-verge", "variety", "hollywood-reporter"],
              general: ["bbc-news", "cnn", "reuters", "the-new-york-times", "the-washington-post", "google-news", "abc-news", "cbs-news", "nbc-news", "usa-today", "al-jazeera-english", "the-guardian-uk", "independent", "associated-press"],
              health: ["medical-news-today", "national-geographic", "time", "stat-news", "who-int"],
              science: ["national-geographic", "new-scientist", "wired", "nature", "discover-magazine", "scientific-american"],
              sports: ["espn", "bleacher-report", "fox-sports", "bbc-sport", "talksport", "four-four-two", "nfl-news", "nhl-news", "marca"],
              technology: ["techcrunch", "wired", "engadget", "ars-technica", "the-verge", "techradar", "mit-technology-review"]
            };
            const categoryForSources = actualToolArgs.category && availableCategories.includes(actualToolArgs.category) ? actualToolArgs.category : categorizeQuery(actualToolArgs.query);
            actualToolArgs.sources = defaultCategorySources[categoryForSources as keyof typeof defaultCategorySources].join(",");
            logger.warn(`[NewsAggregatorTool] Fallback to default sources for category '${categoryForSources}': "${actualToolArgs.sources}"`);
          }

          // Log the final NewsAggregatorTool arguments for debugging
          logger.info(`[NewsAggregatorTool] Final actualToolArgs: ${JSON.stringify(actualToolArgs)}`);
        }
        // --- END: NewsAggregatorTool-specific fallback for required arguments ---
        // --- BEGIN: SportsInfoTool-specific fallback for required arguments ---
        if (canonicalToolName === "SportsInfoTool") {
          // If either teamName or queryType is missing, try to infer using LLM or fallback
          const missingTeamName = !actualToolArgs.teamName || typeof actualToolArgs.teamName !== 'string' || actualToolArgs.teamName.trim() === "";
          const missingQueryType = !actualToolArgs.queryType || typeof actualToolArgs.queryType !== 'string' || actualToolArgs.queryType.trim() === "";
          if (missingTeamName || missingQueryType) {
            // --- BEGIN: ADVANCED CLEANING FOR SPORTS QUERIES ---
            let cleanedUserInputForFallback = userInputForFallback;
            if (typeof cleanedUserInputForFallback === 'string') {
              // Remove leading Minato references
              cleanedUserInputForFallback = cleanedUserInputForFallback.replace(/^(hey |ok |hi |hello )?minato[,:]?\s*/i, "");
              // Remove generic prefixes
              cleanedUserInputForFallback = cleanedUserInputForFallback.replace(/^(provides|provide|get|show|give|find|tell|who|what) (me )?(information|info|details)? ?(about|on)? ?/i, "");
              cleanedUserInputForFallback = cleanedUserInputForFallback.replace(/^(information|info|details) about /i, "");
              cleanedUserInputForFallback = cleanedUserInputForFallback.replace(/^about /i, "");
              // Remove trailing tool/implementation hints
              cleanedUserInputForFallback = cleanedUserInputForFallback.replace(/(using|with|via) (the)?sports(db)?( api|tool)?(\.|,)?\s*$/i, "");
              cleanedUserInputForFallback = cleanedUserInputForFallback.replace(/(using|with|via) [^.,;!?]+(\.|,)?\s*$/i, "");
              // Remove trailing polite words
              cleanedUserInputForFallback = cleanedUserInputForFallback.replace(/\b(please|thanks|thank you)[.!?, ]*$/i, "");
              cleanedUserInputForFallback = cleanedUserInputForFallback.trim();
            }
            // --- END: ADVANCED CLEANING ---
            // Try LLM extraction first
            try {
              const extractionPrompt = `You are an expert sports information assistant. Given the user query: "${cleanedUserInputForFallback.replace(/"/g, '\"')}"

Your tasks are:
1. Ignore any references to the tool, API, or the assistant's name (e.g., 'using TheSportsDB', 'with SportsInfoTool', 'minato', etc.).
2. Extract the most likely sports team name (e.g., "Arsenal", "Los Angeles Lakers", "Manchester United"). If the query is about a match between two teams (e.g., 'arsenal vs utd'), extract both team names as a string joined by ' vs ' (e.g., 'Arsenal vs Manchester United').
3. Determine the type of information requested: one of "next_game", "last_game", or "team_info". Use "team_info" if the user just wants general info, "next_game" for the next scheduled match, or "last_game" for the most recent result or score. If the query is about a match between two teams, prefer "last_game" or "next_game" as appropriate.

Respond in STRICT JSON format:
{
  "teamName": "string (the team name, or 'TeamA vs TeamB' if a match is referenced)",
  "queryType": "string (one of: 'next_game', 'last_game', 'team_info')"
}

Examples:
Query: "When is Arsenal's next match?"
JSON: { "teamName": "Arsenal", "queryType": "next_game" }
Query: "Tell me about the Lakers."
JSON: { "teamName": "Los Angeles Lakers", "queryType": "team_info" }
Query: "What was the last result for Manchester United?"
JSON: { "teamName": "Manchester United", "queryType": "last_game" }
Query: "minato giving the last score of arsenal vs utd"
JSON: { "teamName": "Arsenal vs Manchester United", "queryType": "last_game" }
Query: "give the next game of madrid"
JSON: { "teamName": "Real Madrid", "queryType": "next_game" }
`;
              const llmResult = await generateStructuredJson<{ teamName: string; queryType: string } | { error: string }>(
                extractionPrompt,
                cleanedUserInputForFallback,
                {
                  type: "object",
                  properties: {
                    teamName: { type: "string" },
                    queryType: { type: "string", enum: ["next_game", "last_game", "team_info"] }
                  },
                  required: ["teamName", "queryType"],
                  additionalProperties: false
                },
                "minato_sports_query_extraction_v1",
                [],
                (appConfig.openai.extractionModel || "gpt-4o-mini-2024-07-18"),
                userId
              );
              logger.info(`[SportsInfoTool] LLM extraction result: ${JSON.stringify(llmResult)}`);
              if (
                llmResult &&
                typeof llmResult === "object" &&
                !llmResult.hasOwnProperty("error") &&
                (llmResult as { teamName: string }).teamName &&
                typeof (llmResult as { teamName: string }).teamName === "string" &&
                (llmResult as { teamName: string }).teamName.trim() !== "" &&
                (llmResult as { queryType: string }).queryType &&
                typeof (llmResult as { queryType: string }).queryType === "string"
              ) {
                actualToolArgs.teamName = (llmResult as { teamName: string }).teamName.trim();
                actualToolArgs.queryType = (llmResult as { queryType: string }).queryType.trim();
              }
            } catch (e) {
              logger.warn(`${logPrefix} LLM sports query extraction failed: ${((e as any).message) || e}`);
            }
            // Fallback: If LLM failed, try regex or simple heuristics
            if (!actualToolArgs.teamName && cleanedUserInputForFallback) {
              // Try to extract a 'vs' match
              const vsMatch = cleanedUserInputForFallback.match(/([A-Za-z\s]+)\s+vs\.?\s*([A-Za-z\s]+)/i);
              if (vsMatch) {
                actualToolArgs.teamName = `${vsMatch[1].trim()} vs ${vsMatch[2].trim()}`;
              } else {
                // Try to extract a team name by looking for capitalized words or known team patterns
                const teamMatch = cleanedUserInputForFallback.match(/about ([A-Z][a-zA-Z\s]+)|for ([A-Z][a-zA-Z\s]+)|of ([A-Z][a-zA-Z\s]+)|([A-Z][a-zA-Z\s]+)'s|([A-Z][a-zA-Z\s]+)\s+(next|last|game|match|result|info)/i);
                if (teamMatch) {
                  actualToolArgs.teamName = (teamMatch[1] || teamMatch[2] || teamMatch[3] || teamMatch[4] || teamMatch[5] || "").trim();
                } else {
                  // As a last resort, use the whole input if it's short
                  if (cleanedUserInputForFallback.length < 40) actualToolArgs.teamName = cleanedUserInputForFallback.trim();
                }
              }
            }
            if (!actualToolArgs.queryType && cleanedUserInputForFallback) {
              if (/next/i.test(cleanedUserInputForFallback)) actualToolArgs.queryType = "next_game";
              else if (/last|previous|result|score/i.test(cleanedUserInputForFallback)) actualToolArgs.queryType = "last_game";
              else actualToolArgs.queryType = "team_info";
            }
          }
        }
        // --- END: SportsInfoTool-specific fallback for required arguments ---
        // --- BEGIN: RedditTool-specific fallback for required arguments ---
        if (canonicalToolName === "RedditTool") {
          // If subreddit is missing, try to infer using LLM or fallback
          const missingSubreddit = !actualToolArgs.subreddit || typeof actualToolArgs.subreddit !== 'string' || actualToolArgs.subreddit.trim() === "";
          if (missingSubreddit) {
            // --- BEGIN: ADVANCED CLEANING FOR REDDIT QUERIES ---
            let cleanedUserInputForReddit = userInputForFallback;
            if (typeof cleanedUserInputForReddit === 'string') {
              // Remove leading Minato references
              cleanedUserInputForReddit = cleanedUserInputForReddit.replace(/^(hey |ok |hi |hello )?minato[,:]?\s*/i, "");
              // Remove generic prefixes
              cleanedUserInputForReddit = cleanedUserInputForReddit.replace(/^(using|use|show|find|get|search|tell|give) (me )?(about|for|the|a|an)? ?/i, "");
              cleanedUserInputForReddit = cleanedUserInputForReddit.replace(/^(reddit|reddit tool|reddit api|reddit search|reddit posts|posts|subreddit|subreddits) (about|for|on)? ?/i, "");
              cleanedUserInputForReddit = cleanedUserInputForReddit.replace(/^about /i, "");
              // Remove trailing tool/implementation hints
              cleanedUserInputForReddit = cleanedUserInputForReddit.replace(/(using|with|via) (the)?reddit(api|tool)?( tool)?(\.|,)?\s*$/i, "");
              cleanedUserInputForReddit = cleanedUserInputForReddit.replace(/(using|with|via) [^.,;!?]+(\.|,)?\s*$/i, "");
              // Remove trailing polite words
              cleanedUserInputForReddit = cleanedUserInputForReddit.replace(/\b(please|thanks|thank you)[.!?, ]*$/i, "");
              cleanedUserInputForReddit = cleanedUserInputForReddit.trim();
            }
            // --- END: ADVANCED CLEANING ---
            // Try LLM extraction first
            try {
              const extractionPrompt = `You are an expert Reddit assistant. Given the user query: "${cleanedUserInputForReddit.replace(/"/g, '\"')}"

Your tasks are:
1. Ignore any references to the tool, API, or the assistant's name (e.g., 'using RedditTool', 'with Reddit API', 'minato', etc.).
2. Extract the most likely subreddit (e.g., 'technology', 'gadgets', 'ai', 'all', etc.). If the query is general or doesn't specify a subreddit, use 'all'.
3. If the user query is a search (e.g., 'find ai gadget'), extract the search keywords as 'query'.
4. Determine the filter: one of 'hot', 'new', 'top', or 'rising'. If not specified, use 'hot'.
5. If the filter is 'top', extract the time period if present (e.g., 'day', 'week', etc.), else use 'day'.
6. Set limit to 5 unless the user specifies otherwise.

Respond in STRICT JSON format:
{
  "subreddit": "string (the subreddit, e.g., 'technology', 'all', etc.)",
  "filter": "string (one of: 'hot', 'new', 'top', 'rising')",
  "time": "string|null (one of: 'hour', 'day', 'week', 'month', 'year', 'all', or null)",
  "limit": "number (1-10)"
}

Examples:
Query: "using reddit tool find ai gadget"
JSON: { "subreddit": "all", "filter": "hot", "time": null, "limit": 5 }
Query: "show me top posts from technology this week"
JSON: { "subreddit": "technology", "filter": "top", "time": "week", "limit": 5 }
Query: "find memes on reddit"
JSON: { "subreddit": "memes", "filter": "hot", "time": null, "limit": 5 }
`;
              const llmResult = await generateStructuredJson<{ subreddit: string; filter: string; time: string|null; limit: number } | { error: string }>(
                extractionPrompt,
                cleanedUserInputForReddit,
                {
                  type: "object",
                  properties: {
                    subreddit: { type: "string" },
                    filter: { type: "string", enum: ["hot", "new", "top", "rising"] },
                    time: { type: ["string", "null"], enum: ["hour", "day", "week", "month", "year", "all", null] },
                    limit: { type: "number", minimum: 1, maximum: 10 }
                  },
                  required: ["subreddit", "filter", "time", "limit"],
                  additionalProperties: false
                },
                "minato_reddit_query_extraction_v1",
                [],
                (appConfig.openai.extractionModel || "gpt-4o-mini-2024-07-18"),
                userId
              );
              logger.info(`[RedditTool] LLM extraction result: ${JSON.stringify(llmResult)}`);
              if (
                llmResult &&
                typeof llmResult === "object" &&
                !llmResult.hasOwnProperty("error") &&
                (llmResult as { subreddit: string }).subreddit &&
                typeof (llmResult as { subreddit: string }).subreddit === "string" &&
                (llmResult as { subreddit: string }).subreddit.trim() !== "" &&
                (llmResult as { filter: string }).filter &&
                typeof (llmResult as { filter: string }).filter === "string"
              ) {
                actualToolArgs.subreddit = (llmResult as { subreddit: string }).subreddit.trim();
                actualToolArgs.filter = (llmResult as { filter: string }).filter.trim();
                actualToolArgs.time = (llmResult as { time: string|null }).time;
                actualToolArgs.limit = (llmResult as { limit: number }).limit;
              }
            } catch (e) {
              logger.warn(`${logPrefix} LLM reddit query extraction failed: ${((e as any).message) || e}`);
            }
            // Fallback: If LLM failed, try regex or simple heuristics
            if (!actualToolArgs.subreddit && cleanedUserInputForReddit) {
              // Try to extract a subreddit by looking for r/subreddit or common subreddit names
              const subredditMatch = cleanedUserInputForReddit.match(/r\/(\w{3,21})/i);
              if (subredditMatch) {
                actualToolArgs.subreddit = subredditMatch[1];
              } else if (/meme/i.test(cleanedUserInputForReddit)) {
                actualToolArgs.subreddit = "memes";
              } else if (/ai|gadget|tech|robot|machine/i.test(cleanedUserInputForReddit)) {
                actualToolArgs.subreddit = "technology";
              } else {
                actualToolArgs.subreddit = "all";
              }
              // Fallback filter
              if (!actualToolArgs.filter) {
                if (/new/i.test(cleanedUserInputForReddit)) actualToolArgs.filter = "new";
                else if (/top/i.test(cleanedUserInputForReddit)) actualToolArgs.filter = "top";
                else if (/rising/i.test(cleanedUserInputForReddit)) actualToolArgs.filter = "rising";
                else actualToolArgs.filter = "hot";
              }
              // Fallback time
              if (!actualToolArgs.time && actualToolArgs.filter === "top") {
                if (/week/i.test(cleanedUserInputForReddit)) actualToolArgs.time = "week";
                else if (/month/i.test(cleanedUserInputForReddit)) actualToolArgs.time = "month";
                else if (/year/i.test(cleanedUserInputForReddit)) actualToolArgs.time = "year";
                else if (/all time|alltime|all/i.test(cleanedUserInputForReddit)) actualToolArgs.time = "all";
                else actualToolArgs.time = "day";
              } else if (!actualToolArgs.time) {
                actualToolArgs.time = null;
              }
              // Fallback limit
              if (!actualToolArgs.limit || typeof actualToolArgs.limit !== 'number') {
                actualToolArgs.limit = 5;
              }
            }
          }
        }
        // --- END: RedditTool-specific fallback for required arguments ---
        // --- BEGIN: PexelsSearchTool-specific fallback for required arguments ---
        if (canonicalToolName === "PexelsSearchTool") {
          const missingQuery = !actualToolArgs.query || typeof actualToolArgs.query !== 'string' || actualToolArgs.query.trim() === "";
          const missingLimit = actualToolArgs.limit === undefined || actualToolArgs.limit === null || isNaN(Number(actualToolArgs.limit));
          const missingOrientation = actualToolArgs.orientation === undefined;
          const missingSize = actualToolArgs.size === undefined;
          let cleanedUserInputForPexels = userInputForFallback;
          if (typeof cleanedUserInputForPexels === 'string') {
            cleanedUserInputForPexels = cleanedUserInputForPexels.replace(/^(hey |ok |hi |hello )?minato[,:]?\s*/i, "");
            cleanedUserInputForPexels = cleanedUserInputForPexels.replace(/^(use|using|show|find|get|search|tell|give|provide|suggest|recommend) (me )?(about|for|the|a|an)? ?/i, "");
            cleanedUserInputForPexels = cleanedUserInputForPexels.replace(/^(pexels|pexel|pexels tool|pexel tool|pexels api|pexel api|pexels search|pexel search|image|images|photo|photos|picture|pictures|media) (about|for|on)? ?/i, "");
            cleanedUserInputForPexels = cleanedUserInputForPexels.replace(/^about /i, "");
            cleanedUserInputForPexels = cleanedUserInputForPexels.replace(/(using|with|via) (the)?pexels(api|tool)?( tool)?(\.|,)?\s*$/i, "");
            cleanedUserInputForPexels = cleanedUserInputForPexels.replace(/(using|with|via) [^.,;!?]+(\.|,)?\s*$/i, "");
            cleanedUserInputForPexels = cleanedUserInputForPexels.replace(/\b(please|thanks|thank you)[.!?, ]*$/i, "");
            cleanedUserInputForPexels = cleanedUserInputForPexels.trim();
          }
          try {
            const extractionPrompt = `You are an expert image search assistant. Given the user query: "${cleanedUserInputForPexels.replace(/"/g, '\"')}"
        Your tasks are:
        1. Ignore any references to the tool, API, or the assistant's name (e.g., 'using PexelsTool', 'with Pexels API', 'minato', etc.).
        2. Extract the most likely search query for images (e.g., 'nature', 'cat', 'city skyline').
        3. If the user specifies a number of images, extract it as 'limit' (between 1 and 5). Otherwise, use 3.
        4. If the user specifies orientation (landscape, portrait, square), extract it. Otherwise, use null.
        5. If the user specifies size (large, medium, small), extract it. Otherwise, use null.
        Respond in STRICT JSON format:
        {
          "query": "string (the concise search query, required)",
          "limit": "number (1-5, default 3)",
          "orientation": "string|null (landscape, portrait, square, or null)",
          "size": "string|null (large, medium, small, or null)"
        }
        Examples:
        Query: "find 2 landscape images of cats on pexels"
        JSON: { "query": "cats", "limit": 2, "orientation": "landscape", "size": null }
        Query: "pexels tool show me a small portrait photo of a city skyline"
        JSON: { "query": "city skyline", "limit": 3, "orientation": "portrait", "size": "small" }
        Query: "get nature images"
        JSON: { "query": "nature", "limit": 3, "orientation": null, "size": null }
        `;
            const llmResult = await generateStructuredJson<{ query: string; limit: number; orientation: string|null; size: string|null } | { error: string }>(
              extractionPrompt,
              cleanedUserInputForPexels,
              {
                type: "object",
                properties: {
                  query: { type: "string" },
                  limit: { type: "number", minimum: 1, maximum: 5 },
                  orientation: { type: ["string", "null"], enum: ["landscape", "portrait", "square", null] },
                  size: { type: ["string", "null"], enum: ["large", "medium", "small", null] }
                },
                required: ["query", "limit", "orientation", "size"],
                additionalProperties: false
              },
              "minato_pexels_query_extraction_v1",
              [],
              (appConfig.openai.extractionModel || "gpt-4o-mini-2024-07-18"),
              userId
            );
            logger.info(`[PexelsSearchTool] LLM extraction result: ${JSON.stringify(llmResult)}`);
            if (
              llmResult &&
              typeof llmResult === "object" &&
              !llmResult.hasOwnProperty("error") &&
              (typeof (llmResult as { query: string }).query === "string") &&
              (typeof (llmResult as { limit: number }).limit === "number")
            ) {
              actualToolArgs.query = (llmResult as { query: string }).query.trim();
              actualToolArgs.limit = (llmResult as { limit: number }).limit;
              actualToolArgs.orientation = (llmResult as { orientation: string|null }).orientation;
              actualToolArgs.size = (llmResult as { size: string|null }).size;
            }
          } catch (e) {
            logger.warn(`${logPrefix} LLM pexels query extraction failed: ${((e as any).message) || e}`);
          }
          if ((actualToolArgs.query === undefined || actualToolArgs.query === null) && cleanedUserInputForPexels) {
            const limitMatch = cleanedUserInputForPexels.match(/(\d+)/);
            let limit = limitMatch ? Math.max(1, Math.min(parseInt(limitMatch[1], 10), 5)) : 3;
            actualToolArgs.limit = limit;
            let orientation: "landscape"|"portrait"|"square"|null = null;
            if (/landscape/i.test(cleanedUserInputForPexels)) orientation = "landscape";
            else if (/portrait/i.test(cleanedUserInputForPexels)) orientation = "portrait";
            else if (/square/i.test(cleanedUserInputForPexels)) orientation = "square";
            actualToolArgs.orientation = orientation;
            let size: "large"|"medium"|"small"|null = null;
            if (/large/i.test(cleanedUserInputForPexels)) size = "large";
            else if (/medium/i.test(cleanedUserInputForPexels)) size = "medium";
            else if (/small/i.test(cleanedUserInputForPexels)) size = "small";
            actualToolArgs.size = size;
            let query = cleanedUserInputForPexels.replace(/\b(\d+|landscape|portrait|square|large|medium|small)\b/gi, "").replace(/\s+/g, " ").trim();
            actualToolArgs.query = query || "nature";
          }
          if (actualToolArgs.limit === undefined || actualToolArgs.limit === null || isNaN(Number(actualToolArgs.limit))) actualToolArgs.limit = 3;
          if (actualToolArgs.orientation === undefined) actualToolArgs.orientation = null;
          if (actualToolArgs.size === undefined) actualToolArgs.size = null;
        }
        // --- END: PexelsSearchTool-specific fallback for required arguments ---




        // --- BEGIN: RecipeSearchTool-specific fallback for required arguments ---
        if (canonicalToolName === "RecipeSearchTool") {
          // If query is missing or noisy, try to infer using LLM or fallback
          const missingQuery = !actualToolArgs.query || typeof actualToolArgs.query !== 'string' || actualToolArgs.query.trim() === "";
          let cleanedUserInputForRecipe = userInputForFallback;
          if (typeof cleanedUserInputForRecipe === 'string') {
            // Remove leading Minato references
            cleanedUserInputForRecipe = cleanedUserInputForRecipe.replace(/^(hey |ok |hi |hello )?minato[,:]?\s*/i, "");
            // Remove generic prefixes
            cleanedUserInputForRecipe = cleanedUserInputForRecipe.replace(/^(use|using|show|find|get|search|tell|give|provide|suggest|recommend) (me )?(about|for|the|a|an)? ?/i, "");
            cleanedUserInputForRecipe = cleanedUserInputForRecipe.replace(/^(recipe|recipes|dish|dishes|meal|meals|food|cooking|cook|how to cook|how do i cook|how to make|how do i make) (about|for|on)? ?/i, "");
            cleanedUserInputForRecipe = cleanedUserInputForRecipe.replace(/^about /i, "");
            // Remove trailing tool/implementation hints
            cleanedUserInputForRecipe = cleanedUserInputForRecipe.replace(/(using|with|via) (the)?recipe(api|tool)?( tool)?(\.|,)?\s*$/i, "");
            cleanedUserInputForRecipe = cleanedUserInputForRecipe.replace(/(using|with|via) [^.,;!?]+(\.|,)?\s*$/i, "");
            // Remove trailing polite words
            cleanedUserInputForRecipe = cleanedUserInputForRecipe.replace(/\b(please|thanks|thank you)[.!?, ]*$/i, "");
            cleanedUserInputForRecipe = cleanedUserInputForRecipe.trim();
          }
          // Try LLM extraction first
          try {
            const extractionPrompt = `You are an expert recipe assistant. Given the user query: "${cleanedUserInputForRecipe.replace(/"/g, '\"')}"

Your tasks are:
1. Ignore any references to the tool, API, or the assistant's name (e.g., 'using RecipeTool', 'with Recipe API', 'minato', etc.).
2. If the user wants a random recipe (e.g., 'random recipe', 'give me any recipe', 'surprise me'), set "random" to true and leave "query" empty.
3. Otherwise, extract the most likely main ingredient, dish, or cuisine as a concise search query (e.g., 'pasta', 'chicken curry', 'carbonara').
4. If the query is too generic (e.g., just 'recipe', 'food', 'meal'), set "random" to true and leave "query" empty.

Respond in STRICT JSON format:
{
  "query": "string (the concise search query, or empty if random)",
  "random": "boolean (true if user wants a random recipe, false otherwise)"
}

Examples:
Query: "use recipe tool to give me a random recipe"
JSON: { "query": "", "random": true }
Query: "find a great recipe of pasta"
JSON: { "query": "pasta", "random": false }
Query: "how to cook a pasta sauce"
JSON: { "query": "pasta sauce", "random": false }
Query: "suggest a meal"
JSON: { "query": "", "random": true }
`;
            const llmResult = await generateStructuredJson<{ query: string; random: boolean } | { error: string }>(
              extractionPrompt,
              cleanedUserInputForRecipe,
              {
                type: "object",
                properties: {
                  query: { type: "string" },
                  random: { type: "boolean" }
                },
                required: ["query", "random"],
                additionalProperties: false
              },
              "minato_recipe_query_extraction_v1",
              [],
              (appConfig.openai.extractionModel || "gpt-4o-mini-2024-07-18"),
              userId
            );
            logger.info(`[RecipeSearchTool] LLM extraction result: ${JSON.stringify(llmResult)}`);
            if (
              llmResult &&
              typeof llmResult === "object" &&
              !llmResult.hasOwnProperty("error") &&
              (typeof (llmResult as { query: string }).query === "string") &&
              (typeof (llmResult as { random: boolean }).random === "boolean")
            ) {
              actualToolArgs.query = (llmResult as { query: string }).query.trim();
              actualToolArgs.random = (llmResult as { random: boolean }).random;
            }
          } catch (e) {
            logger.warn(`${logPrefix} LLM recipe query extraction failed: ${((e as any).message) || e}`);
          }
          // Fallback: If LLM failed, try regex or simple heuristics
          if ((actualToolArgs.query === undefined || actualToolArgs.query === null) && cleanedUserInputForRecipe) {
            // If user asks for random
            if (/random|any|surprise/i.test(cleanedUserInputForRecipe)) {
              actualToolArgs.query = "";
              actualToolArgs.random = true;
            } else {
              // Try to extract main ingredient or dish
              const match = cleanedUserInputForRecipe.match(/([a-zA-Z ]+)/);
              if (match && match[1]) {
                actualToolArgs.query = match[1].trim();
                actualToolArgs.random = false;
              } else {
                actualToolArgs.query = "";
                actualToolArgs.random = true;
              }
            }
          }
          // If query is too generic, treat as random
          if (actualToolArgs.query && /^(recipe|recipes|meal|meals|food|dishes|dish)$/i.test(actualToolArgs.query.trim())) {
            actualToolArgs.query = "";
            actualToolArgs.random = true;
          }
          // Always ensure query is a string and random is boolean
          if (typeof actualToolArgs.query !== "string") actualToolArgs.query = "";
          if (typeof actualToolArgs.random !== "boolean") actualToolArgs.random = false;
        }
        // --- END: RecipeSearchTool-specific fallback for required arguments ---
        // --- BEGIN: HackerNewsTool-specific fallback for required arguments ---
        if (canonicalToolName === "HackerNewsTool") {
          const missingQuery = !actualToolArgs.query || typeof actualToolArgs.query !== 'string' || actualToolArgs.query.trim() === "";
          const missingFilter = !actualToolArgs.filter || typeof actualToolArgs.filter !== 'string' || actualToolArgs.filter.trim() === "";
          let cleanedUserInputForHN = userInputForFallback;
          if (typeof cleanedUserInputForHN === 'string') {
            // Remove leading Minato references
            cleanedUserInputForHN = cleanedUserInputForHN.replace(/^(hey |ok |hi |hello )?minato[,:]?\s*/i, "");
            // Remove generic prefixes
            cleanedUserInputForHN = cleanedUserInputForHN.replace(/^(show|find|get|search|fetch|give|tell|list|display|use|using|with) (me )?(about|for|the|a|an)? ?/i, "");
            // Remove tool invocation phrases
            cleanedUserInputForHN = cleanedUserInputForHN.replace(/(use|using|with|via) (the )?(hacker ?news|hn)( tool| api)?(\.|,)?\s*/gi, "");
            cleanedUserInputForHN = cleanedUserInputForHN.replace(/(hacker ?news|hn)( tool| api)?(\.|,)?\s*/gi, "");
            // Remove generic story/news words
            cleanedUserInputForHN = cleanedUserInputForHN.replace(/^(stories|posts|news|items|results) (about|for|on)? ?/i, "");
            cleanedUserInputForHN = cleanedUserInputForHN.replace(/^about /i, "");
            // Remove trailing polite words
            cleanedUserInputForHN = cleanedUserInputForHN.replace(/\b(please|thanks|thank you)[.!?, ]*$/i, "");
            cleanedUserInputForHN = cleanedUserInputForHN.trim();
          }
          if (missingQuery && missingFilter && cleanedUserInputForHN) {
            // List of generic words/phrases and assistant names
            const genericWords = [
              "fetch", "show", "get", "find", "display", "list", "stories", "posts", "news", "items", "results", "hacker news", "hn", "illuminato", "minato", "please", "thanks", "thank you"
            ];
            let cleanedLower = cleanedUserInputForHN.toLowerCase().replace(/[.,!?]/g, " ");
            for (const word of genericWords) {
              cleanedLower = cleanedLower.replace(new RegExp(`\\b${word}\\b`, "gi"), " ");
            }
            cleanedLower = cleanedLower.replace(/\s+/g, " ").trim();
            const isGeneric = cleanedLower.length < 2;
            if (isGeneric) {
              actualToolArgs.filter = "top";
              actualToolArgs.query = null;
            } else {
              actualToolArgs.query = cleanedUserInputForHN;
              actualToolArgs.filter = null;
            }
          } else {
            if (missingQuery && !missingFilter) {
              actualToolArgs.query = null;
            }
            if (!missingQuery && missingFilter) {
              actualToolArgs.filter = null;
            }
            if (!missingQuery && typeof actualToolArgs.query === 'string' && /^(top|best|new|ask|show|job)$/i.test(actualToolArgs.query.trim())) {
              actualToolArgs.filter = actualToolArgs.query.trim().toLowerCase();
              actualToolArgs.query = null;
            }
          }
          // Always set sensible defaults for time and limit if missing
          if (!("time" in actualToolArgs) || actualToolArgs.time === undefined || actualToolArgs.time === null || (typeof actualToolArgs.time === 'string' && actualToolArgs.time.trim() === "")) {
            if (actualToolArgs.filter === "top") {
              actualToolArgs.time = "day";
            } else {
              actualToolArgs.time = null;
            }
          }
          if (actualToolArgs.limit === undefined || actualToolArgs.limit === null || isNaN(Number(actualToolArgs.limit))) {
            actualToolArgs.limit = 5;
          }
        }
        // --- END: HackerNewsTool-specific fallback for required arguments ---
        // --- BEGIN: EventFinderTool-specific fallback for required arguments ---
        if (canonicalToolName === "EventFinderTool") {
          let cleanedUserInputForEvents = userInputForFallback;
          if (typeof cleanedUserInputForEvents === 'string') {
            // Standard cleaning
            cleanedUserInputForEvents = cleanedUserInputForEvents.replace(/^(hey |ok |hi |hello )?minato[,:]?\\s*/i, "");
            cleanedUserInputForEvents = cleanedUserInputForEvents
              .replace(/\\b(use|using|with|via|for|the)\\s+(event\\s*)?(finder\\s*)?(tool|api)?\\b/gi, "")
              .replace(/\\b(find|get|show|search|look for|tell me about|what|when are|any)\\s+(events?|concerts?|shows?|games?|activities?|things? to do)?\\b/gi, "")
              .replace(/\\s+/g, " ")
              .trim();
          }
          logger.info(`[EventFinderTool] Cleaned user input for extraction: "${cleanedUserInputForEvents}"`);

          // Try LLM extraction for structured event parameters
          if (cleanedUserInputForEvents) {
            try {
              const extractionPrompt = `
You are an expert event query parser. Given the user query: "${cleanedUserInputForEvents.replace(/"/g, '\\"')}"
And the current date is ${new Date().toISOString().split('T')[0]}.

Your tasks are to extract the following information:
1.  **keyword**: The main subject of the event search (e.g., "concert", "Taylor Swift", "Yankees game", "music festival", "comedy show"). If no specific event type or artist is mentioned, this can be null.
2.  **city**: The city name for the event location (e.g., "London", "New York", "Paris").
3.  **countryCode**: The 2-letter ISO country code (e.g., "GB" for London, "US" for New York, "FR" for Paris). If a city is known, try to infer the country code.
4.  **postalCode**: If a postal code is mentioned (e.g., "90210").
5.  **relativeDateDescription**: A short description of a relative date query if present (e.g., "next month", "this weekend", "tomorrow", "December", "next Friday").
6.  **classificationName**: A general category if mentioned (e.g., "Music", "Sports", "Arts & Theatre", "Family").

Respond in STRICT JSON format:
{
  "keyword": "string | null",
  "city": "string | null",
  "countryCode": "string | null",
  "postalCode": "string | null",
  "relativeDateDescription": "string | null",
  "classificationName": "string | null"
}

Examples:
Query: "events in London next month"
JSON: { "keyword": null, "city": "London", "countryCode": "GB", "postalCode": null, "relativeDateDescription": "next month", "classificationName": null }

Query: "Taylor Swift concert in New York this weekend"
JSON: { "keyword": "Taylor Swift concert", "city": "New York", "countryCode": "US", "postalCode": null, "relativeDateDescription": "this weekend", "classificationName": "Music" }

Query: "baseball games in 90210 tomorrow"
JSON: { "keyword": "baseball games", "city": null, "countryCode": "US", "postalCode": "90210", "relativeDateDescription": "tomorrow", "classificationName": "Sports" }

Query: "what's on in Paris"
JSON: { "keyword": null, "city": "Paris", "countryCode": "FR", "postalCode": null, "relativeDateDescription": null, "classificationName": null }

Query: "find rock concerts" // No location or specific date
JSON: { "keyword": "rock concerts", "city": null, "countryCode": null, "postalCode": null, "relativeDateDescription": null, "classificationName": "Music" }

Query: "family events this sunday"
JSON: { "keyword": "family events", "city": null, "countryCode": null, "postalCode": null, "relativeDateDescription": "this sunday", "classificationName": "Family"}

Handle cases where information might be missing. The 'location' field in the tool arguments should be populated by 'city' or 'postalCode'.
If a city is mentioned but no country, try your best to infer countryCode (e.g. London -> GB, Paris -> FR, Berlin -> DE, Rome -> IT, Madrid -> ES, Tokyo -> JP, Sydney -> AU, Toronto -> CA).
If only a country is mentioned (e.g., "events in Canada"), set countryCode and city to null, keyword to "events".
If a specific date is mentioned (e.g., "July 4th events"), "relativeDateDescription" can be that date string.
`;
              type EventExtractionResult = {
                keyword: string | null;
                city: string | null;
                countryCode: string | null;
                postalCode: string | null;
                relativeDateDescription: string | null;
                classificationName: string | null;
              };

              const eventFinderSchemaObject = {
                type: "object" as const,
                properties: {
                  keyword: { type: ["string", "null"] as const },
                  city: { type: ["string", "null"] as const },
                  countryCode: { type: ["string", "null"] as const },
                  postalCode: { type: ["string", "null"] as const },
                  relativeDateDescription: { type: ["string", "null"] as const },
                  classificationName: { type: ["string", "null"] as const },
                },
                required: ["keyword", "city", "countryCode", "postalCode", "relativeDateDescription", "classificationName"],
                additionalProperties: false as false
              };

              const llmResult = await generateStructuredJson<EventExtractionResult | { error: string }>(
                extractionPrompt,
                cleanedUserInputForEvents, // This is the user's query for the tool.
                eventFinderSchemaObject, // Pass the schema object directly as the third argument
                "eventfinder_arg_extraction", // Use a valid format name (no spaces)
                [], // Fifth argument: history
                (appConfig.openai.extractionModel || "gpt-4o-mini-2024-07-18"), // Sixth argument: modelName
                userId // Seventh argument: userId
              );

              logger.info(`[EventFinderTool] LLM extraction result: ${JSON.stringify(llmResult)}`);

              if (llmResult && typeof llmResult === "object" && !llmResult.hasOwnProperty("error")) {
                const extracted = llmResult as EventExtractionResult;
                actualToolArgs.keyword = extracted.keyword; // Can be null
                
                // Populate location: prioritize city, then postalCode
                if (extracted.city) {
                    actualToolArgs.location = extracted.city;
                } else if (extracted.postalCode) {
                    actualToolArgs.location = extracted.postalCode;
                } else {
                    actualToolArgs.location = null; // Explicitly null if not extracted
                }

                // If location is still null, try to use user context from UserState or apiContext
                if (actualToolArgs.location === null) {
                    const userLat = userState?.latitude || apiContext?.latitude;
                    const userLon = userState?.longitude || apiContext?.longitude;
                    if (typeof userLat === 'number' && typeof userLon === 'number') {
                        actualToolArgs.location = `${userLat},${userLon}`;
                        logger.info(`[EventFinderTool] Using user context for location: ${actualToolArgs.location}`);
                    }
                }

                actualToolArgs.countryCode = extracted.countryCode; // Can be null
                actualToolArgs.classificationName = extracted.classificationName; // Can be null

                // Date parsing from relativeDateDescription
                if (extracted.relativeDateDescription) {
                  const now = new Date();
                  let startDate: Date | null = null;
                  let endDate: Date | null = null;
                  const desc = extracted.relativeDateDescription.toLowerCase();

                  // Helper function to get the next occurrence of a specific weekday
                  // dayOfWeek: 0 for Sunday, 1 for Monday, ..., 6 for Saturday
                  function getNextWeekday(date: Date, dayOfWeek: number): Date {
                      const resultDate = new Date(date.getTime());
                      const currentDay = date.getDay();
                      let daysToAdd = (dayOfWeek - currentDay + 7) % 7;
                      if (daysToAdd === 0) { // If it's the same day of week, advance to next week
                          daysToAdd = 7;
                      }
                      resultDate.setDate(date.getDate() + daysToAdd);
                      return resultDate;
                  }

                  if (desc.includes("today")) {
                    startDate = new Date(now);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(now);
                    endDate.setHours(23, 59, 59, 999);
                  } else if (desc.includes("tomorrow")) {
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() + 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate);
                    endDate.setHours(23, 59, 59, 999);
                  } else if (desc.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
                      const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
                      const dayMatch = desc.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
                      if (dayMatch && dayMatch[1]) {
                          const targetDayIndex = weekdays.indexOf(dayMatch[1]);
                          if (targetDayIndex !== -1) {
                              startDate = getNextWeekday(now, targetDayIndex);
                              startDate.setHours(0,0,0,0);
                              endDate = new Date(startDate);
                              endDate.setHours(23,59,59,999); // Event for that single day
                          }
                      }
                  } else if (desc.match(/in (\d+) day(s)?/)) {
                      const dayMatch = desc.match(/in (\d+) day(s)?/);
                      if (dayMatch && dayMatch[1]) {
                          const numDays = parseInt(dayMatch[1], 10);
                          startDate = new Date(now);
                          startDate.setDate(now.getDate() + numDays);
                          startDate.setHours(0, 0, 0, 0);
                          endDate = new Date(startDate);
                          endDate.setHours(23, 59, 59, 999);
                      }
                  } else if (desc.match(/in (\d+) week(s)?/)) {
                      const weekMatch = desc.match(/in (\d+) week(s)?/);
                      if (weekMatch && weekMatch[1]) {
                          const numWeeks = parseInt(weekMatch[1], 10);
                          startDate = new Date(now);
                          startDate.setDate(now.getDate() + numWeeks * 7);
                          startDate.setHours(0, 0, 0, 0);
                          endDate = new Date(startDate);
                          endDate.setDate(startDate.getDate() + 6); // Full week from that start date
                          endDate.setHours(23, 59, 59, 999);
                      }
                  } else if (desc.match(/in (\d+) month(s)?/)) {
                      const monthMatch = desc.match(/in (\d+) month(s)?/);
                      if (monthMatch && monthMatch[1]) {
                          const numMonths = parseInt(monthMatch[1], 10);
                          startDate = new Date(now.getFullYear(), now.getMonth() + numMonths, now.getDate());
                          startDate.setHours(0,0,0,0);
                          // For end date, go to the end of the month that startDate lands in.
                          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                          endDate.setHours(23,59,59,999);
                      }
                  } else if (desc.includes("this weekend")) {
                      startDate = new Date(now);
                      const currentDay = now.getDay(); // 0 (Sun) - 6 (Sat)
                      // Adjust startDate to the Friday of the current week.
                      // If today is Sunday (0), Friday was 2 days ago.
                      // If today is Monday (1), Friday is 4 days ahead.
                      // If today is Friday (5), Friday is today.
                      if (currentDay === 0) { // Sunday
                          startDate.setDate(now.getDate() - 2); 
                      } else {
                          startDate.setDate(now.getDate() + (5 - currentDay));
                      }
                      startDate.setHours(0, 0, 0, 0);
                      endDate = new Date(startDate);
                      endDate.setDate(startDate.getDate() + 2); // Friday, Saturday, Sunday
                      endDate.setHours(23, 59, 59, 999);
                  } else if (desc.includes("next weekend")) {
                      startDate = new Date(now);
                      // Find Monday of the current week
                      const currentDay = now.getDay();
                      const daysToCurrentMonday = (currentDay === 0) ? -6 : 1 - currentDay;
                      startDate.setDate(now.getDate() + daysToCurrentMonday);
                      // Monday of next week
                      startDate.setDate(startDate.getDate() + 7);
                      // Friday of next week
                      startDate.setDate(startDate.getDate() + 4);
                      startDate.setHours(0, 0, 0, 0);
                      endDate = new Date(startDate);
                      endDate.setDate(startDate.getDate() + 2); // Friday, Saturday, Sunday
                      endDate.setHours(23, 59, 59, 999);
                  } else if (desc.includes("this week")) {
                     startDate = new Date(now);
                     startDate.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1 ) ); // Go to Monday of current week
                     startDate.setHours(0,0,0,0);
                     endDate = new Date(startDate);
                     endDate.setDate(startDate.getDate() + 6); // Go to Sunday of current week
                     endDate.setHours(23,59,59,999);
                  } else if (desc.includes("next week")) {
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() + (1 - now.getDay() + 7) % 7); // Days to next Monday
                     if (startDate <= now) startDate.setDate(startDate.getDate() + 7); // ensure it's truly next week
                    startDate.setHours(0,0,0,0);
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + 6); // End of next week (Sunday)
                    endDate.setHours(23,59,59,999);
                  } else if (desc.includes("next month")) {
                    startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999); // Last day of next month
                  } else if (desc.includes("this month")) {
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // Last day of current month
                  } else if (desc.includes("this year")) {
                    startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st
                    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); // Dec 31st
                  } else if (desc.includes("next year")) {
                    startDate = new Date(now.getFullYear() + 1, 0, 1); // Jan 1st of next year
                    endDate = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999); // Dec 31st of next year
                  } else {
                    // Fallback for specific "Month Day" or just "Month" like "july", "december 25th"
                    const specificMonthDayMatch = desc.match(/(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{1,2})(?:st|nd|rd|th)?)?/i);
                    if (specificMonthDayMatch) {
                        const monthName = specificMonthDayMatch[1];
                        const dayOfMonthString = specificMonthDayMatch[2];
                        const monthIndex = new Date(Date.parse(monthName + " 1, 2000")).getMonth(); // Get month index

                        if (monthIndex >=0 && monthIndex <=11) {
                            let year = now.getFullYear();
                            const dayOfMonth = dayOfMonthString ? parseInt(dayOfMonthString, 10) : 1; // Default to 1st if day not specified

                            // If the month (or specific date) has passed this year, assume next year
                            const potentialTestDateForYear = new Date(year, monthIndex, dayOfMonthString ? dayOfMonth : (new Date(year, monthIndex + 1, 0).getDate()) ); // Use last day of month if day not specified, for year check
                            if (potentialTestDateForYear < now && (now.getMonth() > monthIndex || (now.getMonth() === monthIndex && now.getDate() > (dayOfMonthString ? dayOfMonth : 0 )))) {
                                year += 1;
                            }
                            
                            startDate = new Date(year, monthIndex, dayOfMonth, 0,0,0,0);
                            if (dayOfMonthString) { // Specific day was mentioned
                                endDate = new Date(year, monthIndex, dayOfMonth, 23,59,59,999);
                            } else { // Only month was mentioned, so full month
                                endDate = new Date(year, monthIndex + 1, 0, 23,59,59,999); // Last day of the specified month
                            }
                        }
                    }
                  }

                  if (startDate) actualToolArgs.startDate = startDate.toISOString();
                  if (endDate) actualToolArgs.endDate = endDate.toISOString();
                  logger.info(`[EventFinderTool] Parsed dates: startDate=${actualToolArgs.startDate}, endDate=${actualToolArgs.endDate} from "${desc}"`);
                }
              }
            } catch (e) {
              logger.warn(`${logPrefix} LLM event query extraction failed: ${((e as any).message) || e}. Proceeding with previous/default args.`);
              // Ensure core args are at least null if LLM fails badly
              actualToolArgs.keyword = actualToolArgs.keyword || null;
              actualToolArgs.location = actualToolArgs.location || null;
              actualToolArgs.countryCode = actualToolArgs.countryCode || null;
              actualToolArgs.classificationName = actualToolArgs.classificationName || null;
              actualToolArgs.startDate = actualToolArgs.startDate || null;
              actualToolArgs.endDate = actualToolArgs.endDate || null;
            }
          }
          
          // Default values for EventFinderTool if not set by LLM or previous logic
          if (actualToolArgs.radius === undefined || actualToolArgs.radius === null) {
            actualToolArgs.radius = 25;
          }
          if (!actualToolArgs.radiusUnit) {
            actualToolArgs.radiusUnit = "miles";
          }
          if (actualToolArgs.limit === undefined || actualToolArgs.limit === null) {
            actualToolArgs.limit = 5;
          }
          // For classificationName, countryCode, startDate, endDate, keyword, location: if LLM didn't provide, 
          // we let them be potentially undefined/null so the EventFinderTool's internal defaults can apply.
          // The tool itself requires these in its schema, but might have internal logic to handle their absence.
          // Or, if the tool strictly requires them, the validation step later will catch it if they are still missing.

          if (actualToolArgs.source === undefined || actualToolArgs.source === null) {
            actualToolArgs.source = "ticketmaster";
          }

          logger.info(`[EventFinderTool] Final actualToolArgs before validation: ${JSON.stringify(actualToolArgs)}`);
        } // Closing brace for if (canonicalToolName === "EventFinderTool")
        // --- END: EventFinderTool-specific fallback for required arguments ---

        // --- BEGIN: ReminderReaderTool-specific fallback for required arguments ---
        if (canonicalToolName === "ReminderReaderTool") {
          // All arguments are optional, but we can improve the experience with LLM extraction
          if (userInputForFallback && typeof userInputForFallback === 'string' && userInputForFallback.trim()) {
            // Clean the user input
            let cleanedUserInputForReminder = userInputForFallback;
            cleanedUserInputForReminder = cleanedUserInputForReminder.replace(/^(hey |ok |hi |hello )?minato[,:]?\s*/i, "");
            cleanedUserInputForReminder = cleanedUserInputForReminder.replace(/^(show|get|give|tell|list|check|read) (me )?(my |the )?(reminders?|todos?|tasks?)?\s*/i, "");
            cleanedUserInputForReminder = cleanedUserInputForReminder.replace(/^(what are|what's|whats) (my )?(reminders?|todos?|tasks?)?\s*/i, "");
            cleanedUserInputForReminder = cleanedUserInputForReminder.trim();
            
            try {
              const extractionPrompt = `You are an expert reminder query parser. Given the user query: "${cleanedUserInputForReminder.replace(/"/g, '\"')}"

Your tasks are:
1. Determine the action type: "get_pending" (default), "get_overdue", "get_today", or "get_all"
2. Extract the time range if specified (e.g., "next 3 days" → daysAhead: 3)
3. Extract the limit if specified (e.g., "show me 5 reminders" → limit: 5)

Common patterns:
- "my reminders" → action: "get_pending", daysAhead: 7
- "overdue reminders" → action: "get_overdue"
- "today's reminders" → action: "get_today"
- "reminders for next week" → action: "get_pending", daysAhead: 7
- "all my reminders" → action: "get_all", daysAhead: 30
- "next 3 reminders" → limit: 3

Respond in STRICT JSON format:
{
  "action": "get_pending | get_overdue | get_today | get_all",
  "daysAhead": "number (0-30)",
  "limit": "number (1-20)"
}`;

              const llmResult = await generateStructuredJson<{ action: string; daysAhead: number; limit: number } | { error: string }>(
                extractionPrompt,
                cleanedUserInputForReminder,
                {
                  type: "object",
                  properties: {
                    action: { type: "string", enum: ["get_pending", "get_overdue", "get_today", "get_all"] },
                    daysAhead: { type: "number", minimum: 0, maximum: 30 },
                    limit: { type: "number", minimum: 1, maximum: 20 }
                  },
                  required: ["action", "daysAhead", "limit"],
                  additionalProperties: false
                },
                "minato_reminder_reader_extraction_v1",
                [],
                (appConfig.openai.extractionModel || "gpt-4o-mini-2024-07-18"),
                userId
              );
              
              logger.info(`[ReminderReaderTool] LLM extraction result: ${JSON.stringify(llmResult)}`);
              
              if (llmResult && typeof llmResult === "object" && !llmResult.hasOwnProperty("error")) {
                actualToolArgs.action = (llmResult as { action: string }).action;
                actualToolArgs.daysAhead = (llmResult as { daysAhead: number }).daysAhead;
                actualToolArgs.limit = (llmResult as { limit: number }).limit;
              }
            } catch (e) {
              logger.warn(`${logPrefix} LLM reminder reader extraction failed: ${((e as any).message) || e}`);
            }
          }
          
          // Apply defaults if not set
          if (!actualToolArgs.action) actualToolArgs.action = "get_pending";
          if (actualToolArgs.daysAhead === undefined) actualToolArgs.daysAhead = 7;
          if (actualToolArgs.limit === undefined) actualToolArgs.limit = 10;
        }
        // --- END: ReminderReaderTool-specific fallback for required arguments ---

        // --- BEGIN: ReminderSetterTool-specific fallback for required arguments ---
        if (canonicalToolName === "ReminderSetterTool") {
          const missingContent = !actualToolArgs.content || typeof actualToolArgs.content !== 'string' || actualToolArgs.content.trim() === "";
          const missingTime = !actualToolArgs.trigger_datetime_description || typeof actualToolArgs.trigger_datetime_description !== 'string' || actualToolArgs.trigger_datetime_description.trim() === "";
          
          if ((missingContent || missingTime) && userInputForFallback && typeof userInputForFallback === 'string' && userInputForFallback.trim()) {
            // Clean the user input
            let cleanedUserInputForSetter = userInputForFallback;
            cleanedUserInputForSetter = cleanedUserInputForSetter.replace(/^(hey |ok |hi |hello )?minato[,:]?\s*/i, "");
            cleanedUserInputForSetter = cleanedUserInputForSetter.replace(/^(remind|set a reminder|create a reminder|add a reminder) (me )?(to |about |for )?\s*/i, "");
            cleanedUserInputForSetter = cleanedUserInputForSetter.trim();
            
            try {
              const extractionPrompt = `You are an expert reminder parsing assistant. Given the user request: "${cleanedUserInputForSetter.replace(/"/g, '\"')}"

Your tasks are:
1. Extract what the user wants to be reminded about (content)
2. Extract when they want to be reminded (trigger_datetime_description)
3. Determine if it's recurring (daily, weekly, monthly, yearly)
4. Categorize the reminder (task, habit, medication, appointment, goal)
5. Assign priority (low, medium, high)

Common patterns:
- "remind me to call mom tomorrow" → content: "call mom", trigger_datetime_description: "tomorrow"
- "remind me about the meeting at 3pm" → content: "meeting", trigger_datetime_description: "at 3pm"
- "remind me to take medication every morning at 8am" → content: "take medication", trigger_datetime_description: "tomorrow at 8am", recurrence: "daily"
- "exam tomorrow" → content: "exam", trigger_datetime_description: "tomorrow"
- "workout every day at 6pm" → content: "workout", trigger_datetime_description: "today at 6pm", recurrence: "daily", category: "habit"
- "doctor appointment next Monday at 2pm" → content: "doctor appointment", trigger_datetime_description: "next Monday at 2pm", category: "appointment"

Respond in STRICT JSON format:
{
  "content": "string (what to remind about)",
  "trigger_datetime_description": "string (when to remind)",
  "recurrence_rule": "daily | weekly | monthly | yearly | null",
  "category": "task | habit | medication | appointment | goal",
  "priority": "low | medium | high"
}`;

              const llmResult = await generateStructuredJson<{ 
                content: string; 
                trigger_datetime_description: string; 
                recurrence_rule: string | null;
                category: string;
                priority: string;
              } | { error: string }>(
                extractionPrompt,
                cleanedUserInputForSetter,
                {
                  type: "object",
                  properties: {
                    content: { type: "string" },
                    trigger_datetime_description: { type: "string" },
                    recurrence_rule: { type: ["string", "null"], enum: ["daily", "weekly", "monthly", "yearly", null] },
                    category: { type: "string", enum: ["task", "habit", "medication", "appointment", "goal"] },
                    priority: { type: "string", enum: ["low", "medium", "high"] }
                  },
                  required: ["content", "trigger_datetime_description", "recurrence_rule", "category", "priority"],
                  additionalProperties: false
                },
                "minato_reminder_setter_extraction_v1",
                [],
                (appConfig.openai.extractionModel || "gpt-4o-mini-2024-07-18"),
                userId
              );
              
              logger.info(`[ReminderSetterTool] LLM extraction result: ${JSON.stringify(llmResult)}`);
              
              if (llmResult && typeof llmResult === "object" && !llmResult.hasOwnProperty("error")) {
                const extracted = llmResult as { 
                  content: string; 
                  trigger_datetime_description: string; 
                  recurrence_rule: string | null;
                  category: string;
                  priority: string;
                };
                
                if (extracted.content) actualToolArgs.content = extracted.content;
                if (extracted.trigger_datetime_description) actualToolArgs.trigger_datetime_description = extracted.trigger_datetime_description;
                if (extracted.recurrence_rule) actualToolArgs.recurrence_rule = extracted.recurrence_rule;
                if (extracted.category) actualToolArgs.category = extracted.category;
                if (extracted.priority) actualToolArgs.priority = extracted.priority;
              }
            } catch (e) {
              logger.warn(`${logPrefix} LLM reminder setter extraction failed: ${((e as any).message) || e}`);
            }
            
            // Final fallback
            if (!actualToolArgs.content && cleanedUserInputForSetter) {
              // Try to split by common time indicators
              const timeIndicators = /\b(tomorrow|today|tonight|at \d|in \d|next|this|every)\b/i;
              const match = cleanedUserInputForSetter.match(timeIndicators);
              if (match) {
                const splitIndex = cleanedUserInputForSetter.indexOf(match[0]);
                if (splitIndex > 0) {
                  actualToolArgs.content = cleanedUserInputForSetter.substring(0, splitIndex).trim();
                  actualToolArgs.trigger_datetime_description = cleanedUserInputForSetter.substring(splitIndex).trim();
                }
              }
            }
          }
        }
        // --- END: ReminderSetterTool-specific fallback for required arguments ---

        // The following searchToolsRequiringQuery, YouTubeSearchTool, SportsInfoTool, RedditTool blocks should be OUTSIDE and AFTER the EventFinderTool block.

        const searchToolsRequiringQuery = [
          "YouTubeSearchTool", "NewsAggregatorTool", "HackerNewsTool", "WebSearchTool", "MemoryTool", "PexelsSearchTool", "RecipeSearchTool"
        ];

        // Improved fallback for user input
        if (
          searchToolsRequiringQuery.includes(canonicalToolName) &&
          tool.argsSchema.required?.includes("query") &&
          (!actualToolArgs.query || typeof actualToolArgs.query !== 'string' || actualToolArgs.query.trim() === "") &&
          userInputForFallback && typeof userInputForFallback === 'string' && userInputForFallback.trim()
        ) {
          // --- BEGIN: ADVANCED CLEANING FOR YOUTUBE QUERIES ---
          let cleanedUserInputForYouTube = userInputForFallback;
          if (typeof cleanedUserInputForYouTube === 'string') {
            // Remove leading Minato references
            cleanedUserInputForYouTube = cleanedUserInputForYouTube.replace(/^(hey |ok |hi |hello )?minato[,:]?\s*/i, "");
            // Remove generic prefixes
            cleanedUserInputForYouTube = cleanedUserInputForYouTube.replace(/^(show|find|get|search|play|watch|tell|give) (me )?(about|for|the|a|an)? ?/i, "");
            cleanedUserInputForYouTube = cleanedUserInputForYouTube.replace(/^(video|videos|clip|clips) (about|for|on)? ?/i, "");
            cleanedUserInputForYouTube = cleanedUserInputForYouTube.replace(/^about /i, "");
            // Remove trailing tool/implementation hints
            cleanedUserInputForYouTube = cleanedUserInputForYouTube.replace(/(using|with|via) (the)?youtube(api|searchtool)?( tool)?(\.|,)?\s*$/i, "");
            cleanedUserInputForYouTube = cleanedUserInputForYouTube.replace(/(using|with|via) [^.,;!?]+(\.|,)?\s*$/i, "");
            // Remove trailing polite words
            cleanedUserInputForYouTube = cleanedUserInputForYouTube.replace(/\b(please|thanks|thank you)[.!?, ]*$/i, "");
            cleanedUserInputForYouTube = cleanedUserInputForYouTube.trim();
          }
          // --- END: ADVANCED CLEANING ---
          logger.warn(`${logPrefix} Tool '${canonicalToolName}' called by Router without 'query'. Using cleaned fallback user input as query: "${String(cleanedUserInputForYouTube).substring(0,50)}..."`);
          actualToolArgs.query = String(cleanedUserInputForYouTube);
        }
        // --- PATCH: Ensure YouTubeSearchTool always has a valid 'limit' ---
        if (
          canonicalToolName === "YouTubeSearchTool" &&
          (actualToolArgs.limit === undefined || actualToolArgs.limit === null || isNaN(Number(actualToolArgs.limit)))
        ) {
          actualToolArgs.limit = 3;
        }
        // Add query length validation
        if (searchToolsRequiringQuery.includes(canonicalToolName) && actualToolArgs.query) {
          const maxQueryLength = 200;
          if (actualToolArgs.query.length > maxQueryLength) {
            logger.warn(`${logPrefix} Truncating long query from ${actualToolArgs.query.length} to ${maxQueryLength} chars for ${canonicalToolName}`);
            actualToolArgs.query = actualToolArgs.query.substring(0, maxQueryLength);
          }
        }

        if (canonicalToolName === "SportsInfoTool" && tool.argsSchema.required?.includes("teamName") && (!actualToolArgs.teamName || typeof actualToolArgs.teamName !== 'string' || actualToolArgs.teamName.trim() === "")) {
          if (userInputForFallback && typeof userInputForFallback === 'string' && userInputForFallback.trim()) {
            logger.warn(`${logPrefix} SportsInfoTool called by Router without 'teamName'. Tool may fail or use a default if implemented by the tool itself based on user query: "${String(userInputForFallback).substring(0,50)}..."`);
          } else {
            logger.error(`${logPrefix} SportsInfoTool requires 'teamName', but Router didn't provide it. Skipping.`);
            toolResultsSummaryParts.push(`Error: Tool '${canonicalToolName}' skipped (missing teamName).`);
            return { role: "tool" as const, tool_call_id: callId, name: canonicalToolName, content: `Error: Tool '${canonicalToolName}' could not execute (missing required 'teamName' argument).` };
          }
        }
        if (canonicalToolName === "RedditTool" && tool.argsSchema.required?.includes("subreddit") && (!actualToolArgs.subreddit || typeof actualToolArgs.subreddit !== 'string' || actualToolArgs.subreddit.trim() === "")) {
          if (userInputForFallback && typeof userInputForFallback === 'string' && userInputForFallback.trim()) {
            logger.warn(`${logPrefix} RedditTool called by Router without 'subreddit'. Tool might use a default or fail based on query: "${String(userInputForFallback).substring(0,50)}..."`);
          } else {
            logger.error(`${logPrefix} RedditTool requires 'subreddit', but Router didn't provide it. Skipping.`);
            toolResultsSummaryParts.push(`Error: Tool '${canonicalToolName}' skipped (missing subreddit).`);
            return { role: "tool" as const, tool_call_id: callId, name: canonicalToolName, content: `Error: Tool '${canonicalToolName}' could not execute (missing required 'subreddit' argument).` };
          }
        }
        if (canonicalToolName === "EventFinderTool" && tool.argsSchema.required?.includes("keyword") && 
          (!actualToolArgs.keyword || typeof actualToolArgs.keyword !== 'string' || actualToolArgs.keyword.trim() === "") &&
          (!actualToolArgs.classificationName && !actualToolArgs.location) 
        ) {
          if (userInputForFallback && typeof userInputForFallback === 'string' && userInputForFallback.trim()) {
            logger.warn(`${logPrefix} EventFinderTool called by Router without 'keyword' and other primary filters. Using fallback user input as keyword: "${String(userInputForFallback).substring(0,50)}..."`);
            actualToolArgs.keyword = String(userInputForFallback);
          } else {
            logger.warn(`${logPrefix} EventFinderTool requires 'keyword' or other filters, but Router provided none and no fallback. Tool may return broad or no results.`);
          }
        }
        // Now validate arguments after patching
        const stepForValidation: ToolRouterPlanStep = { ...routedToolCall, arguments: actualToolArgs, tool_name: canonicalToolName };
        if (!this.validateToolStep(stepForValidation)) {
          logger.error(`${logPrefix} Tool '${canonicalToolName}' (ID: ${callId.substring(0, 6)}) failed argument validation AFTER fallback. Arguments received: ${JSON.stringify(routedToolCall.arguments)}. Arguments after fallback: ${JSON.stringify(actualToolArgs)}. Skipping.`);
          toolResultsSummaryParts.push(`Error: Tool '${canonicalToolName}' skipped (invalid arguments after fallback).`);
          return { role: "tool" as const, tool_call_id: callId, name: canonicalToolName, content: `Error: Tool '${canonicalToolName}' could not execute due to invalid arguments even after attempting fallback.` };
        }
        logger.info(`${logPrefix} Executing tool '${canonicalToolName}' (ID: ${callId.substring(0, 6)}) from Router with final Args: ${JSON.stringify(actualToolArgs).substring(0, 100)}`);
        const abortController = new AbortController();
        const timeoutDuration = (typeof tool.timeoutMs === 'number')
          ? tool.timeoutMs
          : (appConfig as any).toolTimeoutMs || DEFAULT_TOOL_TIMEOUT_MS;
        logger.debug(`${logPrefix} Timeout configured for ${tool.name}: ${timeoutDuration}ms`);
        const timeoutId = setTimeout(() => {
          logger.warn(`${logPrefix} Timeout after ${timeoutDuration}ms for ${tool.name} (ID: ${callId.substring(0, 6)})`);
          abortController.abort();
        }, timeoutDuration);
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
          logger.info(`${logPrefix} Tool '${tool.name}' (ID: ${callId.substring(0, 6)}) finished. Success: ${!output.error}`);
          if (!output.error && output.structuredData) {
            structuredDataMap.set(callId, output.structuredData);
          } else {
            structuredDataMap.set(callId, null);
          }
          const resultString = output.error ? `Error from ${tool.name}: ${String(output.error)}` : String(output.result || `${tool.name} completed.`).substring(0, 4000);
          toolResultsSummaryParts.push(`Result from ${tool.name}: ${resultString.substring(0, 150)}...`);
          logToolExecution({
            toolName: canonicalToolName,
            aliasUsed: toolNameFromRouter !== canonicalToolName ? toolNameFromRouter : undefined,
            arguments: actualToolArgs,
            result: output.result,
            error: output.error,
            userId,
            structuredData: output.structuredData,
            success: !output.error,
          });
          return { role: "tool" as const, tool_call_id: callId, name: canonicalToolName, content: resultString };
        } catch (error: any) {
          clearTimeout(timeoutId);
          const isAbort = error.name === 'AbortError' || abortController.signal.aborted;
          const errorMsg = isAbort ? `Tool '${canonicalToolName}' timed out.` : `Tool '${canonicalToolName}' error: ${String(error?.message || error)}`;
          logger.error(`${logPrefix} Tool '${canonicalToolName}' (ID: ${callId.substring(0, 6)}) ${isAbort ? "TIMEOUT" : "EXCEPTION"}: ${String(error?.message || error)}`);
          structuredDataMap.set(callId, null);
          toolResultsSummaryParts.push(`Error with ${tool.name}: ${errorMsg.substring(0, 100)}...`);
          logToolExecution({
            toolName: canonicalToolName,
            aliasUsed: toolNameFromRouter !== canonicalToolName ? toolNameFromRouter : undefined,
            arguments: actualToolArgs,
            error: errorMsg,
            userId,
            success: false,
          });
          return { role: "tool" as const, tool_call_id: callId, name: canonicalToolName, content: `Error: ${errorMsg}` };
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
    return { messages: toolResultsMessages, lastSuccessfulStructuredData, llmUsage: null, toolResultsSummary: toolResultsSummaryParts.join("\n") || "Tools processing completed.", clarificationQuestion, clarificationDetails };
  }
  public async runOrchestration(
    userId: string,
    userInput: string | ChatMessageContentPart[],
    history: ChatMessage[] = [],
    apiContext?: Record<string, any>,
    initialAttachments?: MessageAttachment[]
  ): Promise<OrchestratorResponse | OrchestratorResponse[]> {
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
    let clarificationDetailsForUser: any = null;
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
        const executionResult = await this.executeToolCalls(
          userId,
          textQueryForRouter, // PASSED: textQueryForRouter as currentTurnUserInput
          routedTools.planned_tools,
          effectiveApiContext,
          userState,
          history
        );
        toolExecutionMessages = executionResult.messages; // Assignation à la variable de la portée supérieure
        finalStructuredResult = executionResult.lastSuccessfulStructuredData;
        currentTurnToolResultsSummary = executionResult.toolResultsSummary;
        clarificationQuestionForUser = executionResult.clarificationQuestion ?? null;
        clarificationDetailsForUser = executionResult.clarificationDetails ?? null;
      }
      // messagesForGpt4o est déjà initialisé à [] au début de la fonction
      messagesForGpt4o = [
        ...history,
        { role: "user", content: mainUserInputContent, name: userName, timestamp: Date.now(), attachments: initialAttachments?.filter(att => att.type !== 'video') },
        ...toolExecutionMessages,
      ];
      // Prepend a system message with the tool's result/summary if present
      if (toolExecutionMessages.length > 0 && typeof toolExecutionMessages[0].content === 'string' && toolExecutionMessages[0].content.trim()) {
        messagesForGpt4o.unshift({
          role: 'system',
          content: `TOOL SUMMARY: ${toolExecutionMessages[0].content}`,
          timestamp: Date.now()
        });
        // Also add the tool summary as an assistant message in the conversation flow
        messagesForGpt4o.push({
          role: 'assistant',
          content: toolExecutionMessages[0].content.trim(),
          timestamp: Date.now()
        });
      }
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
    // Add explicit instruction for LLM to always include tool-provided summaries in the chat response
    const synthesisSystemPromptWithSummaryInstruction =
      `${synthesisSystemPrompt}

IMPORTANT: Never mention tool names, APIs, or implementation details in your response. Always respond as Minato, the user's AI companion, in a natural, conversational way. If any tool provided a summary of its findings (such as a news summary, search summary, or result summary), ALWAYS include that summary in your chat response before any card or detailed list. Make the summary engaging and conversational. Do not reference the tool or implementation in your response.`;
    logger.info(`[${turnIdentifier}] Synthesizing final response (${CHAT_VISION_MODEL_NAME_ORCH})...`);
    const synthesisResult = await generateStructuredJson<{ responseText: string; intentType: string }>(
      synthesisSystemPromptWithSummaryInstruction, textQueryForRouter, // textQueryForRouter for user message context in synthesis
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
      // Prepend tool summary if present and not already included
      if (toolExecutionMessages.length > 0 && typeof toolExecutionMessages[0].content === 'string' && toolExecutionMessages[0].content.trim()) {
        const summary = toolExecutionMessages[0].content.trim();
        if (!finalResponseText.startsWith(summary)) {
          finalResponseText = summary + '\n\n' + finalResponseText;
        }
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

    // Prepare the base response object for both summary and card
    const baseOrchestratorResponse = {
      sessionId: runId,
      error: (typeof finalFlowType === 'string' && finalFlowType.includes("error")) ? (finalResponseText || "Processing error") : null,
      lang: lang,
      intentType: responseIntentType,
      ttsInstructions: ttsInstructionsForFinalResponse,
      clarificationQuestion: clarificationQuestionForUser ?? null,
      clarificationDetails: clarificationDetailsForUser ?? null,
      audioUrl: null,
      workflowFeedback: null,
      debugInfo: debugInfoInternal,
      transcription: typeof userInput === 'string' && apiContext?.transcription ? apiContext.transcription : (textQueryForRouter !== (typeof userInput === 'string' ? userInput : (userInput.find(p => p.type === 'text') as ChatMessageContentPartText)?.text || '')) ? textQueryForRouter : null,
      llmUsage: llmUsage_total,
      attachments: initialAttachments,
    };

    // --- PATCH: Always wrap HackerNewsTool results in hn_stories structuredData ---
    if (
      routedTools.planned_tools.length === 1 &&
      routedTools.planned_tools[0].tool_name === "HackerNewsTool"
    ) {
      // If finalStructuredResult is missing or not hn_stories, wrap it
      if (!finalStructuredResult || (typeof finalStructuredResult === "object" && finalStructuredResult.result_type !== "hn_stories")) {
        finalStructuredResult = {
          result_type: "hn_stories",
          source_api: "hackernews",
          query: {},
          sourceDescription: "No stories found or error.",
          count: 0,
          stories: [],
          error: typeof finalResponseText === "string" ? finalResponseText : "No stories found or error."
        };
      }
    }

    // If both a summary and structuredData are present, return both as separate messages
    if (
      finalResponseText &&
      finalStructuredResult &&
      typeof finalResponseText === "string" &&
      (finalStructuredResult as any).result_type === "news_articles"
    ) {
      return {
        ...baseOrchestratorResponse,
        response: finalResponseText,
        structuredData: finalStructuredResult,
      };
    }

    // Otherwise, return the single response as before
    return {
      ...baseOrchestratorResponse,
      response: finalResponseText,
      structuredData: finalStructuredResult,
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
    const resultRaw = await this.runOrchestration(userId, orchestratorInput, history, effectiveApiContext, attachments);
    const result = getFirstOrchResponse(resultRaw);
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
      let orchResultRaw: OrchestratorResponse | OrchestratorResponse[] | null = null;
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
        orchResultRaw = await this.runOrchestration(userId, transcribedText, history, effectiveApiContext);
        orchResult = getFirstOrchResponse(orchResultRaw);
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
          ...(orchResult?.debugInfo || {}),
          latencyMs: duration,
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
          transcription: transcribedText, // If transcription was successful before error
          audioUrl: orchResult?.audioUrl || null, // Updated audioUrl
          structuredData: orchResult?.structuredData || null, // Ensure structuredData is included for UI cards
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
        const debugInfoOnError: OrchestratorResponse['debugInfo'] = {
          latencyMs: duration,
          flow_type: 'error',
        };
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
  // Add getResolvedTool as a private method if not present
  private async getResolvedTool(toolNameFromRouter: string, userId?: string): Promise<{ tool: BaseTool | null; confidence: string; clarificationQuestion?: string }> {
    // Try direct match
    if (this.toolRegistry[toolNameFromRouter]) return { tool: this.toolRegistry[toolNameFromRouter], confidence: "high" };
    // Try static alias resolution
    const staticResolvedTool = resolveToolName(toolNameFromRouter);
    if (staticResolvedTool && this.toolRegistry[staticResolvedTool.name]) return { tool: staticResolvedTool, confidence: "high" };
    // LLM-based resolution
    const canonicalToolNames = Object.keys(this.toolRegistry);
    const llmResult = await resolveToolNameWithLLM(toolNameFromRouter, canonicalToolNames, userId);
    if (typeof llmResult === "string") {
      // Fallback: treat as low confidence
      return { tool: null, confidence: "none", clarificationQuestion: `I couldn't confidently match the tool name '${toolNameFromRouter}'. Can you clarify which tool you meant?` };
    }
    const { resolved_tool_name, confidence } = llmResult;
    if (confidence === "low" || confidence === "none") {
      return { tool: null, confidence, clarificationQuestion: `Did you mean to use the '${resolved_tool_name}' tool, or something else? Please clarify.` };
    }
    if (this.toolRegistry[resolved_tool_name]) {
      return { tool: this.toolRegistry[resolved_tool_name], confidence };
    }
    return { tool: null, confidence: "none", clarificationQuestion: `I couldn't find a matching tool for '${toolNameFromRouter}'. Can you clarify?` };
  }
  /**
   * Try to infer missing/ambiguous arguments for a tool using LLM, or generate a clarification question.
   * Returns { inferredArgs, clarificationQuestion }
   */
  private async llmInferOrClarifyArgs(
    tool: BaseTool,
    providedArgs: Record<string, any>,
    userInput: string,
    userState: UserState | null,
    userId: string
  ): Promise<{ inferredArgs: Record<string, any> | null; clarificationQuestion: string | null }> {
    const requiredArgs = tool.argsSchema?.required || [];
    const missingArgs = requiredArgs.filter(
      (arg: string) =>
        !(arg in providedArgs) ||
        providedArgs[arg] === undefined ||
        providedArgs[arg] === null ||
        (typeof providedArgs[arg] === "string" && providedArgs[arg].trim() === "")
    );
    if (missingArgs.length === 0) {
      // Validate providedArgs strictly
      const ajv = new Ajv();
      const validate: ValidateFunction = ajv.compile(tool.argsSchema);
      if (!validate(providedArgs)) {
        const errorMsg = `Arguments failed validation: ${JSON.stringify(validate.errors)}`;
        return { inferredArgs: null, clarificationQuestion: `Some arguments are invalid: ${errorMsg}. Can you clarify or provide correct values?` };
      }
      return { inferredArgs: providedArgs, clarificationQuestion: null };
    }
    // Compose LLM prompt
    const instructions = `You are an expert AI assistant helping another AI fill in missing arguments for a tool call. The tool is: ${tool.name}. Its description: ${tool.description}. The required arguments are: ${JSON.stringify(tool.argsSchema?.properties || {})}. The user query is: "${userInput}". The arguments provided so far are: ${JSON.stringify(providedArgs)}. The user's state is: ${userState ? JSON.stringify(userState) : "(none)"}.
If you can confidently infer the missing arguments, return them in the 'inferredArgs' field. If not, return a natural language clarification question in the 'clarificationQuestion' field to ask the user. Only one of these fields should be non-null.`;
    const schema = {
      type: "object",
      properties: {
        inferredArgs: { type: "object", nullable: true, description: "The completed argument object if you can infer all required arguments, else null." },
        clarificationQuestion: { type: "string", nullable: true, description: "A question to ask the user if you cannot infer the arguments, else null." }
      },
      required: ["inferredArgs", "clarificationQuestion"],
      additionalProperties: false
    };
    const result = await generateStructuredJson<{ inferredArgs: Record<string, any> | null; clarificationQuestion: string | null }>(
      instructions,
      userInput,
      schema,
      "minato_tool_arg_infer_or_clarify_v1",
      [],
      (appConfig.openai.extractionModel || "gpt-4.1-nano-2025-04-14"),
      userId
    );
    if (result && typeof result === "object" && !('error' in result) && ("inferredArgs" in result || "clarificationQuestion" in result)) {
      if (result.inferredArgs) {
        // Validate inferredArgs strictly
        const ajv = new Ajv();
        const validate: ValidateFunction = ajv.compile(tool.argsSchema);
        if (!validate(result.inferredArgs)) {
          const errorMsg = `Arguments failed validation: ${JSON.stringify(validate.errors)}`;
          return { inferredArgs: null, clarificationQuestion: `Some arguments are invalid: ${errorMsg}. Can you clarify or provide correct values?` };
        }
      }
      return result;
    }
    // Fallback: if LLM fails or returns error, return nulls
    return { inferredArgs: null, clarificationQuestion: null };
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

// Helper to always get a single OrchestratorResponse from possibly-array result
function getFirstOrchResponse(res: OrchestratorResponse | OrchestratorResponse[]): OrchestratorResponse {
  return Array.isArray(res) ? res[0] : res;
}
