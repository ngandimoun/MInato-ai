// FILE: lib/tools/MemoryTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory";
import { logger } from "../../memory-framework/config";
import { InternalTask, InternalTaskResult, MemoryToolResult } from "@/lib/types/index"; // Corrected import for MemoryToolResult
import { StoredMemoryUnit, PaginationParams, SearchOptions, SearchResult as MemoryFrameworkSearchResult } from "../../memory-framework/core/types";
import { MEMORY_SEARCH_LIMIT_DEFAULT } from "../constants";
import { randomUUID } from "crypto";


interface MemoryToolInput extends ToolInput {
  query: string;
  action?: "retrieve" | null; // Allow null
  limit?: number | null; // Allow null
  memory_type_filter?: string | null; // Allow null
  status_filter?: string | null; // Allow null
}

export class MemoryTool extends BaseTool {
  name = "MemoryTool";
  description =
    "Retrieves specific information, facts, preferences, or past conversation details about the user from your long-term memory banks. Use this when you need to recall a specific detail not immediately available in the short-term conversation context.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "The specific question or topic to retrieve from memory. This is required." } as OpenAIToolParameterProperties,
      action: { type: ["string", "null"] as const, enum: ["retrieve", null], description: "Action to perform. If null or omitted, defaults to 'retrieve'." } as OpenAIToolParameterProperties,
      limit: { type: ["number", "null"] as const, description: `Maximum number of relevant memories to retrieve (must be between 1 and 10). If null or omitted, defaults to ${MEMORY_SEARCH_LIMIT_DEFAULT}.` } as OpenAIToolParameterProperties, // Removed min/max/default
      memory_type_filter: { type: ["string", "null"] as const, description: "Optional: Filter memories by a specific type (e.g., 'user_preference', 'fact'). Can be null." } as OpenAIToolParameterProperties,
      status_filter: { type: ["string", "null"] as const, description: "Optional: Filter memories by status (e.g., 'active', 'archived'). If null or omitted, defaults to 'active'.", } as OpenAIToolParameterProperties, // Removed default
    },
    required: ["query", "action", "limit", "memory_type_filter", "status_filter"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 15;

  private memoryFramework: CompanionCoreMemory;

  constructor(memoryFrameworkInstance: CompanionCoreMemory) {
    super();
    if (!memoryFrameworkInstance) {
      throw new Error("MemoryTool requires an instance of CompanionCoreMemory.");
    }
    this.memoryFramework = memoryFrameworkInstance;
    this.log("info", "MemoryTool initialized with framework instance.");
  }

  async execute(input: MemoryToolInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { userId: contextUserId, query } = input; // query is required by schema
    // Defaulting logic
    const effectiveAction = (input.action === null || input.action === undefined) ? "retrieve" : input.action;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? MEMORY_SEARCH_LIMIT_DEFAULT : Math.max(1, Math.min(input.limit, 10));
    const memory_type_filter = (input.memory_type_filter === null) ? undefined : input.memory_type_filter;
    const status_filter = (input.status_filter === null || input.status_filter === undefined) ? "active" : input.status_filter;


    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[MemoryTool:${effectiveAction}] User:${userId?.substring(0, 8)}`;
    const queryInputForStructuredData = { ...input, action: effectiveAction, limit: effectiveLimit, status_filter: status_filter };

    let outputStructuredData: MemoryToolResult = {
      result_type: "internal_memory_result", source_api: "internal_memory",
      query: { query: query || "invalid" }, // Ensure query is part of the log even if initially invalid
      found: false, count: 0, error: undefined, memories: undefined,
    };

    if (abortSignal?.aborted) { outputStructuredData.error = "Memory search cancelled."; return { error: outputStructuredData.error, result: "Cancelled.", structuredData: outputStructuredData }; }
    if (!userId) { outputStructuredData.error = "User ID missing from context."; return { error: outputStructuredData.error, result: "Cannot access memory without user context.", structuredData: outputStructuredData }; }
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      outputStructuredData.error = "Missing or empty memory 'query'.";
      return { error: outputStructuredData.error, result: "What specific memory should I look for?", structuredData: outputStructuredData };
    }
    if (effectiveAction !== "retrieve") {
      outputStructuredData.error = `Action '${effectiveAction}' not supported by agent.`;
      return { error: outputStructuredData.error, result: "I can only retrieve memories right now.", structuredData: outputStructuredData };
    }
    outputStructuredData.query = { query: query.trim() }; // Update with trimmed query

    this.log("info", `${logPrefix} Query: "${query.substring(0, 50)}...", Limit: ${effectiveLimit}`);

    try {
      const pagination: PaginationParams = { limit: effectiveLimit, offset: 0 };
      const searchOptions: SearchOptions = {
        enableHybridSearch: true, enableGraphSearch: true, enableConflictResolution: true,
        filters: {
          ...(input.context?.locale ? { language: input.context.locale.split('-')[0] } : {}),
          ...(memory_type_filter ? { memory_type: memory_type_filter } : {}),
          status: status_filter, // Always apply status filter, defaulting to 'active'
        },
      };

      const searchResult = await this.memoryFramework.search_memory(
        query.trim(), userId, pagination, null, searchOptions
      );

      if (abortSignal?.aborted) { outputStructuredData.error = "Memory search cancelled post-execution."; return { error: outputStructuredData.error, result: "Cancelled.", structuredData: outputStructuredData }; }

      const memories = searchResult.results;
      if (!memories || memories.length === 0) {
        this.log("info", `${logPrefix} No relevant memories found for query.`);
        return { result: "I couldn't find a specific memory matching that query.", structuredData: outputStructuredData };
      }

      this.log("info", `${logPrefix} Found ${memories.length} relevant memories.`);
      const resultString = "Minato recalled the following relevant information:\n" +
        memories.map((mem, index) => {
            const date = new Date(mem.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            const conflictFlag = mem.is_latest_fact === false ? " [Possibly Outdated]" : (mem.is_latest_fact === true ? " [Latest Info]" : "");
            const scoreInfo = (mem.final_score !== null && mem.final_score !== undefined) ? ` (Score: ${mem.final_score.toFixed(2)})` : '';
            const typeInfo = mem.memory_type ? ` [Type: ${mem.memory_type.replace(/_/g, " ")}]` : '';
            const statusInfo = mem.metadata?.status && mem.metadata.status !== 'active' ? ` [Status: ${mem.metadata.status}]` : '';
            const confidenceInfo = (mem.metadata?.confidence_score !== null && mem.metadata?.confidence_score !== undefined) ? ` (Confidence: ${(mem.metadata.confidence_score * 100).toFixed(0)}%)` : '';
            return `${index + 1}. (Around ${date}${scoreInfo}${confidenceInfo}${typeInfo}${statusInfo}${conflictFlag}): ${mem.content}`;
          }).join("\n");

      outputStructuredData.found = true;
      outputStructuredData.count = memories.length;
      outputStructuredData.memories = memories.map((m) => ({
        memory_id: m.memory_id, content: m.content, updated_at: m.updated_at,
        score: m.final_score, is_latest_fact: m.is_latest_fact, memory_type: m.memory_type,
      }));
      outputStructuredData.error = undefined;
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      this.log("error", `${logPrefix} Failed:`, error.message);
      outputStructuredData.error = `Failed to retrieve memory: ${error.message}`;
      outputStructuredData.found = false; outputStructuredData.count = 0;
      return { error: outputStructuredData.error, result: "Sorry, I had trouble searching my memory.", structuredData: outputStructuredData };
    }
  }
}