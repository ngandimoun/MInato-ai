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
          } else {
            logger.warn(`[formatMessages] Role '${msg.role}' avec content array textuel inattendu.`);
            openAiApiContentParts.push({ type: "input_text", text: part.text }); // Fallback
          }
        } else if (part.type === 'input_image' && typeof part.image_url === 'string') {
          let imageUrl = part.image_url;
          if (imageUrl.startsWith("supabase_storage:")) {
            const storagePath = imageUrl.substring("supabase_storage:".length);
            const { data: urlData } = supabase.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(storagePath);
            if (urlData?.publicUrl) imageUrl = urlData.publicUrl;
            else { logger.warn(`[formatMessages] Could not get Supabase URL for ${storagePath}.`); continue; }
          }
          openAiApiContentParts.push({ type: "input_image", image_url: imageUrl });
        } else if ((part as any).type === 'image_url' && typeof (part as any).image_url?.url === 'string') {
          openAiApiContentParts.push({
            type: "input_image",
            image_url: (part as any).image_url.url
          });
        }
      }
    }


    if (msg.attachments) {
      for (const att of msg.attachments) {
        if (att.type === "image" && att.url && !att.url.startsWith("blob:")) {
          openAiApiContentParts.push({ type: "input_image", image_url: att.url });
        } else if (att.type === "image" && (att as any).storagePath) {
          const storagePath = (att as any).storagePath;
          const { data: urlData } = supabase.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(storagePath);
          if (urlData?.publicUrl) {
            openAiApiContentParts.push({ type: "input_image", image_url: urlData.publicUrl });
          } else { logger.warn(`[formatMessages] Could not get public URL for attachment storage path: ${storagePath}`); }
        }
      }
    }

    switch (msg.role) {
      case "user":
      case "system":
        let contentForUserOrSystem: string | OpenAI.Chat.Completions.ChatCompletionContentPart[] = "";
        if (typeof msg.content === 'string' && msg.content.trim()) {
          contentForUserOrSystem = [{ type: (msg.role === "system" ? "input_text" : "input_text"), text: msg.content } as any];
        } else if (openAiApiContentParts.length > 0) {
          contentForUserOrSystem = openAiApiContentParts as any;
        } else if (msg.role === "system") {
          contentForUserOrSystem = "";
        }

        if (contentForUserOrSystem || (msg.role === "system" && contentForUserOrSystem === "")) {
          if (msg.role === "system" && typeof contentForUserOrSystem !== 'string') {
            const systemText = (contentForUserOrSystem as any[]).filter(p => p.type === "input_text").map(p => p.text).join('\n');
            apiMessages.push({ role: msg.role as any, content: systemText });
          } else {
            apiMessages.push({ role: msg.role as any, content: contentForUserOrSystem as any });
          }
        } else if (msg.role === "user" && openAiApiContentParts.length === 0 && !(typeof msg.content === 'string' && msg.content.trim())) {
          logger.warn("[formatMessages] Skipping empty user message after processing.");
        }
        break;
      case "assistant":
        let assistantApiContent: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam["content"] = null;
        if (typeof msg.content === 'string' && msg.content.trim()) {
          assistantApiContent = [{ type: "output_text", text: msg.content } as any];
        } else if (openAiApiContentParts.length > 0) {
          assistantApiContent = openAiApiContentParts.filter(
            (p): p is ResponseApiOutputTextPart | ChatCompletionContentPartRefusal =>
              p.type === "output_text" || (p as any).type === "refusal"
          ) as any;
          if ((assistantApiContent as Array<any>).length === 0) assistantApiContent = null;
        }

        const assistantMessagePayload: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam = {
          role: "assistant",
          content: assistantApiContent as any,
        };
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          assistantMessagePayload.tool_calls = msg.tool_calls;
        }
        if (assistantMessagePayload.content || (assistantMessagePayload.tool_calls && assistantMessagePayload.tool_calls.length > 0)) {
          apiMessages.push(assistantMessagePayload);
        } else {
          logger.debug("[formatMessages] Skipping assistant message with no content or tool_calls.");
        }
        break;
      case "tool":
        if (msg.tool_call_id && msg.content !== null && msg.content !== undefined) {
          apiMessages.push({
            role: "tool",
            tool_call_id: msg.tool_call_id,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          });
        } else {
          logger.warn(`[formatMessages] Skipping tool message due to missing tool_call_id or content. ID: ${msg.tool_call_id}`);
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


    const formattedHistory = await formatMessagesForResponsesApi(
      historyForContext.filter(m => typeof m.content === 'string' || (Array.isArray(m.content) && m.content.some(p => (p as AppChatMessageContentPartText).type === 'text')))
    );


    const userMessageForApi: OpenAI.Responses.ResponseInputItem = {
      role: "user",
      content: [{ type: "input_text", text: userInput } as ResponseApiInputTextPart]
    };


    const inputForApi: OpenAI.Responses.ResponseInputItem[] = [
      ...((formattedHistory as unknown) as OpenAI.Responses.ResponseInputItem[]),
      userMessageForApi
    ];


    if (inputForApi.length === 0 && !instructions) {
      logger.error(`[LLM Clients JSON] No valid messages or instructions. ${logSuffix}`);
      return { error: "No valid messages or instructions to send." };
    }


    let finalJsonSchema = JSON.parse(JSON.stringify(jsonSchema));


    if (schemaName === "minato_tool_router_v1" && finalJsonSchema.type === "array") {
      let itemSchema = finalJsonSchema.items;
      if (typeof itemSchema === 'object' && itemSchema !== null && itemSchema.type === "object") {
        itemSchema.additionalProperties = false;


        if (itemSchema.properties && itemSchema.properties.arguments && itemSchema.properties.arguments.type === 'object') {
          // Explicitly set additionalProperties: false for the 'arguments' object
          // This is the direct fix for the API error.
          itemSchema.properties.arguments.additionalProperties = false;


          // Ensure all defined properties within 'arguments' are in 'required' array if they are meant to be mandatory by the tool.
          // If tool arguments can be truly dynamic this model of planning needs adjustment for strict schemas,
          // or the tool's own schema must define 'additionalProperties: false' and list all required args.
          // For now, the fix is to make the `arguments` object itself not allow additional properties.
          // if (!itemSchema.properties.arguments.required) {
          //   itemSchema.properties.arguments.required = Object.keys(itemSchema.properties.arguments.properties || {});
          // }
        }
      }
      finalJsonSchema = {
        type: "object",
        properties: { planned_tools: { type: "array", items: itemSchema } },
        required: ["planned_tools"],
        additionalProperties: false
      };
      logger.warn(`[LLM Clients JSON] Wrapped array schema '${schemaName}' and made items and their 'arguments' property strict for OpenAI API.`);
    } else if (finalJsonSchema.type === "object") {
      if (finalJsonSchema.additionalProperties !== false) {
        logger.warn(`[LLM Clients JSON] Schema '${schemaName}' is object but root 'additionalProperties' is not false. Setting to false for strict mode.`);
        finalJsonSchema.additionalProperties = false;
      }
    } else {
      logger.error(`[LLM Clients JSON] Schema '${schemaName}' root must be 'object' (or 'array' for tool_router). Got '${finalJsonSchema.type}'. ${logSuffix}`);
      return { error: `Schema '${schemaName}' root must be 'object' or an array that can be wrapped.` };
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
      if (schemaName === "minato_tool_router_v1" && partialResult?.planned_tools) {
        return partialResult.planned_tools as T;
      }
      if (partialResult) return partialResult as T;
      return { error: `JSON generation failed (truncated due to max_output_tokens). Finish: ${finishReason}` };
    }


    const result = safeJsonParse<any>(responseText);
    if (schemaName === "minato_tool_router_v1") {
      if (result?.planned_tools && Array.isArray(result.planned_tools)) {
        return result.planned_tools as T;
      } else {
        logger.warn(`[LLM Clients JSON] Tool router expected array in 'planned_tools', got ${typeof result?.planned_tools}. Raw: ${responseText.substring(0, 300)}. ${logSuffix}`);
        return { error: `Tool router output was not an array as expected inside 'planned_tools'.` };
      }
    }


    if (!result || typeof result !== "object") {
      logger.warn(`[LLM Clients JSON] Parsed non-object/null. Type: ${typeof result}. Raw: ${responseText.substring(0, 300)}. ${logSuffix}`);
      return { error: `JSON parsing yielded ${typeof result}. Expected object for schema ${schemaName}.` };
    }
    return result as T;
  } catch (error: any) {
    let errorMessage = "Structured JSON generation error.";
    if (error instanceof OpenAI.APIError) errorMessage = `OpenAI API Error for JSON Gen (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`;
    else if (error.message) errorMessage = error.message;
    let schemaForLogError = jsonSchema;
    if (jsonSchema.type === "array" && schemaName === "minato_tool_router_v1") {
      let itemSchema = jsonSchema.items;
      if (typeof itemSchema === 'object' && itemSchema !== null && itemSchema.type === "object") {
        itemSchema.additionalProperties = false;
        if (itemSchema.properties && itemSchema.properties.arguments && itemSchema.properties.arguments.type === 'object') {
          itemSchema.properties.arguments.additionalProperties = false;
        }
      }
      schemaForLogError = { type: "object", properties: { planned_tools: { type: "array", items: itemSchema } }, required: ["planned_tools"], additionalProperties: false };
    } else if (jsonSchema.type === "object" && jsonSchema.additionalProperties !== false) {
      schemaForLogError = { ...jsonSchema, additionalProperties: false };
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


  const textHistoryForJson = history.filter(m => typeof m.content === 'string');


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


  const hasImage = messages.some(msg => Array.isArray(msg.content) && msg.content.some(part => (part as any).type === "image_url" || (part as any).type === "input_image"));
  if (!hasImage) {
    return { text: null, error: "No image content provided for vision analysis." };
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
