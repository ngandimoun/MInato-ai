// FILE: lib/config.ts
// This file now re-exports the unified configuration from the memory framework.
import {
  config as frameworkConfigUnified, // Use a more descriptive alias
  logger as frameworkLoggerUnified,
  injectPromptVariables as frameworkInjectPromptVariablesUnified
} from "@/memory-framework/config/index"; // Ensure this path is correct
import { DEFAULT_TOOL_TIMEOUT_MS } from "./constants";

declare const process: any;

// Helper to log missing envs
function getEnvVar(name: string, fallback: string | number | boolean | undefined, type?: 'string' | 'number' | 'boolean') {
  const value = process.env[name];
  if (value === undefined) {
    if (fallback === undefined && typeof window === "undefined" && process.env.NODE_ENV !== 'test') { // Only error if no fallback and not in test
      frameworkLoggerUnified.error(`[config] CRITICAL: Env var ${name} is missing and has no fallback.`);
      // In production, you might want to throw new Error(`Missing env var: ${name}`);
    } else if (typeof window === "undefined" && fallback !== undefined) {
      frameworkLoggerUnified.warn(`[config] Env var ${name} is missing, using fallback: ${fallback}`);
    }
    return fallback;
  }
  if (type === 'boolean') return value.toLowerCase() === 'true';
  if (type === 'number') {
      const num = Number(value);
      return isNaN(num) ? (fallback as number | undefined) : num;
  }
  return value;
}

export interface AppConfig {
  apiKey: any;
  neo4jUri: any;
  openaiApiKey: any;
  encryptionKey: any;
  upstashRedisUrl: any;
  upstashRedisToken: any;
  vectorStore: any;
  llm: any;
  nodeEnv: string;
  emailFromAddress: string;
  app: any;
  toolApiKeys: any;
  supabase: {
    storageUrl: string;
    // Add other Supabase config properties if needed
  };
  openai: {
    apiKey: string;
    chatModel: string;
    planningModel: string;
    extractionModel: string;
    developerModel: string;
    sttModel: string;
    ttsModel: string;
    embedderModel: string;
    embeddingDims: number;
    ttsDefaultVoice: string;
    ttsVoices: readonly string[];
    enableVision: boolean;
    visionDetail: "auto" | "low" | "high";
    temperature: number;
    maxTokens: number;
    maxVisionTokens: number;
    text: string;
    vision: string;
    planning: string;
    extraction: string;
    tts: string;
    stt: string;
    complexModel: string;
    balancedModel: string;
    fastModel: string;
    mediaUploadBucket: string;
    maxToolsPerTurn: number;
  };
  defaultLocale: string;
  toolTimeoutMs?: number;
  // ... rest of your config interface
}

export const appConfig: AppConfig = {
  ...frameworkConfigUnified,
  
  supabase: {
    // @ts-ignore: process.env is available in Node.js environments
    storageUrl: process.env.SUPABASE_STORAGE_URL || "https://auzkjkliwlycclkpjlbl.supabase.co/storage/v1",
  },
  defaultLocale: process.env.DEFAULT_LOCALE || "en-US",
  
  openai: {
    apiKey: getEnvVar("OPENAI_API_KEY", "") as string,
    // Main models based on new strategy
    chatModel: getEnvVar("LLM_CHAT_MODEL", "gpt-4o-2024-08-06") as string, // Primary model for chat & vision
    planningModel: getEnvVar("LLM_PLANNING_MODEL", "gpt-4.1-2025-04-14") as string, // For tool routing

    // Specialized models (can be same as above if preferred, or more specific/cost-effective)
    extractionModel: getEnvVar("LLM_EXTRACTION_MODEL", "gpt-4.1-nano-2025-04-14") as string, // For memory extraction
    developerModel: getEnvVar("LLM_DEVELOPER_MODEL", "o3-mini-2025-01-31") as string, // If needed for specific dev tasks
    
    // STT/TTS (chained voice) - kept as gpt-4o-mini variants
    sttModel: getEnvVar("LLM_STT_MODEL", "gpt-4o-mini-transcribe") as string,
    ttsModel: getEnvVar("LLM_TTS_MODEL", "gpt-4o-mini-tts") as string,
    
    // Embedding model
    embedderModel: getEnvVar("LLM_EMBEDDER_MODEL", "text-embedding-3-small") as string,
    embeddingDims: getEnvVar("LLM_EMBEDDER_DIMENSIONS", 1536, 'number') as number,

    // Default voices (ensure these are valid for gpt-4o-mini-tts)
    ttsDefaultVoice: getEnvVar("OPENAI_TTS_VOICE", "nova") as typeof frameworkConfigUnified.llm.ttsDefaultVoice,
    ttsVoices: frameworkConfigUnified.llm.ttsVoices, // Keep predefined list

    // Remove Realtime specific voice configs
    // realtimeDefaultVoice: "..." // REMOVED
    // realtimeVoices: [...] // REMOVED
    // realtimeVadConfig: { ... } // REMOVED
    // realtimeBaseInstructions: "..." // REMOVED

    enableVision: getEnvVar("ENABLE_VISION_ENV", true, 'boolean') as boolean,
    visionDetail: getEnvVar("VISION_DETAIL", "auto", 'string') as "auto" | "low" | "high",
    
    temperature: getEnvVar("LLM_TEMPERATURE", 0.7, 'number') as number, // General temperature
    maxTokens: getEnvVar("GENERATION_MAX_TOKENS", 1536, 'number') as number, // Max output for general responses
    maxVisionTokens: getEnvVar("MAX_VISION_TOKENS", 2048, 'number') as number, // Max output for vision-related responses
    
    // Legacy fields (can be removed if not used elsewhere, mapping to new ones)
    text: getEnvVar("LLM_CHAT_MODEL", "gpt-4o-2024-08-06") as string, // Mapped to chatModel
    vision: getEnvVar("LLM_CHAT_MODEL", "gpt-4o-2024-08-06") as string, // Mapped to chatModel (as it handles vision)
    planning: getEnvVar("LLM_PLANNING_MODEL", "gpt-4.1-2025-04-14") as string, // Mapped to planningModel
    extraction: getEnvVar("LLM_EXTRACTION_MODEL", "gpt-4.1-nano-2025-04-14") as string, // Mapped to extractionModel
    tts: getEnvVar("LLM_TTS_MODEL", "gpt-4o-mini-tts") as string, // Mapped
    stt: getEnvVar("LLM_STT_MODEL", "gpt-4o-mini-transcribe") as string, // Mapped
    
    // Keeping from original framework config for consistency where used
    complexModel: getEnvVar("LLM_COMPLEX_MODEL", "gpt-4o-2024-08-06") as string, // Could be GPT-4o or a specific GPT-4.1
    balancedModel: getEnvVar("LLM_BALANCED_MODEL", "gpt-4o-2024-08-06") as string,
    fastModel: getEnvVar("LLM_FAST_MODEL", "gpt-4.1-nano-2025-04-14") as string, // Typically for extraction

    mediaUploadBucket: getEnvVar("MEDIA_UPLOAD_BUCKET", "images") as string,
    maxToolsPerTurn: frameworkConfigUnified.llm.maxToolsPerTurn ?? 3,
  },
  
  toolTimeoutMs: getEnvVar("TOOL_TIMEOUT_MS", DEFAULT_TOOL_TIMEOUT_MS, 'number') as number,
};
export const logger = frameworkLoggerUnified;
export const injectPromptVariables = frameworkInjectPromptVariablesUnified;

if (typeof window === "undefined") {
    logger.info("[lib/config.ts] appConfig, logger, and injectPromptVariables are re-exporting from memory-framework/config.");
    logger.info(`[lib/config.ts] Key Models - Chat/Vision: ${appConfig.openai.chatModel}, Planning: ${appConfig.openai.planningModel}, Extraction: ${appConfig.openai.extractionModel}`);
}