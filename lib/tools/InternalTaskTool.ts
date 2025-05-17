// FILE: lib/tools/InternalTaskTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory";
import { logger } from "../../memory-framework/config";
import { InternalTask, InternalTaskResult } from "@/lib/types";
import { StoredMemoryUnit } from "../../memory-framework/core/types";
import { randomUUID } from "crypto";

interface InternalTaskInput extends ToolInput {
  action: "add_task" | "list_tasks" | "complete_task";
  task_content?: string | null;
  task_id?: string | null;
  filter?: "pending" | "completed" | "all" | null;
  due_date?: string | null; // YYYY-MM-DD
  limit?: number | null;
}

const TASK_MEMORY_CATEGORY = "task";
const TASK_STATUS_PENDING = "pending";
const TASK_STATUS_COMPLETED = "completed";

export class InternalTaskTool extends BaseTool {
  name = "InternalTaskTool";
  description =
    "Manages a simple internal task list stored in memory. Can add tasks, list pending/completed tasks, and mark tasks as complete.";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: { type: "string" as const, enum: ["add_task", "list_tasks", "complete_task"], description: "The action to perform. This is required." } as OpenAIToolParameterProperties,
      task_content: { type: ["string", "null"] as const, description: "The content of the task to add. Required for 'add_task'. Can be null otherwise." } as OpenAIToolParameterProperties,
      task_id: { type: ["string", "null"] as const, description: "The ID (memory_id) of the task to complete. Required for 'complete_task'. Can be null otherwise." } as OpenAIToolParameterProperties,
      filter: { type: ["string", "null"] as const, enum: ["pending", "completed", "all", null], description: "Filter tasks by status when listing. If null or omitted for 'list_tasks', defaults to 'pending'." } as OpenAIToolParameterProperties,
      due_date: { type: ["string", "null"] as const, description: "Optional due date (YYYY-MM-DD format, e.g., '2024-08-15') when adding a task. Can be null." } as OpenAIToolParameterProperties, // Removed format: "date"
      limit: { type: ["number", "null"] as const, description: "Maximum number of tasks to list (must be between 1 and 20). If null or omitted for 'list_tasks', defaults to 10." } as OpenAIToolParameterProperties, // Removed min/max/default
    },
    required: ["action", "task_content", "task_id", "filter", "due_date", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined;

  private memoryFramework: CompanionCoreMemory;

  constructor(memoryFrameworkInstance: CompanionCoreMemory) {
    super();
    if (!memoryFrameworkInstance) throw new Error("InternalTaskTool requires an instance of CompanionCoreMemory.");
    this.memoryFramework = memoryFrameworkInstance;
    this.log("info", "InternalTaskTool initialized.");
  }

  private mapMemoryToTask(memory: StoredMemoryUnit | null): InternalTask | null {
    if (!memory) return null;
    if (memory.categories.includes(TASK_MEMORY_CATEGORY)) {
      return {
        id: memory.memory_id, content: memory.content,
        status: memory.metadata?.status === TASK_STATUS_COMPLETED ? TASK_STATUS_COMPLETED : TASK_STATUS_PENDING,
        due_date: typeof memory.metadata?.due_date === 'string' ? memory.metadata.due_date : null,
        created_at: memory.created_at, updated_at: memory.updated_at,
      };
    }
    return null;
  }

  async execute(input: InternalTaskInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { userId: contextUserId, action } = input;
    // Defaulting logic
    const task_content = (input.task_content === null) ? undefined : input.task_content;
    const task_id = (input.task_id === null) ? undefined : input.task_id;
    const effectiveFilter = (input.filter === null || input.filter === undefined) ? "pending" : input.filter;
    const due_date = (input.due_date === null) ? undefined : input.due_date;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 10 : Math.max(1, Math.min(input.limit, 20));


    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[InternalTaskTool User:${userId?.substring(0,8)} Action:${action}]`;
    const queryInputForStructuredData = {...input, filter: effectiveFilter, limit: effectiveLimit};

    let outputStructuredData: InternalTaskResult = {
      result_type: "internal_tasks", source_api: "internal_memory", query: queryInputForStructuredData,
      action: action, status: "error", tasks: [], error: "Action not processed",
    };

    if (!userId) { outputStructuredData.error = "User ID missing."; return { error: "User ID missing.", result: `I need to know who you are, ${input.context?.userName || "User"}, to manage tasks.`, structuredData: outputStructuredData }; }
    if (action === "add_task" && (!task_content || task_content.trim().length === 0)) {
      outputStructuredData.error = "Task content required."; return { error: "Task content is required to add a task.", result: `What is the task, ${input.context?.userName || "User"}?`, structuredData: outputStructuredData };
    }
    if (action === "complete_task" && (!task_id || typeof task_id !== "string")) {
      outputStructuredData.error = "Task ID required."; return { error: "Task ID is required to complete a task.", result: `Which task ID should Minato complete, ${input.context?.userName || "User"}?`, structuredData: outputStructuredData };
    }

    try {
      if (action === "add_task") {
        if (!task_content) { outputStructuredData.error = "Task content missing."; return { error: "Task content missing.", result: "What task to add?", structuredData: outputStructuredData }; }
        const memoryId = randomUUID();
        const now = new Date().toISOString();
        const memoryToAdd: StoredMemoryUnit = {
          memory_id: memoryId, user_id: userId, run_id: input.context?.runId || input.sessionId || null,
          role: "system", content: task_content.trim(),
          metadata: { status: TASK_STATUS_PENDING, ...(due_date && { due_date: due_date }), tool_managed: true, role: "system" },
          categories: [TASK_MEMORY_CATEGORY], memory_type: "task", embedding: null, expires_at: null,
          language: input.lang || undefined, source_turn_ids: null, created_at: now, updated_at: now,
        };
        logger.info(`${logPrefix} Adding task via insertMemoryUnits: "${task_content.substring(0,50)}..."`);
        const success = await this.memoryFramework.supabaseService.insertMemoryUnits([memoryToAdd]);
        if (!success) throw new Error("Failed to save task to memory database.");
        const createdTask = this.mapMemoryToTask(memoryToAdd);
        if (!createdTask) throw new Error("Internal error creating task representation.");
        outputStructuredData.status = "task_added"; outputStructuredData.tasks = [createdTask]; outputStructuredData.error = null;
        logger.info(`${logPrefix} Task added successfully to DB (ID: ${memoryId}).`);
        return { result: `Okay, ${input.context?.userName || "User"}, Minato added "${task_content.trim()}" to your tasks.`, structuredData: outputStructuredData };

      } else if (action === "list_tasks") {
        logger.info(`${logPrefix} Listing tasks with filter: ${effectiveFilter}`);
        const searchFilters: Record<string, any> = { categories: [TASK_MEMORY_CATEGORY], metadata: {} };
        if (effectiveFilter === "completed") (searchFilters.metadata as Record<string, any>).status = TASK_STATUS_COMPLETED;
        else if (effectiveFilter === "pending") (searchFilters.metadata as Record<string, any>).status = TASK_STATUS_PENDING;

        const searchResults = await this.memoryFramework.search_memory("task list", userId, { limit: Math.min(effectiveLimit, 25), offset: 0 }, null, { filters: searchFilters, enableHybridSearch: false, enableGraphSearch: false });
        const tasks = searchResults.results.map(mem => this.mapMemoryToTask(mem as StoredMemoryUnit)).filter((task): task is InternalTask => task !== null);
        outputStructuredData.status = "tasks_listed"; outputStructuredData.tasks = tasks; outputStructuredData.filter = effectiveFilter; outputStructuredData.error = null;
        if (tasks.length === 0) {
          logger.info(`${logPrefix} No ${effectiveFilter} tasks found for ${input.context?.userName || "User"}.`);
          return { result: `You have no ${effectiveFilter} tasks, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
        }
        logger.info(`${logPrefix} Found ${tasks.length} ${effectiveFilter} tasks.`);
        const taskSummaries = tasks.map(t => `- ${t.content}${t.due_date ? ` (Due: ${t.due_date})` : ""} [ID: ${t.id.substring(0,6)}]`);
        const resultString = `Your ${effectiveFilter} tasks, ${input.context?.userName || "User"}:\n${taskSummaries.join("\n")}`;
        return { result: resultString, structuredData: outputStructuredData };

      } else if (action === "complete_task") {
        if (!task_id) { outputStructuredData.error = "Task ID required."; return { error: "Task ID required.", result: "Which task ID to complete?", structuredData: outputStructuredData }; }
        logger.info(`${logPrefix} Completing task ID: ${task_id.substring(0,8)}...`);
        const taskMemory = await this.memoryFramework.fetchMemoryById(task_id);
        if (!taskMemory) { outputStructuredData.error = "Task not found."; outputStructuredData.status = "not_found"; return { error: outputStructuredData.error, result: `Minato couldn't find a task with ID starting ${task_id.substring(0,6)}, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData }; }
        if (!taskMemory.categories.includes(TASK_MEMORY_CATEGORY)) { outputStructuredData.error = "This item is not a task."; outputStructuredData.status = "not_found"; return { error: outputStructuredData.error, result: `Item with ID starting ${task_id.substring(0,6)} is not a task, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData }; }
        if (taskMemory.metadata?.status === TASK_STATUS_COMPLETED) {
            const mappedTask = this.mapMemoryToTask(taskMemory);
            outputStructuredData.status = "already_completed"; outputStructuredData.tasks = mappedTask ? [mappedTask] : []; outputStructuredData.error = null;
            return { result: `Task "${taskMemory.content}" was already marked as complete, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
        }
        const updatedMemory = await this.memoryFramework.update_memory(task_id, { metadata: { ...taskMemory.metadata, status: TASK_STATUS_COMPLETED, role: taskMemory.role }, role: taskMemory.role });
        if (!updatedMemory) throw new Error(`Failed to update task memory ${task_id} to completed status.`);
        const completedTask = this.mapMemoryToTask(updatedMemory);
        if (!completedTask) throw new Error("Internal error creating completed task representation.");
        outputStructuredData.status = "task_completed"; outputStructuredData.tasks = [completedTask]; outputStructuredData.error = null;
        logger.info(`${logPrefix} Task ${task_id.substring(0,8)} marked as complete.`);
        return { result: `Okay, ${input.context?.userName || "User"}, Minato marked task "${updatedMemory.content}" as complete.`, structuredData: outputStructuredData };
      } else {
        const exhaustiveCheck: never = action;
        outputStructuredData.error = `Invalid action: ${action}`;
        logger.error(`${logPrefix} Reached invalid action case: ${action}`);
        return { error: outputStructuredData.error, result: `Unknown task action: ${action}`, structuredData: outputStructuredData };
      }
    } catch (error: any) {
      logger.error(`${logPrefix} Failed:`, error.message, error.stack);
      outputStructuredData.error = error.message || "Failed to process task request.";
      outputStructuredData.status = "error";
      return { error: outputStructuredData.error, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't manage your tasks right now.`, structuredData: outputStructuredData };
    }
  }
}