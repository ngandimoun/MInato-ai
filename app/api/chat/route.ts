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

// Vision detail from the *newly structured* appConfig.openai
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
  let userMessageText: string | null = null;
  let sessionIdFromRequest: string | undefined;
  let attachmentsForOrchestrator: MessageAttachment[] = [];
  let inputContentPartsForOrchestrator: ChatMessageContentPart[] = [];
  let clientDataFromRequest: any = null;
  let requestBodyForLog: any = null;

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
            inputContentPartsForOrchestrator.push({ type: "text", text: userMessageText });
          } else if (Array.isArray(lastMessage.content)) {
            // Correctly process ChatMessageContentPart[]
            lastMessage.content.forEach(part => {
              if (part.type === "text" && typeof part.text === 'string') {
                userMessageText = (userMessageText || "") + part.text; // Concatenate text parts
                inputContentPartsForOrchestrator.push({ type: "text", text: part.text });
              } else if ((part as any).type === 'input_image' && (part as any).image_url) {
                inputContentPartsForOrchestrator.push({
                  type: "input_image", // Use the correct type for GPT-4o
                  image_url: (part as any).image_url, // This should be an object { url: string, detail?: string }
                  detail: (part as any).detail || visionDetailConfig
                });
              } else if ((part as any).type === 'image_url' && typeof (part as any).image_url?.url === 'string') { // Already in OpenAI format
                  inputContentPartsForOrchestrator.push({
                      type: "input_image",
                      image_url: (part as any).image_url,
                      detail: (part as any).detail || visionDetailConfig
                  });
              }
            });
          }
        } else {
          history = allMessages;
        }
      }
      sessionIdFromRequest = jsonData.id;
      clientDataFromRequest = jsonData.data;

      // Process sdkAttachments for JSON if any (less common, usually for FormData)
      const sdkAttachments = (jsonData.messages?.[jsonData.messages.length - 1] as any)?.experimental_attachments || [];
      if (Array.isArray(sdkAttachments)) {
        for (const att of sdkAttachments) {
          if (att.url && att.contentType) {
            const attachmentToAdd: MessageAttachment = {
              id: randomUUID(), type: att.contentType.startsWith("image/") ? "image" : "document", // Adjust as needed
              name: att.name || `attachment_${Date.now()}`, url: att.url, mimeType: att.contentType,
              size: att.size, storagePath: undefined // Not uploaded via this path, URL is direct
            };
            attachmentsForOrchestrator.push(attachmentToAdd);
            if (attachmentToAdd.type === "image" && attachmentToAdd.url) {
                inputContentPartsForOrchestrator.push({
                    type: "input_image", image_url: attachmentToAdd.url
                });
            }
          }
        }
      }
      logger.debug(`${logPrefix} Parsed JSON. History: ${history.length}. Orchestrator Input Parts: ${inputContentPartsForOrchestrator.length}. Attachments (from sdk): ${attachmentsForOrchestrator.length}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);

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
              if (typeof lastMessage.content === "string") {
                 userMessageText = lastMessage.content;
                 inputContentPartsForOrchestrator.push({ type: "text", text: userMessageText });
              }
              // Note: ChatMessageContentPart[] in FormData 'messages' field is less common.
              // If it occurs, it would need specific handling here.
            } else { history = parsedMessages; }
          } else { history = []; }
        } catch (e: any) {
          logger.error(`${logPrefix} Invalid 'messages' JSON in FormData for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}:`, e.message);
          return NextResponse.json({ error: `Invalid 'messages' format: ${e.message}` }, { status: 400 });
        }
      }
      if (!userMessageText && formData.has("prompt")) { // Fallback for simple text prompt in FormData
         userMessageText = formData.get("prompt") as string;
         if (userMessageText) inputContentPartsForOrchestrator.push({ type: "text", text: userMessageText });
      }

      const sessionIdParam = formData.get("id") as string | null;
      const dataString = formData.get("data") as string | null;
      if (sessionIdParam) sessionIdFromRequest = sessionIdParam;
      if (dataString) try { clientDataFromRequest = JSON.parse(dataString); } catch (e: any) { logger.warn(`${logPrefix} No parse 'data' FormData: ${e.message}`); }

      const supabaseAdmin = getSupabaseAdminClient();
      if (!supabaseAdmin) { logger.error(`${logPrefix} Supabase admin client unavailable for file upload.`); throw new Error("Storage service misconfiguration."); }
      
      const fileProcessingPromises: Promise<void>[] = [];
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          if (value.size === 0) { logger.warn(`${logPrefix} Skipping empty file: ${value.name}`); continue; }
          const isImage = value.type.startsWith("image/");
          const isVideo = value.type.startsWith("video/"); // For video frames, not direct video processing by GPT-4o here
          
          if (!isImage && !isVideo) { // Only allow images and videos for direct GPT-4o input, docs handled separately by settings panel
            logger.warn(`${logPrefix} Rejected unsupported file type for direct chat input: ${value.name} (${value.type})`);
            continue; // Skip non-image/video files for direct GPT-4o content parts
          }

          logger.info(`${logPrefix} Uploading file (for GPT-4o input): ${value.name} (${value.size}b, ${value.type}) for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
          const fileBuffer = Buffer.from(await value.arrayBuffer());
          const originalFileName = value.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const fileExtension = originalFileName.split(".").pop() || "bin";
          const uniqueFileName = `${randomUUID()}.${fileExtension}`;
          const fileFolder = isImage ? "images" : (isVideo ? "video_frames_temp" : "other_uploads"); // Temp folder for video frames if needed
          const filePath = `${fileFolder}/${userId}/${uniqueFileName}`;
          
          const uploadPromise = supabaseAdmin.storage.from(MEDIA_UPLOAD_BUCKET).upload(filePath, fileBuffer, { contentType: value.type, upsert: false })
            .then(async ({ data: uploadData, error: uploadError }) => {
              if (uploadError) {
                logger.error(`${logPrefix} Supabase upload error for ${filePath} (User ${userId ? userId.substring(0,8) : 'UNKNOWN'}):`, uploadError.message);
                throw new Error(`Upload to ${MEDIA_UPLOAD_BUCKET}/${filePath} failed: ${uploadError.message}`);
              }
              if (uploadData) {
                logger.debug(`${logPrefix} Upload OK to ${filePath} for user ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
                const { data: publicUrlData } = supabaseAdmin.storage.from(MEDIA_UPLOAD_BUCKET).getPublicUrl(filePath);
                if (publicUrlData?.publicUrl) {
                  if (isImage) {
                    inputContentPartsForOrchestrator.push({
                      type: "input_image",
                      image_url: publicUrlData.publicUrl
                    });
                  } else if (isVideo) {
                    // Video analysis is now separate, handle by sending to /api/video/analyze in frontend or specialized orchestrator path
                    // For now, just log it was received. If frames were extracted client-side and sent, they'd be handled as images.
                    logger.info(`${logPrefix} Video file ${originalFileName} uploaded, analysis via /api/video/analyze expected if needed.`);
                     attachmentsForOrchestrator.push({
                        id: randomUUID(), type: "video", name: originalFileName, url: publicUrlData.publicUrl,
                        mimeType: value.type, size: value.size, storagePath: filePath,
                    });
                  }
                } else {
                   logger.warn(`${logPrefix} Could not get public URL for uploaded file ${filePath}. Will not be sent to GPT-4o.`);
                }
              }
            });
          fileProcessingPromises.push(uploadPromise);
        }
      }
      await Promise.allSettled(fileProcessingPromises);
      logger.debug(`${logPrefix} Parsed FormData. Orchestrator Input Parts: ${inputContentPartsForOrchestrator.length}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);

    } else {
      logger.error(`${logPrefix} Unsupported Content-Type: ${contentType}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);
      return NextResponse.json({ error: "Unsupported Content-Type" }, { status: 415 });
    }

    if (inputContentPartsForOrchestrator.length === 0 && attachmentsForOrchestrator.length === 0) {
      logger.warn(`${logPrefix} No text or processable attachments/content parts. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}.`);
      return NextResponse.json({ error: "Message content or file is required." }, { status: 400 });
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

    // Use inputContentPartsForOrchestrator directly if it's populated (multimodal)
    // Otherwise, fallback to userMessageText for text-only input.
    const orchestratorFinalInput: string | ChatMessageContentPart[] =
        inputContentPartsForOrchestrator.length > 0
            ? inputContentPartsForOrchestrator
            : (userMessageText || "");


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
          logger.info(`${logPrefix} Calling orchestrator.runOrchestration... User ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);
          const orchestratorResult = await orchestrator.runOrchestration(
            userId || '', // userId is guaranteed to be non-null here
            orchestratorFinalInput,
            history,
            effectiveApiContext,
            attachmentsForOrchestrator // Pass along any attachments that weren't image/video for GPT-4o
          );
          logger.debug(`${logPrefix} Orchestrator finished. Error: ${orchestratorResult.error}. Response: ${!!orchestratorResult.response}. User ${userId ? userId.substring(0,8) : 'UNKNOWN'}`);

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