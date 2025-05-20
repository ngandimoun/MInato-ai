// FILE: app/api/audio/route.ts
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Orchestrator } from "@/lib/core/orchestrator";
import { ChatMessage } from "@/lib/types/index";
import { checkRateLimit } from "@/lib/rate-limiter";
import {
  RATE_LIMIT_ID_AUDIO_INPUT,
  MEDIA_UPLOAD_BUCKET, // Changed to generic media bucket
  MAX_AUDIO_SIZE_BYTES,
  ALLOWED_AUDIO_TYPES,
  SIGNED_URL_EXPIRY_SECONDS,
} from "@/lib/constants";
import { logger } from "../../../memory-framework/config";
import { randomUUID } from "crypto";
import { appConfig } from "@/lib/config";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
// import { supabaseAdmin } from "@/lib/supabaseClient"; // Use getSupabaseAdminClient instead

let orchestratorInstance: Orchestrator | null = null;

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
        logger.warn(`${logPrefix} Auth] No active Supabase session found.`);
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
      const audioFile = formData.get("audio");
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
      if (!audioFile || !(audioFile instanceof Blob))
        return NextResponse.json(
          { error: 'Missing or invalid "audio" file part' },
          { status: 400 }
        );
      if (audioFile.size > MAX_AUDIO_SIZE_BYTES)
        return NextResponse.json(
          {
            error: `Audio file too large (max ${
              MAX_AUDIO_SIZE_BYTES / (1024 * 1024)
            }MB)`,
          },
          { status: 413 }
        );
      const isAllowedAudioType =
        ALLOWED_AUDIO_TYPES.includes(audioFile.type);
      if (!isAllowedAudioType)
        return NextResponse.json(
          {
            error: `Unsupported audio type: ${
              audioFile.type
            }. Allowed: ${ALLOWED_AUDIO_TYPES.join(", ")}. Please upload audio in mp3, wav, m4a, or other OpenAI-supported format.`,
          },
          { status: 415 }
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
      logger.error("[API Audio] supabaseAdmin or supabaseAdmin.storage is undefined!");
      return NextResponse.json({ error: "Storage admin client not available." }, { status: 500 });
    }
    const fileExt =
      originalFilename?.split(".").pop()?.toLowerCase() ||
      detectedMimeType?.split("/")[1] ||
      "bin";
    const uploadFileName = `${randomUUID()}.${fileExt}`;
    uploadPath = `uploads/audio/${userId}/${uploadFileName}`; 

    logger.debug(
      `${logPrefix} Uploading audio to Supabase path: ${uploadPath}`
    );
    const { error: uploadError } = await supabaseAdminForStorage.storage
      .from(MEDIA_UPLOAD_BUCKET)
      .upload(uploadPath, audioBuffer, {
        contentType: detectedMimeType!,
        upsert: false,
      });
    if (uploadError) {
      logger.error(
        `${logPrefix} Supabase upload error for user ${userId.substring(0, 8)}: ${uploadError.message}`,
        uploadError
      );
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }
    logger.debug(
      `${logPrefix} [UPLOAD] Audio uploaded to Supabase path: ${uploadPath}, size=${audioBuffer.length} bytes, type=${detectedMimeType}`
    );

    const { data: urlData, error: signError } = await supabaseAdminForStorage.storage
      .from(MEDIA_UPLOAD_BUCKET)
      .createSignedUrl(uploadPath, SIGNED_URL_EXPIRY_SECONDS);
    if (signError || !urlData?.signedUrl) {
      logger.error(
        `${logPrefix} Failed to create signed URL for user ${userId.substring(0, 8)}: ${signError?.message || "Unknown error"}`
      );
      throw new Error(
        `Failed to create signed URL: ${signError?.message || "Unknown error"}`
      );
    }
    const signedUrl = urlData.signedUrl;
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
      `${logPrefix} [ORCH] Calling orchestrator.processAudioMessage with: userId=${userId}, signedUrl=${signedUrl.substring(0,50)}..., size=${audioBuffer.length} bytes, type=${detectedMimeType}`
    );
    const response = await orchestrator.processAudioMessage(
      userId,
      signedUrl,
      history,
      sessionId,
      context
    );

    if (response.error) {
      const userError =
        process.env.NODE_ENV === "production"
          ? "Error processing audio."
          : response.error;
      logger.error(
        `[API Audio] Orchestrator error processing audio for user ${userId}: ${response.error}`
      );
      return NextResponse.json({ error: userError }, { status: 500 });
    }
    
    return NextResponse.json(response);
  } catch (error: any) {
    const userIdSuffix = userId ? userId.substring(0, 8) + "..." : "UNKNOWN";
    logger.error(
      `[API Audio] Unhandled exception for user ${userIdSuffix}:`,
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
        .from(MEDIA_UPLOAD_BUCKET)
        .remove([finalUploadPath])
        .then(({ data, error: removeError }: any) => {
          if (removeError)
            logger.warn(
              `[API Audio] Failed to clean up ${finalUploadPath}:`,
              removeError
            );
          else
            logger.debug(
              `[API Audio] Successfully cleaned up ${finalUploadPath}. Items removed: ${data?.length}`
            );
        })
        .catch((err: any) =>
          logger.warn(
            `[API Audio] Exception during background cleanup of ${finalUploadPath}:`,
            err
          )
        );
    }
  }
}
