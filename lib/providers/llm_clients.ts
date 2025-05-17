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
} from "openai/resources/chat/completions";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  ChatMessage,
  ChatMessageContentPart,
  UserState,
  ResponseApiInputContent, // Keep if formatMessagesForResponsesApi uses it
} from "@/lib/types/index";
import { safeJsonParse } from "@/memory-framework/core/utils";
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

// --- Model Name Constants --- (remain same)
const PLANNING_MODEL_NAME: string = appConfig.openai.planningModel;
const RESPONSE_TOOL_MODEL_NAME: string = appConfig.openai.chatModel;
const EXTRACTION_MODEL_NAME: string = appConfig.openai.extractionModel;
const DEVELOPER_MODEL_NAME: string = appConfig.openai.developerModel;
const VISION_MODEL_NAME: string = appConfig.openai.visionModel;
const MAX_OUTPUT_TOKENS: number = appConfig.openai.maxTokens;
const MAX_VISION_TOKENS: number = appConfig.openai.maxVisionTokens;
const EMBEDDING_MODEL_NAME: string = appConfig.openai.embedderModel;
const EMBEDDING_DIMENSIONS: number = appConfig.openai.embeddingDims;

// Types adaptés pour OpenAI v4+
type SdkResponsesApiInputItem = ChatCompletionMessageParam;
type SdkResponsesApiMessageParam = ChatCompletionMessageParam;
type SdkResponsesApiContentPart = ChatCompletionContentPartText | ChatCompletionContentPartImage;
type SdkResponsesApiTool = ChatCompletionTool;
type SdkResponsesApiToolChoice = ChatCompletionToolChoiceOption | "auto" | "none";
type SdkResponsesApiOutputItem = ChatCompletionMessage;
type SdkTextOutputContentPart = Extract<SdkResponsesApiContentPart, { type: "text" }>;
type SdkFunctionCallOutputItem = ChatCompletionMessageToolCall;

// Type local pour ImageURL si non exporté par le SDK (brute force)
type ImageURL = any;

// Sanitizes JSON schema for text: { format: { type: "json_schema", strict: true ...}}
// This version needs to ensure it correctly makes all object properties required
// unless their type explicitly includes "null".
function sanitizeJsonSchema(schema: any, path: string[] = []): any {
    if (!schema || typeof schema !== 'object' || schema === null) {
        return schema;
    }

    const newSchema: any = Array.isArray(schema) ? [] : { ...schema };

    if (Array.isArray(schema)) {
        return schema.map((item, index) => sanitizeJsonSchema(item, [...path, `[${index}]`]));
    }

    // Remove OpenAI unsupported keywords for strict mode (applies to all types)
    const disallowedKeywords = [
        "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "pattern", "minLength", "maxLength",
        "format", "multipleOf", "minItems", "maxItems", "uniqueItems", "minProperties", "maxProperties",
        "patternProperties", "unevaluatedProperties", "contains", "minContains", "maxContains", "default",
        // 'strict' is an OpenAI specific flag, not a JSON schema keyword for properties.
    ];
    for (const keyword of disallowedKeywords) {
        delete newSchema[keyword];
    }

    if (newSchema.type === "object" || (Array.isArray(newSchema.type) && newSchema.type.includes("object"))) {
        newSchema.additionalProperties = false;

        if (newSchema.properties && typeof newSchema.properties === 'object') {
            const currentRequired = new Set(Array.isArray(newSchema.required) ? newSchema.required : []);
            for (const propKey in newSchema.properties) {
                // If a property is defined, it's implicitly required by OpenAI's strict mode unless its type *includes* "null".
                // The `sanitizeToolParameterSchemaForOpenAI` handles this more explicitly for tool params.
                // For general structured output, we guide the LLM via prompt and expect it to fill all defined non-nullable fields.
                // If OpenAI's `strict: true` for text.format.json_schema *also* means all defined props must be in `required`,
                // then this logic needs to add them. Assuming for now it's more about `additionalProperties: false`.
                // However, to be safe and align with tool parameter strictness:
                if (!(Array.isArray(newSchema.properties[propKey]?.type) && newSchema.properties[propKey].type.includes("null"))) {
                    currentRequired.add(propKey);
                }
                newSchema.properties[propKey] = sanitizeJsonSchema(newSchema.properties[propKey], [...path, 'properties', propKey]);
            }
            newSchema.required = Array.from(currentRequired).filter(rKey => newSchema.properties.hasOwnProperty(rKey));
            if (newSchema.required.length === 0) delete newSchema.required; // OpenAI might prefer omitting empty required array

        } else if (!newSchema.properties || Object.keys(newSchema.properties).length === 0) {
            newSchema.properties = {}; // Ensure properties object exists
            delete newSchema.required; // No properties, so no required fields
        }
    }

    // Recursively sanitize for nested structures
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


// formatMessagesForResponsesApi remains largely the same, ensuring correct mapping
async function formatMessagesForResponsesApi(history: ChatMessage[]): Promise<SdkResponsesApiInputItem[]> {
  const apiMessages: SdkResponsesApiInputItem[] = [];
  for (const msg of history) {
    const contentParts: SdkResponsesApiContentPart[] = []; // Use the more specific SdkResponsesApiContentPart
    let hasNonTextContent = false;

    if (typeof msg.content === "string") {
      if (msg.content.trim()) {
        contentParts.push({ type: "text", text: msg.content });
      }
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && typeof part.text === 'string' && part.text.trim()) {
          contentParts.push({ type: "text", text: part.text });
        } else if (part.type === "input_image" && typeof part.image_url === "string") {
          hasNonTextContent = true;
          let imageUrl = part.image_url;
          if (imageUrl.startsWith("supabase_storage:")) {
            const storagePath = imageUrl.substring("supabase_storage:".length);
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
                contentParts.push({ type: "text", text: `[ERR: Image load failed for ${storagePath.substring(storagePath.lastIndexOf("/") + 1)}]` });
                continue;
              }
            } else {
              logger.error(`[formatMessages] Supabase client not available for image path ${storagePath}.`);
              contentParts.push({ type: "text", text: `[ERR: Storage unavailable for image]` });
              continue;
            }
          }
          if (imageUrl.startsWith("data:image") || imageUrl.startsWith("http")) {
            contentParts.push({
                type: "image_url",
                image_url: imageUrl as unknown as ImageURL
            });
          } else {
            logger.warn(`[formatMessages] Invalid image URL format: ${imageUrl.substring(0,70)}`);
            contentParts.push({ type: "text", text: "[ERR: Invalid image URL provided]" });
          }
        }
      }
    }

    let messageInputContent: string | ChatCompletionContentPartText[] | ChatCompletionContentPartImage[];
    if (contentParts.length === 1 && contentParts[0].type === "text" && !hasNonTextContent) {
      messageInputContent = (contentParts[0] as ChatCompletionContentPartText).text;
    } else if (contentParts.length > 0) {
      messageInputContent = contentParts as (ChatCompletionContentPartText[] | ChatCompletionContentPartImage[]);
    } else {
      messageInputContent = "";
    }

    switch (msg.role) {
      case "user":
        if ((typeof messageInputContent === 'string' && messageInputContent) || (Array.isArray(messageInputContent) && messageInputContent.length > 0)) {
            apiMessages.push({ role: "user", content: messageInputContent });
        }
        break;
      case "assistant":
        const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0;
        const assistantHasTextContent = (typeof messageInputContent === 'string' && messageInputContent) || (Array.isArray(messageInputContent) && messageInputContent.length > 0);

        if (assistantHasTextContent) {
            // Ne passer que du texte ou un tableau de textes
            if (typeof messageInputContent === 'string') {
                apiMessages.push({ role: "assistant", content: messageInputContent });
            } else if (Array.isArray(messageInputContent)) {
                const onlyTextParts = messageInputContent.filter((p: any) => p.type === "text");
                if (onlyTextParts.length > 0) {
                    apiMessages.push({ role: "assistant", content: onlyTextParts as ChatCompletionContentPartText[] });
                }
            }
        }
        // Pour OpenAI v4+, tool_calls doivent être passés dans le champ tool_calls du message assistant, pas comme messages séparés
        if (hasToolCalls) {
            // Ajoutons tool_calls au dernier message assistant si besoin (ou à ce message)
            const lastMsg = apiMessages[apiMessages.length - 1];
            if (lastMsg && lastMsg.role === "assistant" && !('tool_calls' in lastMsg)) {
                (lastMsg as any).tool_calls = msg.tool_calls;
            }
        } else if (!assistantHasTextContent && !hasToolCalls && msg.role === "assistant") {
            apiMessages.push({ role: "assistant", content: null });
        }
        break;
      case "tool":
        if (msg.tool_call_id && typeof msg.content === "string") {
          // OpenAI v4+ n'accepte pas de message "tool" dans l'API standard, ignorer ou adapter selon le besoin réel
        }
        break;
      case "system":
        // System messages are handled via the `instructions` parameter of `openai.responses.create`
        break;
    }
  }
  return apiMessages;
}


// generateEmbeddingLC remains the same
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
    logger.error(`[LLM Clients Embed] Error: ${errorMessage}`, { originalError: error });
    return { error: errorMessage };
  }
}

// generateStructuredJson now uses the refined sanitizeJsonSchema
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
    const inputMessages: SdkResponsesApiInputItem[] = []; // Use SdkResponsesApiInputItem
    if (historyForContext.length > 0) {
        const formattedHistory = await formatMessagesForResponsesApi(historyForContext);
        inputMessages.push(...formattedHistory);
    }

    const userContentInputItems: SdkResponsesApiContentPart[] = [];
    if (typeof userInput === 'string') {
        userContentInputItems.push({type: "text", text: userInput});
    } else if (Array.isArray(userInput)) {
        for (const part of userInput) {
            if (part.type === "text" && typeof part.text === 'string') {
                 userContentInputItems.push({type: "text", text: part.text});
            } else if (part.type === "input_image" && typeof part.image_url === "string") {
                let imageUrl = part.image_url;
                 if (imageUrl.startsWith("supabase_storage:")) {
                    const storagePath = imageUrl.substring("supabase_storage:".length);
                    if (supabase) {
                        try {
                            const { data: blobData, error: dlError } = await supabase.storage.from(MEDIA_UPLOAD_BUCKET).download(storagePath);
                            if (dlError || !blobData) throw dlError || new Error("Blob empty");
                            imageUrl = `data:${blobData.type || 'image/jpeg'};base64,${Buffer.from(await blobData.arrayBuffer()).toString('base64')}`;
                        } catch (e: any) { logger.error(`[StructJSON ImgFetch] Error: ${e.message}`); userContentInputItems.push({type: "text", text: `[ERR: Image ${storagePath} load fail]`}); continue; }
                    } else { userContentInputItems.push({type: "text", text: `[ERR: Storage unavail]`}); continue;}
                 }
                if (imageUrl.startsWith("data:image") || imageUrl.startsWith("http")) {
                    userContentInputItems.push({ type: "image_url", image_url: imageUrl as unknown as ImageURL });
                }
            }
        }
    }

    let userMessageContentForApi: string | ChatCompletionContentPartText[] = "";
    const textParts = userContentInputItems.filter((p): p is ChatCompletionContentPartText => p.type === "text");
    if (userContentInputItems.length === 1 && userContentInputItems[0].type === "text") {
      userMessageContentForApi = (userContentInputItems[0] as ChatCompletionContentPartText).text;
    } else if (textParts.length > 0) {
      userMessageContentForApi = textParts;
    } else {
      userMessageContentForApi = "";
    }
    if (userMessageContentForApi !== "" && ((typeof userMessageContentForApi === 'string' && userMessageContentForApi) || (Array.isArray(userMessageContentForApi) && userMessageContentForApi.length > 0))) {
      inputMessages.push({role: "user", content: userMessageContentForApi});
    }

    if (inputMessages.length === 0 && !instructions) { logger.error(`[LLM Clients JSON] No valid messages or instructions. ${logSuffix}`); return { error: "No valid messages or instructions to send." }; }

    const sanitizedSchema = sanitizeJsonSchema(jsonSchema); // Use the refined sanitizer
    logger.debug(`[LLM Clients JSON] Using sanitized schema for ${schemaName}: ${JSON.stringify(sanitizedSchema).substring(0, 200)}...`);

    const requestPayload: OpenAI.Responses.ResponseCreateParams = {
      model: modelName, input: inputMessages.length > 0 ? inputMessages as any : [], // Cast to any
      instructions: instructions || undefined,
      text: { format: { type: "json_schema", name: schemaName, schema: sanitizedSchema, strict: true } },
      store: appConfig.nodeEnv !== "production", max_output_tokens: MAX_OUTPUT_TOKENS,
    };
    if (userId) requestPayload.user = userId;
    // Reasoning for o-series models
    if (modelName === PLANNING_MODEL_NAME || modelName === DEVELOPER_MODEL_NAME || modelName.startsWith("o3-") || modelName.startsWith("o4-")) {
        (requestPayload as any).reasoning = { effort: "medium" }; // Default effort
    }

    const start = Date.now();
    const responseRaw = await openai.responses.create({ ...requestPayload, input: inputMessages as any });
    const response = responseRaw as any;
    const duration = Date.now() - start;

    if (response.status === "failed" || response.status === "incomplete") { const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown error"; logger.error(`[LLM Clients JSON] Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`); return { error: `JSON generation failed (${response.status}): ${errorReason}` }; }

    const assistantOutputItem = response.output?.find((item: any): item is SdkResponsesApiOutputItem => item.type === "message" && item.role === "assistant" && "content" in item);
    let textContentItem: SdkTextOutputContentPart | undefined;
    if (assistantOutputItem && "content" in assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      textContentItem = assistantOutputItem.content.find((part: any): part is SdkTextOutputContentPart => part.type === "output_text");
    }
    const finishReason = response.status === "completed" ? "stop" : response.incomplete_details?.reason || response.status;
    logger.debug(`[LLM Clients JSON] Success (${duration}ms). Finish: ${finishReason}. Usage: ${JSON.stringify(response.usage)}. ${logSuffix}`);

    if (!textContentItem || !textContentItem.text) { const refusalPart = (assistantOutputItem?.content as any[])?.find((p: any) => p.type === 'refusal'); if (refusalPart) { logger.error(`[LLM Clients JSON] Model refused: ${refusalPart.refusal}. Schema: ${schemaName}. ${logSuffix}`); return { error: `JSON generation refused: ${refusalPart.refusal}` }; } logger.error(`[LLM Clients JSON] No 'output_text' in response. ${logSuffix}. Output:`, response.output); return { error: "JSON generation failed (no text output)." }; }
    const responseText = textContentItem.text;

    if (finishReason === "max_output_tokens") { logger.error(`[LLM Clients JSON] Truncated JSON. ${logSuffix}`); const partialResult = safeJsonParse<T>(responseText); if (partialResult) return partialResult; return { error: `JSON generation failed (truncated). Finish: ${finishReason}` }; }

    const result = safeJsonParse<T>(responseText);
    if (!result || typeof result !== "object" || Array.isArray(result)) { logger.warn(`[LLM Clients JSON] Parsed non-object/null/array. Type: ${typeof result}. Raw: ${responseText.substring(0,300)}. ${logSuffix}`); return { error: `JSON parsing yielded ${typeof result}. Expected object for schema ${schemaName}.` }; }
    return result;
  } catch (error: any) {
    let errorMessage = "Structured JSON generation error.";
    if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for JSON Gen (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    logger.error(`[LLM Clients JSON] Exception: ${errorMessage}. ${logSuffix}`, { originalError: error, schemaName, schemaUsedForCall: JSON.stringify(jsonSchema).substring(0,300) });
    return { error: errorMessage };
  }
}

// generateAgentResponse - tools parameter should be SdkResponsesApiTool[] as prepared by Orchestrator
export async function generateAgentResponse(
  messages: ChatMessage[],
  responsesApiTools: SdkResponsesApiTool[] | null, // Already SdkResponsesApiTool[]
  responsesApiToolChoice: SdkResponsesApiToolChoice | null,
  modelName: string = RESPONSE_TOOL_MODEL_NAME,
  maxTokens?: number,
  userId?: string,
  instructions?: string | null
): Promise<{
  responseContent: string | null;
  // Output from Responses API for tool_calls is SdkFunctionCallOutputItem[]
  // We need to map this back to our internal ChatCompletionMessageToolCall[] if other parts of the system expect that.
  // For now, let's return what the Responses API gives for tool_calls.
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
      model: modelName, input: apiInputItems.length > 0 ? apiInputItems as any : [], // Cast to any
      max_output_tokens: maxTokens ?? MAX_OUTPUT_TOKENS, store: appConfig.nodeEnv !== "production",
    };
    if (userId) requestPayload.user = userId;
    if (instructions) requestPayload.instructions = instructions;
    // Reasoning for o-series models
    if (modelName === PLANNING_MODEL_NAME || modelName === DEVELOPER_MODEL_NAME || modelName.startsWith("o3-") || modelName.startsWith("o4-")) {
        (requestPayload as any).reasoning = { effort: "medium" };
    } else if (typeof appConfig.llm.temperature === 'number') {
        requestPayload.temperature = appConfig.llm.temperature;
    }
    // TODO: Adapter tools/tool_choice si besoin pour compatibilité future

    const start = Date.now();
    const responseRaw = await openai.responses.create({ ...requestPayload, input: apiInputItems as any });
    const response = responseRaw as any;
    const duration = Date.now() - start;

    if (response.status === "failed" || response.status === "incomplete") { const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown API error"; const apiUsage = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null; logger.error(`[LLM Clients Agent] API Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`); return { responseContent: null, toolCalls: null, finishReason: response.status, error: `Agent API error (${response.status}): ${errorReason}`, usage: apiUsage }; }

    let responseText: string | null = null;
    const assistantOutputItem = response.output?.find((item: any): item is SdkResponsesApiOutputItem => item.type === "message" && item.role === "assistant" && "content" in item);
    if (assistantOutputItem && "content" in assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      const textPart = assistantOutputItem.content.find((part: any): part is SdkTextOutputContentPart => part.type === "output_text");
      if (textPart && typeof textPart.text === "string") { responseText = textPart.text.trim(); if (responseText === "") responseText = null; }
    }

    // tool_calls from Responses API output items (type: "function_call")
    const extractedSdkFunctionCalls = response.output?.filter((item: any): item is SdkFunctionCallOutputItem => item.type === "function_call");
    const finishReasonResult = response.status === "completed" ? (extractedSdkFunctionCalls && extractedSdkFunctionCalls.length > 0 ? "tool_calls" : "stop") : response.incomplete_details?.reason || response.status;
    const mappedUsage: CompletionUsage | null = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null;
    logger.debug(`[LLM Clients Agent] Success (${duration}ms). Finish: ${finishReasonResult}. Text: ${!!responseText}. Function Calls: ${extractedSdkFunctionCalls?.length ?? 0}. Usage: ${JSON.stringify(mappedUsage)}. ${logSuffix}`);
    return { responseContent: responseText, toolCalls: extractedSdkFunctionCalls || null, finishReason: finishReasonResult, usage: mappedUsage, error: null };
  } catch (error: any) {
    let errorMessage = "Agent response generation error.";
    if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for Agent (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    logger.error(`[LLM Clients Agent] Exception: ${errorMessage}. ${logSuffix}`, { originalError: error, requestPayloadString: JSON.stringify(error.request?.body || {}).substring(0,300) });
    return { responseContent: null, toolCalls: null, finishReason: "error", error: errorMessage };
  }
}


// generateResponseWithIntent remains largely the same, relies on generateStructuredJson
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

  const userInputForJson: ChatMessageContentPart[] = [{ type: "text", text: userPrompt }];

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
   // Post-processing to remove the JSON object if it was accidentally included in responseText
  if (result.responseText.trim().endsWith("}")) {
    const jsonSuffixPattern = /\{\s*"responseText":\s*"[^"]*",\s*"intentType":\s*"[^"]*"\s*\}$/;
    if (jsonSuffixPattern.test(result.responseText.trim())) {
        result.responseText = result.responseText.trim().replace(jsonSuffixPattern, "").trim();
        logger.warn(`[LLM Clients Intent] Stripped JSON suffix from responseText. Original ended with object.`);
    }
  }
  if (!result.responseText.trim()) {
      logger.error(`[LLM Clients Intent] responseText became empty after attempting to strip JSON suffix. LLM likely returned ONLY the JSON object. Prompting needs refinement. Original result:`, result);
      return { error: "LLM returned only JSON structure, no conversational text." };
  }
  return result;
}

// generateVisionCompletion remains largely the same, relies on generateAgentResponse
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