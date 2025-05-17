// FILE: lib/tools/ReminderReaderTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { supabaseAdmin } from "../supabaseClient"; // Assuming this is the admin client from getSupabaseAdminClient
import { logger } from "../../memory-framework/config";
import { ReminderInfo, ReminderResult, StoredMemoryUnit } from "@/lib/types/index";
import { formatDistanceToNowStrict, format } from "date-fns";

interface ReminderInput extends ToolInput {
  action?: "get_pending" | null;
  daysAhead?: number | null;
  limit?: number | null;
}
const RPC_FUNCTION_NAME = "get_pending_reminders";

export class ReminderReaderTool extends BaseTool {
  name = "ReminderReaderTool";
  description = "Reads pending reminders stored in the AI's memory for the user, looking ahead a specified number of days.";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: { type: ["string", "null"] as const, enum: ["get_pending", null], description: "Action to perform. If null or omitted, defaults to 'get_pending'." } as OpenAIToolParameterProperties,
      daysAhead: { type: ["number", "null"] as const, description: "Number of days ahead to check for reminders (must be between 0 and 30). If null or omitted, defaults to 7." } as OpenAIToolParameterProperties, // Removed min/max/default
      limit: { type: ["number", "null"] as const, description: "Maximum number of reminders to return (must be between 1 and 15). If null or omitted, defaults to 10." } as OpenAIToolParameterProperties, // Removed min/max/default
    },
    required: ["action", "daysAhead", "limit"], // All defined properties are required
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 1; // Cache for 1 minute

  async execute(input: ReminderInput): Promise<ToolOutput> {
    const { userId: contextUserId } = input;
    // Defaulting logic
    const effectiveAction = (input.action === null || input.action === undefined) ? "get_pending" : input.action;
    const effectiveDaysAhead = (input.daysAhead === null || input.daysAhead === undefined) ? 7 : Math.max(0, Math.min(input.daysAhead, 30));
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 10 : Math.max(1, Math.min(input.limit, 15));

    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[ReminderReaderTool User:${userId?.substring(0,8)}]`;
    const queryInputForStructuredData = {...input, action: effectiveAction, daysAhead: effectiveDaysAhead, limit: effectiveLimit};

    if (!userId) return { error: "User ID missing.", result: `I need to know who you are, ${input.context?.userName || "User"}, to check reminders.`, structuredData: {result_type: "reminders", source_api: "internal_memory", query: queryInputForStructuredData, reminders: [], error: "User ID missing"} };
    if (!supabaseAdmin) {
      logger.error(`${logPrefix}: Supabase admin client unavailable.`);
      return { error: "Database unavailable", result: `Sorry, ${input.context?.userName || "User"}, Minato cannot access reminders.`, structuredData: {result_type: "reminders", source_api: "internal_memory", query: queryInputForStructuredData, reminders: [], error: "Database unavailable"} };
    }

    let outputStructuredData: ReminderResult = {
      result_type: "reminders", source_api: "internal_memory", query: queryInputForStructuredData, reminders: [], error: null,
    };

    try {
      const now = new Date();
      const dueBeforeDate = new Date(now.getTime() + effectiveDaysAhead * 24 * 60 * 60 * 1000);
      dueBeforeDate.setUTCHours(23, 59, 59, 999);
      const dueBeforeISO = dueBeforeDate.toISOString();

      logger.info(`${logPrefix} Fetching pending reminders (Due <= ${dueBeforeISO}, Limit: ${effectiveLimit}). Calling RPC: ${RPC_FUNCTION_NAME}...`);
      const rpcParams = {
        p_user_id: userId,
        p_max_results: Math.max(1, Math.min(effectiveLimit, 25)), // Supabase function might have its own cap
        p_due_before: dueBeforeISO,
      };
      const { data, error } = await supabaseAdmin.rpc(RPC_FUNCTION_NAME, rpcParams);

      if (error) throw new Error(`Database error fetching reminders: ${error.message}`);
      if (!Array.isArray(data)) throw new Error("Received invalid data format from reminder database.");

      const validatedReminders: ReminderInfo[] = data.map((item: any): ReminderInfo | null => {
        if (!item || typeof item.id !== 'string' || typeof item.user_id !== 'string' || typeof item.content !== 'string' || !item.metadata?.reminder_details || typeof item.metadata.reminder_details.trigger_datetime !== 'string' || typeof item.metadata.reminder_details.status !== 'string') {
          logger.warn(`${logPrefix} Skipping invalid reminder structure from RPC:`, item?.id); return null;
        }
        const reminderDetails = item.metadata.reminder_details;
        return {
          memory_id: item.id, user_id: item.user_id, original_content: item.content,
          trigger_datetime: reminderDetails.trigger_datetime, recurrence_rule: reminderDetails.recurrence_rule || null, // Ensure null if undefined
          status: reminderDetails.status, last_sent_at: reminderDetails.last_sent_at || null,
          error_message: reminderDetails.error_message || null,
          metadata: item.metadata, content: item.content, // Keep these for broader context if needed
        };
      }).filter((r): r is ReminderInfo => r !== null && r.user_id === userId);

      if (data.length > 0 && validatedReminders.length !== data.length) {
        logger.warn(`${logPrefix} RPC returned ${data.length} items, but only ${validatedReminders.length} passed validation/user check.`);
      }

      outputStructuredData.reminders = validatedReminders; outputStructuredData.error = null;

      if (validatedReminders.length === 0) {
        const horizonText = effectiveDaysAhead === 0 ? "for today" : `in the next ${effectiveDaysAhead === 1 ? "day" : `${effectiveDaysAhead} days`}`;
        logger.info(`${logPrefix} No pending reminders found within ${effectiveDaysAhead} days.`);
        return { result: `You have no pending reminders scheduled ${horizonText}, ${input.context?.userName || "User"}.`, structuredData: outputStructuredData };
      }

      logger.info(`${logPrefix} Found ${validatedReminders.length} pending reminders.`);
      const reminderSummaries = validatedReminders.map(r => {
        let triggerString = "Invalid Date"; let relativeTimeString = "";
        try {
          const triggerDate = new Date(r.trigger_datetime);
          if (!isNaN(triggerDate.getTime())) {
            triggerString = format(triggerDate, "MMM d, yyyy h:mm a");
            relativeTimeString = ` (${formatDistanceToNowStrict(triggerDate, { addSuffix: true })})`;
          }
        } catch {}
        const recurrence = r.recurrence_rule ? ` (Repeats ${r.recurrence_rule})` : "";
        const contentPreview = r.original_content.length > 70 ? r.original_content.substring(0,67)+"..." : r.original_content;
        return `- "${contentPreview}" - Due: ${triggerString}${relativeTimeString}${recurrence} [ID: ${r.memory_id.substring(0,6)}]`;
      });
      const resultString = `Pending reminders for ${input.context?.userName || "User"} for the next ${effectiveDaysAhead === 1 ? "day" : `${effectiveDaysAhead} days`}:\n${reminderSummaries.join("\n")}`;
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      logger.error(`${logPrefix} Failed:`, error);
      outputStructuredData.error = error.message || "Failed to fetch reminders";
      return { error: outputStructuredData.error, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't check your reminders right now.`, structuredData: outputStructuredData };
    }
  }
}