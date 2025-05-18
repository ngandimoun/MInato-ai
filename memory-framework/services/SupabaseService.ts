// FILE: memory-framework/services/SupabaseService.ts
import {
  createClient,
  SupabaseClient,
  PostgrestError,
} from "@supabase/supabase-js";
import {
  FrameworkConfig,
  StoredMemoryUnit,
  SearchResult,
  PaginationParams,
  PaginatedResults,
  ExternalContentCacheEntry,
  PredefinedPersona,
  UserPersona,
} from "../core/types";
import { logger } from "../config";
import { AnyToolStructuredData } from "@/lib/types/index";
import neo4j, { Integer as Neo4jInteger } from "neo4j-driver";

export class SupabaseService {
  private client: SupabaseClient;
  private memoryTableName: string;
  private cacheTableName: string;
  private personasTableName: string;
  private userPersonasTableName: string;
  private userIntegrationsTableName: string;
  private userStatesTableName: string;
  private userProfilesTableName: string;
  private userPushSubscriptionsTableName: string;
  private matchMemoryFunctionName: string;
  private matchCacheFunctionName: string;
  private embeddingDimension: number;
  private ftsConfiguration: string;

  constructor(config: FrameworkConfig) {
    if (!config.vectorStore.url || !config.vectorStore.serviceKey) {
      throw new Error(
        "Supabase URL and Service Key are required for SupabaseService."
      );
    }
    this.client = createClient(
      config.vectorStore.url,
      config.vectorStore.serviceKey,
      { auth: { persistSession: false } }
    );
    this.memoryTableName = config.vectorStore.tableName;
    this.cacheTableName = config.vectorStore.cacheTableName;
    this.personasTableName = config.vectorStore.personasTableName;
    this.userPersonasTableName = config.vectorStore.userPersonasTableName;
    this.userIntegrationsTableName =
      config.vectorStore.userIntegrationsTableName;
    this.userStatesTableName = config.vectorStore.userStatesTableName;
    this.userProfilesTableName = config.vectorStore.userProfilesTableName;
    this.userPushSubscriptionsTableName =
      config.vectorStore.userPushSubscriptionsTableName;
    this.matchMemoryFunctionName = config.vectorStore.matchFunctionName;
    this.matchCacheFunctionName = config.vectorStore.matchCacheFunctionName;
    this.embeddingDimension = config.vectorStore.embeddingDimension;
    this.ftsConfiguration = config.vectorStore.ftsConfiguration;

    logger.info(
      `SupabaseService initialized: Memory='${this.memoryTableName}', Cache='${this.cacheTableName}', Personas='${this.personasTableName}', UserPersonas='${this.userPersonasTableName}', Integrations='${this.userIntegrationsTableName}', States='${this.userStatesTableName}', Profiles='${this.userProfilesTableName}', PushSubs='${this.userPushSubscriptionsTableName}', MemFunc='${this.matchMemoryFunctionName}', CacheFunc='${this.matchCacheFunctionName}', Dim=${this.embeddingDimension}, FTS='${this.ftsConfiguration}'`
    );
  }

  private mapToSupabaseMemoryRecord(
    unit: Partial<StoredMemoryUnit> & {
      memory_id: string;
      user_id: string;
      content: string;
      role: string;
    }
  ): Record<string, any> {
    const embeddingValue =
      unit.embedding && unit.embedding.length === this.embeddingDimension
        ? unit.embedding
        : unit.embedding === null
        ? null
        : undefined;
    if (
      unit.embedding !== null &&
      unit.embedding !== undefined &&
      unit.embedding.length !== this.embeddingDimension
    ) {
      logger.warn(
        `Memory unit ${unit.memory_id} has invalid embedding dim for Supabase. Expected ${this.embeddingDimension}, got ${unit.embedding?.length}. Storing as NULL.`
      );
    }
    const metadata =
      typeof unit.metadata === "object" && unit.metadata !== null
        ? { ...unit.metadata }
        : {};
    if (unit.role && !metadata.role) metadata.role = unit.role;
    if (
      metadata.role &&
      !["user", "assistant", "system", "tool"].includes(metadata.role as string)
    ) {
      logger.warn(
        `Invalid role '${metadata.role}' found in incoming metadata for memory ${unit.memory_id}. Overwriting with unit.role: '${unit.role}'.`
      );
      metadata.role = unit.role;
    }
    return {
      id: unit.memory_id,
      user_id: unit.user_id,
      run_id: unit.run_id ?? null,
      content: unit.content,
      embedding: embeddingValue,
      metadata: metadata,
      categories: Array.isArray(unit.categories) ? unit.categories : [],
      language: typeof unit.language === "string" ? unit.language : null,
      source_turn_ids: Array.isArray(unit.source_turn_ids)
        ? unit.source_turn_ids
        : null,
      expires_at: unit.expires_at ?? null,
      // created_at and updated_at are handled by Supabase defaults or triggers
    };
  }

  private mapSupabaseRecordToMemoryUnit(record: any): StoredMemoryUnit {
    const memory_id = typeof record.id === "string" ? record.id : "";
    const user_id = typeof record.user_id === "string" ? record.user_id : "";
    const created_at = record.created_at
      ? new Date(record.created_at).toISOString()
      : new Date(0).toISOString();
    const updated_at = record.updated_at
      ? new Date(record.updated_at).toISOString()
      : new Date(0).toISOString();
    if (!memory_id || !user_id)
      logger.warn(
        "Supabase record conversion: Missing essential fields (id, user_id). Record ID:",
        record?.id
      );
    const metadata =
      typeof record.metadata === "object" && record.metadata !== null
        ? record.metadata
        : {};
    let role =
      typeof metadata?.role === "string"
        ? metadata.role
        : typeof record.role === "string" // Fallback to top-level role if in metadata (shouldn't be there ideally)
        ? record.role
        : "assistant"; // Default role
    if (!["user", "assistant", "system", "tool"].includes(role)) {
      logger.warn(
        `Invalid role '${role}' found in DB record for memory ${memory_id}. Defaulting to 'assistant'.`
      );
      role = "assistant";
    }

    let embeddingValue: number[] | null = null;
    if (Array.isArray(record.embedding)) {
      embeddingValue = record.embedding.map((val: any) =>
        neo4j.isInt(val) ? (val as Neo4jInteger).toNumber() : Number(val)
      );
      if (embeddingValue && embeddingValue.length !== this.embeddingDimension) {
        logger.warn(
          `Dimension mismatch mapped embedding for memory ${memory_id}. Expected ${this.embeddingDimension}, got ${embeddingValue.length}. Setting to null.`
        );
        embeddingValue = null;
      }
    } else if (typeof record.embedding === 'string') { // Handle string embedding
        try {
            const parsed = JSON.parse(record.embedding);
            if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) {
                embeddingValue = parsed;
                if (embeddingValue.length !== this.embeddingDimension) {
                    logger.warn(
                        `Dimension mismatch for string-parsed embedding for memory ${memory_id}. Expected ${this.embeddingDimension}, got ${embeddingValue.length}. Setting to null.`
                    );
                    embeddingValue = null;
                }
            } else {
                logger.warn(
                    `Parsed string embedding for memory ${memory_id} is not a number array. Setting to null. Content: ${record.embedding.substring(0,50)}...`
                );
                embeddingValue = null;
            }
        } catch (e) {
            logger.warn(
                `Failed to JSON.parse string embedding for memory ${memory_id}. Setting to null. Content: ${record.embedding.substring(0,50)}... Error: ${(e as Error).message}`
            );
            embeddingValue = null;
        }
    } else if (record.embedding !== null && record.embedding !== undefined) {
      logger.warn(
        `Unexpected embedding format for memory ${memory_id}, type: ${typeof record.embedding}. Setting to null.`
      );
      embeddingValue = null;
    }

    return {
      memory_id,
      user_id,
      run_id: typeof record.run_id === "string" ? record.run_id : null,
      role: role,
      content: typeof record.content === "string" ? record.content : "",
      metadata: metadata,
      categories: Array.isArray(record.categories) ? record.categories : [],
      language: typeof record.language === "string" ? record.language : null,
      source_turn_ids: Array.isArray(record.source_turn_ids)
        ? record.source_turn_ids
        : null,
      created_at,
      updated_at,
      expires_at: record.expires_at
        ? new Date(record.expires_at).toISOString()
        : null,
      embedding: embeddingValue,
    };
  }

  async combinedMemorySearch(
    queryEmbedding: number[] | null,
    queryText: string,
    pagination: PaginationParams,
    userId: string,
    runId?: string | null,
    filters?: Record<string, any> | null
  ): Promise<PaginatedResults<SearchResult>> {
    const defaultResult: PaginatedResults<SearchResult> = {
      results: [],
      limit: pagination.limit,
      offset: pagination.offset,
      total_estimated: 0,
    };
    const logUserId = userId?.substring(0, 8) || "UNKNOWN_USER";
    if (!userId) {
      logger.error(`[Memory Search] Requires userId.`);
      return defaultResult;
    }
    if (
      queryEmbedding &&
      (!Array.isArray(queryEmbedding) ||
        queryEmbedding.length !== this.embeddingDimension)
    ) {
      logger.error(
        `[Memory Search] Query embedding invalid (User: ${logUserId}). Dim: ${queryEmbedding?.length}, Expected: ${this.embeddingDimension}`
      );
      return defaultResult;
    }
    if (
      !queryEmbedding &&
      !queryText?.trim() &&
      (!filters || Object.keys(filters).length === 0)
    ) {
      logger.warn(
        `[Memory Search] Skipped: No query embedding, text, or filters provided for User: ${logUserId}.`
      );
      if (
        queryText === "" &&
        (!filters || Object.keys(filters).length === 0) &&
        !queryEmbedding
      ) {
        logger.info(
          `[Memory Search] Empty queryText with no filters/embedding for User: ${logUserId}. Backend RPC will determine behavior.`
        );
      } else {
        return defaultResult;
      }
    }

    const rpcFilter: Record<string, any> = { user_id_filter: userId };
    if (runId) rpcFilter.run_id_filter = runId;
    if (
      filters?.metadata &&
      typeof filters.metadata === "object" &&
      filters.metadata !== null
    ) {
      rpcFilter.metadata_filter = filters.metadata;
    }
    if (
      filters?.categories &&
      Array.isArray(filters.categories) &&
      filters.categories.length > 0
    ) {
      if (
        filters.categories.every(
          (c) => typeof c === "string" && c.trim().length > 0
        )
      ) {
        rpcFilter.categories_filter = filters.categories;
      } else {
        logger.warn(
          `[Memory Search] Invalid categories filter format for User: ${logUserId}. Must be array of non-empty strings. Ignoring filter.`
        );
      }
    }
    if (
      filters?.language &&
      typeof filters.language === "string" &&
      filters.language.trim()
    )
      rpcFilter.language_filter = filters.language.trim();

    const tryParseDate = (dateStr: any): string | null => {
      try {
        if (dateStr) return new Date(dateStr).toISOString();
      } catch {}
      return null;
    };
    const createdAtGte = tryParseDate(filters?.created_at_gte);
    if (createdAtGte) rpcFilter.created_at_gte_filter = createdAtGte;
    const createdAtLte = tryParseDate(filters?.created_at_lte);
    if (createdAtLte) rpcFilter.created_at_lte_filter = createdAtLte;
    const updatedAtGte = tryParseDate(filters?.updated_at_gte);
    if (updatedAtGte) rpcFilter.updated_at_gte_filter = updatedAtGte;
    const updatedAtLte = tryParseDate(filters?.updated_at_lte);
    if (updatedAtLte) rpcFilter.updated_at_lte_filter = updatedAtLte;

    if (typeof filters?.vector_weight === "number")
      rpcFilter.vector_weight = Math.max(0, Math.min(filters.vector_weight, 1));
    if (typeof filters?.keyword_weight === "number")
      rpcFilter.keyword_weight = Math.max(
        0,
        Math.min(filters.keyword_weight, 1)
      );
    rpcFilter.exclude_expired_filter = filters?.exclude_expired !== false; // default to true
    rpcFilter.fts_configuration =
      typeof filters?.fts_configuration === "string" &&
      filters.fts_configuration.trim()
        ? filters.fts_configuration.trim()
        : this.ftsConfiguration;

    const rpcParams = {
      p_query_embedding: queryEmbedding,
      p_query_text: queryText?.trim() || "",
      p_match_limit: Math.max(1, pagination.limit),
      p_match_offset: Math.max(0, pagination.offset),
      p_filter: rpcFilter,
    };

    try {
      const filterKeys = Object.keys(rpcFilter)
        .filter(
          (k) =>
            k !== "user_id_filter" &&
            rpcFilter[k] !== null &&
            rpcFilter[k] !== undefined
        )
        .join(",");
      logger.info(
        `[Memory Search] RPC '${
          this.matchMemoryFunctionName
        }' User:${logUserId} Offset:${pagination.offset}, Limit:${
          pagination.limit
        }, Query:"${(rpcParams.p_query_text || "").substring(
          0,
          30
        )}...", Embedding:${
          queryEmbedding ? "Yes" : "No"
        }, Filters:[${filterKeys}]`
      );
      const { data, error, count } = await this.client.rpc(
        this.matchMemoryFunctionName,
        rpcParams,
        { count: "exact" }
      );
      if (error) {
        logger.error(
          `[Memory Search] Supabase RPC '${this.matchMemoryFunctionName}' error (User: ${logUserId}):`,
          JSON.stringify(error, null, 2)
        );
        return defaultResult;
      }
      if (!data || !Array.isArray(data)) {
        logger.info(
          `[Memory Search] RPC '${
            this.matchMemoryFunctionName
          }' returned no data (User: ${logUserId}). Total Est: ${
            count ?? "N/A"
          }`
        );
        const total = typeof count === "number" ? count : undefined;
        return { ...defaultResult, total_estimated: total };
      }
      logger.info(
        `[Memory Search] RPC '${this.matchMemoryFunctionName}' returned ${
          data.length
        } results. Total Est: ${count ?? "N/A"} (User: ${logUserId}).`
      );
      const mappedResults: SearchResult[] = data.map((result) => {
        const base = this.mapSupabaseRecordToMemoryUnit(result);
        return {
          ...base,
          vector_score:
            typeof result.vector_score === "number"
              ? result.vector_score
              : null,
          keyword_score:
            typeof result.keyword_score === "number"
              ? result.keyword_score
              : null,
          final_score:
            typeof result.final_score === "number" ? result.final_score : null,
          is_latest_fact:
            typeof result.is_latest_fact === "boolean"
              ? result.is_latest_fact
              : null,
        };
      });
      const total = typeof count === "number" ? count : undefined;
      return {
        results: mappedResults,
        total_estimated: total,
        limit: pagination.limit,
        offset: pagination.offset,
      };
    } catch (error: any) {
      logger.error(
        `[Memory Search] Exception during RPC '${this.matchMemoryFunctionName}' (User: ${logUserId}):`,
        error.message
      );
      return defaultResult;
    }
  }

  async insertMemoryUnits(memoryUnits: StoredMemoryUnit[]): Promise<boolean> {
    if (!memoryUnits || memoryUnits.length === 0) return true;
    const logUserId = memoryUnits[0]?.user_id?.substring(0, 8) || "UNKNOWN";
    for (const unit of memoryUnits) {
      if (
        !unit.user_id ||
        !unit.memory_id ||
        unit.content === undefined ||
        unit.content === null ||
        !unit.role
      ) {
        logger.error(
          `Invalid memory unit: ID=${unit.memory_id?.substring(
            0,
            8
          )}, User=${unit.user_id?.substring(0, 8)}, Role=${
            unit.role
          }. Missing required fields.`
        );
        return false;
      }
      if (
        unit.embedding &&
        (!Array.isArray(unit.embedding) ||
          unit.embedding.length !== this.embeddingDimension)
      ) {
        logger.error(
          `Invalid memory unit embedding: ID=${unit.memory_id?.substring(
            0,
            8
          )}, EmbedLen=${unit.embedding?.length}. Expected ${
            this.embeddingDimension
          } or null.`
        );
        return false;
      }
      if (!["user", "assistant", "system", "tool"].includes(unit.role)) {
        logger.error(
          `Invalid role '${unit.role}' for memory ${unit.memory_id}.`
        );
        return false;
      }
    }
    const recordsToInsert = memoryUnits.map((unit) =>
      this.mapToSupabaseMemoryRecord(
        unit as StoredMemoryUnit & {
          memory_id: string;
          user_id: string;
          content: string;
          role: string;
        }
      )
    );
    try {
      logger.debug(
        `Inserting ${recordsToInsert.length} memory units into '${this.memoryTableName}' for User: ${logUserId}...`
      );
      const { error } = await this.client
        .from(this.memoryTableName)
        .insert(recordsToInsert);
      if (error) {
        logger.error(
          `Supabase batch insert error into '${this.memoryTableName}' (User: ${logUserId}):`,
          JSON.stringify(error, null, 2)
        );
        return false;
      }
      logger.info(
        `Successfully inserted ${recordsToInsert.length} memory units into '${this.memoryTableName}' (User: ${logUserId}).`
      );
      return true;
    } catch (error: any) {
      logger.error(
        `Exception during Supabase batch insert into '${this.memoryTableName}' (User: ${logUserId}):`,
        error.message
      );
      return false;
    }
  }

  async fetchMemoryById(memoryId: string): Promise<StoredMemoryUnit | null> {
    if (!memoryId) {
      logger.warn("fetchMemoryById called with empty memoryId.");
      return null;
    }
    logger.debug(
      `Fetching memory by ID: ${memoryId} from '${this.memoryTableName}'`
    );
    try {
      const { data, error } = await this.client
        .from(this.memoryTableName)
        .select("*")
        .eq("id", memoryId)
        .maybeSingle();
      if (error) {
        logger.error(
          `Supabase fetch error for memory ${memoryId} from '${this.memoryTableName}':`,
          JSON.stringify(error, null, 2)
        );
        return null;
      }
      if (data) {
        logger.debug(`Memory ${memoryId} fetched successfully.`);
        return this.mapSupabaseRecordToMemoryUnit(data);
      } else {
        logger.debug(`Memory ${memoryId} not found.`);
        return null;
      }
    } catch (error: any) {
      logger.error(
        `Exception fetching memory ${memoryId} from '${this.memoryTableName}':`,
        error.message
      );
      return null;
    }
  }

  async updateMemory(
    memoryId: string,
    updates: Partial<
      Omit<StoredMemoryUnit, "memory_id" | "user_id" | "run_id" | "created_at">
    >
  ): Promise<StoredMemoryUnit | null> {
    if (!memoryId) {
      logger.error("UpdateMemory: memoryId required.");
      return null;
    }
    if (!updates || Object.keys(updates).length === 0) {
      logger.info(
        `Update skipped for memory ${memoryId}: No changes. Fetching current.`
      );
      return this.fetchMemoryById(memoryId);
    }
    const supabaseUpdatePayload: Record<string, any> = {};
    if (updates.content !== undefined)
      supabaseUpdatePayload.content = updates.content;
    if (updates.metadata !== undefined)
      supabaseUpdatePayload.metadata =
        typeof updates.metadata === "object" && updates.metadata !== null
          ? updates.metadata
          : {};
    if (updates.categories !== undefined)
      supabaseUpdatePayload.categories = Array.isArray(updates.categories)
        ? updates.categories
        : [];
    if (updates.language !== undefined)
      supabaseUpdatePayload.language =
        typeof updates.language === "string" ? updates.language : null;
    if (updates.source_turn_ids !== undefined)
      supabaseUpdatePayload.source_turn_ids = Array.isArray(
        updates.source_turn_ids
      )
        ? updates.source_turn_ids
        : null;
    if (updates.expires_at !== undefined)
      supabaseUpdatePayload.expires_at = updates.expires_at
        ? new Date(updates.expires_at).toISOString()
        : null;
    if (updates.role !== undefined) {
      if (
        typeof supabaseUpdatePayload.metadata !== "object" ||
        supabaseUpdatePayload.metadata === null
      )
        supabaseUpdatePayload.metadata = {};
      if (["user", "assistant", "system", "tool"].includes(updates.role))
        supabaseUpdatePayload.metadata.role = updates.role;
      else
        logger.warn(
          `Update error for memory ${memoryId}: Invalid role '${updates.role}' provided. Role not updated.`
        );
    }
    let embeddingUpdate: number[] | null | undefined = undefined;
    if (updates.embedding !== undefined) {
      if (updates.embedding === null) {
        embeddingUpdate = null;
        logger.info(
          `Update for memory ${memoryId}: Embedding explicitly set to null.`
        );
      } else if (
        Array.isArray(updates.embedding) &&
        updates.embedding.length === this.embeddingDimension
      ) {
        embeddingUpdate = updates.embedding;
        logger.info(
          `Update for memory ${memoryId}: Using provided embedding vector.`
        );
      } else
        logger.error(
          `Update error for memory ${memoryId}: Invalid embedding provided (wrong dimension or type). Embedding not updated.`
        );
    }
    if (embeddingUpdate !== undefined)
      supabaseUpdatePayload.embedding = embeddingUpdate;
    supabaseUpdatePayload.updated_at = new Date().toISOString();
    if (
      Object.keys(supabaseUpdatePayload).length <= 1 &&
      supabaseUpdatePayload.updated_at
    ) {
      logger.info(
        `Update skipped for memory ${memoryId}: No valid fields to update.`
      );
      return this.fetchMemoryById(memoryId);
    }
    try {
      logger.info(
        `Updating memory ${memoryId} in '${
          this.memoryTableName
        }' with fields: ${Object.keys(supabaseUpdatePayload)
          .filter((k) => k !== "updated_at")
          .join(",")}`
      );
      const { data, error } = await this.client
        .from(this.memoryTableName)
        .update(supabaseUpdatePayload)
        .eq("id", memoryId)
        .select()
        .single();
      if (error) {
        if (error.code === "PGRST116")
          logger.warn(`Update failed: Memory ${memoryId} not found.`);
        else
          logger.error(
            `Supabase update error for memory ${memoryId}:`,
            JSON.stringify(error, null, 2)
          );
        return null;
      }
      logger.info(`Updated memory ${memoryId} successfully.`);
      return data ? this.mapSupabaseRecordToMemoryUnit(data) : null;
    } catch (error: any) {
      logger.error(`Exception updating memory ${memoryId}:`, error.message);
      return null;
    }
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    if (!memoryId) {
      logger.error("DeleteMemory: memoryId required.");
      return false;
    }
    logger.info(
      `Attempting to delete memory ${memoryId} from '${this.memoryTableName}'.`
    );
    try {
      const { error, count } = await this.client
        .from(this.memoryTableName)
        .delete({ count: "exact" })
        .eq("id", memoryId);
      if (error) {
        logger.error(
          `Supabase delete error for memory ${memoryId}:`,
          JSON.stringify(error, null, 2)
        );
        return false;
      }
      if (count === 0 || count === null) {
        logger.warn(
          `Supabase delete: Memory ${memoryId} not found or count unknown.`
        );
        return false; 
      }
      logger.info(`Deleted memory ${memoryId}. Count: ${count}`);
      return count > 0;
    } catch (error: any) {
      logger.error(`Exception deleting memory ${memoryId}:`, error.message);
      return false;
    }
  }

  async deleteUserMemories(
    userId: string
  ): Promise<{ count: number | null; error: PostgrestError | null }> {
    if (!userId) {
      logger.error("DeleteUserMemories: userId required.");
      const err: PostgrestError = {
        message: "User ID required",
        details: "",
        hint: "",
        code: "VALIDATION_ERROR",
        name: "DeleteUserMemoriesValidationError",
      };
      return { count: 0, error: err };
    }
    logger.warn(
      `Attempting DELETE ALL memories for user ${userId.substring(
        0,
        8
      )} from '${this.memoryTableName}'. IRREVERSIBLE.`
    );
    try {
      const { count, error } = await this.client
        .from(this.memoryTableName)
        .delete({ count: "exact" })
        .eq("user_id", userId);
      if (error)
        logger.error(
          `Supabase delete error for user ${userId.substring(0, 8)} memories:`,
          JSON.stringify(error, null, 2)
        );
      else
        logger.info(
          `Deleted ${count ?? 0} memories for user ${userId.substring(0, 8)}`
        );
      return { count, error };
    } catch (error: any) {
      logger.error(
        `Exception deleting memories for user ${userId.substring(0, 8)}:`,
        error.message
      );
      const pgError: PostgrestError =
        error instanceof Error
          ? {
              name: error.name || "DeleteUserMemoriesException",
              message: error.message,
              details: (error as any).details || "",
              hint: (error as any).hint || "",
              code: (error as any).code || "EXCEPTION",
            }
          : {
              name: "UnknownDeleteException",
              message: "Unknown delete exception",
              details: "",
              hint: "",
              code: "UNKNOWN_EXCEPTION",
            };
      return { count: null, error: pgError };
    }
  }

  async setMemoryExpiration(
    memoryId: string,
    expiresAt: string | null
  ): Promise<boolean> {
    if (!memoryId) {
      logger.error("SetMemoryExpiration: memoryId required.");
      return false;
    }
    let expiresAtISO: string | null = null;
    if (expiresAt) {
      try {
        expiresAtISO = new Date(expiresAt).toISOString();
      } catch (e) {
        logger.error(
          `SetMemoryExpiration: Invalid date format: ${expiresAt}. Use ISO 8601.`
        );
        return false;
      }
    }
    logger.info(
      `Setting expiration for memory ${memoryId} in '${
        this.memoryTableName
      }' to ${expiresAtISO ?? "NULL"}`
    );
    try {
      const { data: checkData, error: checkError } = await this.client
        .from(this.memoryTableName)
        .select("id")
        .eq("id", memoryId)
        .maybeSingle();
      if (checkError && checkError.code !== "PGRST116") { // PGRST116 is "No rows found"
        logger.error(
          `Error checking existence of memory ${memoryId}:`,
          JSON.stringify(checkError, null, 2)
        );
        return false;
      }
      if (!checkData && checkError?.code === "PGRST116") { // Explicitly check for not found
        logger.warn(`Set expiration failed: Memory ${memoryId} not found.`);
        return false;
      }
      const { error: updateError } = await this.client
        .from(this.memoryTableName)
        .update({
          expires_at: expiresAtISO,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memoryId);
      if (updateError) {
        logger.error(
          `Supabase expiration update error for memory ${memoryId}:`,
          JSON.stringify(updateError, null, 2)
        );
        return false;
      }
      logger.info(`Set expiration for memory ${memoryId} successfully.`);
      return true;
    } catch (error: any) {
      logger.error(
        `Exception setting expiration for memory ${memoryId}:`,
        error.message
      );
      return false;
    }
  }

  async searchExternalCache(
    queryEmbedding: number[],
    matchThreshold: number,
    matchLimit: number,
    resultType?: string | null,
    language?: string | null,
    location?: string | null
  ): Promise<ExternalContentCacheEntry[]> {
    const logPrefix = "[ExtCache Search]";
    if (
      !queryEmbedding ||
      !Array.isArray(queryEmbedding) ||
      queryEmbedding.length !== this.embeddingDimension
    ) {
      logger.error(`${logPrefix} Query embedding invalid.`);
      return [];
    }
    logger.info(
      `${logPrefix} RPC '${this.matchCacheFunctionName}'. Type:${
        resultType || "any"
      }, Lang:${language || "any"}, Loc:${
        location || "any"
      }, Limit:${matchLimit}, Thresh:${matchThreshold}`
    );
    try {
      const rpcParams = {
        p_query_embedding: queryEmbedding,
        p_match_threshold: matchThreshold,
        p_match_limit: matchLimit,
        p_filter_result_type: resultType || null,
        p_filter_language: language || null,
        p_filter_location: location || null,
      };
      const { data, error } = await this.client.rpc(
        this.matchCacheFunctionName,
        rpcParams
      );
      if (error) {
        logger.error(
          `${logPrefix} Supabase RPC '${this.matchCacheFunctionName}' error:`,
          JSON.stringify(error, null, 2)
        );
        return [];
      }
      if (!data || !Array.isArray(data)) {
        logger.info(
          `${logPrefix} RPC '${this.matchCacheFunctionName}' returned no data.`
        );
        return [];
      }
      logger.info(
        `${logPrefix} RPC '${this.matchCacheFunctionName}' returned ${data.length} potential hits.`
      );
      const validEntries = data
        .map((item: any): ExternalContentCacheEntry | null => {
          if (
            !item ||
            typeof item.id !== "string" ||
            !item.user_query_text ||
            !item.query_embedding ||
            !item.result_type ||
            !item.source_api ||
            !item.expires_at
          ) {
            logger.warn(
              `${logPrefix} Invalid cache entry structure from RPC:`,
              item?.id
            );
            return null;
          }
          return {
            id: item.id,
            user_query_text: item.user_query_text,
            query_embedding: item.query_embedding,
            result_type:
              item.result_type as ExternalContentCacheEntry["result_type"],
            structured_result: item.structured_result as AnyToolStructuredData,
            source_api: item.source_api,
            language: item.language,
            location: item.location,
            created_at: item.created_at,
            expires_at: item.expires_at,
            similarity:
              typeof item.similarity === "number" ? item.similarity : null,
          };
        })
        .filter((item): item is ExternalContentCacheEntry => item !== null);
      if (validEntries.length !== data.length)
        logger.warn(
          `${logPrefix} RPC '${this.matchCacheFunctionName}' returned ${
            data.length - validEntries.length
          } invalid entries after mapping.`
        );
      return validEntries;
    } catch (error: any) {
      logger.error(
        `${logPrefix} Exception during RPC '${this.matchCacheFunctionName}':`,
        error.message
      );
      return [];
    }
  }

  async insertExternalCacheEntry(
    cacheEntry: Omit<
      ExternalContentCacheEntry,
      "id" | "created_at" | "similarity"
    >
  ): Promise<boolean> {
    const logPrefix = "[ExtCache Insert]";
    if (
      !cacheEntry.user_query_text ||
      !cacheEntry.query_embedding ||
      !Array.isArray(cacheEntry.query_embedding) ||
      cacheEntry.query_embedding.length !== this.embeddingDimension ||
      !cacheEntry.result_type ||
      !cacheEntry.source_api ||
      !cacheEntry.expires_at
    ) {
      logger.error(
        `${logPrefix} Invalid cache entry data. Missing required fields or invalid embedding.`
      );
      return false;
    }
    let expiresAtISO: string;
    try {
      expiresAtISO = new Date(cacheEntry.expires_at).toISOString();
    } catch (e) {
      logger.error(
        `${logPrefix} Invalid expires_at date format: ${cacheEntry.expires_at}`
      );
      return false;
    }
    const entryToInsert = {
      ...cacheEntry,
      expires_at: expiresAtISO,
      structured_result: cacheEntry.structured_result ?? {},
    };
    try {
      logger.debug(
        `${logPrefix} Inserting into '${
          this.cacheTableName
        }' query "${cacheEntry.user_query_text.substring(0, 50)}...", Type: ${
          cacheEntry.result_type
        }`
      );
      const { error } = await this.client
        .from(this.cacheTableName)
        .insert(entryToInsert);
      if (error) {
        logger.error(
          `${logPrefix} Supabase insert error into '${this.cacheTableName}':`,
          JSON.stringify(error, null, 2)
        );
        return false;
      }
      logger.info(
        `${logPrefix} Successfully inserted cache entry into '${this.cacheTableName}'.`
      );
      return true;
    } catch (error: any) {
      logger.error(
        `${logPrefix} Exception during insert into '${this.cacheTableName}':`,
        error.message
      );
      return false;
    }
  }

  async pruneExpiredCacheEntries(): Promise<boolean> {
    const logPrefix = "[ExtCache Prune]";
    logger.info(
      `${logPrefix} Deleting expired entries from '${this.cacheTableName}' where expires_at < NOW().`
    );
    try {
      const now = new Date().toISOString();
      const { error, count } = await this.client
        .from(this.cacheTableName)
        .delete({ count: "estimated" })
        .lt("expires_at", now);
      if (error) {
        logger.error(
          `${logPrefix} Supabase delete error during pruning:`,
          JSON.stringify(error, null, 2)
        );
        return false;
      }
      logger.info(
        `${logPrefix} Pruning completed. Approx ${
          count ?? "unknown"
        } expired entries deleted.`
      );
      return true;
    } catch (error: any) {
      logger.error(`${logPrefix} Exception during pruning:`, error.message);
      return false;
    }
  }

  async queryDueReminders(
    dueBefore: string,
    limit: number = 20,
    userId?: string | null
  ): Promise<StoredMemoryUnit[] | null> {
    const logUserId = userId ? userId.substring(0, 8) : "GLOBAL";
    const logPrefix = `[Supabase Reminders Query User:${logUserId}]`;
    logger.info(
      `${logPrefix} Querying due reminders via RPC (trigger<= ${dueBefore}, limit=${limit}, User:${
        userId ? "Specific" : "All"
      })...`
    );
    if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/.test(dueBefore)) {
      logger.error(
        `${logPrefix} Invalid dueBefore format. Expected ISO 8601 UTC.`
      );
      return null;
    }
    try {
      const rpcParams: {
        p_due_before: string;
        p_max_results: number;
        p_user_id?: string;
      } = { p_due_before: dueBefore, p_max_results: limit };
      if (userId) rpcParams.p_user_id = userId;
      const { data, error } = await this.client.rpc(
        "get_pending_reminders",
        rpcParams
      );
      if (error) {
        logger.error(
          `${logPrefix} Error calling RPC 'get_pending_reminders':`,
          error
        );
        return null;
      }
      if (!data || !Array.isArray(data)) {
        logger.error(
          `${logPrefix} RPC 'get_pending_reminders' returned unexpected data format:`,
          data
        );
        return null;
      }
      if (data.length === 0) {
        logger.info(
          `${logPrefix} No pending reminders found via RPC matching criteria.`
        );
        return [];
      }
      logger.info(`${logPrefix} Found ${data.length} due reminders via RPC.`);
      const reminders = data.map((record) =>
        this.mapSupabaseRecordToMemoryUnit(record)
      );
      return reminders;
    } catch (error: any) {
      logger.error(
        `${logPrefix} Exception querying due reminders via RPC:`,
        error.message
      );
      return null;
    }
  }

  async getPredefinedPersonas(): Promise<PredefinedPersona[]> {
    logger.debug(
      `Fetching predefined personas from '${this.personasTableName}'...`
    );
    try {
      const { data, error } = await this.client
        .from(this.personasTableName)
        .select("*")
        .eq("is_public", true);
      if (error) throw error;
      return (data || []).filter(
        (p: any): p is PredefinedPersona =>
          p && p.id && p.name && p.system_prompt
      );
    } catch (error: any) {
      logger.error("Error fetching predefined personas:", error.message);
      return [];
    }
  }

  async getUserPersonas(userId: string, personaId?: string): Promise<UserPersona[]> {
    logger.debug(
      `Fetching user-specific personas for ${userId.substring(0, 8)} from '${
        this.userPersonasTableName
      }'...`
    );
    if (!userId) return [];
    try {
      let query = this.client
        .from(this.userPersonasTableName)
        .select("*")
        .eq("user_id", userId);
      if (personaId) {
        query = query.eq("id", personaId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).filter(
        (p: any): p is UserPersona =>
          p && p.id && p.user_id && p.name && p.system_prompt
      );
    } catch (error: any) {
      logger.error(
        `Error fetching personas for user ${userId.substring(0, 8)}:`,
        error.message
      );
      return [];
    }
  }

  async createUserPersona(
    userId: string,
    personaData: Omit<
      UserPersona,
      "id" | "user_id" | "created_at" | "updated_at"
    >
  ): Promise<UserPersona | null> {
    logger.info(
      `Creating new persona for user ${userId.substring(0, 8)}: ${
        personaData.name
      }`
    );
    if (!userId || !personaData.name || !personaData.system_prompt) {
      logger.error(
        "Missing required fields for creating user persona (userId, name, system_prompt)."
      );
      return null;
    }
    try {
      const { data, error } = await this.client
        .from(this.userPersonasTableName)
        .insert({ ...personaData, user_id: userId })
        .select()
        .single();
      if (error) throw error;
      logger.info(
        `User persona "${personaData.name}" created successfully (ID: ${data?.id}).`
      );
      return data as UserPersona;
    } catch (error: any) {
      logger.error(
        `Error creating persona for user ${userId.substring(0, 8)}:`,
        error.message
      );
      return null;
    }
  }

  async updateUserPersona(
    userId: string,
    personaId: string,
    updates: Partial<Omit<UserPersona, "id" | "user_id" | "created_at">>
  ): Promise<UserPersona | null> {
    logger.info(
      `Updating persona ${personaId} for user ${userId.substring(0, 8)}...`
    );
    if (!userId || !personaId || Object.keys(updates).length === 0) {
      logger.warn("Missing userId, personaId, or updates for persona update.");
      return null;
    }
    try {
      const { data, error } = await this.client
        .from(this.userPersonasTableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", personaId)
        .eq("user_id", userId)
        .select()
        .single();
      if (error) {
        if (error.code === "PGRST116")
          logger.warn(
            `Persona ${personaId} not found or not owned by user ${userId.substring(
              0,
              8
            )}.`
          );
        else throw error;
        return null;
      }
      logger.info(`User persona ${personaId} updated successfully.`);
      return data as UserPersona;
    } catch (error: any) {
      logger.error(
        `Error updating persona ${personaId} for user ${userId.substring(
          0,
          8
        )}:`,
        error.message
      );
      return null;
    }
  }

  async deleteUserPersona(userId: string, personaId: string): Promise<boolean> {
    logger.warn(
      `Deleting persona ${personaId} for user ${userId.substring(0, 8)}...`
    );
    if (!userId || !personaId) return false;
    try {
      const { error, count } = await this.client
        .from(this.userPersonasTableName)
        .delete({ count: "exact" })
        .eq("id", personaId)
        .eq("user_id", userId);
      if (error) throw error;
      if (count === 0)
        logger.warn(
          `Persona ${personaId} not found or not owned by user ${userId.substring(
            0,
            8
          )}.`
        );
      else logger.info(`User persona ${personaId} deleted successfully.`);
      return count !== null && count > 0;
    } catch (error: any) {
      logger.error(
        `Error deleting persona ${personaId} for user ${userId.substring(
          0,
          8
        )}:`,
        error.message
      );
      return false;
    }
  }
}