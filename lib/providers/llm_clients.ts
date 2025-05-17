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
ChatCompletionContentPartRefusal,
} from "openai/resources/chat/completions";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
ChatMessage,
UserState,
ResponseApiInputContent, // May not be needed if ChatMessage is used directly
} from "@/lib/types/index";
import { safeJsonParse } from "@/memory-framework/core/utils";
import type { CompletionUsage } from "openai/resources";
import { MEDIA_UPLOAD_BUCKET } from "../constants";
import { supabase } from "../supabaseClient"; // Using the public client for URL construction
import { ChatMessageContentPart } from "@/lib/types/index";

// --- Initialize Raw OpenAI Client ---
if (!appConfig.openai.apiKey && typeof window === "undefined") {
logger.error("CRITICAL: OpenAI API Key is missing. LLM clients will not function.");
// Consider throwing an error in production to prevent startup without key
// if (process.env.NODE_ENV === "production") throw new Error("OpenAI API Key missing.");
}
const openai = new OpenAI({
apiKey: appConfig.openai.apiKey,
maxRetries: appConfig.nodeEnv === "test" ? 0 : 3,
timeout: 120 * 1000, // 2 minutes, consider making configurable
});
if (appConfig.openai.apiKey && typeof window === "undefined") {
logger.info(`[LLM Clients] Raw OpenAI Client initialized for Responses API.`);
}

// --- Model Name Constants ---
// Updated based on new strategy
const CHAT_VISION_MODEL_NAME: string = appConfig.openai.chatModel; // e.g., gpt-4o-2024-08-06
const PLANNING_MODEL_NAME: string = appConfig.openai.planningModel; // e.g., gpt-4.1-2025-04-14 (for tool_router)
const EXTRACTION_MODEL_NAME: string = appConfig.openai.extractionModel; // e.g., gpt-4.1-nano
const DEVELOPER_MODEL_NAME: string = appConfig.openai.developerModel; // e.g., o3-mini

const MAX_OUTPUT_TOKENS: number = appConfig.openai.maxTokens;
const MAX_VISION_TOKENS: number = appConfig.openai.maxVisionTokens;
const EMBEDDING_MODEL_NAME: string = appConfig.openai.embedderModel;
const EMBEDDING_DIMENSIONS: number = appConfig.openai.embeddingDims;

type SdkResponsesApiInputItem = ChatCompletionMessageParam;
type SdkResponsesApiMessageParam = ChatCompletionMessageParam;
type SdkResponsesApiContentPart = ChatCompletionContentPart;
type SdkResponsesApiTool = ChatCompletionTool;
type SdkResponsesApiToolChoice = ChatCompletionToolChoiceOption | "auto" | "none" | string; // Allow string for specific tool
type SdkResponsesApiOutputItem = ChatCompletionMessage;
type SdkAssistantTextOutputContentPart = Extract<SdkResponsesApiContentPart, { type: "output_text" }>;
type SdkInputTextContentPart = Extract<SdkResponsesApiContentPart, { type: "input_text" }>; // Ensure this type is used for input_text
type SdkFunctionCallOutputItem = ChatCompletionMessageToolCall;
type ImageURLPayload = OpenAI.Chat.Completions.ChatCompletionContentPartImage.ImageURL;


// Helper to convert app's ChatMessage format to OpenAI Responses API format
async function formatMessagesForResponsesApi(
  messages: ChatMessage[],
  userId?: string
): Promise<SdkResponsesApiMessageParam[]> {
  const apiMessages: SdkResponsesApiMessageParam[] = [];

  for (const msg of messages) {
    let messageInputContentParts: SdkResponsesApiContentPart[] = [];

    if (typeof msg.content === "string") {
      if (msg.content.trim()) {
        messageInputContentParts.push({ type: "text", text: msg.content });
      }
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && typeof part.text === 'string' && part.text.trim()) {
          messageInputContentParts.push({ type: "text", text: part.text });
        } else if ((part as any).type === 'input_image' && typeof (part as any).image_url === 'string') {
          let imageUrl = (part as any).image_url;
          // Handle supabase_storage: prefix
          if (imageUrl.startsWith("supabase_storage:")) {
            const storagePath = imageUrl.substring("supabase_storage:".length);
            const { data: urlData } = supabase.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(storagePath);
            if (urlData?.publicUrl) {
              imageUrl = urlData.publicUrl;
              logger.debug(`[formatMessages] Resolved Supabase storage URL: ${storagePath} -> ${imageUrl.substring(0,50)}...`);
            } else {
              logger.warn(`[formatMessages] Could not get public URL for Supabase storage path: ${storagePath}. Skipping image.`);
              continue; // Skip this image part
            }
          }
          messageInputContentParts.push({
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: (part as any).detail || appConfig.openai.visionDetail,
            },
          });
        } else if ((part as any).type === 'image_url' && typeof (part as any).image_url?.url === 'string') { // Already in OpenAI format
            messageInputContentParts.push({
                type: "image_url",
                image_url: (part as any).image_url
            });
        }
      }
    }

    // Add attachments as image_url parts if they are images
    if (msg.attachments) {
      for (const att of msg.attachments) {
        if (att.type === "image" && att.url && !att.url.startsWith("blob:")) { // blob URLs are client-side only
          messageInputContentParts.push({
            type: "image_url",
            image_url: {
              url: att.url,
              detail: appConfig.openai.visionDetail,
            },
          });
        } else if (att.type === "image" && (att as any).storagePath) {
            const storagePath = (att as any).storagePath;
            const { data: urlData } = supabase.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(storagePath);
            if (urlData?.publicUrl) {
                messageInputContentParts.push({
                    type: "image_url",
                    image_url: { url: urlData.publicUrl, detail: appConfig.openai.visionDetail },
                });
            } else {
                logger.warn(`[formatMessages] Could not get public URL for attachment storage path: ${storagePath}`);
            }
        } else {
          // TODO: gérer d'autres types d'attachments si besoin
        }
      }
    }
    
    // Ensure content is not empty before pushing
    if (messageInputContentParts.length === 0 && msg.role !== 'tool' && !(msg.role === 'assistant' && msg.tool_calls && msg.tool_calls.length > 0) ) {
      // Allow tool or assistant message with only tool_calls to be pushed even if contentParts is empty
      continue;
    }

    switch (msg.role) {
      case "user":
        // Cast en ChatCompletionContentPart[] pour satisfaire le typage OpenAI
        apiMessages.push({ role: "user", content: messageInputContentParts.length > 0 ? (messageInputContentParts as ChatCompletionContentPart[]) : "" });
        break;
      case "system":
        // OpenAI attend un content de type string ou ChatCompletionContentPartText[] pour 'system'.
        if (messageInputContentParts.length === 0) {
          apiMessages.push({ role: "system", content: "" });
        } else if (messageInputContentParts.every(p => p.type === "text")) {
          apiMessages.push({ role: "system", content: messageInputContentParts as ChatCompletionContentPartText[] });
        } else {
          // Si des images ou autres types sont présents, on ne garde que le texte
          const textParts = messageInputContentParts.filter(p => p.type === "text") as ChatCompletionContentPartText[];
          if (textParts.length > 0) {
            apiMessages.push({ role: "system", content: textParts });
          } else {
            apiMessages.push({ role: "system", content: "" });
          }
        }
        break;
      case "assistant":
        // OpenAI attend un content de type string | (ChatCompletionContentPartText | ChatCompletionContentPartRefusal)[] | null | undefined pour assistant.
        let assistantContent: string | (ChatCompletionContentPartText | ChatCompletionContentPartRefusal)[] | null | undefined = null;
        if (messageInputContentParts.length === 0) {
          assistantContent = null;
        } else if (messageInputContentParts.every(p => p.type === "text" || (p as any).type === "refusal")) {
          assistantContent = messageInputContentParts as (ChatCompletionContentPartText | ChatCompletionContentPartRefusal)[];
        } else {
          // Si des images ou autres types sont présents, on ne garde que le texte/refusal
          const textOrRefusalParts = messageInputContentParts.filter(p => p.type === "text" || (p as any).type === "refusal") as (ChatCompletionContentPartText | ChatCompletionContentPartRefusal)[];
          if (textOrRefusalParts.length > 0) {
            assistantContent = textOrRefusalParts;
          } else {
            assistantContent = null;
          }
        }
        const assistantMessagePayload: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: assistantContent,
        };
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          assistantMessagePayload.tool_calls = msg.tool_calls;
        }
        if (assistantMessagePayload.content || (assistantMessagePayload.tool_calls && assistantMessagePayload.tool_calls.length > 0)) {
          apiMessages.push(assistantMessagePayload);
        }
        break;
      case "tool":
        if (msg.tool_call_id && msg.content) { // Content for tool is string result
          apiMessages.push({
            role: "tool",
            tool_call_id: msg.tool_call_id,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content), // Ensure string
          });
        }
        break;
      // TODO: gérer d'autres rôles si besoin
    }
  }
  return apiMessages;
}


// --- Embedding Function ---
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
        if (error instanceof OpenAI.APIError) errorMessage = `OpenAI Embedding API Error (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
        else if (error.message) errorMessage = error.message;
        logger.error(`[LLM Clients Embed] Error: ${errorMessage}`, { originalError: error });
        return { error: errorMessage };
    }
}


// --- Structured JSON Output Generation (using OpenAI Responses API) ---
// This function is primarily for the TOOL ROUTER (GPT-4.1) and Memory Extraction (Nano)
export async function generateStructuredJson<T extends Record<string, any> = Record<string, any>>(
  instructions: string,
  userInput: string, // Tool router primarily uses text input
  jsonSchema: Record<string, any>,
  schemaName: string,
  historyForContext: ChatMessage[] = [], // Text history for context
  modelName: string, // Specify GPT-4.1 or Nano
  userId?: string
): Promise<T | { error: string }> {
  if (!openai?.responses) { logger.error("[LLM Clients JSON] OpenAI responses service unavailable."); return { error: "OpenAI client not initialized." }; }
  const logSuffix = `User:${userId ? userId.substring(0,8) : "N/A"} Model:${modelName} Schema:${schemaName}`;
  try {
    logger.debug(`[LLM Clients JSON] Generating with ${logSuffix}`);
    
    const formattedHistory = await formatMessagesForResponsesApi(historyForContext.filter(m => typeof m.content === 'string')); // Filter for text-only history for planner
    const inputMessages: SdkResponsesApiMessageParam[] = [
        ...formattedHistory,
        { role: "user", content: userInput }
    ];

    if (inputMessages.length === 0 && !instructions) { logger.error(`[LLM Clients JSON] No valid messages or instructions. ${logSuffix}`); return { error: "No valid messages or instructions to send." }; }

    const requestPayload: OpenAI.Responses.ResponseCreateParams = {
      model: modelName,
      input: inputMessages as any, // Cast pour compatibilité typage SDK
      instructions: instructions || undefined,
      text: { format: { type: "json_schema", name: schemaName, schema: jsonSchema, strict: true } }, // Enforce strict schema
      store: appConfig.nodeEnv !== "production", // Store for debugging if not prod
      max_output_tokens: (modelName === PLANNING_MODEL_NAME) // Use PLANNING_MODEL_NAME from constants
                          ? Math.min(2048, MAX_OUTPUT_TOKENS) // Planner output is usually smaller
                          : MAX_OUTPUT_TOKENS,
      temperature: (modelName === PLANNING_MODEL_NAME) ? 0.0 : (appConfig.llm.temperature ?? 0.7), // Deterministic for planner
    };
    if (userId) requestPayload.user = userId;

    const start = Date.now();
    const responseRaw = await openai.responses.create(requestPayload);
    const response = responseRaw as any; // Cast to any to access .status, .output etc.
    const duration = Date.now() - start;

    if (response.status === "failed" || response.status === "incomplete") {
      const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown error";
      logger.error(`[LLM Clients JSON] Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`);
      return { error: `JSON generation failed (${response.status}): ${errorReason}` };
    }

    const assistantOutputItem = response.output?.find((item: any): item is SdkResponsesApiOutputItem =>
        item.type === "message" && item.role === "assistant" && "content" in item
    );

    let textContentItem: SdkAssistantTextOutputContentPart | undefined;
    if (assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      textContentItem = assistantOutputItem.content.find((part: any): part is SdkAssistantTextOutputContentPart =>
        part.type === "output_text"
      );
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
    const responseText: string | undefined = (textContentItem as any).text;

    if (typeof responseText !== 'string') {
      logger.error(`[LLM Clients JSON] responseText is undefined or not a string after extraction.`);
      return { error: "No valid text output found in assistant response (undefined)." };
    }

    if (finishReason === "max_output_tokens") {
      logger.error(`[LLM Clients JSON] Truncated JSON due to max_output_tokens. ${logSuffix}`);
      const partialResult = safeJsonParse<T>(responseText);
      if (partialResult) return partialResult; // Return partial if parsable
      return { error: `JSON generation failed (truncated due to max_output_tokens). Finish: ${finishReason}` };
    }
    
    const result = safeJsonParse<T>(responseText);
    if (!result || typeof result !== "object") { // Allow array for tool router output
      logger.warn(`[LLM Clients JSON] Parsed non-object/null/array (unless expected array). Type: ${typeof result}. Raw: ${responseText.substring(0,300)}. ${logSuffix}`);
      // If schemaName hints at array (e.g. tool_router_plan), allow array
      if (schemaName.includes("router") && Array.isArray(result)) {
          return result; // Allow array if it's the tool router
      }
      return { error: `JSON parsing yielded ${typeof result}. Expected object for schema ${schemaName} (or array for router).` };
    }
    return result;
  } catch (error: any) {
    let errorMessage = "Structured JSON generation error.";
    if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for JSON Gen (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    logger.error(`[LLM Clients JSON] Exception: ${errorMessage}. ${logSuffix}`, { originalError: error, schemaName, schemaUsedForCall: jsonSchema });
    return { error: errorMessage };
  }
}


// --- Main Agent Response Generation (using OpenAI Responses API with GPT-4o) ---
export async function generateAgentResponse(
  messages: ChatMessage[], // User, Assistant, Tool messages
  responsesApiTools: SdkResponsesApiTool[] | null, // Tools for GPT-4o to potentially call if router didn't
  responsesApiToolChoice: SdkResponsesApiToolChoice | null, // tool_choice for GPT-4o
  modelName: string = CHAT_VISION_MODEL_NAME, // Default to GPT-4o
  maxTokens?: number,
  userId?: string,
  instructions?: string | null // System prompt / instructions
): Promise<{
  responseContent: string | ChatMessageContentPart[] | null; // Allow complex content from GPT-4o
  toolCalls: SdkFunctionCallOutputItem[] | null; // From SdkFunctionCallOutputItem
  finishReason: string | undefined;
  usage?: CompletionUsage | null;
  error?: string | null;
}> {
  if (!openai?.responses) { return { responseContent: null, toolCalls: null, finishReason: "error", error: "OpenAI client not initialized." }; }
  const logSuffix = `User:${userId ? userId.substring(0,8) : "N/A"} Model:${modelName}`;
  try {
    if (!messages || messages.length === 0) return { responseContent: null, toolCalls: null, finishReason: "error", error: "No messages provided to generateAgentResponse." };
    
    const apiInputItems = await formatMessagesForResponsesApi(messages, userId);

    if (apiInputItems.length === 0 && !instructions) {
      return { responseContent: null, toolCalls: null, finishReason: "error", error: "No processable messages or instructions for API." };
    }

    const requestPayload: OpenAI.Responses.ResponseCreateParams = {
      model: modelName,
      input: apiInputItems as any, // Cast pour compatibilité typage SDK
      instructions: instructions || undefined,
      max_output_tokens: maxTokens ?? MAX_OUTPUT_TOKENS,
      store: appConfig.nodeEnv !== "production",
      temperature: appConfig.llm.temperature ?? 0.7,
    };
    if (userId) requestPayload.user = userId;
    if (responsesApiTools && responsesApiTools.length > 0) requestPayload.tools = responsesApiTools as any; // Cast pour compatibilité typage SDK
    if (responsesApiToolChoice) requestPayload.tool_choice = responsesApiToolChoice as any; // Cast pour compatibilité typage SDK

    const start = Date.now();
    const responseRaw = await openai.responses.create(requestPayload);
    const response = responseRaw as any; // Cast to access .status, .output
    const duration = Date.now() - start;

    if (response.status === "failed" || response.status === "incomplete") {
      const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown API error";
      const apiUsage = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null;
      logger.error(`[LLM Clients Agent] API Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`);
      return { responseContent: null, toolCalls: null, finishReason: response.status, error: `Agent API error (${response.status}): ${errorReason}`, usage: apiUsage };
    }

    let finalAssistantContent: string | ChatMessageContentPart[] | null = null;
    const assistantOutputItem = response.output?.find((item: any): item is SdkResponsesApiOutputItem =>
        item.type === "message" && item.role === "assistant" && "content" in item
    );

    if (assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      // GPT-4o can return multiple content parts (e.g., text and image_url if it were to generate images, which it doesn't yet via API)
      // For now, we primarily expect text or a single type.
      // If it's just text, extract it. If it's more complex, return the array.
      const textParts = assistantOutputItem.content.filter((p: any) => p.type === "output_text" && typeof p.text === 'string');
      if (textParts.length === assistantOutputItem.content.length && textParts.length > 0) { // All parts are text
        finalAssistantContent = textParts.map((p: any) => p.text).join("\n").trim();
        if (finalAssistantContent === "") finalAssistantContent = null;
      } else if (assistantOutputItem.content.length > 0) { // Mixed content or non-text only
        finalAssistantContent = assistantOutputItem.content.map((p: any) => {
            if(p.type === "output_text") return {type: "text", text: p.text};
            // Map other potential output types if OpenAI adds them for assistant role
            return p;
        }) as ChatMessageContentPart[];
      }
    } else if (assistantOutputItem && typeof assistantOutputItem.content === 'string') { // Should not happen with Responses API for assistant message if content has text
        finalAssistantContent = assistantOutputItem.content.trim();
        if (finalAssistantContent === "") finalAssistantContent = null;
    }


    // Extract tool_calls which are now top-level in the 'output' array for Responses API
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
    if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for Agent (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    logger.error(`[LLM Clients Agent] Exception: ${errorMessage}. ${logSuffix}`, { originalError: error, requestPayloadString: JSON.stringify((error as any).request?.body || {}).substring(0,300) });
    return { responseContent: null, toolCalls: null, finishReason: "error", error: errorMessage };
  }
}


// --- Response with Intent Generation (using GPT-4o) ---
export async function generateResponseWithIntent(
  instructions: string,
  userPrompt: string | ChatMessageContentPart[], // Allow multimodal user prompt
  history: ChatMessage[] = [],
  modelName: string = CHAT_VISION_MODEL_NAME, // Default to GPT-4o
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
  const schemaNameForIntent = "minato_intent_response_v4_gpt4o"; // Updated schema name for new model

  // The `userInput` for generateStructuredJson needs to be a string.
  // If `userPrompt` is multimodal, convert it to a descriptive string.
  let stringUserInputForJson: string;
  if (typeof userPrompt === 'string') {
    stringUserInputForJson = userPrompt;
  } else {
    // Create a string representation for multimodal input
    stringUserInputForJson = userPrompt.map(part => {
      if (part.type === 'text') return part.text;
      if ((part as any).type === 'image_url') return "[Image was provided by user]"; // Placeholder for image
      return "[Unknown content part]";
    }).join(" ");
  }
  
  const result = await generateStructuredJson<{ responseText: string; intentType: string }>(
    instructions, stringUserInputForJson, intentSchema, schemaNameForIntent,
    history, modelName, userId // Pass modelName (GPT-4o)
  );

  if ("error" in result) {
    logger.error(`[LLM Clients Intent] Structured JSON for intent failed: ${result.error}. ${logSuffix}. Falling back for text response only.`);
    // Fallback: Generate plain text response if JSON with intent fails
    const fallbackMessages: ChatMessage[] = [...history, {role: "user", content: userPrompt, timestamp: Date.now()}]; // Use original userPrompt
    const fallbackAgentResult = await generateAgentResponse(
      fallbackMessages, null, "none", modelName, maxTokens, userId, instructions
    );
    if (fallbackAgentResult.responseContent) {
      logger.warn(`[LLM Clients Intent] Fallback to plain text response due to JSON error. Intent set to 'neutral'.`);
      let responseTextOnly: string;
      if (typeof fallbackAgentResult.responseContent === 'string') {
          responseTextOnly = fallbackAgentResult.responseContent;
      } else if (Array.isArray(fallbackAgentResult.responseContent)) {
          responseTextOnly = fallbackAgentResult.responseContent.find(p => p.type === 'text')?.text || "[Could not extract text from multimodal fallback]";
      } else {
          responseTextOnly = "[Unexpected fallback content type]";
      }
      return { responseText: responseTextOnly, intentType: "neutral" };
    }
    return { error: result.error + " (Fallback also failed to produce text)" };
  }
  
  // Ensure responseText is not empty if LLM only returned JSON structure.
  if (!result.responseText.trim()) {
    logger.error(`[LLM Clients Intent] responseText became empty. LLM likely returned ONLY the JSON object. Prompting needs refinement. Original result:`, result);
    return { error: "LLM returned only JSON structure, no conversational text." };
  }
  return result;
}


// --- Vision Completion (using GPT-4o via generateAgentResponse) ---
export async function generateVisionCompletion(
  messages: ChatMessage[], // Should contain text and image_url parts
  modelName: string = CHAT_VISION_MODEL_NAME, // Default to GPT-4o
  maxTokens?: number,
  userId?: string
): Promise<{ text: string | null; error?: string | null; usage?: CompletionUsage | null }> {
  const logSuffix = `User:${userId ? userId.substring(0,8) : "N/A"} Model:${modelName}`;
  logger.debug(`[LLM Clients Vision] Generating vision completion. ${logSuffix}`);

  const hasImage = messages.some(msg => Array.isArray(msg.content) && msg.content.some(part => (part as any).type === "image_url" || (part as any).type === "input_image"));
  if (!hasImage) {
    return { text: null, error: "No image content provided for vision analysis." };
  }

  // The instruction is now more generic for GPT-4o's multimodal capabilities
  const visionInstructions = "You are Minato, an AI assistant. Analyze the provided image(s) in detail and describe what you see. If text is provided with the image(s), consider it as part of the query or context for the analysis. Be descriptive and engaging.";
  
  const agentResult = await generateAgentResponse(
    messages, null, "none", modelName, maxTokens ?? MAX_VISION_TOKENS, userId, visionInstructions
  );

  if (agentResult.error) {
    return { text: null, error: agentResult.error, usage: agentResult.usage };
  }
  if (agentResult.responseContent === null && agentResult.finishReason !== "stop") {
    logger.warn(`[LLM Clients Vision] Model returned no text, finish_reason: ${agentResult.finishReason}. ${logSuffix}`);
  }

  let visionTextResult: string | null = null;
  if(typeof agentResult.responseContent === 'string'){
    visionTextResult = agentResult.responseContent;
  } else if (Array.isArray(agentResult.responseContent)) {
    const textPart = agentResult.responseContent.find(p => p.type === 'text');
    visionTextResult = textPart?.text || null;
  }

  return { text: visionTextResult, error: null, usage: agentResult.usage };
}

export { openai as rawOpenAiClient };