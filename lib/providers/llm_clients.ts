// FILE: lib/providers/llm_clients.ts
import OpenAI from "openai";
import type {
ChatCompletionMessageParam,
ChatCompletionMessageToolCall,
ChatCompletionTool,
ChatCompletionToolChoiceOption,
ChatCompletionMessage,
ChatCompletionContentPartText,
ChatCompletionContentPartImage,
ChatCompletionContentPart,
} from "openai/resources/chat/completions";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
ChatMessage,
UserState,
ResponseApiInputContent,
} from "@/lib/types/index";
import { safeJsonParse } from "@/memory-framework/core/utils";
import type { CompletionUsage } from "openai/resources";
import { MEDIA_UPLOAD_BUCKET } from "../constants";
import { supabase } from "../supabaseClient";
import type { ChatMessageContentPart } from "@/lib/types/index";
// --- Initialize Raw OpenAI Client ---
if (!appConfig.openai.apiKey && typeof window === "undefined") {
logger.error("CRITICAL: OpenAI API Key is missing. LLM clients will not function.");
}
const openai = new OpenAI({
apiKey: appConfig.openai.apiKey,
maxRetries: appConfig.nodeEnv === "test" ? 0 : 3,
timeout: 120 * 1000,
});
if (appConfig.openai.apiKey && typeof window === "undefined") {
logger.info(`[LLM Clients] Raw OpenAI Client initialized for Responses API.`);
}
// --- Model Name Constants ---
// Corrected DYNAMIC_WORKFLOW_DESIGN_MODEL to use the chatModel as per previous instruction
const DYNAMIC_WORKFLOW_DESIGN_MODEL: string = appConfig.openai.chatModel; // e.g., gpt-4.1-mini
const PLANNING_MODEL_NAME: string = appConfig.openai.planningModel; // This might be an o-series or gpt
const RESPONSE_TOOL_MODEL_NAME: string = appConfig.openai.chatModel;
const EXTRACTION_MODEL_NAME: string = appConfig.openai.extractionModel;
const DEVELOPER_MODEL_NAME: string = appConfig.openai.developerModel;
const VISION_MODEL_NAME: string = appConfig.openai.visionModel;
const MAX_OUTPUT_TOKENS: number = appConfig.openai.maxTokens;
const MAX_VISION_TOKENS: number = appConfig.openai.maxVisionTokens;
const EMBEDDING_MODEL_NAME: string = appConfig.openai.embedderModel;
const EMBEDDING_DIMENSIONS: number = appConfig.openai.embeddingDims;
type SdkResponsesApiInputItem = ChatCompletionMessageParam;
type SdkResponsesApiMessageParam = ChatCompletionMessageParam;
type SdkResponsesApiContentPart = ChatCompletionContentPart;
type SdkResponsesApiTool = ChatCompletionTool;
type SdkResponsesApiToolChoice = ChatCompletionToolChoiceOption | "auto" | "none";
type SdkResponsesApiOutputItem = ChatCompletionMessage;
type SdkAssistantTextOutputContentPart = Extract<SdkResponsesApiContentPart, { type: "output_text" }>;
type SdkInputTextContentPart = Extract<SdkResponsesApiContentPart, { type: "input_text" }>;
type SdkFunctionCallOutputItem = ChatCompletionMessageToolCall;
type ImageURLPayload = OpenAI.Chat.Completions.ChatCompletionContentPartImage.ImageURL;
function sanitizeJsonSchema(schema: any, path: string[] = []): any {
if (!schema || typeof schema !== 'object' || schema === null) {
return schema;
}
const newSchema: any = Array.isArray(schema) ? [] : { ...schema };

if (Array.isArray(schema)) {
    return schema.map((item, index) => sanitizeJsonSchema(item, [...path, `[${index}]`]));
}

const disallowedKeywords = [
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "pattern", "minLength", "maxLength",
    "format", "multipleOf", "minItems", "maxItems", "uniqueItems", "minProperties", "maxProperties",
    "patternProperties", "unevaluatedProperties", "contains", "minContains", "maxContains", "default",
];
for (const keyword of disallowedKeywords) {
    delete newSchema[keyword];
}

if (newSchema.type === "object" || (Array.isArray(newSchema.type) && newSchema.type.includes("object"))) {
    newSchema.additionalProperties = false;

    if (newSchema.properties && typeof newSchema.properties === 'object') {
        const currentRequired = new Set(Array.isArray(newSchema.required) ? newSchema.required : []);
        for (const propKey in newSchema.properties) {
            if (!(Array.isArray(newSchema.properties[propKey]?.type) && newSchema.properties[propKey].type.includes("null"))) {
                currentRequired.add(propKey);
            }
            newSchema.properties[propKey] = sanitizeJsonSchema(newSchema.properties[propKey], [...path, 'properties', propKey]);
        }
        newSchema.required = Array.from(currentRequired).filter(rKey => newSchema.properties.hasOwnProperty(rKey));
        if (newSchema.required.length === 0) delete newSchema.required;

    } else if (!newSchema.properties || Object.keys(newSchema.properties).length === 0) {
        newSchema.properties = {};
        delete newSchema.required;
    }
}

if (newSchema.items && typeof newSchema.items === 'object' && newSchema.items !== null) {
    newSchema.items = sanitizeJsonSchema(newSchema.items, [...path, 'items']);
}
for (const key of ['anyOf', 'allOf', 'oneOf']) {
    if (Array.isArray(newSchema[key])) {
        newSchema[key] = newSchema[key].map((subSchema: any, index: number) =>
            sanitizeJsonSchema(subSchema, [...path, key, `[${index}]`])
        );
    }
}
return newSchema;
}
async function formatMessagesForResponsesApi(history: ChatMessage[]): Promise<SdkResponsesApiMessageParam[]> {
const apiMessages: SdkResponsesApiMessageParam[] = [];
for (const msg of history) {
let messageInputContent: string | ChatCompletionContentPart[] | null = null;
if (typeof msg.content === "string") {
  if (msg.content.trim()) {
    messageInputContent = msg.content; 
  }
} else if (Array.isArray(msg.content)) {
  const contentParts: ChatCompletionContentPart[] = [];
  for (const part of msg.content) {
    if (part.type === "text" && typeof part.text === 'string' && part.text.trim()) {
      contentParts.push({ type: "text", text: part.text }); 
    } else if ((part as any).type === 'image_url' && typeof (part as any).image_url === 'object' && (part as any).image_url && typeof (part as any).image_url.url === 'string') {
      contentParts.push({ type: "image_url", image_url: (part as any).image_url });
    }
  }
  if (contentParts.length > 0) {
    messageInputContent = contentParts;
  }
}

// Determine correct content type for OpenAI Responses API
let finalContentForApi: string | ChatCompletionContentPart[] | null = null;
if (Array.isArray(messageInputContent)) {
    const filteredParts = messageInputContent.filter(
      (p: any) => p.type === "text" || p.type === "refusal"
    );
    finalContentForApi = filteredParts.length > 0 ? filteredParts : null;
} else if (typeof messageInputContent === 'string' && messageInputContent.trim()){
    if (msg.role === "user" || msg.role === "system") {
         finalContentForApi = messageInputContent; // String is fine for user/system content
    } else if (msg.role === "assistant") {
        finalContentForApi = [{ type: "text", text: messageInputContent }];
    }
}


switch (msg.role) {
  case "user":
  case "system": // System message content is usually string, but handled via `instructions` now
    if (finalContentForApi) {
        apiMessages.push({ role: msg.role, content: finalContentForApi as any }); // Cast as any to allow string or array
    }
    break;
  case "assistant":
    const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
    const assistantMessagePayload: SdkResponsesApiMessageParam = { role: "assistant", content: finalContentForApi as any };
    if (hasToolCalls) {
        (assistantMessagePayload as OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam).tool_calls = hasToolCalls ? msg.tool_calls! : undefined;
    }
    if (finalContentForApi || hasToolCalls) {
         apiMessages.push(assistantMessagePayload);
    }
    break;
  case "tool":
    // Responses API tool results are added differently, not as messages in the `input` array
    break;
}
}
return apiMessages;
}
export async function generateEmbeddingLC(text: string): Promise<number[] | { error: string }> {
if (!text || String(text).trim().length === 0) return { error: "Input text cannot be empty." };
if (!openai?.embeddings) { logger.error("[LLM Clients Embed] OpenAI client or embeddings service not available."); return { error: "OpenAI client not initialized for embeddings." }; }
try {
const cleanedText = String(text).replace(/[\n\r]+/g, " ").trim();
if (cleanedText.length === 0) return { error: "Input text empty after cleaning." };
logger.debug(`[LLM Clients Embed] Generating (${EMBEDDING_MODEL_NAME}) for text (len: ${cleanedText.length})...`);
const start = Date.now();
const embeddingResponse = await openai.embeddings.create({ model: EMBEDDING_MODEL_NAME, input: cleanedText, encoding_format: "float", dimensions: EMBEDDING_DIMENSIONS === 1536 ? undefined : EMBEDDING_DIMENSIONS });
const duration = Date.now() - start;
const embedding = embeddingResponse?.data?.[0]?.embedding;
if (!embedding || !Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
logger.error(`[LLM Clients Embed] Invalid response or dimension mismatch. Expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}. Model: ${EMBEDDING_MODEL_NAME}`);
throw new Error(`Invalid embedding response or dimension mismatch (expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}).`);
}
logger.debug(`[LLM Clients Embed] Generated (${duration}ms). Dim: ${embedding.length}`);
return embedding;
} catch (error: any) {
let errorMessage = "Embedding failed.";
if (error instanceof OpenAI.APIError) errorMessage = `OpenAI Embedding API Error (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
else if (error.message) errorMessage = error.message;
logger.error(`[LLM Clients Embed] Error: ${errorMessage}, { originalError: error }`);
return { error: errorMessage };
}
}
export async function generateStructuredJson<T extends Record<string, any> = Record<string, any>>(
instructions: string,
userInput: string | ChatMessageContentPart[],
jsonSchema: Record<string, any>,
schemaName: string,
historyForContext: ChatMessage[] = [],
modelName: string = EXTRACTION_MODEL_NAME,
userId?: string
): Promise<T | { error: string }> {
if (!openai?.responses) { logger.error("[LLM Clients JSON] OpenAI responses service unavailable."); return { error: "OpenAI client not initialized." }; }
const logSuffix = `User:${userId ? userId.substring(0,8) : "N/A"} Model:${modelName} Schema:${schemaName}`;
try {
logger.debug(`[LLM Clients JSON] Generating with ${logSuffix}`);
const baseMessages: SdkResponsesApiMessageParam[] = [];
if (historyForContext.length > 0) {
const formattedHistory = await formatMessagesForResponsesApi(historyForContext);
baseMessages.push(...formattedHistory);
}
let userMessageContentForApi: string | ChatCompletionContentPart[];
if (typeof userInput === 'string') {
    userMessageContentForApi = userInput; // For user role, string is fine for OpenAI.Responses.create
} else { // Array of ChatMessageContentPart
    userMessageContentForApi = userInput.map(part => {
        if (part.type === 'text' && typeof part.text === 'string') return { type: 'text', text: part.text };
        if ((part as any).type === 'image_url' && typeof (part as any).image_url === 'object' && (part as any).image_url && typeof (part as any).image_url.url === 'string') return { type: 'image_url', image_url: (part as any).image_url, detail: (part as any).detail };
        logger.warn(`[generateStructuredJson] Unknown user input part type: ${part.type}`);
        return { type: 'text', text: '[Unsupported content part]' };
    }) as ChatCompletionContentPart[];
}

const inputMessages: SdkResponsesApiMessageParam[] = [
    ...baseMessages,
    { role: "user", content: userMessageContentForApi }
];

if (inputMessages.length === 0 && !instructions) { logger.error(`[LLM Clients JSON] No valid messages or instructions. ${logSuffix}`); return { error: "No valid messages or instructions to send." }; }

const sanitizedSchema = sanitizeJsonSchema(jsonSchema); 
logger.debug(`[LLM Clients JSON] Using sanitized schema for ${schemaName}: ${JSON.stringify(sanitizedSchema).substring(0, 200)}...`);

const requestPayload: OpenAI.Responses.ResponseCreateParams = {
  model: modelName, 
  input: inputMessages as any, 
  instructions: instructions || undefined,
  text: { format: { type: "json_schema", name: schemaName, schema: sanitizedSchema, strict: true } },
  store: appConfig.nodeEnv !== "production", 
  max_output_tokens: (modelName === DYNAMIC_WORKFLOW_DESIGN_MODEL) 
                      ? Math.min(16384, MAX_OUTPUT_TOKENS) 
                      : MAX_OUTPUT_TOKENS,
};
if (userId) requestPayload.user = userId;

// --- FIX: Conditional temperature/reasoning based on model type ---
const isOModel = modelName.startsWith("o3-") || modelName.startsWith("o4-");
if (isOModel) {
    (requestPayload as any).reasoning = { effort: "medium" }; 
} else { // Assume GPT model
    // For planner (DYNAMIC_WORKFLOW_DESIGN_MODEL), use a lower temperature. Otherwise, use appConfig default.
    requestPayload.temperature = (modelName === DYNAMIC_WORKFLOW_DESIGN_MODEL) 
        ? 0.2 
        : (typeof appConfig.llm.temperature === 'number' ? appConfig.llm.temperature : 1.0);
    logger.debug(`[LLM Clients JSON] Using temperature: ${requestPayload.temperature} for ${modelName}`);
}
// --- END FIX ---

const start = Date.now();
const responseRaw = await openai.responses.create(requestPayload);
const response = responseRaw as any; 
const duration = Date.now() - start;

if (response.status === "failed" || response.status === "incomplete") { const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown error"; logger.error(`[LLM Clients JSON] Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`); return { error: `JSON generation failed (${response.status}): ${errorReason}` }; }

const assistantOutputItem = response.output?.find((item: any): item is SdkResponsesApiOutputItem => item.type === "message" && item.role === "assistant" && "content" in item);
let textContentItem: SdkAssistantTextOutputContentPart | undefined; // Use SdkAssistantTextOutputContentPart
if (assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
  textContentItem = assistantOutputItem.content.find((part: any): part is SdkAssistantTextOutputContentPart => part.type === "output_text");
}
const finishReason = response.status === "completed" ? "stop" : response.incomplete_details?.reason || response.status;
logger.debug(`[LLM Clients JSON] Success (${duration}ms). Finish: ${finishReason}. Usage: ${JSON.stringify(response.usage)}. ${logSuffix}`);

if (!textContentItem || typeof (textContentItem as { text?: unknown }).text !== 'string') {
  const refusalPart = (assistantOutputItem?.content as any[])?.find((p: any) => p.type === 'refusal');
  if (refusalPart) {
    logger.error(`[LLM Clients JSON] Model refused: ${refusalPart.refusal}. Schema: ${schemaName}. ${logSuffix}`);
    return { error: `JSON generation refused: ${refusalPart.refusal}` };
  }
  logger.error(`[LLM Clients JSON] No 'output_text' in response. ${logSuffix}. Output:`, response.output);
  return { error: "JSON generation failed (no text output)." };
}
let responseText: string | undefined = undefined;
if (textContentItem && typeof (textContentItem as any).text === 'string') {
  responseText = (textContentItem as any).text;
} else {
  logger.error(`[LLM Clients JSON] No valid textContentItem.text found. Type: ${typeof textContentItem}`);
  return { error: "No valid text output found in assistant response." };
}

if (typeof responseText !== 'string') {
  logger.error(`[LLM Clients JSON] responseText is undefined or not a string after extraction.`);
  return { error: "No valid text output found in assistant response (undefined)." };
}

if (finishReason === "max_output_tokens") { logger.error(`[LLM Clients JSON] Truncated JSON. ${logSuffix}`); const partialResult = safeJsonParse<T>(responseText); if (partialResult) return partialResult; return { error: `JSON generation failed (truncated). Finish: ${finishReason}` }; }

const result = safeJsonParse<T>(responseText);
if (!result || typeof result !== "object" || Array.isArray(result)) { logger.warn(`[LLM Clients JSON] Parsed non-object/null/array. Type: ${typeof result}. Raw: ${responseText.substring(0,300)}. ${logSuffix}`); return { error: `JSON parsing yielded ${typeof result}. Expected object for schema ${schemaName}.` }; }
return result;
} catch (error: any) {
let errorMessage = "Structured JSON generation error.";
if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for JSON Gen (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
else if (error.message) errorMessage = error.message;
logger.error(`[LLM Clients JSON] Exception: ${errorMessage}. ${logSuffix}, { originalError: error, schemaName, schemaUsedForCall: ${JSON.stringify(jsonSchema).substring(0,300)} }`);
return { error: errorMessage };
}
}
export async function generateAgentResponse(
messages: ChatMessage[],
responsesApiTools: SdkResponsesApiTool[] | null,
responsesApiToolChoice: SdkResponsesApiToolChoice | null,
modelName: string = RESPONSE_TOOL_MODEL_NAME,
maxTokens?: number,
userId?: string,
instructions?: string | null
): Promise<{
responseContent: string | null;
toolCalls: SdkFunctionCallOutputItem[] | null;
finishReason: string | undefined;
usage?: CompletionUsage | null;
error?: string | null;
}> {
if (!openai?.responses) { return { responseContent: null, toolCalls: null, finishReason: "error", error: "OpenAI client not initialized." }; }
const logSuffix = `User:${userId ? userId.substring(0,8) : "N/A"} Model:${modelName}`;
try {
if (!messages || messages.length === 0) return { responseContent: null, toolCalls: null, finishReason: "error", error: "No messages." };
const apiInputItems = await formatMessagesForResponsesApi(messages);
if (apiInputItems.length === 0 && !instructions) { return { responseContent: null, toolCalls: null, finishReason: "error", error: "No messages or instructions for API." }; }
const requestPayload: OpenAI.Responses.ResponseCreateParams = {
  model: modelName, input: apiInputItems as any, 
  max_output_tokens: maxTokens ?? MAX_OUTPUT_TOKENS, store: appConfig.nodeEnv !== "production",
};
if (userId) requestPayload.user = userId;
if (instructions) requestPayload.instructions = instructions;
if (responsesApiTools && responsesApiTools.length > 0) requestPayload.tools = responsesApiTools as any;
if (responsesApiToolChoice) requestPayload.tool_choice = responsesApiToolChoice as any;

// --- FIX: Conditional temperature/reasoning based on model type ---
const isOModel = modelName.startsWith("o3-") || modelName.startsWith("o4-");
if (isOModel) {
    (requestPayload as any).reasoning = { effort: "medium" };
} else { // Assume GPT model
    requestPayload.temperature = typeof appConfig.llm.temperature === 'number' ? appConfig.llm.temperature : 1.0;
    logger.debug(`[LLM Clients Agent] Using temperature: ${requestPayload.temperature} for ${modelName}`);
}
// --- END FIX ---

const start = Date.now();
const responseRaw = await openai.responses.create(requestPayload);
const response = responseRaw as any; 
const duration = Date.now() - start;

if (response.status === "failed" || response.status === "incomplete") { const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown API error"; const apiUsage = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null; logger.error(`[LLM Clients Agent] API Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`); return { responseContent: null, toolCalls: null, finishReason: response.status, error: `Agent API error (${response.status}): ${errorReason}`, usage: apiUsage }; }

let responseText: string | null = null;
const assistantOutputItem = response.output?.find((item: any): item is SdkResponsesApiOutputItem => item.type === "message" && item.role === "assistant" && "content" in item);

if (assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
  const textPart = assistantOutputItem.content.find((part: any): part is SdkAssistantTextOutputContentPart => part.type === "output_text");
  if (textPart && typeof textPart.text === "string") { 
    responseText = textPart.text.trim(); 
    if (responseText === "") responseText = null; 
  }
}

const extractedSdkFunctionCalls = response.output?.filter((item: any): item is SdkFunctionCallOutputItem => item.type === "function_call");
const finishReasonResult = response.status === "completed" ? (extractedSdkFunctionCalls && extractedSdkFunctionCalls.length > 0 ? "tool_calls" : "stop") : response.incomplete_details?.reason || response.status;
const mappedUsage: CompletionUsage | null = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null;
logger.debug(`[LLM Clients Agent] Success (${duration}ms). Finish: ${finishReasonResult}. Text: ${!!responseText}. Function Calls: ${extractedSdkFunctionCalls?.length ?? 0}. Usage: ${JSON.stringify(mappedUsage)}. ${logSuffix}`);
return { responseContent: responseText, toolCalls: extractedSdkFunctionCalls && extractedSdkFunctionCalls.length > 0 ? extractedSdkFunctionCalls : undefined, finishReason: finishReasonResult, usage: mappedUsage, error: null };
} catch (error: any) {
let errorMessage = "Agent response generation error.";
if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for Agent (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
else if (error.message) errorMessage = error.message;
logger.error(`[LLM Clients Agent] Exception: ${errorMessage}. ${logSuffix}, { originalError: error, requestPayloadString: ${JSON.stringify((error as any).request?.body || {}).substring(0,300)} }`);
return { responseContent: null, toolCalls: null, finishReason: "error", error: errorMessage };
}
}
export async function generateResponseWithIntent(
instructions: string,
userPrompt: string,
history: ChatMessage[] = [],
modelName: string = RESPONSE_TOOL_MODEL_NAME,
maxTokens?: number,
userId?: string
): Promise<{ responseText: string; intentType: string } | { error: string }> {
const logSuffix = `User:${userId ? userId.substring(0,8) : "N/A"} Model:${modelName}`;
logger.debug(`[LLM Clients Intent] Generating response and intent. ${logSuffix}`);
const intentSchema = {
type: "object" as const,
properties: {
responseText: { type: "string" as const, description: "The natural language response for the user, incorporating their name and Minato's persona. This should be a complete, conversational reply." },
intentType: { type: "string" as const, description: "The single best intent classification for the responseText.", enum: ["neutral", "informative", "questioning", "assertive", "formal", "celebratory", "happy", "encouraging", "apologetic", "empathetic", "concerned", "disappointed", "urgent", "calm", "gentle", "whispering", "sarcastic", "humorous", "roasting", "flirtatious", "intimate", "thinking", "greeting", "farewell", "confirmation_positive", "confirmation_negative", "clarification", "apology", "empathy", "instructional", "warning", "error", "workflow_update"] },
},
required: ["responseText", "intentType"],
additionalProperties: false,
};
const schemaNameForIntent = "minato_intent_response_v3";
const userInputForJson: string = userPrompt;
const result = await generateStructuredJson<{ responseText: string; intentType: string }>(
instructions, userInputForJson, intentSchema, schemaNameForIntent,
history, modelName, userId
);
if ("error" in result) {
logger.error(`[LLM Clients Intent] Structured JSON for intent failed: ${result.error}. ${logSuffix}. Falling back.`);
const fallbackMessages: ChatMessage[] = [...history, {role: "user", content: userPrompt, timestamp: Date.now()}];
const fallbackAgentResult = await generateAgentResponse(fallbackMessages, null, "none", modelName, maxTokens, userId, instructions);
if (fallbackAgentResult.responseContent) {
logger.warn(`[LLM Clients Intent] Fallback to plain text response due to JSON error. Intent set to 'neutral'.`);
return { responseText: fallbackAgentResult.responseContent, intentType: "neutral" };
}
return { error: result.error + " (Fallback also failed to produce text)" };
}
if (result.responseText.trim().endsWith("}")) {
const jsonSuffixPattern = /{\s*"responseText":\s*"[^"]",\s"intentType":\s*"[^"]"\s}$/;
if (jsonSuffixPattern.test(result.responseText.trim())) {
result.responseText = result.responseText.trim().replace(jsonSuffixPattern, "").trim();
logger.warn(`[LLM Clients Intent] Stripped JSON suffix from responseText. Original ended with object.`);
}
}
if (!result.responseText.trim()) {
logger.error(`[LLM Clients Intent] responseText became empty after attempting to strip JSON suffix. LLM likely returned ONLY the JSON object. Prompting needs refinement. Original result:, result`);
return { error: "LLM returned only JSON structure, no conversational text." };
}
return result;
}
export async function generateVisionCompletion(
messages: ChatMessage[],
modelName: string = VISION_MODEL_NAME,
maxTokens?: number,
userId?: string
): Promise<{ text: string | null; error?: string | null; usage?: CompletionUsage | null }> {
const logSuffix = `User:${userId ? userId.substring(0,8) : "N/A"} Model:${modelName}`;
logger.debug(`[LLM Clients Vision] Generating vision completion. ${logSuffix}`);
const hasImage = messages.some(msg => Array.isArray(msg.content) && msg.content.some(part => (part as any).type === "image_url"));
if (!hasImage) return { text: null, error: "No image content provided for vision analysis." };
const visionInstructions = "You are Minato, an AI assistant. Analyze the provided image(s) in detail and describe what you see. If text is provided with the image(s), consider it as part of the query or context for the analysis. Be descriptive, engaging, and speak as Minato to {userName}.";
const agentResult = await generateAgentResponse(
messages, null, "none", modelName, maxTokens ?? MAX_VISION_TOKENS, userId, visionInstructions
);
if (agentResult.error) return { text: null, error: agentResult.error, usage: agentResult.usage };
if (agentResult.responseContent === null && agentResult.finishReason !== "stop") {
logger.warn(`[LLM Clients Vision] Model returned no text, finish_reason: ${agentResult.finishReason}. ${logSuffix}`);
}
return { text: agentResult.responseContent, error: null, usage: agentResult.usage };
}
export { openai as rawOpenAiClient };