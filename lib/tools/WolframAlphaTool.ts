// FILE: lib/tools/WolframAlphaTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
const WolframAlphaAPI = require("wolfram-alpha-api"); // Use require
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedCalculationOrFact, CachedSingleFact } from "@/lib/types/index";

interface WolframAlphaInput extends ToolInput {
  query: string;
}
type WolframAlphaApiClient = {
  getResult: (
    query: string,
    options?: { units?: "metric" | "imperial"; timeout?: number }
  ) => Promise<string>;
};

export class WolframAlphaTool extends BaseTool {
  name = "WolframAlphaTool";
  description =
    "Computes answers to factual queries, performs calculations, unit conversions, date computations, and provides data using Wolfram Alpha's computational knowledge engine. Ideal for math, science, dates, unit conversions, and specific data points.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "The question, calculation, or query for WolframAlpha (e.g., 'derivative of x^2', 'capital of France', '5 miles to km', 'boiling point of water at 1 atm').",
      },
    },
    required: ["query"],
    additionalProperties: false as const,
  };
  cacheTTLSeconds = 3600 * 4;

  private readonly waApi: WolframAlphaApiClient | null;

  constructor() {
    super();
    const appId = appConfig.toolApiKeys.wolframalpha;
    if (!appId) {
      this.log(
        "error",
        "WolframAlpha App ID (WOLFRAMALPHA_APP_ID) is missing. Tool will fail."
      );
      this.waApi = null;
    } else {
      try {
        this.waApi = WolframAlphaAPI(appId);
        this.log("info", "WolframAlpha API client initialized.");
      } catch (error: any) {
        this.log(
          "error",
          "Failed to initialize WolframAlpha API client:",
          error.message
        );
        this.waApi = null;
      }
    }
  }

  async execute(
    input: WolframAlphaInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { query } = input;
    const logPrefix = `[WolframTool] Query:"${query.substring(0, 40)}..."`;

    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return {
        error: "WolframAlpha query cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    if (!this.waApi) {
      return {
        error: "WolframAlpha Tool is not configured.",
        result:
          "Sorry, I cannot perform computations right now due to configuration issues.",
        structuredData: undefined,
      };
    }
    if (!query?.trim()) {
      return {
        error: "Missing query.",
        result: "What calculation or fact are you looking for?",
        structuredData: undefined,
      };
    }

    this.log("info", `${logPrefix} Querying WolframAlpha Short Answers API...`);
    let finalStructuredData: CachedSingleFact = {
      result_type: "calculation_or_fact",
      source_api: "wolframalpha",
      query: input,
      data: null,
      error: undefined,
    };

    try {
      // Note: WolframAlpha library might not directly support AbortSignal. Timeout relies on orchestrator.
      const resultText = await this.waApi.getResult(query.trim(), {
        units: "metric",
      });
      if (abortSignal?.aborted) {
        logger.warn(
          `${logPrefix} Execution aborted after WolframAlpha API call.`
        );
        finalStructuredData.error = "Request cancelled.";
        return {
          error: "WolframAlpha query cancelled.",
          result: "Cancelled.",
          structuredData: finalStructuredData,
        };
      }

      const resultStringForLLM = String(resultText);
      this.log(
        "info",
        `${logPrefix} Result found: ${resultStringForLLM.substring(0, 70)}...`
      );
      const structuredDataForUI: CachedCalculationOrFact = {
        query: query.trim(),
        result: resultStringForLLM,
        interpretation: null,
        sourcePlatform: "wolframalpha",
        error: undefined,
      };
      finalStructuredData.data = structuredDataForUI;
      finalStructuredData.error = undefined;
      return {
        result: resultStringForLLM,
        structuredData: finalStructuredData,
      };
    } catch (error: any) {
      let userMessage =
        "Sorry, I encountered an error trying to compute that with Wolfram Alpha.";
      let errorDetails = `WolframAlpha query failed: ${
        error.message || "Unknown error"
      }`;
      const errorData: CachedCalculationOrFact = {
        query: query.trim(),
        result: null,
        interpretation: "Error during computation.",
        sourcePlatform: "wolframalpha",
        error: error.message,
      };
      finalStructuredData.data = errorData;
      finalStructuredData.error = errorDetails;

      if (
        error.message &&
        (error.message.toLowerCase().includes("no short answer available") ||
          error.message.toLowerCase().includes("did not understand input"))
      ) {
        userMessage = `Wolfram Alpha couldn't provide a direct short answer for "${query}". Perhaps try rephrasing or asking differently?`;
        errorDetails =
          "No short answer available or query not understood by WolframAlpha.";
        this.log("warn", `${logPrefix} ${errorDetails}`);
        errorData.interpretation = "No direct answer available.";
        errorData.error = errorDetails;
        finalStructuredData.error = errorDetails;
        return {
          error: errorDetails,
          result: userMessage,
          structuredData: finalStructuredData,
        };
      } else if (error.message) {
        userMessage = `Wolfram Alpha error: ${error.message}`;
        errorData.error = error.message;
        finalStructuredData.error = error.message;
      }
      if (error.name === "AbortError") {
        userMessage =
          "Sorry, the computation with Wolfram Alpha took too long.";
        errorDetails = "WolframAlpha query timed out or was cancelled.";
        errorData.interpretation = "Request timed out.";
        errorData.error = errorDetails;
        finalStructuredData.error = errorDetails;
        this.log("error", `${logPrefix} Request timed out or aborted.`);
        return {
          error: errorDetails,
          result: userMessage,
          structuredData: finalStructuredData,
        };
      }

      this.log("error", `${logPrefix} Failed:`, error);
      return {
        error: errorDetails,
        result: userMessage,
        structuredData: finalStructuredData,
      };
    }
  }
}
