// FILE: lib/tools/MemoryTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory";
import { logger } from "../../memory-framework/config";
import { MemoryToolResult } from "@/lib/types/index"; // Ensure this specific type is used
import { StoredMemoryUnit, PaginationParams, SearchOptions, SearchResult as MemoryFrameworkSearchResult } from "../../memory-framework/core/types";
import { MEMORY_SEARCH_LIMIT_DEFAULT } from "../constants";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns"; // For better date formatting

interface MemoryToolInput extends ToolInput {
  query: string;
  action?: "retrieve" | null; 
  limit?: number | null; 
  memory_type_filter?: string | null; 
  status_filter?: string | null; 
}

export class MemoryTool extends BaseTool {
  name = "MemoryTool";
  description =
    "Retrieves specific information, facts, preferences, or past conversation details about the user from Minato's long-term memory. Use this to recall details not immediately available in the short-term conversation context.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "The specific question or topic to retrieve from memory. This is required." } as OpenAIToolParameterProperties,
      action: { type: ["string", "null"] as const, enum: ["retrieve", null], description: "Action to perform. If null or omitted, defaults to 'retrieve'." } as OpenAIToolParameterProperties,
      limit: { type: ["number", "null"] as const, description: `Maximum number of relevant memories to retrieve (1-10). If null or omitted, defaults to ${MEMORY_SEARCH_LIMIT_DEFAULT}.` } as OpenAIToolParameterProperties,
      memory_type_filter: { type: ["string", "null"] as const, description: "Optional: Filter memories by type (e.g., 'user_preference', 'fact'). Can be null." } as OpenAIToolParameterProperties,
      status_filter: { type: ["string", "null"] as const, description: "Optional: Filter memories by status (e.g., 'active'). If null or omitted, defaults to 'active'.", } as OpenAIToolParameterProperties,
    },
    required: ["query", "action", "limit", "memory_type_filter", "status_filter"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 15; // Short cache for memory search

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
    const { userId: contextUserId, query } = input; 
    const effectiveAction = (input.action === null || input.action === undefined) ? "retrieve" : input.action;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? MEMORY_SEARCH_LIMIT_DEFAULT : Math.max(1, Math.min(input.limit, 10));
    const memory_type_filter = (input.memory_type_filter === null) ? undefined : input.memory_type_filter;
    const status_filter = (input.status_filter === null || input.status_filter === undefined) ? "active" : input.status_filter;
    const userNameForResponse = input.context?.userName || "User";

    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[MemoryTool:${effectiveAction}] User:${userId?.substring(0, 8)}`;
    const queryInputForStructuredData = { ...input, action: effectiveAction, limit: effectiveLimit, status_filter: status_filter, memory_type_filter: memory_type_filter };

    let outputStructuredData: MemoryToolResult = {
      result_type: "internal_memory_result", source_api: "internal_memory",
      query: { query: query || "invalid_query_input" }, 
      found: false, count: 0, error: undefined, memories: [], // Initialize memories as empty array
    };

    if (abortSignal?.aborted) { outputStructuredData.error = "Memory search cancelled."; return { error: outputStructuredData.error, result: "Cancelled.", structuredData: outputStructuredData }; }
    if (!userId) { outputStructuredData.error = "User ID missing from context."; return { error: outputStructuredData.error, result: "Cannot access memory without user context.", structuredData: outputStructuredData }; }
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      outputStructuredData.error = "Missing or empty memory 'query'.";
      return { error: outputStructuredData.error, result: `What specific memory should Minato look for, ${userNameForResponse}?`, structuredData: outputStructuredData };
    }
    if (effectiveAction !== "retrieve") {
      outputStructuredData.error = `Action '${effectiveAction}' not supported. Only 'retrieve' is allowed.`;
      return { error: outputStructuredData.error, result: `Minato can only retrieve memories right now, ${userNameForResponse}.`, structuredData: outputStructuredData };
    }
    outputStructuredData.query = { query: query.trim() };

    this.log("info", `${logPrefix} Query: "${query.substring(0, 50)}...", Limit: ${effectiveLimit}, TypeFilter: ${memory_type_filter || 'any'}, StatusFilter: ${status_filter}`);

    try {
      const pagination: PaginationParams = { limit: effectiveLimit, offset: 0 };
      const searchOptions: SearchOptions = {
        enableHybridSearch: true, enableGraphSearch: true, enableConflictResolution: true,
        filters: {
          ...(input.context?.locale ? { language: input.context.locale.split('-')[0] } : {}),
          ...(memory_type_filter ? { memory_type: memory_type_filter } : {}),
          status: status_filter, 
        },
      };

      const searchResult = await this.memoryFramework.search_memory(
        query.trim(), userId, pagination, input.context?.runId || null, searchOptions
      );

      if (abortSignal?.aborted) { outputStructuredData.error = "Memory search cancelled post-execution."; return { error: outputStructuredData.error, result: "Cancelled.", structuredData: outputStructuredData }; }

      const memories = searchResult.results;
      if (!memories || memories.length === 0) {
        this.log("info", `${logPrefix} No relevant memories found for query.`);
        outputStructuredData.found = false; outputStructuredData.count = 0;
        return { result: `Minato searched but couldn't find a specific memory for "${query.substring(0,50)}...", ${userNameForResponse}. Perhaps try different keywords?`, structuredData: outputStructuredData };
      }

      this.log("info", `${logPrefix} Found ${memories.length} relevant memories.`);
      let resultString = `Minato recalled some relevant information for you, ${userNameForResponse}:\n`;
      
      const memoriesForSummary = memories.slice(0, 3); // Summarize top 3 for conversational result
      resultString += memoriesForSummary.map((mem, index) => {
          const date = parseISO(mem.updated_at);
          const dateString = format(date, "MMM d, yyyy");
          const relativeDate = `(${formatDistanceToNowStrict(date, { addSuffix: true })})`;
          const conflictFlag = mem.is_latest_fact === false ? " (Possibly Outdated)" : (mem.is_latest_fact === true ? " (Latest Info)" : "");
          const scoreInfo = (mem.final_score !== null && mem.final_score !== undefined) ? ` (Relevance: ${mem.final_score.toFixed(2)})` : '';
          const typeInfo = mem.memory_type ? ` [Type: ${mem.memory_type.replace(/_/g, " ")}]` : '';
          const contentPreview = mem.content.length > 80 ? mem.content.substring(0, 77) + "..." : mem.content;
          return `${index + 1}. Regarding "${contentPreview}"${typeInfo}${conflictFlag} - Updated ${dateString} ${relativeDate}${scoreInfo}.`;
        }).join("\n");
      
      if (memories.length > memoriesForSummary.length) {
        resultString += `\n...and ${memories.length - memoriesForSummary.length} more. I can show you the full list.`;
      }

      outputStructuredData.found = true;
      outputStructuredData.count = memories.length;
      outputStructuredData.memories = memories.map((m) => ({
        memory_id: m.memory_id, content: m.content, updated_at: m.updated_at,
        score: m.final_score, is_latest_fact: m.is_latest_fact, memory_type: m.memory_type,
        // Pass along metadata if the card might use it, e.g. for status or confidence
        // metadata: m.metadata, // Or pick specific fields
      }));
      outputStructuredData.error = undefined;
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      this.log("error", `${logPrefix} Failed:`, error.message);
      outputStructuredData.error = `Failed to retrieve memory: ${error.message}`;
      outputStructuredData.found = false; outputStructuredData.count = 0;
      return { error: outputStructuredData.error, result: `Sorry ${userNameForResponse}, Minato had trouble searching its memory. Please try again.`, structuredData: outputStructuredData };
    }
  }
}