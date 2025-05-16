// FILE: lib/tools/MemoryTool.ts
// Implementation added

import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory"; // Adjust path
import {
  PaginationParams,
  SearchOptions,
  SearchResult as MemoryFrameworkSearchResult, // Use aliased import if needed
} from "../../memory-framework/core/types"; // Adjust path
import { MEMORY_SEARCH_LIMIT_DEFAULT } from "../constants";
import { logger } from "../../memory-framework/config"; // Use shared logger
import { MemoryToolResult } from "@/lib/types/index";

// Assume MemoryFrameworkSearchResult in memory-framework/core/types is updated to include:
// memory_type?: string;
// status?: string;
// confidence_score?: number;

interface MemoryToolInput extends ToolInput {
  query: string; // The specific question or topic to retrieve from memory
  action?: "retrieve"; // Limit agent to only retrieving for now
  limit?: number;
  // Potential new input options for filtering
  memory_type_filter?: string;
  status_filter?: string;
}

export class MemoryTool extends BaseTool {
  name = "MemoryTool";
  description =
    "Retrieves specific information, facts, preferences, or past conversation details about the user from your long-term memory banks. Use this when you need to recall a specific detail not immediately available in the short-term conversation context.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The specific question or topic to retrieve from memory.",
      },
      action: {
        type: "string",
        enum: ["retrieve"],
        description: "Action to perform (currently only 'retrieve' is supported for agents).",
        default: "retrieve",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 10,
        description: `Maximum number of relevant memories to retrieve. Defaults to ${MEMORY_SEARCH_LIMIT_DEFAULT}.`,
        default: MEMORY_SEARCH_LIMIT_DEFAULT,
      },
      memory_type_filter: {
        type: "string",
        description: "Optional: Filter memories by a specific type (e.g., user_preference, fact).",
        nullable: true,
      },
      status_filter: {
        type: "string",
        description: "Optional: Filter memories by status (e.g., active, archived). Defaults to active if not specified by the underlying framework.",
        nullable: true,
        default: "active",
      },
    },
    required: ["query"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 15; // Short cache for memory lookups as context changes

  private memoryFramework: CompanionCoreMemory;

  // Inject the memory framework instance
  constructor(memoryFrameworkInstance: CompanionCoreMemory) {
    super();
    if (!memoryFrameworkInstance) {
      throw new Error("MemoryTool requires an instance of CompanionCoreMemory.");
    }
    this.memoryFramework = memoryFrameworkInstance;
    this.log("info", "MemoryTool initialized with framework instance.");
  }

  async execute(input: MemoryToolInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { userId, query, limit = MEMORY_SEARCH_LIMIT_DEFAULT } = input; // Use constant default
    const action = input.action || "retrieve"; // Default to retrieve if not specified
    const logPrefix = `[MemoryTool:${action}] User:${userId?.substring(0, 8)}`;

    // Initialize structured data
    let outputStructuredData: MemoryToolResult = {
      result_type: "internal_memory_result",
      source_api: "internal_memory",
      query: { query: query || "invalid" },
      found: false,
      count: 0,
      error: undefined,
      memories: undefined,
    };

     // Check abort signal early
    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      outputStructuredData.error = "Memory search cancelled.";
      return { error: outputStructuredData.error, result: "Cancelled.", structuredData: outputStructuredData };
    }


    if (!userId) {
      outputStructuredData.error = "User ID missing from context.";
      return { error: outputStructuredData.error, result: "Cannot access memory without user context.", structuredData: outputStructuredData };
    }
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      outputStructuredData.error = "Missing or empty memory 'query'.";
      return { error: outputStructuredData.error, result: "What specific memory should I look for?", structuredData: outputStructuredData };
    }
    if (action !== "retrieve") {
      outputStructuredData.error = `Action '${action}' not supported by agent.`;
      return { error: outputStructuredData.error, result: "I can only retrieve memories right now.", structuredData: outputStructuredData };
    }
    // Ensure query is updated in case it was initially invalid
    outputStructuredData.query = { query: query.trim() };

    this.log("info", `${logPrefix} Query: "${query.substring(0, 50)}...", Limit: ${limit}`);

    try {
      const pagination: PaginationParams = {
        limit: Math.max(1, Math.min(limit, 10)), // Clamp limit
        offset: 0, // Start from the beginning for tool calls
      };
      const searchOptions: SearchOptions = {
        // Default search options for the tool
        enableHybridSearch: true,
        enableGraphSearch: true,
        enableConflictResolution: true, // Enable conflict resolution
        // Pass context filters if needed, e.g., language
        filters: {
          ...(input.context?.locale ? { language: input.context.locale.split('-')[0] } : {}),
          // Pass through new filters to your memory framework if it supports them
          ...(input.memory_type_filter ? { memory_type: input.memory_type_filter } : {}),
          ...(input.status_filter ? { status: input.status_filter } : { status: "active" }), // Default to active
        },
      };

      const searchResult = await this.memoryFramework.search_memory(
        query.trim(), // Use trimmed query
        userId,
        pagination,
        null, // Assume search across all user's runs unless specified otherwise
        searchOptions
      );

       // Check abort signal *after* the potentially long search call
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Memory search aborted.`);
        outputStructuredData.error = "Memory search cancelled.";
        return { error: outputStructuredData.error, result: "Cancelled.", structuredData: outputStructuredData };
      }


      const memories = searchResult.results;

      if (!memories || memories.length === 0) {
        this.log("info", `${logPrefix} No relevant memories found for query.`);
        // outputStructuredData defaults are already { found: false, count: 0 }
        return { result: "I couldn't find a specific memory matching that query.", structuredData: outputStructuredData };
      }

      this.log("info", `${logPrefix} Found ${memories.length} relevant memories.`);

      const resultString = "Minato recalled the following relevant information:\n" +
        memories
          .map((mem, index) => {
            const date = new Date(mem.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            const conflictFlag = mem.is_latest_fact === false ? " [Possibly Outdated]" : (mem.is_latest_fact === true ? " [Latest Info]" : "");
            const scoreInfo = (mem.final_score !== null && mem.final_score !== undefined) ? ` (Score: ${mem.final_score.toFixed(2)})` : '';
            const typeInfo = mem.memory_type ? ` [Type: ${mem.memory_type}]` : '';
            const statusInfo = mem.metadata?.status && mem.metadata.status !== 'active' ? ` [Status: ${mem.metadata.status}]` : '';
            const confidenceInfo = (mem.metadata?.confidence_score !== null && mem.metadata?.confidence_score !== undefined) ? ` (Confidence: ${(mem.metadata.confidence_score * 100).toFixed(0)}%)` : '';

            return `${index + 1}. (Around ${date}${scoreInfo}${confidenceInfo}${typeInfo}${statusInfo}${conflictFlag}): ${mem.content}`;
          })
          .join("\n");

      // Populate structured data on success
      outputStructuredData.found = true;
      outputStructuredData.count = memories.length;
      outputStructuredData.memories = memories.map((m) => ({
        memory_id: m.memory_id,
        content: m.content,
        updated_at: m.updated_at,
        score: m.final_score,
        is_latest_fact: m.is_latest_fact,
        // Add new fields
        memory_type: m.memory_type,
        // status et confidence_score sont dans metadata si besoin
      }));
      outputStructuredData.error = undefined; // Clear error on success

      return {
        result: resultString,
        structuredData: outputStructuredData,
      };
    } catch (error: any) {
      this.log("error", `${logPrefix} Failed:`, error.message);
      outputStructuredData.error = `Failed to retrieve memory: ${error.message}`;
      outputStructuredData.found = false;
      outputStructuredData.count = 0;
      return {
        error: outputStructuredData.error,
        result: "Sorry, I had trouble searching my memory.",
        structuredData: outputStructuredData, // Include error in structure
      };
    }
  }
}