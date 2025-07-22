// FILE: app/api/audio/route.ts
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Orchestrator } from "@/lib/core/orchestrator";
import { ChatMessage, OrchestratorResponse } from "@/lib/types/index";
import { checkRateLimit } from "@/lib/rate-limiter";
import {
  RATE_LIMIT_ID_AUDIO_INPUT,
  AUDIO_BUCKET,
  MAX_AUDIO_SIZE_BYTES,
  ALLOWED_AUDIO_TYPES,
  SIGNED_URL_EXPIRY_SECONDS,
} from "@/lib/constants";
import { logger } from "../../../memory-framework/config";
import { randomUUID } from "crypto";
import { appConfig } from "@/lib/config";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { STTService } from "@/lib/providers/stt_service";

let orchestratorInstance: Orchestrator | null = null;

interface UserAudioMessage {
  content?: string;
  timestamp?: string;
  attachments?: any[];
  audioUrl?: string;
  isAudioMessage?: boolean;
}

interface AssistantResponse {
  response?: string | null;
  structuredData?: any;
  audioUrl?: string | null;
  intentType?: string | null;
  ttsInstructions?: string | null;
  debugInfo?: any;
  error?: any;
  transcription?: string | null;
}

function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    logger.info("[API Audio] Initializing Orchestrator instance...");
    try {
      // Memory framework is initialized globally or by Orchestrator constructor
      orchestratorInstance = new Orchestrator();
    } catch (e: any) {
      logger.error(
        "[API Audio] FATAL: Failed to initialize Orchestrator:",
        e.message,
        e.stack
      );
      throw new Error(`Orchestrator initialization failed: ${e.message}`);
    }
  }
  return orchestratorInstance;
}

async function saveMessageToDatabase(
  userMessage: UserAudioMessage, 
  assistantResponse: AssistantResponse, 
  userId: string, 
  conversationId?: string
): Promise<boolean> {
  const logPrefix = "[API Audio]";
  try {
    // Get the conversation ID if not provided
    if (!conversationId) {
      const supabase = getSupabaseAdminClient();
      if (!supabase) {
        logger.error(`${logPrefix} Supabase admin client unavailable`);
        return false;
      }
      
      const { data: convoData } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (!convoData) {
        // Create a new conversation
        const { data: newConvo } = await supabase
          .from('conversations')
          .insert([{ user_id: userId }])
          .select('id')
          .single();
        
        if (!newConvo) {
          logger.error(`${logPrefix} Failed to create new conversation`);
          return false;
        }
        
        conversationId = newConvo.id;
      } else {
        conversationId = convoData.id;
      }
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      logger.error(`${logPrefix} Supabase admin client unavailable`);
      return false;
    }
    
    // Save the user audio message
    await supabase
      .from('chat_messages')
      .insert([{
        conversation_id: conversationId,
        user_id: userId,
        role: 'user',
        content: userMessage.content || "[Audio Message]",
        timestamp: userMessage.timestamp || new Date().toISOString(),
        attachments: userMessage.attachments || [],
        audio_url: userMessage.audioUrl || null,
        is_audio_message: true
      }]);
    
    // Save the assistant response
    await supabase
      .from('chat_messages')
      .insert([{
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantResponse.response || null,
        timestamp: new Date().toISOString(),
        structured_data: assistantResponse.structuredData || null,
        audio_url: assistantResponse.audioUrl || null,
        intent_type: assistantResponse.intentType || null,
        tts_instructions: assistantResponse.ttsInstructions || null,
        debug_info: assistantResponse.debugInfo || null,
        error: !!assistantResponse.error
      }]);
    
    logger.info(`${logPrefix} Messages saved to database for conversation: ${conversationId}`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`${logPrefix} Error saving messages to database: ${errorMessage}`);
    return false;
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = "[API Audio]";
  const origin = req.headers.get("origin");
  const contentType = req.headers.get("content-type") || "";
  const cookieStore = cookies();
  let userId: string | null = null;
  let uploadPath: string | null = null; // To store the path for cleanup
  let supabaseAdminForStorage: ReturnType<typeof getSupabaseAdminClient> | null = null;

  try {
    // --- Authentication ---
    try {
      const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.id) {
        logger.warn(`${logPrefix} No active Supabase session found.`);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
      logger.info(
        `${logPrefix} Request received from authenticated Supabase user: ${(userId ?? "unknown").substring(0, 8)}...`
      );
    } catch (authError: any) {
      logger.error(
        `${logPrefix} Auth Error checking Supabase session:`,
        authError
      );
      return NextResponse.json(
        { error: "Authentication error" },
        { status: 500 }
      );
    }

    if (!userId) { // Should not happen if above logic is correct
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Rate Limiting ---
    const { success: rateLimitSuccess } = await checkRateLimit(
      userId, // userId is now guaranteed non-null
      RATE_LIMIT_ID_AUDIO_INPUT
    );
    if (!rateLimitSuccess) {
      logger.warn(
        `${logPrefix} Rate limit exceeded for user ${userId.substring(0, 8)}`
      );
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    if (!contentType.startsWith("multipart/form-data")) {
      logger.warn(
        `${logPrefix} Invalid Content-Type for user ${userId.substring(0, 8)}`
      );
      return NextResponse.json(
        { error: "Invalid Content-Type, expected multipart/form-data" },
        { status: 400 }
      );
    }

    let audioBuffer: Buffer | null = null;
    let detectedMimeType: string | null = null;
    let originalFilename: string | null = null;
    let history: ChatMessage[] = [];
    let sessionId: string | undefined;

    try {
      const formData = await req.formData();
      const audioFileFromForm = formData.get("audio") as File | null; // Use File type, Vercel might handle it.
      
      // Modified Check for audioFile
      if (!audioFileFromForm || typeof audioFileFromForm.size !== 'number' || typeof audioFileFromForm.arrayBuffer !== 'function') {
        logger.error(`${logPrefix} Missing or invalid "audio" file part (type/size check failed) for user ${userId.substring(0, 8)}.`);
        return NextResponse.json({ error: 'Missing or invalid "audio" file part' }, { status: 400 });
      }
      const audioFile = audioFileFromForm; // Rename for clarity after check

      const historyParam = formData.get("history");
      const sessionIdParam = formData.get("sessionId");
      if (historyParam && typeof historyParam === "string") {
        try {
          history = JSON.parse(historyParam);
          if (!Array.isArray(history))
            throw new Error("History is not an array");
        } catch (e: any) {
          logger.error(
            `${logPrefix} Invalid history JSON provided by user ${userId.substring(0, 8)}:`,
            e.message
          );
          return NextResponse.json(
            { error: `Invalid history JSON format: ${e.message}` },
            { status: 400 }
          );
        }
      }
      if (sessionIdParam && typeof sessionIdParam === "string")
        sessionId = sessionIdParam;
      
      const messagesParam = formData.get("messages");
      if (messagesParam && typeof messagesParam === "string") {
        try {
          const parsedMessages = JSON.parse(messagesParam);
          if (Array.isArray(parsedMessages)) {
            // Find the user's audio message
            const userAudioMessage = parsedMessages.find(m => 
              m.role === "user" && m.isAudioMessage === true
            );
            
            if (userAudioMessage) {
              // Convert to ChatMessage format for history
              history = parsedMessages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                attachments: m.attachments || [],
                isAudioMessage: m.isAudioMessage // Pass the audio message flag
              }));
              
              logger.debug(`${logPrefix} Found user audio message in history, isAudioMessage flag set.`);
            } else {
              history = parsedMessages;
            }
          }
        } catch (e: any) {
          logger.error(
            `${logPrefix} Invalid messages JSON provided by user ${userId.substring(0, 8)}:`,
            e.message
          );
        }
      }
      
      // File size and type checks
      if (audioFile.size > MAX_AUDIO_SIZE_BYTES)
        return NextResponse.json(
          {
            error: `Audio file too large (max ${
              MAX_AUDIO_SIZE_BYTES / (1024 * 1024)
            }MB)`,
          },
          { status: 413 }
        );
      
      detectedMimeType = audioFile.type;
      originalFilename =
        audioFile instanceof File ? audioFile.name : "audio.bin";
      audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      logger.info(
        `${logPrefix} [RECV] Audio: ${originalFilename} (${audioFile.size} bytes, type: ${detectedMimeType}) for user ${userId.substring(0, 8)}`
      );
      logger.debug(
        `${logPrefix} [RECV] Buffer: size=${audioBuffer.length} bytes, firstBytes=${audioBuffer.slice(0, 16).toString("hex")}, sha256=${require("crypto").createHash("sha256").update(audioBuffer).digest("hex").substring(0, 16)}`
      );
    } catch (e: any) {
      logger.error(
        `${logPrefix} Error parsing form data for user ${userId.substring(0, 8)}:`,
        e
      );
      return NextResponse.json(
        { error: `Failed to process request: ${e.message}` },
        { status: 400 }
      );
    }
    if (!audioBuffer)
      return NextResponse.json(
        { error: "Failed to read audio data" },
        { status: 500 }
      );

    supabaseAdminForStorage = getSupabaseAdminClient(); // Initialize here as it's needed
    if (!supabaseAdminForStorage || !supabaseAdminForStorage.storage) {
      logger.error(`${logPrefix} supabaseAdmin or supabaseAdmin.storage is undefined!`);
      return NextResponse.json({ error: "Storage admin client not available." }, { status: 500 });
    }

    // Handle webm with opus codec specifically
    if (detectedMimeType === "audio/webm;codecs=opus") {
      // For Supabase storage, we'll use a simpler MIME type that's widely supported
      detectedMimeType = "audio/webm";
      logger.info(`${logPrefix} Converted MIME type from audio/webm;codecs=opus to audio/webm for Supabase compatibility`);
    }

    // Sanitize file extension
    const originalFilenameExtPart = originalFilename?.split('.').pop()?.toLowerCase();
    const cleanFileExtFromOriginal = originalFilenameExtPart?.split(';')[0];

    const mimeExtPart = detectedMimeType?.split('/')[1];
    const cleanMimeExtFromMime = mimeExtPart?.split(';')[0];

    const fileExt = cleanFileExtFromOriginal || cleanMimeExtFromMime || "bin";

    const uploadFileName = `${randomUUID()}.${fileExt}`;
    uploadPath = `uploads/audio/${userId}/${uploadFileName}`; 

    logger.debug(
      `${logPrefix} Uploading audio to Supabase path: ${uploadPath}`
    );
    const { data: uploadData, error: uploadError } = await supabaseAdminForStorage.storage
      .from(AUDIO_BUCKET)
      .upload(uploadPath, audioBuffer, {
        contentType: detectedMimeType!,
        upsert: true,
      });
    if (uploadError) {
      logger.error(
        `${logPrefix} Supabase upload error for user ${userId.substring(0, 8)}: ${uploadError.message}`,
        uploadError
      );
      throw new Error(uploadError.message);
    }
    logger.debug(
      `${logPrefix} [UPLOAD] Audio uploaded to Supabase path: ${uploadPath}, size=${audioBuffer.length} bytes, type=${detectedMimeType}`
    );

    const { data: signedUrlData } = await supabaseAdminForStorage.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(uploadData.path, SIGNED_URL_EXPIRY_SECONDS);
    if (!signedUrlData?.signedUrl) {
      logger.error(
        `${logPrefix} Failed to create signed URL for user ${userId.substring(0, 8)}: Failed to generate secure audio URL`
      );
      throw new Error('Failed to generate secure audio URL');
    }
    const signedUrl = signedUrlData.signedUrl;
    logger.debug(
      `${logPrefix} Created signed URL for user ${userId.substring(0, 8)} (expires ${SIGNED_URL_EXPIRY_SECONDS}s)`
    );

    const ipAddress = req.headers.get("x-forwarded-for") ?? "unknown";
    const locale =
      req.headers.get("accept-language")?.split(",")[0] || undefined;
    const context = {
      ipAddress,
      locale,
      origin,
      originalFilename,
      detectedMimeType,
    };
    
    const orchestrator = getOrchestrator();
    logger.info(
      `${logPrefix} [ORCH] Processing audio message: userId=${userId}, fullSignedUrl=${signedUrl}, size=${audioBuffer.length} bytes, type=${detectedMimeType}`
    );
    
    // Use the proper processAudioMessage method instead of manually transcribing and using runOrchestration
    const response = await orchestrator.processAudioMessage(
      userId,
      signedUrl,
      history,
      sessionId,
      {
        ...context,
        detectedMimeType
      }
    );
    
    if (response.error) {
      const userError =
        process.env.NODE_ENV === "production"
          ? "Error processing audio."
          : response.error;
      logger.error(
        `${logPrefix} Orchestrator error processing audio for user ${userId}: ${response.error}`
      );
      return NextResponse.json({ error: userError }, { status: 500 });
    }
    
    // Save messages to database
    const userAudioMessage: UserAudioMessage = {
      content: response.transcription || "[Audio Message]",
      timestamp: new Date().toISOString(),
      attachments: [{
        id: uuidv4(),
        type: 'audio',
        url: signedUrl,
        name: originalFilename || 'audio_message.webm'
      }],
      audioUrl: signedUrl,
      isAudioMessage: true
    };

    await saveMessageToDatabase(userAudioMessage, response, userId);

    return NextResponse.json(response);
  } catch (error: any) {
    const userIdSuffix = userId ? userId.substring(0, 8) + "..." : "UNKNOWN";
    logger.error(
      `${logPrefix} Unhandled exception for user ${userIdSuffix}:`,
      error
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    if (uploadPath && supabaseAdminForStorage) { // Ensure supabaseAdminForStorage is initialized
      const finalUploadPath = uploadPath; 
      logger.debug(
        `${logPrefix} Scheduling background cleanup for: ${finalUploadPath}`
      );
      supabaseAdminForStorage.storage
        .from(AUDIO_BUCKET)
        .remove([finalUploadPath])
        .then(({ data, error: removeError }: any) => {
          if (removeError)
            logger.warn(
              `${logPrefix} Failed to clean up ${finalUploadPath}:`,
              removeError
            );
          else
            logger.debug(
              `${logPrefix} Successfully cleaned up ${finalUploadPath}. Items removed: ${data?.length}`
            );
        })
        .catch((err: any) =>
          logger.warn(
            `${logPrefix} Exception during background cleanup of ${finalUploadPath}:`,
            err
          )
        );
    }
  }
}