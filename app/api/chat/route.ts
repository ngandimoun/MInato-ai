//app/api/chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { Orchestrator } from "@/lib/core/orchestrator";
import { checkRateLimit } from "@/lib/rate-limiter";
import { RATE_LIMIT_ID_CHAT, MEDIA_UPLOAD_BUCKET } from "@/lib/constants";
import {
  ChatMessage,
  ChatMessageContentPart,
  ChatMessageContentPartText,
  MessageAttachment,
  OrchestratorResponse,
} from "@/lib/types/index";
import { logger } from "../../../memory-framework/config";
import { appConfig } from "@/lib/config";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import { getGlobalMemoryFramework } from "@/lib/memory-framework-global";

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

export async function POST(req: NextRequest) {
  const logPrefix = "[API Chat]";
  const cookieStore = cookies();
  let userId: string | null = null;
  let orchestrator: Orchestrator;

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
  let userMessageText: string | null = null; // Text part of the user's message
  let orchestratorInputContentParts: ChatMessageContentPart[] = []; // For multimodal or complex text
  let initialAttachments: MessageAttachment[] = []; // For files/videos for the orchestrator

  let sessionIdFromRequest: string | undefined;
  let clientDataFromRequest: any = null;

  try {
    if (contentType.startsWith("application/json")) {
      const jsonData = await req.json();
      const allMessages: ChatMessage[] = jsonData.messages || [];
      
      if (allMessages.length > 0) {
        const lastMessage = allMessages[allMessages.length - 1];
        if (lastMessage?.role === "user") {
          history = allMessages.slice(0, -1); // History is everything BEFORE the last user message
          // Process last user message for content parts
          if (typeof lastMessage.content === "string") {
            userMessageText = lastMessage.content;
            orchestratorInputContentParts.push({ type: "text", text: userMessageText });
          } else if (Array.isArray(lastMessage.content)) {
            lastMessage.content.forEach(part => {
              if (part.type === "text" && typeof part.text === 'string') {
                userMessageText = (userMessageText || "") + part.text;
                orchestratorInputContentParts.push({ type: "text", text: part.text });
              } else if ((part as any).type === 'input_image' && typeof (part as any).image_url === 'string') { // from client sending string URL
                 orchestratorInputContentParts.push({ type: "input_image", image_url: (part as any).image_url, detail: (part as any).detail || visionDetailConfig });
              } else if ((part as any).type === 'image_url' && typeof (part as any).image_url?.url === 'string') { // Already in OpenAI format
                 orchestratorInputContentParts.push({ type: "input_image", image_url: (part as any).image_url.url, detail: (part as any).image_url.detail || visionDetailConfig });
              }
            });
          }
          // Process experimental_attachments from the last user message
          if (Array.isArray((lastMessage as any).experimental_attachments)) {
            initialAttachments = ((lastMessage as any).experimental_attachments as any[]).map(att => ({
              id: att.id || randomUUID(),
              type: att.contentType?.startsWith("image/") ? "image" : (att.contentType?.startsWith("video/") ? "video" : "document"),
              name: att.name || `attachment_${Date.now()}`,
              url: att.url, // Assumes URL is present, could be data URI from client
              mimeType: att.contentType,
              size: att.size,
              file: undefined, // Will be handled by server if it was FormData
              storagePath: undefined
            }));
          }
        } else {
          history = allMessages; // All messages are history if last is not user
        }
      }
      sessionIdFromRequest = jsonData.id;
      clientDataFromRequest = jsonData.data;
      logger.debug(`${logPrefix} Parsed JSON. History: ${history.length}. UserText: ${userMessageText ? "Yes" : "No"}. InputParts: ${orchestratorInputContentParts.length}. InitialAttachments: ${initialAttachments.length}`);

    } else if (contentType.startsWith("multipart/form-data")) {
      const formData = await req.formData();
      const messagesString = formData.get("messages") as string | null;
      if (messagesString) {
        try {
          const parsedMessages: ChatMessage[] = JSON.parse(messagesString);
          if (!Array.isArray(parsedMessages)) throw new Error("'messages' not array");
          // Same logic as JSON to extract history and last user message parts
          if (parsedMessages.length > 0) {
            const lastMessage = parsedMessages[parsedMessages.length - 1];
            if (lastMessage?.role === "user") {
              history = parsedMessages.slice(0, -1);
              if (typeof lastMessage.content === "string") {
                 userMessageText = lastMessage.content;
                 orchestratorInputContentParts.push({ type: "text", text: userMessageText });
              } else if (Array.isArray(lastMessage.content)) { /* Handle parts if sent this way */ }
            } else { history = parsedMessages; }
          }
        } catch (e: any) {
          logger.error(`${logPrefix} Invalid 'messages' JSON in FormData:`, e.message);
          return NextResponse.json({ error: `Invalid 'messages' format: ${e.message}` }, { status: 400 });
        }
      }
      // Fallback for simple text prompt
      if (!userMessageText && formData.has("prompt")) {
         userMessageText = formData.get("prompt") as string;
         if (userMessageText) orchestratorInputContentParts.push({ type: "text", text: userMessageText });
      }

      sessionIdFromRequest = formData.get("id") as string | null || undefined;
      const dataString = formData.get("data") as string | null;
      if (dataString) try { clientDataFromRequest = JSON.parse(dataString); } catch {}

      // Process files from FormData for initialAttachments
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          if (value.size === 0) { logger.warn(`${logPrefix} Skipping empty file: ${value.name}`); continue; }
          const fileType = value.type.startsWith("image/") ? "image" : (value.type.startsWith("video/") ? "video" : "document");
          initialAttachments.push({
            id: randomUUID(),
            type: fileType,
            name: value.name,
            mimeType: value.type,
            size: value.size,
            file: value, // Keep the File object for orchestrator to process
            url: "", // Will be set if/when uploaded by orchestrator or service
            storagePath: undefined,
          });
          logger.info(`${logPrefix} Added attachment from FormData: ${value.name} (${fileType})`);
        }
      }
      logger.debug(`${logPrefix} Parsed FormData. History: ${history.length}. UserText: ${userMessageText ? "Yes" : "No"}. InitialAttachments: ${initialAttachments.length}`);
    } else {
      logger.error(`${logPrefix} Unsupported Content-Type: ${contentType}.`);
      return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
    }

    // If orchestratorInputContentParts is still empty but userMessageText exists, populate it
    if (orchestratorInputContentParts.length === 0 && userMessageText) {
        orchestratorInputContentParts.push({ type: "text", text: userMessageText });
    }
    // If no text and no image/video attachments directly for input_image, but other attachments exist
    if (orchestratorInputContentParts.filter(p => p.type === 'text' || p.type === 'input_image').length === 0 && initialAttachments.length > 0 && !userMessageText) {
       // Create a placeholder text part if only non-image/video attachments are present without text
       orchestratorInputContentParts.push({ type: "text", text: `[Processing ${initialAttachments.length} attachment(s)]` });
    }

    if (orchestratorInputContentParts.length === 0) {
      logger.warn(`${logPrefix} No text or processable content parts derived from user input.`);
      return NextResponse.json({ error: "Message content is required." }, { status: 400 });
    }

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const effectiveApiContext = {
      ipAddress,
      locale: req.headers.get("accept-language")?.split(",")[0] || appConfig.defaultLocale,
      origin: req.headers.get("origin"),
      sessionId: sessionIdFromRequest,
      runId: sessionIdFromRequest, 
      ...(clientDataFromRequest && { clientData: clientDataFromRequest }),
    };

    // orchestratorInputContentParts now correctly holds ChatMessageContentPart[]
    // initialAttachments holds files that need backend processing (like video for analysis)
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
          logger.info(`${logPrefix} Calling orchestrator.runOrchestration... User ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
          const orchestratorResult = await orchestrator.runOrchestration(
            userId || '', 
            finalOrchestratorInput,
            history,
            effectiveApiContext,
            initialAttachments 
          );
          logger.debug(`${logPrefix} Orchestrator finished. Error: ${orchestratorResult.error}. Response: ${!!orchestratorResult.response}.`);

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

          const annotations: Record<string, any> = {};
          if (orchestratorResult.intentType) annotations.intentType = orchestratorResult.intentType;
          if (orchestratorResult.ttsInstructions) annotations.ttsInstructions = orchestratorResult.ttsInstructions;
          if (orchestratorResult.audioUrl) { 
            annotations.audioUrl = orchestratorResult.audioUrl;
            annotations.audioResponseUrl = orchestratorResult.audioUrl;
          }
          if (orchestratorResult.debugInfo) annotations.debugInfo = orchestratorResult.debugInfo;
          if (orchestratorResult.workflowFeedback) annotations.workflowFeedback = orchestratorResult.workflowFeedback;
          if (orchestratorResult.clarificationQuestion) annotations.clarificationQuestion = orchestratorResult.clarificationQuestion;
          // Send back processed attachments if orchestrator modified/added any (e.g., storage URLs)
          if (orchestratorResult.attachments && orchestratorResult.attachments.length > 0) {
            annotations.attachments = orchestratorResult.attachments;
          }

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