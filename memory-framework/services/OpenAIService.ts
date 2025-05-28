// FILE: memory-framework/services/OpenAIService.ts
import OpenAI from "openai";
import {
  FrameworkConfig,
  ExtractedInfo,
  MemoryFrameworkMessage,
  SearchResult,
  LatestGraphInfo,
  // ReminderDetails, // ReminderDetails is part of ExtractedInfo via metadata
} from "../core/types";
import // ResponseApiInputMessage, // No longer directly used here, llm_clients handles formatting
// ResponseApiInputContent, // No longer directly used here
// AnyToolStructuredData, // Not directly used in this service's methods
// UserState, // Not directly used in this service's methods
"@/lib/types/index";
import { safeJsonParse } from "../core/utils";
import { CacheService } from "./CacheService";
import { logger, config as frameworkConfigInternal } from "../config";
import { ENTITY_EXTRACTION_SCHEMA_OPENAI, CORE_MEMORY_SYSTEM_PROMPT } from "../../lib/prompts";
import { supabaseAdmin } from "../../lib/supabaseClient";
// Import the refactored LLM client functions
import {
  generateStructuredJson,
  generateEmbeddingLC,
  // generateAgentResponse, // Not directly used by OpenAIService methods, but by consumers
  // generateResponseWithIntent, // Not directly used by OpenAIService methods
} from "../../lib/providers/llm_clients"; // Adjusted path

// Utility to get model names with fallbacks
function getModelWithFallback(configSetting: string | undefined, defaultValue: string): string {
  return configSetting && typeof configSetting === 'string' ? configSetting : defaultValue;
}

// Cache key helpers 
function createEmbeddingCacheKey(text: string): string {
  // Use a prefix + first 50 chars + length as a cache key
  return `embedding:${text.substring(0, 50)}:${text.length}`;
}

export class OpenAIService {
  private openai: OpenAI; // Still keep the raw client instance if needed for other direct calls not covered by llm_clients
  private config: FrameworkConfig["llm"] & {
    embedderModel: string;
    embeddingDims: number;
  };
  private cacheService: CacheService;
  private embeddingCacheTTL: number;
  private extractionCacheTTL: number;
  private conflictResolutionStrategy: FrameworkConfig["conflictResolutionStrategy"];

  constructor(frameworkConfig: FrameworkConfig, cacheService: CacheService) {
    if (!frameworkConfig.llm.apiKey) {
      throw new Error("OpenAI API Key is required for OpenAIService");
    }
    // Initialize the raw client from llm_clients.ts instead of a new one.
    // This ensures consistency if the raw client from llm_clients.ts has specific configurations.
    // However, since llm_clients.ts now exports its own `openai` instance (as rawOpenAiClient),
    // and this service's methods will primarily call functions from llm_clients.ts,
    // the direct `this.openai` might become less used or could be removed if all
    // OpenAI interactions are routed through the abstracted functions in llm_clients.
    // For now, keep it for potential direct SDK usage if any remains or is added.
    this.openai = new OpenAI({
      // Standard initialization
      apiKey: frameworkConfig.llm.apiKey,
      maxRetries: 3,
      timeout: 60 * 1000,
    });

    this.config = {
      ...frameworkConfig.llm,
      embedderModel: frameworkConfig.embedder.model,
      embeddingDims: frameworkConfig.embedder.dimensions,
    };
    this.cacheService = cacheService;
    this.embeddingCacheTTL = frameworkConfig.cache.embeddingCacheTTLSeconds;
    this.extractionCacheTTL = frameworkConfig.cache.extractionCacheTTLSeconds;
    this.conflictResolutionStrategy =
      frameworkConfig.conflictResolutionStrategy;

    logger.info("OpenAIService initialized for Memory Framework.");
    logger.info(
      `-> Using Extraction Model (via llm_clients): ${this.config.extractionModel}`
    );
    logger.info(
      `-> Using Embedding Model (via llm_clients): ${this.config.embedderModel} (Dims: ${this.config.embeddingDims})`
    );
    logger.info(
      `-> Using General/Response Model (via llm_clients): ${this.config.chatModel}`
    );
    logger.info(`-> Conflict Strategy: ${this.conflictResolutionStrategy}`);
    logger.info(`-> Vision Enabled (Config): ${this.config.enableVision}`);
  }

  // --- Helper formatMessagesForResponsesApi removed, llm_clients.ts will handle this internally ---

  // --- LLM Methods ---

  /** Extracts structured information using the Responses API with JSON schema via generateStructuredJson. */
  async extractInfo(
    conversationTurn: MemoryFrameworkMessage[], // This is ChatMessage[] from our types
    contextMemories: string[], // Context strings might be less useful now with direct LLM calls
    userId: string,
    availableCategories: string[]
  ): Promise<ExtractedInfo | null> {
    const modelForExtraction = getModelWithFallback(
      this.config.extractionModel,
      "gpt-4o-mini" // Default model
    );

    // Get username for personalization
    let userName = userId;
    try {
      // Try to extract display name from userId if it looks like an email
      if (userId.includes("@")) {
        userName = userId.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
        if (userName.length < 2) userName = userId; // Fallback if too short
      }
    } catch (e) {
      logger.warn(`[OpenAIService extractInfo] Error extracting username: ${e}`);
    }

    // Create cache key and check if we have a cached result
    const cachePrefix = `extraction:${modelForExtraction}:`;
    const cacheInput = JSON.stringify(conversationTurn);
    const cachedResult = await this.cacheService.get<ExtractedInfo>(cachePrefix, cacheInput);
    if (cachedResult) {
      logger.info(`[OpenAIService extractInfo] Cache hit for User: ${userId.substring(0, 8)}`);
      return cachedResult;
    }

    // Prepare context and category list
    const contextString = contextMemories && contextMemories.length > 0
        ? contextMemories.join("\n\n")
        : "";
    const categoryListString = availableCategories.join(", ");
    const currentDate = new Date().toISOString();

    // Use the enhanced CORE_MEMORY_SYSTEM_PROMPT with important context variables
    const systemPromptForExtraction = CORE_MEMORY_SYSTEM_PROMPT + `

Today's date is ${currentDate}.
User name: ${userName}
Available categories: [${categoryListString}]

JSON Schema for Output is named '${ENTITY_EXTRACTION_SCHEMA_OPENAI.name}' and is defined as:
\`\`\`json
${JSON.stringify(ENTITY_EXTRACTION_SCHEMA_OPENAI.schema, null, 2)}
\`\`\`

Referential Context (Use ONLY for understanding, NOT extraction):
${contextString}
---
NEW CONVERSATION TURN (Extract ONLY from this):`;

    // Filter and prepare the actual user input part of the conversation for the userPrompt
    const userTurnMessages = conversationTurn
      .filter((turn) => turn.role === "user" || turn.role === "assistant") // Consider assistant's last response too for context?
      .map((turn) => {
        if (typeof turn.content === "string") return turn.content;
        if (Array.isArray(turn.content)) {
          return turn.content
            .map((part: any) => {
              if (part.type === "text") return part.text;
              if (part.type === "image_url")
                return `[Image: ${part.image_url.url.substring(0, 30)}...]`; // Simple placeholder
              return "";
            })
            .join(" ");
        }
        return "";
      })
      .join("\n\n");

    if (!userTurnMessages.trim()) {
      logger.warn(
        `[OpenAIService extractInfo] Extraction skipped for User ${userId.substring(
          0,
          8
        )}: No valid user/assistant content in conversation turn for userPrompt.`
      );
      return null;
    }

    logger.info(
      `[OpenAIService extractInfo] Calling generateStructuredJson (Model: ${modelForExtraction}) for User: ${userId.substring(
        0,
        8
      )}`
    );

    // Call the refactored generateStructuredJson from llm_clients
    const extractionResult = await generateStructuredJson<ExtractedInfo>(
      systemPromptForExtraction, // This becomes the 'instructions' or part of 'developer' message in llm_clients
      userTurnMessages, // This is the primary 'user' message content
      ENTITY_EXTRACTION_SCHEMA_OPENAI.schema,
      ENTITY_EXTRACTION_SCHEMA_OPENAI.name,
      [], // History is not directly passed here as system/user prompts are constructed
      modelForExtraction,
      userId
    );

    if ("error" in extractionResult) {
      logger.error(
        `[OpenAIService extractInfo] Extraction failed (User ${userId.substring(
          0,
          8
        )}, Model ${modelForExtraction}): ${extractionResult.error}`
      );
      return null;
    }

    // The result from generateStructuredJson should already be the parsed ExtractedInfo object
    const extracted = extractionResult;

    // Reminder Validation (remains similar)
    if (extracted.metadata?.reminder_details) {
      const reminder = extracted.metadata.reminder_details;
      if (
        reminder.is_reminder !== true ||
        typeof reminder.original_content !== "string" ||
        !reminder.original_content ||
        typeof reminder.trigger_datetime !== "string" ||
        !/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/.test(
          reminder.trigger_datetime
        ) ||
        reminder.status !== "pending"
      ) {
        logger.warn(
          `[OpenAIService extractInfo] Invalid reminder structure. Discarding. User: ${userId.substring(
            0,
            8
          )}`,
          reminder
        );
        delete extracted.metadata.reminder_details;
      } else {
        logger.info(
          `[OpenAIService extractInfo] Valid reminder identified for User: ${userId.substring(
            0,
            8
          )}: "${reminder.original_content.substring(0, 30)}..."`
        );
      }
    } else {
      logger.debug(
        `[OpenAIService extractInfo] No reminder identified. User: ${userId.substring(
          0,
          8
        )}`
      );
    }

    // Language Detection Update
    if (extracted.detected_language) {
      if (!extracted.metadata) extracted.metadata = {};
      extracted.metadata.detected_language = extracted.detected_language;
      logger.debug(
        `[OpenAIService extractInfo] Detected language ${
          extracted.detected_language
        } stored in metadata. User: ${userId.substring(0, 8)}`
      );
    } else {
      logger.debug(
        `[OpenAIService extractInfo] Language not explicitly detected. User: ${userId.substring(
          0,
          8
        )}`
      );
    }

    await this.cacheService.set(
      cachePrefix,
      cacheInput,
      extracted,
      this.extractionCacheTTL
    );
    return extracted;
  }

  /** Resolves conflicting information based on configured strategy. */
  async resolveConflict(
    newFact: string,
    conflictingMemory: SearchResult,
    latestGraphInfo: LatestGraphInfo | null
  ): Promise<string | null> {
    const userId = conflictingMemory.user_id;
    const logPrefix = `[OpenAIService ConflictResolve User:${userId.substring(
      0,
      8
    )}]`;
    logger.warn(
      `${logPrefix} Conflict: New="${newFact.substring(
        0,
        100
      )}..." vs Existing(M:${conflictingMemory.memory_id.substring(
        0,
        8
      )})="${conflictingMemory.content.substring(0, 100)}..."`
    );

    if (this.conflictResolutionStrategy === "use_latest_graph_ts") {
      // ... (logic remains the same)
      if (latestGraphInfo) {
        if (conflictingMemory.memory_id === latestGraphInfo.source_memory_id) {
          logger.info(
            `${logPrefix} Graph indicates existing memory M:${conflictingMemory.memory_id.substring(
              0,
              8
            )} is latest. Discarding new fact.`
          );
          return null;
        } else {
          logger.info(
            `${logPrefix} Graph's latest info (M:${latestGraphInfo.source_memory_id.substring(
              0,
              8
            )}) doesn't match conflicting memory (M:${conflictingMemory.memory_id.substring(
              0,
              8
            )}). Preferring new fact.`
          );
          return newFact;
        }
      } else {
        logger.info(
          `${logPrefix} No relevant graph timestamp info. Preferring new fact.`
        );
        return newFact;
      }
    } else if (this.conflictResolutionStrategy === "llm") {
      logger.warn(
        `${logPrefix} LLM conflict resolution strategy not yet fully implemented with Responses API in OpenAIService.`
      );
      // Placeholder: prefer new for now.
      // If generateResponseWithIntent from llm_clients.ts is adapted to produce structured output for this, it could be used.
      // For now, it's simpler to default to prefer_new here.
      /*
      const systemPrompt = `You are an AI assistant resolving a data conflict for user ${userId}.
        Existing Memory: "${conflictingMemory.content}" (Last updated: ${conflictingMemory.updated_at})
        New Information: "${newFact}" (From current interaction)
        Task: Decide which piece of information is more likely to be correct or relevant now. Respond ONLY with a JSON object: {"action": "keep_existing" | "use_new" | "needs_clarification", "reasoning": "Brief explanation", "question": "Question for user if needed"}.`;
      const userPrompt = "Resolve the conflict based on the provided data.";
      const conflictSchema = { type: "object", properties: { action: { type: "string", enum: ["keep_existing", "use_new", "needs_clarification"] }, reasoning: { type: "string" }, question: { type: ["string", "null"] }}, required: ["action", "reasoning"] };
      
      const llmDecision = await generateStructuredJson<any>(
          systemPrompt, // instructions
          userPrompt,   // input
          conflictSchema, 
          "conflict_resolution_schema", 
          [], 
          this.config.fastModel || this.config.extractionModel, // Use a fast model
          userId
      );
      if (!("error" in llmDecision) && llmDecision) {
          if (llmDecision.action === 'use_new') return newFact;
          if (llmDecision.action === 'keep_existing') return null;
          // Handle needs_clarification if you want to prompt user
          logger.info(`${logPrefix} LLM conflict resolution needs clarification or had unexpected action: ${llmDecision.action}. Defaulting to new fact.`);
      } else {
          logger.error(`${logPrefix} LLM conflict resolution failed: ${("error" in llmDecision) ? llmDecision.error : 'Unknown error'}. Defaulting to new fact.`);
      }
      */
      return newFact;
    }
    // Default to 'prefer_new'
    logger.info(
      `${logPrefix} Strategy is '${this.conflictResolutionStrategy}'. Using new fact.`
    );
    return newFact;
  }

  // --- Embedder Methods (using generateEmbeddingLC from llm_clients) ---
  async getEmbedding(text: string): Promise<number[] | null> {
    if (!text?.trim()) {
      logger.warn("[OpenAIService Embed] Skipped: input text is empty.");
      return null;
    }
    const model = this.config.embedderModel; // This is text-embedding-3-small
    const dimensions = this.config.embeddingDims; // This is 1536
    const cachePrefix = `embedding:${model}:${dimensions}`; // Cache key includes model and dimensions
    const cacheInput = text;

    const cachedEmbedding = await this.cacheService.get<number[]>(
      cachePrefix,
      cacheInput
    );
    if (cachedEmbedding) {
      if (cachedEmbedding.length === dimensions) {
        logger.debug(`[OpenAIService Embed] Embedding cache HIT`);
        return cachedEmbedding;
      } else {
        logger.warn(
          `[OpenAIService Embed] Cached embedding dim mismatch (Expected: ${dimensions}, Found: ${cachedEmbedding.length}). Fetching fresh.`
        );
        await this.cacheService.delete(cachePrefix, cacheInput);
      }
    }
    logger.debug(`[OpenAIService Embed] Embedding cache MISS`);

    const embeddingResult = await generateEmbeddingLC(text); // Uses EMBEDDING_MODEL_NAME and EMBEDDING_DIMENSIONS from llm_clients

    if ("error" in embeddingResult) {
      logger.error(
        `[OpenAIService Embed] Failed via llm_clients: ${embeddingResult.error}`
      );
      return null;
    }

    // generateEmbeddingLC should already ensure correct dimension or return error
    await this.cacheService.set(
      cachePrefix,
      cacheInput,
      embeddingResult,
      this.embeddingCacheTTL
    );
    return embeddingResult;
  }

  async getEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!texts || texts.length === 0) return [];
    const results: (number[] | null)[] = new Array(texts.length).fill(null);

    // Batching logic with generateEmbeddingLC (which calls OpenAI one by one but can be parallelized client-side)
    const promises = texts.map(async (text, index) => {
      if (!text?.trim()) {
        results[index] = null;
        return;
      }
      const embedding = await this.getEmbedding(text); // Uses caching internally
      results[index] = embedding;
    });

    await Promise.all(promises);
    logger.debug(
      `[OpenAIService Embed Batch] Processed ${texts.length} texts (individual calls with caching).`
    );
    return results;
  }
}
