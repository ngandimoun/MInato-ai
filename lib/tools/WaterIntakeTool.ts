
// FILE: lib/tools/WaterIntakeTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { supabase, supabaseAdmin } from "../supabaseClient";
import { WaterIntakeStructuredOutput } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

interface WaterIntakeInput extends ToolInput {
  action: "log" | "get_total";
  amount?: number;
  unit?: "ml" | "oz" | "glass";
  date?: string;
}

export class WaterIntakeTool extends BaseTool {
  name = "WaterIntakeTool";
  description =
    "Logs water intake in 'ml', 'oz', or 'glass' units, or retrieves the total water consumed for a specific date (defaults to today).";
  argsSchema = {
    type: "object" as const,
    properties: {
      action: {
        type: "string",
        enum: ["log", "get_total"],
        description: "The action: 'log' intake or 'get_total' consumed.",
      },
      amount: {
        type: "number",
        description: "The amount of water consumed (required for 'log').",
      },
      unit: {
        type: "string",
        enum: ["ml", "oz", "glass"],
        description:
          "The unit of measurement: 'ml', 'oz', or 'glass' (required for 'log'). Defaults to 'ml'.",
        default: "ml",
      },
      date: {
        type: "string",
        format: "date",
        description:
          "Optional date for logging/getting total (YYYY-MM-DD). Defaults to today.",
      },
    },
    required: ["action"],
  };
  cacheTTLSeconds = undefined;

  private readonly OZ_TO_ML = 29.5735;
  private readonly GLASS_TO_ML = 240;

  private getTargetDateUTC(dateString?: string): string {
    try {
      const targetDate = dateString
        ? new Date(dateString + "T12:00:00Z")
        : new Date();
      if (isNaN(targetDate.getTime())) throw new Error("Invalid date string");
      return targetDate.toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  }
  private getDateRangeTimestamps(dateUTC: string): {
    startUTC: string;
    endUTC: string;
  } {
    return {
      startUTC: `${dateUTC}T00:00:00.000Z`,
      endUTC: `${dateUTC}T23:59:59.999Z`,
    };
  }

  async execute(input: WaterIntakeInput): Promise<ToolOutput> {
    const { userId, action, date: dateString } = input;
    let { amount, unit } = input;
    const logPrefix = `WaterTool (${action}, User:${
      userId?.substring(0, 8) || "N/A"
    })`;
    let outputStructuredData: WaterIntakeStructuredOutput = {
      result_type: "water_intake_result",
      action: action,
      status: "error",
      date: this.getTargetDateUTC(dateString),
      errorMessage: "Tool execution failed initially.",
      query: input,
      source_api: "internal_db",
      error: undefined,
      message: "",
    };

    if (!userId) {
      outputStructuredData.errorMessage = "User ID missing.";
      outputStructuredData.error = outputStructuredData.errorMessage;
      return {
        error: "User context missing.",
        result: "I need to know who you are.",
        structuredData: outputStructuredData,
      };
    }
    const targetDateUTC = outputStructuredData.date;
    const todayDateUTC = this.getTargetDateUTC();
    const dateLabel =
      targetDateUTC === todayDateUTC ? "today" : `on ${targetDateUTC}`;
    this.log(
      "info",
      `${logPrefix}: Amount=${amount ?? "N/A"} ${
        unit ?? "N/A"
      }, TargetDate=${targetDateUTC}`
    );
    if (!supabaseAdmin) {
      outputStructuredData.errorMessage = "DB client unavailable.";
      outputStructuredData.error = outputStructuredData.errorMessage;
      this.log("error", `${logPrefix}: Supabase admin client unavailable.`);
      return {
        error: "DB connection error.",
        result: "Sorry, water tracker unavailable.",
        structuredData: outputStructuredData,
      };
    }

    try {
      if (action === "log") {
        if (amount === undefined || typeof amount !== "number" || amount <= 0) {
          outputStructuredData.errorMessage = "Missing/invalid 'amount'.";
          outputStructuredData.error = outputStructuredData.errorMessage;
          return {
            error: outputStructuredData.errorMessage,
            result: "How much water?",
            structuredData: outputStructuredData,
          };
        }
        unit = (unit || "ml").toLowerCase() as "ml" | "oz" | "glass";
        if (!["ml", "oz", "glass"].includes(unit)) {
          outputStructuredData.errorMessage = `Invalid unit: '${input.unit}'. Use 'ml', 'oz', or 'glass'.`;
          outputStructuredData.error = outputStructuredData.errorMessage;
          return {
            error: outputStructuredData.errorMessage,
            result: "What unit (ml, oz, glass)?",
            structuredData: outputStructuredData,
          };
        }
        let amountMl: number;
        switch (unit) {
          case "ml":
            amountMl = Math.round(amount);
            break;
          case "oz":
            amountMl = Math.round(amount * this.OZ_TO_ML);
            break;
          case "glass":
            amountMl = Math.round(amount * this.GLASS_TO_ML);
            break;
          default:
            throw new Error("Internal error: Unhandled unit");
        }
        const { error: insertError } = await supabase 
        .from(
          "user_water_logs"
        ).insert({ user_id: userId, amount_ml: amountMl });
        if (insertError) {
          this.log(
            "error",
            `${logPrefix}: Supabase insert error:`,
            insertError
          );
          throw new Error(`DB error logging water: ${insertError.message}`);
        }
        const { startUTC: startToday, endUTC: endToday } =
          this.getDateRangeTimestamps(todayDateUTC);
        const { data: totalData, error: totalError } = await supabase.from(
          "user_water_logs"
        )
          .select("amount_ml")
          .eq("user_id", userId)
          .gte("log_datetime", startToday)
          .lte("log_datetime", endToday);
        if (totalError) {
          this.log(
            "error",
            `${logPrefix}: Error fetching total after log:`,
            totalError
          );
        }
        const totalMlToday =
          totalData?.reduce((sum: any, row: any) => sum + (row.amount_ml || 0), 0) || 0;
        const totalOzToday = parseFloat(
          (totalMlToday / this.OZ_TO_ML).toFixed(1)
        );
        const successMsg = totalError
          ? `Okay, logged ${amount} ${unit} (~${amountMl}ml).`
          : `Okay, logged ${amount} ${unit} (~${amountMl}ml). Your total for today is now approximately ${totalMlToday}ml or ${totalOzToday}oz. Keep hydrated!`;
        this.log(
          "info",
          `${logPrefix}: Logged ${amountMl}ml. Today's total: ${totalMlToday}ml.`
        );
        outputStructuredData = {
          ...outputStructuredData,
          status: "logged",
          amountLoggedMl: amountMl,
          totalTodayMl: totalMlToday,
          totalTodayOz: totalOzToday,
          date: todayDateUTC,
          errorMessage: null,
          error: undefined,
          message: successMsg,
        };
        return { result: successMsg, structuredData: outputStructuredData };
      } else if (action === "get_total") {
        const { startUTC, endUTC } = this.getDateRangeTimestamps(targetDateUTC);
        const { data: totalData, error: totalError } = await supabase.from(
          "user_water_logs"
        )
          .select("amount_ml")
          .eq("user_id", userId)
          .gte("log_datetime", startUTC)
          .lte("log_datetime", endUTC);
        if (totalError) {
          this.log(
            "error",
            `${logPrefix}: Supabase total select error:`,
            totalError
          );
          throw new Error(`DB error fetching total: ${totalError.message}`);
        }
        const totalMl =
          totalData?.reduce((sum: any, row: any) => sum + (row.amount_ml || 0), 0) || 0;
        const totalOz = parseFloat((totalMl / this.OZ_TO_ML).toFixed(1));
        const resultMsg = `Total water logged ${dateLabel}: ${totalMl}ml (approximately ${totalOz}oz).`;
        this.log(
          "info",
          `${logPrefix}: Retrieved total for ${targetDateUTC}: ${totalMl}ml`
        );
        outputStructuredData = {
          ...outputStructuredData,
          status: "retrieved_total",
          totalQueriedMl: totalMl,
          totalQueriedOz: totalOz,
          date: targetDateUTC,
          errorMessage: null,
          error: undefined,
          message: resultMsg,
        };
        return { result: resultMsg, structuredData: outputStructuredData };
      } else {
        outputStructuredData.errorMessage = `Invalid action: '${action}'.`;
        outputStructuredData.error = outputStructuredData.errorMessage;
        return {
          error: outputStructuredData.errorMessage,
          result: `Invalid action: ${action}`,
          structuredData: outputStructuredData,
        };
      }
    } catch (error: any) {
      const errorMsg = `Water intake error: ${error.message}`;
      this.log("error", `${logPrefix}: Failed - ${error.message}`);
      outputStructuredData.errorMessage = errorMsg;
      outputStructuredData.error = errorMsg;
      outputStructuredData.status = "error";
      return {
        error: errorMsg,
        result: "Sorry, couldn't access water log.",
        structuredData: outputStructuredData,
      };
    }
  }
}
