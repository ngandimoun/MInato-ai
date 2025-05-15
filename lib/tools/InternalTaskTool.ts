// FILE: lib/tools/InternalTaskTool.ts
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory"; // Adjusted path
import { logger } from "../../memory-framework/config";
import { InternalTask, InternalTaskResult } from "@/lib/types"; // Use new types
import { StoredMemoryUnit } from "../../memory-framework/core/types"; // Adjusted path
import { randomUUID } from "crypto";

interface InternalTaskInput extends ToolInput {
  action: "add_task" | "list_tasks" | "complete_task";
  task_content?: string;
  task_id?: string;
  filter?: "pending" | "completed" | "all";
  due_date?: string; // YYYY-MM-DD
  limit?: number;
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
      action: {
        type: "string",
        enum: ["add_task", "list_tasks", "complete_task"],
        description: "The action to perform.",
      },
      task_content: {
        type: "string",
        description: "The content of the task to add.",
      },
      task_id: {
        type: "string",
        description: "The ID (memory_id) of the task to complete.",
      },
      filter: {
        type: "string",
        enum: ["pending", "completed", "all"],
        description: "Filter tasks by status when listing.",
        default: "pending",
      },
      due_date: {
        type: "string",
        format: "date",
        description: "Optional due date (YYYY-MM-DD) when adding.",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 20,
        description: "Max tasks to list (default 10).",
        default: 10,
      },
    },
    required: ["action"],
  };
  cacheTTLSeconds = undefined;

  private memoryFramework: CompanionCoreMemory;

  constructor(memoryFrameworkInstance: CompanionCoreMemory) {
    super();
    if (!memoryFrameworkInstance) {
      throw new Error(
        "InternalTaskTool requires an instance of CompanionCoreMemory."
      );
    }
    this.memoryFramework = memoryFrameworkInstance;
    this.log("info", "InternalTaskTool initialized.");
  }

  private mapMemoryToTask(memory: StoredMemoryUnit): InternalTask | null {
    if (!memory) return null; // Gérer le cas où memory est null
    if (memory.categories.includes(TASK_MEMORY_CATEGORY)) {
      return {
        // S'assurer que InternalTask a bien result_type et source_api si c'est une AnyToolStructuredData
        // Pour l'instant, on assume que InternalTask est juste l'interface pour une tâche
        id: memory.memory_id,
        content: memory.content,
        status:
          memory.metadata?.status === TASK_STATUS_COMPLETED
            ? TASK_STATUS_COMPLETED
            : TASK_STATUS_PENDING,
        due_date:
          typeof memory.metadata?.due_date === "string"
            ? memory.metadata.due_date
            : null,
        created_at: memory.created_at,
        updated_at: memory.updated_at,
      };
    }
    return null;
  }

  async execute(
    input: InternalTaskInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const {
      userId,
      action,
      task_content,
      task_id,
      filter = "pending",
      due_date,
      limit = 10,
    } = input;
    const logPrefix = `[InternalTaskTool User:${userId?.substring(
      0,
      8
    )} Action:${action}]`;

    let outputStructuredData: InternalTaskResult = {
      result_type: "internal_tasks",
      source_api: "internal_memory",
      query: input,
      action: action,
      status: "error",
      tasks: [],
      error: "Action not processed",
    };

    if (!userId) {
      outputStructuredData.error = "User ID missing.";
      return {
        error: outputStructuredData.error,
        result: "I need to know who you are to manage tasks.",
        structuredData: outputStructuredData,
      };
    }
    if (
      action === "add_task" &&
      (!task_content ||
        typeof task_content !== "string" ||
        task_content.trim().length === 0)
    ) {
      outputStructuredData.error = "Task content is required to add a task.";
      return {
        error: outputStructuredData.error,
        result: "What is the task?",
        structuredData: outputStructuredData,
      };
    }
    if (
      action === "complete_task" &&
      (!task_id || typeof task_id !== "string")
    ) {
      outputStructuredData.error = "Task ID is required to complete a task.";
      return {
        error: outputStructuredData.error,
        result: "Which task ID should I complete?",
        structuredData: outputStructuredData,
      };
    }

    try {
      if (action === "add_task") {
        if (!task_content) {
          // Vérification redondante mais sûre
          outputStructuredData.error =
            "Task content is essential for adding a task.";
          return {
            error: outputStructuredData.error,
            result: "What task should I add?",
            structuredData: outputStructuredData,
          };
        }

        const memoryId = randomUUID();
        const now = new Date().toISOString();
        const memoryToAdd: StoredMemoryUnit = {
          memory_id: memoryId,
          user_id: userId,
          run_id: input.context?.runId || input.sessionId || null,
          role: "system",
          content: task_content.trim(),
          metadata: {
            status: TASK_STATUS_PENDING,
            ...(due_date && { due_date: due_date }),
            tool_managed: true,
            role: "system",
          },
          categories: [TASK_MEMORY_CATEGORY],
          memory_type: "task",
          embedding: null,
          expires_at: null,
          language: input.lang || undefined,
          source_turn_ids: undefined, // ou null si votre DB le gère
          created_at: now,
          updated_at: now,
        };

        logger.info(
          `${logPrefix} Adding task via insertMemoryUnits: "${task_content.substring(
            0,
            50
          )}..."`
        );
        const success =
          await this.memoryFramework.supabaseService.insertMemoryUnits([
            memoryToAdd,
          ]);
        if (!success) {
          logger.error(
            `${logPrefix} Failed to insert task memory unit via SupabaseService.`
          );
          throw new Error("Failed to save task to memory database.");
        }

        const createdTask = this.mapMemoryToTask(memoryToAdd);
        if (!createdTask) {
          // Ceci ne devrait pas arriver si memoryToAdd est correct
          logger.error(
            `${logPrefix} Failed to map newly created task for response, memory_id: ${memoryId}`
          );
          throw new Error("Internal error creating task representation.");
        }

        outputStructuredData.status = "task_added";
        outputStructuredData.tasks = [createdTask];
        outputStructuredData.error = null;
        logger.info(
          `${logPrefix} Task added successfully to DB (ID: ${memoryId}).`
        );
        return {
          result: `Okay, Minato added "${task_content.trim()}" to your tasks.`,
          structuredData: outputStructuredData,
        };
      } else if (action === "list_tasks") {
        logger.info(`${logPrefix} Listing tasks with filter: ${filter}`);
        const searchFilters: Record<string, any> = {
          categories: [TASK_MEMORY_CATEGORY],
          metadata: {}, // Initialiser metadata
        };
        if (filter === "completed") {
          searchFilters.metadata.status = TASK_STATUS_COMPLETED;
        } else if (filter === "pending") {
          searchFilters.metadata.status = TASK_STATUS_PENDING;
        }
        // Si filter === 'all', searchFilters.metadata restera vide, ce qui est ok
        // si votre fonction search_memory ne filtre pas par metadata.status si non fourni.
        // Sinon, vous pourriez avoir besoin de ne pas passer searchFilters.metadata du tout.
        // Pour l'instant, on assume que la fonction RPC gère un objet metadata vide.

        const searchResults = await this.memoryFramework.search_memory(
          "task list",
          userId,
          { limit: Math.min(limit, 25), offset: 0 },
          null,
          {
            filters: searchFilters,
            enableHybridSearch: false,
            enableGraphSearch: false,
          }
        );

        const tasks = searchResults.results
          .map((mem) => this.mapMemoryToTask(mem as StoredMemoryUnit))
          .filter((task): task is InternalTask => task !== null);

        outputStructuredData.status = "tasks_listed";
        outputStructuredData.tasks = tasks;
        outputStructuredData.filter = filter;
        outputStructuredData.error = null;

        if (tasks.length === 0) {
          logger.info(`${logPrefix} No ${filter} tasks found.`);
          return {
            result: `You have no ${filter} tasks.`,
            structuredData: outputStructuredData,
          };
        }

        logger.info(`${logPrefix} Found ${tasks.length} ${filter} tasks.`);
        const taskSummaries = tasks.map(
          (t) =>
            `- ${t.content}${
              t.due_date ? ` (Due: ${t.due_date})` : ""
            } [ID: ${t.id.substring(0, 6)}]`
        );
        const resultString = `Your ${filter} tasks:\n${taskSummaries.join(
          "\n"
        )}`;
        return { result: resultString, structuredData: outputStructuredData };
      } else if (action === "complete_task") {
        if (!task_id) {
          // Vérification redondante
          outputStructuredData.error =
            "Task ID is crucial for completing a task.";
          return {
            error: outputStructuredData.error,
            result: "Which task ID should I complete?",
            structuredData: outputStructuredData,
          };
        }

        logger.info(
          `${logPrefix} Completing task ID: ${task_id.substring(0, 8)}...`
        );
        const taskMemory = await this.memoryFramework.fetchMemoryById(task_id);

        if (!taskMemory) {
          logger.warn(
            `${logPrefix} Task memory unit not found for ID: ${task_id}`
          );
          outputStructuredData.error = "Task not found.";
          return {
            error: outputStructuredData.error,
            result: `Minato couldn't find a task with ID starting ${task_id.substring(
              0,
              6
            )}.`,
            structuredData: outputStructuredData,
          };
        }
        if (!taskMemory.categories.includes(TASK_MEMORY_CATEGORY)) {
          logger.warn(`${logPrefix} Memory unit ${task_id} is not a task.`);
          outputStructuredData.error = "This item is not a task.";
          return {
            error: outputStructuredData.error,
            result: `Item with ID starting ${task_id.substring(
              0,
              6
            )} is not a task.`,
            structuredData: outputStructuredData,
          };
        }

        if (taskMemory.metadata?.status === TASK_STATUS_COMPLETED) {
          logger.info(
            `${logPrefix} Task ${task_id.substring(0, 8)} already completed.`
          );
          outputStructuredData.status = "already_completed";
          const mappedTask = this.mapMemoryToTask(taskMemory); // mapMemoryToTask gère null
          outputStructuredData.tasks = mappedTask ? [mappedTask] : [];
          outputStructuredData.error = null;
          return {
            result: `Task "${taskMemory.content}" was already marked as complete.`,
            structuredData: outputStructuredData,
          };
        }

        // Déclaration de updatedMemory ici
        const updatedMemory = await this.memoryFramework.update_memory(
          task_id,
          {
            metadata: {
              ...taskMemory.metadata,
              status: TASK_STATUS_COMPLETED,
              role: taskMemory.role,
            }, // Assurez-vous que 'role' est bien dans metadata
            role: taskMemory.role, // Passer le rôle existant est important pour update_memory
          }
        );

        if (!updatedMemory) {
          logger.error(
            `${logPrefix} Failed to update task memory ${task_id} to completed status.`
          );
          throw new Error(
            `Failed to update task memory ${task_id} to completed status.`
          );
        }

        // Utilisation de completedTask après sa déclaration et assignation
        const completedTask = this.mapMemoryToTask(updatedMemory);
        if (!completedTask) {
          logger.error(
            `${logPrefix} Failed to map updated task for response, memory_id: ${task_id}`
          );
          throw new Error(
            "Internal error creating completed task representation."
          );
        }

        outputStructuredData.status = "task_completed";
        outputStructuredData.tasks = [completedTask]; // completedTask ne peut plus être null ici
        outputStructuredData.error = null;
        logger.info(
          `${logPrefix} Task ${task_id.substring(0, 8)} marked as complete.`
        );
        return {
          result: `Okay, Minato marked task "${updatedMemory.content}" as complete.`,
          structuredData: outputStructuredData,
        };
      } else {
        // Ce cas ne devrait pas être atteint si la validation initiale de 'action' est correcte
        // et si le type de 'action' est bien restreint.
        const exhaustiveCheck: never = action; // Pour s'assurer que tous les cas de 'action' sont gérés
        outputStructuredData.error = `Invalid action: ${action}`;
        logger.error(`${logPrefix} Reached invalid action case: ${action}`);
        return {
          error: outputStructuredData.error,
          result: `Unknown task action: ${action}`,
          structuredData: outputStructuredData,
        };
      }
    } catch (error: any) {
      logger.error(`${logPrefix} Failed:`, error.message, error.stack);
      outputStructuredData.error =
        error.message || "Failed to process task request.";
      outputStructuredData.status = "error"; // Assurez-vous que le status reflète l'erreur
      return {
        error: outputStructuredData.error,
        result: "Sorry, Minato couldn't manage your tasks right now.",
        structuredData: outputStructuredData,
      };
    }
    // La ligne suivante n'est jamais atteinte à cause des return dans chaque branche du if/else if/else
    // Si elle l'était, ce serait une erreur logique.
    // return { error: "Reached end of function unexpectedly.", result: "Unexpected error.", structuredData: outputStructuredData };
  }
}
