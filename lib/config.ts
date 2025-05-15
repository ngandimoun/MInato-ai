// FILE: lib/config.ts
// This file now re-exports the unified configuration from the memory framework.
import {
  config as frameworkConfigUnified, // Use a more descriptive alias
  logger as frameworkLoggerUnified,
  injectPromptVariables as frameworkInjectPromptVariablesUnified
} from "@/memory-framework/config/index"; // Ensure this path is correct

// Helper to log missing envs
function getEnvVar(name: string, fallback: string) {
  const value = process.env[name];
  if (!value) {
    if (typeof window === "undefined") {
      frameworkLoggerUnified.warn(`[config] Env var ${name} is missing, using fallback: ${fallback}`);
    }
    return fallback;
  }
  return value;
}

export const appConfig = {
  ...frameworkConfigUnified, // Merge in memory-framework config
  openai: {
    apiKey: getEnvVar("OPENAI_API_KEY", ""),
    ttsDefaultVoice: getEnvVar("OPENAI_TTS_VOICE", "nova"),
    realtimeDefaultVoice: getEnvVar("OPENAI_REALTIME_VOICE", "verse"),
    complexModel: getEnvVar("LLM_COMPLEX_MODEL", "gpt-4.1-2025-04-14"),
    balancedModel: getEnvVar("LLM_BALANCED_MODEL", "gpt-4.1-mini-2025-04-14"),
    fastModel: getEnvVar("LLM_FAST_MODEL", "gpt-4.1-nano-2025-04-14"),
    developerModel: getEnvVar("LLM_DEVELOPER_MODEL", "o3-mini-2025-01-31"),
    chatModel: getEnvVar("LLM_RESPONSE_TOOL_MODEL", "gpt-4.1-mini-2025-04-14"),
    planningModel: getEnvVar("LLM_PLANNING_MODEL", "o4-mini-2025-04-16"),
    visionModel: getEnvVar("LLM_VISION_MODEL", "gpt-4.1-mini-2025-04-14"),
    extractionModel: getEnvVar("LLM_EXTRACTION_MODEL", "gpt-4.1-nano-2025-04-14"),
    text: getEnvVar("LLM_TEXT_MODEL", "gpt-4.1-mini-2025-04-14"),
    planning: getEnvVar("LLM_PLANNING_MODEL", "o4-mini-2025-04-16"),
    vision: getEnvVar("LLM_VISION_MODEL", "gpt-4.1-mini-2025-04-14"),
    extraction: getEnvVar("LLM_EXTRACTION_MODEL", "gpt-4.1-nano-2025-04-14"),
    embedderModel: getEnvVar("LLM_EMBEDDER_MODEL", "text-embedding-3-small"),
    ttsModel: getEnvVar("LLM_TTS_MODEL", "gpt-4o-mini-tts"),
    sttModel: getEnvVar("LLM_STT_MODEL", "gpt-4o-mini-transcribe"),
    tts: getEnvVar("LLM_TTS_MODEL", "gpt-4o-mini-tts"),
    stt: getEnvVar("LLM_STT_MODEL", "gpt-4o-mini-transcribe"),
    realtimeModel: getEnvVar("LLM_REALTIME_MODEL", "gpt-4o-mini-realtime-preview-2024-12-17"),
    ttsVoiceDefault: getEnvVar("OPENAI_TTS_VOICE", "nova"),
    ttsVoices: [
      "nova", "alloy", "echo", "fable", "onyx", "shimmer", "ash", "ballad", "coral", "sage", "verse"
    ],
    realtimeVoices: [
      "nova", "alloy", "echo", "fable", "onyx", "shimmer", "ash", "ballad", "coral", "sage", "verse"
    ] as const,
    realtimeVadConfig: {
      type: "server_vad",
      threshold: 0.5,
      silence_duration_ms: 800,
      prefix_padding_ms: 200,
    },
    enableVision: true,
    visionDetail: "high",
    maxTokens: Number(getEnvVar("GENERATION_MAX_TOKENS", "1536")),
    maxVisionTokens: Number(getEnvVar("MAX_VISION_TOKENS", "2048")),
    mediaUploadBucket: getEnvVar("MEDIA_UPLOAD_BUCKET", "images"),
    embeddingDims: Number(getEnvVar("LLM_EMBEDDER_DIMENSIONS", "1536")),
  },
  // ...other config
};
export const logger = frameworkLoggerUnified;
export const injectPromptVariables = frameworkInjectPromptVariablesUnified;

// Log config load (server-side only)
if (typeof window === "undefined") {
    // Use the imported logger which is now configured
    logger.info("[lib/config.ts] appConfig, logger, and injectPromptVariables are re-exporting from memory-framework/config.");
}