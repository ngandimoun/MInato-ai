//app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseAdminClient as getSupabaseAdmin } from "@/lib/supabase/server"; // Import admin client
import { cookies } from "next/headers";
import { Orchestrator } from "@/lib/core/orchestrator";
import { checkRateLimit } from "@/lib/rate-limiter";
import { RATE_LIMIT_ID_CHAT } from "@/lib/constants";
import {
ChatMessage,
ChatMessageContentPart,
ChatMessageContentPartText,
MessageAttachment,
OrchestratorResponse,
AnyToolStructuredData,
} from "@/lib/types/index";
import { logger } from "../../../memory-framework/config";
import { appConfig } from "@/lib/config";
import { randomUUID } from "crypto";
import { getGlobalMemoryFramework } from "@/lib/memory-framework-global";

// Define the tool call interfaces
interface ToolCallInput {
  toolName: string;
  toolArgs: Record<string, any>;
  toolCallId?: string;
}

interface ToolCallOutput {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface MessageAttachmentDB extends Omit<MessageAttachment, 'file'> {
  file?: File;
}

interface ChatMessageDB extends Omit<ChatMessage, 'attachments' | 'tool_calls' | 'audioUrl' | 'intentType' | 'ttsInstructions'> {
  id: string;
  conversation_id: string;
  user_id: string;
  attachments?: MessageAttachmentDB[] | null;
  tool_calls?: ToolCallOutput[] | null;
  audio_url: string | null;
  intent_type: string | null;
  tts_instructions: string | null;
}

let orchestratorInstance: Orchestrator | null = null;
function getOrchestrator(): Orchestrator {
if (!orchestratorInstance) {
logger.info("[API Chat] Initializing Orchestrator instance...");
try {
getGlobalMemoryFramework();
orchestratorInstance = new Orchestrator();
} catch (e: any) {
logger.error("[API Chat] FATAL: Failed to initialize Orchestrator:", e.message, e.stack);
throw new Error(`Orchestrator initialization failed: ${e.message}`);
}
}
return orchestratorInstance;
}
function createSSEEvent(eventName: string, data: Record<string, any> | string): string {
return `event: ${eventName}\ndata: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;
}
const visionDetailConfig = appConfig.openai.visionDetail;
// Helper to get or create a conversation ID for the user
async function getOrCreateConversationId(userId: string, supabaseAdminClient: ReturnType<typeof getSupabaseAdmin>): Promise<string> {
const logPrefix = `[ChatAPI GetCreateConvo User:${userId.substring(0,8)}]`;
if (!supabaseAdminClient) {
logger.error(`${logPrefix} Supabase admin client is null. Cannot get/create conversation.`);
throw new Error("Supabase admin client is not available.");
}
const { data: existingConvo, error: fetchError } = await supabaseAdminClient
.from("conversations")
.select("id")
.eq("user_id", userId)
.single();
if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
    logger.error(`${logPrefix} Error fetching conversation:`, fetchError);
    throw fetchError;
}
if (existingConvo) {
    logger.debug(`${logPrefix} Found existing conversation ID: ${existingConvo.id}`);
    return existingConvo.id;
}

logger.info(`${logPrefix} No existing conversation found, creating new one.`);
const { data: newConvo, error: createError } = await supabaseAdminClient
    .from("conversations")
    .insert({ user_id: userId, title: `Conversation started ${new Date().toISOString().substring(0,10)}` }) // Optional: Add a default title
    .select("id")
    .single();

if (createError || !newConvo) {
    logger.error(`${logPrefix} Error creating new conversation:`, createError);
    throw createError || new Error("Failed to create new conversation.");
}
logger.info(`${logPrefix} Created new conversation ID: ${newConvo.id}`);
return newConvo.id;
}
// Helper to save a message to the database
async function saveChatMessageToDb(
  message: ChatMessage,
  userId: string,
  conversationId: string,
  supabaseAdminClient: ReturnType<typeof getSupabaseAdmin>
) {
  const logPrefix = `[ChatAPI SaveMsg User:${userId.substring(0,8)} Convo:${conversationId.substring(0,6)}]`;
  
  if (!supabaseAdminClient) {
    logger.error(`${logPrefix} Supabase admin client is null. Cannot save message.`);
    return;
  }

  try {
    const messageId = message.id || randomUUID();
    const messageToSave: ChatMessageDB = {
      id: messageId,
      conversation_id: conversationId,
      user_id: userId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString(),
      attachments: message.attachments?.map(att => ({...att, file: undefined})) || null,
      tool_calls: Array.isArray(message.tool_calls) 
        ? (message.tool_calls as unknown as ToolCallInput[]).map(call => ({
            id: call.toolCallId || randomUUID(),
            type: "function" as const,
            function: {
              name: call.toolName,
              arguments: JSON.stringify(call.toolArgs)
            }
          }))
        : null,
      structured_data: message.structured_data || null,
      audio_url: message.audioUrl || null,
      intent_type: message.intentType || null,
      tts_instructions: message.ttsInstructions || null,
      error: message.error || false,
    };

    logger.debug(`${logPrefix} Saving message (ID: ${messageId.substring(0,8)}, Role: ${message.role}) to DB...`);
    const { error } = await supabaseAdminClient.from("chat_messages").insert(messageToSave);
    
    if (error) {
      logger.error(`${logPrefix} Error saving message to DB (ID: ${messageId.substring(0,8)}):`, error);
    } else {
      logger.info(`${logPrefix} Message saved successfully to DB (ID: ${messageId.substring(0,8)}).`);
    }
  } catch (e: any) {
    logger.error(`${logPrefix} Exception saving message to DB:`, e.message, e.stack);
  }
}
export async function POST(req: NextRequest) {
const logPrefix = "[API Chat]";
const cookieStore = cookies();
let userId: string; // Will be set after auth
let orchestrator: Orchestrator;
const supabaseAdminClient = getSupabaseAdmin(); // Get admin client instance
if (!supabaseAdminClient) {
logger.error(`${logPrefix} Supabase admin client is not available.`);
return NextResponse.json({ error: "Server configuration error." }, { status: 503 });
}
if (!appConfig.openai.apiKey) {
logger.error(`${logPrefix} OpenAI API Key is missing.`);
return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
}
try {
orchestrator = getOrchestrator();
} catch (initError: any) {
logger.error(`${logPrefix} Orchestrator initialization failed early: ${initError.message}`);
return NextResponse.json({ error: "Core service initialization failed." }, { status: 503 });
}
try {
const supabase = await createServerSupabaseClient();
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
logger.warn(`${logPrefix} Unauthorized. UserError: ${userError?.message}`);
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
userId = user.id;
logger.info(`${logPrefix} Request from user: ${userId.substring(0,8)}...`);
} catch (authError: any) {
logger.error(`${logPrefix} Auth Exception:`, authError.message, authError.stack);
return NextResponse.json({ error: "Authentication process error" }, { status: 500 });
}
const { success: rateLimitSuccess } = await checkRateLimit(userId, RATE_LIMIT_ID_CHAT);
if (!rateLimitSuccess) {
logger.warn(`${logPrefix} Rate limit exceeded for user ${userId.substring(0,8)}`);
return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
}
const conversationId = await getOrCreateConversationId(userId, supabaseAdminClient);
const contentType = req.headers.get("content-type") || "";
let history: ChatMessage[] = [];
let userMessageText: string | null = null;
let orchestratorInputContentParts: ChatMessageContentPart[] = [];
let initialAttachmentsForOrchestrator: MessageAttachment[] = [];
let sessionIdFromRequest: string | undefined = conversationId; // Use fetched/created conversation ID
let clientDataFromRequest: any = null;
let allMessagesFromClient: ChatMessage[] = [];
let currentUserMessageForApi: ChatMessage | null = null; // To store the fully constructed current user message
try {
if (contentType.startsWith("application/json")) {
const jsonData = await req.json();
allMessagesFromClient = (jsonData.messages || []) as ChatMessage[];
// sessionIdFromRequest = jsonData.id; // We use conversationId now
clientDataFromRequest = jsonData.data;
logger.debug(`${logPrefix} Parsed JSON. Total messages from client: ${allMessagesFromClient.length}.`);
} else if (contentType.startsWith("multipart/form-data")) {
  // ... (FormData parsing logic from your previous version, ensure it populates `allMessagesFromClient` correctly)
  // ... and `initialAttachmentsForOrchestrator` with File objects for the *current* message turn.
  const formData = await req.formData();
  const messagesString = formData.get("messages") as string | null;
  
  let parsedMessagesJson: Partial<ChatMessage>[] = [];
  if (messagesString) {
    try {
      parsedMessagesJson = JSON.parse(messagesString);
      if (!Array.isArray(parsedMessagesJson)) throw new Error("'messages' not array");
    } catch (e: any) {
      logger.error(`${logPrefix} Invalid 'messages' JSON in FormData:`, e.message);
      return NextResponse.json({ error: `Invalid 'messages' format: ${e.message}` }, { status: 400 });
    }
  }

  const filesFromFormData: MessageAttachment[] = [];
  for (const [key, value] of formData.entries()) {
    if (value instanceof File && key.startsWith("attachment_")) {
      filesFromFormData.push({
        id: value.name + "_" + value.size + "_" + randomUUID().substring(0,8),
        type: value.type.startsWith("image/") ? "image" : (value.type.startsWith("video/") ? "video" : (value.type.startsWith("audio/") ? "audio" : "document")),
        name: value.name,
        mimeType: value.type,
        size: value.size,
        file: value,
        url: "", 
      });
    }
  }
  
  if (parsedMessagesJson.length > 0) {
      const lastMessageJson = parsedMessagesJson[parsedMessagesJson.length - 1];
      if (lastMessageJson.role === 'user') {
          const enrichedAttachments = lastMessageJson.attachments?.map((attMeta: MessageAttachment) => {
              const foundFile = filesFromFormData.find(f => f.name === attMeta.name && f.size === attMeta.size );
              return foundFile ? { ...attMeta, file: foundFile.file, mimeType: foundFile.mimeType, size: foundFile.size, id: foundFile.id } : attMeta;
          }) || [];
          
          filesFromFormData.forEach(ffdata => {
              if (!enrichedAttachments.some((ea: MessageAttachment) => ea.id === ffdata.id)) {
                  enrichedAttachments.push(ffdata);
              }
          });
          lastMessageJson.attachments = enrichedAttachments;
      }
      allMessagesFromClient = parsedMessagesJson as ChatMessage[];
  } else if (filesFromFormData.length > 0) {
      const promptText = formData.get("prompt") as string || `[User sent ${filesFromFormData.length} file(s)]`;
       allMessagesFromClient.push({
            role: "user", content: promptText, attachments: filesFromFormData,
            timestamp: new Date().toISOString(), id: `form-files-${randomUUID()}`
        });
  }
  
  if (allMessagesFromClient.length === 0 && formData.has("prompt") && filesFromFormData.length === 0) {
     const promptText = formData.get("prompt") as string;
     if (promptText) {
        allMessagesFromClient.push({
            role: "user", content: promptText, timestamp: new Date().toISOString(), id: `form-prompt-${randomUUID()}`
        });
     }
  }
  // sessionIdFromRequest = formData.get("id") as string | null || undefined; // using conversationId
  const dataString = formData.get("data") as string | null;
  if (dataString) try { clientDataFromRequest = JSON.parse(dataString); } catch {}
  logger.debug(`${logPrefix} Parsed FormData. Total messages from client: ${allMessagesFromClient.length}. Files found in form: ${filesFromFormData.length}`);
} else {
  logger.error(`${logPrefix} Unsupported Content-Type: ${contentType}.`);
  return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
}

if (allMessagesFromClient.length > 0) {
    const lastMessage = allMessagesFromClient[allMessagesFromClient.length - 1];
    if (lastMessage?.role === "user") {
        history = allMessagesFromClient.slice(0, -1);
        currentUserMessageForApi = { ...lastMessage, id: lastMessage.id || `user-${randomUUID()}` }; // Ensure ID

        if (typeof lastMessage.content === "string") {
            userMessageText = lastMessage.content;
            orchestratorInputContentParts.push({ type: "text", text: userMessageText });
        } else if (Array.isArray(lastMessage.content)) {
            (lastMessage.content as ChatMessageContentPart[]).forEach(part => {
                if (part.type === "text" && typeof part.text === 'string') {
                    userMessageText = (userMessageText || "") + part.text; 
                    orchestratorInputContentParts.push({ type: "text", text: part.text });
                } else if (part.type === 'input_image' && typeof part.image_url === 'string') {
                    orchestratorInputContentParts.push({ type: "input_image", image_url: part.image_url, detail: part.detail || visionDetailConfig });
                }
            });
        }
        if (Array.isArray(lastMessage.attachments)) {
            initialAttachmentsForOrchestrator = lastMessage.attachments;
        }
    } else {
        history = allMessagesFromClient; 
    }
}

if (orchestratorInputContentParts.filter(p => p.type === 'text').length === 0 && userMessageText) {
    orchestratorInputContentParts.unshift({ type: "text", text: userMessageText });
}
if (orchestratorInputContentParts.length === 0 && initialAttachmentsForOrchestrator.length > 0) {
   orchestratorInputContentParts.push({ type: "text", text: `[Processing ${initialAttachmentsForOrchestrator.length} attachment(s)]` });
}
if (orchestratorInputContentParts.length === 0) {
  logger.warn(`${logPrefix} No text or processable content parts derived from user input.`);
  return NextResponse.json({ error: "Message content is required." }, { status: 400 });
}
// Save the current user message to DB
if (currentUserMessageForApi) {
    await saveChatMessageToDb(currentUserMessageForApi, userId, conversationId, supabaseAdminClient);
}


const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
const effectiveApiContext = {
  ipAddress,
  locale: req.headers.get("accept-language")?.split(",")[0] || appConfig.defaultLocale,
  origin: req.headers.get("origin"),
  sessionId: conversationId, // Use the determined conversationId
  runId: conversationId, 
  ...(clientDataFromRequest && { clientData: clientDataFromRequest }),
};

const finalOrchestratorInput: string | ChatMessageContentPart[] = 
    orchestratorInputContentParts.length === 1 && orchestratorInputContentParts[0].type === 'text'
    ? (orchestratorInputContentParts[0] as ChatMessageContentPartText).text
    : orchestratorInputContentParts;

const stream = new ReadableStream({
  async start(controller) {
    const encoder = new TextEncoder();
    const sendErrorToStream = (errorMessage: string, statusCode: number = 500) => {
      try {
        controller.enqueue(encoder.encode(createSSEEvent("error", { error: errorMessage, statusCode })));
        logger.info(`${logPrefix} Sent error to client: ${errorMessage}.`);
      } catch (e: any) {
        logger.error(`${logPrefix} Stream Error - Failed to enqueue error event: ${e.message}.`);
      }
    };

    try {
      logger.info(`${logPrefix} Calling orchestrator.runOrchestration... User ${userId.substring(0,8)}`);
      const orchestratorResult = await orchestrator.runOrchestration(
        userId, 
        finalOrchestratorInput,
        history, // History already filtered above
        effectiveApiContext,
        initialAttachmentsForOrchestrator
      );
      logger.debug(`${logPrefix} Orchestrator finished. Error: ${orchestratorResult.error}. Response: ${!!orchestratorResult.response}.`);

      // Construct assistant message for DB saving
      const assistantMessageToSave: ChatMessage = {
          id: `asst-${randomUUID()}`,
          role: "assistant",
          content: orchestratorResult.response || (orchestratorResult.structuredData ? "[Structured Data Response]" : "[No text response]"),
          timestamp: new Date().toISOString(),
          attachments: orchestratorResult.attachments?.map(att => ({...att, file: undefined})) || [],
          tool_calls: orchestratorResult.debugInfo?.toolCalls as unknown as ToolCallOutput[] || null,
          structured_data: orchestratorResult.structuredData || null,
          audioUrl: orchestratorResult.audioUrl || undefined,
          intentType: orchestratorResult.intentType || undefined,
          ttsInstructions: orchestratorResult.ttsInstructions || undefined,
          error: !!orchestratorResult.error,
          debugInfo: orchestratorResult.debugInfo || null,
          workflowFeedback: orchestratorResult.workflowFeedback || null,
      };
      await saveChatMessageToDb(assistantMessageToSave, userId, conversationId, supabaseAdminClient);


      if (orchestratorResult.error && !orchestratorResult.clarificationQuestion) {
        sendErrorToStream(orchestratorResult.error, 500);
        controller.close();
        return;
      }

      if (orchestratorResult.response) {
        const fullTextResponse = orchestratorResult.response;
        const chunkSize = 30; 
        for (let i = 0; i < fullTextResponse.length; i += chunkSize) {
          const chunk = fullTextResponse.substring(i, i + chunkSize);
          controller.enqueue(encoder.encode(createSSEEvent("text-chunk", { text: chunk })));
          await new Promise(resolve => setTimeout(resolve, 10)); 
        }
      }

      if (orchestratorResult.structuredData) {
        controller.enqueue(encoder.encode(createSSEEvent("ui-component", { data: orchestratorResult.structuredData })));
      }

      const annotations: Record<string, any> = { messageId: assistantMessageToSave.id }; // Send back the actual ID of the saved assistant message
      if (orchestratorResult.intentType) annotations.intentType = orchestratorResult.intentType;
      if (orchestratorResult.ttsInstructions) annotations.ttsInstructions = orchestratorResult.ttsInstructions;
      if (orchestratorResult.audioUrl) { 
        annotations.audioUrl = orchestratorResult.audioUrl;
      }
      if (orchestratorResult.debugInfo) annotations.debugInfo = orchestratorResult.debugInfo;
      if (orchestratorResult.workflowFeedback) annotations.workflowFeedback = orchestratorResult.workflowFeedback;
      if (orchestratorResult.clarificationQuestion) annotations.clarificationQuestion = orchestratorResult.clarificationQuestion;
      if (orchestratorResult.attachments && orchestratorResult.attachments.length > 0) {
        annotations.attachments = orchestratorResult.attachments.map(att => ({...att, file: undefined}));
      }

      if (Object.keys(annotations).length > 1) { // messageId is always there
        controller.enqueue(encoder.encode(createSSEEvent("annotations", annotations)));
      }

      controller.enqueue(encoder.encode(createSSEEvent("stream-end", { sessionId: effectiveApiContext.sessionId, assistantMessageId: assistantMessageToSave.id })));

    } catch (e: any) {
      logger.error(`${logPrefix} Error in stream 'start' for user ${userId.substring(0,8)}:`, e.message, e.stack);
      sendErrorToStream(e.message || "Internal server error during stream processing.", 500);
    } finally {
      logger.debug(`${logPrefix} Closing SSE stream from API route. User ${userId.substring(0,8)}.`);
      try { controller.close(); }
      catch (e: any) { logger.warn(`${logPrefix} Error closing stream controller (already closed?): ${e.message}`); }
    }
  },
});

return new Response(stream, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no", 
  },
});
} catch (error: any) {
const userIdSuffix = userId ? userId.substring(0,8) + "..." : "UNKNOWN_PRE_STREAM_CATCH";
logger.error(`${logPrefix} Top-level unhandled exception for user ${userIdSuffix}:`, error.message, error.stack);
return NextResponse.json({ error: "Internal Server Error: " + error.message }, { status: 500 });
} finally {
const userIdSuffix = userId ? userId.substring(0,8) + "..." : "UNKNOWN_FINALLY_LOG";
logger.debug(`${logPrefix} Request processing finished for user ${userIdSuffix}.`);
}
}