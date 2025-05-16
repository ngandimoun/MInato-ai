import OpenAI from "openai";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  ChatMessage,
  ChatMessageContentPart,
  UserState,
} from "@/lib/types/index";
import { safeJsonParse } from "@/memory-framework/core/utils";
import type { ChatCompletionMessageToolCall } from "openai/resources/chat/completions";
import type { CompletionUsage } from "openai/resources";
import { MEDIA_UPLOAD_BUCKET } from "../constants";
import { supabase } from "../supabaseClient"; // Public client for storage access

// --- Initialize Raw OpenAI Client ---
if (!appConfig.openai.apiKey && typeof window === "undefined") {
  logger.error("CRITICAL: OpenAI API Key is missing. LLM clients will not function.");
}
const openai = new OpenAI({
  apiKey: appConfig.openai.apiKey,
  maxRetries: appConfig.nodeEnv === "test" ? 0 : 3,
  timeout: 120 * 1000, // 2 minutes
});

if (appConfig.openai.apiKey && typeof window === "undefined") {
  logger.info(`[LLM Clients] Raw OpenAI Client initialized for Responses API.`);
}

// --- Model Name Constants ---
const PLANNING_MODEL_NAME: string = appConfig.openai.planningModel;
const RESPONSE_TOOL_MODEL_NAME: string = appConfig.openai.chatModel;
const EXTRACTION_MODEL_NAME: string = appConfig.openai.extractionModel;
const DEVELOPER_MODEL_NAME: string = appConfig.openai.developerModel; // o3-mini
const VISION_MODEL_NAME: string = appConfig.openai.visionModel;
const MAX_OUTPUT_TOKENS: number = appConfig.openai.maxTokens;
const MAX_VISION_TOKENS: number = appConfig.openai.maxVisionTokens;
const EMBEDDING_MODEL_NAME: string = appConfig.openai.embedderModel;
const EMBEDDING_DIMENSIONS: number = appConfig.openai.embeddingDims;

type SdkResponsesApiInputItem = any;
type SdkResponsesApiInputContentPart = any;
type SdkResponsesApiTool = OpenAI.Responses.Tool;
type SdkResponsesApiToolChoice = any;
type SdkMessageOutputItem = any;
type SdkTextOutputContentPart = any;
type SdkFunctionCallOutputItemFromResponse = any;

/**
 * Recursively sanitizes a JSON schema to be compliant with OpenAI's strict mode for Responses API.
 * - Sets `additionalProperties: false` on all object types.
 * - Ensures all defined `properties` of an object are listed in its `required` array.
 * - If an object has no `properties` defined and `additionalProperties` becomes false,
 *   it defaults to `properties: {}` and `required: []` (must be an empty object).
 * - Removes keywords not supported by OpenAI's strict schema validation.
 * - Handles nested structures including `anyOf`, `allOf`, `oneOf`, and `items` for arrays.
 */
function sanitizeJsonSchema(schema: any, path: string[] = []): any {
  if (!schema || typeof schema !== 'object' || schema === null) {
    return schema;
  }

  const newSchema: any = Array.isArray(schema) ? [] : { ...schema };

  if (Array.isArray(schema)) {
    return schema.map((item, index) => sanitizeJsonSchema(item, [...path, `[${index}]`]));
  }

  // Apply to the current level
  if (newSchema.type === "object" || (Array.isArray(newSchema.type) && newSchema.type.includes("object"))) {
    newSchema.additionalProperties = false; // Crucial for strict mode
    if (newSchema.properties && typeof newSchema.properties === 'object' && Object.keys(newSchema.properties).length > 0) {
      newSchema.required = Object.keys(newSchema.properties);
    } else if (!newSchema.properties) { // If properties is undefined or empty
      newSchema.properties = {};
      newSchema.required = [];
    } else if (newSchema.properties && Object.keys(newSchema.properties).length === 0) { // If properties is defined but empty
      newSchema.required = [];
    }
    // Recursively sanitize properties if they exist
    if (newSchema.properties) {
        for (const propKey in newSchema.properties) {
            newSchema.properties[propKey] = sanitizeJsonSchema(newSchema.properties[propKey], [...path, 'properties', propKey]);
        }
    }
  }


  // Recursively sanitize for nested structures
  for (const key in schema) {
    if (key === 'properties' && typeof schema[key] === 'object' && schema[key] !== null) {
      newSchema[key] = {}; // Initialize if not already
      for (const propKey in schema[key]) {
        newSchema[key][propKey] = sanitizeJsonSchema(schema[key][propKey], [...path, 'properties', propKey]);
      }
    } else if (key === 'items' && typeof schema[key] === 'object' && schema[key] !== null) {
      newSchema[key] = sanitizeJsonSchema(schema[key], [...path, 'items']);
    } else if (Array.isArray(schema[key]) && (key === 'anyOf' || key === 'allOf' || key === 'oneOf')) {
      newSchema[key] = schema[key].map((subSchema: any, index: number) =>
        sanitizeJsonSchema(subSchema, [...path, key, `[${index}]`])
      );
    } else if (key !== 'properties' && key !== 'items' && key !== 'anyOf' && key !== 'allOf' && key !== 'oneOf' && typeof schema[key] === 'object' && schema[key] !== null) {
      // Handle other potentially nested objects not covered by standard keywords
      newSchema[key] = sanitizeJsonSchema(schema[key], [...path, key]);
    } else if (!newSchema.hasOwnProperty(key)) { // Copy other properties if not already handled
        newSchema[key] = schema[key];
    }
  }


  // Ensure type: ["object", "null"] is handled: the object part must be strict
  if (Array.isArray(newSchema.type) && newSchema.type.includes("object") && newSchema.type.includes("null")) {
    // This case is tricky. OpenAI expects a single object definition for the schema.
    // The `anyOf` construct is better for representing such unions if OpenAI supports it for the main schema.
    // For tool parameters, it's usually one or the other.
    // If we have to represent this as a single object that can be null,
    // the object definition part of it should be strict.
    // This specific scenario might require an `anyOf` at a higher level if possible,
    // or the LLM must be prompted to only provide the object form or null.
    // For now, this function primarily focuses on object definitions themselves.
  }


  // Remove OpenAI unsupported keywords for strict mode
  const disallowedKeywords = [
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "pattern", "minLength", "maxLength",
    "format", "multipleOf", "minItems", "maxItems", "uniqueItems", "minProperties", "maxProperties",
    "patternProperties", "unevaluatedProperties", "contains", "minContains", "maxContains", "default",
  ];
  for (const keyword of disallowedKeywords) {
    delete newSchema[keyword];
  }

  return newSchema;
}


async function formatMessagesForResponsesApi(history: ChatMessage[]): Promise<SdkResponsesApiInputItem[]> {
  const apiMessages: SdkResponsesApiInputItem[] = [];
  for (const msg of history) {
    const contentParts: SdkResponsesApiInputContentPart[] = [];
    let hasNonTextContent = false;

    if (typeof msg.content === "string") {
      if (msg.content.trim()) { // Only add if non-empty string
        contentParts.push({ type: "input_text", text: msg.content });
      }
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && typeof part.text === 'string' && part.text.trim()) {
          contentParts.push({ type: "input_text", text: part.text });
        } else if (part.type === "input_image" && typeof part.image_url === "string") {
          hasNonTextContent = true;
          let imageUrl = part.image_url;
          if (imageUrl.startsWith("supabase_storage:")) {
            const storagePath = imageUrl.substring("supabase_storage:".length);
            logger.debug(`[formatMessages] Fetching Supabase image: ${storagePath}`);
            if (supabase) {
              try {
                const { data: blobData, error: downloadError } = await supabase.storage.from(MEDIA_UPLOAD_BUCKET).download(storagePath);
                if (downloadError) throw downloadError;
                if (!blobData) throw new Error("No blob data from Supabase.");
                const buffer = Buffer.from(await blobData.arrayBuffer());
                const mimeType = blobData.type || "image/jpeg";
                imageUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
              } catch (fetchError: any) {
                logger.error(`[formatMessages] Error fetching Supabase image ${storagePath}: ${fetchError.message}.`);
                contentParts.push({ type: "input_text", text: `[ERR: Image load failed for ${storagePath.substring(storagePath.lastIndexOf("/") + 1)}]` });
                continue;
              }
            } else {
              logger.error(`[formatMessages] Supabase client not available for image path ${storagePath}.`);
              contentParts.push({ type: "input_text", text: `[ERR: Storage unavailable for image]` });
              continue;
            }
          }
          if (imageUrl.startsWith("data:image") || imageUrl.startsWith("http")) {
            contentParts.push({ type: "input_image", image_url: imageUrl, detail: (typeof part.detail === "string" ? part.detail : appConfig.openai.visionDetail) });
          } else {
            logger.warn(`[formatMessages] Invalid image URL format: ${imageUrl.substring(0,70)}`);
            contentParts.push({ type: "input_text", text: "[ERR: Invalid image URL provided]" });
          }
        }
      }
    }

    // Determine final content: string if only one text part, array otherwise, or empty string if no parts.
    let messageInputContent: string | SdkResponsesApiInputContentPart[];
    if (contentParts.length === 1 && contentParts[0].type === "input_text" && !hasNonTextContent) {
      messageInputContent = contentParts[0].text;
    } else if (contentParts.length > 0) {
      messageInputContent = contentParts;
    } else {
      // If content is null or empty after processing, decide how to handle.
      // For user/assistant roles, an empty content string is valid for Responses API.
      // For tool roles, content is required.
      messageInputContent = "";
      if (msg.role !== "tool" && msg.role !== "system" && (!msg.tool_calls || msg.tool_calls.length === 0)) {
        logger.debug(`[formatMessages] Message role '${msg.role}' (ID: ${msg.id}) has no processable content and no tool_calls. Sending empty content string.`);
      }
    }

    switch (msg.role) {
      case "user":
        if (messageInputContent || (Array.isArray(messageInputContent) && messageInputContent.length > 0)) {
            apiMessages.push({ role: "user", content: messageInputContent });
        }
        break;
      case "assistant":
        const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
        // Add assistant message if it has text content OR tool calls
        if ((typeof messageInputContent === 'string' && messageInputContent) || (Array.isArray(messageInputContent) && messageInputContent.length > 0) || hasToolCalls) {
            const assistantMsgPayload: any = { role: "assistant" };
            if ((typeof messageInputContent === 'string' && messageInputContent) || (Array.isArray(messageInputContent) && messageInputContent.length > 0)) {
                assistantMsgPayload.content = messageInputContent;
            }
             // Add the main assistant message (text/multimodal) if it has content
            if (assistantMsgPayload.content) {
                 apiMessages.push(assistantMsgPayload);
            }
            // Add subsequent function_call items
            if (hasToolCalls) {
                msg.tool_calls!.forEach((tc) => {
                    if (tc.type === "function") {
                        apiMessages.push({
                            type: "function_call",
                            call_id: tc.id,
                            name: tc.function.name,
                            arguments: tc.function.arguments,
                        });
                    }
                });
            }
        }
        break;
      case "tool":
        if (msg.tool_call_id && typeof msg.content === "string") {
          apiMessages.push({
            type: "function_call_output",
            call_id: msg.tool_call_id,
            output: msg.content,
          });
        }
        break;
      // System messages are handled via the `instructions` parameter of `openai.responses.create`
      case "system":
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
    const embeddingResponse = await openai.embeddings.create({ model: EMBEDDING_MODEL_NAME, input: cleanedText, encoding_format: "float", dimensions: EMBEDDING_DIMENSIONS });
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
    logger.error(`[LLM Clients Embed] Error: ${errorMessage}`, { originalError: error });
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
    const inputMessages: SdkResponsesApiInputItem[] = [];
    if (historyForContext.length > 0) {
        const formattedHistory = await formatMessagesForResponsesApi(historyForContext);
        inputMessages.push(...formattedHistory);
    }
    const userContentParts: SdkResponsesApiInputContentPart[] = [];
    if (typeof userInput === 'string') {
        userContentParts.push({type: "input_text", text: userInput});
    } else if (Array.isArray(userInput)) {
        for (const part of userInput) {
            if (part.type === "text" && typeof part.text === 'string') userContentParts.push({type: "input_text", text: part.text});
            else if (part.type === "input_image" && typeof part.image_url === "string") {
                let imageUrl = part.image_url;
                 if (imageUrl.startsWith("supabase_storage:")) {
                    const storagePath = imageUrl.substring("supabase_storage:".length);
                    if (supabase) {
                        try {
                            const { data: blobData, error: dlError } = await supabase.storage.from(MEDIA_UPLOAD_BUCKET).download(storagePath);
                            if (dlError || !blobData) throw dlError || new Error("Blob empty");
                            imageUrl = `data:${blobData.type || 'image/jpeg'};base64,${Buffer.from(await blobData.arrayBuffer()).toString('base64')}`;
                        } catch (e: any) { logger.error(`[StructJSON ImgFetch] Error: ${e.message}`); userContentParts.push({type: "input_text", text: `[ERR: Image ${storagePath} load fail]`}); continue; }
                    } else { userContentParts.push({type: "input_text", text: `[ERR: Storage unavail]`}); continue;}
                 }
                if (imageUrl.startsWith("data:image") || imageUrl.startsWith("http")) {
                    userContentParts.push({ type: "input_image", image_url: imageUrl, detail: (typeof part.detail === "string" ? part.detail : appConfig.openai.visionDetail) });
                }
            }
        }
    }
    if (userContentParts.length > 0) {
      const userMessageContent = userContentParts.length === 1 && userContentParts[0].type === "input_text" ? userContentParts[0].text : userContentParts;
      inputMessages.push({role: "user", content: userMessageContent });
    }

    if (inputMessages.length === 0 && !instructions) { logger.error(`[LLM Clients JSON] No valid messages or instructions. ${logSuffix}`); return { error: "No valid messages or instructions to send." }; }
    
    const sanitizedSchema = sanitizeJsonSchema(jsonSchema);
    logger.debug(`[LLM Clients JSON] Using sanitized schema for ${schemaName}: ${JSON.stringify(sanitizedSchema).substring(0, 200)}...`);

    const requestPayload: OpenAI.Responses.ResponseCreateParams = {
      model: modelName, input: inputMessages, instructions: instructions || undefined,
      text: { format: { type: "json_schema", name: schemaName, schema: sanitizedSchema, strict: true } },
      store: appConfig.nodeEnv !== "production", max_output_tokens: MAX_OUTPUT_TOKENS,
    };
    if (userId) requestPayload.user = userId;
    if (modelName === PLANNING_MODEL_NAME || modelName === DEVELOPER_MODEL_NAME || modelName.startsWith("o3-") || modelName.startsWith("o4-")) {
        (requestPayload as any).reasoning = { effort: "medium" };
    }

    const start = Date.now();
    const response = await openai.responses.create(requestPayload);
    const duration = Date.now() - start;

    if (response.status === "failed" || response.status === "incomplete") { /* ... error handling ... */ const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown error"; logger.error(`[LLM Clients JSON] Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`, response.error ? { errorDetails: response.error, schema: JSON.stringify(sanitizedSchema).substring(0,200) } : {schema: JSON.stringify(sanitizedSchema).substring(0,200)}); return { error: `JSON generation failed (${response.status}): ${errorReason}` }; }

    const assistantOutputItem = response.output?.find((item): item is SdkMessageOutputItem => item.type === "message" && item.role === "assistant" && "content" in item);
    let textContentItem: SdkTextOutputContentPart | undefined;
    if (assistantOutputItem && "content" in assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      textContentItem = assistantOutputItem.content.find((part: any): part is SdkTextOutputContentPart => part.type === "output_text");
    }
    const finishReason = response.status === "completed" ? "stop" : response.incomplete_details?.reason || response.status;
    logger.debug(`[LLM Clients JSON] Success (${duration}ms). Finish: ${finishReason}. Usage: ${JSON.stringify(response.usage)}. ${logSuffix}`);

    if (!textContentItem || !textContentItem.text) { /* ... error handling for no text or refusal ... */ const refusalPart = (assistantOutputItem?.content as any[])?.find((p: any) => p.type === 'refusal'); if (refusalPart) { logger.error(`[LLM Clients JSON] Model refused: ${refusalPart.refusal}. Schema: ${schemaName}. ${logSuffix}`); return { error: `JSON generation refused: ${refusalPart.refusal}` }; } logger.error(`[LLM Clients JSON] No 'output_text' in response. ${logSuffix}. Output:`, response.output); return { error: "JSON generation failed (no text output)." }; }
    const responseText = textContentItem.text;

    if (finishReason === "max_output_tokens") { /* ... error handling for truncation ... */ logger.error(`[LLM Clients JSON] Truncated JSON. ${logSuffix}`); const partialResult = safeJsonParse<T>(responseText); if (partialResult) return partialResult; return { error: `JSON generation failed (truncated). Finish: ${finishReason}` }; }

    const result = safeJsonParse<T>(responseText);
    if (!result || typeof result !== "object" || Array.isArray(result)) { /* ... error handling for parse failure ... */ logger.warn(`[LLM Clients JSON] Parsed non-object/null/array. Type: ${typeof result}. Raw: ${responseText.substring(0,300)}. ${logSuffix}`); return { error: `JSON parsing yielded ${typeof result}. Expected object for schema ${schemaName}.` }; }
    return result;
  } catch (error: any) {
    let errorMessage = "Structured JSON generation error.";
    if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for JSON Gen (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    logger.error(`[LLM Clients JSON] Exception: ${errorMessage}. ${logSuffix}`, { originalError: error, schemaName, schemaUsedForCall: JSON.stringify(jsonSchema).substring(0,300) }); // Log the schema used
    return { error: errorMessage };
  }
}

export async function generateAgentResponse(
  messages: ChatMessage[],
  // These are SdkResponsesApiTool[] because Orchestrator prepares them this way now.
  responsesApiTools: SdkResponsesApiTool[] | null,
  responsesApiToolChoice: SdkResponsesApiToolChoice | null,
  modelName: string = RESPONSE_TOOL_MODEL_NAME,
  maxTokens?: number,
  userId?: string,
  instructions?: string | null
): Promise<{
  responseContent: string | null;
  toolCalls: ChatCompletionMessageToolCall[] | null; // Keep internal representation
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
      model: modelName, input: apiInputItems.length > 0 ? apiInputItems : [],
      max_output_tokens: maxTokens ?? MAX_OUTPUT_TOKENS, store: appConfig.nodeEnv !== "production",
    };
    if (userId) requestPayload.user = userId;
    if (instructions) requestPayload.instructions = instructions;

    if (modelName === PLANNING_MODEL_NAME || modelName === DEVELOPER_MODEL_NAME || modelName.startsWith("o3-") || modelName.startsWith("o4-")) {
      (requestPayload as any).reasoning = { effort: "medium" }; // Default effort
      delete requestPayload.temperature;
    } else if (typeof appConfig.llm.temperature === 'number') {
      requestPayload.temperature = appConfig.llm.temperature;
    }

    if (responsesApiTools && responsesApiTools.length > 0) {
      requestPayload.tools = responsesApiTools; // Already in correct format
      requestPayload.tool_choice = responsesApiToolChoice || "auto";
      logger.debug(`[LLM Clients Agent] Tools for Responses API: ${requestPayload.tools.map((t: any) => t.name || t.type).join(', ')}. Choice: ${JSON.stringify(requestPayload.tool_choice)}. ${logSuffix}`);
    }

    const start = Date.now();
    const response = await openai.responses.create(requestPayload);
    const duration = Date.now() - start;

    if (response.status === "failed" || response.status === "incomplete") { const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown API error"; const apiUsage = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null; logger.error(`[LLM Clients Agent] API Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`, response.error ? { errorDetails: response.error } : {}); return { responseContent: null, toolCalls: null, finishReason: response.status, error: `Agent API error (${response.status}): ${errorReason}`, usage: apiUsage }; }

    let responseText: string | null = null;
    const assistantOutputItem = response.output?.find((item): item is SdkMessageOutputItem => item.type === "message" && item.role === "assistant" && "content" in item);
    if (assistantOutputItem && "content" in assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      const textPart = assistantOutputItem.content.find((part: any): part is SdkTextOutputContentPart => part.type === "output_text");
      if (textPart && typeof textPart.text === "string") { responseText = textPart.text.trim(); if (responseText === "") responseText = null; }
    }

    const extractedSdkToolCalls = response.output?.filter((item): item is SdkFunctionCallOutputItemFromResponse => item.type === "function_call");
    let toolCallsResult: ChatCompletionMessageToolCall[] | null = null; // Internal format
    if (extractedSdkToolCalls && extractedSdkToolCalls.length > 0) {
      toolCallsResult = extractedSdkToolCalls.map(fcItem => ({
        id: fcItem.call_id, type: "function", function: { name: fcItem.name, arguments: fcItem.arguments || "{}" },
      }));
    }

    const finishReasonResult = response.status === "completed" ? (toolCallsResult ? "tool_calls" : "stop") : response.incomplete_details?.reason || response.status;
    const mappedUsage: CompletionUsage | null = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null;
    logger.debug(`[LLM Clients Agent] Success (${duration}ms). Finish: ${finishReasonResult}. Text: ${!!responseText}. Tool Calls: ${toolCallsResult?.length ?? 0}. Usage: ${JSON.stringify(mappedUsage)}. ${logSuffix}`);
    return { responseContent: responseText, toolCalls: toolCallsResult, finishReason: finishReasonResult, usage: mappedUsage, error: null };
  } catch (error: any) {
    let errorMessage = "Agent response generation error.";
    if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for Agent (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    logger.error(`[LLM Clients Agent] Exception: ${errorMessage}. ${logSuffix}`, { originalError: error, requestPayloadString: JSON.stringify(error.request?.body || {}).substring(0,300) });
    return { responseContent: null, toolCalls: null, finishReason: "error", error: errorMessage };
  }
}

export async function generateResponseWithIntent(
  instructions: string, // This will be the `instructions` param for `openai.responses.create`
  userPrompt: string,   // This will be the content of the "user" message in the `input` array
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
  const schemaNameForIntent = "minato_intent_response_v3"; // Updated version

  // Construct user input for generateStructuredJson
  const userInputForJson: ChatMessageContentPart[] = [{ type: "text", text: userPrompt }];

  const result = await generateStructuredJson<{ responseText: string; intentType: string }>(
    instructions, // Pass the main instructions for the overall behavior
    userInputForJson, // User's current query
    intentSchema, schemaNameForIntent,
    history, // Provide conversation history for context
    modelName, userId
  );

  if ("error" in result) {
    logger.error(`[LLM Clients Intent] Structured JSON for intent failed: ${result.error}. ${logSuffix}. Falling back.`);
    // Fallback: try to get a plain text response if JSON structure fails, then wrap it.
    const fallbackMessages: ChatMessage[] = [...history, {role: "user", content: userPrompt, timestamp: Date.now()}];
    const fallbackAgentResult = await generateAgentResponse(fallbackMessages, null, "none", modelName, maxTokens, userId, instructions);
    if (fallbackAgentResult.responseContent) {
      logger.warn(`[LLM Clients Intent] Fallback to plain text response due to JSON error. Intent set to 'neutral'.`);
      return { responseText: fallbackAgentResult.responseContent, intentType: "neutral" };
    }
    return { error: result.error + " (Fallback also failed to produce text)" };
  }

  // Post-processing to remove the JSON object if it was accidentally included in responseText
  if (result.responseText.trim().endsWith("}")) {
    const potentialJsonSuffix = `{ "responseText": "${result.responseText.trim()}", "intentType": "${result.intentType}" }`;
    if (result.responseText.endsWith(potentialJsonSuffix)) {
         result.responseText = result.responseText.substring(0, result.responseText.lastIndexOf(potentialJsonSuffix));
    } else {
        // Attempt to strip only the specific JSON object suffix if possible
        // This is a bit heuristic. A more robust way would be to ensure the LLM *never* includes it.
        const jsonSuffixPattern = /\{\s*"responseText":\s*"[^"]*",\s*"intentType":\s*"[^"]*"\s*\}$/;
        if (jsonSuffixPattern.test(result.responseText.trim())) {
            result.responseText = result.responseText.trim().replace(jsonSuffixPattern, "").trim();
            logger.warn(`[LLM Clients Intent] Stripped JSON suffix from responseText. Original ended with object.`);
        }
    }
  }
  if (!result.responseText.trim()) { // If after stripping, responseText is empty, it's an issue.
      logger.error(`[LLM Clients Intent] responseText became empty after attempting to strip JSON suffix. LLM likely returned ONLY the JSON object. Prompting needs refinement. Original result:`, result);
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

  const hasImage = messages.some(msg => Array.isArray(msg.content) && msg.content.some(part => part.type === "input_image"));
  if (!hasImage) return { text: null, error: "No image content provided for vision analysis." };

  const visionInstructions = "You are Minato, an AI assistant. Analyze the provided image(s) in detail and describe what you see. If text is provided with the image(s), consider it as part of the query or context for the analysis. Be descriptive, engaging, and speak as Minato to {userName}."; // Added userName

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