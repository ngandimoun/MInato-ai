// FILE: lib/providers/tts_service.ts
import OpenAI from "openai";
import { Readable } from "stream";
import { ReadableStream as WebReadableStream } from "stream/web";
import { randomUUID } from "crypto";
import { supabase } from "../supabaseClient";
import { appConfig } from "../config";
import { rawOpenAiClient as openai } from "./llm_clients";
import { TTS_AUDIO_BUCKET } from "../constants";
import { OpenAITtsModel, OpenAITtsVoice } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs/promises'; // For async file operations
import path from 'path';
import os from 'os';

// Configure fluent-ffmpeg to use the static ffmpeg binary
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
} else {
  logger.warn("[TTSService] ffmpeg-static path not found. Post-processing might fail if ffmpeg is not in PATH.");
}


if (typeof window === "undefined") {
  if (!appConfig || !appConfig.llm) {
    logger.error(
      "CRITICAL: appConfig or appConfig.llm is undefined in tts_service. TTS Service may not function."
    );
  } else {
    if (!appConfig.llm.ttsModel) {
      logger.warn("WARN: appConfig.llm.ttsModel is undefined. TTS will use a fallback or fail.");
    }
    if (!appConfig.llm.ttsDefaultVoice) {
      logger.warn("WARN: appConfig.llm.ttsDefaultVoice is undefined. TTS will use a hardcoded fallback or fail.");
    }
  }
}

const TTS_MODEL: OpenAITtsModel = "gpt-4o-mini-tts";
const DEFAULT_VOICE: OpenAITtsVoice = appConfig?.llm?.ttsDefaultVoice || "alloy";

type TTSStorageFormat = "mp3" | "opus" | "aac" | "flac";
type TTSStreamFormat = TTSStorageFormat | "wav" | "pcm";

const DEFAULT_STORAGE_FORMAT: TTSStorageFormat =
  (appConfig?.llm as any)?.ttsDefaultFormat === "opus" ? "opus" :
  (appConfig?.llm as any)?.ttsDefaultFormat === "aac" ? "aac" :
  (appConfig?.llm as any)?.ttsDefaultFormat === "flac" ? "flac" :
  "mp3";

// Enhanced dynamic instructions generator
function generateDynamicTtsInstructions(
  responseText: string,
  intentType?: string | null, // Added intentType for more targeted instructions
  context?: Record<string, any>
): string {
  const lowerResponse = responseText.toLowerCase();
  let baseInstruction = "";

  // Prioritize intentType if available
  if (intentType) {
    switch (intentType) {
      case "questioning":
      case "clarification":
        baseInstruction = "Tone: Curious, Pace: Natural, Intonation Contour: Rising at end";
        break;
      case "celebratory":
      case "happy":
        baseInstruction = "Tone: Excited and joyful, Pace: Slightly faster, Emphasis: Moderate, Pitch: Slightly higher";
        break;
      case "apologetic":
      case "empathy":
      case "concerned":
      case "disappointed":
        baseInstruction = "Tone: Soft and empathetic, Pace: Slower, Pauses: Gentle, Pitch: Slightly lower";
        break;
      case "urgent":
        baseInstruction = "Tone: Firm and direct, Pace: Rapid, Emphasis: Strong";
        break;
      case "instructional":
        baseInstruction = "Tone: Clear and guiding, Pace: Deliberate";
        break;
      case "humorous":
      case "roasting":
        baseInstruction = "Tone: Playful and witty, Pace: Expressive";
        break;
      case "sarcastic":
         baseInstruction = "Tone: Dry with subtle irony, Pace: Natural";
         break;
      case "flirtatious":
      case "intimate":
        baseInstruction = "Tone: Warm and engaging, Pace: Slightly slower, Volume: Softer";
        break;
      case "error":
         baseInstruction = "Tone: Neutral and clear, Pace: Steady";
         break;
      default: // neutral, informative, greeting, farewell, etc.
        baseInstruction = "Tone: Warm and friendly, Pace: Natural, Pitch: Medium";
    }
  } else {
    // Fallback to content-based analysis if no intentType
    if (lowerResponse.includes("congratulations") || lowerResponse.includes("awesome") || lowerResponse.includes("great job"))
      baseInstruction = "Tone: Excited, Pace: Slightly faster, Emphasis: Moderate (20%), Pitch: Slightly higher";
    else if (lowerResponse.includes("sorry to hear that") || lowerResponse.includes("my condolences") || lowerResponse.includes("unfortunately"))
      baseInstruction = "Tone: Soft, Pace: Slower, Pauses: Moderate, Pitch: Slightly lower";
    else if (lowerResponse.includes("i couldn't find") || lowerResponse.includes("error") || lowerResponse.includes("issue"))
      baseInstruction = "Tone: Clear, Pace: Natural, Volume: Normal";
    else if (lowerResponse.includes("let's try this") || lowerResponse.includes("here's the plan") || lowerResponse.includes("first step"))
      baseInstruction = "Tone: Confident, Pace: Natural, Volume: +5%";
    else if (lowerResponse.includes("?"))
      baseInstruction = "Tone: Curious, Pace: Natural, Intonation Contour: Rising at end";
    else {
       baseInstruction = "Tone: Warm and friendly, Pace: Natural, Pitch: Medium"; // General default
    }
  }

  // Add speed adjustments based on text length
  if (responseText.length > 200 && !baseInstruction.toLowerCase().includes("pace:")) {
    baseInstruction += ", Pace: Slightly faster to maintain engagement";
  } else if (responseText.length < 70 && !baseInstruction.toLowerCase().includes("pace:")) {
    baseInstruction += ", Pace: Slightly slower for clarity";
  }
  
  // Ensure the instruction is not empty
  return baseInstruction.trim() || "Speak naturally and clearly.";
}

export class TTSService {
  private async postProcessAudio(inputBuffer: Buffer, targetFormat: TTSStorageFormat): Promise<Buffer> {
    const logPrefix = "[TTSService PostProcess]";
    if (!(appConfig as any).enableTtsPostProcessing) {
      logger.debug(`${logPrefix} Post-processing disabled by config.`);
      return inputBuffer;
    }

    logger.info(`${logPrefix} Starting post-processing. Target format: ${targetFormat}`);
    const tempInputPath = path.join(os.tmpdir(), `tts_in_${randomUUID()}.wav`); // Assume input from OpenAI is WAV for processing
    const tempOutputPath = path.join(os.tmpdir(), `tts_out_${randomUUID()}.${targetFormat}`);

    await fs.writeFile(tempInputPath, inputBuffer);

    return new Promise<Buffer>((resolve, reject) => {
      let command = ffmpeg(tempInputPath)
        .audioFilters([
          // 1. Normalization (e.g., to -1 dBFS using loudnorm)
          // More advanced: two-pass loudnorm. Simpler: asetpts for speed, volume for gain.
          // Using asetnsamples to pad and then loudnorm might be more robust.
          // For simplicity, let's use a basic volume adjustment and then compression.
          // Or, aim for a target LUFS if `ffmpeg-normalize` or similar concepts are available.
          // Using `loudnorm` filter if available or simpler `volume`
          // This is a simple normalization approach, 'loudnorm' is more advanced but complex for basic ffmpeg.
          // We'll aim for a peak normalization to -1dB and then compress.
          // For a simpler approach, we might just apply a compressor.
          // Example: Normalize peak to -1dB. Max peak is 0dB.
           { filter: 'volume', options: 'normalize=true:peak=-1dB' }, // Basic peak normalization

          // 2. Dynamic Range Compression (Light)
          // Example: threshold -18dB, ratio 2:1, attack 20ms, release 250ms
          // FFmpeg's `acompressor` or `compand` can be used. `compand` is more flexible.
          // E.g., compand=attacks=0:points=-80/-900|-45/-15|-27/-9|-20/-7|-2/-2:gain=-6
          // This is a very generic compressor, actual values depend on desired effect.
          { filter: 'acompressor', options: 'threshold=0.125:ratio=2:attack=20:release=250' } // Threshold 0.125 for -18dB if input is 16-bit
        ])
        .toFormat(targetFormat) // Convert to final desired storage format
        .outputOptions([
          '-ar 24000', // OpenAI gpt-4o-mini-tts outputs at 24kHz
          '-ac 1', // Mono
          '-b:a 128k' // Good quality for mp3/aac
        ]);
      
      if (targetFormat === 'opus') {
        command = command.audioCodec('libopus').outputOptions('-b:a 64k'); // Opus typically lower bitrate
      } else if (targetFormat === 'aac') {
        command = command.audioCodec('aac'); // Let ffmpeg choose best AAC encoder
      } else if (targetFormat === 'flac') {
        command = command.audioCodec('flac');
      }


      command
        .on("start", (cmdLine) => logger.debug(`${logPrefix} ffmpeg command: ${cmdLine}`))
        .on("error", (err: Error) => {
          logger.error(`${logPrefix} ffmpeg error:`, err.message);
          fs.unlink(tempInputPath).catch(e => logger.warn("Failed to delete temp input", e));
          fs.unlink(tempOutputPath).catch(e => logger.warn("Failed to delete temp output", e));
          reject(new Error(`Audio post-processing failed: ${err.message}`));
        })
        .on("end", async () => {
          logger.info(`${logPrefix} ffmpeg processing finished.`);
          try {
            const processedBuffer = await fs.readFile(tempOutputPath);
            await fs.unlink(tempInputPath);
            await fs.unlink(tempOutputPath);
            resolve(processedBuffer);
          } catch (fileError: any) {
            logger.error(`${logPrefix} Error reading/deleting temp processed file:`, fileError.message);
            reject(fileError);
          }
        })
        .save(tempOutputPath);
    });
  }


  async generateAndStoreSpeech(
    text: string,
    userId: string,
    voice: OpenAITtsVoice = DEFAULT_VOICE,
    instructionsInput?: string | null,
    storageFormat: TTSStorageFormat = DEFAULT_STORAGE_FORMAT, // Final storage format
    speed: number = 1.0
  ): Promise<{ url: string | null; error?: string }> {
    const logPrefix = "[TTSService Store]";
    if (!openai) { /* ... */ return { url: null, error: "TTS service not configured (OpenAI client)." }; }
    if (!appConfig?.llm?.ttsModel || !appConfig?.llm?.ttsDefaultVoice) { /* ... */ return { url: null, error: "TTS service not fully configured (model/voice)." }; }
    if (!text?.trim()) return { url: null, error: "TTS input text cannot be empty." };
    if (!userId) return { url: null, error: "User ID is required for storing TTS audio." };
    if (!supabase) { /* ... */ return { url: null, error: "Storage service not configured (Supabase client)." }; }

    const ttsModelToUse = TTS_MODEL;
    const defaultVoiceToUse = appConfig.llm.ttsDefaultVoice;
    const selectedVoice = (appConfig.llm.ttsVoices as ReadonlyArray<string>).includes(voice) ? voice : defaultVoiceToUse;
    if (voice !== selectedVoice) logger.warn(`${logPrefix} Unsupported voice '${voice}', using default '${selectedVoice}'.`);

    let effectiveSpeed: number | undefined = undefined;
    // speed param only for tts-1/tts-1-hd not gpt-4o-mini-tts
    if (ttsModelToUse !== TTS_MODEL && ttsModelToUse !== "gpt-4o-mini-tts") {
        effectiveSpeed = Math.max(0.25, Math.min(speed, 4.0));
    } else if (speed !== 1.0 && ttsModelToUse === "gpt-4o-mini-tts") {
      logger.warn(`${logPrefix} Speed parameter (${speed}) is ignored by gpt-4o-mini-tts. Control speed via 'instructions'.`);
    }


    const intentType = (appConfig as any).currentIntentTypeForTTS || null; // Assuming Orchestrator might set this globally for the turn
    const effectiveInstructions = instructionsInput?.trim() || generateDynamicTtsInstructions(text, intentType);
    logger.debug(`${logPrefix} Using TTS instructions: "${effectiveInstructions}" for voice ${selectedVoice}`);

    // Request lossless format from OpenAI if post-processing is enabled
    const openAiRequestFormat: TTSStreamFormat = (appConfig as any).enableTtsPostProcessing ? "wav" : storageFormat;

    try {
      logger.info(`${logPrefix} Generating TTS (Model:${ttsModelToUse}, Voice:${selectedVoice}, OpenAI_Format:${openAiRequestFormat}${effectiveSpeed ? `, Speed:${effectiveSpeed}` : ""}) User:${userId.substring(0, 8)}...`);

      const ttsPayload: OpenAI.Audio.SpeechCreateParams = {
        model: ttsModelToUse, voice: selectedVoice, input: String(text).trim().substring(0, 4096),
        response_format: openAiRequestFormat, instructions: effectiveInstructions,
        ...(effectiveSpeed && ttsModelToUse !== TTS_MODEL && ttsModelToUse !== "gpt-4o-mini-tts" && { speed: effectiveSpeed }),
      };

      const startApi = Date.now();
      const response = await openai.audio.speech.create(ttsPayload);
      const apiDuration = Date.now() - startApi;
      logger.debug(`${logPrefix} OpenAI TTS API call successful (${apiDuration}ms).`);
      
      let audioBuffer = Buffer.from(await response.arrayBuffer() as ArrayBuffer) as Buffer;
      if (audioBuffer.length === 0) throw new Error("TTS API returned an empty audio buffer.");
      logger.debug(`${logPrefix} Initial audio buffer created (${audioBuffer.length} bytes, format: ${openAiRequestFormat}).`);

      // Post-process if enabled and input was WAV
      if ((appConfig as any).enableTtsPostProcessing && openAiRequestFormat === "wav") {
        const postProcessStart = Date.now();
        try {
          audioBuffer = await this.postProcessAudio(audioBuffer, storageFormat);
          logger.info(`${logPrefix} Audio post-processing complete (${Date.now() - postProcessStart}ms). Final size: ${audioBuffer.length} bytes.`);
        } catch (postProcessError: any) {
          logger.error(`${logPrefix} Post-processing failed: ${postProcessError.message}. Storing raw audio instead.`);
          // Fallback: store the raw audio (might be WAV if processing failed)
        }
      }

      const fileName = `${randomUUID()}.${storageFormat}`; // Use final storageFormat for extension
      const filePath = `tts/${userId}/${fileName}`;
      const contentType = `audio/${storageFormat === "mp3" ? "mpeg" : storageFormat}`;
      logger.debug(`${logPrefix} Uploading audio to Supabase: ${TTS_AUDIO_BUCKET}/${filePath} (Type: ${contentType})`);

      const startUpload = Date.now();
      const { error: uploadError } = await supabase.storage.from(TTS_AUDIO_BUCKET).upload(filePath, audioBuffer, { contentType: contentType, upsert: false });
      const uploadDuration = Date.now() - startUpload;
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
      logger.debug(`${logPrefix} Upload successful (${uploadDuration}ms). Retrieving public URL...`);

      const { data: urlData } = supabase.storage.from(TTS_AUDIO_BUCKET).getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error("Failed to generate audio URL after upload.");

      logger.info(`${logPrefix} TTS audio stored successfully. URL: ${publicUrl.substring(0, 100)}...`);
      return { url: publicUrl, error: undefined };
    } catch (error: any) {
      let errorMessage = "TTS generation/storage failed.";
      if (error instanceof OpenAI.APIError) { /* ... */ errorMessage = `OpenAI TTS API Error (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`; }
      else if (error instanceof Error) { errorMessage = error.message; }
      logger.error(`${logPrefix} Error during TTS process for User ${userId.substring(0, 8)}:`, errorMessage, error);
      return { url: null, error: errorMessage };
    }
  }

  async generateSpeechStream(
    text: string,
    voice: OpenAITtsVoice = DEFAULT_VOICE,
    instructionsInput?: string | null,
    format: TTSStreamFormat = "mp3", // For streaming, PCM or Opus are good low-latency options
    speed: number = 1.0
  ): Promise<{ stream: Readable | null; error?: string }> {
    const logPrefix = "[TTSService Stream]";
    if (!openai) { /* ... */ return { stream: null, error: "TTS service not configured (OpenAI client)." }; }
    if (!appConfig?.llm?.ttsModel || !appConfig?.llm?.ttsDefaultVoice) { /* ... */ return { stream: null, error: "TTS service not fully configured (model/voice)." }; }
    if (!text?.trim()) return { stream: null, error: "TTS stream input text cannot be empty." };

    const ttsModelToUse = TTS_MODEL;
    const defaultVoiceToUse = appConfig.llm.ttsDefaultVoice;
    const selectedVoice = (appConfig.llm.ttsVoices as ReadonlyArray<string>).includes(voice) ? voice : defaultVoiceToUse;
    if (voice !== selectedVoice) logger.warn(`${logPrefix} Unsupported voice '${voice}', using default '${selectedVoice}'.`);

    let effectiveSpeed: number | undefined = undefined;
     if (ttsModelToUse !== TTS_MODEL && ttsModelToUse !== "gpt-4o-mini-tts") {
        effectiveSpeed = Math.max(0.25, Math.min(speed, 4.0));
    } else if (speed !== 1.0 && ttsModelToUse === "gpt-4o-mini-tts") {
      logger.warn(`${logPrefix} Speed parameter (${speed}) is ignored by gpt-4o-mini-tts. Control speed via 'instructions'.`);
    }

    const validStreamFormats: TTSStreamFormat[] = ["mp3", "opus", "aac", "flac", "wav", "pcm"];
    let streamFormat = format;
    if (!validStreamFormats.includes(streamFormat)) {
      logger.warn(`${logPrefix} Invalid stream format '${streamFormat}', defaulting to pcm for low latency.`);
      streamFormat = "pcm"; // Default to PCM for lowest latency streaming
    }
    if (streamFormat === "wav" || streamFormat === "pcm") logger.info(`${logPrefix} Using low-latency stream format: ${streamFormat}`);

    const intentType = (appConfig as any).currentIntentTypeForTTS || null;
    const effectiveInstructions = instructionsInput?.trim() || generateDynamicTtsInstructions(text, intentType);
    logger.debug(`${logPrefix} Using TTS instructions: "${effectiveInstructions}" for voice ${selectedVoice}`);

    try {
      logger.info(`${logPrefix} Generating TTS stream (Model:${ttsModelToUse}, Voice:${selectedVoice}, Format:${streamFormat}${effectiveSpeed ? `, Speed:${effectiveSpeed}` : ""})... Text length: ${text.length}`);
      const ttsPayload: OpenAI.Audio.SpeechCreateParams = {
        model: ttsModelToUse, voice: selectedVoice, input: String(text).trim().substring(0, 4096),
        response_format: streamFormat, instructions: effectiveInstructions,
        ...(effectiveSpeed && ttsModelToUse !== TTS_MODEL && ttsModelToUse !== "gpt-4o-mini-tts" && { speed: effectiveSpeed }),
      };

      const response = await openai.audio.speech.create(ttsPayload);

      if (!response.body || !(response.body instanceof WebReadableStream)) { /* ... error handling ... */ throw new Error(`TTS API did not return a valid stream body (Status: ${response.status}).`); }

      const nodeStream = Readable.fromWeb(response.body as WebReadableStream<Uint8Array>);
      // Post-processing is NOT applied to streams in this example due to complexity and latency.
      // If needed, it would require piping the stream through ffmpeg, which is non-trivial for live streams.

      logger.info(`${logPrefix} TTS stream initiated successfully.`);
      return { stream: nodeStream, error: undefined };
    } catch (error: any) {
      let errorMessage = "TTS stream generation failed.";
      if (error instanceof OpenAI.APIError) { /* ... */ errorMessage = `OpenAI TTS Stream API Error (${error.status || "N/A"} ${error.code || "N/A"}): ${error.message}`; }
      else if (error instanceof Error) { errorMessage = error.message; }
      logger.error(`${logPrefix} Error generating TTS stream:`, errorMessage, error);
      return { stream: null, error: errorMessage };
    }
  }
}