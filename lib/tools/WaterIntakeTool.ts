import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { getSupabaseAdminClient } from "../supabase/server";
import { WaterIntakeStructuredOutput } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface WaterIntakeInput extends ToolInput {
  action: "log" | "get_total";
  amount?: number | null;
  unit?: "ml" | "oz" | "glass" | null;
  date?: string | null; // YYYY-MM-DD
}

export class WaterIntakeTool extends BaseTool {
  name = "WaterIntakeTool";
  description =
    "Logs water intake in 'ml', 'oz', or 'glass' units, or retrieves the total water consumed for a specific date (defaults to today).";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: { type: "string" as const, enum: ["log", "get_total"], description: "The action: 'log' intake or 'get_total' consumed." },
      amount: { type: ["number", "null"], description: "The amount of water consumed (required for 'log')." },
      unit: { type: ["string", "null"], enum: ["ml", "oz", "glass"], description: "The unit: 'ml', 'oz', or 'glass' (required for 'log'). Defaults to 'ml'.", default: "ml" },
      date: { type: ["string", "null"], format: "date", description: "Optional date for logging/getting total (YYYY-MM-DD). Defaults to today." },
    },
    required: ["amount", "unit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined; // Actions that modify state shouldn't be cached like this

  private readonly OZ_TO_ML = 29.5735;
  private readonly GLASS_TO_ML = 240; // Standard glass size

  private getTargetDateUTC(dateString?: string | null): string {
    try {
      const targetDate = dateString ? new Date(dateString + "T12:00:00Z") : new Date();
      if (isNaN(targetDate.getTime())) throw new Error("Invalid date string");
      return targetDate.toISOString().split("T")[0];
    } catch { return new Date().toISOString().split("T")[0]; }
  }

  private getDateRangeTimestamps(dateUTC: string): { startUTC: string; endUTC: string; } {
    return { startUTC: `${dateUTC}T00:00:00.000Z`, endUTC: `${dateUTC}T23:59:59.999Z` };
  }

  async execute(input: WaterIntakeInput): Promise<ToolOutput> {
    const { userId: contextUserId, action, date: dateString } = input;
    let { amount, unit } = input;
    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[WaterTool Action:${action}, User:${userId?.substring(0,8) || "N/A"}]`;
    const queryInputForStructuredData = { ...input };

    let outputStructuredData: WaterIntakeStructuredOutput = {
      result_type: "water_intake_result", action: action, status: "error",
      date: this.getTargetDateUTC(dateString), errorMessage: "Tool execution failed initially.",
      query: queryInputForStructuredData, source_api: "internal_db", error: "Tool execution failed initially.", message: "",
    };

    if (!userId) { /* ... error handling ... */ return { error: "User context missing.", result: `I need to know who you are, ${input.context?.userName || "User"}.`, structuredData: {...outputStructuredData, error: "User ID missing."} }; }
    const targetDateUTC: string = (outputStructuredData.date === null || outputStructuredData.date === undefined) ? this.getTargetDateUTC() : outputStructuredData.date;
    const todayDateUTC: string = this.getTargetDateUTC();
    const dateLabel = targetDateUTC === todayDateUTC ? "today" : `on ${targetDateUTC}`;
    this.log("info", `${logPrefix}: Amount=${amount ?? "N/A"} ${unit ?? "N/A"}, TargetDate=${targetDateUTC}`);

    const client = getSupabaseAdminClient();
    if (!client) {
      this.log("error", `${logPrefix}: Supabase admin client unavailable.`);
      return { error: "DB connection error.", result: `Sorry, ${input.context?.userName || "User"}, water tracker unavailable.`, structuredData: {...outputStructuredData, error: "DB client unavailable."} };
    }

    try {
      if (action === "log") {
        if (amount === undefined || amount === null || typeof amount !== "number" || amount <= 0) {
          return { error: "Missing/invalid 'amount'.", result: `How much water should Minato log for ${input.context?.userName || "you"}?`, structuredData: {...outputStructuredData, error: "Missing/invalid 'amount'."} };
        }
        unit = (unit || "ml").toLowerCase() as "ml" | "oz" | "glass";
        if (!["ml", "oz", "glass"].includes(unit)) {
          return { error: `Invalid unit: '${input.unit}'. Use 'ml', 'oz', or 'glass'.`, result: `What unit (ml, oz, glass) should Minato use, ${input.context?.userName || "User"}?`, structuredData: {...outputStructuredData, error: `Invalid unit: '${input.unit}'.`} };
        }
        let amountMl: number;
        switch (unit) {
          case "ml": amountMl = Math.round(amount); break;
          case "oz": amountMl = Math.round(amount * this.OZ_TO_ML); break;
          case "glass": amountMl = Math.round(amount * this.GLASS_TO_ML); break;
          default: throw new Error("Internal error: Unhandled unit"); // Should be caught by enum
        }
        const { error: insertError } = await client.from("user_water_logs").insert({ user_id: userId, amount_ml: amountMl, log_datetime: new Date().toISOString() });
        if (insertError) { throw new Error(`DB error logging water: ${insertError.message}`); }

        // Fetch total for *today* regardless of log date for user feedback
        const { startUTC: startToday, endUTC: endToday } = this.getDateRangeTimestamps(todayDateUTC);
        const { data: totalData, error: totalError } = await client.from("user_water_logs").select("amount_ml").eq("user_id", userId).gte("log_datetime", startToday).lte("log_datetime", endToday);
        if (totalError) { logger.warn(`${logPrefix}: Error fetching total after log:`, totalError); }
        const totalMlToday = totalData?.reduce((sum: number, row: { amount_ml?: number | null }) => sum + (row.amount_ml || 0), 0) || 0;
        const totalOzToday = parseFloat((totalMlToday / this.OZ_TO_ML).toFixed(1));

        const successMsg = totalError ? `Okay, ${input.context?.userName || "User"}, Minato logged ${amount} ${unit} (~${amountMl}ml) for ${dateLabel}.` : `Okay, ${input.context?.userName || "User"}, Minato logged ${amount} ${unit} (~${amountMl}ml) for ${dateLabel}. Your total for today is now approximately ${totalMlToday}ml or ${totalOzToday}oz. Keep hydrated!`;
        this.log("info", `${logPrefix}: Logged ${amountMl}ml for ${dateLabel}. Today's total: ${totalMlToday}ml.`);
        outputStructuredData = { ...outputStructuredData, status: "logged", amountLoggedMl: amountMl, totalTodayMl: totalMlToday, totalTodayOz: totalOzToday, date: targetDateUTC, error: undefined, errorMessage: undefined, message: successMsg };
        return { result: successMsg, structuredData: outputStructuredData };

      } else if (action === "get_total") {
        const { startUTC, endUTC } = this.getDateRangeTimestamps(targetDateUTC);
        const { data: totalData, error: totalError } = await client.from("user_water_logs").select("amount_ml").eq("user_id", userId).gte("log_datetime", startUTC).lte("log_datetime", endUTC);
        if (totalError) { throw new Error(`DB error fetching total: ${totalError.message}`); }
        const totalMl = totalData?.reduce((sum: number, row: { amount_ml?: number | null }) => sum + (row.amount_ml || 0), 0) || 0;
        const totalOz = parseFloat((totalMl / this.OZ_TO_ML).toFixed(1));
        const resultMsg = `Total water logged ${dateLabel} for ${input.context?.userName || "User"}: ${totalMl}ml (approximately ${totalOz}oz).`;
        this.log("info", `${logPrefix}: Retrieved total for ${targetDateUTC}: ${totalMl}ml`);
        outputStructuredData = { ...outputStructuredData, status: "retrieved_total", totalQueriedMl: totalMl, totalQueriedOz: totalOz, date: targetDateUTC, error: undefined, errorMessage: undefined, message: resultMsg };
        return { result: resultMsg, structuredData: outputStructuredData };
      } else {
        const exhaustiveCheck: never = action; // Should not be reached
        outputStructuredData.error = `Invalid action: '${action}'.`; outputStructuredData.errorMessage = outputStructuredData.error;
        return { error: outputStructuredData.error, result: `Invalid action for water intake: ${action}`, structuredData: outputStructuredData };
      }
    } catch (error: any) {
      const errorMsg = `Water intake error: ${error.message}`;
      this.log("error", `${logPrefix}: Failed - ${error.message}`);
      outputStructuredData.error = errorMsg; outputStructuredData.errorMessage = errorMsg; outputStructuredData.status = "error";
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't access your water log.`, structuredData: outputStructuredData };
    }
  }
}