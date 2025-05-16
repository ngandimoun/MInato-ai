// FILE: lib/tools/DataProfilingTool.ts
// (Content from finalcodebase.txt - verified, placeholder logic)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import { ParsedDataObject, DataProfile, DataProfileOutput } from "@/lib/types"; // Use DataProfileOutput
import { logger } from "@/memory-framework/config";
import { generateStructuredJson } from "../providers/llm_clients";
import { appConfig } from "../config";

interface DataProfilingInput extends ToolInput {
  parsedData: ParsedDataObject;
}

const PROFILING_SCHEMA = {
  type: "object",
  properties: {
    rowCount: { type: "integer" },
    columnCount: { type: "integer" },
    columnDetails: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          originalHeader: { type: "string" },
          inferredType: {
            type: "string",
            enum: [
              "Number",
              "Text",
              "Date",
              "Currency",
              "Category",
              "Identifier",
              "Location",
              "Boolean",
              "Unknown",
            ],
          },
          semanticMeaning: {
            type: ["string", "null"],
            enum: [
              "SalesRevenue",
              "ExpenseAmount",
              "Date",
              "ProductName",
              "CustomerID",
              "ExpenseCategory",
              "TransactionID",
              "Quantity",
              "Other",
              null,
            ],
          },
          missingValues: { type: "integer" },
          uniqueValues: { type: "integer" },
          sampleValues: {
            type: ["array", "null"],
            items: { type: ["string", "number", "boolean", "null"] },
            maxItems: 5,
          },
          min: { type: ["number", "string", "null"] },
          max: { type: ["number", "string", "null"] },
          mean: { type: ["number", "null"] },
          median: { type: ["number", "null"] },
          stddev: { type: ["number", "null"] },
        },
        required: [
          "originalHeader",
          "inferredType",
          "missingValues",
          "uniqueValues",
          "sampleValues",
        ],
      },
    },
    potentialDateColumns: { type: "array", items: { type: "string" } },
    potentialRevenueColumns: { type: "array", items: { type: "string" } },
    potentialExpenseColumns: { type: "array", items: { type: "string" } },
    potentialCategoryColumns: { type: "array", items: { type: "string" } },
    potentialIdColumns: { type: "array", items: { type: "string" } },
    warnings: {
      type: "array",
      items: { type: "string" },
      description:
        "Any potential issues detected, e.g., high missing values, inconsistent types.",
    },
  },
  required: ["rowCount", "columnCount", "columnDetails"],
};

export class DataProfilingTool extends BaseTool {
  name = "DataProfilingTool";
  description =
    "Analyzes parsed data to understand its structure, infer column types and meanings (like Dates, Revenue, Categories), and identify potential issues (like missing data).";
  argsSchema = {
    type: "object" as const,
    properties: {
      parsedData: {
        type: "object",
        description:
          "The structured data object output by the DataParsingTool.",
      },
    },
    required: ["parsedData"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600;

  async execute(
    input: DataProfilingInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { userId, parsedData } = input;
    const logPrefix = `[DataProfilingTool User:${userId?.substring(
      0,
      8
    )} File:${parsedData?.fileName || "N/A"}]`;
    logger.info(`${logPrefix} Starting data profiling...`);
    if (!userId)
      return {
        error: "User ID required.",
        result: "Cannot profile data without user context.",
        structuredData: undefined,
      };
    if (!parsedData || !parsedData.headers || !parsedData.rows)
      return {
        error: "Invalid or missing parsedData.",
        result: "Need parsed data to profile.",
        structuredData: undefined,
      };

    const headersString = parsedData.headers.join(", ");
    const sampleRows = parsedData.rows
      .slice(0, 5)
      .map((row) => row.map((v) => String(v ?? "")).join(", "))
      .join("\n");
    const MAX_INPUT_LEN = 8000;
    const inputForLLM =
      `Headers: ${headersString}\nSample Rows:\n${sampleRows}`.substring(
        0,
        MAX_INPUT_LEN
      );
    const systemPrompt = `You are a data analyst AI... [System prompt from previous file] ... Add basic stats (min, max, mean, median, stddev) for numeric columns based ONLY on the sample provided.`;
    const userPrompt = `Profile the following data sample:\n${inputForLLM}`;

    try {
      const profileResult = await generateStructuredJson<DataProfile>(
        systemPrompt,
        userPrompt,
        PROFILING_SCHEMA,
        "data_profile_schema_v2",
        [],
        appConfig.openai.extraction,
        userId
      );
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Profiling aborted.`);
        return {
          error: "Data profiling cancelled.",
          result: "Cancelled.",
          structuredData: undefined,
        };
      }
      if ("error" in profileResult) {
        logger.error(
          `${logPrefix} LLM profiling failed: ${profileResult.error}`
        );
        throw new Error(`AI profiling failed: ${profileResult.error}`);
      }

      // Augment with heuristics if needed
      profileResult.warnings = profileResult.warnings || [];
      for (const header in profileResult.columnDetails) {
        const details = profileResult.columnDetails[header];
        if (
          details.missingValues &&
          details.missingValues > parsedData.rowCount / 2
        ) {
          profileResult.warnings.push(
            `Column '${header}' has over 50% missing values.`
          );
        }
      }

      logger.info(
        `${logPrefix} Profiling successful. Inferred types: ${Object.values(
          profileResult.columnDetails
        )
          .map((d) => d.inferredType)
          .join(", ")}`
      );
      const summary = `Data profiled: ${profileResult.rowCount} rows, ${
        profileResult.columnCount
      } columns. Key columns identified (potential): Dates=[${profileResult.potentialDateColumns?.join(
        ", "
      )}], Revenue=[${profileResult.potentialRevenueColumns?.join(", ")}]. ${
        profileResult.warnings?.length
          ? `Warnings: ${profileResult.warnings.join("; ")}`
          : "No major warnings."
      }`;

      // Use the correct DataProfileOutput structure
      const outputData: DataProfileOutput = {
        result_type: "data_profile_internal",
        source_api: "internal_profiler_llm",
        data: {
          ...profileResult,
          fileName: parsedData.fileName,
          fileType: parsedData.fileType,
        },
        error: undefined,
      };

      return { result: summary, structuredData: outputData };
    } catch (error: any) {
      if (error.name === "AbortError") {
        logger.warn(`${logPrefix} Profiling aborted by signal.`);
        return {
          error: "Data profiling cancelled.",
          result: "Cancelled.",
          structuredData: undefined,
        };
      }
      logger.error(`${logPrefix} Profiling failed: ${error.message}`);
      return {
        error: `Data profiling failed: ${error.message}`,
        result: "Sorry, I couldn't understand the structure of that data.",
        structuredData: undefined,
      };
    }
  }
}
