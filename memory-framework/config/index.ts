// FILE: memory-framework/config/index.ts
import { FrameworkConfig } from "../core/types"; 
import dotenv from "dotenv";
import path from "path";
import {
  OpenAIEmbeddingModel,
  OpenAILLMBalanced,
  OpenAILLMFast,
  OpenAIPlanningModel,
  OpenAIVisionModel,
  OpenAITtsModel,
  OpenAISttModel,
  OpenAITtsVoice,
  OpenAIDeveloperModel,
  OpenAILLMComplex,
} from "../../lib/types/index";
import {
  MEMORY_SEARCH_LIMIT_DEFAULT,
  DEFAULT_USER_NAME,
  DEFAULT_PERSONA_ID,
  OPENAI_EMBEDDING_DIMENSION,
  DEFAULT_TOOL_TIMEOUT_MS, 
  EXTERNAL_CACHE_SIMILARITY_THRESHOLD,
  EXTERNAL_CACHE_DEFAULT_LIMIT, 
} from "../../lib/constants";


const ENV_KEYS = {
  OPENAI_API_KEY: "OPENAI_API_KEY",
  LLM_PLANNING_MODEL: "LLM_PLANNING_MODEL", 
  LLM_CHAT_MODEL: "LLM_CHAT_MODEL", 
  LLM_COMPLEX_MODEL: "LLM_COMPLEX_MODEL", 
  LLM_EXTRACTION_MODEL: "LLM_EXTRACTION_MODEL", 
  LLM_DEVELOPER_MODEL: "LLM_DEVELOPER_MODEL", 
  LLM_TTS_MODEL: "LLM_TTS_MODEL", 
  LLM_STT_MODEL: "LLM_STT_MODEL", 
  LLM_EMBEDDER_MODEL: "LLM_EMBEDDER_MODEL",
  LLM_EMBEDDER_DIMENSIONS: "LLM_EMBEDDER_DIMENSIONS",
  LLM_TEMPERATURE: "LLM_TEMPERATURE",
  VISION_DETAIL: "VISION_DETAIL",
  MAX_VISION_TOKENS: "MAX_VISION_TOKENS",
  GENERATION_MAX_TOKENS: "GENERATION_MAX_TOKENS",
  ENABLE_TTS_POST_PROCESSING: "ENABLE_TTS_POST_PROCESSING", // NEW
  TTS_TARGET_LOUDNESS_DB: "TTS_TARGET_LOUDNESS_DB", // NEW (Example, not fully used by current ffmpeg simple command)

  NEXT_PUBLIC_SUPABASE_URL: "NEXT_PUBLIC_SUPABASE_URL",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  SUPABASE_SERVICE_ROLE_KEY: "SUPABASE_SERVICE_ROLE_KEY",
  SUPABASE_MEMORY_TABLE: "SUPABASE_MEMORY_TABLE",
  SUPABASE_CACHE_TABLE: "SUPABASE_CACHE_TABLE",
  SUPABASE_MATCH_MEMORY_FUNC: "SUPABASE_MATCH_MEMORY_FUNC",
  SUPABASE_MATCH_CACHE_FUNC: "SUPABASE_MATCH_CACHE_FUNC",
  SUPABASE_FTS_CONFIG: "SUPABASE_FTS_CONFIG",
  SUPABASE_PERSONAS_TABLE: "SUPABASE_PERSONAS_TABLE",
  SUPABASE_USER_PERSONAS_TABLE: "SUPABASE_USER_PERSONAS_TABLE",
  SUPABASE_USER_INTEGRATIONS_TABLE: "SUPABASE_USER_INTEGRATIONS_TABLE",
  SUPABASE_USER_STATES_TABLE: "SUPABASE_USER_STATES_TABLE",
  SUPABASE_USER_PROFILES_TABLE: "SUPABASE_USER_PROFILES_TABLE",
  SUPABASE_PUSH_SUBS_TABLE: "SUPABASE_PUSH_SUBS_TABLE",

  NEO4J_URI: "NEO4J_URI",
  NEO4J_USERNAME: "NEO4J_USERNAME",
  NEO4J_PASSWORD: "NEO4J_PASSWORD",

  UPSTASH_REDIS_URL: "UPSTASH_REDIS_URL",
  UPSTASH_REDIS_TOKEN: "UPSTASH_REDIS_TOKEN",
  CACHE_PROVIDER_ENV: "CACHE_PROVIDER",

  VAPID_PUBLIC_KEY: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  VAPID_PRIVATE_KEY: "VAPID_PRIVATE_KEY",
  VAPID_SUBJECT: "VAPID_SUBJECT",

  LOG_LEVEL: "LOG_LEVEL",
  DEFAULT_LOCALE: "DEFAULT_LOCALE",
  ENCRYPTION_KEY: "ENCRYPTION_KEY",
  ALLOW_DEV_UNAUTH: "ALLOW_DEV_UNAUTH",
  DEFAULT_TOOL_TIMEOUT_MS_ENV: "DEFAULT_TOOL_TIMEOUT_MS", 
  APP_URL: "NEXT_PUBLIC_APP_URL", 
  NODE_ENV: "NODE_ENV",

  SERPER_API_KEY: "SERPER_API_KEY",
  YOUTUBE_API_KEY: "YOUTUBE_API_KEY",
  UNSPLASH_ACCESS_KEY: "UNSPLASH_ACCESS_KEY",
  PEXELS_API_KEY: "PEXELS_API_KEY",
  OPENWEATHERMAP_API_KEY: "OPENWEATHERMAP_API_KEY",
  WOLFRAMALPHA_APP_ID: "WOLFRAMALPHA_APP_ID",
  THESPORTSDB_API_KEY: "THESPORTSDB_API_KEY",
  TICKETMASTER_API_KEY: "TICKETMASTER_API_KEY",
  GOOGLE_CLIENT_ID: "GOOGLE_CLIENT_ID",
  GOOGLE_CLIENT_SECRET: "GOOGLE_CLIENT_SECRET",
  GOOGLE_REDIRECT_URI: "GOOGLE_REDIRECT_URI",
  GNEWS_API_KEY: "GNEWS_API_KEY",
  NEWSAPI_ORG_KEY: "NEWSAPI_ORG_KEY",
  RESEND_API_KEY: "RESEND_API_KEY",
  EMAIL_FROM_ADDRESS: "EMAIL_FROM_ADDRESS",
  ENABLE_VISION_ENV: "ENABLE_VISION",
  SEMANTIC_CACHE_ENABLED_ENV: "SEMANTIC_CACHE_ENABLED",
  MEDIA_UPLOAD_BUCKET: "MEDIA_UPLOAD_BUCKET",
  RUNWAY_API_KEY: "RUNWAY_API_KEY",
} as const;

const ALL_TTS_VOICES: ReadonlyArray<OpenAITtsVoice> = [
  "alloy", "ash", "ballad", "coral", "echo", "fable",
  "nova", "onyx", "sage", "shimmer", "verse",
] as const;

const DEFAULT_TTS_VOICE_CONST: OpenAITtsVoice = ALL_TTS_VOICES.includes("nova")
  ? "nova"
  : ALL_TTS_VOICES[0];

const DEFAULTS_UNIFIED = {
  LLM_PLANNING_MODEL: "gpt-4o-mini-2024-07-18" as OpenAIPlanningModel,
  LLM_CHAT_MODEL: "gpt-4o-mini-2024-07-18" as OpenAILLMBalanced,
  LLM_COMPLEX_MODEL: "gpt-4.1-2025-04-14" as OpenAILLMComplex,
  LLM_EXTRACTION_MODEL: "gpt-4.1-nano-2025-04-14" as OpenAILLMFast,

  LLM_VISION_MODEL: "gpt-4.1-mini-2025-04-14" as OpenAIVisionModel,
  LLM_TTS_MODEL: "gpt-4o-mini-tts" as OpenAITtsModel,
  LLM_STT_MODEL: "gpt-4o-mini-transcribe" as OpenAISttModel,
  LLM_EMBEDDER_MODEL: "text-embedding-3-small" as OpenAIEmbeddingModel,
  LLM_EMBEDDER_DIMENSIONS: OPENAI_EMBEDDING_DIMENSION,
  LLM_TEMPERATURE: 0.7,
  VISION_DETAIL: "auto" as "low" | "high" | "auto",
  MAX_VISION_TOKENS: 2048,
  GENERATION_MAX_TOKENS: 1536,
  TTS_DEFAULT_VOICE: DEFAULT_TTS_VOICE_CONST,
  ENABLE_TTS_POST_PROCESSING_DEFAULT: false, // NEW DEFAULT
  TTS_TARGET_LOUDNESS_DB_DEFAULT: -16, // NEW DEFAULT (example for LUFS, not directly used by simple ffmpeg volume)

  SUPABASE_TABLE_NAME: "memories",
  SUPABASE_MATCH_FUNCTION: "match_memories_v2",
  SUPABASE_FTS_CONFIG: "english",
  SUPABASE_CACHE_TABLE_NAME: "external_content_cache",
  SUPABASE_MATCH_CACHE_FUNCTION: "match_external_content_cache",
  SUPABASE_PERSONAS_TABLE: "personas",
  SUPABASE_USER_PERSONAS_TABLE: "user_personas",
  SUPABASE_USER_INTEGRATIONS_TABLE: "user_integrations",
  SUPABASE_USER_STATES_TABLE: "user_states",
  SUPABASE_USER_PROFILES_TABLE: "user_profiles",
  SUPABASE_PUSH_SUBS_TABLE: "user_push_subscriptions",

  NEO4J_PROVIDER: "neo4j",

  CACHE_PROVIDER: "none" as FrameworkConfig["cache"]["provider"],
  EMBEDDING_CACHE_TTL: 3600 * 24 * 7,
  SEARCH_CACHE_TTL: 90,
  EXTRACTION_CACHE_TTL: 3600 * 6,

  SEMANTIC_CACHE_ENABLED: true, 
  SEMANTIC_CACHE_SIMILARITY_THRESHOLD: EXTERNAL_CACHE_SIMILARITY_THRESHOLD,
  SEMANTIC_CACHE_DEFAULT_LIMIT: EXTERNAL_CACHE_DEFAULT_LIMIT,
  SEMANTIC_CACHE_DEFAULT_TTL: 3600 * 24,
  SEMANTIC_CACHE_PRODUCT_TTL: 3600 * 4,
  SEMANTIC_CACHE_VIDEO_TTL: 3600 * 24 * 7,
  SEMANTIC_CACHE_IMAGE_TTL: 3600 * 24 * 30,
  SEMANTIC_CACHE_RECIPE_TTL: 3600 * 24 * 14,
  SEMANTIC_CACHE_WEATHER_TTL: 60 * 15,
  SEMANTIC_CACHE_PLACE_TTL: 3600 * 24 * 7,
  SEMANTIC_CACHE_GIF_TTL: 3600 * 12,
  SEMANTIC_CACHE_FACT_TTL: 3600 * 24 * 7,
  SEMANTIC_CACHE_NEWS_TTL: 3600 * 1,
  SEMANTIC_CACHE_SPORTS_TTL: 3600 * 2,
  SEMANTIC_CACHE_EVENT_TTL: 3600 * 6,
  SEMANTIC_CACHE_TIKTOK_TTL: 3600 * 24 * 3,
  SEMANTIC_CACHE_CALENDAR_TTL: 60 * 5,
  SEMANTIC_CACHE_EMAIL_TTL: 60 * 2,
  SEMANTIC_CACHE_TASK_TTL: 60 * 1,
  SEMANTIC_CACHE_REMINDER_TTL: 60 * 1,

  MEMORY_SEARCH_LIMIT_DEFAULT: MEMORY_SEARCH_LIMIT_DEFAULT,
  CONFLICT_RESOLUTION:
    "use_latest_graph_ts" as FrameworkConfig["conflictResolutionStrategy"],
  HYBRID_SEARCH_DEFAULT: true,
  GRAPH_SEARCH_DEFAULT: true,
  RERANK_DEFAULT: false,
  ADD_MEMORY_ON_FAILURE: true,

  VAPID_SUBJECT: "mailto:renemakoule@gmail.com",

  LOG_LEVEL: "info" as FrameworkConfig["logLevel"],
  DEFAULT_LOCALE: "en-US",
  ENCRYPTION_KEY_DEFAULT: "default_dummy_key_for_dev_32bytes_must_change!",
  ALLOW_DEV_UNAUTH: false,
  TOOL_TIMEOUT_MS: DEFAULT_TOOL_TIMEOUT_MS, 
  APP_URL: "http://localhost:3000",
  NODE_ENV: "development",
  DEFAULT_USER_NAME_CONST: DEFAULT_USER_NAME,
  DEFAULT_PERSONA_ID_CONST: DEFAULT_PERSONA_ID,
  ENABLE_VISION_APP: true,
  EMAIL_FROM_ADDRESS: "Minato AI <renemakoule@gmail.com>",
  DEFAULT_CATEGORIES: [
    "personal_details", "user_preferences", "relationships", "work_education",
    "locations", "events_milestones", "health_wellness", "hobbies_interests",
    "likes_dislikes", "goals_aspirations", "facts_knowledge", "sentiment_mood",
    "feedback_correction", "temporary_info", "planning", "media_consumption",
    "shared_experiences", "inside_jokes", "technical_details", "product_interest",
    "content_interest", "reminders", "tasks", "data_analysis", "misc",
  ],
};

function getEnvVar(
  key: keyof typeof ENV_KEYS,
  required: boolean = true,
  defaultValue?: string | number | boolean,
  type?: 'string' | 'number' | 'boolean'
): string | number | boolean | undefined {
  const envVarName = ENV_KEYS[key];
  const value =
    typeof process !== "undefined" && process.env
      ? process.env[envVarName]
      : undefined;

  if (value !== undefined) {
    if (type === "boolean" || typeof defaultValue === "boolean" && type === undefined)
      return value.toLowerCase() === "true";
    if (type === "number" || typeof defaultValue === "number" && type === undefined) {
      const num = Number(value);
      return isNaN(num) ? defaultValue : num;
    }
    return value;
  }
  if (required && defaultValue === undefined && typeof window === "undefined" && process.env.NODE_ENV !== 'test') {
    const message = `[Config Load] CRITICAL: Missing required environment variable: ${envVarName} (config key: ${key})`;
    console.error(message);
    if (process.env.NODE_ENV === "production") {
      throw new Error(message);
    }
  }
  return defaultValue;
}

export function injectPromptVariables(
  template: string,
  variables: Record<
    string,
    string | number | boolean | undefined | null | Record<string, any>
  >
): string {
  let populatedTemplate = template;
  for (const key in variables) {
    const value = variables[key];
    const replacement =
      typeof value === "object" && value !== null
        ? JSON.stringify(value, null, 2)
        : String(value ?? "");
    populatedTemplate = populatedTemplate.replace(
      new RegExp(`{${key}}`, "g"),
      replacement
    );
  }
  return populatedTemplate;
}

function loadConfig(): FrameworkConfig {
  if (typeof window === "undefined") {
    getEnvVar("OPENAI_API_KEY", true);
    getEnvVar("NEXT_PUBLIC_SUPABASE_URL", true);
    getEnvVar("SUPABASE_SERVICE_ROLE_KEY", true);
    getEnvVar("NEO4J_URI", true);
    getEnvVar("NEO4J_USERNAME", true);
    getEnvVar("NEO4J_PASSWORD", true);
    const encryptionKey = getEnvVar( "ENCRYPTION_KEY", true, DEFAULTS_UNIFIED.ENCRYPTION_KEY_DEFAULT ) as string;
    if (Buffer.from(encryptionKey, "utf-8").length !== 32) {
      const errMsg = "CRITICAL SECURITY: ENCRYPTION_KEY must be exactly 32 bytes long.";
      console.error(`[Config Load] ${errMsg}`);
      if ( getEnvVar("NODE_ENV", false, DEFAULTS_UNIFIED.NODE_ENV) === "production" ) throw new Error(errMsg);
    }
    if ( getEnvVar( "CACHE_PROVIDER_ENV", false, DEFAULTS_UNIFIED.CACHE_PROVIDER ) === "upstash_redis" ) {
      getEnvVar("UPSTASH_REDIS_URL", true);
      getEnvVar("UPSTASH_REDIS_TOKEN", true);
    }
    if ( getEnvVar("NODE_ENV", false, DEFAULTS_UNIFIED.NODE_ENV) === "production" ) {
      getEnvVar("VAPID_PUBLIC_KEY", true);
      getEnvVar("VAPID_PRIVATE_KEY", true);
      getEnvVar("VAPID_SUBJECT", true);
    }
    getEnvVar("APP_URL", true); 
  }

  const determinedCacheProvider = getEnvVar( "CACHE_PROVIDER_ENV", false, DEFAULTS_UNIFIED.CACHE_PROVIDER ) as FrameworkConfig["cache"]["provider"];
  const nodeEnv = getEnvVar( "NODE_ENV", false, DEFAULTS_UNIFIED.NODE_ENV ) as string;

  const loadedConfig = {
    llm: {
      provider: "openai",
      apiKey: getEnvVar("OPENAI_API_KEY", true, "") as string,
      planningModel: getEnvVar( "LLM_PLANNING_MODEL", false, DEFAULTS_UNIFIED.LLM_PLANNING_MODEL, 'string' ) as OpenAIPlanningModel,
      chatModel: getEnvVar( "LLM_CHAT_MODEL", false, DEFAULTS_UNIFIED.LLM_CHAT_MODEL, 'string' ) as OpenAILLMBalanced,
      complexModel: getEnvVar( "LLM_COMPLEX_MODEL", false, DEFAULTS_UNIFIED.LLM_COMPLEX_MODEL, 'string' ) as OpenAILLMComplex,
      extractionModel: getEnvVar( "LLM_EXTRACTION_MODEL", false, DEFAULTS_UNIFIED.LLM_EXTRACTION_MODEL, 'string' ) as OpenAILLMFast,
      
      fastModel: getEnvVar( "LLM_EXTRACTION_MODEL", false, DEFAULTS_UNIFIED.LLM_EXTRACTION_MODEL, 'string' ) as OpenAILLMFast, 
      visionModel: getEnvVar( "LLM_CHAT_MODEL", false, DEFAULTS_UNIFIED.LLM_CHAT_MODEL, 'string' ) as OpenAIVisionModel, 
      ttsModel: getEnvVar( "LLM_TTS_MODEL", false, DEFAULTS_UNIFIED.LLM_TTS_MODEL, 'string' ) as OpenAITtsModel,
      sttModel: getEnvVar( "LLM_STT_MODEL", false, DEFAULTS_UNIFIED.LLM_STT_MODEL, 'string' ) as OpenAISttModel,
      enableVision: getEnvVar( "ENABLE_VISION_ENV", false, DEFAULTS_UNIFIED.ENABLE_VISION_APP, 'boolean' ) as boolean,
      temperature: getEnvVar( "LLM_TEMPERATURE", false, DEFAULTS_UNIFIED.LLM_TEMPERATURE, 'number' ) as number,
      maxTokens: getEnvVar( "GENERATION_MAX_TOKENS", false, DEFAULTS_UNIFIED.GENERATION_MAX_TOKENS, 'number' ) as number,
      topP: 1.0,
      ttsDefaultVoice: DEFAULTS_UNIFIED.TTS_DEFAULT_VOICE,
      ttsVoices: ALL_TTS_VOICES,
      visionDetail: getEnvVar( "VISION_DETAIL", false, DEFAULTS_UNIFIED.VISION_DETAIL, 'string' ) as "low" | "high" | "auto",
      maxVisionTokens: getEnvVar( "MAX_VISION_TOKENS", false, DEFAULTS_UNIFIED.MAX_VISION_TOKENS, 'number' ) as number,
      realtimeTools: null, 
      // NEW TTS Post-processing config
      enableTtsPostProcessing: getEnvVar("ENABLE_TTS_POST_PROCESSING", false, DEFAULTS_UNIFIED.ENABLE_TTS_POST_PROCESSING_DEFAULT, 'boolean') as boolean,
      ttsTargetLoudnessDb: getEnvVar("TTS_TARGET_LOUDNESS_DB", false, DEFAULTS_UNIFIED.TTS_TARGET_LOUDNESS_DB_DEFAULT, 'number') as number,
      // Fields for gpt-4o-mini-realtime removed, ensure they are also removed from type definition if not used:
      realtimeModel: "gpt-4o-mini-realtime-preview-2024-12-17" as any, // Keep type for now, but not used
      realtimeSttModel: "gpt-4o-mini-transcribe" as any, // Keep type for now
      realtimeDefaultVoice: "nova" as any, // Keep type for now
      realtimeVoices: ["nova"] as any, // Keep type for now
      realtimeVadConfig: {} as any, // Keep type for now
    },
    embedder: {
      provider: "openai",
      model: getEnvVar( "LLM_EMBEDDER_MODEL", false, DEFAULTS_UNIFIED.LLM_EMBEDDER_MODEL, 'string' ) as OpenAIEmbeddingModel,
      apiKey: getEnvVar("OPENAI_API_KEY", true, "") as string,
      dimensions: getEnvVar( "LLM_EMBEDDER_DIMENSIONS", false, DEFAULTS_UNIFIED.LLM_EMBEDDER_DIMENSIONS, 'number' ) as number,
    },
    vectorStore: {
      provider: "supabase",
      url: getEnvVar("NEXT_PUBLIC_SUPABASE_URL", true, "") as string,
      serviceKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY", true, "") as string,
      tableName: getEnvVar( "SUPABASE_MEMORY_TABLE", false, DEFAULTS_UNIFIED.SUPABASE_TABLE_NAME, 'string' ) as string,
      cacheTableName: getEnvVar( "SUPABASE_CACHE_TABLE", false, DEFAULTS_UNIFIED.SUPABASE_CACHE_TABLE_NAME, 'string' ) as string,
      matchCacheFunctionName: getEnvVar( "SUPABASE_MATCH_CACHE_FUNC", false, DEFAULTS_UNIFIED.SUPABASE_MATCH_CACHE_FUNCTION, 'string' ) as string,
      embeddingDimension: getEnvVar( "LLM_EMBEDDER_DIMENSIONS", false, DEFAULTS_UNIFIED.LLM_EMBEDDER_DIMENSIONS, 'number' ) as number,
      matchFunctionName: getEnvVar( "SUPABASE_MATCH_MEMORY_FUNC", false, DEFAULTS_UNIFIED.SUPABASE_MATCH_FUNCTION, 'string' ) as string,
      ftsConfiguration: getEnvVar( "SUPABASE_FTS_CONFIG", false, DEFAULTS_UNIFIED.SUPABASE_FTS_CONFIG, 'string' ) as string,
      personasTableName: getEnvVar( "SUPABASE_PERSONAS_TABLE", false, DEFAULTS_UNIFIED.SUPABASE_PERSONAS_TABLE, 'string' ) as string,
      userPersonasTableName: getEnvVar( "SUPABASE_USER_PERSONAS_TABLE", false, DEFAULTS_UNIFIED.SUPABASE_USER_PERSONAS_TABLE, 'string' ) as string,
      userIntegrationsTableName: getEnvVar( "SUPABASE_USER_INTEGRATIONS_TABLE", false, DEFAULTS_UNIFIED.SUPABASE_USER_INTEGRATIONS_TABLE, 'string' ) as string,
      userStatesTableName: getEnvVar( "SUPABASE_USER_STATES_TABLE", false, DEFAULTS_UNIFIED.SUPABASE_USER_STATES_TABLE, 'string' ) as string,
      userProfilesTableName: getEnvVar( "SUPABASE_USER_PROFILES_TABLE", false, DEFAULTS_UNIFIED.SUPABASE_USER_PROFILES_TABLE, 'string' ) as string,
      userPushSubscriptionsTableName: getEnvVar( "SUPABASE_PUSH_SUBS_TABLE", false, DEFAULTS_UNIFIED.SUPABASE_PUSH_SUBS_TABLE, 'string' ) as string,
    },
    graphStore: {
      provider: DEFAULTS_UNIFIED.NEO4J_PROVIDER as "neo4j",
      url: getEnvVar("NEO4J_URI", true, "") as string,
      username: getEnvVar("NEO4J_USERNAME", true, "") as string,
      password: getEnvVar("NEO4J_PASSWORD", true, "") as string,
    },
    cache: {
      provider: determinedCacheProvider,
      url: determinedCacheProvider === "upstash_redis" ? (getEnvVar("UPSTASH_REDIS_URL", true, "") as string) : "",
      token: determinedCacheProvider === "upstash_redis" ? (getEnvVar("UPSTASH_REDIS_TOKEN", true, "") as string) : "",
      embeddingCacheTTLSeconds: DEFAULTS_UNIFIED.EMBEDDING_CACHE_TTL,
      searchCacheTTLSeconds: DEFAULTS_UNIFIED.SEARCH_CACHE_TTL,
      extractionCacheTTLSeconds: DEFAULTS_UNIFIED.EXTRACTION_CACHE_TTL,
    },
    semanticCache: {
      enabled: getEnvVar( "SEMANTIC_CACHE_ENABLED_ENV", false, DEFAULTS_UNIFIED.SEMANTIC_CACHE_ENABLED, 'boolean' ) as boolean,
      similarityThreshold: DEFAULTS_UNIFIED.SEMANTIC_CACHE_SIMILARITY_THRESHOLD,
      defaultLimit: DEFAULTS_UNIFIED.SEMANTIC_CACHE_DEFAULT_LIMIT,
      defaultTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_DEFAULT_TTL,
      productTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_PRODUCT_TTL,
      videoTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_VIDEO_TTL,
      imageTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_IMAGE_TTL,
      recipeTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_RECIPE_TTL,
      weatherTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_WEATHER_TTL,
      placeTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_PLACE_TTL,
      gifTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_GIF_TTL,
      factTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_FACT_TTL,
      newsTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_NEWS_TTL,
      sportsTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_SPORTS_TTL,
      eventTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_EVENT_TTL,
      tiktokTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_TIKTOK_TTL,
      calendarTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_CALENDAR_TTL,
      emailTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_EMAIL_TTL,
      taskTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_TASK_TTL,
      reminderTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_REMINDER_TTL,
      calculation_or_factTTL: DEFAULTS_UNIFIED.SEMANTIC_CACHE_FACT_TTL,
    },
    memory: {
      searchDefaultLimit: DEFAULTS_UNIFIED.MEMORY_SEARCH_LIMIT_DEFAULT,
      extractionModel: getEnvVar( "LLM_EXTRACTION_MODEL", false, DEFAULTS_UNIFIED.LLM_EXTRACTION_MODEL, 'string' ) as OpenAILLMFast,
      addMemoryOnFailure: DEFAULTS_UNIFIED.ADD_MEMORY_ON_FAILURE,
    },
    notifications: {
      vapidPublicKey: getEnvVar("VAPID_PUBLIC_KEY", false, undefined, 'string') as string | null,
      vapidPrivateKey: getEnvVar("VAPID_PRIVATE_KEY", false, undefined, 'string') as string | null,
      vapidSubject: getEnvVar( "VAPID_SUBJECT", false, DEFAULTS_UNIFIED.VAPID_SUBJECT, 'string' ) as string,
    },
    defaultCategories: DEFAULTS_UNIFIED.DEFAULT_CATEGORIES,
    conflictResolutionStrategy: DEFAULTS_UNIFIED.CONFLICT_RESOLUTION,
    hybridSearchEnabledDefault: DEFAULTS_UNIFIED.HYBRID_SEARCH_DEFAULT,
    graphSearchEnabledDefault: DEFAULTS_UNIFIED.GRAPH_SEARCH_DEFAULT,
    rerankEnabledDefault: DEFAULTS_UNIFIED.RERANK_DEFAULT,
    logLevel: getEnvVar( "LOG_LEVEL", false, DEFAULTS_UNIFIED.LOG_LEVEL, 'string' ) as FrameworkConfig["logLevel"],
    defaultLocale: getEnvVar( "DEFAULT_LOCALE", false, DEFAULTS_UNIFIED.DEFAULT_LOCALE, 'string' ) as string,
    defaultUserName: DEFAULTS_UNIFIED.DEFAULT_USER_NAME_CONST,
    defaultPersonaId: DEFAULTS_UNIFIED.DEFAULT_PERSONA_ID_CONST,
    allowDevUnauth: getEnvVar( "ALLOW_DEV_UNAUTH", false, DEFAULTS_UNIFIED.ALLOW_DEV_UNAUTH, 'boolean' ) as boolean,
    encryptionKey: getEnvVar( "ENCRYPTION_KEY", true, DEFAULTS_UNIFIED.ENCRYPTION_KEY_DEFAULT, 'string' ) as string,
    toolTimeoutMs: getEnvVar( "DEFAULT_TOOL_TIMEOUT_MS_ENV", false, DEFAULTS_UNIFIED.TOOL_TIMEOUT_MS, 'number' ) as number,
    app: {
      url: getEnvVar("APP_URL", true, DEFAULTS_UNIFIED.APP_URL, 'string') as string,
      nodeEnv: nodeEnv,
    },
    toolApiKeys: {
      serper: getEnvVar("SERPER_API_KEY", false, undefined, 'string') as string | undefined,
      youtube: getEnvVar("YOUTUBE_API_KEY", false, undefined, 'string') as string | undefined,
      unsplash: getEnvVar("UNSPLASH_ACCESS_KEY", false, undefined, 'string') as string | undefined,
      pexels: getEnvVar("PEXELS_API_KEY", false, undefined, 'string') as string | undefined,
      openweathermap: getEnvVar("OPENWEATHERMAP_API_KEY", false, undefined, 'string') as string | undefined,
      wolframalpha: getEnvVar("WOLFRAMALPHA_APP_ID", false, undefined, 'string') as string | undefined,
      theSportsDb: getEnvVar("THESPORTSDB_API_KEY", false, undefined, 'string') as string | undefined,
      ticketmaster: getEnvVar("TICKETMASTER_API_KEY", false, undefined, 'string') as string | undefined,
      googleClientId: getEnvVar("GOOGLE_CLIENT_ID", false, undefined, 'string') as string | undefined,
      googleClientSecret: getEnvVar("GOOGLE_CLIENT_SECRET", false, undefined, 'string') as string | undefined,
      googleRedirectUri: getEnvVar("GOOGLE_REDIRECT_URI", false, undefined, 'string') as string | undefined,
      gnews: getEnvVar("GNEWS_API_KEY", false, undefined, 'string') as string | undefined,
      newsapiOrg: getEnvVar("NEWSAPI_ORG_KEY", false, undefined, 'string') as string | undefined,
      resend: getEnvVar("RESEND_API_KEY", false, undefined, 'string') as string | undefined,
    },
    emailFromAddress: getEnvVar( "EMAIL_FROM_ADDRESS", false, DEFAULTS_UNIFIED.EMAIL_FROM_ADDRESS, 'string' ) as string,
    openaiApiKey: getEnvVar("OPENAI_API_KEY", true, "", 'string') as string, 
    supabaseUrl: getEnvVar("NEXT_PUBLIC_SUPABASE_URL", true, "", 'string') as string, 
    supabaseAnonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", false, "", 'string') as string, 
    upstashRedisUrl: determinedCacheProvider === "upstash_redis" ? (getEnvVar("UPSTASH_REDIS_URL", true, "") as string) : "",
    upstashRedisToken: determinedCacheProvider === "upstash_redis" ? (getEnvVar("UPSTASH_REDIS_TOKEN", true, "") as string) : "",
    neo4jUri: getEnvVar("NEO4J_URI", true, "") as string,
    embeddingDimension: getEnvVar( "LLM_EMBEDDER_DIMENSIONS", false, DEFAULTS_UNIFIED.LLM_EMBEDDER_DIMENSIONS, 'number' ) as number,
    mediaUploadBucket: getEnvVar("MEDIA_UPLOAD_BUCKET", false, "images", 'string') as string,
    maxToolsPerTurn: 3,
    maxVideoFrames: 10, // From Orchestrator (should be here)
    maxVideoSizeBytes: 100 * 1024 * 1024, // From Orchestrator (should be here)
  };

  const finalConfig = loadedConfig as unknown as FrameworkConfig;

  if (typeof window === "undefined") {
    console.log("--- [Config Loaded - Pre-Logger Init] ---");
    console.log(`Log Level (from env/default): ${finalConfig.logLevel}`);
    console.log("--- [Config End - Pre-Logger Init] ---");
  }
  return finalConfig;
}

export const config: FrameworkConfig = loadConfig();

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (config.logLevel === "debug") {
      const processedArgs = args.map(arg => (arg === undefined ? "undefined" : arg));
      console.debug(`[MINATO-DEBUG] ${message}`, ...processedArgs);
    }
  },
  info: (message: string, ...args: any[]) => {
    if (["debug", "info"].includes(config.logLevel)) {
      const processedArgs = args.map(arg => (arg === undefined ? "undefined" : arg));
      console.info(`[MINATO-INFO] ${message}`, ...processedArgs);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (["debug", "info", "warn"].includes(config.logLevel)) {
      const processedArgs = args.map(arg => (arg === undefined ? "undefined" : arg));
      console.warn(`[MINATO-WARN] ${message}`, ...processedArgs);
    }
  },
  error: (message: string, ...args: any[]) => {
    const processedArgs = args.map(arg => {
      if (arg === undefined) return "[Logger: UndefinedArg]"; 
      if (arg instanceof Error) {
        const errMessage = typeof arg.message === 'string' ? arg.message : '(No message property or undefined)';
        const errStack = typeof arg.stack === 'string' ? `\nStack: ${arg.stack}` : '';
        return `ErrorObj: ${errMessage}${errStack}`;
      }
      try {
        return typeof arg === 'object' && arg !== null ? JSON.stringify(arg) : String(arg);
      } catch (e) {
        return "[Logger: UnstringifiableArg]";
      }
    });
    console.error(`[MINATO-ERROR] ${message}`, ...processedArgs);
  },
};

if (typeof window === "undefined") {
  logger.info("Unified configuration system initialized.");
  logger.info(`Log Level: ${config.logLevel}`);
  logger.info(`Node Env: ${config.app.nodeEnv}`);
  logger.info(`App URL: ${config.app.url}`);
  logger.info("LLM Settings:");
  logger.info(`  Main Chat/Vision Model: ${config.llm.chatModel}`);
  logger.info(`  Planning/Tool Routing Model: ${config.llm.planningModel}`);
  logger.info(`  Extraction Model: ${config.llm.extractionModel}`);
  logger.info(`  TTS Post-Processing Enabled: ${config.llm.enableTtsPostProcessing}`); // Log new setting
  if (config.allowDevUnauth && config.app.nodeEnv === "production") {
    logger.error("CRITICAL SECURITY: ALLOW_DEV_UNAUTH IS TRUE IN PRODUCTION!");
  }
  if (
    config.encryptionKey === DEFAULTS_UNIFIED.ENCRYPTION_KEY_DEFAULT &&
    config.app.nodeEnv === "production"
  ) {
    logger.error(
      "CRITICAL SECURITY: USING DEFAULT ENCRYPTION_KEY IN PRODUCTION!"
    );
  }
}

export const appConfig = {
  ...config,
  openai: {
    ...(config.llm), 
    embedderModel: config.embedder.model,
    embeddingDims: config.embedder.dimensions,
    text: config.llm.chatModel, 
    vision: config.llm.chatModel, 
    planning: config.llm.planningModel,
    extraction: config.llm.extractionModel,
    tts: config.llm.ttsModel,
    stt: config.llm.sttModel,
    mediaUploadBucket: getEnvVar("MEDIA_UPLOAD_BUCKET", false, "images", 'string') as string,
    maxToolsPerTurn: 3,
    maxVideoFrames: 10,
    maxVideoSizeBytes: 100 * 1024 * 1024,
    // NEW: Expose TTS post-processing setting through appConfig.openai
    enableTtsPostProcessing: config.llm.enableTtsPostProcessing,
    ttsTargetLoudnessDb: config.llm.ttsTargetLoudnessDb,
  },
};