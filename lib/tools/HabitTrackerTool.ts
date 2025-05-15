// FILE: lib/tools/HabitTrackerTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { supabase } from "../supabaseClient";
import {
  HabitTrackerStructuredOutput,
  UserHabitLog,
  InternalTask,
} from "@/lib/types/index"; // Added InternalTask
import { logger } from "../../memory-framework/config";

interface HabitTrackerInput extends ToolInput {
  habitName?: string;
  action: "log" | "check" | "status";
  date?: string;
  period?: "today" | "week" | "month";
}

export class HabitTrackerTool extends BaseTool {
  name = "HabitTrackerTool";
  description =
    "Logs completion of a daily habit, checks if logged on a date, or provides a status overview for a period (today, week, month).";
  argsSchema = {
    type: "object" as const,
    properties: {
      habitName: {
        type: "string",
        description:
          "The name of the habit to log or check (e.g., 'Meditate', 'Workout').",
      },
      action: {
        type: "string",
        enum: ["log", "check", "status"],
        description:
          "The action: 'log' completion, 'check' if logged, or get 'status'.",
      },
      date: {
        type: "string",
        format: "date",
        description:
          "Optional date for logging/checking (YYYY-MM-DD). Defaults to today.",
      },
      period: {
        type: "string",
        enum: ["today", "week", "month"],
        description: "Time period for 'status' action. Defaults to 'today'.",
        default: "today",
      },
    },
    required: ["action"],
  };
  cacheTTLSeconds = undefined;

  private getTargetDateUTC(dateString?: string): string {
    try {
      const targetDate = dateString
        ? new Date(dateString + "T12:00:00Z")
        : new Date();
      if (isNaN(targetDate.getTime())) throw new Error("Invalid date");
      return targetDate.toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  }
  private getDateRange(period: "today" | "week" | "month" = "today"): {
    startDate: string;
    endDate: string;
  } {
    const today = new Date();
    const endDate = this.getTargetDateUTC();
    let startDate = new Date(today);
    startDate.setUTCHours(0, 0, 0, 0);
    if (period === "week") {
      const dayOfWeek = today.getUTCDay();
      const diff =
        startDate.getUTCDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate.setUTCDate(diff);
    } else if (period === "month") {
      startDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
      );
    }
    const startDateStr = startDate.toISOString().split("T")[0];
    return { startDate: startDateStr, endDate };
  }

  async execute(input: HabitTrackerInput): Promise<ToolOutput> {
    const { userId, action, date: dateString, period = "today" } = input;
    const habitName = input.habitName?.trim().substring(0, 99);
    const logPrefix = `HabitTool (${action}, User:${userId?.substring(0, 8)})`;
    const defaultResultTypeOnError: HabitTrackerStructuredOutput["result_type"] =
      action === "status" ? "habit_log_list" : "habit_log_confirmation";
    let outputStructuredData: HabitTrackerStructuredOutput = {
      result_type: defaultResultTypeOnError,
      action: action,
      status: "error",
      query: input,
      errorMessage: "Tool execution failed initially.",
      source_api: "internal_db",
      error: undefined,
      habit: habitName || undefined,
      date: this.getTargetDateUTC(dateString),
      period: action === "status" ? period : undefined,
      startDate:
        action === "status" ? this.getDateRange(period).startDate : undefined,
      endDate:
        action === "status" ? this.getDateRange(period).endDate : undefined,
      wasLogged: undefined,
      loggedHabits: undefined,
      message: undefined,
    };
    if (!userId) {
      outputStructuredData.errorMessage = "User ID missing.";
      outputStructuredData.error = outputStructuredData.errorMessage;
      return {
        error: outputStructuredData.errorMessage,
        result: "I need to know who you are.",
        structuredData: outputStructuredData,
      };
    }
    if ((action === "log" || action === "check") && !habitName) {
      outputStructuredData.errorMessage = "Missing 'habitName'.";
      outputStructuredData.error = outputStructuredData.errorMessage;
      return {
        error: outputStructuredData.errorMessage,
        result: "Which habit?",
        structuredData: outputStructuredData,
      };
    }
    const targetDateUTC = outputStructuredData.date!;
    const todayDateUTC = this.getTargetDateUTC();
    const dateLabel =
      targetDateUTC === todayDateUTC ? "today" : `on ${targetDateUTC}`;
    this.log(
      "info",
      `${logPrefix}: Habit='${
        habitName || "N/A"
      }', Date=${targetDateUTC}, Period=${period}`
    );
    if (!supabase) {
      outputStructuredData.errorMessage = "DB client unavailable.";
      outputStructuredData.error = outputStructuredData.errorMessage;
      this.log("error", `${logPrefix} Supabase admin unavailable.`);
      return {
        error: "DB connection error.",
        result: "Sorry, tracker unavailable.",
        structuredData: outputStructuredData,
      };
    }

    try {
      if (action === "log") {
        if (!habitName)
          throw new Error("Internal error: habitName missing for log.");
        outputStructuredData = {
          ...outputStructuredData,
          result_type: "habit_log_confirmation",
          habit: habitName,
          date: targetDateUTC,
          errorMessage: null,
          error: undefined,
        };
        const { error: insertError } = await supabase
          .from("user_habit_logs")
          .insert({
            user_id: userId,
            habit_name: habitName,
            log_date: targetDateUTC,
          });
        if (insertError) {
          if (insertError.code === "23505") {
            const msg = `Looks like '${habitName}' was already logged ${dateLabel}. Well done!`;
            this.log("info", `${logPrefix}: Already logged.`);
            outputStructuredData.status = "already_logged";
            outputStructuredData.message = msg;
            return { result: msg, structuredData: outputStructuredData };
          }
          this.log(
            "error",
            `${logPrefix}: Supabase insert error:`,
            insertError
          );
          throw new Error(`DB error logging habit: ${insertError.message}`);
        }
        const successMsg = `Okay, logged '${habitName}' for ${dateLabel}. Keep it up!`;
        this.log("info", `${logPrefix}: Logged successfully.`);
        outputStructuredData.status = "logged";
        outputStructuredData.message = successMsg;
        return { result: successMsg, structuredData: outputStructuredData };
      } else if (action === "check") {
        if (!habitName)
          throw new Error("Internal error: habitName missing for check.");
        outputStructuredData = {
          ...outputStructuredData,
          result_type: "habit_log_confirmation",
          habit: habitName,
          date: targetDateUTC,
          errorMessage: null,
          error: undefined,
        };
        const { data, error: selectError } = await supabase
          .from("user_habit_logs")
          .select("id")
          .eq("user_id", userId)
          .eq("habit_name", habitName)
          .eq("log_date", targetDateUTC)
          .limit(1)
          .maybeSingle();
        if (selectError) {
          this.log(
            "error",
            `${logPrefix}: Supabase select error:`,
            selectError
          );
          throw new Error(`DB error checking habit: ${selectError.message}`);
        }
        outputStructuredData.wasLogged = !!data;
        if (data) {
          const msg = `Yes, it looks like you logged '${habitName}' ${dateLabel}.`;
          this.log("info", `${logPrefix}: Check COMPLETED.`);
          outputStructuredData.status = "completed";
          outputStructuredData.message = msg;
          return { result: msg, structuredData: outputStructuredData };
        } else {
          const msg = `It doesn't look like '${habitName}' has been logged ${dateLabel} yet.`;
          this.log("info", `${logPrefix}: Check NOT COMPLETED.`);
          outputStructuredData.status = "not_completed";
          outputStructuredData.message = msg;
          return { result: msg, structuredData: outputStructuredData };
        }
      } else if (action === "status") {
        const { startDate, endDate } = this.getDateRange(period);
        outputStructuredData = {
          ...outputStructuredData,
          result_type: "habit_log_list",
          period,
          startDate,
          endDate,
          errorMessage: null,
          error: undefined,
        };
        this.log(
          "info",
          `${logPrefix}: Getting status for ${startDate} to ${endDate}`
        );
        const { data: logs, error: statusError } = await supabase
          .from("user_habit_logs")
          .select("habit_name, log_date")
          .eq("user_id", userId)
          .gte("log_date", startDate)
          .lte("log_date", endDate)
          .order("log_date", { ascending: false });
        if (statusError) {
          this.log(
            "error",
            `${logPrefix}: Supabase status select error:`,
            statusError
          );
          throw new Error(`DB error getting status: ${statusError.message}`);
        }
        const habitStatus: { [habit: string]: string[] } = {};
        (logs || []).forEach(
          (log: { habit_name: string; log_date: string }) => {
            if (!habitStatus[log.habit_name]) habitStatus[log.habit_name] = [];
            habitStatus[log.habit_name].push(log.log_date);
          }
        );
        if (Object.keys(habitStatus).length === 0) {
          const msg = `No habits logged ${
            period === "today" ? "today" : `in the past ${period}`
          }.`;
          outputStructuredData.status = "no_logs";
          outputStructuredData.loggedHabits = {};
          outputStructuredData.message = msg;
          return { result: msg, structuredData: outputStructuredData };
        }
        let resultString = `Habit status for ${
          period === "today" ? "today" : `this ${period}`
        }:\n`;
        for (const habit in habitStatus) {
          resultString += `- ${habit}: Completed ${
            habitStatus[habit].length
          } time(s)${
            period !== "today" ? ` (Last: ${habitStatus[habit][0]})` : ""
          }\n`;
        }
        this.log(
          "info",
          `${logPrefix}: Retrieved status. Found ${
            Object.keys(habitStatus).length
          } habits.`
        );
        outputStructuredData.status = "retrieved_status";
        outputStructuredData.loggedHabits = habitStatus;
        outputStructuredData.message = resultString.trim();
        return {
          result: resultString.trim(),
          structuredData: outputStructuredData,
        };
      } else {
        outputStructuredData.action = action as any;
        outputStructuredData.errorMessage = `Invalid action: '${action}'.`;
        outputStructuredData.error = outputStructuredData.errorMessage;
        return {
          error: outputStructuredData.errorMessage,
          result: `Invalid action: ${action}`,
          structuredData: outputStructuredData,
        };
      }
    } catch (error: any) {
      const errorMsg = `Habit tracker error: ${error.message}`;
      this.log("error", `${logPrefix}: Failed - ${error.message}`);
      outputStructuredData.result_type =
        action === "status" ? "habit_log_list" : "habit_log_confirmation";
      outputStructuredData.errorMessage = errorMsg;
      outputStructuredData.error = errorMsg;
      outputStructuredData.status = "error";
      return {
        error: errorMsg,
        result: "Sorry, couldn't update habit tracker.",
        structuredData: outputStructuredData,
      };
    }
  }
}
