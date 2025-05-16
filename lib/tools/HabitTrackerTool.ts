import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { supabase } from "../supabaseClient"; // Use public client for this tool if appropriate, or admin if inserts need it
import { HabitTrackerStructuredOutput, UserHabitLog } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface HabitTrackerInput extends ToolInput {
  habitName?: string | null;
  action: "log" | "check" | "status";
  date?: string | null;
  period?: "today" | "week" | "month" | null;
}

export class HabitTrackerTool extends BaseTool {
  name = "HabitTrackerTool";
  description =
    "Logs completion of a daily habit, checks if logged on a date, or provides a status overview for a period (today, week, month).";
  argsSchema = {
    type: "object" as const,
    properties: {
      habitName: { type: ["string", "null"], description: "The name of the habit to log or check (e.g., 'Meditate', 'Workout')." },
      action: { type: "string" as const, enum: ["log", "check", "status"], description: "The action: 'log' completion, 'check' if logged, or get 'status'." },
      date: { type: ["string", "null"], format: "date", description: "Optional date for logging/checking (YYYY-MM-DD). Defaults to today." },
      period: { type: ["string", "null"], enum: ["today", "week", "month"], description: "Time period for 'status' action. Defaults to 'today'.", default: "today" },
    },
    required: ["habitName", "action", "date", "period"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined; // No caching for actions that modify state

  private getTargetDateUTC(dateString?: string | null): string {
    try {
      const targetDate = dateString ? new Date(dateString + "T12:00:00Z") : new Date();
      if (isNaN(targetDate.getTime())) throw new Error("Invalid date string");
      return targetDate.toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  }

  private getDateRange(period: "today" | "week" | "month" | null = "today"): { startDate: string; endDate: string; } {
    const today = new Date();
    const endDate = this.getTargetDateUTC(); // Today's date in YYYY-MM-DD UTC
    let startDate = new Date(today); // Start with today
    startDate.setUTCHours(0, 0, 0, 0); // Beginning of today UTC

    if (period === "week") {
      const dayOfWeek = today.getUTCDay(); // Sunday = 0, Monday = 1, ...
      const diff = startDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday of current week
      startDate.setUTCDate(diff);
    } else if (period === "month") {
      startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)); // First day of current month UTC
    }
    // For "today", startDate remains the beginning of today UTC.
    const startDateStr = startDate.toISOString().split('T')[0];
    return { startDate: startDateStr, endDate };
  }

  async execute(input: HabitTrackerInput): Promise<ToolOutput> {
    const { userId: contextUserId, action, date: dateString, period } = input;
    const habitName = input.habitName?.trim().substring(0, 99) || undefined; // habitName ne doit pas être null
    const userId = input.context?.userId || contextUserId;
    const effectivePeriod = period ?? "today";

    const logPrefix = `[HabitTool Action:${action}, User:${userId?.substring(0,8)}]`;
    const queryInputForStructuredData = { ...input, habitName, period: effectivePeriod };


    let outputStructuredData: HabitTrackerStructuredOutput = {
      result_type: action === "status" ? "habit_log_list" : "habit_log_confirmation",
      action: action,
      status: "error",
      query: queryInputForStructuredData,
      errorMessage: "Tool execution failed initially.",
      source_api: "internal_db",
      error: "Tool execution failed initially.",
      habit: habitName,
      date: this.getTargetDateUTC(dateString) || undefined,
      period: action === "status" ? effectivePeriod : undefined,
      startDate: action === "status" ? this.getDateRange(effectivePeriod).startDate : undefined,
      endDate: action === "status" ? this.getDateRange(effectivePeriod).endDate : undefined,
      wasLogged: undefined,
      loggedHabits: undefined,
      message: undefined,
    };

    if (!userId) { /* ... error handling ... */ return { error: "User ID missing.", result: "I need to know who you are.", structuredData: {...outputStructuredData, error: "User ID missing."} }; }
    if ((action === "log" || action === "check") && !habitName) { /* ... error handling ... */ return { error: "Missing 'habitName'.", result: "Which habit?", structuredData: {...outputStructuredData, error: "Missing 'habitName'."} }; }

    const targetDateUTC = outputStructuredData.date!;
    const todayDateUTC = this.getTargetDateUTC();
    const dateLabel = targetDateUTC === todayDateUTC ? "today" : `on ${targetDateUTC}`;
    this.log("info", `${logPrefix}: Habit='${habitName || "N/A"}', Date=${targetDateUTC}, Period=${effectivePeriod}`);

    if (!supabase) { /* ... error handling ... */ return { error: "DB connection error.", result: "Sorry, tracker unavailable.", structuredData: {...outputStructuredData, error: "DB client unavailable."} }; }

    try {
      if (action === "log") {
        if (!habitName) { outputStructuredData.error = "Internal error: habitName missing for log."; return { error: outputStructuredData.error, result: "What habit to log?", structuredData: outputStructuredData }; }
        outputStructuredData = { ...outputStructuredData, result_type: "habit_log_confirmation", habit: habitName, date: targetDateUTC, error: undefined, errorMessage: undefined };
        const { error: insertError } = await supabase.from("user_habit_logs").insert({ user_id: userId, habit_name: habitName, log_date: targetDateUTC });
        if (insertError) {
          if (insertError.code === "23505") { /* ... already logged ... */ outputStructuredData.status = "already_logged"; outputStructuredData.message = `Looks like '${habitName}' was already logged ${dateLabel} for ${input.context?.userName || "you"}. Well done!`; return { result: outputStructuredData.message, structuredData: outputStructuredData };}
          throw new Error(`DB error logging habit: ${insertError.message}`);
        }
        // Fetch total for today after logging
        const { startDate: startToday, endDate: endToday } = this.getDateRange("today");
        const { data: totalData, error: totalError } = await supabase.from("user_water_logs").select("amount_ml").eq("user_id", userId).gte("log_datetime", startToday).lte("log_datetime", endToday); // Example: if water logs were similar table for totals
        const totalMlToday = totalData?.reduce((sum, row) => sum + (row.amount_ml || 0), 0) || 0;
        const successMsg = `Okay, Minato logged '${habitName}' for ${dateLabel} for ${input.context?.userName || "you"}. Keep it up!`;
        outputStructuredData.status = "logged"; outputStructuredData.message = successMsg;
        return { result: successMsg, structuredData: outputStructuredData };

      } else if (action === "check") {
        if (!habitName) { outputStructuredData.error = "Internal error: habitName missing for check."; return { error: outputStructuredData.error, result: "Which habit to check?", structuredData: outputStructuredData }; }
        outputStructuredData = { ...outputStructuredData, result_type: "habit_log_confirmation", habit: habitName, date: targetDateUTC, error: undefined, errorMessage: undefined };
        const { data, error: selectError } = await supabase.from("user_habit_logs").select("id").eq("user_id", userId).eq("habit_name", habitName).eq("log_date", targetDateUTC).limit(1).maybeSingle();
        if (selectError) throw new Error(`DB error checking habit: ${selectError.message}`);
        outputStructuredData.wasLogged = !!data;
        const msg = data ? `Yes, it looks like ${input.context?.userName || "you"} logged '${habitName}' ${dateLabel}.` : `It doesn't look like '${habitName}' has been logged ${dateLabel} yet for ${input.context?.userName || "you"}.`;
        outputStructuredData.status = data ? "completed" : "not_completed"; outputStructuredData.message = msg;
        return { result: msg, structuredData: outputStructuredData };

      } else if (action === "status") {
        // Fetch logged habits for the period
        const { startDate: startPeriod, endDate: endPeriod } = this.getDateRange(effectivePeriod);
        const { data: logs, error: selectError } = await supabase.from("user_habit_logs").select("habit_name, log_date").eq("user_id", userId).gte("log_date", startPeriod).lte("log_date", endPeriod);
        if (selectError) throw new Error(`DB error fetching habits: ${selectError.message}`);
        // Transform logs into { [habitName: string]: string[] }
        const habitStatus: { [habit: string]: string[] } = {};
        (logs || []).forEach((log: { habit_name: string; log_date: string }) => {
          if (!habitStatus[log.habit_name]) habitStatus[log.habit_name] = [];
          habitStatus[log.habit_name].push(log.log_date);
        });
        outputStructuredData.loggedHabits = habitStatus;
        outputStructuredData.status = "completed";
        outputStructuredData.message = `Completed habits for ${effectivePeriod} period.`;
        return { result: outputStructuredData.message, structuredData: outputStructuredData };

      } else {
        return { error: "Unexpected error.", result: "An unexpected error occurred.", structuredData: outputStructuredData };
      }
    } catch (error) {
      outputStructuredData.error = error instanceof Error ? error.message : "An unexpected error occurred.";
      return { error: outputStructuredData.error, result: "An unexpected error occurred.", structuredData: outputStructuredData };
    }
  }
}