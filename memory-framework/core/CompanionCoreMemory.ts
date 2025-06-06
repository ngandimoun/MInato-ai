// FILE: memory-framework/core/CompanionCoreMemory.ts
// (Content from finalcodebase.txt - verified)

import { config as frameworkAppConfig, logger } from "../config";
import { OpenAIService } from "../services/OpenAIService";
import { SupabaseService } from "../services/SupabaseService";
import { Neo4jService } from "../services/Neo4jService";
import { CacheService } from "../services/CacheService";
import {
  FrameworkConfig, MemoryFrameworkMessage, StoredMemoryUnit, SearchResult, ExtractedInfo,
  BaseMemoryUnit, PaginationParams, PaginatedResults, SearchOptions, LatestGraphInfo,
  GraphSearchResult, ExternalContentCacheEntry, PredefinedPersona, UserPersona,
  ReminderDetails
} from "./types";
import { generateUUID, getCurrentISOTimestamp, safeJsonParse, generateStableCacheKey } from "./utils";
import { AnyToolStructuredData } from "@/lib/types";
import { supabaseAdmin as rawSupabaseAdminClient } from "@/lib/supabaseClient"; // Use the direct admin client


const TASK_MEMORY_CATEGORY = "task";
const TASK_STATUS_PENDING = "pending";
const TASK_STATUS_COMPLETED = "completed";

export class CompanionCoreMemory {
  public config: FrameworkConfig;
  public openAIService: OpenAIService;
  public supabaseService: SupabaseService;
  public neo4jService: Neo4jService;
  public cacheService: CacheService;


  constructor(customConfig?: Partial<FrameworkConfig>) {
    this.config = { ...frameworkAppConfig, ...customConfig };


    if (this.config.embedder.dimensions !== this.config.vectorStore.embeddingDimension) {
      throw new Error(`Configuration mismatch: Embedder dimension (${this.config.embedder.dimensions}) differs from Vector Store dimension (${this.config.vectorStore.embeddingDimension})`);
    }
    logger.info(`[Memory Framework] Effective Extraction Model: ${this.config.llm.extractionModel}`);


    this.cacheService = new CacheService(this.config);
    this.supabaseService = new SupabaseService(this.config);
    this.openAIService = new OpenAIService(this.config, this.cacheService);
    this.neo4jService = new Neo4jService(this.config);


    logger.info("CompanionCore Memory Framework Initialized.");
  }


  // --- Core Memory Operations ---
  async add_memory(
    conversationTurn: MemoryFrameworkMessage[],
    userId: string, 
    runId: string | null = null,
    discoveredContentFact?: string | null
  ): Promise<boolean> {
    const turnIdentifier = `User: ${userId?.substring(0, 8) || "N/A"}, Run: ${runId?.substring(0, 8) || "Global"}`;
    const logPrefix = `ADD_MEMORY (${turnIdentifier})`;
    const hasDiscoveryFact = !!discoveredContentFact?.trim();
    const hasConversation = conversationTurn?.length > 0;


    logger.info(`${logPrefix} Start ${hasDiscoveryFact ? "(with discovery fact)" : ""} ${hasConversation ? "(with conversation)" : ""}`);


    if (!userId || typeof userId !== 'string') {
      logger.error(`${logPrefix}: userId required.`);
      return false;
    }
    if (!hasConversation && !hasDiscoveryFact) {
      logger.warn(`${logPrefix}: Empty turn and no discovery fact provided. Nothing to store.`);
      return true;
    }


    let extractedInfo: ExtractedInfo | null = null;
    let hasMeaningfulExtraction = false;
    let detectedLanguage: string | null = null;


    if (hasConversation) {
      logger.debug(`${logPrefix}: Extracting info using ${this.config.llm.extractionModel}...`);
      try {
        const filteredTurn = conversationTurn.filter(turn => turn.role === 'user' || turn.role === 'assistant');
        extractedInfo = await this.openAIService.extractInfo(
          filteredTurn, [], userId, this.config.defaultCategories || []
        );
      } catch (extractionError: any) {
        logger.error(`${logPrefix}: Extraction failed: ${extractionError.message}`);
        if (!hasDiscoveryFact) return false;
      }


      if (extractedInfo) {
        const hasFacts = extractedInfo.facts?.length > 0;
        const hasGraphData = extractedInfo.entities?.length > 0 || extractedInfo.relationships?.length > 0;
        const hasSummary = !!extractedInfo.summary?.trim();
        detectedLanguage = extractedInfo.detected_language || extractedInfo.metadata?.detected_language || null;
        hasMeaningfulExtraction = hasFacts || hasGraphData || hasSummary || !!extractedInfo.metadata?.reminder_details;
        logger.debug(
          `${logPrefix}: Extraction Results - Facts:${hasFacts}, Graph:${hasGraphData}, Summary:${hasSummary}, Reminder:${!!extractedInfo.metadata?.reminder_details}, Lang:${detectedLanguage || "N/A"}`
        );
      } else {
        logger.info(`${logPrefix}: No significant info extracted from conversation turn.`);
      }
    } else {
      logger.debug(`${logPrefix}: No conversation turn provided, processing only discovery fact (if any).`);
    }


    let snippetsToEmbed: string[] = [];
    if (hasMeaningfulExtraction && extractedInfo) {
        snippetsToEmbed = extractedInfo.facts?.length > 0 ? extractedInfo.facts : [];
        if (snippetsToEmbed.length === 0 && extractedInfo.summary) {
            snippetsToEmbed.push(extractedInfo.summary);
        }
        if (snippetsToEmbed.length === 0 && extractedInfo.metadata?.reminder_details?.original_content) {
            snippetsToEmbed.push(`Reminder: ${extractedInfo.metadata.reminder_details.original_content}`);
             logger.debug(`${logPrefix}: Using reminder content for embedding.`);
        }
    }


    const trimmedDiscoveryFact = discoveredContentFact?.trim();
    if (trimmedDiscoveryFact) {
      snippetsToEmbed.push(trimmedDiscoveryFact);
      logger.debug(`${logPrefix}: Added discovery fact for embedding: "${trimmedDiscoveryFact.substring(0, 50)}..."`);
    }


    if (snippetsToEmbed.length === 0) {
      logger.warn(`${logPrefix}: No content available for embedding or storage.`);
      if (extractedInfo && (extractedInfo.entities?.length || extractedInfo.relationships?.length)) {
        logger.error(`${logPrefix}: Graph data extracted but no text snippet for anchoring. Graph data may be lost or unlinked.`);
        // Allow proceeding if only graph data is present, but log it.
        // It might be linked later or exist as standalone graph entities.
        // However, for consistency, we might prefer to always have an anchor memory.
        // If it's critical to always have an anchor, return false here.
        // For now, let's allow it and see how Neo4j handles it.
      } else {
        return true; // No snippets and no graph data, so nothing to do.
      }
    }


    logger.debug(`${logPrefix}: Generating ${snippetsToEmbed.length} embeddings...`);
    const embeddings = snippetsToEmbed.length > 0 ? await this.openAIService.getEmbeddings(snippetsToEmbed) : [];
    let primaryMemoryIdForGraph: string | undefined = undefined;


    if (snippetsToEmbed.length > 0 && (!embeddings || embeddings.length === 0 || embeddings.length !== snippetsToEmbed.length)) {
      logger.error(`${logPrefix}: Embeddings generation failed or returned incorrect count for actual snippets.`);
      if (extractedInfo && (extractedInfo.entities?.length || extractedInfo.relationships?.length)) {
          logger.error(`${logPrefix}: Embedding failure prevents linking of associated graph data.`);
      }
      return false;
    }


    const memoryUnitsToStore: StoredMemoryUnit[] = [];
    const now = getCurrentISOTimestamp();


    for (let i = 0; i < snippetsToEmbed.length; i++) {
      const embedding = embeddings[i]; // Will be null if embedding failed for this snippet
      const contentSnippet = snippetsToEmbed[i];
      const isPrimarySnippet = i === 0;
      const isDiscoveryFactSnippet = hasDiscoveryFact && (contentSnippet === trimmedDiscoveryFact);
      const isReminderSnippet = isPrimarySnippet && extractedInfo?.metadata?.reminder_details && contentSnippet.startsWith("Reminder:");


      if (contentSnippet) {
        const memoryId = generateUUID();
        if (isPrimarySnippet) primaryMemoryIdForGraph = memoryId;


        let metadataForUnit: StoredMemoryUnit["metadata"] = {};
        let categoriesForUnit: string[] = [];


        if (isPrimarySnippet && extractedInfo) {
            metadataForUnit = { ...(extractedInfo.metadata || {}) };
            if (extractedInfo.sentiment) metadataForUnit.sentiment = extractedInfo.sentiment;
            if (extractedInfo.topics?.length) metadataForUnit.topics = extractedInfo.topics;
            categoriesForUnit = isReminderSnippet ? [TASK_MEMORY_CATEGORY, "reminder"] : (extractedInfo.categories?.length ? extractedInfo.categories : []);
        }
        if (isDiscoveryFactSnippet) {
            metadataForUnit.is_discovery_interaction = true;
            if (!categoriesForUnit.includes("discovery_interaction")) {
                categoriesForUnit.push("discovery_interaction");
            }
        }


        memoryUnitsToStore.push({
          memory_id: memoryId,
          user_id: userId,
          run_id: runId,
          content: contentSnippet,
          embedding: embedding, // This can be null if individual embedding failed but others succeeded
          metadata: metadataForUnit,
          categories: categoriesForUnit,
          language: detectedLanguage || undefined,
          source_turn_ids: undefined,
          created_at: now,
          updated_at: now,
          expires_at: null,
          role: "user", 
        });
      } else {
        logger.warn(`${logPrefix}: Skipping memory unit creation for empty snippet index ${i}.`);
         if (isPrimarySnippet) {
             primaryMemoryIdForGraph = undefined;
             logger.error(`${logPrefix}: Primary snippet invalid. Graph data cannot be linked.`);
         }
      }
    }


    if (!primaryMemoryIdForGraph && memoryUnitsToStore.length > 0 && extractedInfo && (extractedInfo.entities?.length || extractedInfo.relationships?.length)) {
        primaryMemoryIdForGraph = memoryUnitsToStore[0].memory_id;
        logger.warn(`${logPrefix}: Primary snippet failed, linking graph data to next available memory: ${primaryMemoryIdForGraph.substring(0, 8)}`);
    }


    let supabaseSuccess = true;
    if (memoryUnitsToStore.length > 0) {
        logger.debug(`${logPrefix}: Attempting to insert ${memoryUnitsToStore.length} units into Supabase...`);
        supabaseSuccess = await this.supabaseService.insertMemoryUnits(memoryUnitsToStore);
        if (!supabaseSuccess) {
          logger.error(`${logPrefix}: Failed Supabase insert. Aborting associated graph update.`);
          return false;
        }
    } else {
        logger.info(`${logPrefix}: No textual memory units to store in Supabase.`);
        // If only graph data exists, we need a way to anchor it or store it differently.
        // For now, if no text memory units, graph data might be lost if it requires an anchor.
        // However, if primaryMemoryIdForGraph was set because we *expect* to store a graph-only representation,
        // this logic might need adjustment. Current flow assumes text memories are primary.
        if (!primaryMemoryIdForGraph && extractedInfo && (extractedInfo.entities?.length || extractedInfo.relationships?.length)) {
            logger.warn(`${logPrefix}: Graph data extracted but no text memories stored. Graph data may be unlinked if it requires a Memory node anchor.`);
            // If you want to create a "placeholder" memory for graph data:
            // primaryMemoryIdForGraph = generateUUID();
            // And then insert a minimal memory unit for it or adapt Neo4jService.
        }
    }


    const hasGraphData = !!(extractedInfo && (extractedInfo.entities?.length || extractedInfo.relationships?.length));
    let graphSuccess = true; // Assume success if no graph data
    if (primaryMemoryIdForGraph && hasGraphData && extractedInfo) {
      logger.debug(`${logPrefix}: Attempting to store graph data linked to memory ${primaryMemoryIdForGraph.substring(0, 8)}...`);
      try {
        graphSuccess = await this.neo4jService.storeGraphData(userId, runId, primaryMemoryIdForGraph, extractedInfo);
        if (!graphSuccess) logger.error(`${logPrefix}: Failed to store graph data for memory ${primaryMemoryIdForGraph}. Vector data WAS stored.`);
        else logger.debug(`${logPrefix}: Graph data storage successful for memory ${primaryMemoryIdForGraph.substring(0, 8)}.`);
      } catch (graphError: any) {
        logger.error(`${logPrefix}: Exception storing graph data for memory ${primaryMemoryIdForGraph}: ${graphError.message}`);
        graphSuccess = false;
      }
    } else if (hasGraphData && !primaryMemoryIdForGraph) {
      logger.error(`${logPrefix}: Graph data extracted but could not be stored (no anchor memory ID).`);
      graphSuccess = false;
    } else {
      logger.debug(`${logPrefix}: No graph data extracted to store.`);
    }


    logger.info(`${logPrefix} Finished. Vector Store Success: ${supabaseSuccess}, Graph Store Success: ${graphSuccess}. Stored ${memoryUnitsToStore.length} memory unit(s).`);
    return supabaseSuccess && graphSuccess; // Overall success depends on both if graph data was present
  }


  async search_memory(
    query: string,
    userId: string, 
    pagination: PaginationParams,
    runId: string | null = null,
    options?: SearchOptions | null,
    personaContext?: { traits?: string[]; preferredTools?: string[]; avoidTools?: string[]; style?: string; tone?: string }
  ): Promise<PaginatedResults<SearchResult>> {
    const defaultResult: PaginatedResults<SearchResult> = { results: [], limit: pagination.limit, offset: pagination.offset, total_estimated: 0 };
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) { logger.warn("Search memory skipped: Empty query."); return defaultResult; }
    if (!userId) { logger.error("Search memory failed: userId required."); return defaultResult; }


    const effectiveOptions: Required<Omit<SearchOptions, "filters"> & { filters: Record<string, any> | null }> = {
      enableHybridSearch: options?.enableHybridSearch ?? this.config.hybridSearchEnabledDefault,
      enableGraphSearch: options?.enableGraphSearch ?? this.config.graphSearchEnabledDefault,
      enableConflictResolution: options?.enableConflictResolution ?? (this.config.conflictResolutionStrategy === 'use_latest_graph_ts'),
      rerank: options?.rerank ?? this.config.rerankEnabledDefault,
      filters: options?.filters ?? null,
      vectorWeight: options?.vectorWeight ?? 0.7,
      keywordWeight: options?.keywordWeight ?? 0.3,
      graphWeight: options?.graphWeight ?? 0.6,
      exclude_expired: options?.exclude_expired ?? false, // Default changed to false for explicit control
      fts_configuration: options?.fts_configuration || this.config.vectorStore.ftsConfiguration || "english"
    };
    const turnIdentifier = `Search Mem User:${userId.substring(0, 8)}, Run:${runId?.substring(0, 8) || "G"}`;
    logger.info(`${turnIdentifier}: Query="${trimmedQuery.substring(0, 50)}...", Limit:${pagination.limit}, Offset:${pagination.offset}`);
    logger.debug(`${turnIdentifier}: Options=`, effectiveOptions);


    const cachePrefix = `internal_mem_search_v2:${userId}:${runId || "global"}`;
    const cacheInput = { query: trimmedQuery, pagination, opts: effectiveOptions };
    // const cacheKey = generateStableCacheKey(cachePrefix, cacheInput); // Cache key not used directly with cacheService.get
    if (this.config.cache.searchCacheTTLSeconds > 0) {
      const cachedSearch = await this.cacheService.get<PaginatedResults<SearchResult>>(cachePrefix, cacheInput);
      if (cachedSearch) { logger.info(`${turnIdentifier}: Internal Memory Cache HIT`); return cachedSearch; }
      logger.info(`${turnIdentifier}: Internal Memory Cache MISS`);
    }


    const queryEmbedding = await this.openAIService.getEmbedding(trimmedQuery);
    if (!queryEmbedding) {
        logger.warn(`${turnIdentifier}: Query embedding failed. Proceeding with keyword/graph search only.`);
        effectiveOptions.vectorWeight = 0;
        if (!effectiveOptions.enableHybridSearch) {
            logger.error(`${turnIdentifier}: Embedding failed and hybrid search disabled. Cannot perform vector search.`);
            return defaultResult;
        }
    }


    const initialFetchLimit = Math.max(pagination.limit * 3, 20);
    const initialOffset = 0;


     const supabaseFilters = { ...(effectiveOptions.filters || {}) };
     if (supabaseFilters.metadata && typeof supabaseFilters.metadata !== 'object') {
          logger.warn(`${turnIdentifier}: Invalid metadata filter format, ignoring.`);
          delete supabaseFilters.metadata;
     }
     supabaseFilters.vector_weight = effectiveOptions.vectorWeight;
     supabaseFilters.keyword_weight = effectiveOptions.keywordWeight;
     supabaseFilters.exclude_expired_filter = effectiveOptions.exclude_expired;
     supabaseFilters.fts_configuration = effectiveOptions.fts_configuration;


    const searchPromises: [
      Promise<PaginatedResults<SearchResult>>,
      Promise<PaginatedResults<GraphSearchResult> | null>
    ] = [
      this.supabaseService.combinedMemorySearch(
        queryEmbedding,
        effectiveOptions.enableHybridSearch ? trimmedQuery : "",
        { limit: initialFetchLimit, offset: initialOffset },
        userId, runId, supabaseFilters
      ),
      effectiveOptions.enableGraphSearch
        ? (async () => {
            const potentialEntities = trimmedQuery.split(/\s+/).filter(w => w.length > 2 && /^[A-Z]/.test(w));
            if (potentialEntities.length === 0 && trimmedQuery.length > 0) potentialEntities.push(trimmedQuery);
            if (potentialEntities.length > 0) {
              logger.debug(`${turnIdentifier}: Performing graph search for entities: ${potentialEntities.join(", ")}`);
              return this.neo4jService.searchGraph(userId, potentialEntities, { limit: initialFetchLimit, offset: initialOffset });
            }
            logger.debug(`${turnIdentifier}: Skipping graph search - no potential entities derived.`);
            return null;
          })()
        : Promise.resolve(null),
    ];


    const [dbSearchResults, graphSearchResults] = await Promise.all(searchPromises);
    logger.info(`${turnIdentifier}: Supabase(mem) returned ${dbSearchResults.results.length}. Graph returned ${graphSearchResults?.results?.length ?? 0}.`);


    const combinedResultsMap = new Map<string, SearchResult>();
    let dbTotalEstimate = dbSearchResults.total_estimated ?? dbSearchResults.results.length;


    dbSearchResults.results.forEach((res) => {
        const score = res.final_score ?? (
            (res.vector_score ?? 0) * effectiveOptions.vectorWeight +
            (res.keyword_score ?? 0) * effectiveOptions.keywordWeight
        );
        combinedResultsMap.set(res.memory_id, { ...res, final_score: score });
    });


    let graphMemoriesToFetchIds: string[] = [];
    if (graphSearchResults?.results?.length) {
        logger.debug(`${turnIdentifier}: Fusing ${graphSearchResults.results.length} graph results...`);
        graphSearchResults.results.forEach((graphRes) => {
            const existing = combinedResultsMap.get(graphRes.memory_id);
            if (existing) {
                existing.graph_score = graphRes.score;
                existing.final_score = (
                    (existing.vector_score ?? 0) * effectiveOptions.vectorWeight +
                    (existing.keyword_score ?? 0) * effectiveOptions.keywordWeight +
                    (existing.graph_score ?? 0) * effectiveOptions.graphWeight
                );
            } else {
                graphMemoriesToFetchIds.push(graphRes.memory_id);
            }
        });
        logger.debug(`${turnIdentifier}: Identified ${graphMemoriesToFetchIds.length} memories to fetch details for based on graph results.`);
    }


    if (graphMemoriesToFetchIds.length > 0) {
        const fetchedGraphMemories: StoredMemoryUnit[] = [];
        for (const memId of graphMemoriesToFetchIds) {
            const memData = await this.supabaseService.fetchMemoryById(memId);
            if (memData) fetchedGraphMemories.push(memData);
            else logger.warn(`${turnIdentifier}: Failed to fetch details for graph-found memory ${memId}.`);
        }


        fetchedGraphMemories.forEach((mem) => {
            if (!combinedResultsMap.has(mem.memory_id)) {
                const graphRes = graphSearchResults?.results.find(g => g.memory_id === mem.memory_id);
                const graphScore = graphRes?.score ?? 0;
                combinedResultsMap.set(mem.memory_id, {
                    ...mem,
                    vector_score: null, keyword_score: null,
                    graph_score: graphScore,
                    final_score: graphScore * effectiveOptions.graphWeight,
                });
            }
        });
        dbTotalEstimate = Math.max(dbTotalEstimate, combinedResultsMap.size);
    }


    let finalRankedResults = Array.from(combinedResultsMap.values());
    finalRankedResults.sort((a, b) => (b.final_score ?? -Infinity) - (a.final_score ?? -Infinity));


    if (effectiveOptions.enableConflictResolution && finalRankedResults.some((r) => r.is_latest_fact === false)) {
      logger.info(`${turnIdentifier}: Conflict resolution flag detected. Potentially outdated facts present.`);
    }


    const paginatedFinalResults = finalRankedResults.slice(pagination.offset, pagination.offset + pagination.limit);


    const finalPaginatedResponse: PaginatedResults<SearchResult> = {
      results: paginatedFinalResults,
      limit: pagination.limit,
      offset: pagination.offset,
      total_estimated: dbTotalEstimate,
    };


    if (this.config.cache.searchCacheTTLSeconds > 0) {
      await this.cacheService.set(cachePrefix, cacheInput, finalPaginatedResponse, this.config.cache.searchCacheTTLSeconds);
    }


    logger.info(`${turnIdentifier}: Internal Memory Search Complete. Returning ${paginatedFinalResults.length}/${dbTotalEstimate} results.`);

    if (personaContext) {
      finalRankedResults = finalRankedResults.map(result => {
        let bias = 0;
        if (personaContext.preferredTools && result.categories) {
          for (const tool of personaContext.preferredTools) {
            if (result.categories.includes(tool)) bias += 0.15;
          }
        }
        if (personaContext.traits && result.metadata?.topics) {
          for (const trait of personaContext.traits) {
            if (Array.isArray(result.metadata.topics) && result.metadata.topics.includes(trait)) bias += 0.1;
          }
        }
        if (personaContext.avoidTools && result.categories) {
          for (const tool of personaContext.avoidTools) {
            if (result.categories.includes(tool)) bias -= 0.2;
          }
        }
        return { ...result, final_score: (result.final_score ?? 0) + bias };
      });
      finalRankedResults.sort((a, b) => (b.final_score ?? -Infinity) - (a.final_score ?? -Infinity));
    }

    // Re-paginate after persona context bias, if applied
    const finalBiasedPaginatedResults = finalRankedResults.slice(pagination.offset, pagination.offset + pagination.limit);
    return {
        ...finalPaginatedResponse,
        results: finalBiasedPaginatedResults, // Use the potentially re-sorted and re-paginated results
        total_estimated: finalRankedResults.length, // Update total_estimated based on the full biased list
    };
  }


  // --- Semantic Cache Operations ---
  async checkSemanticCache(
    queryText: string, queryEmbedding: number[], resultType?: string | null, language?: string | null, location?: string | null
  ): Promise<ExternalContentCacheEntry | null> {
    const logPrefix = "[MemFramework SemCache Check]";
    if (!this.config.semanticCache.enabled || this.config.semanticCache.similarityThreshold <= 0) {
      logger.debug(`${logPrefix} Skipping check (cache disabled or threshold <= 0).`); return null;
    }
    const searchResultType = resultType === "tiktok_video" ? "video" : resultType;
    logger.debug(`${logPrefix} Checking query: "${queryText.substring(0, 50)}...", Type:${searchResultType || "any"}, Lang:${language || "any"}, Loc:${location || "any"}`);


    try {
      const results = await this.supabaseService.searchExternalCache(
        queryEmbedding, this.config.semanticCache.similarityThreshold, this.config.semanticCache.defaultLimit,
        searchResultType, language, location
      );


      if (results && results.length > 0) {
        const bestMatch = results[0];
        if (resultType === "tiktok_video" && !bestMatch.source_api?.toLowerCase().includes("tiktok")) {
          logger.info(`${logPrefix} Cache HIT, but result type mismatch (wanted TikTok, got ${bestMatch.source_api}). Treating as MISS.`);
          return null;
        }
        logger.info(`${logPrefix} HIT! Found entry (ID: ${bestMatch.id.substring(0,8)}, Source: ${bestMatch.source_api}, Type: ${bestMatch.result_type}, Sim: ${bestMatch.similarity?.toFixed(4)})`);
        return bestMatch;
      } else {
        logger.info(`${logPrefix} MISS.`); return null;
      }
    } catch (error: any) {
      logger.error(`${logPrefix} Error searching semantic cache: ${error.message}`, error);
      return null;
    }
  }


  async storeSemanticCache(
    queryText: string, queryEmbedding: number[],
    result: AnyToolStructuredData,
    resultType: string,
    sourceApi: string,
    language: string | null, location: string | null
  ): Promise<boolean> {
    const logPrefix = "[MemFramework SemCache Store]";
    if (!this.config.semanticCache.enabled) {
      logger.debug(`${logPrefix} Skipping store (cache disabled).`); return false;
    }
    if (!resultType || !sourceApi || !result) {
      logger.warn(`${logPrefix} Skipping store - resultType, sourceApi, or result data missing.`); return false;
    }
    logger.debug(`${logPrefix} Storing result for query: "${queryText.substring(0, 50)}...", Type: ${resultType}, Source: ${sourceApi}`);


    let ttlSeconds: number = this.config.semanticCache.defaultTTL;
    const typeLower = String(resultType).toLowerCase().replace("_list", "");
    const ttlConfigMap: { [key: string]: number | undefined } = {
      product: this.config.semanticCache.productTTL, video: this.config.semanticCache.videoTTL,
      image: this.config.semanticCache.imageTTL, recipe: this.config.semanticCache.recipeTTL,
      weather: this.config.semanticCache.weatherTTL, place: this.config.semanticCache.placeTTL,
      gif: this.config.semanticCache.gifTTL, fact: this.config.semanticCache.factTTL,
      news: this.config.semanticCache.newsTTL, sports: this.config.semanticCache.sportsTTL,
      event: this.config.semanticCache.eventTTL, tiktok: this.config.semanticCache.tiktokTTL,
      calendar: this.config.semanticCache.calendarTTL, email: this.config.semanticCache.emailTTL,
      task: this.config.semanticCache.taskTTL, reminder: this.config.semanticCache.reminderTTL,
      calculation_or_fact: this.config.semanticCache.calculation_or_factTTL, // Added alias explicitly
    };
    if (ttlConfigMap[typeLower] !== undefined && ttlConfigMap[typeLower]! > 0) {
      ttlSeconds = ttlConfigMap[typeLower]!;
      logger.debug(`${logPrefix} Using TTL for type '${typeLower}': ${ttlSeconds}s`);
    } else {
      logger.debug(`${logPrefix} Using default TTL: ${ttlSeconds}s for type '${typeLower}'`);
    }


    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();


     const dbResultType = ((): ExternalContentCacheEntry['result_type'] => {
        const typeNorm = String(resultType).toLowerCase();
        if (typeNorm.includes('product')) return 'product';
        if (typeNorm.includes('image')) return 'image';
        if (typeNorm.includes('tiktok')) return 'tiktok_video';
        if (typeNorm.includes('video')) return 'video';
        if (typeNorm.includes('recipe')) return 'recipe';
        if (typeNorm.includes('weather')) return 'weather';
        if (typeNorm.includes('gif')) return 'gif';
        if (typeNorm.includes('place') || typeNorm.includes('location') || typeNorm.includes('geolocation')) return 'place';
        if (typeNorm.includes('snippet')) return 'web_snippet';
        if (typeNorm.includes('answer')) return 'general_answer';
        if (typeNorm.includes('calculation') || typeNorm.includes('fact')) return 'calculation_or_fact';
        if (typeNorm.includes('holiday')) return 'holiday';
        if (typeNorm.includes('calendar')) return 'calendar_events';
        if (typeNorm.includes('email')) return 'email_headers';
        if (typeNorm.includes('news')) return 'news_articles';
        if (typeNorm.includes('task')) return 'internal_tasks';
        if (typeNorm.includes('reminder')) return 'reminders';
        if (typeNorm.includes('datetime')) return 'datetime_info';
        if (typeNorm.includes('event')) return 'event_list';
        if (typeNorm.includes('hn_stories') || typeNorm.includes('hackernews')) return 'hn_stories';
        if (typeNorm.includes('habit')) return 'habit_tracker_result';
        if (typeNorm.includes('map')) return 'map_link';
        if (typeNorm.includes('mood')) return 'mood_journal_log';
        if (typeNorm.includes('reddit')) return 'reddit_posts';
        if (typeNorm.includes('sport')) return 'sports_info';
        if (typeNorm.includes('sun_times') || typeNorm.includes('sunrise')) return 'sun_times';
        if (typeNorm.includes('water')) return 'water_intake_result';
        if (typeNorm.includes('internal_memory_result')) return 'internal_memory_result';
        // Added cases for analysis results
        if (typeNorm.includes("analysis_table")) return "analysis_table";
        if (typeNorm.includes("analysis_chart")) return "analysis_chart";
        if (typeNorm.includes("analysis_summary")) return "analysis_summary";
        if (typeNorm.includes("parsed_data_internal")) return "parsed_data_internal";
        if (typeNorm.includes("data_profile_internal")) return "data_profile_internal";
        if (typeNorm.includes("permission_denied")) return "permission_denied";

        logger.warn(`${logPrefix} Unknown result_type '${resultType}', storing as 'other'.`);
        return 'other';
     })();


    const cacheEntry: Omit<ExternalContentCacheEntry, "id" | "created_at" | "similarity"> = {
      user_query_text: queryText, query_embedding: queryEmbedding,
      result_type: dbResultType,
      structured_result: result,
      source_api: sourceApi, language: language, location: location, expires_at: expiresAt,
    };
    try {
      const success = await this.supabaseService.insertExternalCacheEntry(cacheEntry);
      if (success) logger.info(`${logPrefix} Stored successfully. Type: ${dbResultType}, Expires: ${expiresAt}`);
      else logger.error(`${logPrefix} Failed to store cache entry (Supabase returned false).`);
      return success;
    } catch (error: any) {
      logger.error(`${logPrefix} Error inserting cache entry: ${error.message}`, error);
      return false;
    }
  }


  // --- Internal Memory Management Methods ---
  async fetchMemoryById(memoryId: string): Promise<StoredMemoryUnit | null> {
     return this.supabaseService.fetchMemoryById(memoryId);
  }


  async update_memory(
    memoryId: string,
    updates: Partial<Omit<StoredMemoryUnit, "memory_id" | "user_id" | "run_id" | "created_at" | "updated_at">>
  ): Promise<StoredMemoryUnit | null> {
    const logPrefix = `UPDATE_MEMORY (Mem:${memoryId.substring(0, 8)})`;
    logger.info(`${logPrefix} Start`);


    if (!memoryId) { logger.error(`${logPrefix}: memoryId required.`); return null; }
    if (!updates || Object.keys(updates).length === 0) {
      logger.info(`${logPrefix}: No update data. Fetching current state.`);
      return this.supabaseService.fetchMemoryById(memoryId);
    }


    const existingMemory = await this.supabaseService.fetchMemoryById(memoryId);
    if (!existingMemory) { logger.error(`${logPrefix}: Memory not found.`); return null; }
    const userId = existingMemory.user_id; 


    let supabaseUpdatePayload: Partial<Omit<StoredMemoryUnit, "memory_id" | "user_id" | "run_id" | "created_at">> = {};
    let semanticDataChanged = false;


    if (updates.content !== undefined && updates.content !== existingMemory.content) {
      supabaseUpdatePayload.content = updates.content;
      semanticDataChanged = true;
      if (updates.embedding === undefined) {
        logger.info(`${logPrefix}: Content changed, re-embedding...`);
        const newEmbedding = await this.openAIService.getEmbedding(updates.content);
        supabaseUpdatePayload.embedding = newEmbedding;
        if (!newEmbedding) logger.warn(`${logPrefix}: Re-embedding failed, setting embedding to null.`);
      }
    }
    else if (updates.embedding !== undefined) {
        if (updates.embedding === null) {
             supabaseUpdatePayload.embedding = null;
             if (existingMemory.embedding !== null) semanticDataChanged = true;
             logger.info(`${logPrefix}: Embedding explicitly set to null.`);
        } else if (Array.isArray(updates.embedding) && updates.embedding.length === this.config.embedder.dimensions) {
             supabaseUpdatePayload.embedding = updates.embedding;
             if (JSON.stringify(updates.embedding) !== JSON.stringify(existingMemory.embedding)) semanticDataChanged = true;
             logger.info(`${logPrefix}: Using provided embedding vector.`);
        } else {
             logger.error(`${logPrefix}: Invalid provided embedding. Ignoring embedding update.`);
        }
    }


    if (updates.metadata !== undefined) { supabaseUpdatePayload.metadata = updates.metadata; semanticDataChanged = true; }
    if (updates.categories !== undefined) { supabaseUpdatePayload.categories = updates.categories; semanticDataChanged = true; }
    if (updates.language !== undefined) { supabaseUpdatePayload.language = updates.language; semanticDataChanged = true; }
    if (updates.expires_at !== undefined) { supabaseUpdatePayload.expires_at = updates.expires_at; }
    if (updates.role !== undefined) {
         if (!supabaseUpdatePayload.metadata) supabaseUpdatePayload.metadata = {};
         (supabaseUpdatePayload.metadata as any).role = updates.role;
         semanticDataChanged = true;
    }


    if (Object.keys(supabaseUpdatePayload).length === 0) {
      logger.info(`${logPrefix}: No effective DB changes required.`);
      return existingMemory;
    }


    const updatedMemory = await this.supabaseService.updateMemory(memoryId, supabaseUpdatePayload);


    if (updatedMemory) {
      logger.info(`${logPrefix} Success.`);
      if (semanticDataChanged && userId) {
        logger.warn(`${logPrefix}: Invalidating internal search cache for user ${userId} due to semantic changes.`);
        await this.cacheService.deleteByPrefix(`internal_mem_search_v2:${userId}:*`);
      }
    } else {
      logger.error(`${logPrefix}: Failed. Supabase update returned null.`);
    }
    return updatedMemory;
  }


  async delete_memory(memoryId: string): Promise<boolean> {
    const logPrefix = `DELETE_MEMORY (Mem:${memoryId.substring(0, 8)})`;
    logger.info(`${logPrefix} Start`);
    if (!memoryId) { logger.error(`${logPrefix}: memoryId required.`); return false; }


    let userId: string | null = null;
    try {
      const memoryToDelete = await this.supabaseService.fetchMemoryById(memoryId);
      if (!memoryToDelete) {
        logger.warn(`${logPrefix}: Memory not found in Supabase. Attempting graph cleanup just in case.`);
        await this.neo4jService.deleteMemoryNodes(memoryId);
        return true; 
      }
      userId = memoryToDelete.user_id;
    } catch (fetchError: any) {
      logger.error(`${logPrefix}: Error fetching memory details before delete: ${fetchError.message}`);
    }


    logger.debug(`${logPrefix}: Attempting parallel deletion from Supabase and Neo4j...`);
    const [neo4jResult, supabaseResult] = await Promise.allSettled([
      this.neo4jService.deleteMemoryNodes(memoryId),
      this.supabaseService.deleteMemory(memoryId),
    ]);


    const neo4jSuccess = neo4jResult.status === "fulfilled" && neo4jResult.value;
    const supabaseSuccess = supabaseResult.status === "fulfilled" && supabaseResult.value;


    if (!neo4jSuccess) logger.error(`${logPrefix}: Neo4j deletion failed/rejected. Status: ${neo4jResult.status}`, neo4jResult.status === 'rejected' ? neo4jResult.reason : '');
    if (!supabaseSuccess) logger.error(`${logPrefix}: Supabase deletion failed/rejected. Status: ${supabaseResult.status}`, supabaseResult.status === 'rejected' ? supabaseResult.reason : '');


    const overallSuccess = supabaseSuccess; 


    if (overallSuccess) {
      logger.info(`${logPrefix} Success. Deleted from vector store (Supabase). Neo4j success: ${neo4jSuccess}.`);
      if (userId) {
        logger.warn(`${logPrefix}: Invalidating internal search cache for user ${userId}.`);
        await this.cacheService.deleteByPrefix(`internal_mem_search_v2:${userId}:*`);
      }
    } else {
      logger.error(`${logPrefix}: Deletion failed. Neo4j:${neo4jSuccess}, Supabase:${supabaseSuccess}. Manual cleanup might be needed.`);
    }
    return overallSuccess;
  }


  async delete_user_memory(userId: string): Promise<boolean> { 
    const logPrefix = `DELETE_USER_MEMORY (User:${userId.substring(0, 8)})`;
    logger.warn(`${logPrefix} Start. IRREVERSIBLE operation.`);
    if (!userId) { logger.error(`${logPrefix}: userId required.`); return false; }


    logger.info(`${logPrefix}: Invalidating caches for user ${userId}...`);
    try {
        await Promise.allSettled([
             this.cacheService.deleteByPrefix(`internal_mem_search_v2:${userId}:*`),
             this.cacheService.deleteByPrefix(`extraction:${userId}:*`),
             this.cacheService.deleteByPrefix(`embedding:*:${userId}:*`), 
        ]);
      logger.info(`${logPrefix}: User cache invalidation attempted.`);
    } catch (cacheError: any) {
      logger.error(`${logPrefix}: Error during cache invalidation: ${cacheError.message}. Proceeding with deletion.`);
    }


    logger.warn(`${logPrefix}: Proceeding with data deletion from Neo4j and Supabase...`);
    const [neo4jResult, supabaseResult] = await Promise.allSettled([
      this.neo4jService.deleteUserNodesAndRelationships(userId),
      this.supabaseService.deleteUserMemories(userId),
    ]);


    const neo4jSuccess = neo4jResult.status === "fulfilled" && neo4jResult.value;
    const supabaseSuccess = supabaseResult.status === "fulfilled" && supabaseResult.value.error === null;
    const deletedCount = supabaseResult.status === "fulfilled" ? supabaseResult.value.count : "unknown";
    const supabaseError = supabaseResult.status === "fulfilled" ? supabaseResult.value.error : (supabaseResult.status === 'rejected' ? supabaseResult.reason : "Unknown Supabase error");


    if (!neo4jSuccess) logger.error(`${logPrefix}: Neo4j deletion failed/rejected. Status: ${neo4jResult.status}`, neo4jResult.status === 'rejected' ? neo4jResult.reason : '');
    if (!supabaseSuccess) logger.error(`${logPrefix}: Supabase deletion failed/rejected. Status: ${supabaseResult.status}`, supabaseError);


    const overallSuccess = neo4jSuccess && supabaseSuccess;
    if (overallSuccess) logger.info(`${logPrefix} Success. Deleted ${deletedCount ?? "unknown"} vector records and associated graph data.`);
    else logger.error(`${logPrefix}: User memory deletion FAILED. Neo4j:${neo4jSuccess}, Supabase:${supabaseSuccess}. Data inconsistency possible!`);


    return overallSuccess;
  }


  async set_memory_expiration(memoryId: string, expiresAt: string | null): Promise<boolean> {
    const logPrefix = `SET_EXPIRATION (Mem:${memoryId.substring(0, 8)})`;
    logger.info(`${logPrefix} Start. Setting expiration to: ${expiresAt ?? "Never"}`);
    if (!memoryId) { logger.error(`${logPrefix}: memoryId required.`); return false; }


    if (expiresAt !== null) {
       try { new Date(expiresAt).toISOString(); }
       catch { logger.error(`${logPrefix}: Invalid expiresAt format. Use ISO 8601 or null.`); return false; }
    }


    const success = await this.supabaseService.setMemoryExpiration(memoryId, expiresAt);
    if (success) logger.info(`${logPrefix} Success.`);
    else logger.error(`${logPrefix} Failed (likely not found or DB error).`);
    return success;
  }


  // --- Persona Management Methods ---
  async getAvailablePersonas(userId: string): Promise<{ predefined: PredefinedPersona[], user: UserPersona[] }> { 
     logger.debug(`[Persona] Fetching available personas for user ${userId.substring(0,8)}`);
     const [predefined, user] = await Promise.all([
          this.supabaseService.getPredefinedPersonas(),
          this.supabaseService.getUserPersonas(userId)
     ]);
     return { predefined, user };
  }


  async createUserPersona(userId: string, personaData: Omit<UserPersona, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<UserPersona | null> { 
       return this.supabaseService.createUserPersona(userId, personaData);
  }


   async updateUserPersona(userId: string, personaId: string, updates: Partial<Omit<UserPersona, 'id' | 'user_id' | 'created_at'>>): Promise<UserPersona | null> { 
        return this.supabaseService.updateUserPersona(userId, personaId, updates);
   }


   async deleteUserPersona(userId: string, personaId: string): Promise<boolean> { 
        return this.supabaseService.deleteUserPersona(userId, personaId);
   }

   
   async getPersonaById(personaId: string, userId: string): Promise<PredefinedPersona | UserPersona | null> {
         logger.debug(`[Persona] Fetching persona details for ID: ${personaId} (User Context: ${userId.substring(0,8)})`);
         
         // Check if it's a predefined persona first
         if (personaId.startsWith("minato_")) { // Or any other prefix/check for predefined IDs
            const predefined = await this.supabaseService.getPredefinedPersonas().then(list => list.find(p => p.id === personaId));
            if (predefined) {
                logger.debug(`[Persona] Found predefined persona: ${personaId}, voice_id: ${predefined.voice_id || 'none'}`);
                return predefined;
            }
         }

         // If not predefined or ID doesn't match predefined pattern, try fetching user-specific persona
         // Ensure rawSupabaseAdminClient is correctly typed or use a specific method from SupabaseService if available
         if (rawSupabaseAdminClient) { // Check if client is available
            const userPersona = await rawSupabaseAdminClient.getUserPersonaById(userId, personaId);
            if (userPersona) {
                logger.debug(`[Persona] Found user-specific persona: ${personaId} for user ${userId.substring(0,8)}, voice_id: ${userPersona.voice_id || 'none'}`);
                return userPersona;
            }
         } else {
            logger.error("[Persona GetByID] Supabase admin client not available for fetching user persona.");
         }


         logger.warn(`[Persona] Persona with ID ${personaId} not found (checked predefined and user-specific for user ${userId.substring(0,8)}).`);
         return null;
   }


  // --- Reminder Operations ---
  async getDueReminders(
      dueBefore: string = new Date().toISOString(),
      userId?: string | null, 
      limit: number = 20
  ): Promise<StoredMemoryUnit[] | null> {
       const logTarget = userId ? `user ${userId.substring(0, 8)}` : 'all users';
       logger.info(`[CoreMemory] Fetching due reminders for ${logTarget} before ${dueBefore}...`);
       return this.supabaseService.queryDueReminders(dueBefore, limit, userId);
  }


  async updateReminderStatus(memoryId: string, status: ReminderDetails['status'], errorMessage?: string | null): Promise<boolean> {
       const logPrefix = `[Reminder Update Mem:${memoryId.substring(0,8)}]`;
       logger.info(`${logPrefix} Updating status to '${status}' ${errorMessage ? `Error: ${errorMessage}` : ''}`);
       const existing = await this.fetchMemoryById(memoryId);
       if (!existing?.metadata?.reminder_details) {
            logger.error(`${logPrefix} Failed: Memory not found or is not a reminder.`);
            return false;
       }


       const updatedMetadata = {
            ...existing.metadata,
            reminder_details: {
                ...existing.metadata.reminder_details,
                status: status,
                last_sent_at: (status === 'sent' || status === 'error') ? new Date().toISOString() : existing.metadata.reminder_details.last_sent_at,
                error_message: status === 'error' ? (errorMessage || 'Unknown error') : null,
            }
       };


       const roleToUpdate = existing.role;
       const success = await this.update_memory(memoryId, { metadata: updatedMetadata, role: roleToUpdate });
       if (!success) {
           logger.error(`${logPrefix} Failed to update reminder status in DB.`);
           return false;
       }
       logger.info(`${logPrefix} Status updated successfully to '${status}'.`);
       return true;
  }


  // --- Framework Shutdown ---
  async close(): Promise<void> {
    logger.info("Closing CompanionCore Memory Framework connections...");
    const results = await Promise.allSettled([
      this.neo4jService.close(),
      this.cacheService.close(),
    ]);


    results.forEach((result, index) => {
      const serviceName = ["Neo4jService", "CacheService"][index] || `Service ${index}`;
      if (result.status === "rejected") {
        logger.error(`Error closing ${serviceName}: ${(result.reason as Error)?.message || result.reason}`);
      } else {
        logger.info(`${serviceName} closed successfully.`);
      }
    });
    logger.info("Framework connections closure process finished.");
  }
} 

declare module "../../memory-framework/core/CompanionCoreMemory" {
  interface CompanionCoreMemory {
    add_memory_extracted(conversationTurn: MemoryFrameworkMessage[], userId: string, runId: string | null, toolSummary: string | null, extractedInfo: ExtractedInfo | null): Promise<boolean>;
  }
}
export {};