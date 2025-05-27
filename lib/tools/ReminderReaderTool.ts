// FILE: lib/tools/ReminderReaderTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { supabaseAdmin } from "../supabaseClient";
import { logger } from "../../memory-framework/config";
import { ReminderInfo, ReminderResult, StoredMemoryUnit, ReminderDetails } from "@/lib/types/index";
import { formatDistanceToNowStrict, format, isPast, parseISO, differenceInCalendarDays, isToday, isTomorrow } from "date-fns";

interface ReminderInput extends ToolInput {
  action?: "get_pending" | "get_all" | "get_overdue" | "get_today" | null;
  daysAhead?: number | null;
  limit?: number | null;
}
const RPC_FUNCTION_NAME = "get_pending_reminders";

export class ReminderReaderTool extends BaseTool {
  name = "ReminderReaderTool";
  description = "Reads reminders from the user's Minato memory system. Can show pending reminders, overdue reminders, or all reminders within a time range.";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: { 
        type: ["string", "null"] as const, 
        enum: ["get_pending", "get_all", "get_overdue", "get_today", null], 
        description: "Type of reminders to get. Defaults to 'get_pending'." 
      } as OpenAIToolParameterProperties,
      daysAhead: { 
        type: ["number", "null"] as const, 
        description: "Number of days ahead to check (0-30). Defaults to 7." 
      } as OpenAIToolParameterProperties,
      limit: { 
        type: ["number", "null"] as const, 
        description: "Max reminders to return (1-20). Defaults to 10." 
      } as OpenAIToolParameterProperties,
    },
    required: [] as string[], // Make all arguments optional
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 30; // Reduce cache for more real-time updates
  categories = ["reminder", "productivity", "memory", "task", "habit"];
  version = "2.0.0";
  metadata = { 
    provider: "Minato Memory Framework", 
    supports: ["read_reminders", "overdue_check", "today_reminders", "habit_tracking"] 
  };

  async execute(input: ReminderInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { userId: contextUserId } = input;
    const effectiveAction = (input.action === null || input.action === undefined) ? "get_pending" : input.action;
    const effectiveDaysAhead = (input.daysAhead === null || input.daysAhead === undefined) ? 7 : Math.max(0, Math.min(input.daysAhead, 30));
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 10 : Math.max(1, Math.min(input.limit, 20));
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
      
      // Adjust daysAhead based on action
      let adjustedDaysAhead = effectiveDaysAhead;
      if (effectiveAction === "get_today") {
        adjustedDaysAhead = 0;
      } else if (effectiveAction === "get_overdue") {
        adjustedDaysAhead = 30; // Look back up to 30 days for overdue
      }
      
      // Ensure dueBeforeISO also includes today for daysAhead = 0
      const dueBeforeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + adjustedDaysAhead);
      dueBeforeDate.setUTCHours(23, 59, 59, 999); 
      const dueBeforeISO = dueBeforeDate.toISOString();

      logger.info(`${logPrefix} Fetching reminders (Action: ${effectiveAction}, Due <= ${dueBeforeISO}, Limit: ${effectiveLimit}). Calling RPC: ${RPC_FUNCTION_NAME}...`);
      const rpcParams = {
        p_user_id: userId,
        p_max_results: Math.max(1, Math.min(effectiveLimit, 25)),
        p_due_before: dueBeforeISO,
      };
      const { data, error } = await supabaseAdmin.rpc(RPC_FUNCTION_NAME, rpcParams);

      if (error) throw new Error(`Database error fetching reminders: ${error.message}`);
      if (!Array.isArray(data)) throw new Error("Received invalid data format from reminder database.");

      const validatedReminders: ReminderInfo[] = data.map((item: any): ReminderInfo | null => {
        if (!item || typeof item.id !== 'string' || typeof item.user_id !== 'string' || typeof item.content !== 'string' || !item.metadata?.reminder_details || typeof item.metadata.reminder_details.trigger_datetime !== 'string' || typeof item.metadata.reminder_details.status !== 'string') {
          logger.warn(`${logPrefix} Skipping invalid reminder structure from RPC:`, item?.id); return null;
        }
        const reminderDetails = item.metadata.reminder_details as ReminderDetails;
        
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

      // Filter based on action
      let filteredReminders = validatedReminders;
      if (effectiveAction === "get_overdue") {
        filteredReminders = validatedReminders.filter(r => {
          const triggerDate = parseISO(r.trigger_datetime);
          return r.status === 'pending' && isPast(triggerDate);
        });
      } else if (effectiveAction === "get_today") {
        filteredReminders = validatedReminders.filter(r => {
          const triggerDate = parseISO(r.trigger_datetime);
          return isToday(triggerDate);
        });
      }

      outputStructuredData.reminders = filteredReminders.sort((a, b) => 
          new Date(a.trigger_datetime).getTime() - new Date(b.trigger_datetime).getTime()
      );
      outputStructuredData.error = null;

      const overdueCount = filteredReminders.filter(r => {
        const triggerDate = parseISO(r.trigger_datetime);
        return r.status === 'pending' && isPast(triggerDate);
      }).length;
      const todayCount = filteredReminders.filter(r => isToday(parseISO(r.trigger_datetime))).length;
      const tomorrowCount = filteredReminders.filter(r => isTomorrow(parseISO(r.trigger_datetime))).length;
      const upcomingCount = filteredReminders.length - overdueCount;

      if (filteredReminders.length === 0) {
        let emptyMessage = "";
        if (effectiveAction === "get_overdue") {
          emptyMessage = `Great news, ${userNameForResponse}! You have no overdue reminders. You're all caught up! 🎉`;
        } else if (effectiveAction === "get_today") {
          emptyMessage = `You have no reminders scheduled for today, ${userNameForResponse}. Enjoy your day! ☀️`;
        } else {
          const horizonText = adjustedDaysAhead === 0 ? "for today" : `in the next ${adjustedDaysAhead === 1 ? "day" : `${adjustedDaysAhead} days`}`;
          emptyMessage = `You have no pending reminders scheduled ${horizonText}, ${userNameForResponse}. Would you like me to remind you about something?`;
        }
        logger.info(`${logPrefix} No reminders found for action: ${effectiveAction}`);
        return { result: emptyMessage, structuredData: outputStructuredData };
      }

      logger.info(`${logPrefix} Found ${filteredReminders.length} reminders (${overdueCount} overdue, ${todayCount} today, ${tomorrowCount} tomorrow).`);
      
      // Create an engaging response
      let resultString = "";
      
      // Add urgency for overdue reminders
      if (overdueCount > 0) {
        resultString += `⚠️ Hey ${userNameForResponse}, you have ${overdueCount} overdue reminder${overdueCount > 1 ? 's' : ''}! `;
      }
      
      // Add today's reminders
      if (todayCount > 0 && effectiveAction !== "get_overdue") {
        resultString += `📅 You have ${todayCount} reminder${todayCount > 1 ? 's' : ''} for today. `;
      }
      
      // Add tomorrow's reminders
      if (tomorrowCount > 0 && effectiveAction === "get_pending") {
        resultString += `📌 ${tomorrowCount} scheduled for tomorrow. `;
      }
      
      // Add upcoming count
      if (upcomingCount > overdueCount && effectiveAction === "get_pending") {
        const remainingDays = adjustedDaysAhead === 0 ? 0 : adjustedDaysAhead - 1;
        if (remainingDays > 1) {
          resultString += `📋 ${upcomingCount - todayCount - tomorrowCount} more in the next ${remainingDays} days. `;
        }
      }
      
      resultString += "\n\nHere's what's coming up:\n";
      
      // Show reminders with better formatting and emojis
      const reminderSummaries = filteredReminders.slice(0, 5).map(r => {
        let triggerString = "Invalid Date"; 
        let relativeTimeString = "";
        let timeEmoji = "📌";
        
        try {
          const triggerDate = parseISO(r.trigger_datetime);
          if (!isNaN(triggerDate.getTime())) {
            triggerString = format(triggerDate, "MMM d, h:mm a");
            relativeTimeString = formatDistanceToNowStrict(triggerDate, { addSuffix: true });
            
            if (isPast(triggerDate) && r.status === 'pending') {
              timeEmoji = "🚨";
              relativeTimeString = `OVERDUE - ${relativeTimeString}`;
            } else if (isToday(triggerDate)) {
              timeEmoji = "📅";
              relativeTimeString = `Today at ${format(triggerDate, "h:mm a")}`;
            } else if (isTomorrow(triggerDate)) {
              timeEmoji = "📌";
              relativeTimeString = `Tomorrow at ${format(triggerDate, "h:mm a")}`;
            }
          }
        } catch {}
        
        const recurrence = r.recurrence_rule ? ` 🔄 ${r.recurrence_rule}` : "";
        const contentPreview = r.original_content.length > 50 ? r.original_content.substring(0,47)+"..." : r.original_content;
        
        return `${timeEmoji} **${contentPreview}**\n   ⏰ ${relativeTimeString}${recurrence}`;
      });
      
      resultString += reminderSummaries.join("\n\n");
      
      if (filteredReminders.length > 5) {
        resultString += `\n\n... and ${filteredReminders.length - 5} more reminder${filteredReminders.length - 5 > 1 ? 's' : ''}. Would you like to see all of them?`;
      }
      
      // Add motivational messages
      if (overdueCount === 0 && upcomingCount > 0) {
        resultString += "\n\n✨ You're doing great keeping up with your tasks!";
      } else if (overdueCount > 2) {
        resultString += "\n\n💪 Let's tackle these overdue items together!";
      }

      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      logger.error(`${logPrefix} Failed:`, error);
      outputStructuredData.error = error.message || "Failed to fetch reminders";
      return { error: outputStructuredData.error, result: `Sorry, ${userNameForResponse}, I'm having trouble accessing your reminders right now. Let me try again in a moment.`, structuredData: outputStructuredData };
    }
  }
}