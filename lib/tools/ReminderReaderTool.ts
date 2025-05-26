// FILE: lib/tools/ReminderReaderTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { supabaseAdmin } from "../supabaseClient";
import { logger } from "../../memory-framework/config";
import { ReminderInfo, ReminderResult, StoredMemoryUnit, ReminderDetails } from "@/lib/types/index";
import { formatDistanceToNowStrict, format, isPast, parseISO, differenceInCalendarDays } from "date-fns";

interface ReminderInput extends ToolInput {
  action?: "get_pending" | null;
  daysAhead?: number | null;
  limit?: number | null;
}
const RPC_FUNCTION_NAME = "get_pending_reminders";

export class ReminderReaderTool extends BaseTool {
  name = "ReminderReaderTool";
  description = "Reads reminders from the user's Minato memory system.";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: { type: ["string", "null"] as const, enum: ["get_pending", null], description: "Action to perform. If null or omitted, defaults to 'get_pending'." } as OpenAIToolParameterProperties,
      daysAhead: { type: ["number", "null"] as const, description: "Number of days ahead to check for reminders (0-30). If null or omitted, defaults to 7." } as OpenAIToolParameterProperties,
      limit: { type: ["number", "null"] as const, description: "Max reminders to return (1-15). If null or omitted, defaults to 10." } as OpenAIToolParameterProperties,
    },
    required: ["action", "daysAhead", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 1; // Cache for 1 minute
  categories = ["reminder", "productivity", "memory"];
  version = "1.0.0";
  metadata = { provider: "Minato Memory Framework", supports: ["read_reminders"] };

  async execute(input: ReminderInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { userId: contextUserId } = input;
    const effectiveAction = (input.action === null || input.action === undefined) ? "get_pending" : input.action;
    const effectiveDaysAhead = (input.daysAhead === null || input.daysAhead === undefined) ? 7 : Math.max(0, Math.min(input.daysAhead, 30));
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 10 : Math.max(1, Math.min(input.limit, 15));
    const userNameForResponse = input.context?.userName || "User";

    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[ReminderReaderTool User:${userId?.substring(0,8)}]`;
    const queryInputForStructuredData = {...input, action: effectiveAction, daysAhead: effectiveDaysAhead, limit: effectiveLimit};

    if (!userId) return { error: "User ID missing.", result: `I need to know who you are, ${userNameForResponse}, to check reminders.`, structuredData: {result_type: "reminders", source_api: "internal_memory", query: queryInputForStructuredData, reminders: [], error: "User ID missing"} };
    if (!supabaseAdmin) {
      logger.error(`${logPrefix}: Supabase admin client unavailable.`);
      return { error: "Database unavailable", result: `Sorry, ${userNameForResponse}, Minato cannot access reminders.`, structuredData: {result_type: "reminders", source_api: "internal_memory", query: queryInputForStructuredData, reminders: [], error: "Database unavailable"} };
    }

    let outputStructuredData: ReminderResult = {
      result_type: "reminders", source_api: "internal_memory", query: queryInputForStructuredData, reminders: [], error: null,
    };

    try {
      const now = new Date();
      // Ensure dueBeforeISO also includes today for daysAhead = 0
      const dueBeforeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + effectiveDaysAhead);
      dueBeforeDate.setUTCHours(23, 59, 59, 999); 
      const dueBeforeISO = dueBeforeDate.toISOString();
      
      // For overdue check, we need to consider reminders from the past up to 'now'
      // The RPC function `get_pending_reminders` should handle filtering by status='pending' and trigger_datetime <= p_due_before.
      // We don't need a separate `timeMin` for this RPC as it's about *pending* reminders up to a future point.

      logger.info(`${logPrefix} Fetching pending reminders (Due <= ${dueBeforeISO}, Limit: ${effectiveLimit}). Calling RPC: ${RPC_FUNCTION_NAME}...`);
      const rpcParams = {
        p_user_id: userId,
        p_max_results: Math.max(1, Math.min(effectiveLimit, 25)),
        p_due_before: dueBeforeISO, // Include reminders up to the end of the 'daysAhead' period
      };
      const { data, error } = await supabaseAdmin.rpc(RPC_FUNCTION_NAME, rpcParams);

      if (error) throw new Error(`Database error fetching reminders: ${error.message}`);
      if (!Array.isArray(data)) throw new Error("Received invalid data format from reminder database.");

      const validatedReminders: ReminderInfo[] = data.map((item: any): ReminderInfo | null => {
        if (!item || typeof item.id !== 'string' || typeof item.user_id !== 'string' || typeof item.content !== 'string' || !item.metadata?.reminder_details || typeof item.metadata.reminder_details.trigger_datetime !== 'string' || typeof item.metadata.reminder_details.status !== 'string') {
          logger.warn(`${logPrefix} Skipping invalid reminder structure from RPC:`, item?.id); return null;
        }
        const reminderDetails = item.metadata.reminder_details as ReminderDetails;
        const triggerDate = parseISO(reminderDetails.trigger_datetime);
        const isActuallyOverdue = reminderDetails.status === 'pending' && isPast(triggerDate) && differenceInCalendarDays(now, triggerDate) < 2; // Overdue if past and within last ~day
        
        return {
          memory_id: item.id, user_id: item.user_id, original_content: item.content,
          trigger_datetime: reminderDetails.trigger_datetime,
          recurrence_rule: reminderDetails.recurrence_rule || null,
          status: reminderDetails.status,
          last_sent_at: reminderDetails.last_sent_at || null,
          error_message: reminderDetails.error_message || null,
          metadata: item.metadata, content: item.content,
        };
      }).filter((r): r is ReminderInfo => r !== null && r.user_id === userId);

      if (data.length > 0 && validatedReminders.length !== data.length) {
        logger.warn(`${logPrefix} RPC returned ${data.length} items, but only ${validatedReminders.length} passed validation/user check.`);
      }

      outputStructuredData.reminders = validatedReminders.sort((a, b) => 
          new Date(a.trigger_datetime).getTime() - new Date(b.trigger_datetime).getTime()
      ); // Sort by trigger time ascending
      outputStructuredData.error = null;

      const overdueCount = validatedReminders.filter(r => {
        const triggerDate = parseISO(r.trigger_datetime);
        return r.status === 'pending' && isPast(triggerDate) && differenceInCalendarDays(now, triggerDate) < 2;
      }).length;
      const upcomingCount = validatedReminders.length - overdueCount;

      if (validatedReminders.length === 0) {
        const horizonText = effectiveDaysAhead === 0 ? "for today" : `in the next ${effectiveDaysAhead === 1 ? "day" : `${effectiveDaysAhead} days`}`;
        logger.info(`${logPrefix} No pending reminders found within ${effectiveDaysAhead} days.`);
        return { result: `You have no pending reminders scheduled ${horizonText}, ${userNameForResponse}. Anything Minato can help you remember?`, structuredData: outputStructuredData };
      }

      logger.info(`${logPrefix} Found ${validatedReminders.length} pending reminders (${overdueCount} overdue, ${upcomingCount} upcoming).`);
      let resultString = `Okay ${userNameForResponse}, `;
      if (overdueCount > 0) {
        resultString += `you have ${overdueCount} overdue reminder${overdueCount > 1 ? 's' : ''}. `;
      }
      if (upcomingCount > 0) {
        resultString += `You also have ${upcomingCount} upcoming reminder${upcomingCount > 1 ? 's' : ''} scheduled in the next ${effectiveDaysAhead === 0 ? 'rest of today' : (effectiveDaysAhead === 1 ? "day" : `${effectiveDaysAhead} days`)}.`;
      } else if (overdueCount > 0 && upcomingCount === 0) {
        resultString += `No other reminders scheduled in the next ${effectiveDaysAhead === 1 ? "day" : `${effectiveDaysAhead} days`}.`;
      }
      resultString += " Here are some of them:\n";
      
      const reminderSummaries = validatedReminders.slice(0, 3).map(r => { // Summarize top 3 overall (overdue first due to sort)
        let triggerString = "Invalid Date"; let relativeTimeString = "";
        let isOverdue = false;
        try {
          const triggerDate = parseISO(r.trigger_datetime);
          if (!isNaN(triggerDate.getTime())) {
            triggerString = format(triggerDate, "MMM d, h:mm a");
            relativeTimeString = ` (${formatDistanceToNowStrict(triggerDate, { addSuffix: true })})`;
            isOverdue = r.status === 'pending' && isPast(triggerDate) && differenceInCalendarDays(now, triggerDate) < 2;
          }
        } catch {}
        const recurrence = r.recurrence_rule ? ` (Repeats ${r.recurrence_rule})` : "";
        const contentPreview = r.original_content.length > 40 ? r.original_content.substring(0,37)+"..." : r.original_content;
        const overdueTag = isOverdue ? " (Overdue!)" : "";
        return `- "${contentPreview}"${overdueTag} - Due: ${triggerString}${relativeTimeString}${recurrence}`;
      });
      resultString += reminderSummaries.join("\n");
      if (validatedReminders.length > 3) {
          resultString += `\nMinato can show you the full list of ${validatedReminders.length} reminders.`;
      }

      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      logger.error(`${logPrefix} Failed:`, error);
      outputStructuredData.error = error.message || "Failed to fetch reminders";
      return { error: outputStructuredData.error, result: `Sorry, ${userNameForResponse}, Minato couldn't check your reminders right now. There was an issue.`, structuredData: outputStructuredData };
    }
  }
}