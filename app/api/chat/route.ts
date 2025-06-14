//app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getSupabaseAdminClient as getSupabaseAdmin } from "@/lib/supabase/server"; 
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
ChatMessageContentPartInputImage, // Added
} from "@/lib/types/index";
import { logger } from "../../../memory-framework/config";
import { appConfig } from "@/lib/config";
import { randomUUID } from "crypto";
import { getGlobalMemoryFramework } from "@/lib/memory-framework-global";
import OpenAI from "openai";
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
file?: File; // This will effectively be undefined when retrieved from DB
}
// ChatMessageDB needs to align with the refined ChatMessage from lib/types/index.ts
interface ChatMessageDB {
id: string;
conversation_id: string;
user_id: string;
role: ChatMessage['role']; // Use refined role type
content: string | ChatMessageContentPart[] | null; // Use refined content type
timestamp: string;
attachments?: MessageAttachmentDB[] | null;
tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[] | null; // Align with OpenAI type
tool_call_id?: string; // This is for role='tool' only
  structured_data?: AnyToolStructuredData | AnyToolStructuredData[] | null;
audio_url?: string | null;
intent_type?: string | null;
tts_instructions?: string | null;
error?: boolean | null;
}
let orchestratorInstance: Orchestrator | null = null;
function getOrchestrator(): Orchestrator {
if (!orchestratorInstance) {
logger.info(`[API Chat] Initializing Orchestrator instance...`);
try {
getGlobalMemoryFramework(); // Ensure memory framework is up
orchestratorInstance = new Orchestrator();
} catch (e: any) {
logger.error(`[API Chat] FATAL: Failed to initialize Orchestrator:`, e.message, e.stack);
throw new Error(`Orchestrator initialization failed: ${e.message}`);
}
}
return orchestratorInstance;
}
function createSSEEvent(eventName: string, data: Record<string, any> | string): string {
return `event: ${eventName}\ndata: ${typeof data === "string" ? data : JSON.stringify(data)}\n\n`;
}
const visionDetailConfig = appConfig.openai.visionDetail;
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
.order('created_at', { ascending: false })
.limit(1)
.single();
if (fetchError && fetchError.code !== 'PGRST116') {
logger.error(`${logPrefix} Error fetching conversation:`, fetchError);
throw fetchError;
}
if (existingConvo) {
logger.debug(`${logPrefix} Found existing conversation ID: ${existingConvo.id}`);
return existingConvo.id;
}
logger.info(`${logPrefix} No existing conversation found, creating new one.`);
const newConversationId = randomUUID();
const { data: newConvo, error: createError } = await supabaseAdminClient
.from("conversations")
.insert({ id: newConversationId, user_id: userId, title: `Conversation started ${new Date().toISOString().substring(0,10)}` })
.select("id")
.single();
if (createError || !newConvo) {
logger.error(`${logPrefix} Error creating new conversation:`, createError);
throw createError || new Error("Failed to create new conversation.");
}
logger.info(`${logPrefix} Created new conversation ID: ${newConvo.id}`);
return newConvo.id;
}
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
let finalMessageId = message.id;
// Ensure finalMessageId is a valid UUID; always replace temp IDs with a real UUID for DB
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!finalMessageId || !uuidRegex.test(finalMessageId)) {
    logger.warn(`${logPrefix} Message ID '${finalMessageId}' is not a valid UUID. Generating new UUID for DB.`);
    finalMessageId = randomUUID();
}

let contentToSave = message.content;
if (contentToSave === null && message.attachments && message.attachments.length > 0) {
  contentToSave = `[Sent ${message.attachments.length} attachment(s)]`;
  logger.debug(`${logPrefix} Message content was null but attachments present. Setting content to placeholder for DB.`);
} else if (contentToSave === null) {
  contentToSave = ""; 
  logger.debug(`${logPrefix} Message content was null. Setting to empty string for DB.`);
}


const messageToSave: ChatMessageDB = {
  id: finalMessageId!, // Assert non-null as it's handled above
  conversation_id: conversationId,
  user_id: userId,
  role: message.role,
  content: contentToSave,
  timestamp: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString(),
  attachments: message.attachments?.map(att => ({...att, file: undefined})) || null,
  tool_calls: message.role === "assistant" ? message.tool_calls || null : null,
  tool_call_id: message.role === "tool" ? message.tool_call_id : undefined,
  structured_data: message.structured_data || null,
  audio_url: message.audioUrl || null,
  intent_type: message.intentType || null,
  tts_instructions: message.ttsInstructions || null,
  error: message.error || false,
};

logger.debug(`${logPrefix} Saving message (ID: ${finalMessageId!.substring(0,8)}, Role: ${message.role}) to DB...`);
const { error } = await supabaseAdminClient.from("chat_messages").insert(messageToSave);

if (error) {
  logger.error(`${logPrefix} Error saving message to DB (ID: ${finalMessageId!.substring(0,8)}):`, error);
} else {
  logger.info(`${logPrefix} Message saved successfully to DB (ID: ${finalMessageId!.substring(0,8)}).`);
}

} catch (e: any) {
logger.error(`${logPrefix} Exception saving message to DB:`, e.message, e.stack);
}
}
export async function POST(req: NextRequest) {
const logPrefix = `[API Chat]`;
const cookieStore = cookies();
let userId: string;
let orchestrator: Orchestrator;
const supabaseAdminClient = getSupabaseAdmin();
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
let clientDataFromRequest: any = null;
let allMessagesFromClient: ChatMessage[] = [];
let currentUserMessageForApi: ChatMessage | null = null;
try {
if (contentType.startsWith("application/json")) {
const jsonData = await req.json();
allMessagesFromClient = (jsonData.messages || []) as ChatMessage[];
clientDataFromRequest = jsonData.data;
logger.debug(`${logPrefix} Parsed JSON. Total messages from client: ${allMessagesFromClient.length}.`);
} else if (contentType.startsWith("multipart/form-data")) {
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
const fileId = value.name + "" + value.size + "" + randomUUID().substring(0,8); // More robust ID
filesFromFormData.push({
id: fileId, // Assign ID here
type: value.type.startsWith("image/") ? "image" : (value.type.startsWith("video/") ? "video" : (value.type.startsWith("audio/") ? "audio" : "document")),
name: value.name,
mimeType: value.type,
size: value.size,
file: value,
url: URL.createObjectURL(value), // Create blob URL for local preview in InputArea or if orchestrator needs it
});
}
}
if (parsedMessagesJson.length > 0) {
const lastMessageJson = parsedMessagesJson[parsedMessagesJson.length - 1];
if (lastMessageJson.role === 'user') {
// Merge existing attachments metadata with new file objects
const enrichedAttachments = (lastMessageJson.attachments || []).map((attMeta: MessageAttachment) => {
// Match by name and size if ID is not present or different
const foundFile = filesFromFormData.find(f => f.name === attMeta.name && f.size === attMeta.size );
return foundFile ? { ...attMeta, id: foundFile.id, file: foundFile.file, mimeType: foundFile.mimeType, size: foundFile.size, url: foundFile.url } : attMeta;
});
// Add any files from FormData that weren't in the JSON metadata
      filesFromFormData.forEach(ffdata => {
          if (!enrichedAttachments.some((ea: MessageAttachment) => ea.id === ffdata.id)) {
              enrichedAttachments.push(ffdata);
          }
      });
      lastMessageJson.attachments = enrichedAttachments;
  }
  allMessagesFromClient = parsedMessagesJson as ChatMessage[];

} else if (filesFromFormData.length > 0) {
// If no 'messages' JSON, but files are present, create a new user message for these files
const promptText = formData.get("prompt") as string || `User sent ${filesFromFormData.length} file(s)`;
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
currentUserMessageForApi = { ...lastMessage, id: lastMessage.id || randomUUID() };
if (typeof lastMessage.content === "string") {
        userMessageText = lastMessage.content;
        orchestratorInputContentParts.push({ type: "text", text: userMessageText });
    } else if (Array.isArray(lastMessage.content)) {
        (lastMessage.content as ChatMessageContentPart[]).forEach(part => {
            if (part.type === "text" && typeof part.text === 'string') {
                userMessageText = (userMessageText || "") + part.text; 
                orchestratorInputContentParts.push({ type: "text", text: part.text });
            } else if (part.type === 'input_image' && typeof part.image_url === 'string') {
                // The URL here might be a blob URL or a placeholder_id_
                // The orchestrator will handle uploading/replacing this if a File object is in initialAttachments
                orchestratorInputContentParts.push({ type: "input_image", image_url: part.image_url, detail: part.detail || visionDetailConfig });
            }
        });
    }
    if (Array.isArray(lastMessage.attachments)) {
        initialAttachmentsForOrchestrator = lastMessage.attachments; // These attachments might have File objects
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
// Handle case where content might be truly empty (e.g., only video attachment and no text prompt)
if ( orchestratorInputContentParts.length === 0 &&
initialAttachmentsForOrchestrator.some(att => att.type === 'video') &&
(!userMessageText || userMessageText.trim() === "")
) {
// If only video is sent, provide a default text part for the orchestrator,
// as video analysis summary will augment this.
orchestratorInputContentParts.push({ type: "text", text: `[User sent a video attachment]` });
if (!userMessageText) userMessageText = `[User sent a video attachment]`; // Ensure textQueryForRouter isn't totally empty
}
if (orchestratorInputContentParts.length === 0) {
logger.warn(`${logPrefix} No text or processable content parts derived from user input.`);
return NextResponse.json({ error: "Message content is required." }, { status: 400 });
}
if (currentUserMessageForApi) {
await saveChatMessageToDb(currentUserMessageForApi, userId, conversationId, supabaseAdminClient);
}
const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";

// Generate a new unique runId for THIS specific orchestrator execution (turn)
const turnSpecificRunId = randomUUID();

const effectiveApiContext = {
  ipAddress,
  locale: req.headers.get("accept-language")?.split(",")[0] || appConfig.defaultLocale,
  origin: req.headers.get("origin"),
  sessionId: conversationId, // The long-lived conversation ID for history/context
  runId: turnSpecificRunId,  // A unique ID for this specific turn/orchestration run
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

let lastSavedAssistantMessageId: string | undefined = undefined;

try {
  logger.info(`[${logPrefix}] runOrchestration: About to call orchestrator.runOrchestration. Inspecting initialAttachmentsForOrchestrator (count: ${initialAttachmentsForOrchestrator?.length || 0}):`);
  if (initialAttachmentsForOrchestrator && initialAttachmentsForOrchestrator.length > 0) {
    initialAttachmentsForOrchestrator.forEach((att, index) => {
      logger.info(`[${logPrefix}] runOrchestration: initialAttachment[${index}]: id=${att.id}, type=${att.type}, name=${att.name}, url=${att.url?.substring(0,30)}..., hasFile=${!!att.file}, storagePath=${att.storagePath}`);
    });
  } else {
    logger.info(`[${logPrefix}] runOrchestration: initialAttachmentsForOrchestrator is null, undefined, or empty.`);
  }

  logger.info(`${logPrefix} Calling orchestrator.runOrchestration... User ${userId.substring(0,8)}`);
  const orchestratorResults = await orchestrator.runOrchestration(
    userId, 
    finalOrchestratorInput,
    history,
    effectiveApiContext,
    initialAttachmentsForOrchestrator // Pass attachments with File objects here
  );
  logger.debug(`${logPrefix} Orchestrator finished. Error: ${Array.isArray(orchestratorResults) ? orchestratorResults.map(r => r.error).join('; ') : orchestratorResults.error}. Response: ${Array.isArray(orchestratorResults) ? orchestratorResults.map(r => !!r.response).join('; ') : !!orchestratorResults.response}.`);

  // Support both single and array responses from orchestrator
  const resultsArray = Array.isArray(orchestratorResults) ? orchestratorResults : [orchestratorResults];

  for (const result of resultsArray) {
    const assistantMessageToSave: ChatMessage = { 
      id: randomUUID(), 
      role: "assistant",
      content: (result.response as string | ChatMessageContentPart[] | null) || (result.structuredData ? "[Structured Data Response]" : "[Response processed]"),
      timestamp: new Date().toISOString(),
      attachments: (result.attachments?.map((att: MessageAttachment) => ({...att, file: undefined})) as MessageAttachment[]) || [],
      tool_calls: result.debugInfo?.toolCalls as unknown as ToolCallOutput[] || null,
      structured_data: result.structuredData || null,
      audioUrl: result.audioUrl || undefined,
      intentType: result.intentType || undefined,
      ttsInstructions: result.ttsInstructions || undefined,
      error: !!result.error,
      debugInfo: result.debugInfo || null,
      workflowFeedback: result.workflowFeedback || null,
      clarificationQuestion: result.clarificationQuestion || null,
    };
    await saveChatMessageToDb(assistantMessageToSave, userId, conversationId, supabaseAdminClient);
    lastSavedAssistantMessageId = assistantMessageToSave.id;

    if (result.error && !result.clarificationQuestion) {
      sendErrorToStream(result.error, 500);
      controller.close();
      return;
    }

    if (result.response) {
      const fullTextResponse = result.response;
      const chunkSize = 30; 
      for (let i = 0; i < fullTextResponse.length; i += chunkSize) {
        const chunk = fullTextResponse.substring(i, i + chunkSize);
        controller.enqueue(encoder.encode(createSSEEvent("text-chunk", { text: chunk })));
        await new Promise(resolve => setTimeout(resolve, 10)); 
      }
    }

    if (result.structuredData) {
      controller.enqueue(encoder.encode(createSSEEvent("ui-component", { data: result.structuredData })));
    }

    const annotations: Record<string, any> = { messageId: assistantMessageToSave.id };
    if (result.intentType) annotations.intentType = result.intentType;
    if (result.ttsInstructions) annotations.ttsInstructions = result.ttsInstructions;
    if (result.audioUrl) { 
      annotations.audioUrl = result.audioUrl;
    }
    if (result.debugInfo) annotations.debugInfo = result.debugInfo;
    if (result.workflowFeedback) annotations.workflowFeedback = result.workflowFeedback;
    if (result.clarificationQuestion) annotations.clarificationQuestion = result.clarificationQuestion;
    if (result.attachments && result.attachments.length > 0) {
      annotations.attachments = result.attachments.map((att: MessageAttachment) => ({...att, file: undefined}));
    }

    if (Object.keys(annotations).length > 1 || (Object.keys(annotations).length === 1 && !annotations.messageId)) { // ensure messageId isn't the ONLY key
      controller.enqueue(encoder.encode(createSSEEvent("annotations", annotations)));
    }
  }

  controller.enqueue(encoder.encode(createSSEEvent("stream-end", { sessionId: effectiveApiContext.sessionId, assistantMessageId: lastSavedAssistantMessageId })));

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
