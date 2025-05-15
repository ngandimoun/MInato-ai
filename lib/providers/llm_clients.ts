import OpenAI from "openai";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  ChatMessage,
  ChatMessageContentPart,
} from "@/lib/types/index";
import { safeJsonParse } from "@/memory-framework/core/utils";
import type {
  ChatCompletionMessageToolCall, // Internal representation if needed
} from "openai/resources/chat/completions";
import type { CompletionUsage } from "openai/resources";
import { MEDIA_UPLOAD_BUCKET } from "../constants";
import { supabase } from "../supabaseClient"; // Assuming this is the public client for storage access

// --- Initialize Raw OpenAI Client ---
if (!appConfig.openai.apiKey && typeof window === "undefined") {
  logger.error(
    "CRITICAL: OpenAI API Key is missing. LLM clients will not function."
  );
}
const openai = new OpenAI({
  apiKey: appConfig.openai.apiKey,
  maxRetries: appConfig.nodeEnv === "test" ? 0 : 3,
  timeout: 120 * 1000, // 2 minutes
});

if (appConfig.openai.apiKey && typeof window === "undefined") {
  logger.info(`[LLM Clients] Raw OpenAI Client initialized for Responses API.`);
}

// --- Model Name Constants from appConfig ---
const PLANNING_MODEL_NAME: string = appConfig.openai.planningModel || "o4-mini-2025-04-16";
const RESPONSE_TOOL_MODEL_NAME: string = appConfig.openai.chatModel || "gpt-4.1-mini-2025-04-14";
const EXTRACTION_MODEL_NAME: string = appConfig.openai.extractionModel || "gpt-4.1-nano-2025-04-14";
const COMPLEX_MODEL_NAME: string = appConfig.openai.complexModel || appConfig.openai.chatModel || "gpt-4.1-2025-04-14";
const DEVELOPER_MODEL_NAME: string = appConfig.openai.developerModel || "o3-mini-2025-01-31";
const VISION_MODEL_NAME: string = appConfig.openai.visionModel || "gpt-4.1-mini-2025-04-14"; // Doc used gpt-4.1-mini
const MAX_OUTPUT_TOKENS: number = appConfig.openai.maxTokens || 4096;
const MAX_VISION_TOKENS: number = appConfig.openai.maxVisionTokens || 2048;
const EMBEDDING_MODEL_NAME: string = appConfig.openai.embedderModel || "text-embedding-3-small";
const EMBEDDING_DIMENSIONS: number = appConfig.openai.embeddingDims || 1536;

if (typeof window === "undefined") {
  logger.info(
    `[LLM Clients] Models: Plan='${PLANNING_MODEL_NAME}', Resp/Tool='${RESPONSE_TOOL_MODEL_NAME}', Extract='${EXTRACTION_MODEL_NAME}', Complex='${COMPLEX_MODEL_NAME}', Dev='${DEVELOPER_MODEL_NAME}', Vision='${VISION_MODEL_NAME}', Embed='${EMBEDDING_MODEL_NAME}' (${EMBEDDING_DIMENSIONS}D)`
  );
}

// Types for OpenAI Responses API
type SdkResponsesApiInputItem = any;

type SdkResponsesApiInputContentPart = any;

type SdkResponsesApiTool = OpenAI.Responses.Tool;
type SdkResponsesApiToolChoice = any;

type SdkMessageOutputItem = any;
type SdkTextOutputContentPart = any;
type SdkFunctionCallOutputItemFromResponse = any;

/**
 * Helper to sanitize JSON Schema for OpenAI Responses API (function parameters and structured outputs)
 * Ensures `additionalProperties: false` and all defined properties are `required` recursively.
 */
function sanitizeJsonSchema(schema: any): any {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }

  const newSchema: any = { ...schema };

  if (newSchema.type === "object" || (Array.isArray(newSchema.type) && newSchema.type.includes("object"))) {
    // Apply to the object definition itself
    newSchema.additionalProperties = false;
    if (newSchema.properties && typeof newSchema.properties === "object") {
      newSchema.required = Object.keys(newSchema.properties);
      for (const propKey in newSchema.properties) {
        newSchema.properties[propKey] = sanitizeJsonSchema(newSchema.properties[propKey]);
      }
    } else {
      // If no properties are defined on an object, it means it should be an empty object strictly.
      newSchema.properties = {};
      newSchema.required = [];
    }
  } else if (newSchema.type === "array" && newSchema.items) {
    newSchema.items = sanitizeJsonSchema(newSchema.items);
  }

  // Handle anyOf for union types like ["object", "null"]
  // If one of the `anyOf` schemas is an object, that object schema must also be strict.
  if (Array.isArray(newSchema.anyOf)) {
    newSchema.anyOf = newSchema.anyOf.map((subSchema: any) => {
      if (subSchema.type === "object") {
        const sanitizedSubObject = sanitizeJsonSchema(subSchema);
        // Ensure the sub-object schema itself has additionalProperties:false and required fields
        if (!sanitizedSubObject.hasOwnProperty('additionalProperties')) {
            sanitizedSubObject.additionalProperties = false;
        }
        if (sanitizedSubObject.properties && !sanitizedSubObject.required) {
            sanitizedSubObject.required = Object.keys(sanitizedSubObject.properties);
        } else if (!sanitizedSubObject.properties) {
            sanitizedSubObject.properties = {};
            sanitizedSubObject.required = [];
        }
        return sanitizedSubObject;
      }
      return subSchema; // Non-object types in anyOf are fine as is
    });
  }

  // Remove unsupported keywords that might be present from richer JSON Schema definitions
  const disallowedKeywords = [
    "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "pattern", "minLength", "maxLength",
    "format", "multipleOf", "minItems", "maxItems", "uniqueItems", "minProperties", "maxProperties",
    "patternProperties", "unevaluatedProperties", "contains", "minContains", "maxContains", "default",
    // The following are particularly problematic if they are on object definitions with `additionalProperties: false`
    // and no `properties` defined, or if they expect behavior OpenAI doesn't support for strict schemas.
  ];
  for (const keyword of disallowedKeywords) {
    delete newSchema[keyword];
  }

  return newSchema;
}


async function formatMessagesForResponsesApi(
  history: ChatMessage[]
): Promise<SdkResponsesApiInputItem[]> {
  const apiMessages: SdkResponsesApiInputItem[] = [];

  for (const msg of history) {
    const contentParts: SdkResponsesApiInputContentPart[] = [];
    let hasNonTextContent = false;

    if (typeof msg.content === "string") {
      contentParts.push({ type: "input_text", text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          contentParts.push({ type: "input_text", text: part.text });
        } else if (part.type === "input_image" && part.image_url) {
          hasNonTextContent = true;
          let imageUrl = part.image_url;
          // Handle Supabase storage URLs
          if (typeof imageUrl === 'string' && imageUrl.startsWith("supabase_storage:")) {
            const storagePath = imageUrl.substring("supabase_storage:".length);
            logger.debug(`[formatMessages] Fetching Supabase image: ${storagePath}`);
            if (supabase) {
              try {
                const { data: blobData, error: downloadError } =
                  await supabase.storage
                    .from(MEDIA_UPLOAD_BUCKET)
                    .download(storagePath);
                if (downloadError) throw downloadError;
                if (!blobData) throw new Error("No blob data from Supabase.");
                const buffer = Buffer.from(await blobData.arrayBuffer());
                const mimeType = blobData.type || "image/jpeg"; // Default to jpeg if type unknown
                imageUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;
              } catch (fetchError: any) {
                logger.error(`[formatMessages] Error fetching Supabase image ${storagePath}: ${fetchError.message}.`);
                contentParts.push({ type: "input_text", text: `[ERR: Image load failed for ${storagePath.substring(storagePath.lastIndexOf("/") + 1)}]` });
                continue; // Skip this part
              }
            } else {
                logger.error(`[formatMessages] Supabase client not available for image path ${storagePath}.`);
                contentParts.push({ type: "input_text", text: `[ERR: Storage unavailable for image]` });
                continue;
            }
          }

          if (typeof imageUrl === 'string' && (imageUrl.startsWith("data:image") || imageUrl.startsWith("http"))) {
            contentParts.push({
              type: "input_image",
              image_url: imageUrl,
              detail: (part.detail as "auto" | "low" | "high") || (appConfig.openai.visionDetail as "auto" | "low" | "high") || "auto",
            });
          } else {
            logger.warn(`[formatMessages] Invalid image URL format: ${typeof imageUrl === 'string' ? imageUrl.substring(0,70) : ''}`);
            contentParts.push({ type: "input_text", text: "[ERR: Invalid image URL provided]" });
          }
        }
      }
    }

    const messageInputContent = (contentParts.length === 1 && contentParts[0].type === "input_text" && !hasNonTextContent)
      ? (contentParts[0] as { type: "input_text"; text: string }).text
      : contentParts.length > 0 ? contentParts : ""; // Pass empty string if no content parts after processing

    switch (msg.role) {
      case "system":
        // System messages become 'developer' messages or part of 'instructions'
        break;
      case "user":
        apiMessages.push({ role: "user", content: messageInputContent });
        break;
      case "assistant":
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          if (typeof messageInputContent === 'string' && messageInputContent) {
            apiMessages.push({ role: "assistant", content: messageInputContent });
          }
          msg.tool_calls.forEach((tc) => {
            if (tc.type === "function") {
              apiMessages.push({
                type: "function_call",
                call_id: tc.id,
                name: tc.function.name,
                arguments: tc.function.arguments,
              });
            }
          });
        } else if (messageInputContent !== null && messageInputContent !== "") {
           apiMessages.push({ role: "assistant", content: messageInputContent });
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
    }
  }
  return apiMessages;
}

export async function generateEmbeddingLC(
  text: string
): Promise<number[] | { error: string }> {
  if (!text || String(text).trim().length === 0)
    return { error: "Input text cannot be empty." };
  if (!openai?.embeddings) {
    logger.error(
      "[LLM Clients Embed] OpenAI client or embeddings service not available."
    );
    return { error: "OpenAI client not initialized for embeddings." };
  }
  try {
    const cleanedText = String(text)
      .replace(/[\n\r]+/g, " ")
      .trim();
    if (cleanedText.length === 0)
      return { error: "Input text empty after cleaning." };
    logger.debug(
      `[LLM Clients Embed] Generating (${EMBEDDING_MODEL_NAME}) for text (len: ${cleanedText.length})...`
    );
    const start = Date.now();
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL_NAME,
      input: cleanedText,
      encoding_format: "float",
      dimensions: EMBEDDING_DIMENSIONS,
    });
    const duration = Date.now() - start;
    const embedding = embeddingResponse?.data?.[0]?.embedding;
    if (
      !embedding ||
      !Array.isArray(embedding) ||
      embedding.length !== EMBEDDING_DIMENSIONS
    ) {
      logger.error(
        `[LLM Clients Embed] Invalid response or dimension mismatch. Expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}. Model: ${EMBEDDING_MODEL_NAME}`
      );
      throw new Error(
        `Invalid embedding response or dimension mismatch (expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}).`
      );
    }
    logger.debug(
      `[LLM Clients Embed] Generated (${duration}ms). Dim: ${embedding.length}`
    );
    return embedding;
  } catch (error: any) {
    let errorMessage = "Embedding failed.";
    if (error instanceof OpenAI.APIError)
      errorMessage = `OpenAI Embedding API Error (${error.status || "N/A"} ${
        error.code || "N/A"
      }): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    logger.error(`[LLM Clients Embed] Error: ${errorMessage}`, {
      originalError: error,
    });
    return { error: errorMessage };
  }
}

export async function generateStructuredJson<
  T extends Record<string, any> = Record<string, any>
>(
  instructions: string, // Renamed from systemInstruction for clarity with Responses API
  userInput: string | ChatMessageContentPart[], // Can be simple string or multimodal
  jsonSchema: Record<string, any>,
  schemaName: string,
  history: ChatMessage[] = [], // Not directly used if instructions + userInput form the full context
  modelName: string = EXTRACTION_MODEL_NAME,
  userId?: string
): Promise<T | { error: string }> {
  if (!openai?.responses) {
    logger.error("[LLM Clients JSON] OpenAI responses service unavailable.");
    return { error: "OpenAI client not initialized." };
  }
  const logSuffix = `User:${userId ? userId.substring(0, 8) : "N/A"} Model:${modelName} Schema:${schemaName}`;
  try {
    logger.debug(`[LLM Clients JSON] Generating with ${logSuffix}`);

    const inputMessages: SdkResponsesApiInputItem[] = [];
    // The `instructions` param of `responses.create` is for high-level system behavior.
    // For structured JSON extraction, the schema and task are often better placed in a developer message.
    if (instructions) {
        inputMessages.push({role: "developer", content: instructions + `\n\nOutput ONLY a single JSON object matching the schema named '${schemaName}'.`});
    }
    
    const userContentParts: SdkResponsesApiInputContentPart[] = [];
    if (typeof userInput === 'string') {
        userContentParts.push({type: "input_text", text: userInput});
    } else if (Array.isArray(userInput)) {
        for (const part of userInput) {
            if (part.type === "text") userContentParts.push({type: "input_text", text: part.text});
            // Add image/other multimodal parts if necessary for this specific JSON extraction
        }
    }
    if (userContentParts.length > 0) {
        inputMessages.push({role: "user", content: userContentParts as any}); // Cast as any if type mismatch
    }


    if (inputMessages.length === 0) {
      logger.error(`[LLM Clients JSON] No valid messages or instructions for API. ${logSuffix}`);
      return { error: "No valid messages or instructions to send to API." };
    }
    
    const sanitizedSchema = sanitizeJsonSchema(jsonSchema);

    const requestPayload: OpenAI.Responses.ResponseCreateParams = {
      model: modelName,
      input: inputMessages,
      // instructions: instructions, // Alternative: put system prompt here
      text: { // Forcing JSON output according to schema
        format: {
          type: "json_schema",
          name: schemaName,
          schema: sanitizedSchema,
          strict: true, // Enforce schema
        },
      },
      store: appConfig.nodeEnv !== "production", // Store requests for debugging if not in prod
      max_output_tokens: MAX_OUTPUT_TOKENS,
    };
    if (userId) requestPayload.user = userId;
    if (modelName === PLANNING_MODEL_NAME || modelName === DEVELOPER_MODEL_NAME) {
        (requestPayload as any).reasoning = { effort: "medium" }; // Example, adjust as needed
    }


    const start = Date.now();
    const response = await openai.responses.create(requestPayload);
    const duration = Date.now() - start;

    if (response.status === "failed" || response.status === "incomplete") {
      const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown error";
      logger.error(
        `[LLM Clients JSON] Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`,
        response.error ? { errorDetails: response.error } : {}
      );
      return { error: `JSON generation failed (${response.status}): ${errorReason}` };
    }

    const assistantOutputItem = response.output?.find(
      (item): item is SdkMessageOutputItem => item.type === "message" && item.role === "assistant" && "content" in item
    );
    let textContentItem: SdkTextOutputContentPart | undefined;
    if (assistantOutputItem && "content" in assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      textContentItem = assistantOutputItem.content.find(
        (part: any): part is SdkTextOutputContentPart => part.type === "output_text"
      );
    }

    const finishReason = response.status === "completed" ? "stop" : response.incomplete_details?.reason || response.status;
    logger.debug(
      `[LLM Clients JSON] Success (${duration}ms). Finish: ${finishReason}. Usage: ${JSON.stringify(response.usage)}. ${logSuffix}`
    );

    if (!textContentItem || !textContentItem.text) {
      const refusalPart = (assistantOutputItem?.content as any[])?.find((p: any) => p.type === 'refusal');
      if (refusalPart) {
        logger.error(`[LLM Clients JSON] Model refused to generate JSON: ${refusalPart.refusal}. Schema: ${schemaName}. ${logSuffix}`);
        return { error: `JSON generation refused: ${refusalPart.refusal}` };
      }
      logger.error(`[LLM Clients JSON] No 'output_text' in response. ${logSuffix}. Output:`, response.output);
      return { error: "JSON generation failed (no text output)." };
    }
    const responseText = textContentItem.text;

    if (finishReason === "max_output_tokens") {
      logger.error(`[LLM Clients JSON] Truncated JSON due to max_output_tokens. ${logSuffix}`);
      // Attempt to parse partial JSON, but it's risky
      const partialResult = safeJsonParse<T>(responseText);
      if (partialResult) return partialResult; // Return partial if parsable, otherwise error
      return { error: `JSON generation failed (truncated by max_output_tokens). Finish: ${finishReason}` };
    }

    const result = safeJsonParse<T>(responseText);
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      logger.warn(
        `[LLM Clients JSON] Parsed non-object/null/array. Type: ${typeof result}. Raw: ${responseText.substring(0,300)}. ${logSuffix}`
      );
      return { error: `JSON parsing yielded ${typeof result}. Expected object for schema ${schemaName}.` };
    }
    return result;
  } catch (error: any) {
    let errorMessage = "Structured JSON generation error.";
    if (error instanceof OpenAI.APIError)
      errorMessage = `OpenAI API Error for JSON Gen (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    logger.error(
      `[LLM Clients JSON] Exception: ${errorMessage}. ${logSuffix}`,
      { originalError: error }
    );
    return { error: errorMessage };
  }
}


export async function generateAgentResponse(
  messages: ChatMessage[],
  chatCompletionTools: OpenAI.Chat.Completions.ChatCompletionTool[] | null,
  chatCompletionToolChoice: OpenAI.Chat.Completions.ChatCompletionToolChoiceOption | null,
  modelName: string = RESPONSE_TOOL_MODEL_NAME,
  maxTokens?: number,
  userId?: string,
  instructions?: string | null // System-level instructions
): Promise<{
  responseContent: string | null;
  toolCalls: ChatCompletionMessageToolCall[] | null; // Your internal representation
  finishReason: string | undefined;
  usage?: CompletionUsage | null;
  error?: string | null;
}> {
  if (!openai?.responses) {
    logger.error("[LLM Clients Agent] OpenAI responses service unavailable.");
    return { responseContent: null, toolCalls: null, finishReason: "error", error: "OpenAI client not initialized." };
  }
  const logSuffix = `User:${userId ? userId.substring(0, 8) : "N/A"} Model:${modelName}`;
  try {
    if (!messages || messages.length === 0) {
      return { responseContent: null, toolCalls: null, finishReason: "error", error: "No messages." };
    }

    const apiInputItems = await formatMessagesForResponsesApi(messages);

    if (apiInputItems.length === 0 && !instructions) {
      logger.error(`[LLM Clients Agent] No valid API input messages or instructions. ${logSuffix}`);
      return { responseContent: null, toolCalls: null, finishReason: "error", error: "No messages or instructions for API." };
    }

    const requestPayload: OpenAI.Responses.ResponseCreateParams = {
      model: modelName,
      input: apiInputItems.length > 0 ? apiInputItems : [], // Ensure it's always an array
      max_output_tokens: maxTokens ?? MAX_OUTPUT_TOKENS,
      store: appConfig.nodeEnv !== "production", // Store requests for debugging if not in prod
    };

    if (userId) requestPayload.user = userId;
    if (instructions) requestPayload.instructions = instructions;

    // Set temperature unless it's a planning model
    if (modelName !== PLANNING_MODEL_NAME && typeof appConfig.llm.temperature === 'number') {
      requestPayload.temperature = appConfig.llm.temperature;
    } else if (modelName === PLANNING_MODEL_NAME) {
      // For planning models, temperature is not supported.
      // o-series models use `reasoning: {effort: "..."}`.
      (requestPayload as any).reasoning = { effort: "medium" }; // default for o4-mini
      delete requestPayload.temperature; // Ensure temperature is not sent
    }
    if (modelName === DEVELOPER_MODEL_NAME) { // e.g. o3-mini
        (requestPayload as any).reasoning = { effort: "medium" };
        delete requestPayload.temperature;
    }


    // Map ChatCompletionTools to ResponsesApiTools
    if (chatCompletionTools && chatCompletionTools.length > 0) {
      const mappedTools = chatCompletionTools
        .map(tool => {
          if (tool.type === "function" && tool.function) {
            const sanitizedParams = sanitizeJsonSchema(tool.function.parameters as Record<string, any>);
            return {
              type: "function",
              name: tool.function.name,
              description: tool.function.description,
              parameters: sanitizedParams,
              strict: true, // Enforce strict schema for tool calls
            } as SdkResponsesApiTool;
          }
          return null;
        })
        .filter((t): t is SdkResponsesApiTool => t !== null && typeof (t as any).name === "string" && (t as any).name.trim() !== "");

      if (mappedTools.length > 0) {
        requestPayload.tools = mappedTools;
        if (chatCompletionToolChoice) {
          if (typeof chatCompletionToolChoice === "string" && ["auto", "none", "required"].includes(chatCompletionToolChoice)) {
            requestPayload.tool_choice = chatCompletionToolChoice as SdkResponsesApiToolChoice;
          } else if (typeof chatCompletionToolChoice === "object" && chatCompletionToolChoice.type === "function" && chatCompletionToolChoice.function?.name) {
            requestPayload.tool_choice = { type: "function", name: chatCompletionToolChoice.function.name };
          } else {
            requestPayload.tool_choice = "auto";
          }
        } else {
          requestPayload.tool_choice = "auto"; // Default if tools are present
        }
        logger.debug(`[LLM Clients Agent] Tools for Responses API: ${requestPayload.tools.map(t => (t as any).name || t.type).join(', ')}. Choice: ${JSON.stringify(requestPayload.tool_choice)}. ${logSuffix}`);
      }
    }

    const start = Date.now();
    const response = await openai.responses.create(requestPayload);
    const duration = Date.now() - start;

    if (response.status === "failed" || response.status === "incomplete") {
      const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown API error";
      logger.error(
        `[LLM Clients Agent] API Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`,
        response.error ? { errorDetails: response.error } : {}
      );
      const apiUsage = response.usage ? {
        prompt_tokens: response.usage.input_tokens ?? 0,
        completion_tokens: response.usage.output_tokens ?? 0,
        total_tokens: response.usage.total_tokens ?? 0,
      } : null;
      return { responseContent: null, toolCalls: null, finishReason: response.status, error: `Agent API error (${response.status}): ${errorReason}`, usage: apiUsage };
    }

    let responseText: string | null = null;
    const assistantOutputItem = response.output?.find(
      (item): item is SdkMessageOutputItem => item.type === "message" && item.role === "assistant" && "content" in item
    );

    if (assistantOutputItem && "content" in assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      const textPart = assistantOutputItem.content.find(
        (part: any): part is SdkTextOutputContentPart => part.type === "output_text"
      );
      if (textPart && typeof textPart.text === "string") {
        responseText = textPart.text.trim();
        if (responseText === "") responseText = null;
      }
    }

    const extractedSdkToolCalls = response.output?.filter(
      (item): item is SdkFunctionCallOutputItemFromResponse => item.type === "function_call"
    );

    let toolCallsResult: ChatCompletionMessageToolCall[] | null = null;
    if (extractedSdkToolCalls && extractedSdkToolCalls.length > 0) {
      toolCallsResult = extractedSdkToolCalls.map(fcItem => ({
        id: fcItem.call_id, // Map call_id to id
        type: "function",
        function: {
          name: fcItem.name,
          arguments: fcItem.arguments || "{}",
        },
      }));
    }

    const finishReasonResult = response.status === "completed"
      ? (toolCallsResult ? "tool_calls" : "stop")
      : response.incomplete_details?.reason || response.status;

    const mappedUsage: CompletionUsage | null = response.usage ? {
      prompt_tokens: response.usage.input_tokens ?? 0,
      completion_tokens: response.usage.output_tokens ?? 0,
      total_tokens: response.usage.total_tokens ?? 0,
    } : null;

    logger.debug(
      `[LLM Clients Agent] Success (${duration}ms). Finish: ${finishReasonResult}. Text: ${!!responseText}. Tool Calls: ${toolCallsResult?.length ?? 0}. Usage: ${JSON.stringify(mappedUsage)}. ${logSuffix}`
    );

    return {
      responseContent: responseText,
      toolCalls: toolCallsResult,
      finishReason: finishReasonResult,
      usage: mappedUsage,
      error: null,
    };
  } catch (error: any) {
    let errorMessage = "Agent response generation error.";
    if (error instanceof OpenAI.APIError)
      errorMessage = `OpenAI API Error for Agent (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    logger.error(
      `[LLM Clients Agent] Exception: ${errorMessage}. ${logSuffix}`,
      { originalError: error }
    );
    return { responseContent: null, toolCalls: null, finishReason: "error", error: errorMessage };
  }
}

export async function generateResponseWithIntent(
  instructions: string,
  userPrompt: string,
  history: ChatMessage[] = [],
  modelName: string = RESPONSE_TOOL_MODEL_NAME, // Can be changed to EXTRACTION_MODEL if intent is simple
  maxTokens?: number,
  userId?: string
): Promise<{ responseText: string; intentType: string } | { error: string }> {
  const logSuffix = `User:${userId ? userId.substring(0, 8) : "N/A"} Model:${modelName}`;
  logger.debug(`[LLM Clients Intent] Generating response and intent. ${logSuffix}`);

  // Schema for LLMIntentResponse
  const intentSchema = {
    type: "object" as const,
    properties: {
      responseText: { type: "string" as const, description: "The natural language response for the user." },
      intentType: {
        type: "string" as const,
        description: "The single best intent classification.",
        enum: [
          "neutral", "informative", "questioning", "assertive", "formal", "celebratory",
          "happy", "encouraging", "apologetic", "empathetic", "concerned", "disappointed",
          "urgent", "calm", "gentle", "whispering", "sarcastic", "humorous", "roasting",
          "flirtatious", "intimate", "thinking", "greeting", "farewell", "confirmation_positive",
          "confirmation_negative", "clarification", "apology", "empathy", "instructional",
          "warning", "error", "workflow_update",
        ],
      },
    },
    required: ["responseText", "intentType"],
    additionalProperties: false,
  };
  const schemaNameForIntent = "minato_intent_response_v1";

  // For generateStructuredJson, the userPrompt is the main content to analyze.
  // The 'instructions' parameter of generateStructuredJson becomes the system/developer message.
  const result = await generateStructuredJson<{ responseText: string; intentType: string }>(
    instructions, // This will be the system/developer prompt guiding the extraction
    userPrompt,   // The user's input from which to derive intent and response
    intentSchema,
    schemaNameForIntent,
    history, // History can be passed to generateStructuredJson which might use it
    modelName,
    userId
  );

  if ("error" in result) {
    logger.error(`[LLM Clients Intent] Structured JSON for intent failed: ${result.error}. ${logSuffix}`);
    // Fallback: try to get a plain text response if JSON fails
    const fallbackAgentResult = await generateAgentResponse(
        [{role: "user", content: userPrompt}], null, "none", modelName, maxTokens, userId, instructions
    );
    if (fallbackAgentResult.responseContent) {
        return { responseText: fallbackAgentResult.responseContent, intentType: "neutral" };
    }
    return { error: result.error };
  }
  return result; // result is already { responseText: string; intentType: string }
}

export async function generateVisionCompletion(
  messages: ChatMessage[], // This should contain the text prompt and image_url parts
  modelName: string = VISION_MODEL_NAME,
  maxTokens?: number,
  userId?: string
): Promise<{ text: string | null; error?: string | null; usage?: CompletionUsage | null }> {
  const logSuffix = `User:${userId ? userId.substring(0, 8) : "N/A"} Model:${modelName}`;
  logger.debug(`[LLM Clients Vision] Generating vision completion. ${logSuffix}`);

  const hasImage = messages.some(msg => Array.isArray(msg.content) && msg.content.some(part => part.type === "input_image"));
  if (!hasImage) {
    return { text: null, error: "No image content provided for vision analysis." };
  }

  // Vision models via Responses API don't use 'tools' or 'tool_choice' typically for description tasks.
  // Instructions are key.
  const visionInstructions = "Analyze the provided image(s) in detail and describe what you see. If text is provided with the image(s), consider it as part of the query or context for the analysis.";

  const agentResult = await generateAgentResponse(
    messages,
    null, // No tools for simple vision description
    "none", // No tool choice
    modelName,
    maxTokens ?? MAX_VISION_TOKENS,
    userId,
    visionInstructions
  );

  if (agentResult.error) {
    return { text: null, error: agentResult.error, usage: agentResult.usage };
  }
  if (agentResult.responseContent === null && agentResult.finishReason !== "stop") {
    logger.warn(`[LLM Clients Vision] Model returned no text, finish_reason: ${agentResult.finishReason}. ${logSuffix}`);
  }
  return { text: agentResult.responseContent, error: null, usage: agentResult.usage };
}

export { openai as rawOpenAiClient };
