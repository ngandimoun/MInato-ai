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
ChatMessageContentPart as AppChatMessageContentPart,
ChatMessageContentPartText as AppChatMessageContentPartText,
ChatMessageContentPartInputImage as AppChatMessageContentPartInputImage,
AnyToolStructuredData,
} from "@/lib/types/index";
import { safeJsonParse } from "@/memory-framework/core/utils";
import type { CompletionUsage } from "openai/resources";
import { MEDIA_UPLOAD_BUCKET } from "../constants";
import { supabase } from "../supabaseClient";
import Ajv from "ajv";
import { SchemaService } from "../services/schemaService"; // Import SchemaService

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
const CHAT_VISION_MODEL_NAME: string = appConfig.openai.chatModel;
const PLANNING_MODEL_NAME: string = appConfig.openai.planningModel;
const EXTRACTION_MODEL_NAME: string = appConfig.openai.extractionModel;
const DEVELOPER_MODEL_NAME: string = appConfig.openai.developerModel;


const MAX_OUTPUT_TOKENS: number = appConfig.openai.maxTokens;
const MAX_VISION_TOKENS: number = appConfig.openai.maxVisionTokens;
const EMBEDDING_MODEL_NAME: string = appConfig.openai.embedderModel;
const EMBEDDING_DIMENSIONS: number = appConfig.openai.embeddingDims;


type SdkResponsesApiMessageParam = ChatCompletionMessageParam;
type SdkResponsesApiTool = ChatCompletionTool;
type SdkResponsesApiToolChoice = ChatCompletionToolChoiceOption;
type SdkResponsesApiOutputItem = ChatCompletionMessage;
type SdkFunctionCallOutputItem = ChatCompletionMessageToolCall;


type ResponseApiInputTextPart = { type: "input_text"; text: string; };
type ResponseApiOutputTextPart = { type: "output_text"; text: string; };
type ResponseApiInputImagePart = { type: "input_image"; image_url: string; /* detail n'est pas sur la partie elle-même */ };


// Ajout de la fonction de conversion explicite
type LocalChatCompletionContentPart = OpenAI.Chat.Completions.ChatCompletionContentPart;
function toChatCompletionContentPart(
  part: ResponseApiInputTextPart | ResponseApiInputImagePart
): LocalChatCompletionContentPart {
  if (part.type === "input_text") {
    return { type: "text", text: part.text } as LocalChatCompletionContentPart;
  } else {
    // Conversion explicite pour image_url
    return { type: "image_url", image_url: { url: part.image_url } } as LocalChatCompletionContentPart;
  }
}


async function formatMessagesForResponsesApi(
  messages: ChatMessage[],
  userId?: string
): Promise<SdkResponsesApiMessageParam[]> {
  const apiMessages: SdkResponsesApiMessageParam[] = [];


  for (const msg of messages) {
    let openAiApiContentParts: (ResponseApiInputTextPart | ResponseApiOutputTextPart | ResponseApiInputImagePart | ChatCompletionContentPartRefusal)[] = [];


    if (Array.isArray(msg.content)) {
      for (const part of msg.content as AppChatMessageContentPart[]) {
        if (part.type === "text" && typeof part.text === 'string' && part.text.trim()) {
          if (msg.role === "user" || msg.role === "system") {
            openAiApiContentParts.push({ type: "input_text", text: part.text });
          } else if (msg.role === "assistant") {
            openAiApiContentParts.push({ type: "output_text", text: part.text });
          } else { // Includes 'tool' role if it ever gets array content, though unlikely
            openAiApiContentParts.push({ type: "input_text", text: part.text }); // Fallback
          }
        }
        // --- IMAGE PARTS ---
        else if (part.type === 'input_image' && typeof part.image_url === 'string') {
          let imageUrl = part.image_url;
          // Convert supabase_storage: to public URL if needed
          if (imageUrl.startsWith("supabase_storage:")) {
            const storagePath = imageUrl.substring("supabase_storage:".length);
            const { data: urlData } = supabase.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(storagePath);
            if (urlData?.publicUrl) {
                imageUrl = urlData.publicUrl;
                logger.debug(`[formatMessagesForResponsesApi] Converted supabase_storage path to public URL: ${imageUrl.substring(0,100)}...`);
            } else {
                logger.warn(`[formatMessagesForResponsesApi] Failed to get public URL for supabase_storage path: ${storagePath}. Original URL: ${imageUrl}`);
            }
          }
          const isValid = (
            typeof imageUrl === 'string' && imageUrl !== null && (
              imageUrl.startsWith('http://') || imageUrl.startsWith('https://') ||
              (imageUrl.startsWith('data:image/') && imageUrl.includes(';base64,'))
            )
          );
          if (isValid) {
            openAiApiContentParts.push({ type: "input_image", image_url: imageUrl });
          } else {
            // Avoid logging for common "error_*" placeholders if they are intentionally set
            if (!imageUrl.startsWith("error_")) {
                logger.warn(`[formatMessagesForResponsesApi] Skipping invalid image_url (not http/data): ${imageUrl.substring(0,100)}...`);
            }
          }
        } else if ((part as any).type === 'image_url' && typeof (part as any).image_url?.url === 'string') { // Legacy support for older format
          let imageUrl = (part as any).image_url.url;
          if (imageUrl.startsWith("supabase_storage:")) { // Also convert legacy format if it's supabase_storage
            const storagePath = imageUrl.substring("supabase_storage:".length);
            const { data: urlData } = supabase.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(storagePath);
            if (urlData?.publicUrl) imageUrl = urlData.publicUrl;
          }
          const isValid = (
            typeof imageUrl === 'string' && imageUrl !== null && (
              imageUrl.startsWith('http://') || imageUrl.startsWith('https://') ||
              (imageUrl.startsWith('data:image/') && imageUrl.includes(';base64,'))
            )
          );
          if (isValid) {
            openAiApiContentParts.push({ type: "input_image", image_url: imageUrl });
          } else {
            if (!imageUrl.startsWith("error_")) {
                 logger.warn(`[formatMessagesForResponsesApi] Skipping invalid image_url (legacy image_url.url, not http/data): ${imageUrl.substring(0,100)}...`);
            }
          }
        }
      }
    } else {
      const msgAny = msg as any;
      if (typeof msgAny.content === 'string' && msgAny.content.trim()) {
        if (msgAny.role === "user" || msgAny.role === "system") {
          openAiApiContentParts.push({ type: "input_text", text: msgAny.content });
        } else if (msgAny.role === "assistant") {
          openAiApiContentParts.push({ type: "output_text", text: msgAny.content });
        } else if (msgAny.role === "tool") {
          // Tool role content is directly a string, not part of 'parts'
        } else {
          openAiApiContentParts.push({ type: "input_text", text: msgAny.content }); // Fallback for other roles with string content
        }
      }
    }

    // Handle attachments that were not part of message.content (e.g., non-image files or images not directly embedded)
    // This section primarily ensures image attachments meant for vision are also included if not already processed from `msg.content`.
    // This is a bit redundant if `initialAttachments` in Orchestrator already populates `mainUserInputContent` correctly.
    if (msg.role === "user" && msg.attachments) {
      for (const att of msg.attachments) {
        if (att.type === "image" && att.url) {
          let imageUrl = att.url;
          if (imageUrl.startsWith("supabase_storage:")) {
            const storagePath = imageUrl.substring("supabase_storage:".length);
            const { data: urlData } = supabase.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(storagePath);
            if (urlData?.publicUrl) imageUrl = urlData.publicUrl;
          }
          const isValid = (
            typeof imageUrl === 'string' && imageUrl !== null && (
              imageUrl.startsWith('http://') || imageUrl.startsWith('https://') ||
              (imageUrl.startsWith('data:image/') && imageUrl.includes(';base64,'))
            )
          );
          // Add only if not already present (e.g., from msg.content processing)
          if (isValid && !openAiApiContentParts.some(p => (p as ResponseApiInputImagePart).image_url === imageUrl)) {
            openAiApiContentParts.push({ type: "input_image", image_url: imageUrl });
          } else if (!isValid && !imageUrl.startsWith("error_")) {
            logger.warn(`[formatMessagesForResponsesApi] Skipping invalid image_url from attachment: ${imageUrl.substring(0,100)}...`);
          }
        }
      }
    }


    switch (msg.role) {
      case "user":
      case "system":
        const msgAny = msg as any;
        let contentForUserOrSystem: string | LocalChatCompletionContentPart[] = "";
        if (openAiApiContentParts.length === 1 && openAiApiContentParts[0].type === "input_text") {
            contentForUserOrSystem = openAiApiContentParts[0].text; // OpenAI SDK prefers string if only text
        } else if (openAiApiContentParts.length > 0) {
            // Filter out any non-input_text/input_image parts for user/system if they somehow got here
            contentForUserOrSystem = openAiApiContentParts
              .filter(p => p.type === "input_text" || p.type === "input_image")
              .map(toChatCompletionContentPart);
        } else if (
          msgAny.role === "system" &&
          typeof msgAny.content === 'string' && msgAny.content.trim() === ""
        ) {
            contentForUserOrSystem = ""; // Allow empty system message
        } else if (
          msgAny.role === "system" &&
          typeof msgAny.content === 'string'
        ) {
            contentForUserOrSystem = msgAny.content;
        }


        if (contentForUserOrSystem || (msg.role === "system" && contentForUserOrSystem === "")) {
            const messagePayload: SdkResponsesApiMessageParam = {
              role: msg.role as "user" | "system",
              content: contentForUserOrSystem as any, // Cast as any because SDK types are strict
            };
            // Explicitly ensure no tool_calls for user/system messages
            delete (messagePayload as any).tool_calls;
            delete (messagePayload as any).tool_call_id;
            apiMessages.push(messagePayload);
        }
        break;
      case "assistant":
        let assistantApiContent: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam["content"] = null;
        if (openAiApiContentParts.length > 0) {
          assistantApiContent = openAiApiContentParts.filter(
            (p): p is ResponseApiOutputTextPart | ChatCompletionContentPartRefusal =>
              p.type === "output_text" || (p as any).type === "refusal"
          ) as any;
          if ((assistantApiContent as Array<any>).length === 0) assistantApiContent = null;
        }

        const assistantMessagePayload: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: assistantApiContent as any, // Cast to make TS happy with complex OpenAI types
        };

        // CRITICAL FIX: Only add tool_calls if msg.tool_calls is present and non-empty
        if (msg.tool_calls && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
          assistantMessagePayload.tool_calls = msg.tool_calls;
        } else {
          // Ensure tool_calls is not present or is undefined if empty, to avoid sending empty array if not intended
          delete assistantMessagePayload.tool_calls;
        }
        
        // Only push if there's content OR tool_calls
        if (assistantMessagePayload.content || (assistantMessagePayload.tool_calls && assistantMessagePayload.tool_calls.length > 0)) {
          apiMessages.push(assistantMessagePayload);
        }
        break;
      case "tool":
        if (msg.tool_call_id && msg.content !== null && msg.content !== undefined) {
          const toolMessagePayload: OpenAI.Chat.Completions.ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: msg.tool_call_id,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          };
          apiMessages.push(toolMessagePayload);
        }
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

    const formattedHistory = await formatMessagesForResponsesApi(historyForContext);


    const userMessageForApi: OpenAI.Responses.ResponseInputItem = {
      role: "user",
      content: [{ type: "input_text", text: userInput } as ResponseApiInputTextPart]
    };


    const inputForApi: OpenAI.Responses.ResponseInputItem[] = [
      ...((formattedHistory as unknown) as OpenAI.Responses.ResponseInputItem[]),
      userMessageForApi
    ].filter(msg => {
      // Type guard: check if msg has 'role' and 'content'
      if (typeof msg === 'object' && msg !== null && 'role' in msg && 'content' in msg) {
        const role = (msg as any).role;
        const content = (msg as any).content;
        // tool_calls is only relevant for assistant
        const toolCalls = 'tool_calls' in msg ? (msg as any).tool_calls : undefined;
        if (role === 'assistant' && content === null && !toolCalls) return false;
        if ((role === 'user' || role === 'system') && (content === null || content === "" || (Array.isArray(content) && content.length === 0))) return false;
        return true;
      }
      // If not a message with role/content, keep it (or filter as needed)
      return true;
    });


    if (inputForApi.length === 0 && !instructions) {
      logger.error(`[LLM Clients JSON] No valid messages or instructions. ${logSuffix}`);
      return { error: "No valid messages or instructions to send." };
    }
    
    if (inputForApi.length > 0) {
      const firstMsg = inputForApi[0] as any;
      logger.debug(`[LLM Clients JSON] InputForApi[0] being sent: role=${firstMsg.role}, hasToolCalls=${!!firstMsg.tool_calls}`);
      if (firstMsg.tool_calls && firstMsg.role !== 'assistant') {
        logger.error(`[LLM Clients JSON] CRITICAL PRE-FLIGHT CHECK FAILED: InputForApi[0] has role ${firstMsg.role} AND tool_calls. This will cause API error.`);
        // This check is more for debugging; formatMessagesForResponsesApi should prevent this.
      }
    }


    let finalJsonSchema = JSON.parse(JSON.stringify(jsonSchema)); 


    if (schemaName === "minato_tool_router_v1_1" && finalJsonSchema.type === "object" && finalJsonSchema.properties?.planned_tools?.type === "array") {
      const itemsSchema = finalJsonSchema.properties.planned_tools.items;
      if (typeof itemsSchema === 'object' && itemsSchema !== null && itemsSchema.type === "object") {
        if (itemsSchema.properties?.arguments && itemsSchema.properties.arguments.type === 'object') {
           // Schema for arguments is usually defined with additionalProperties: true in the tool definition itself
           // and the TOOL_ROUTER_SCHEMA_DEFINITION correctly reflects this.
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
    const response = responseRaw as any;
    const duration = Date.now() - start;


    if (response.status === "failed" || response.status === "incomplete") {
      const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown error";
      logger.error(`[LLM Clients JSON] Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`);
      return { error: `JSON generation failed (${response.status}): ${errorReason}` };
    }


    const assistantOutputItem = response.output?.find(
      (item: any): item is SdkResponsesApiOutputItem =>
        item.type === "message" && item.role === "assistant" && "content" in item
    );


    let textContentItem: ResponseApiOutputTextPart | undefined;
    if (assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      textContentItem = assistantOutputItem.content.find(
        (part: any): part is ResponseApiOutputTextPart =>
          part.type === "output_text"
      );
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
      const partialResult = safeJsonParse<any>(responseText);
      if (schemaName === "minato_tool_router_v1_1" && partialResult?.planned_tools) {
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
    if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for JSON Gen (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    
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
      input: apiInputItems as OpenAI.Responses.ResponseInputItem[],
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
    const response = responseRaw as any;
    const duration = Date.now() - start;


    if (response.status === "failed" || response.status === "incomplete") {
      const errorReason = response.error?.message || response.incomplete_details?.reason || "Unknown API error";
      const apiUsage = response.usage ? { prompt_tokens: response.usage.input_tokens ?? 0, completion_tokens: response.usage.output_tokens ?? 0, total_tokens: response.usage.total_tokens ?? 0 } : null;
      logger.error(`[LLM Clients Agent] API Request Failed/Incomplete: Status ${response.status}. Reason: ${errorReason}. ${logSuffix}`);
      return { responseContent: null, toolCalls: null, finishReason: response.status, error: `Agent API error (${response.status}): ${errorReason}`, usage: apiUsage };
    }


    let finalAssistantContent: string | AppChatMessageContentPart[] | null = null;
    const assistantOutputItem = response.output?.find(
      (item: any): item is SdkResponsesApiOutputItem =>
        item.type === "message" && item.role === "assistant" && "content" in item
    );


    if (assistantOutputItem && Array.isArray(assistantOutputItem.content)) {
      const appContentParts: AppChatMessageContentPart[] = [];
      let allPartsAreText = true;
      for (const part of assistantOutputItem.content as any[]) {
        if ((part as any).type === "output_text" && typeof (part as any).text === 'string') {
          appContentParts.push({ type: "text", text: (part as any).text } as AppChatMessageContentPartText);
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
    if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for Agent (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
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
        (part.type === "input_image" && typeof part.image_url === 'string' && (part.image_url.startsWith('http') || part.image_url.startsWith('data:image'))) ||
        ((part as any).type === "image_url" && typeof (part as any).image_url?.url === 'string' && ((part as any).image_url.url.startsWith('http') || (part as any).image_url.url.startsWith('data:image')))
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