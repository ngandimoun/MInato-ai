// FILE: lib/tools/ReminderReaderTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { supabaseAdmin } from "../supabaseClient";
import { logger } from "../../memory-framework/config";
import {
  ReminderInfo,
  ReminderResult,
  StoredMemoryUnit,
} from "@/lib/types/index"; // Import StoredMemoryUnit
import { formatDistanceToNowStrict, format } from "date-fns";

interface ReminderInput extends ToolInput {
  action?: "get_pending";
  daysAhead?: number;
  limit?: number;
}
const RPC_FUNCTION_NAME = "get_pending_reminders";

export class ReminderReaderTool extends BaseTool {
  name = "ReminderReaderTool";
  description =
    "Reads pending reminders stored in the AI's memory for the user, looking ahead a specified number of days.";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        enum: ["get_pending"],
        description: "Action (default 'get_pending').",
        default: "get_pending",
      },
      daysAhead: {
        type: "number",
        minimum: 0,
        maximum: 30,
        description: "Days ahead to check (default 7).",
        default: 7,
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 15,
        description: "Max reminders (default 10).",
        default: 10,
      },
    },
    required: [],
  };
  cacheTTLSeconds = 60 * 1;

  async execute(input: ReminderInput): Promise<ToolOutput> {
    const { userId, daysAhead = 7, limit = 10 } = input;
    const logPrefix = `[ReminderReaderTool User:${userId?.substring(0, 8)}]`;
    if (!userId)
      return {
        error: "User ID missing.",
        result: "I need to know who you are to check reminders.",
        structuredData: undefined,
      };
    if (!supabaseAdmin) {
      logger.error(`${logPrefix}: Supabase admin client unavailable.`);
      return {
        error: "Database unavailable",
        result: "Sorry, cannot access reminders.",
        structuredData: undefined,
      };
    }

    let outputStructuredData: ReminderResult = {
      result_type: "reminders",
      source_api: "internal_memory",
      query: input,
      reminders: [],
      error: null,
    };

    try {
      const now = new Date();
      const dueBeforeDate = new Date(
        now.getTime() + daysAhead * 24 * 60 * 60 * 1000
      );
      dueBeforeDate.setUTCHours(23, 59, 59, 999);
      const dueBeforeISO = dueBeforeDate.toISOString();
      logger.info(
        `${logPrefix} Fetching pending reminders (Due <= ${dueBeforeISO}, Limit: ${limit}). Calling RPC: ${RPC_FUNCTION_NAME}...`
      );
      const rpcParams = {
        p_user_id: userId,
        p_max_results: Math.max(1, Math.min(limit, 25)),
        p_due_before: dueBeforeISO,
      };
      const { data, error } = await supabaseAdmin.rpc(
        RPC_FUNCTION_NAME,
        rpcParams
      );

      if (error) {
        logger.error(
          `${logPrefix} Supabase RPC '${RPC_FUNCTION_NAME}' error:`,
          error
        );
        throw new Error(`Database error fetching reminders: ${error.message}`);
      }
      if (!Array.isArray(data)) {
        logger.error(
          `${logPrefix} RPC '${RPC_FUNCTION_NAME}' returned non-array data:`,
          data
        );
        throw new Error("Received invalid data format from reminder database.");
      }

      // Validate and map the data (which are StoredMemoryUnit from the RPC)
      const validatedReminders: ReminderInfo[] = data
        .map((item: any): ReminderInfo | null => {
          // Basic structure check for StoredMemoryUnit-like object from RPC
          if (
            !item ||
            typeof item.id !== "string" ||
            typeof item.user_id !== "string" ||
            typeof item.content !== "string" ||
            !item.metadata?.reminder_details ||
            typeof item.metadata.reminder_details.trigger_datetime !==
              "string" ||
            typeof item.metadata.reminder_details.status !== "string"
          ) {
            logger.warn(
              `${logPrefix} Skipping invalid reminder structure from RPC:`,
              item?.id
            );
            return null;
          }
          const reminderDetails = item.metadata.reminder_details;
          return {
            memory_id: item.id,
            user_id: item.user_id,
            original_content: item.content,
            trigger_datetime: reminderDetails.trigger_datetime,
            recurrence_rule: reminderDetails.recurrence_rule,
            status: reminderDetails.status,
            last_sent_at: reminderDetails.last_sent_at,
            error_message: reminderDetails.error_message,
            // These are added for potential UI use, mapping from the base memory unit
            metadata: item.metadata,
            content: item.content,
          };
        })
        .filter((r): r is ReminderInfo => r !== null && r.user_id === userId); // Ensure user ownership again post-map

      if (data.length > 0 && validatedReminders.length !== data.length) {
        logger.warn(
          `${logPrefix} RPC returned ${data.length} items, but only ${validatedReminders.length} passed validation/user check.`
        );
      }

      outputStructuredData.reminders = validatedReminders;
      outputStructuredData.error = null;

      if (validatedReminders.length === 0) {
        const horizonText =
          daysAhead === 0
            ? "for today"
            : `in the next ${daysAhead === 1 ? "day" : `${daysAhead} days`}`;
        logger.info(
          `${logPrefix} No pending reminders found within ${daysAhead} days.`
        );
        return {
          result: `You have no pending reminders scheduled ${horizonText}.`,
          structuredData: outputStructuredData,
        };
      }

      logger.info(
        `${logPrefix} Found ${validatedReminders.length} pending reminders.`
      );
      const reminderSummaries = validatedReminders.map((r) => {
        let triggerString = "Invalid Date";
        let relativeTimeString = "";
        try {
          const triggerDate = new Date(r.trigger_datetime);
          if (!isNaN(triggerDate.getTime())) {
            triggerString = format(triggerDate, "MMM d, yyyy h:mm a");
            relativeTimeString = ` (${formatDistanceToNowStrict(triggerDate, {
              addSuffix: true,
            })})`;
          }
        } catch {}
        const recurrence = r.recurrence_rule
          ? ` (Repeats ${r.recurrence_rule})`
          : "";
        const contentPreview =
          r.original_content.length > 70
            ? r.original_content.substring(0, 67) + "..."
            : r.original_content;
        return `- "${contentPreview}" - Due: ${triggerString}${relativeTimeString}${recurrence} [ID: ${r.memory_id.substring(
          0,
          6
        )}]`;
      });
      const resultString = `Pending reminders for the next ${
        daysAhead === 1 ? "day" : `${daysAhead} days`
      }:\n${reminderSummaries.join("\n")}`;
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      logger.error(`${logPrefix} Failed:`, error);
      outputStructuredData.error = error.message || "Failed to fetch reminders";
      return {
        error: outputStructuredData.error,
        result: "Sorry, I couldn't check your reminders right now.",
        structuredData: outputStructuredData,
      };
    }
  }
}
