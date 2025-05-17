// FILE: lib/tools/HabitTrackerTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { supabase } from "../supabaseClient";
import { HabitTrackerStructuredOutput, UserHabitLog } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";
import { getSupabaseAdminClient } from "../supabase/server"; // Use admin for writes

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
      habitName: { type: ["string", "null"] as const, description: "The name of the habit to log or check (e.g., 'Meditate', 'Workout'). Required for 'log' and 'check' actions. Can be null for 'status' if checking all habits." } as OpenAIToolParameterProperties,
      action: { type: "string" as const, enum: ["log", "check", "status"], description: "The action: 'log' completion, 'check' if logged, or get 'status'." } as OpenAIToolParameterProperties,
      date: { type: ["string", "null"] as const, description: "Optional date for logging/checking (YYYY-MM-DD format, e.g., '2024-07-29'). If null or omitted, defaults to today." } as OpenAIToolParameterProperties, // Removed format: "date"
      period: { type: ["string", "null"] as const, enum: ["today", "week", "month", null], description: "Time period for 'status' action. If null or omitted, defaults to 'today'.", } as OpenAIToolParameterProperties, // Removed default
    },
    required: ["habitName", "action", "date", "period"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined;

  private getTargetDateUTC(dateString?: string | null): string {
    try {
      const targetDate = dateString ? new Date(dateString + "T12:00:00Z") : new Date(); // Assume midday to avoid timezone shifts changing the date part
      if (isNaN(targetDate.getTime())) throw new Error("Invalid date string");
      return targetDate.toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  }

  private getDateRange(period: "today" | "week" | "month" | null = "today"): { startDate: string; endDate: string; } {
    const today = new Date(); // User's local 'today' based on server time. For true user TZ, context.timezone needed.
    let startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())); // Start of UTC today
    let endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999)); // End of UTC today

    if (period === "week") {
      const dayOfWeek = startDate.getUTCDay(); // Sunday = 0
      const diffToMonday = startDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate.setUTCDate(diffToMonday);
    } else if (period === "month") {
      startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    }
    return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] };
  }


  async execute(input: HabitTrackerInput): Promise<ToolOutput> {
    const { userId: contextUserId, action } = input;
    // Defaulting logic
    const habitName = (input.habitName === null || input.habitName === undefined || input.habitName.trim() === "") ? undefined : input.habitName.trim().substring(0, 99);
    const dateString = (input.date === null || input.date === undefined) ? undefined : input.date;
    const effectivePeriod = (input.period === null || input.period === undefined) ? "today" : input.period;

    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[HabitTool Action:${action}, User:${userId?.substring(0,8)}]`;
    const queryInputForStructuredData = { ...input, habitName, period: effectivePeriod };

    let outputStructuredData: HabitTrackerStructuredOutput = {
      result_type: action === "status" ? "habit_log_list" : "habit_log_confirmation",
      action: action, status: "error", query: queryInputForStructuredData,
      errorMessage: "Tool execution failed initially.", source_api: "internal_db", error: "Tool execution failed initially.",
      habit: habitName, date: this.getTargetDateUTC(dateString), period: action === "status" ? effectivePeriod : undefined,
      startDate: action === "status" ? this.getDateRange(effectivePeriod).startDate : undefined,
      endDate: action === "status" ? this.getDateRange(effectivePeriod).endDate : undefined,
      wasLogged: undefined, loggedHabits: undefined, message: undefined,
    };

    if (!userId) { outputStructuredData.error = "User ID missing."; outputStructuredData.errorMessage = "User ID missing."; return { error: "User ID missing.", result: "I need to know who you are.", structuredData: outputStructuredData }; }
    if ((action === "log" || action === "check") && !habitName) { outputStructuredData.error = "Missing 'habitName'."; outputStructuredData.errorMessage = "Missing 'habitName'."; return { error: "Missing 'habitName'.", result: "Which habit?", structuredData: outputStructuredData }; }

    const targetDateUTC = outputStructuredData.date!; // Guaranteed to be set
    const todayDateUTC = this.getTargetDateUTC();
    const dateLabel = targetDateUTC === todayDateUTC ? "today" : `on ${targetDateUTC}`;
    this.log("info", `${logPrefix}: Habit='${habitName || "N/A"}', Date=${targetDateUTC}, Period=${effectivePeriod}`);

    const client = getSupabaseAdminClient(); // Use admin client for writes
    if (!client) { outputStructuredData.error = "DB client unavailable."; outputStructuredData.errorMessage = "DB client unavailable."; return { error: "DB connection error.", result: "Sorry, tracker unavailable.", structuredData: outputStructuredData }; }

    try {
      if (action === "log") {
        if (!habitName) { outputStructuredData.error = "Internal error: habitName missing for log."; outputStructuredData.errorMessage = "Internal error: habitName missing for log."; return { error: outputStructuredData.error, result: "What habit to log?", structuredData: outputStructuredData }; }
        outputStructuredData = { ...outputStructuredData, result_type: "habit_log_confirmation", habit: habitName, date: targetDateUTC, error: undefined, errorMessage: undefined };
        const { error: insertError } = await client.from("user_habit_logs").insert({ user_id: userId, habit_name: habitName, log_date: targetDateUTC });
        if (insertError) {
          if (insertError.code === "23505") { outputStructuredData.status = "already_logged"; outputStructuredData.message = `Looks like '${habitName}' was already logged ${dateLabel} for ${input.context?.userName || "you"}. Well done!`; return { result: outputStructuredData.message, structuredData: outputStructuredData };}
          throw new Error(`DB error logging habit: ${insertError.message}`);
        }
        outputStructuredData.status = "logged"; outputStructuredData.message = `Okay, Minato logged '${habitName}' for ${dateLabel} for ${input.context?.userName || "you"}. Keep it up!`;
        return { result: outputStructuredData.message, structuredData: outputStructuredData };

      } else if (action === "check") {
        if (!habitName) { outputStructuredData.error = "Internal error: habitName missing for check."; outputStructuredData.errorMessage = "Internal error: habitName missing for check."; return { error: outputStructuredData.error, result: "Which habit to check?", structuredData: outputStructuredData }; }
        outputStructuredData = { ...outputStructuredData, result_type: "habit_log_confirmation", habit: habitName, date: targetDateUTC, error: undefined, errorMessage: undefined };
        const { data, error: selectError } = await client.from("user_habit_logs").select("id").eq("user_id", userId).eq("habit_name", habitName).eq("log_date", targetDateUTC).limit(1).maybeSingle();
        if (selectError) throw new Error(`DB error checking habit: ${selectError.message}`);
        outputStructuredData.wasLogged = !!data;
        const msg = data ? `Yes, it looks like ${input.context?.userName || "you"} logged '${habitName}' ${dateLabel}.` : `It doesn't look like '${habitName}' has been logged ${dateLabel} yet for ${input.context?.userName || "you"}.`;
        outputStructuredData.status = data ? "completed" : "not_completed"; outputStructuredData.message = msg;
        return { result: msg, structuredData: outputStructuredData };

      } else if (action === "status") {
        const { startDate: startPeriod, endDate: endPeriod } = this.getDateRange(effectivePeriod);
        outputStructuredData = { ...outputStructuredData, result_type: "habit_log_list", period: effectivePeriod, startDate: startPeriod, endDate: endPeriod, error: undefined, errorMessage: undefined };
        const queryBuilder = client.from("user_habit_logs").select("habit_name, log_date").eq("user_id", userId).gte("log_date", startPeriod).lte("log_date", endPeriod);
        if (habitName) queryBuilder.eq("habit_name", habitName); // Filter by specific habit if provided for status
        const { data: logs, error: selectError } = await queryBuilder;
        if (selectError) throw new Error(`DB error fetching habits: ${selectError.message}`);
        const habitStatus: { [habit: string]: string[] } = {};
        (logs || []).forEach((log: { habit_name: string; log_date: string }) => {
          if (!habitStatus[log.habit_name]) habitStatus[log.habit_name] = [];
          habitStatus[log.habit_name].push(log.log_date);
        });
        outputStructuredData.loggedHabits = habitStatus; outputStructuredData.status = "retrieved_status";
        const numHabitsLogged = Object.keys(habitStatus).length;
        const habitNameToLog = habitName || "any habit";
        if (numHabitsLogged === 0) outputStructuredData.message = `No logs found for ${habitNameToLog} in ${effectivePeriod}.`;
        else {
            const habitSummaries = Object.entries(habitStatus).map(([hName, dates]) => `${hName} (${dates.length} time(s))`).join(', ');
            outputStructuredData.message = `Habit status for ${input.context?.userName || "User"} in ${effectivePeriod}${habitName ? ` for '${habitName}'` : ""}: ${habitSummaries || 'None logged'}.`;
        }
        return { result: outputStructuredData.message, structuredData: outputStructuredData };
      } else {
        const exhaustiveCheck: never = action;
        outputStructuredData.error = `Invalid action: ${action}`; outputStructuredData.errorMessage = outputStructuredData.error;
        return { error: outputStructuredData.error, result: `Invalid action for habit tracker: ${action}`, structuredData: outputStructuredData };
      }
    } catch (error: any) {
      const errorMsg = `Habit tracker error: ${error.message}`;
      this.log("error", `${logPrefix}: Failed - ${error.message}`);
      outputStructuredData.errorMessage = errorMsg; outputStructuredData.error = errorMsg; outputStructuredData.status = "error";
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't update your habit tracker.`, structuredData: outputStructuredData };
    }
  }
}