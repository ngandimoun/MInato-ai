// FILE: lib/providers/tts_service.ts
import OpenAI from "openai";
import { Readable } from "stream";
import { ReadableStream as WebReadableStream } from "stream/web"; // For Node.js 18+
import { randomUUID } from "crypto";
import { supabase } from "../supabaseClient";
import { appConfig } from "../config"; // appConfig est la config unifiée
import { rawOpenAiClient as openai } from "./llm_clients"; // Utilise le client OpenAI partagé
import { TTS_AUDIO_BUCKET } from "../constants";
import { OpenAITtsModel, OpenAITtsVoice } from "@/lib/types/index";
import { logger } from "../../memory-framework/config"; // Utilise le logger unifié

// --- Vérification de la configuration au démarrage (côté serveur) ---
if (typeof window === "undefined") {
  if (!appConfig || !appConfig.llm) {
    logger.error(
      "CRITICAL: appConfig or appConfig.llm is undefined in tts_service. TTS Service may not function."
    );
    // En production, tu pourrais vouloir lever une erreur ici pour arrêter le démarrage
    // throw new Error("TTS Service configuration is missing.");
  } else {
    if (!appConfig.llm.ttsModel) {
      logger.warn("WARN: appConfig.llm.ttsModel is undefined. TTS will use a fallback or fail.");
    }
    if (!appConfig.llm.ttsDefaultVoice) {
      logger.warn("WARN: appConfig.llm.ttsDefaultVoice is undefined. TTS will use a hardcoded fallback or fail.");
    }
  }
}

// Utiliser appConfig.llm pour accéder aux configurations TTS
// Fournir des valeurs par défaut robustes si la configuration est manquante pour éviter les erreurs au démarrage,
// bien que les vérifications ci-dessus devraient signaler les problèmes.
// Use the correct TTS model from config
const TTS_MODEL: OpenAITtsModel = "gpt-4o-mini-tts";
const DEFAULT_VOICE: OpenAITtsVoice = appConfig?.llm?.ttsDefaultVoice || "alloy"; // Fallback au cas où

// Supported formats for gpt-4o-mini-tts (and tts-1/hd)
type TTSStorageFormat = "mp3" | "opus" | "aac" | "flac";
type TTSStreamFormat = TTSStorageFormat | "wav" | "pcm";

// Lire ttsDefaultFormat depuis appConfig.llm si disponible, sinon utiliser 'mp3'
const DEFAULT_STORAGE_FORMAT: TTSStorageFormat =
  (appConfig?.llm as any)?.ttsDefaultFormat === "opus" ? "opus" : // Exemple si tu ajoutes ttsDefaultFormat à llm
  (appConfig?.llm as any)?.ttsDefaultFormat === "aac" ? "aac" :
  (appConfig?.llm as any)?.ttsDefaultFormat === "flac" ? "flac" :
  "mp3";


// Internal generator (fallback if no instructions provided)
function generateDynamicTtsInstructions(
  responseText: string,
  context?: Record<string, any> // context n'est pas utilisé ici actuellement
): string {
  const lowerResponse = responseText.toLowerCase();
  let baseInstruction = "Tone: Warm, Pace: Natural, Pitch: Medium"; // Default
  if (
    lowerResponse.includes("congratulations") ||
    lowerResponse.includes("awesome") ||
    lowerResponse.includes("great job")
  )
    baseInstruction =
      "Tone: Excited, Pace: Slightly faster, Emphasis: Moderate (20%), Pitch: Slightly higher";
  else if (
    lowerResponse.includes("sorry to hear that") ||
    lowerResponse.includes("my condolences") ||
    lowerResponse.includes("unfortunately")
  )
    baseInstruction =
      "Tone: Soft, Pace: Slower, Pauses: Moderate, Pitch: Slightly lower";
  else if (
    lowerResponse.includes("i couldn't find") ||
    lowerResponse.includes("error") ||
    lowerResponse.includes("issue")
  )
    baseInstruction = "Tone: Clear, Pace: Natural, Volume: Normal";
  else if (
    lowerResponse.includes("let's try this") ||
    lowerResponse.includes("here's the plan") ||
    lowerResponse.includes("first step")
  )
    baseInstruction = "Tone: Confident, Pace: Natural, Volume: +5%";
  else if (lowerResponse.includes("?"))
    baseInstruction =
      "Tone: Curious, Pace: Natural, Intonation Contour: Rising at end";

  if (responseText.length < 50 && responseText.includes("!")) {
    if (!baseInstruction.includes("Emphasis:")) {
      baseInstruction += ", Emphasis: Moderate (20%)";
    }
  } else if (responseText.length > 300) {
    if (!baseInstruction.includes("Pace:")) {
      baseInstruction += ", Pace: Natural";
    }
  }
  return baseInstruction;
}

export class TTSService {
  async generateAndStoreSpeech(
    text: string,
    userId: string,
    voice: OpenAITtsVoice = DEFAULT_VOICE,
    instructionsInput?: string | null,
    format: TTSStorageFormat = DEFAULT_STORAGE_FORMAT,
    speed: number = 1.0
  ): Promise<{ url: string | null; error?: string }> {
    const logPrefix = "[TTSService Store]";
    if (!openai) {
      logger.error(`${logPrefix} OpenAI client unavailable.`);
      return { url: null, error: "TTS service not configured (OpenAI client)." };
    }
     if (!appConfig?.llm?.ttsModel || !appConfig?.llm?.ttsDefaultVoice) { // Vérification supplémentaire
        logger.error(`${logPrefix} TTS model or default voice not configured in appConfig.llm.`);
        return { url: null, error: "TTS service not fully configured (model/voice)." };
    }
    if (!text?.trim())
      return { url: null, error: "TTS input text cannot be empty." };
    if (!userId)
      return { url: null, error: "User ID is required for storing TTS audio." };
    if (!supabase) {
      logger.error(`${logPrefix} Supabase client unavailable.`);
      return { url: null, error: "Storage service not configured (Supabase client)." };
    }

    const ttsModelToUse = TTS_MODEL;
    const defaultVoiceToUse = appConfig.llm.ttsDefaultVoice;

    const selectedVoice = (
      appConfig.llm.ttsVoices as ReadonlyArray<string> // Accéder via appConfig.llm
    ).includes(voice)
      ? voice
      : defaultVoiceToUse;
    if (voice !== selectedVoice)
      logger.warn(
        `${logPrefix} Unsupported voice '${voice}', using default '${selectedVoice}'.`
      );

    let effectiveSpeed: number | undefined = undefined;
    if (ttsModelToUse !== TTS_MODEL) {
      effectiveSpeed = Math.max(0.25, Math.min(speed, 4.0));
      if (speed !== effectiveSpeed)
        logger.warn(
          `${logPrefix} Speed ${speed} for ${ttsModelToUse} out of range [0.25, 4.0], clamped to ${effectiveSpeed}.`
        );
    } else if (speed !== 1.0) {
      logger.warn(
        `${logPrefix} Speed parameter (${speed}) provided but is NOT supported by ${ttsModelToUse} and will be ignored by the API.`
      );
    }

    const effectiveInstructions =
      instructionsInput?.trim() || generateDynamicTtsInstructions(text);
    logger.debug(
      `${logPrefix} Using TTS instructions: "${effectiveInstructions}" for voice ${selectedVoice}`
    );

    try {
      logger.info(
        `${logPrefix} Generating TTS (Model:${ttsModelToUse}, Voice:${selectedVoice}, Format:${format}${
          effectiveSpeed && ttsModelToUse !== TTS_MODEL
            ? `, Speed:${effectiveSpeed}`
            : ""
        }) User:${userId.substring(0, 8)}...`
      );

      const ttsPayload: OpenAI.Audio.SpeechCreateParams = {
        model: ttsModelToUse,
        voice: selectedVoice,
        input: String(text).trim().substring(0, 4096),
        response_format: format,
        instructions: effectiveInstructions,
        ...(ttsModelToUse !== TTS_MODEL &&
          effectiveSpeed &&
          effectiveSpeed !== 1.0 && { speed: effectiveSpeed }),
      };

      const startApi = Date.now();
      const response = await openai.audio.speech.create(ttsPayload);
      const apiDuration = Date.now() - startApi;
      logger.debug(
        `${logPrefix} OpenAI TTS API call successful (${apiDuration}ms).`
      );
      const audioBuffer = Buffer.from(await response.arrayBuffer());
      if (audioBuffer.length === 0)
        throw new Error("TTS API returned an empty audio buffer.");
      logger.debug(
        `${logPrefix} Audio buffer created (${audioBuffer.length} bytes).`
      );

      const fileName = `${randomUUID()}.${format}`;
      const filePath = `tts/${userId}/${fileName}`;
      const contentType = `audio/${format === "mp3" ? "mpeg" : format}`;
      logger.debug(
        `${logPrefix} Uploading audio to Supabase: ${TTS_AUDIO_BUCKET}/${filePath} (Type: ${contentType})`
      );

      const startUpload = Date.now();
      const { error: uploadError } = await supabase.storage
        .from(TTS_AUDIO_BUCKET)
        .upload(filePath, audioBuffer, {
          contentType: contentType,
          upsert: false,
        });
      const uploadDuration = Date.now() - startUpload;
      if (uploadError) {
        logger.error(
          `${logPrefix} Supabase storage upload failed for ${filePath}:`,
          uploadError
        );
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      logger.debug(
        `${logPrefix} Upload successful (${uploadDuration}ms). Retrieving public URL...`
      );

      const { data: urlData } = supabase.storage
        .from(TTS_AUDIO_BUCKET)
        .getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        logger.error(
          `${logPrefix} Failed to get public URL for ${filePath}. Check bucket permissions & existence.`
        );
        return {
          url: null,
          error: "Failed to generate audio URL after upload.",
        };
      }

      logger.info(
        `${logPrefix} TTS audio stored successfully. URL: ${publicUrl.substring(
          0,
          100
        )}...`
      );
      return { url: publicUrl, error: undefined };
    } catch (error: any) {
      let errorMessage = "TTS generation/storage failed.";
      if (error instanceof OpenAI.APIError) {
        errorMessage = `OpenAI TTS API Error (${error.status || "N/A"} ${
          error.code || "N/A"
        }): ${error.message}`;
        logger.error(
          `${logPrefix} OpenAI API Error details:`,
          JSON.stringify(error.error || error)
        );
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      logger.error(
        `${logPrefix} Error during TTS process for User ${userId.substring(
          0,
          8
        )}:`,
        errorMessage,
        error
      );
      return { url: null, error: errorMessage };
    }
  }

  async generateSpeechStream(
    text: string,
    voice: OpenAITtsVoice = DEFAULT_VOICE, // Utilise la constante corrigée
    instructionsInput?: string | null,
    format: TTSStreamFormat = "mp3",
    speed: number = 1.0
  ): Promise<{ stream: Readable | null; error?: string }> {
    const logPrefix = "[TTSService Stream]";
    if (!openai) {
      logger.error(`${logPrefix} OpenAI client unavailable.`);
      return { stream: null, error: "TTS service not configured (OpenAI client)." };
    }
     if (!appConfig?.llm?.ttsModel || !appConfig?.llm?.ttsDefaultVoice) { // Vérification supplémentaire
        logger.error(`${logPrefix} TTS model or default voice not configured in appConfig.llm.`);
        return { stream: null, error: "TTS service not fully configured (model/voice)." };
    }
    if (!text?.trim())
      return { stream: null, error: "TTS stream input text cannot be empty." };

    const ttsModelToUse = TTS_MODEL;
    const defaultVoiceToUse = appConfig.llm.ttsDefaultVoice;

    const selectedVoice = (
      appConfig.llm.ttsVoices as ReadonlyArray<string>
    ).includes(voice)
      ? voice
      : defaultVoiceToUse;
    if (voice !== selectedVoice)
      logger.warn(
        `${logPrefix} Unsupported voice '${voice}', using default '${selectedVoice}'.`
      );

    let effectiveSpeed: number | undefined = undefined;
    if (ttsModelToUse !== TTS_MODEL) {
      effectiveSpeed = Math.max(0.25, Math.min(speed, 4.0));
      if (speed !== effectiveSpeed)
        logger.warn(
          `${logPrefix} Speed ${speed} for ${ttsModelToUse} out of range, clamped to ${effectiveSpeed}.`
        );
    } else if (speed !== 1.0) {
      logger.warn(
        `${logPrefix} Speed param (${speed}) ignored for ${ttsModelToUse}.`
      );
    }

    const validStreamFormats: TTSStreamFormat[] = [
      "mp3", "opus", "aac", "flac", "wav", "pcm",
    ];
    if (!validStreamFormats.includes(format)) {
      logger.warn(
        `${logPrefix} Invalid stream format '${format}', defaulting to mp3.`
      );
      format = "mp3";
    }
    if (format === "wav" || format === "pcm") {
      logger.info(`${logPrefix} Using low-latency format: ${format}`);
    }

    const effectiveInstructions =
      instructionsInput?.trim() || generateDynamicTtsInstructions(text);
    logger.debug(
      `${logPrefix} Using TTS instructions: "${effectiveInstructions}" for voice ${selectedVoice}`
    );

    try {
      logger.info(
        `${logPrefix} Generating TTS stream (Model:${ttsModelToUse}, Voice:${selectedVoice}, Format:${format}${
          effectiveSpeed && ttsModelToUse !== TTS_MODEL
            ? `, Speed:${effectiveSpeed}`
            : ""
        })... Text length: ${text.length}`
      );
      const ttsPayload: OpenAI.Audio.SpeechCreateParams = {
        model: ttsModelToUse,
        voice: selectedVoice,
        input: String(text).trim().substring(0, 4096),
        response_format: format,
        instructions: effectiveInstructions,
        ...(ttsModelToUse !== TTS_MODEL &&
          effectiveSpeed &&
          effectiveSpeed !== 1.0 && { speed: effectiveSpeed }),
      };

      const response = await openai.audio.speech.create(ttsPayload);

      if (!response.body || !(response.body instanceof WebReadableStream)) {
        logger.error(
          `${logPrefix} TTS API did not return a valid stream body. Status: ${response.status}`
        );
        const errorText = await response
          .text()
          .catch(() => "Unknown error reading response body");
        logger.error(
          `${logPrefix} Error response body: ${errorText.substring(0, 500)}`
        );
        throw new Error(
          `TTS API did not return a valid stream body (Status: ${response.status}).`
        );
      }

      const nodeStream = Readable.fromWeb(
        response.body as WebReadableStream<Uint8Array>
      );

      logger.info(`${logPrefix} TTS stream initiated successfully.`);
      return { stream: nodeStream, error: undefined };
    } catch (error: any) {
      let errorMessage = "TTS stream generation failed.";
      if (error instanceof OpenAI.APIError) {
        errorMessage = `OpenAI TTS Stream API Error (${error.status || "N/A"} ${
          error.code || "N/A"
        }): ${error.message}`;
        logger.error(
          `${logPrefix} OpenAI API Error details:`,
          JSON.stringify(error.error || error)
        );
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      logger.error(
        `${logPrefix} Error generating TTS stream:`,
        errorMessage,
        error
      );
      return { stream: null, error: errorMessage };
    }
  }
}