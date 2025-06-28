// FILE: lib/providers/llm_clients.ts
import OpenAI from "openai";
import type {
ChatCompletionMessageParam,
ChatCompletionMessageToolCall,
ChatCompletionTool,
ChatCompletionToolChoiceOption,
ChatCompletionMessage,
// ChatCompletionContentPartText, // Not used directly, use ResponseApiOutputTextPart
// ChatCompletionContentPartImage, // Not used directly, use ResponseApiInputImagePart
ChatCompletionContentPart as SdkChatCompletionContentPart, // Renamed to avoid conflict
ChatCompletionContentPartRefusal,
} from "openai/resources/chat/completions";
import { appConfig, injectPromptVariables } from "../config";
import { logger } from "../../memory-framework/config";
import {
ChatMessage,
UserState,
ChatMessageContentPart as AppChatMessageContentPart,
ChatMessageContentPartText as AppChatMessageContentPartText,
ChatMessageContentPartInputImage as AppChatMessageContentPartInputImage,
AnyToolStructuredData,
XmlClassification,
} from "@/lib/types/index";
import { safeJsonParse } from "@/memory-framework/core/utils";
import type { CompletionUsage } from "openai/resources";
import { MEDIA_UPLOAD_BUCKET } from "../constants";
import { supabase } from "../supabaseClient";
import Ajv from "ajv";
import { SchemaService } from "../services/schemaService"; // Import SchemaService
import { 
  MINATO_MULTI_TOOL_COT_PROMPT_TEMPLATE, 
  MINATO_QUERY_NATURE_CLASSIFIER_PROMPT_TEMPLATE,
  ADVANCED_SKILL_LEARNING_PROMPT_TEMPLATE,
  ADVANCED_NEWS_AGGREGATOR_PROMPT_TEMPLATE,
  PROACTIVE_LIFE_IMPROVER_PROMPT_TEMPLATE,
  ENHANCED_REASONING_RESPONSE_PROMPT_TEMPLATE,
  MULTI_TOOL_ORCHESTRATION_EXPLANATION_TEMPLATE,
  REASONING_UI_CARD_TEMPLATE,
  LEARNING_SERIES_PROGRESSION_PROMPT_TEMPLATE,
  PROACTIVE_LEARNING_CHECKIN_PROMPT_TEMPLATE,
  FOCUS_MODE_PROMPT_TEMPLATE
} from "../prompts";

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
logger.info("[LLM Clients] Raw OpenAI Client initialized for Responses API.");
}
// --- Model Name Constants ---
const CHAT_VISION_MODEL_NAME: string = appConfig.openai.chatModel;
const PLANNING_MODEL_NAME: string = appConfig.openai.planningModel;
const EXTRACTION_MODEL_NAME: string = appConfig.openai.extractionModel;
const DEVELOPER_MODEL_NAME: string = appConfig.openai.developerModel;
const MAX_OUTPUT_TOKENS: number = appConfig.openai.maxTokens;
const MAX_VISION_TOKENS: number = appConfig.openai.maxVisionTokens;
const EMBEDDING_MODEL_NAME: string = appConfig.openai.embedderModel;
const EMBEDDING_DIMENSIONS: number = appConfig.openai.embeddingDims;
// Types for OpenAI Responses API Input
type ResponseApiInputTextPart = { type: "input_text"; text: string; };
type ResponseApiOutputTextPart = { type: "output_text"; text: string; };
type ResponseApiInputImagePart = { type: "input_image"; image_url: string; detail: "auto" | "low" | "high"; };
type ResponseApiInputFilePart = { type: "input_file"; file_id?: string; filename?: string; file_data?: string; };
type ResponseApiContentPart = ResponseApiInputTextPart | ResponseApiInputImagePart | ResponseApiInputFilePart | ResponseApiOutputTextPart | ChatCompletionContentPartRefusal;
type SdkResponsesApiMessageParam = OpenAI.Responses.ResponseInputItem; // Target type for items in input array
type SdkResponsesApiTool = OpenAI.Chat.Completions.ChatCompletionTool; // Tool definition structure
type SdkResponsesApiToolChoice = OpenAI.Chat.Completions.ChatCompletionToolChoiceOption; // Tool choice structure
type SdkFunctionCallOutputItem = OpenAI.Chat.Completions.ChatCompletionMessageToolCall; // For tool_calls in assistant response

async function formatMessagesForResponsesApi(
messages: ChatMessage[],
userId?: string
): Promise<OpenAI.Responses.ResponseInputMessageItem[]> {
const apiMessages: OpenAI.Responses.ResponseInputMessageItem[] = [];

for (const msg of messages) {
let openAiApiContentParts: ResponseApiContentPart[] = [];
if (Array.isArray(msg.content)) {
  for (const part of msg.content as AppChatMessageContentPart[]) {
    if (part.type === "text" && typeof part.text === 'string' && part.text.trim()) {
      if (msg.role === "user" || msg.role === "system") {
        openAiApiContentParts.push({ type: "input_text", text: part.text });
      } else if (msg.role === "assistant") {
        openAiApiContentParts.push({ type: "output_text", text: part.text });
      }
    }
    else if (part.type === 'input_image' && typeof part.image_url === 'string') {
      let imageUrl = part.image_url;
      if (imageUrl.startsWith("supabase_storage:")) {
        const storagePath = imageUrl.substring("supabase_storage:".length);
        const { data: urlData } = supabase.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(storagePath);
        if (urlData?.publicUrl) imageUrl = urlData.publicUrl;
        else logger.warn(`[formatMsg] Failed to get public URL for supabase_storage: ${storagePath}`);
      }
      // Allow data URLs and http/https URLs
      const isValid = imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || (imageUrl.startsWith('data:image/') && imageUrl.includes(';base64,'));
      if (isValid) {
        openAiApiContentParts.push({ type: "input_image", image_url: imageUrl, detail: part.detail ?? "auto" });
      } else if (!imageUrl.startsWith("error_") && !imageUrl.startsWith("blob:")) { // Also don't log for blob, orchestrator should handle it
        logger.warn(`[formatMsg] Skipping invalid image_url (not http/data/supabase_storage or blob): ${imageUrl.substring(0,100)}...`);
      }
    }
  }
} else if (typeof msg.content === 'string' && msg.content.trim()) {
  if (msg.role === "user" || msg.role === "system") {
    openAiApiContentParts.push({ type: "input_text", text: msg.content });
  } else if (msg.role === "assistant") {
    openAiApiContentParts.push({ type: "output_text", text: msg.content });
  }
}

// Handle attachments that were not processed into content parts (especially for vision, ensures images are added)
if (msg.role === "user" && msg.attachments) {
    for (const att of msg.attachments) {
        if (att.type === "image" && att.url) {
            let imageUrl = att.url;
             if (imageUrl.startsWith("supabase_storage:")) {
                const storagePath = imageUrl.substring("supabase_storage:".length);
                const { data: urlData } = supabase.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(storagePath);
                if (urlData?.publicUrl) imageUrl = urlData.publicUrl;
             }
             const isValid = imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || (imageUrl.startsWith('data:image/') && imageUrl.includes(';base64,'));
             if (isValid && !openAiApiContentParts.some(p => p.type === "input_image" && (p as ResponseApiInputImagePart).image_url === imageUrl)) {
                openAiApiContentParts.push({ type: "input_image", image_url: imageUrl, detail: "auto" });
             } else if (!isValid && !imageUrl.startsWith("error_") && !imageUrl.startsWith("blob:")) {
                logger.warn(`[formatMsg] Skipping invalid image_url from attachment: ${imageUrl.substring(0,100)}...`);
             }
        }
    }
}


let messagePayload: OpenAI.Responses.ResponseInputMessageItem | null = null;

switch (msg.role) {
  case "user": {
    let finalContentUser: string | Array<ResponseApiInputTextPart | ResponseApiInputImagePart | ResponseApiInputFilePart>;
    const filteredParts = openAiApiContentParts.filter(p => p.type === "input_text" || p.type === "input_image" || p.type === "input_file") as Array<ResponseApiInputTextPart | ResponseApiInputImagePart | ResponseApiInputFilePart>;
    
    const validFilteredParts = filteredParts;

    if (validFilteredParts.length === 1 && validFilteredParts[0].type === "input_text") {
      finalContentUser = validFilteredParts[0].text;
    } else if (validFilteredParts.length > 0) {
      finalContentUser = validFilteredParts;
    } else {
      finalContentUser = (typeof msg.content === 'string' && msg.content.trim() === "") ? "" : "";
      if (finalContentUser === "" && typeof msg.content === 'string' && msg.content.trim() !== "") {
          finalContentUser = msg.content;
      }
    }

    if (finalContentUser !== "" && (typeof finalContentUser !== 'string' || finalContentUser.trim() !== "") && (!Array.isArray(finalContentUser) || finalContentUser.length > 0)) {
      if (typeof finalContentUser === "string") {
        // @ts-expect-error OpenAI API rejects 'id' for user input, but SDK type requires it
        messagePayload = {
          role: "user",
          content: [{ type: "input_text", text: finalContentUser }],
        };
      } else if (Array.isArray(finalContentUser) && finalContentUser.length > 0) {
        // @ts-expect-error OpenAI API rejects 'id' for user input, but SDK type requires it
        messagePayload = {
          role: "user",
          content: finalContentUser,
        };
      }
    }
    break;
  }
  case "system": {
    let finalContentSystem: string;
    if (openAiApiContentParts.length === 1 && openAiApiContentParts[0].type === "input_text") {
      finalContentSystem = (openAiApiContentParts[0] as ResponseApiInputTextPart).text;
    } else if (typeof msg.content === 'string') {
      finalContentSystem = msg.content;
    } else if (openAiApiContentParts.length > 0 && openAiApiContentParts.every(p => p.type === "input_text")) {
      finalContentSystem = (openAiApiContentParts as ResponseApiInputTextPart[]).map(p => p.text).join("\n");
    } else {
      finalContentSystem = "";
      if (typeof msg.content === 'string' && msg.content !== "") {
        logger.warn(`[formatMsg] System message (original ID: ${msg.id || 'N/A'}) had non-string content not convertible to simple string. Setting to empty. Original: ${JSON.stringify(msg.content).substring(0,100)}`);
      }
    }
    // @ts-expect-error OpenAI API rejects 'id' for system input, but SDK type requires it
    messagePayload = {
      role: "system",
      content: [{ type: "input_text", text: finalContentSystem }],
    };
    break;
  }
  case "assistant":
    // Ignoré pour l'input OpenAI v4
    break;
  case "tool":
    // Ignoré pour l'input OpenAI v4
    break;
  default:
    break;
}

if (messagePayload) {
  apiMessages.push(messagePayload);
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
const embeddingResponse = await openai.embeddings.create({
  model: EMBEDDING_MODEL_NAME,
  input: cleanedText,
  encoding_format: "float",
  dimensions: EMBEDDING_DIMENSIONS === 1536 ? undefined : EMBEDDING_DIMENSIONS
});
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
  if ((error as any).status && (error as any).message) {
    errorMessage = `OpenAI Embedding API Error (${(error as any).status} ${(error as any).code || "N/A"}): ${(error as any).message}`;
  } else if (error.message) {
    errorMessage = error.message;
  }
  logger.error(`[LLM Clients Embed] Error: ${errorMessage}`, { originalError: error });
  return { error: errorMessage };
}
}
export async function generateStructuredJson<T extends AnyToolStructuredData | Record<string, any> = Record<string, any>>(
instructions: string,
userInput: string,
jsonSchema: Record<string, any>,
schemaName: string,
historyForContext: ChatMessage[] = [],
modelName: string,
userId?: string
): Promise<T | { error: string }> {
if (!openai?.responses) { logger.error("[LLM Clients JSON] OpenAI responses service unavailable."); return { error: "OpenAI client not initialized." }; }
const logSuffix = `User:${userId ? userId.substring(0, 8) : "N/A"} Model:${modelName} Schema:${schemaName}`;
try {
logger.debug(`[LLM Clients JSON] Generating with ${logSuffix}. Original schema type: ${jsonSchema.type}`);
const formattedHistory = await formatMessagesForResponsesApi(historyForContext, userId);


// For new user input, do not include 'id'. The API expects it to be absent for new input items.
// @ts-expect-error OpenAI API rejects 'id' for user input, but SDK type requires it
const userMessageForApi: OpenAI.Responses.ResponseInputMessageItem = {
  role: "user",
  content: [{ type: "input_text", text: userInput }]
};


const inputForApi: OpenAI.Responses.ResponseInputItem[] = [
  ...formattedHistory,
  userMessageForApi
].filter(msg => { // Filter out messages that became effectively empty
  if (typeof msg === 'object' && msg !== null && 'role' in msg) {
    const role = (msg as any).role;
    const content = (msg as any).content;
    const toolCalls = 'tool_calls' in msg ? (msg as any).tool_calls : undefined;
    if (role === 'assistant' && content === null && !(toolCalls && toolCalls.length > 0) ) return false;
    if ((role === 'user' || role === 'system') && (content === null || content === "" || (Array.isArray(content) && content.length === 0))) return false;
    return true;
  }
  return true; 
});


if (inputForApi.length === 0 && !instructions) {
  logger.error(`[LLM Clients JSON] No valid messages or instructions. ${logSuffix}`);
  return { error: "No valid messages or instructions to send." };
}

if (inputForApi.length > 0) {
  const firstMsg = inputForApi[0] as any;
  logger.debug(`[LLM Clients JSON] InputForApi[0] being sent: role=${firstMsg.role}, hasToolCalls=${!!firstMsg.tool_calls}, hasId=${!!firstMsg.id}`);
}


let finalJsonSchema = JSON.parse(JSON.stringify(jsonSchema)); 


if (schemaName === "minato_tool_router_v1_1" && finalJsonSchema.type === "object" && finalJsonSchema.properties?.planned_tools?.type === "array") {
  const itemsSchema = finalJsonSchema.properties.planned_tools.items;
  if (typeof itemsSchema === 'object' && itemsSchema !== null && itemsSchema.type === "object") {
    if (itemsSchema.properties?.arguments && itemsSchema.properties.arguments.type === 'object') {
    } else {
        logger.warn(`[LLM Clients JSON] 'arguments' property in '${schemaName}' item schema is not an object or missing. LLM might struggle with argument structure.`);
    }
  }
  logger.debug(`[LLM Clients JSON] Schema '${schemaName}' for tool router appears compliant for OpenAI API.`);
} else if (finalJsonSchema.type === "object") {
  if (finalJsonSchema.additionalProperties !== false) {
    logger.warn(`[LLM Clients JSON] Schema '${schemaName}' is object but root 'additionalProperties' is not false. Setting to false for strict mode compliance with OpenAI Responses API.`);
    finalJsonSchema.additionalProperties = false;
  }
} else {
  logger.error(`[LLM Clients JSON] Schema '${schemaName}' root must be 'object'. Got '${finalJsonSchema.type}'. ${logSuffix}`);
  return { error: `Schema '${schemaName}' root must be 'object'.` };
}


const requestPayload: OpenAI.Responses.ResponseCreateParams = {
  model: modelName,
  input: inputForApi,
  instructions: instructions || undefined,
  text: { format: { type: "json_schema", name: schemaName, schema: finalJsonSchema, strict: true } },
  store: appConfig.nodeEnv !== "production",
  max_output_tokens: (modelName === PLANNING_MODEL_NAME)
    ? Math.min(2048, MAX_OUTPUT_TOKENS)
    : MAX_OUTPUT_TOKENS,
  temperature: (modelName === PLANNING_MODEL_NAME) ? 0.0 : (appConfig.llm.temperature ?? 0.7),
};
if (userId) requestPayload.user = userId;


const start = Date.now();
const responseRaw = await openai.responses.create(requestPayload);
const response = responseRaw as any; // Casting to any for easier access to response.output and response.status
const duration = Date.now() - start;


if (response.status === "failed" || response.status === "incomplete") {
  const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown error";
  logger.error(`[LLM Clients JSON] Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`);
  return { error: `JSON generation failed (${response.status}): ${errorReason}` };
}

const assistantOutputItem = response.output?.find(
  (item: any): item is OpenAI.Responses.ResponseInputMessageItem =>
    item.type === "message" && item.role === "assistant" && "content" in item
) as OpenAI.Responses.ResponseInputMessageItem | undefined;


let textContentItem: ResponseApiOutputTextPart | undefined;
if (assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
  textContentItem = assistantOutputItem.content.find(
    (part: any): part is ResponseApiOutputTextPart =>
      part.type === "output_text"
  ) as ResponseApiOutputTextPart | undefined;
}


const finishReason = response.status === "completed" ? "stop" : response.incomplete_details?.reason || response.status;
logger.debug(`[LLM Clients JSON] Success (${duration}ms). Finish: ${finishReason}. Usage: ${JSON.stringify(response.usage)}. ${logSuffix}`);


if (!textContentItem || typeof textContentItem.text !== 'string') {
  const refusalPart = (assistantOutputItem?.content as any[])?.find((p: any) => p.type === 'refusal');
  if (refusalPart) {
    logger.error(`[LLM Clients JSON] Model refused: ${refusalPart.refusal}. Schema: ${schemaName}. ${logSuffix}`);
    return { error: `JSON generation refused: ${refusalPart.refusal}` };
  }
  logger.error(`[LLM Clients JSON] No 'output_text' in response. ${logSuffix}. Output:`, JSON.stringify(response.output).substring(0, 500));
  return { error: "JSON generation failed (no text output)." };
}
const responseText: string = textContentItem.text;


if (finishReason === "max_output_tokens") {
  logger.error(`[LLM Clients JSON] Truncated JSON due to max_output_tokens. ${logSuffix}`);
  const partialResult = safeJsonParse<Partial<T>>(responseText);
  if (schemaName === "minato_tool_router_v1_1" && (partialResult as any)?.planned_tools) {
    if (SchemaService.validate(schemaName, partialResult)) {
        return partialResult as T;
    }
    logger.warn(`[LLM Clients JSON] Partial tool router output failed schema validation. Raw: ${responseText.substring(0,300)}`);
  }
  if (partialResult && SchemaService.validate(schemaName, partialResult)) return partialResult as T; 
  return { error: `JSON generation failed (truncated due to max_output_tokens, and partial result is invalid for schema '${schemaName}'). Finish: ${finishReason}` };
}


const result = safeJsonParse<any>(responseText);
if (!result || typeof result !== "object") {
  logger.warn(`[LLM Clients JSON] Parsed non-object/null for schema ${schemaName}. Type: ${typeof result}. Raw: ${responseText.substring(0, 300)}. ${logSuffix}`);
  return { error: `JSON parsing yielded ${typeof result}. Expected object for schema ${schemaName}.` };
}

if (!SchemaService.validate(schemaName, result)) {
    logger.error(`[LLM Clients JSON] Output for schema '${schemaName}' FAILED final validation by SchemaService. ${logSuffix}. Data: ${responseText.substring(0,300)}`);
    return { error: `Generated JSON does not conform to the schema '${schemaName}'.` };
}

if (schemaName === "minato_tool_router_v1_1") {
  if (result.planned_tools && Array.isArray(result.planned_tools)) {
    return result.planned_tools as T; 
  } else {
    logger.error(`[LLM Clients JSON] Tool router schema '${schemaName}' parsed, but 'planned_tools' array is missing. ${logSuffix}. Data: ${responseText.substring(0,300)}`);
    return { error: "Tool router response structure missing 'planned_tools'." };
  }
}

return result as T;

} catch (error: any) {
  let errorMessage = "Structured JSON generation error.";
  if ((error as any).status && (error as any).message) {
    errorMessage = `OpenAI API Error for JSON Gen (${(error as any).status} ${(error as any).code || "N/A"}): ${(error as any).message}`;
  } else if (error.message) {
    errorMessage = error.message;
  }
  let schemaForLogError = JSON.parse(JSON.stringify(jsonSchema));
  if (schemaName === "minato_tool_router_v1_1" && schemaForLogError.type === "object" && schemaForLogError.properties?.planned_tools?.type === "array") {
  } else if (schemaForLogError.type === "object" && schemaForLogError.additionalProperties !== false) {
    schemaForLogError.additionalProperties = false;
  }
  logger.error(`[LLM Clients JSON] Exception: ${errorMessage}. ${logSuffix}`, { originalError: error, schemaName, schemaUsedForCall: schemaForLogError });
  return { error: errorMessage };
}
}
export async function generateAgentResponse(
messages: ChatMessage[],
responsesApiTools: OpenAI.Chat.Completions.ChatCompletionTool[] | null,
responsesApiToolChoice: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | "auto" | "none" | string | null,
modelName: string = CHAT_VISION_MODEL_NAME,
maxTokens?: number,
userId?: string,
instructions?: string | null
): Promise<{
responseContent: string | AppChatMessageContentPart[] | null;
toolCalls: SdkFunctionCallOutputItem[] | null;
finishReason: string | undefined;
usage?: CompletionUsage | null;
error?: string | null;
}> {
if (!openai?.responses) { return { responseContent: null, toolCalls: null, finishReason: "error", error: "OpenAI client not initialized." }; }
const logSuffix = `User:${userId ? userId.substring(0, 8) : "N/A"} Model:${modelName}`;
try {
if (!messages || messages.length === 0) return { responseContent: null, toolCalls: null, finishReason: "error", error: "No messages provided to generateAgentResponse." };
const apiInputItems = await formatMessagesForResponsesApi(messages, userId);


if (apiInputItems.length === 0 && !instructions) {
  return { responseContent: null, toolCalls: null, finishReason: "error", error: "No processable messages or instructions for API." };
}


const requestPayload: OpenAI.Responses.ResponseCreateParams = {
  model: modelName,
  input: apiInputItems,
  instructions: instructions || undefined,
  max_output_tokens: maxTokens ?? MAX_OUTPUT_TOKENS,
  store: appConfig.nodeEnv !== "production",
  temperature: appConfig.llm.temperature ?? 0.7,
};
if (userId) requestPayload.user = userId;
if (responsesApiTools && responsesApiTools.length > 0) {
  requestPayload.tools = responsesApiTools as any;
}
if (responsesApiToolChoice) {
  requestPayload.tool_choice = responsesApiToolChoice as OpenAI.Responses.ResponseCreateParams['tool_choice'];
}


const start = Date.now();
const responseRaw = await openai.responses.create(requestPayload);
const response = responseRaw as any; // Cast to any for easier access
const duration = Date.now() - start;


if (response.status === "failed" || response.status === "incomplete") {
  const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown API error";
  const apiUsage = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null;
  logger.error(`[LLM Clients Agent] API Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`);
  return { responseContent: null, toolCalls: null, finishReason: response.status, error: `Agent API error (${response.status}): ${errorReason}`, usage: apiUsage };
}


let finalAssistantContent: string | AppChatMessageContentPart[] | null = null;
const assistantOutputItem = response.output?.find(
  (item: any): item is OpenAI.Responses.ResponseInputMessageItem =>
    item.type === "message" && item.role === "assistant" && "content" in item
);


if (assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
  const appContentParts: AppChatMessageContentPart[] = [];
  let allPartsAreText = true;
  for (const part of assistantOutputItem.content as ResponseApiContentPart[]) { // Content parts are ResponseApiContentPart
    if (part.type === "output_text" && typeof part.text === 'string') {
      appContentParts.push({ type: "text", text: part.text } as AppChatMessageContentPartText);
    } else if ((part as any).type === 'refusal' && typeof (part as any).refusal === 'string') {
      appContentParts.push({ type: "text", text: `[Assistant Refusal: ${(part as any).refusal}]` } as AppChatMessageContentPartText);
      allPartsAreText = false;
    } else {
      allPartsAreText = false;
      logger.warn(`[LLM Clients Agent] Unhandled assistant output content part type: ${(part as any).type}. ${logSuffix}`);
    }
  }


  if (appContentParts.length > 0) {
    if (allPartsAreText && appContentParts.every(p => p.type === 'text')) {
      finalAssistantContent = (appContentParts as AppChatMessageContentPartText[]).map(p => p.text).join("\n").trim();
      if (finalAssistantContent === "") finalAssistantContent = null;
    } else {
      finalAssistantContent = appContentParts;
    }
  }
} else if (assistantOutputItem && assistantOutputItem.content === null) {
  finalAssistantContent = null;
} else if (assistantOutputItem && typeof assistantOutputItem.content === 'string') {
  finalAssistantContent = assistantOutputItem.content.trim();
  if (finalAssistantContent === "") finalAssistantContent = null;
}


const extractedSdkFunctionCalls = response.output?.filter(
  (item: any): item is SdkFunctionCallOutputItem => item.type === "function_call"
);


const finishReasonResult = response.status === "completed" ? (extractedSdkFunctionCalls && extractedSdkFunctionCalls.length > 0 ? "tool_calls" : "stop") : response.incomplete_details?.reason || response.status;
const mappedUsage: CompletionUsage | null = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null;


logger.debug(`[LLM Clients Agent] Success (${duration}ms). Finish: ${finishReasonResult}. Content: ${!!finalAssistantContent}. Function Calls: ${extractedSdkFunctionCalls?.length ?? 0}. Usage: ${JSON.stringify(mappedUsage)}. ${logSuffix}`);
return {
  responseContent: finalAssistantContent,
  toolCalls: extractedSdkFunctionCalls && extractedSdkFunctionCalls.length > 0 ? extractedSdkFunctionCalls : null,
  finishReason: finishReasonResult,
  usage: mappedUsage,
  error: null
};

} catch (error: any) {
  let errorMessage = "Agent response generation error.";
  if ((error as any).status && (error as any).message) {
    errorMessage = `OpenAI API Error for Agent (${(error as any).status} ${(error as any).code || "N/A"}): ${(error as any).message}`;
  } else if (error.message) {
    errorMessage = error.message;
  }
  const requestPayloadStringOnError = (error as any).request?.body ? JSON.stringify((error as any).request.body).substring(0, 300) : "N/A";
  logger.error(`[LLM Clients Agent] Exception: ${errorMessage}. ${logSuffix}`, { originalError: error, requestPayloadString: requestPayloadStringOnError });
  return { responseContent: null, toolCalls: null, finishReason: "error", error: errorMessage };
}
}
export async function generateResponseWithIntent(
instructions: string,
userPrompt: string | AppChatMessageContentPart[],
history: ChatMessage[] = [],
modelName: string = CHAT_VISION_MODEL_NAME,
maxTokens?: number,
userId?: string
): Promise<{ responseText: string; intentType: string } | { error: string }> {
const logSuffix = `User:${userId ? userId.substring(0, 8) : "N/A"} Model:${modelName}`;
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
const schemaNameForIntent = "minato_intent_response_v4_gpt4o";
let stringUserInputForJson: string;
if (typeof userPrompt === 'string') {
stringUserInputForJson = userPrompt;
} else {
stringUserInputForJson = userPrompt.map(part => {
if (part.type === 'text') return part.text;
if (part.type === 'input_image') return "[Image was provided by user]";
return "[Unknown content part]";
}).join(" ");
}
const textHistoryForJson = history.filter(m => typeof m.content === 'string' || (Array.isArray(m.content) && m.content.some(p => p.type === 'text')));
const result = await generateStructuredJson<{ responseText: string; intentType: string }>(
instructions, stringUserInputForJson, intentSchema, schemaNameForIntent,
textHistoryForJson, modelName, userId
);
if ("error" in result) {
logger.error(`[LLM Clients Intent] Structured JSON for intent failed: ${result.error}. ${logSuffix}. Falling back for text response only.`);
const fallbackMessages: ChatMessage[] = [...history, { role: "user", content: userPrompt, timestamp: Date.now() }];
const fallbackAgentResult = await generateAgentResponse(
fallbackMessages, null, null, modelName, maxTokens, userId, instructions
);
if (fallbackAgentResult.responseContent) {
logger.warn(`[LLM Clients Intent] Fallback to plain text response due to JSON error. Intent set to 'neutral'.`);
let responseTextOnly: string;
if (typeof fallbackAgentResult.responseContent === 'string') {
responseTextOnly = fallbackAgentResult.responseContent;
} else if (Array.isArray(fallbackAgentResult.responseContent)) {
responseTextOnly = (fallbackAgentResult.responseContent.find(p => p.type === 'text') as AppChatMessageContentPartText | undefined)?.text || "[Could not extract text from multimodal fallback]";
} else {
responseTextOnly = "[Unexpected fallback content type]";
}
return { responseText: responseTextOnly, intentType: "neutral" };
}
return { error: result.error + " (Fallback also failed to produce text)" };
}
if (!result.responseText?.trim()) {
logger.error(`[LLM Clients Intent] responseText became empty. LLM likely returned ONLY the JSON object. Prompting needs refinement. Original result:`, result);
return { error: "LLM returned only JSON structure, no conversational text." };
}
return result;
}
export async function generateVisionCompletion(
messages: ChatMessage[],
modelName: string = CHAT_VISION_MODEL_NAME,
maxTokens?: number,
userId?: string
): Promise<{ text: string | null; error?: string | null; usage?: CompletionUsage | null }> {
const logSuffix = `User:${userId ? userId.substring(0, 8) : "N/A"} Model:${modelName}`;
logger.debug(`[LLM Clients Vision] Generating vision completion. ${logSuffix}`);
const hasImage = messages.some(msg =>
Array.isArray(msg.content) &&
msg.content.some(part =>
(part.type === "input_image" && typeof part.image_url === 'string' && (part.image_url.startsWith('http') || part.image_url.startsWith('data:image')))
)
);
if (!hasImage) {
logger.warn(`[LLM Clients Vision] No valid http/data image content found for vision analysis. ${logSuffix}`);
return { text: null, error: "No valid image content provided for vision analysis." };
}
const visionInstructions = "You are Minato, an AI assistant. Analyze the provided image(s) in detail and describe what you see. If text is provided with the image(s), consider it as part of the query or context for the analysis. Be descriptive and engaging.";
const agentResult = await generateAgentResponse(
messages, null, null, modelName, maxTokens ?? MAX_VISION_TOKENS, userId, visionInstructions
);
if (agentResult.error) {
return { text: null, error: agentResult.error, usage: agentResult.usage };
}
if (agentResult.responseContent === null && agentResult.finishReason !== "stop") {
logger.warn(`[LLM Clients Vision] Model returned no text, finish_reason: ${agentResult.finishReason}. ${logSuffix}`);
}
let visionTextResult: string | null = null;
if (typeof agentResult.responseContent === 'string') {
visionTextResult = agentResult.responseContent;
} else if (Array.isArray(agentResult.responseContent)) {
const textPart = agentResult.responseContent.find(p => p.type === 'text') as AppChatMessageContentPartText | undefined;
visionTextResult = textPart?.text || null;
}
return { text: visionTextResult, error: null, usage: agentResult.usage };
}
export { openai as rawOpenAiClient };

/**
 * Resolves a potentially non-English or aliased tool name to its canonical English name using the LLM.
 * @param givenToolName The tool name provided by the LLM router or user.
 * @param canonicalToolNames A list of valid, canonical tool names registered in the system.
 * @param userId Optional user ID for logging/context.
 * @returns The resolved canonical tool name and confidence, or just the resolved name if LLM fails.
 */
export async function resolveToolNameWithLLM(
  givenToolName: string,
  canonicalToolNames: string[],
  userId?: string
): Promise<{ resolved_tool_name: string; confidence: string } | string> {
  const logSuffix = `User:${userId ? userId.substring(0, 8) : "N/A"} GivenName:${givenToolName}`;
  logger.info(`[LLM Clients ToolResolve] Attempting to resolve tool name: "${givenToolName}". Available: [${canonicalToolNames.join(", ")}]. ${logSuffix}`);

  // Simple direct match or common alias check first
  const lowerGivenName = givenToolName.toLowerCase();
  for (const canonicalName of canonicalToolNames) {
    if (canonicalName.toLowerCase() === lowerGivenName) {
      logger.debug(`[LLM Clients ToolResolve] Direct/lowercase match found: "${givenToolName}" -> "${canonicalName}". ${logSuffix}`);
      return { resolved_tool_name: canonicalName, confidence: "high" };
    }
  }

  const schema = {
    type: "object" as const,
    properties: {
      resolved_tool_name: {
        type: "string" as const,
        enum: canonicalToolNames,
        description: "The closest matching canonical tool name from the provided list.",
      },
      confidence: {
        type: "string" as const,
        enum: ["high", "medium", "low", "none"],
        description: "Confidence level of the match. 'none' if no good match found."
      }
    },
    required: ["resolved_tool_name", "confidence"],
    additionalProperties: false,
  };
  const schemaName = "minato_tool_name_resolver_v1";

  const instructions = `You are an expert multilingual tool name resolver. Given a potentially non-English or aliased tool name and a list of valid canonical English tool names, identify the single best matching canonical tool name.\nThe user (or another AI) provided the tool name: "${givenToolName}".\nThe available canonical English tool names are:\n${canonicalToolNames.map(name => `- ${name}`).join("\n")}\nIf you find a very strong match, set confidence to "high". If it's a plausible match, "medium". If it's a weak guess, "low". If no reasonable match is found, set confidence to "none" and pick any one of the canonical names as a fallback for resolved_tool_name (or the first one). Respond ONLY with the JSON object matching the schema.`;

  // Use a fast/cheap model for extraction
  try {
    const result = await (await import("./llm_clients")).generateStructuredJson<{ resolved_tool_name: string; confidence: string }>(
      instructions,
      `Resolve tool name: "${givenToolName}"`,
      schema,
      schemaName,
      [],
      appConfig.openai.extractionModel,
      userId
    );
    if (typeof result === "object" && "resolved_tool_name" in result && "confidence" in result) {
      logger.info(`[LLM Clients ToolResolve] Resolved "${givenToolName}" to "${result.resolved_tool_name}" with ${result.confidence} confidence. ${logSuffix}`);
      return result;
    } else {
      logger.error(`[LLM Clients ToolResolve] LLM did not return expected object. Fallback to first canonical. ${logSuffix}`);
      return canonicalToolNames[0];
    }
  } catch (e: any) {
    logger.error(`[LLM Clients ToolResolve] Exception during LLM tool name resolution: ${e.message}. Fallback to first canonical. ${logSuffix}`);
    return canonicalToolNames[0];
  }
}

/**
 * Generates a multi-tool chain-of-thought plan using the OpenAI API
 * @param userQuery - User query to plan for
 * @param chatHistorySummary - Summary of chat history for context
 * @param personaCustomization - Persona customization information
 * @param userStateSummary - Summary of user state
 * @param availableToolsStringified - String representation of available tools
 * @param nluAnalysis - Optional NLU analysis results
 * @param userId - Optional user ID for logging
 * @returns Promise resolving to the chain of thought plan or an error
 */
export async function generateMultiToolCotPlan(
  userQuery: string,
  chatHistorySummary: string,
  personaCustomization: string | null,
  userStateSummary: string | null,
  availableToolsStringified: string,
  nluAnalysis: string | null = null,
  userId?: string
): Promise<{ plan: any; error?: string | null }> {
  const logPrefix = `[MultiToolCotPlanner User:${userId?.substring(0, 8) || "N/A"}]`;
  logger.info(`${logPrefix} Generating multi-tool CoT plan for: "${userQuery.substring(0, 50)}..."`);
  
  try {
    // Prepare the prompt
    const prompt = injectPromptVariables(MINATO_MULTI_TOOL_COT_PROMPT_TEMPLATE, {
      userQuery,
      chatHistorySummary: chatHistorySummary || "No recent conversation history.",
      personaCustomization: personaCustomization || `Minato is a helpful, friendly AI assistant.`,
      userStateSummary: userStateSummary || "No specific user state information available.",
      currentUtcTime: new Date().toISOString(),
      availableToolsStringified,
      nluAnalysis: nluAnalysis || "No NLU analysis available."
    });
    
    // Call the OpenAI API
    const systemPrompt = "You are Minato's advanced Chain-of-Thought planning system. Your task is to create detailed, structured XML plans for complex user requests that involve multiple intents.";
    
    // Use a custom type that matches the actual return type of generateStructuredJson
    const cotPlanOutput = await generateAgentResponse(
      [{ role: "user", content: prompt }],
      null,
      null,
      PLANNING_MODEL_NAME,
      undefined,
      userId,
      systemPrompt
    );
    
    // Parse the result
    if (cotPlanOutput.responseContent && typeof cotPlanOutput.responseContent === 'string') {
      // Return the raw response content as the plan
      logger.info(`${logPrefix} Successfully generated multi-tool CoT plan`);
      return { plan: cotPlanOutput.responseContent };
    } else if (cotPlanOutput.error) {
      logger.warn(`${logPrefix} Error generating CoT plan: ${cotPlanOutput.error}`);
      return { plan: null, error: cotPlanOutput.error };
    } else {
      logger.warn(`${logPrefix} Unexpected response format from CoT planner`);
      return { plan: null, error: "Unexpected response format from planning system" };
    }
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error generating CoT plan";
    logger.error(`${logPrefix} Exception: ${errorMessage}`, error);
    return { plan: null, error: errorMessage };
  }
}

/**
 * Classifies a user query to determine if it needs multi-tool processing
 * @param userQuery - User query to classify
 * @param chatHistorySummary - Summary of chat history for context
 * @param personaCustomization - Persona customization information
 * @param userId - Optional user ID for logging
 * @returns Promise resolving to the query classification
 */
export async function classifyQueryForMultiToolProcessing(
  userQuery: string,
  chatHistorySummary: string,
  personaCustomization: string | null,
  userId?: string
): Promise<{ classification: XmlClassification | null; error?: string | null }> {
  const logPrefix = `[QueryClassifier User:${userId?.substring(0, 8) || "N/A"}]`;
  logger.info(`${logPrefix} Classifying query: "${userQuery.substring(0, 50)}..."`);
  
  try {
    // Prepare the prompt
    const prompt = injectPromptVariables(MINATO_QUERY_NATURE_CLASSIFIER_PROMPT_TEMPLATE, {
      userQuery,
      chatHistorySummary: chatHistorySummary || "No recent conversation history.",
      personaCustomization: personaCustomization || `Minato is a helpful, friendly AI assistant.`
    });
    
    // Call the OpenAI API
    const systemPrompt = "You are Minato's query classifier system. Your task is to analyze a user query and determine the optimal processing approach, especially identifying multi-intent queries that require chain-of-thought planning.";
    
    // Use a custom type that matches the actual return type of generateStructuredJson
    const classificationOutput = await generateAgentResponse(
      [{ role: "user", content: prompt }],
      null,
      null,
      PLANNING_MODEL_NAME,
      undefined,
      userId,
      systemPrompt
    );
    
    // Parse the result
    if (classificationOutput.responseContent && typeof classificationOutput.responseContent === 'string') {
      // Return a basic classification since xml-processor is not available
      logger.info(`${logPrefix} Query classification generated`);
      return { 
        classification: {
          category: "tool_execution",
          confidence: "medium",
          reasoning: "Classification performed without XML parsing",
          complexity: "moderate",
          time_sensitivity: "standard",
          parallel_opportunity: "medium",
          suggested_approach: {
            primary_method: "tool_router",
            fallback_method: "direct_llm",
            explanation: "Using tool router as primary approach"
          }
        } as XmlClassification
      };
    } else if (classificationOutput.error) {
      logger.warn(`${logPrefix} Error classifying query: ${classificationOutput.error}`);
      return { classification: null, error: classificationOutput.error };
    } else {
      logger.warn(`${logPrefix} Unexpected response format from classifier`);
      return { classification: null, error: "Unexpected response format from classification system" };
    }
  } catch (error: any) {
    const errorMessage = error.message || "Unknown error classifying query";
    logger.error(`${logPrefix} Exception: ${errorMessage}`, error);
    return { classification: null, error: errorMessage };
  }
}

/**
 * Generates a structured skill learning plan using multiple tools in parallel
 * @param userQuery User's skill learning query
 * @param chatHistorySummary Summary of conversation history
 * @param personaCustomization Persona customization information
 * @param userStateSummary User state summary
 * @param availableToolsStringified Available tools in string format
 * @param userId User ID for tracking
 * @returns Parsed XML skill learning plan
 */
export async function generateAdvancedSkillLearningPlan(
  userQuery: string,
  chatHistorySummary: string,
  personaCustomization: string | null,
  userStateSummary: string | null,
  availableToolsStringified: string,
  userId?: string
): Promise<{ plan: any; error?: string | null }> {
  const logPrefix = `[SkillLearningPlan${userId ? ` User:${userId.substring(0, 8)}` : ''}]`;
  
  try {
    logger.info(`${logPrefix} Generating advanced skill learning plan for query: "${userQuery.substring(0, 50)}..."`);
    
    // Prepare the prompt with variables injected
    const prompt = injectPromptVariables(ADVANCED_SKILL_LEARNING_PROMPT_TEMPLATE, {
      userQuery,
      chatHistorySummary: chatHistorySummary || "No recent conversation history.",
      personaCustomization: personaCustomization || "No specific persona customization.",
      userStateSummary: userStateSummary || "No specific user state.",
      availableToolsStringified: availableToolsStringified || "No tools available.",
    });
    
    // Generate the plan using the planning model
    const response = await openai.chat.completions.create({
      model: PLANNING_MODEL_NAME,
      messages: [
        { role: "system", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      logger.error(`${logPrefix} No response generated from OpenAI`);
      return { plan: null, error: "Failed to generate skill learning plan" };
    }
    
    const content = response.choices[0].message.content;
    if (!content) {
      logger.error(`${logPrefix} Empty content in response`);
      return { plan: null, error: "Empty response content" };
    }
    
    // Extract and parse the XML plan
    // Extract the skill learning plan XML using regular expressions
    const xmlMatch = /<skill_learning_plan>([\s\S]*?)<\/skill_learning_plan>/i.exec(content);
    if (!xmlMatch || !xmlMatch[0]) {
      logger.error(`${logPrefix} No skill learning plan XML found in response`);
      return { plan: null, error: "No skill learning plan XML found in response" };
    }
    
    const xmlContent = xmlMatch[0];
    logger.info(`${logPrefix} Successfully generated skill learning plan XML`);
    
    // Return the XML content as the plan since xml-processor is not available
    logger.info(`${logPrefix} Returning skill learning plan content`);
    return { plan: xmlContent };
  } catch (error) {
    logger.error(`${logPrefix} Error generating skill learning plan:`, error);
    return { 
      plan: null, 
      error: error instanceof Error ? error.message : "Unknown error generating skill learning plan" 
    };
  }
}

/**
 * Generates a structured news aggregator plan using multiple tools in parallel
 * @param userQuery User's news-related query
 * @param chatHistorySummary Summary of conversation history
 * @param personaCustomization Persona customization information
 * @param userStateSummary User state summary
 * @param availableToolsStringified Available tools in string format
 * @param userId User ID for tracking
 * @returns Parsed XML news aggregator plan
 */
export async function generateNewsAggregatorPlan(
  userQuery: string,
  chatHistorySummary: string,
  personaCustomization: string | null,
  userStateSummary: string | null,
  availableToolsStringified: string,
  userId?: string
): Promise<{ plan: any; error?: string | null }> {
  const logPrefix = `[NewsAggregatorPlan${userId ? ` User:${userId.substring(0, 8)}` : ''}]`;
  
  try {
    logger.info(`${logPrefix} Generating news aggregator plan for query: "${userQuery.substring(0, 50)}..."`);
    
    // Prepare the prompt with variables injected
    const prompt = injectPromptVariables(ADVANCED_NEWS_AGGREGATOR_PROMPT_TEMPLATE, {
      userQuery,
      chatHistorySummary: chatHistorySummary || "No recent conversation history.",
      personaCustomization: personaCustomization || "No specific persona customization.",
      userStateSummary: userStateSummary || "No specific user state.",
      availableToolsStringified: availableToolsStringified || "No tools available.",
    });
    
    // Generate the plan using the planning model
    const response = await openai.chat.completions.create({
      model: PLANNING_MODEL_NAME,
      messages: [
        { role: "system", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      logger.error(`${logPrefix} No response generated from OpenAI`);
      return { plan: null, error: "Failed to generate news aggregator plan" };
    }
    
    const content = response.choices[0].message.content;
    if (!content) {
      logger.error(`${logPrefix} Empty content in response`);
      return { plan: null, error: "Empty response content" };
    }
    
    // Extract the news deep dive plan XML using regular expressions
    const xmlMatch = /<news_deep_dive_plan>([\s\S]*?)<\/news_deep_dive_plan>/i.exec(content);
    if (!xmlMatch || !xmlMatch[0]) {
      logger.error(`${logPrefix} No news deep dive plan XML found in response`);
      return { plan: null, error: "No news deep dive plan XML found in response" };
    }
    
    const xmlContent = xmlMatch[0];
    logger.info(`${logPrefix} Successfully generated news deep dive plan XML`);
    
    // Return the XML content as the plan since xml-processor is not available
    logger.info(`${logPrefix} Returning news deep dive plan content`);
    return { plan: xmlContent };
  } catch (error) {
    logger.error(`${logPrefix} Error generating news aggregator plan:`, error);
    return { 
      plan: null, 
      error: error instanceof Error ? error.message : "Unknown error generating news aggregator plan" 
    };
  }
}

/**
 * Generates proactive life improvement suggestions based on user memory and patterns
 * @param userMemoryContext User memory context from memory framework
 * @param chatHistorySummary Summary of conversation history
 * @param personaCustomization Persona customization information
 * @param userStateSummary User state summary
 * @param currentDateTime Current date and time string
 * @param availableToolsStringified Available tools in string format
 * @param userId User ID for tracking
 * @returns Parsed XML proactive suggestion plan
 */
export async function generateProactiveLifeImprovementSuggestions(
  userMemoryContext: string,
  chatHistorySummary: string,
  personaCustomization: string | null,
  userStateSummary: string | null,
  currentDateTime: string,
  availableToolsStringified: string,
  userId?: string
): Promise<{ plan: any; error?: string | null }> {
  const logPrefix = `[ProactiveSuggestions${userId ? ` User:${userId.substring(0, 8)}` : ''}]`;
  
  try {
    logger.info(`${logPrefix} Generating proactive life improvement suggestions`);
    
    // Prepare the prompt with variables injected
    const prompt = injectPromptVariables(PROACTIVE_LIFE_IMPROVER_PROMPT_TEMPLATE, {
      userMemoryContext: userMemoryContext || "No specific memory context available.",
      chatHistorySummary: chatHistorySummary || "No recent conversation history.",
      personaCustomization: personaCustomization || "No specific persona customization.",
      userStateSummary: userStateSummary || "No specific user state.",
      currentDateTime: currentDateTime || new Date().toISOString(),
      availableToolsStringified: availableToolsStringified || "No tools available.",
    });
    
    // Generate the plan using the planning model
    const response = await openai.chat.completions.create({
      model: PLANNING_MODEL_NAME,
      messages: [
        { role: "system", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      logger.error(`${logPrefix} No response generated from OpenAI`);
      return { plan: null, error: "Failed to generate proactive suggestions" };
    }
    
    const content = response.choices[0].message.content;
    if (!content) {
      logger.error(`${logPrefix} Empty content in response`);
      return { plan: null, error: "Empty response content" };
    }
    
    // Extract the proactive suggestion plan XML using regular expressions
    const xmlMatch = /<proactive_suggestion_plan>([\s\S]*?)<\/proactive_suggestion_plan>/i.exec(content);
    if (!xmlMatch || !xmlMatch[0]) {
      logger.error(`${logPrefix} No proactive suggestion plan XML found in response`);
      return { plan: null, error: "No proactive suggestion plan XML found in response" };
    }
    
    const xmlContent = xmlMatch[0];
    logger.info(`${logPrefix} Successfully generated proactive suggestion plan XML`);
    
    // Return the XML content as the plan since xml-processor is not available
    logger.info(`${logPrefix} Returning proactive suggestion plan content`);
    return { plan: xmlContent };
  } catch (error) {
    logger.error(`${logPrefix} Error generating proactive suggestions:`, error);
    return { 
      plan: null, 
      error: error instanceof Error ? error.message : "Unknown error generating proactive suggestions" 
    };
  }
}

/**
 * Generate enhanced reasoning explanation for a complex query and tool execution
 * @param userQuery User query that initiated the process
 * @param chatHistorySummary Summary of the conversation history
 * @param personaCustomization User's persona customization preferences
 * @param userStateSummary Summary of user state
 * @param toolResultsSummary Summary of tool results
 * @param parallelToolsUsed Information about parallel tools used
 * @param language Language code
 * @param userId Optional user ID for tracking
 * @returns Enhanced reasoning explanation in XML format or error
 */
export async function generateEnhancedReasoning(
  userQuery: string,
  chatHistorySummary: string,
  personaCustomization: string | null,
  userStateSummary: string | null,
  toolResultsSummary: string,
  parallelToolsUsed: string,
  language: string = "en",
  userId?: string
): Promise<{ reasoning: any; error?: string | null }> {
  const logPrefix = `[EnhancedReasoning${userId ? ` User:${userId.substring(0, 8)}` : ''}]`;
  
  try {
    // Import the template
    const { ENHANCED_REASONING_RESPONSE_PROMPT_TEMPLATE } = require('../prompts');
    
    // Prepare the prompt with variables
    const prompt = injectPromptVariables(ENHANCED_REASONING_RESPONSE_PROMPT_TEMPLATE, {
      userQuery,
      chatHistorySummary,
      personaCustomization: personaCustomization || "Helpful, friendly AI assistant",
      userStateSummary: userStateSummary || "",
      toolResultsSummary,
      parallelToolsUsed,
      language
    });
    
    logger.info(`${logPrefix} Generating enhanced reasoning for query: "${userQuery.substring(0, 50)}..."`);
    
    // Call OpenAI with the prompt
    const response = await openai.chat.completions.create({
      model: PLANNING_MODEL_NAME,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate enhanced reasoning for this query and tool results." }
      ],
      temperature: 0.7,
      max_tokens: 1200,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
    
    const reasoningText = response.choices[0]?.message?.content;
    
    if (!reasoningText) {
      logger.warn(`${logPrefix} No reasoning generated`);
      return { reasoning: null, error: "No reasoning was generated" };
    }
    
    // Return the raw reasoning text since xml-processor is not available
    logger.info(`${logPrefix} Returning enhanced reasoning content`);
    return { reasoning: reasoningText };
  } catch (error: any) {
    logger.error(`${logPrefix} Error generating enhanced reasoning:`, error);
    return { reasoning: null, error: error.message };
  }
}

/**
 * Generate multi-tool orchestration explanation
 * @param userQuery User query that initiated the process
 * @param toolsUsed Structured information about the tools used
 * @param executionPattern Description of how tools were executed (sequential, parallel, etc)
 * @param personaCustomization User's persona customization preferences
 * @param language Language code
 * @param userId Optional user ID for tracking
 * @returns Multi-tool orchestration explanation in XML format or error
 */
export async function generateMultiToolOrchestrationExplanation(
  userQuery: string,
  toolsUsed: string,
  executionPattern: string,
  personaCustomization: string | null,
  language: string = "en",
  userId?: string
): Promise<{ explanation: any; error?: string | null }> {
  const logPrefix = `[OrchestrationExplanation${userId ? ` User:${userId.substring(0, 8)}` : ''}]`;
  
  try {
    // Import the template
    const { MULTI_TOOL_ORCHESTRATION_EXPLANATION_TEMPLATE } = require('../prompts');
    
    // Prepare the prompt with variables
    const prompt = injectPromptVariables(MULTI_TOOL_ORCHESTRATION_EXPLANATION_TEMPLATE, {
      userQuery,
      toolsUsed,
      executionPattern,
      personaCustomization: personaCustomization || "Helpful, friendly AI assistant",
      language
    });
    
    logger.info(`${logPrefix} Generating multi-tool orchestration explanation for query: "${userQuery.substring(0, 50)}..."`);
    
    // Call OpenAI with the prompt
    const response = await openai.chat.completions.create({
      model: PLANNING_MODEL_NAME,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate a multi-tool orchestration explanation for this query and tool usage." }
      ],
      temperature: 0.7,
      max_tokens: 800,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
    
    const explanationText = response.choices[0]?.message?.content;
    
    if (!explanationText) {
      logger.warn(`${logPrefix} No explanation generated`);
      return { explanation: null, error: "No explanation was generated" };
    }
    
    // Return the raw explanation text since xml-processor is not available
    logger.info(`${logPrefix} Returning orchestration explanation content`);
    return { explanation: explanationText };
  } catch (error: any) {
    logger.error(`${logPrefix} Error generating multi-tool orchestration explanation:`, error);
    return { explanation: null, error: error.message };
  }
}

/**
 * Generate reasoning for UI cards when displaying tool results
 * @param userQuery User query that initiated the process
 * @param toolName Name of the tool
 * @param toolPurpose Purpose/description of the tool
 * @param toolResultSummary Summary of the tool's results
 * @param otherToolsUsed Information about other tools used in this orchestration
 * @param personaCustomization User's persona customization preferences
 * @param language Language code
 * @param userId Optional user ID for tracking
 * @returns UI card reasoning content in XML format or error
 */
export async function generateUICardReasoning(
  userQuery: string,
  toolName: string,
  toolPurpose: string,
  toolResultSummary: string,
  otherToolsUsed: string,
  personaCustomization: string | null,
  language: string = "en",
  userId?: string
): Promise<{ cardContent: any; error?: string | null }> {
  const logPrefix = `[UICardReasoning${userId ? ` User:${userId.substring(0, 8)}` : ''}]`;
  
  try {
    // Import the template
    const { REASONING_UI_CARD_TEMPLATE } = require('../prompts');
    
    // Prepare the prompt with variables
    const prompt = injectPromptVariables(REASONING_UI_CARD_TEMPLATE, {
      userQuery,
      toolName,
      toolPurpose,
      toolResultSummary,
      otherToolsUsed,
      personaCustomization: personaCustomization || "Helpful, friendly AI assistant",
      language
    });
    
    logger.info(`${logPrefix} Generating UI card reasoning for tool: "${toolName}" and query: "${userQuery.substring(0, 30)}..."`);
    
    // Call OpenAI with the prompt
    const response = await openai.chat.completions.create({
      model: PLANNING_MODEL_NAME,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Generate UI card reasoning for the ${toolName} tool.` }
      ],
      temperature: 0.7,
      max_tokens: 300,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
    
    const cardContentText = response.choices[0]?.message?.content;
    
    if (!cardContentText) {
      logger.warn(`${logPrefix} No UI card content generated`);
      return { cardContent: null, error: "No UI card content was generated" };
    }
    
    // Return the raw card content text since xml-processor is not available
    logger.info(`${logPrefix} Returning UI card reasoning content`);
    return { cardContent: cardContentText };
  } catch (error: any) {
    logger.error(`${logPrefix} Error generating UI card reasoning:`, error);
    return { cardContent: null, error: error.message };
  }
}

/**
 * Generates a learning progression plan for continuing a learning series
 * @param learningTopic Learning topic to continue
 * @param previousInteractions Previous interactions summary
 * @param chatHistorySummary Summary of conversation history
 * @param personaCustomization Persona customization information
 * @param userStateSummary User state summary
 * @param availableToolsStringified Available tools in string format
 * @param userId User ID for tracking
 * @returns Parsed XML learning progression plan
 */
export async function generateLearningProgressionPlan(
  learningTopic: string,
  previousInteractions: string,
  chatHistorySummary: string,
  personaCustomization: string | null,
  userStateSummary: string | null,
  availableToolsStringified: string,
  userId?: string
): Promise<{ plan: any; error?: string | null }> {
  const logPrefix = `[LearningProgression${userId ? ` User:${userId.substring(0, 8)}` : ''}]`;
  
  try {
    logger.info(`${logPrefix} Generating learning progression plan for topic: "${learningTopic}"`);
    
    // Prepare the prompt with variables injected
    const prompt = injectPromptVariables(LEARNING_SERIES_PROGRESSION_PROMPT_TEMPLATE, {
      learningTopic,
      previousInteractions: previousInteractions || "No previous interaction data available.",
      chatHistorySummary: chatHistorySummary || "No recent conversation history.",
      personaCustomization: personaCustomization || "No specific persona customization.",
      userStateSummary: userStateSummary || "No specific user state.",
      availableToolsStringified: availableToolsStringified || "No tools available.",
    });
    
    // Generate the plan using the planning model
    const response = await openai.chat.completions.create({
      model: PLANNING_MODEL_NAME,
      messages: [
        { role: "system", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      logger.error(`${logPrefix} No response generated from OpenAI`);
      return { plan: null, error: "Failed to generate learning progression plan" };
    }
    
    const content = response.choices[0].message.content;
    if (!content) {
      logger.error(`${logPrefix} Empty content in response`);
      return { plan: null, error: "Empty response content" };
    }
    
    // Extract the learning progression plan XML using regular expressions
    const xmlMatch = /<learning_progression_plan>([\s\S]*?)<\/learning_progression_plan>/i.exec(content);
    if (!xmlMatch || !xmlMatch[0]) {
      logger.error(`${logPrefix} No learning progression plan XML found in response`);
      return { plan: null, error: "No learning progression plan XML found in response" };
    }
    
    const xmlContent = xmlMatch[0];
    logger.info(`${logPrefix} Successfully generated learning progression plan XML`);
    
    // Return the XML content as the plan since xml-processor is not available
    logger.info(`${logPrefix} Returning learning progression plan content`);
    return { plan: xmlContent };
  } catch (error) {
    logger.error(`${logPrefix} Error generating learning progression plan:`, error);
    return { 
      plan: null, 
      error: error instanceof Error ? error.message : "Unknown error generating learning progression plan" 
    };
  }
}

/**
 * Generates a proactive check-in plan for ongoing learning journeys
 * @param learningTopic Topic the user has been learning
 * @param lastInteractionSummary Summary of the last interaction on this topic
 * @param timeSinceLastInteraction Time elapsed since last interaction
 * @param personaCustomization Persona customization information
 * @param userStateSummary User state summary
 * @param availableToolsStringified Available tools in string format
 * @param userId User ID for tracking
 * @returns Parsed XML proactive check-in plan
 */
export async function generateProactiveLearningCheckin(
  learningTopic: string,
  lastInteractionSummary: string,
  timeSinceLastInteraction: string,
  personaCustomization: string | null,
  userStateSummary: string | null,
  availableToolsStringified: string,
  userId?: string
): Promise<{ plan: any; error?: string | null }> {
  const logPrefix = `[ProactiveCheckin${userId ? ` User:${userId.substring(0, 8)}` : ''}]`;
  
  try {
    logger.info(`${logPrefix} Generating proactive learning check-in for topic: "${learningTopic}"`);
    
    // Prepare the prompt with variables injected
    const prompt = injectPromptVariables(PROACTIVE_LEARNING_CHECKIN_PROMPT_TEMPLATE, {
      learningTopic,
      lastInteractionSummary: lastInteractionSummary || "No last interaction data available.",
      timeSinceLastInteraction: timeSinceLastInteraction || "Unknown time elapsed",
      personaCustomization: personaCustomization || "No specific persona customization.",
      userStateSummary: userStateSummary || "No specific user state.",
      availableToolsStringified: availableToolsStringified || "No tools available.",
    });
    
    // Generate the plan using the planning model
    const response = await openai.chat.completions.create({
      model: PLANNING_MODEL_NAME,
      messages: [
        { role: "system", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      logger.error(`${logPrefix} No response generated from OpenAI`);
      return { plan: null, error: "Failed to generate proactive learning check-in plan" };
    }
    
    const content = response.choices[0].message.content;
    if (!content) {
      logger.error(`${logPrefix} Empty content in response`);
      return { plan: null, error: "Empty response content" };
    }
    
    // Extract the proactive check-in plan XML using regular expressions
    const xmlMatch = /<proactive_checkin_plan>([\s\S]*?)<\/proactive_checkin_plan>/i.exec(content);
    if (!xmlMatch || !xmlMatch[0]) {
      logger.error(`${logPrefix} No proactive check-in plan XML found in response`);
      return { plan: null, error: "No proactive check-in plan XML found in response" };
    }
    
    const xmlContent = xmlMatch[0];
    logger.info(`${logPrefix} Successfully generated proactive check-in plan XML`);
    
    // Return the XML content as the plan since xml-processor is not available
    logger.info(`${logPrefix} Returning proactive check-in plan content`);
    return { plan: xmlContent };
  } catch (error) {
    logger.error(`${logPrefix} Error generating proactive check-in plan:`, error);
    return { 
      plan: null, 
      error: error instanceof Error ? error.message : "Unknown error generating proactive check-in plan" 
    };
  }
}

/**
 * Generate a focus mode plan with multi-tool orchestration
 * @param userQuery User's focus mode request
 * @param chatHistorySummary Summary of chat history for context
 * @param personaCustomization User's persona customization
 * @param userStateSummary User state summary
 * @param availableToolsStringified Available tools description
 * @param userId User ID for tracking
 * @returns Generated focus mode plan or error
 */
export async function generateFocusModePlan(
  userQuery: string,
  chatHistorySummary: string,
  personaCustomization: string | null,
  userStateSummary: string | null,
  availableToolsStringified: string,
  userId: string
): Promise<{ plan: string | null; error: string | null }> {
  try {
    // Start tracking time for performance monitoring
    const startTime = Date.now();
    
    // Prepare prompt with the focus mode template
    const prompt = FOCUS_MODE_PROMPT_TEMPLATE
      .replace('{userQuery}', userQuery)
      .replace('{chatHistorySummary}', chatHistorySummary)
      .replace('{personaCustomization}', personaCustomization || 'Not specified')
      .replace('{userStateSummary}', userStateSummary || 'Not available')
      .replace('{availableToolsStringified}', availableToolsStringified);
    
    // Generate the focus mode plan using GPT-4 model
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a focus mode planning system that creates detailed XML plans for maintaining user focus and productivity."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    const plan = response.choices[0]?.message?.content || null;
    
    // Log usage and performance metrics
    const endTime = Date.now();
    const duration = endTime - startTime;
    const tokens = response.usage ? {
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens
    } : null;
    
    logger.info(`Generated focus mode plan for user ${userId} in ${duration}ms`, {
      tokens,
      query_length: userQuery.length,
      result_length: plan?.length || 0
    });
    
    return { plan, error: null };
  } catch (error: any) {
    logger.error(`Error generating focus mode plan: ${error.message}`, { userId, error });
    return { plan: null, error: error.message };
  }
}