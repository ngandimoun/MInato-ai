import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Orchestrator } from "@/lib/core/orchestrator";
import { checkRateLimit } from "@/lib/rate-limiter";
import { RATE_LIMIT_ID_CHAT, MEDIA_UPLOAD_BUCKET } from "@/lib/constants";
import {
  ChatMessage,
  ChatMessageContentPart,
  MessageAttachment,
  OrchestratorResponse,
} from "@/lib/types/index";
import { logger } from "../../../memory-framework/config";
import { appConfig } from "@/lib/config";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
// Removed generateAgentResponse from here, Orchestrator handles it
// Removed TTSService, OpenAITtsVoice as TTS is handled by Orchestrator
import { getGlobalMemoryFramework } from "@/lib/memory-framework-global";

let orchestratorInstance: Orchestrator | null = null;
function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    logger.info("[API Chat] Initializing Orchestrator instance...");
    try {
      getGlobalMemoryFramework(); // Ensure global memory framework is initialized first
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

const openaiConfig = appConfig.openai as typeof appConfig.openai & { visionDetail: string };

export async function POST(req: NextRequest) {
  const logPrefix = "[API Chat]";
  const cookieStore = cookies();
  let userId: string | null = null;
  let orchestrator: Orchestrator;

  if (!appConfig.openai.apiKey) {
    logger.error(`${logPrefix} OpenAI API Key is missing. LLM clients will not function.`);
    return NextResponse.json({ error: "OpenAI API Key is not configured. Please set OPENAI_API_KEY in your environment." }, { status: 503 });
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
    if (userError) {
      logger.error(`${logPrefix} Supabase getUser() error: ${userError.message}`, userError);
      return NextResponse.json({ error: `Auth check failed: ${userError.message}` }, { status: userError.status || 500 });
    }
    if (!user) {
      logger.warn(`${logPrefix} No active Supabase user.`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
    logger.info(`${logPrefix} Request from user: ${userId ? userId.substring(0,8) : 'UNKNOWN'}...`);
  } catch (authError: any) {
    logger.error(`${logPrefix} Auth Exception:`, authError.message, authError.stack);
    return NextResponse.json({ error: "Authentication process error" }, { status: 500 });
  }

  const { success: rateLimitSuccess } = await checkRateLimit(userId || '', RATE_LIMIT_ID_CHAT);
  if (!rateLimitSuccess) {
    logger.warn(`${logPrefix} Rate limit exceeded for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const contentType = req.headers.get("content-type") || "";
  let history: ChatMessage[] = [];
  let userMessageText: string | null = null;
  let sessionIdFromRequest: string | undefined;
  let attachmentsForOrchestrator: MessageAttachment[] = [];
  let clientDataFromRequest: any = null;
  let requestBodyForLog: any = null;
  let isSimpleTextQuery = false;

  try {
    if (contentType.startsWith("application/json")) {
      const jsonData = await req.json();
      requestBodyForLog = jsonData;
      const allMessages: ChatMessage[] = jsonData.messages || [];
      if (allMessages.length > 0) {
        const lastMessage = allMessages[allMessages.length - 1];
        if (lastMessage?.role === "user") {
          history = allMessages.slice(0, -1);
          if (typeof lastMessage.content === "string") {
            userMessageText = lastMessage.content;
            isSimpleTextQuery = !((lastMessage as any).experimental_attachments && (lastMessage as any).experimental_attachments.length > 0);
          } else if (Array.isArray(lastMessage.content)) {
            userMessageText = lastMessage.content.find(part => part.type === "text")?.text || null;
            isSimpleTextQuery = !lastMessage.content.some(p => p.type === "input_image") && !((lastMessage as any).experimental_attachments && (lastMessage as any).experimental_attachments.length > 0);

            const sdkAttachments = (lastMessage as any).experimental_attachments || [];
            if (Array.isArray(sdkAttachments)) {
              for (const att of sdkAttachments) {
                if (att.url && att.contentType) {
                  attachmentsForOrchestrator.push({
                    id: randomUUID(), type: att.contentType.startsWith("image/") ? "image" : "document",
                    name: att.name || `attachment_${Date.now()}`, url: att.url, mimeType: att.contentType,
                    size: att.size, storagePath: undefined
                  });
                }
              }
            }
            lastMessage.content.forEach(part => {
              if (part.type === "input_image" && part.image_url) {
                if (!attachmentsForOrchestrator.some(a => a.url === part.image_url)) {
                  attachmentsForOrchestrator.push({
                    id: randomUUID(), type: "image", name: `inline_image_${Date.now()}`, url: part.image_url,
                    mimeType: part.image_url.startsWith("data:image/png") ? "image/png"
                              : part.image_url.startsWith("data:image/jpeg") ? "image/jpeg"
                              : part.image_url.startsWith("data:image/webp") ? "image/webp"
                              : part.image_url.startsWith("data:image/gif") ? "image/gif"
                              : "application/octet-stream",
                    storagePath: undefined
                  });
                }
              }
            });
          }
        } else {
          history = allMessages;
          isSimpleTextQuery = true; // No new user message implies a simple context continuation
        }
      } else {
        isSimpleTextQuery = true; // No messages implies new chat, likely simple text first
      }
      sessionIdFromRequest = jsonData.id;
      clientDataFromRequest = jsonData.data;
      logger.debug(`${logPrefix} Parsed JSON. History: ${history.length}. Attachments: ${attachmentsForOrchestrator.length}. SimpleText: ${isSimpleTextQuery}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);

    } else if (contentType.startsWith("multipart/form-data")) {
      const formData = await req.formData();
      requestBodyForLog = "FormData (details in logs)";
      const messagesString = formData.get("messages") as string | null;
      if (messagesString) {
        try {
          const parsedMessages: ChatMessage[] = JSON.parse(messagesString);
          if (!Array.isArray(parsedMessages)) throw new Error("'messages' not array");
          if (parsedMessages.length > 0) {
            const lastMessage = parsedMessages[parsedMessages.length - 1];
            if (lastMessage?.role === "user") {
              history = parsedMessages.slice(0, -1);
              if (typeof lastMessage.content === "string") userMessageText = lastMessage.content;
              // attachments will be handled by iterating formData
            } else { history = parsedMessages; }
          } else { history = []; }
        } catch (e: any) {
          logger.error(`${logPrefix} Invalid 'messages' JSON in FormData for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}:`, e.message);
          return NextResponse.json({ error: `Invalid 'messages' format: ${e.message}` }, { status: 400 });
        }
      }
      const sessionIdParam = formData.get("id") as string | null;
      const dataString = formData.get("data") as string | null;
      if (sessionIdParam) sessionIdFromRequest = sessionIdParam;
      if (dataString) try { clientDataFromRequest = JSON.parse(dataString); } catch (e: any) { logger.warn(`${logPrefix} No parse 'data' FormData: ${e.message}`); }

      const supabaseAdmin = getSupabaseAdminClient();
      if (!supabaseAdmin) {
        logger.error(`${logPrefix} Supabase admin client unavailable for file upload.`);
        throw new Error("Storage service misconfiguration.");
      }
      const fileProcessingPromises: Promise<void>[] = [];
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          if (value.size === 0) { logger.warn(`${logPrefix} Skipping empty file: ${value.name}`); continue; }
          const isVideo = value.type.startsWith("video/");
          const isImage = value.type.startsWith("image/");
          if (!isImage && !isVideo) {
            logger.warn(`${logPrefix} Rejected unsupported file: ${value.name} (${value.type})`);
            return NextResponse.json({ error: `Unsupported file type: ${value.type}. Images/videos only.` }, { status: 400 });
          }
          logger.info(`${logPrefix} Uploading file: ${value.name} (${value.size}b, ${value.type}) for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
          const fileBuffer = Buffer.from(await value.arrayBuffer());
          const originalFileName = value.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const fileExtension = originalFileName.split(".").pop() || "bin";
          const uniqueFileName = `${randomUUID()}.${fileExtension}`;
          const fileFolder = isImage ? "images" : "videos";
          const filePath = `${fileFolder}/${userId}/${uniqueFileName}`;
          
          const uploadPromise = supabaseAdmin.storage.from(MEDIA_UPLOAD_BUCKET).upload(filePath, fileBuffer, { contentType: value.type, upsert: false })
            .then(({ data: uploadData, error: uploadError }) => {
              if (uploadError) {
                logger.error(`${logPrefix} Supabase upload error for ${filePath} (User ${userId ? userId.substring(0,8) : 'UNKNOWN'}):`, uploadError.message);
                throw new Error(`Upload to ${MEDIA_UPLOAD_BUCKET}/${filePath} failed: ${uploadError.message}`);
              }
              if (uploadData) {
                logger.debug(`${logPrefix} Upload OK to ${filePath} for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
                attachmentsForOrchestrator.push({
                  id: randomUUID(), type: isImage ? "image" : "video", name: originalFileName,
                  storagePath: filePath, mimeType: value.type, size: value.size,
                });
              }
            });
          fileProcessingPromises.push(uploadPromise);
        }
      }
      await Promise.allSettled(fileProcessingPromises);
      // isSimpleTextQuery determined by presence of attachments
      isSimpleTextQuery = !userMessageText && attachmentsForOrchestrator.length === 0 || !!userMessageText && attachmentsForOrchestrator.length === 0;
      logger.debug(`${logPrefix} Parsed FormData. Attachments: ${attachmentsForOrchestrator.length}. SimpleText: ${isSimpleTextQuery}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);

    } else {
      logger.error(`${logPrefix} Unsupported Content-Type: ${contentType}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);
      return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
    }

    logger.debug(`${logPrefix} Request body log for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}:\n${JSON.stringify(requestBodyForLog, null, 2).substring(0, 500)}`);

    if (!userMessageText && attachmentsForOrchestrator.length === 0) {
      logger.warn(`${logPrefix} No text or attachments. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);
      return NextResponse.json({ error: "Message content or file is required." }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const effectiveApiContext = {
      ipAddress,
      locale: req.headers.get("accept-language")?.split(",")[0] || appConfig.defaultLocale,
      origin: req.headers.get("origin"),
      sessionId: sessionIdFromRequest,
      runId: sessionIdFromRequest, // Using sessionId as runId for chat
      ...(clientDataFromRequest && { clientData: clientDataFromRequest }),
    };

    let orchestratorInput: string | ChatMessageContentPart[];
    if (attachmentsForOrchestrator.some(att => att.type === "image" || att.type === "video")) {
      const contentParts: ChatMessageContentPart[] = [];
      if (userMessageText) contentParts.push({ type: "text", text: userMessageText });
      for (const att of attachmentsForOrchestrator) {
        if (att.type === "image" || att.type === "video") {
          if (att.url) { // Pasted URL or already uploaded
            contentParts.push({ type: "input_image", image_url: att.url, detail: openaiConfig.visionDetail as "auto" | "low" | "high" });
          } else if (att.storagePath) { // Freshly uploaded file
            contentParts.push({ type: "input_image", image_url: `supabase_storage:${att.storagePath}`, detail: openaiConfig.visionDetail as "auto" | "low" | "high" });
          }
        }
      }
      orchestratorInput = contentParts;
      logger.debug(`${logPrefix} Multimodal input for orchestrator. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);
    } else {
      orchestratorInput = userMessageText || "";
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const sendErrorToStream = (errorMessage: string, statusCode: number = 500) => {
          try {
            controller.enqueue(encoder.encode(createSSEEvent("error", { error: errorMessage, statusCode })));
            logger.info(`${logPrefix} Sent error to client: ${errorMessage}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
          } catch (e: any) {
            logger.error(`${logPrefix} Stream Error - Failed to enqueue error event: ${e.message}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
          }
        };

        try {
          // No direct LLM call optimization here for simplicity with Responses API
          // The Orchestrator will handle all LLM calls.
          logger.info(`${logPrefix} Calling orchestrator.runOrchestration... User ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
          const orchestratorResult = await orchestrator.runOrchestration(
            userId || '',
            orchestratorInput, // This is now string | ChatMessageContentPart[]
            history,
            effectiveApiContext
          );
          logger.debug(`${logPrefix} Orchestrator finished. Error: ${orchestratorResult.error}. Response: ${!!orchestratorResult.response}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);

          if (orchestratorResult.error && !orchestratorResult.clarificationQuestion) {
            sendErrorToStream(orchestratorResult.error, 500);
            controller.close();
            return;
          }

          if (orchestratorResult.response) {
            const fullTextResponse = orchestratorResult.response;
            // Stream text in chunks
            const chunkSize = 30; // Adjust chunk size as needed
            for (let i = 0; i < fullTextResponse.length; i += chunkSize) {
              const chunk = fullTextResponse.substring(i, i + chunkSize);
              controller.enqueue(encoder.encode(createSSEEvent("text-chunk", { text: chunk })));
              await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for smoother streaming
            }
          }

          if (orchestratorResult.structuredData) {
            controller.enqueue(encoder.encode(createSSEEvent("ui-component", { data: orchestratorResult.structuredData })));
          }

          const annotations: Record<string, any> = {};
          if (orchestratorResult.intentType) annotations.intentType = orchestratorResult.intentType;
          if (orchestratorResult.ttsInstructions) annotations.ttsInstructions = orchestratorResult.ttsInstructions;
          if (orchestratorResult.audioUrl) { // For chained voice responses
            annotations.audioUrl = orchestratorResult.audioUrl;
            annotations.audioResponseUrl = orchestratorResult.audioUrl;
          }
          if (orchestratorResult.debugInfo) annotations.debugInfo = orchestratorResult.debugInfo;
          if (orchestratorResult.workflowFeedback) annotations.workflowFeedback = orchestratorResult.workflowFeedback;
          if (orchestratorResult.clarificationQuestion) annotations.clarificationQuestion = orchestratorResult.clarificationQuestion;

          if (Object.keys(annotations).length > 0) {
            controller.enqueue(encoder.encode(createSSEEvent("annotations", annotations)));
          }

          controller.enqueue(encoder.encode(createSSEEvent("stream-end", { sessionId: effectiveApiContext.sessionId })));

        } catch (e: any) {
          logger.error(`${logPrefix} Error in stream 'start' for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}:`, e.message, e.stack);
          sendErrorToStream(e.message || "Internal server error during stream processing.", 500);
        } finally {
          logger.debug(`${logPrefix} Closing SSE stream from API route. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);
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
        "X-Accel-Buffering": "no", // Useful for Nginx
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