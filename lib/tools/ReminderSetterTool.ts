import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { getGlobalMemoryFramework } from "../memory-framework-global";
import { CompanionCoreMemory } from "../../memory-framework/core/CompanionCoreMemory";
import { MemoryFrameworkMessage, ExtractedInfo } from "../../memory-framework/core/types";
import { logger } from "../../memory-framework/config";
import { generateStructuredJson } from "../providers/llm_clients";
import { format, parseISO, addMinutes, addHours, addDays, addWeeks, addMonths, startOfDay, endOfDay, setHours, setMinutes } from "date-fns";
import { appConfig } from "../config";

const TASK_MEMORY_CATEGORY = "task";

interface ReminderSetterInput extends ToolInput {
  content: string; // What to remind the user about
  trigger_datetime_description: string; // User's description of when
  recurrence_rule?: "daily" | "weekly" | "monthly" | "yearly" | null;
  category?: "task" | "habit" | "medication" | "appointment" | "goal" | null;
  priority?: "low" | "medium" | "high" | null;
}

export class ReminderSetterTool extends BaseTool {
  name = "ReminderSetterTool";
  description = "Sets reminders for tasks, habits, appointments, medications. Understands natural language time like 'tomorrow at 9am', 'in 2 hours', 'every morning at 7am'.";
  argsSchema = {
    type: "object" as const,
    properties: {
      content: { 
        type: "string", 
        description: "What to remind about (e.g., 'call mom', 'take medication', 'workout')" 
      } as OpenAIToolParameterProperties,
      trigger_datetime_description: { 
        type: "string", 
        description: "When to trigger the reminder in natural language" 
      } as OpenAIToolParameterProperties,
      recurrence_rule: { 
        type: ["string", "null"], 
        enum: ["daily", "weekly", "monthly", "yearly", null], 
        description: "How often to repeat" 
      } as OpenAIToolParameterProperties,
      category: { 
        type: ["string", "null"], 
        enum: ["task", "habit", "medication", "appointment", "goal", null], 
        description: "Type of reminder" 
      } as OpenAIToolParameterProperties,
      priority: { 
        type: ["string", "null"], 
        enum: ["low", "medium", "high", null], 
        description: "Priority level" 
      } as OpenAIToolParameterProperties,
    },
    required: ["content", "trigger_datetime_description"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 0; // No cache for setting reminders
  categories = ["reminder", "productivity", "task", "memory", "habit", "health"];
  version = "2.0.0";
  metadata = { 
    provider: "Minato Memory Framework", 
    supports: ["set_reminder", "recurring_reminders", "habit_tracking", "medication_reminders"] 
  };

  private memoryFramework: CompanionCoreMemory;

  constructor() {
    super();
    this.memoryFramework = getGlobalMemoryFramework();
  }

  private async parseDateTimeDescription(
    dateTimeDescription: string, 
    userId: string, 
    contextLang?: string,
    userTimezone?: string
  ): Promise<string | null> {
    const logPrefix = `[${this.name} User:${userId.substring(0,8)} ParseDateTime]`;
    logger.debug(`${logPrefix} Attempting to parse: "${dateTimeDescription}"`);

    // Get current time in user's timezone if available
    const currentTime = new Date();
    const currentTimeISO = currentTime.toISOString();

    const extractionPrompt = `
You are an expert date and time parsing assistant for Minato's reminder system.
Current UTC time: ${currentTimeISO}
User's timezone: ${userTimezone || 'UTC'}

Given the user's description of when they want to be reminded: "${dateTimeDescription.replace(/"/g, '\\"')}"

Parse this into an absolute future date and time in ISO 8601 UTC format (YYYY-MM-DDTHH:mm:ssZ).

Common patterns to recognize:
- Relative times: "in X minutes/hours/days/weeks/months"
- Specific times today: "at 3pm", "at 15:00", "this evening", "tonight"
- Tomorrow patterns: "tomorrow at 9am", "tomorrow morning", "tomorrow evening"
- Day names: "next Monday", "this Friday", "on Wednesday"
- Specific dates: "July 20th at 5pm", "on the 15th", "December 25"
- Morning/afternoon/evening: assume 8am/2pm/7pm respectively if no time given
- Recurring patterns: "every morning" → parse as tomorrow 8am with daily recurrence
- Contextual: "after work" → 6pm, "before bed" → 10pm, "lunch time" → 12pm
- Vague times: "soon" → in 30 minutes, "later" → in 2 hours, "later today" → in 4 hours
- ASAP/urgent: "asap", "urgent", "now" → in 5 minutes

Examples (assuming current time is 2024-01-15T14:30:00Z):
- "in 30 minutes" → "2024-01-15T15:00:00Z"
- "tomorrow at 9am" → "2024-01-16T09:00:00Z" 
- "next Friday at 2pm" → "2024-01-19T14:00:00Z"
- "tonight at 10" → "2024-01-15T22:00:00Z"
- "in 3 days" → "2024-01-18T14:30:00Z"
- "tomorrow morning" → "2024-01-16T08:00:00Z"
- "this evening" → "2024-01-15T19:00:00Z"
- "at 3:45pm" → "2024-01-15T15:45:00Z" (if after current time, else tomorrow)
- "on Monday" → next Monday at current time
- "every morning at 7" → "2024-01-16T07:00:00Z" (parse as tomorrow 7am)
- "soon" → "2024-01-15T15:00:00Z" (30 minutes from now)
- "later" → "2024-01-15T16:30:00Z" (2 hours from now)
- "asap" → "2024-01-15T14:35:00Z" (5 minutes from now)

If the description is ambiguous or in the past, return null.
If it mentions "every" or recurring patterns, still parse the first occurrence.

Respond in STRICT JSON format:
{
  "iso_datetime_utc": "YYYY-MM-DDTHH:mm:ssZ | null",
  "detected_recurrence": "daily | weekly | monthly | yearly | null",
  "confidence": "high | medium | low"
}
`;

    const schema = {
      type: "object",
      properties: {
        iso_datetime_utc: { type: ["string", "null"] },
        detected_recurrence: { type: ["string", "null"], enum: ["daily", "weekly", "monthly", "yearly", null] },
        confidence: { type: "string", enum: ["high", "medium", "low"] }
      },
      required: ["iso_datetime_utc", "detected_recurrence", "confidence"],
      additionalProperties: false
    };

    try {
      const result = await generateStructuredJson<{ 
        iso_datetime_utc: string | null; 
        detected_recurrence: "daily" | "weekly" | "monthly" | "yearly" | null;
        confidence: "high" | "medium" | "low";
      } | { error: string }>(
        extractionPrompt,
        dateTimeDescription,
        schema,
        "minato_datetime_parse_advanced_v2",
        [],
        appConfig.openai.extractionModel || "gpt-4o-mini-2024-07-18",
        userId
      );

      if (result && typeof result === "object") {
        if ('error' in result) {
          logger.warn(`${logPrefix} LLM parsing failed: ${result.error}`);
          return null;
        }
        
        if (result.iso_datetime_utc) {
          const parsedDate = parseISO(result.iso_datetime_utc);
          
          // Allow up to 5 minutes in the past for clock differences
          if (parsedDate.getTime() < Date.now() - (5 * 60 * 1000)) { 
            logger.warn(`${logPrefix} Parsed date ${result.iso_datetime_utc} is too far in the past.`);
            return null;
          }
          
          logger.info(`${logPrefix} Successfully parsed "${dateTimeDescription}" to: ${result.iso_datetime_utc} (confidence: ${result.confidence}, recurrence: ${result.detected_recurrence || 'none'})`);
          
          // Store detected recurrence for potential use
          (this as any)._lastDetectedRecurrence = result.detected_recurrence;
          
          return result.iso_datetime_utc;
        }
      }
      
      logger.warn(`${logPrefix} Could not parse "${dateTimeDescription}" into a valid ISO 8601 UTC string.`);
      return null;
    } catch (e: any) {
      logger.error(`${logPrefix} Exception during LLM date/time parsing: ${e.message}`);
      return null;
    }
  }

  async execute(input: ReminderSetterInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { content, trigger_datetime_description, recurrence_rule, category, priority, userId, context, runId } = input;
    const logPrefix = `[${this.name} User:${userId?.substring(0,8)} Run:${runId?.substring(0,6)}]`;
    const userName = context?.userName || "User";

    if (!userId) {
      logger.error(`${logPrefix} User ID is missing.`);
      return { 
        error: "User ID missing.", 
        result: "I need to know who you are to set a reminder." 
      };
    }
    
    if (!content || content.trim() === "") {
      return { 
        error: "Reminder content is missing.", 
        result: "What would you like me to remind you about? 🤔" 
      };
    }
    
    if (!trigger_datetime_description || trigger_datetime_description.trim() === "") {
      return { 
        error: "Reminder time is missing.", 
        result: "When should I remind you about this? ⏰" 
      };
    }

    logger.info(`${logPrefix} Setting reminder: "${content}" at "${trigger_datetime_description}"`);

    // Get user's timezone from context if available
    const userTimezone = context?.userState?.timezone || context?.timezone || undefined;
    
    const absoluteTriggerTimeISO = await this.parseDateTimeDescription(
      trigger_datetime_description, 
      userId, 
      context?.lang,
      userTimezone
    );

    if (!absoluteTriggerTimeISO) {
      logger.warn(`${logPrefix} Could not parse trigger time: "${trigger_datetime_description}"`);
      
      // Provide helpful suggestions based on common patterns
      let suggestions = "\n\nTry phrases like:\n";
      suggestions += "• 'in 30 minutes'\n";
      suggestions += "• 'tomorrow at 9am'\n";
      suggestions += "• 'next Monday at 2pm'\n";
      suggestions += "• 'this evening at 7'\n";
      
      return {
        error: "Could not understand reminder time.",
        result: `I couldn't understand when you want to be reminded about "${content}". ${suggestions}`,
      };
    }

    // Check if recurrence was detected during parsing
    const detectedRecurrence = (this as any)._lastDetectedRecurrence;
    const finalRecurrence = recurrence_rule || detectedRecurrence || null;

    // Create enriched reminder content with metadata
    const reminderMetadata = {
      category: category || "task",
      priority: priority || "medium",
      created_at: new Date().toISOString(),
      source: "ReminderSetterTool"
    };

    const reminderInputTextForLLM = 
      `User wants to set a reminder.\n` +
      `Content: "${content.replace(/"/g, '\\"')}"\n` +
      `When: ${absoluteTriggerTimeISO} (UTC)\n` +
      `Recurrence: ${finalRecurrence || 'none'}\n` +
      `Category: ${reminderMetadata.category}\n` +
      `Priority: ${reminderMetadata.priority}\n` +
      `This is an important ${reminderMetadata.category} reminder for the user.`;

    const turnForMemory: MemoryFrameworkMessage[] = [{
      role: 'user', 
      content: reminderInputTextForLLM,
      name: userName, 
    }];
    
    logger.debug(`${logPrefix} Calling memoryFramework.add_memory with crafted input: ${JSON.stringify(turnForMemory)}`);

    try {
      const success = await this.memoryFramework.add_memory(turnForMemory, userId, runId || null);

      if (success) {
        const friendlyDate = format(parseISO(absoluteTriggerTimeISO), "MMMM d, yyyy 'at' h:mm a");
        
        // Create engaging confirmation messages based on category
        let confirmationMessage = "";
        let emoji = "✅";
        
        switch (reminderMetadata.category) {
          case "habit":
            emoji = "💪";
            confirmationMessage = `${emoji} Great habit building, ${userName}! I'll remind you to "${content}" on ${friendlyDate}`;
            break;
          case "medication":
            emoji = "💊";
            confirmationMessage = `${emoji} Health first, ${userName}! I'll remind you to "${content}" on ${friendlyDate}`;
            break;
          case "appointment":
            emoji = "📅";
            confirmationMessage = `${emoji} Appointment noted! I'll remind you about "${content}" on ${friendlyDate}`;
            break;
          case "goal":
            emoji = "🎯";
            confirmationMessage = `${emoji} Goal tracking activated! I'll remind you about "${content}" on ${friendlyDate}`;
            break;
          default:
            emoji = "✅";
            confirmationMessage = `${emoji} All set, ${userName}! I'll remind you to "${content}" on ${friendlyDate}`;
        }
        
        if (finalRecurrence) {
          confirmationMessage += ` and ${finalRecurrence} after that 🔄`;
        }
        
        // Add motivational messages
        const motivationalMessages = [
          "\n\n💫 You're doing great at staying organized!",
          "\n\n🌟 Love seeing you take charge of your day!",
          "\n\n✨ Your future self will thank you!",
          "\n\n🚀 Productivity level: Expert!",
          "\n\n💯 That's what I call being proactive!"
        ];
        
        confirmationMessage += motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        
        logger.info(`${logPrefix} Reminder set successfully. Content: "${content}", Trigger: ${absoluteTriggerTimeISO}, Recurrence: ${finalRecurrence}`);
        
        return {
          result: confirmationMessage,
          structuredData: {
            result_type: "reminder_set_confirmation",
            source_api: "internal_memory_setter",
            content: content,
            trigger_datetime_utc: absoluteTriggerTimeISO,
            recurrence_rule: finalRecurrence,
            category: reminderMetadata.category,
            priority: reminderMetadata.priority,
            confirmation_message: confirmationMessage
          }
        };
      } else {
        logger.error(`${logPrefix} Failed to set reminder via memory framework. add_memory returned false.`);
        return { 
          error: "Failed to save reminder.", 
          result: `I'm having trouble saving your reminder right now, ${userName}. Please try again in a moment. 🔄` 
        };
      }
    } catch (e: any) {
      logger.error(`${logPrefix} Exception while setting reminder via memory framework: ${e.message}`, e);
      return { 
        error: `Reminder setting failed: ${e.message}`, 
        result: `Oops, ${userName}, something went wrong while setting your reminder. Let me try again! 🔧` 
      };
    }
  }
} 