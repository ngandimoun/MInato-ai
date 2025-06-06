// FILE: memory-framework/core/types.ts
// (Content from finalcodebase.txt - verified)
import OpenAI from "openai";
import { ToolOutput as BaseToolOutputDef } from "../../lib/tools/base-tool";
import { AnyToolStructuredData } from '../../lib/types/index';
import type { CompletionUsage } from 'openai/resources'; // Ensure this type is imported

// --- Basic Message Structures ---
export interface MessagePart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "low" | "high" | "auto";
  };
}

// For sending to OpenAI Responses API
export type ResponseApiInputContent =
  | { type: "input_text"; text: string; }
  | { type: "input_image"; image_url: string; detail?: "low" | "high" | "auto"; };

// Internal representation used by Memory Framework and Orchestrator
export interface MemoryFrameworkMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string | MessagePart[] | null; // Allows string or array of parts
  name?: string; // Optional name (e.g., tool name for role 'tool', user name for role 'user')
  tool_call_id?: string; // For role 'tool'
  // For role 'assistant' when calling tools
  tool_calls?: Array<{
    id: string;
    type: "function"; // OpenAI uses 'function' here
    function: { name: string; arguments: string; }; // Arguments as JSON string
  }> | any[]; // Use any[] cautiously, prefer OpenAI type if possible
}


// --- Reminder Structure ---
export interface ReminderDetails {
  is_reminder: true;
  original_content: string;
  trigger_datetime: string; // ISO 8601 UTC
  recurrence_rule?: "daily" | "weekly" | "monthly" | "yearly" | null; // Made optional
  status: "pending" | "sent" | "error" | "acknowledged" | "cancelled";
  last_sent_at?: string | null; // ISO 8601 UTC
  error_message?: string | null;
}


// --- Extracted Information from LLM ---
export interface ExtractedEntity {
  name: string;
  type: string; // e.g., PERSON, LOCATION, ORGANIZATION, PRODUCT, CONCEPT, EVENT, MISC
  language?: string | null;
}
export interface ExtractedRelationship {
  subj: string; // Subject entity name (or 'User')
  pred: string; // Predicate (relationship type, e.g., 'likes', 'works_at')
  obj: string;  // Object entity name
  qualifiers?: Record<string, any> | null; // Context like time, location
  language?: string | null;
}
export interface ExtractedInfo {
  facts: string[]; // Key statements made BY or ABOUT the user
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  sentiment: "positive" | "negative" | "neutral" | "mixed" | null;
  topics: string[]; // Main topics discussed
  categories: string[]; // Relevant predefined categories
  metadata: Record<string, any> & { // Flexible metadata store
    reminder_details?: ReminderDetails;
    detected_language?: string | null; // Ensure this is captured if detected
  };
  summary?: string | null; // Concise summary of the user's turn
  detected_language?: string | null; // ISO 639-1 code (redundant with metadata?)
}


// --- Memory Unit Structures ---
export interface BaseMemoryUnit {
  memory_id: string; // UUID for the memory unit
  user_id: string; // ID of the user this memory belongs to
  run_id: string | null; // Optional ID for the conversation run/session
  content: string; // The core text content of the memory
  metadata: Record<string, any> & { // Metadata including role, reminder, etc.
      role?: string; // Store role here: 'user', 'assistant', 'system', 'tool'
      reminder_details?: ReminderDetails;
      is_discovery_interaction?: boolean;
      // Add other relevant extracted metadata like sentiment, topics, etc.
  };
  categories: string[]; // Assigned categories for filtering
  language?: string | null; // ISO 639-1 language code
  source_turn_ids?: string[] | null; // IDs of source messages if derived
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  expires_at?: string | null; // Optional ISO 8601 expiration timestamp
  memory_type?: string | null; // Type of memory (task, reminder, conversation, etc.)
}
export interface StoredMemoryUnit extends BaseMemoryUnit {
  role: string; // Role is crucial for context reconstruction
  embedding: number[] | null; // Vector embedding (null if not applicable/generated)
}
export interface SearchResult extends StoredMemoryUnit { // Extend StoredMemoryUnit
  // embedding?: number[] | null; // Already in StoredMemoryUnit
  vector_score?: number | null;
  keyword_score?: number | null;
  graph_score?: number | null;
  final_score?: number | null; // Combined score after ranking
  is_latest_fact?: boolean | null; // Flag from conflict resolution
}


// --- Pagination & Search Options ---
export interface PaginationParams { limit: number; offset: number; }
export interface PaginatedResults<T> {
  results: T[];
  total_estimated?: number; // Total number of results matching criteria (can be approximate)
  limit: number;
  offset: number;
}
export interface SearchOptions {
  filters?: Record<string, any> | null; // e.g., { metadata: { status: 'pending' }, categories: ['task'] }
  enableHybridSearch?: boolean;
  enableGraphSearch?: boolean;
  enableConflictResolution?: boolean;
  rerank?: boolean;
  vectorWeight?: number; // Weight for vector score (0-1)
  keywordWeight?: number; // Weight for keyword score (0-1)
  graphWeight?: number; // Weight for graph score (0-1)
  exclude_expired?: boolean; // Whether to exclude expired memories (default: true)
  fts_configuration?: string; // FTS config name for keyword search (e.g., 'english', 'simple')
}


// --- Graph Conflict Resolution Helper Type ---
export interface LatestGraphInfo {
  subject: string;
  predicate: string;
  object: string;
  timestamp: string; // ISO 8601 timestamp from the relationship
  source_memory_id: string;
}


// --- External Content Cache Type ---
export interface ExternalContentCacheEntry {
  similarity?: number | null; // Cosine similarity score from the search
  id: string; // UUID of the cache entry
  user_query_text: string; // The original user query that triggered the external tool
  query_embedding: number[]; // Embedding of the user_query_text
  result_type: AnyToolStructuredData['result_type']; // Discriminator from the main types file
  structured_result: AnyToolStructuredData; // The actual structured data returned by the tool
  source_api: string; // Name of the API/Tool that provided the data (e.g., 'openweathermap', 'serper_shopping')
  language: string | null; // Language context of the query/result if known
  location: string | null; // Location context if relevant
  created_at: string; // ISO 8601 timestamp when cached
  expires_at: string; // ISO 8601 timestamp when cache entry expires
}


// --- Persona Types ---
export interface PredefinedPersona {
    id: string; // Unique ID (e.g., 'minato_default', 'minato_professional')
    name: string; // Display name (e.g., 'Default', 'Professional')
    description: string; // Short description shown in UI
    system_prompt: string; // The core system prompt text
    voice_id: string | null | undefined; // Corresponding TTS/Realtime voice ID if applicable
    is_public: boolean; // True for predefined, false for user-created (used for DB query)
}
export interface UserPersona {
    id: string; // UUID generated on creation
    user_id: string; // Owner of the persona
    name: string; // User-defined name
    description?: string | null; // User-defined description
    system_prompt: string; // The custom system prompt
    voice_id: string | null | undefined; // Associated voice ID
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
    // isCustom is not a DB field, usually added in application logic if needed
}


// --- Configuration Type ---
// Re-importing types from the main types file to ensure consistency
import {
  OpenAILLMComplex, OpenAILLMBalanced, OpenAILLMFast, OpenAIEmbeddingModel,
  OpenAISttModel, OpenAITtsModel, OpenAITtsVoice, OpenAIRealtimeVoice,
  OpenAIRealtimeModel, OpenAIPlanningModel, OpenAIVisionModel, OpenAIDeveloperModel,
  RealtimeSessionConfig
} from "../../lib/types/index";

export interface FrameworkConfig {
  neo4jUri: any;
  emailFromAddress: string;
  appUrl: any;
  apiKey: any;
  supabaseAnonKey: any;
  supabaseUrl: any;
  upstashRedisToken: any;
  nodeEnv: any;
  upstashRedisUrl: any;
    embeddingDimension: number;
    openai: any;
    openaiApiKey: any;
  app: any;
  DEFAULTS: any;
  encryptionKey: string;
  allowDevUnauth: any;
  toolTimeoutMs: number;
  llm: {
    provider: "openai";
    planningModel: OpenAIPlanningModel;
    chatModel: OpenAILLMBalanced; // Used for response generation AND tool calling
    complexModel?: OpenAILLMComplex; // Optional: For very complex tasks if needed
    fastModel?: OpenAILLMFast; // Optional: Fallback or quick tasks
    extractionModel: OpenAILLMFast; // Specific model for info extraction
    developerModel?: OpenAIDeveloperModel; // For developer features like schema generation
    visionModel: OpenAIVisionModel; // Model capable of vision input
    ttsModel: OpenAITtsModel;
    sttModel: OpenAISttModel;
    realtimeModel: OpenAIRealtimeModel;
    realtimeSttModel: OpenAISttModel; // STT model used within realtime sessions
    apiKey: string;
    enableVision: boolean;
    temperature?: number; // Default temperature for chat/response model
    maxTokens?: number; // Default max output tokens for chat/response model
    topP?: number;
    ttsDefaultVoice: OpenAITtsVoice; // Default voice for standard TTS
    ttsVoices: ReadonlyArray<OpenAITtsVoice>; // Available standard voices
    realtimeDefaultVoice: OpenAIRealtimeVoice; // Default voice for realtime
    realtimeVoices: ReadonlyArray<OpenAIRealtimeVoice>; // Available realtime voices
    realtimeVadConfig: RealtimeSessionConfig['turn_detection']; // VAD config for realtime
    realtimeTools?: OpenAI.Chat.Completions.ChatCompletionTool[] | null; // Tools available in realtime mode
    maxToolsPerTurn?: number; // Ajouté pour la configuration du nombre d'outils max par tour
    enableTtsPostProcessing?: boolean; // Ajouté pour TTS post-processing
    ttsTargetLoudnessDb?: number; // Ajouté pour TTS loudness
  };
  embedder: {
    provider: "openai";
    model: OpenAIEmbeddingModel;
    apiKey: string;
    dimensions: number;
  };
  vectorStore: {
    provider: "supabase";
    url: string;
    serviceKey: string; // Use SERVICE_ROLE_KEY for backend operations
    tableName: string; // e.g., 'memories'
    cacheTableName: string; // e.g., 'external_content_cache'
    embeddingDimension: number; // MUST match embedder.dimensions
    matchFunctionName: string; // e.g., 'match_memories_v2'
    matchCacheFunctionName: string; // e.g., 'match_external_content_cache'
    ftsConfiguration: string; // e.g., 'english' or 'simple'
    // Table names for related data
    personasTableName: string; // e.g., 'personas' (predefined)
    userPersonasTableName: string; // e.g., 'user_personas'
    userIntegrationsTableName: string; // e.g., 'user_integrations'
    userStatesTableName: string; // e.g., 'user_states'
    userProfilesTableName: string; // e.g., 'user_profiles'
    userPushSubscriptionsTableName: string; // e.g., 'user_push_subscriptions'
    // Add other tables if needed (e.g., interaction_logs, message_likes)
  };
  graphStore: {
    provider: "neo4j";
    url: string;
    username: string;
    password: string;
  };
  cache: {
    provider: "upstash_redis" | "none";
    url: string;
    token: string;
    embeddingCacheTTLSeconds: number;
    searchCacheTTLSeconds: number;
    extractionCacheTTLSeconds: number;
  };
  semanticCache: { // Config for caching external tool results based on query similarity
    enabled: boolean;
    similarityThreshold: number; // Min similarity score (0-1) to consider a cache hit
    defaultLimit: number; // How many similar cache entries to retrieve for checking
    // TTLs per result type (in seconds)
    defaultTTL: number;
    productTTL: number; videoTTL: number; imageTTL: number; recipeTTL: number;
    weatherTTL: number; placeTTL: number; gifTTL?: number; // Gif support optional
    factTTL: number; // calculation_or_fact
    newsTTL: number; sportsTTL: number; eventTTL: number; tiktokTTL?: number; // TikTok optional
    calendarTTL: number; emailTTL: number; taskTTL: number; reminderTTL: number;
    calculation_or_factTTL?: number; // Alias for factTTL
    // Add TTLs for any new tool result types
  };
  memory: {
    searchDefaultLimit: number;
    extractionModel: OpenAILLMFast; // Model specifically for memory extraction (can be same as main extraction)
    addMemoryOnFailure?: boolean; // Add error summaries to memory?
  };
   notifications: {
       vapidPublicKey: string | null; // NEXT_PUBLIC_VAPID_PUBLIC_KEY
       vapidPrivateKey: string | null; // VAPID_PRIVATE_KEY (server only)
       vapidSubject: string; // VAPID_SUBJECT (mailto:...)
   };
  defaultCategories: string[]; // Predefined list for memory categorization
  conflictResolutionStrategy: "llm" | "prefer_new" | "use_latest_graph_ts" | "manual";
  hybridSearchEnabledDefault: boolean;
  graphSearchEnabledDefault: boolean;
  rerankEnabledDefault: boolean; // Placeholder for future reranking logic
  logLevel: "debug" | "info" | "warn" | "error";
  defaultLocale: string; // e.g., 'en-US'
  defaultUserName?: string; // Fallback user name
  defaultPersonaId?: string; // Default persona ID to use
  toolApiKeys: {
    serper?: string;
    youtube?: string;
    unsplash?: string;
    pexels?: string;
    openweathermap?: string;
    wolframalpha?: string;
    theSportsDb?: string;
    ticketmaster?: string;
    googleClientId?: string;
    googleClientSecret?: string;
    googleRedirectUri?: string;
    gnews?: string;
    newsapiOrg?: string;
    resend?: string;
    [key: string]: string | undefined;
  };
}

// --- Type Guards ---
export function isStructuredContent( content: string | MessagePart[] | null ): content is MessagePart[] {
  return Array.isArray(content);
}
export interface GraphSearchResult { memory_id: string; score: number; latestUpdate: string; } // Adjusted structure