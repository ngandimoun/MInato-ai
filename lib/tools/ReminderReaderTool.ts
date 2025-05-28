// FILE: lib/tools/ReminderReaderTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { supabaseAdmin } from "../supabaseClient";
import { logger } from "../../memory-framework/config";
import { ReminderInfo, ReminderResult, StoredMemoryUnit, ReminderDetails } from "@/lib/types/index";
import { formatDistanceToNowStrict, format, isPast, parseISO, differenceInCalendarDays, isToday, isTomorrow } from "date-fns";
import { generateStructuredJson } from "../providers/llm_clients";

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

  private async extractReminderParameters(userInput: string): Promise<Partial<ReminderInput>> {
    // Enhanced extraction prompt for ReminderReaderTool
    const extractionPrompt = `
You are an expert parameter extractor for Minato's ReminderReaderTool which reads information about a user's reminders.

Given this user query about reminders: "${userInput.replace(/\"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. ACTION TYPE IDENTIFICATION:
   - Determine which type of reminder listing the user wants:
     a) "get_pending" - Default action for showing upcoming reminders
     b) "get_overdue" - When the user wants to see late/missed reminders
     c) "get_today" - When the user only wants today's reminders
     d) "get_all" - When the user wants a complete listing of reminders

2. TIME RANGE DETERMINATION:
   - Extract "daysAhead" value when the user specifies a time range
   - Common phrases include "next week" (7 days), "next few days" (3-5 days), "next month" (30 days)
   - Default to 7 days if not specified and action is "get_pending"
   - Set to 0 for "get_today" action
   
3. LIMIT DETERMINATION:
   - Extract "limit" when the user specifies a maximum number of reminders to show
   - Look for phrases like "show me top 5", "first 3", etc.
   - Default to 10 if not specified

4. MULTILINGUAL UNDERSTANDING:
   - Recognize reminder-related terms in multiple languages
   - Identify time ranges across different language patterns

5. SPECIAL PATTERN RECOGNITION:
   - "What am I forgetting?" or "What did I miss?" → "get_overdue"
   - "What's on my plate today?" or "Today's agenda" → "get_today"
   - "Upcoming reminders" or "What's next?" → "get_pending"

OUTPUT FORMAT (JSON):
{
  "action": "get_pending" | "get_all" | "get_overdue" | "get_today" | null,
  "daysAhead": number | null,
  "limit": number | null
}

If any parameter cannot be confidently identified, set it to null.
`;

    const reminderParamSchema = {
      type: "object",
      properties: {
        action: { type: ["string", "null"], enum: ["get_pending", "get_all", "get_overdue", "get_today", null] },
        daysAhead: { type: ["number", "null"] },
        limit: { type: ["number", "null"] }
      },
      required: ["action", "daysAhead", "limit"],
      additionalProperties: false
    };

    try {
      const result = await generateStructuredJson<{ action: "get_pending" | "get_all" | "get_overdue" | "get_today" | null; daysAhead: number | null; limit: number | null; }>(
        extractionPrompt,
        userInput,
        reminderParamSchema,
        "reminder_param_extractor",
        [],
        "gpt-4o-mini",
      );

      // Apply defaults and validation
      if ('error' in result) {
        this.log("error", "Failed to extract reminder parameters:", result.error);
        return {}; // Return empty object on error
      }

      const extractedParams: Partial<ReminderInput> = {
        action: result.action,
        daysAhead: result.daysAhead,
        limit: result.limit
      };

      return extractedParams;
    } catch (error) {
      this.log("error", "Failed to extract reminder parameters:", error);
      // Return minimal defaults if extraction fails
      return {};
    }
  }

  async execute(input: ReminderInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // If key parameters are missing and we have rawInput, try to extract them
    if (input.rawInput && (!input.action && !input.daysAhead && !input.limit)) {
      try {
        const extractedParams = await this.extractReminderParameters(input.rawInput);
        this.log("info", `Extracted reminder parameters from raw input:`, extractedParams);
        
        // Merge extracted parameters with input
        if (extractedParams.action !== undefined && input.action === undefined) {
          input.action = extractedParams.action;
        }
        if (extractedParams.daysAhead !== undefined && input.daysAhead === undefined) {
          input.daysAhead = extractedParams.daysAhead;
        }
        if (extractedParams.limit !== undefined && input.limit === undefined) {
          input.limit = extractedParams.limit;
        }
      } catch (error) {
        this.log("error", `Failed to extract parameters from raw input:`, error);
      }
    }

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
      return { error: "Database unavailable", result: `Sorry, ${userNameForResponse}, I cannot access reminders right now.`, structuredData: {result_type: "reminders", source_api: "internal_memory", query: queryInputForStructuredData, reminders: [], error: "Database unavailable"} };
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
          emptyMessage = `Great news! You have no overdue reminders. You're all caught up! 🎉`;
        } else if (effectiveAction === "get_today") {
          emptyMessage = `You have no reminders scheduled for today. Enjoy your day! ☀️`;
        } else {
          const horizonText = adjustedDaysAhead === 0 ? "for today" : `in the next ${adjustedDaysAhead === 1 ? "day" : `${adjustedDaysAhead} days`}`;
          emptyMessage = `You have no pending reminders scheduled ${horizonText}. Would you like me to remind you about something?`;
        }
        logger.info(`${logPrefix} No reminders found for action: ${effectiveAction}`);
        return { result: emptyMessage, structuredData: outputStructuredData };
      }

      logger.info(`${logPrefix} Found ${filteredReminders.length} reminders (${overdueCount} overdue, ${todayCount} today, ${tomorrowCount} tomorrow).`);
      
      // Create an engaging response
      let resultString = "";
      
      // Add urgency for overdue reminders
      if (overdueCount > 0) {
        resultString += `⚠️ You have ${overdueCount} overdue reminder${overdueCount > 1 ? 's' : ''}! `;
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
      return { error: outputStructuredData.error, result: `Sorry, I'm having trouble accessing your reminders right now. Let me try again in a moment.`, structuredData: outputStructuredData };
    }
  }
}