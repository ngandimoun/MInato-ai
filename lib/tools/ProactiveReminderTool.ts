import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { supabaseAdmin } from "../supabaseClient";
import { logger } from "../../memory-framework/config";
import { ReminderInfo, ReminderDetails, AnyToolStructuredData } from "@/lib/types/index";
import { formatDistanceToNowStrict, format, isPast, parseISO, differenceInMinutes, isWithinInterval, addMinutes } from "date-fns";

interface ProactiveReminderInput extends ToolInput {
  checkType?: "due_now" | "upcoming_soon" | "overdue" | null;
  windowMinutes?: number | null; // How many minutes ahead to check
}

const RPC_FUNCTION_NAME = "get_pending_reminders";

export class ProactiveReminderTool extends BaseTool {
  name = "ProactiveReminderTool";
  description = "Proactively checks for reminders that are due now or coming up soon. Use this during conversations to remind users about upcoming tasks.";
  argsSchema = {
    type: "object" as const,
    properties: {
      checkType: { 
        type: ["string", "null"] as const, 
        enum: ["due_now", "upcoming_soon", "overdue", null], 
        description: "Type of check. Defaults to 'due_now'." 
      } as OpenAIToolParameterProperties,
      windowMinutes: { 
        type: ["number", "null"] as const, 
        description: "Minutes ahead to check (5-60). Defaults to 15." 
      } as OpenAIToolParameterProperties,
    },
    required: [] as string[], // All optional
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 0; // No cache for proactive checks
  categories = ["reminder", "productivity", "proactive", "notification"];
  version = "1.0.0";
  metadata = { 
    provider: "Minato Memory Framework", 
    supports: ["proactive_reminders", "due_notifications", "contextual_reminders"] 
  };

  async execute(input: ProactiveReminderInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { userId: contextUserId } = input;
    const effectiveCheckType = (input.checkType === null || input.checkType === undefined) ? "due_now" : input.checkType;
    const effectiveWindowMinutes = (input.windowMinutes === null || input.windowMinutes === undefined) ? 15 : Math.max(5, Math.min(input.windowMinutes, 60));
    const userNameForResponse = input.context?.userName || "User";

    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[ProactiveReminderTool User:${userId?.substring(0,8)}]`;

    if (!userId) {
      logger.debug(`${logPrefix} No user ID, skipping proactive check.`);
      return { result: null, structuredData: undefined };
    }

    if (!supabaseAdmin) {
      logger.error(`${logPrefix}: Supabase admin client unavailable.`);
      return { result: null, structuredData: undefined };
    }

    try {
      const now = new Date();
      const windowEnd = addMinutes(now, effectiveWindowMinutes);
      const dueBeforeISO = windowEnd.toISOString();

      logger.debug(`${logPrefix} Proactive check (${effectiveCheckType}, window: ${effectiveWindowMinutes}min)`);
      
      const rpcParams = {
        p_user_id: userId,
        p_max_results: 10,
        p_due_before: dueBeforeISO,
      };
      
      const { data, error } = await supabaseAdmin.rpc(RPC_FUNCTION_NAME, rpcParams);

      if (error || !Array.isArray(data)) {
        logger.debug(`${logPrefix} No reminders found or error in proactive check.`);
        return { result: null, structuredData: undefined };
      }

      const validatedReminders: ReminderInfo[] = data.map((item: any): ReminderInfo | null => {
        if (!item || typeof item.id !== 'string' || typeof item.user_id !== 'string' || 
            typeof item.content !== 'string' || !item.metadata?.reminder_details || 
            typeof item.metadata.reminder_details.trigger_datetime !== 'string' || 
            typeof item.metadata.reminder_details.status !== 'string') {
          return null;
        }
        const reminderDetails = item.metadata.reminder_details as ReminderDetails;
        
        return {
          memory_id: item.id, 
          user_id: item.user_id, 
          original_content: item.content,
          trigger_datetime: reminderDetails.trigger_datetime,
          recurrence_rule: reminderDetails.recurrence_rule || null,
          status: reminderDetails.status,
          last_sent_at: reminderDetails.last_sent_at || null,
          error_message: reminderDetails.error_message || null,
          metadata: item.metadata, 
          content: item.content,
        };
      }).filter((r): r is ReminderInfo => r !== null && r.user_id === userId && r.status === 'pending');

      // Filter based on check type
      let relevantReminders: ReminderInfo[] = [];
      
      if (effectiveCheckType === "due_now") {
        // Reminders due within the next 5 minutes
        relevantReminders = validatedReminders.filter(r => {
          const triggerDate = parseISO(r.trigger_datetime);
          const minutesUntilDue = differenceInMinutes(triggerDate, now);
          return minutesUntilDue >= -5 && minutesUntilDue <= 5;
        });
      } else if (effectiveCheckType === "upcoming_soon") {
        // Reminders due in the next window (e.g., 15 minutes)
        relevantReminders = validatedReminders.filter(r => {
          const triggerDate = parseISO(r.trigger_datetime);
          return isWithinInterval(triggerDate, { start: now, end: windowEnd }) && !isPast(triggerDate);
        });
      } else if (effectiveCheckType === "overdue") {
        // Overdue reminders
        relevantReminders = validatedReminders.filter(r => {
          const triggerDate = parseISO(r.trigger_datetime);
          return isPast(triggerDate);
        });
      }

      if (relevantReminders.length === 0) {
        logger.debug(`${logPrefix} No relevant reminders for ${effectiveCheckType}.`);
        return { result: null, structuredData: undefined };
      }

      // Create proactive reminder messages
      let proactiveMessage = "";
      
      if (effectiveCheckType === "due_now" && relevantReminders.length > 0) {
        const reminder = relevantReminders[0]; // Most urgent one
        proactiveMessage = `🔔 Hey ${userNameForResponse}, just a reminder: **${reminder.original_content}**`;
        
        const triggerDate = parseISO(reminder.trigger_datetime);
        const minutesAgo = differenceInMinutes(now, triggerDate);
        
        if (minutesAgo > 0) {
          proactiveMessage += ` (was due ${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago)`;
        } else {
          proactiveMessage += ` is due now!`;
        }
      } else if (effectiveCheckType === "upcoming_soon" && relevantReminders.length > 0) {
        if (relevantReminders.length === 1) {
          const reminder = relevantReminders[0];
          const triggerDate = parseISO(reminder.trigger_datetime);
          const timeUntil = formatDistanceToNowStrict(triggerDate);
          proactiveMessage = `📅 Just so you know, you have "${reminder.original_content}" coming up ${timeUntil}.`;
        } else {
          proactiveMessage = `📋 You have ${relevantReminders.length} reminders coming up in the next ${effectiveWindowMinutes} minutes:\n`;
          relevantReminders.slice(0, 3).forEach(r => {
            const triggerDate = parseISO(r.trigger_datetime);
            const timeUntil = formatDistanceToNowStrict(triggerDate);
            proactiveMessage += `• ${r.original_content} (${timeUntil})\n`;
          });
        }
      } else if (effectiveCheckType === "overdue" && relevantReminders.length > 0) {
        if (relevantReminders.length === 1) {
          const reminder = relevantReminders[0];
          proactiveMessage = `⚠️ By the way, don't forget about: **${reminder.original_content}** (it's overdue).`;
        } else {
          proactiveMessage = `⚠️ Quick note: You have ${relevantReminders.length} overdue reminders. The most recent: "${relevantReminders[0].original_content}".`;
        }
      }

      const outputStructuredData: AnyToolStructuredData = {
        result_type: "proactive_reminders",
        source_api: "internal_memory",
        query: { checkType: effectiveCheckType, windowMinutes: effectiveWindowMinutes },
        reminders: relevantReminders,
        proactiveType: effectiveCheckType,
        message: proactiveMessage || null,
        error: null,
      };

      logger.info(`${logPrefix} Found ${relevantReminders.length} ${effectiveCheckType} reminders.`);
      
      return { 
        result: proactiveMessage || null, 
        structuredData: outputStructuredData 
      };
      
    } catch (error: any) {
      logger.error(`${logPrefix} Proactive check failed:`, error);
      return { result: null, structuredData: undefined };
    }
  }
} 