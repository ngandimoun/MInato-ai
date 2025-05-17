// FILE: lib/tools/DataProfilingTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { ParsedDataObject, DataProfile, DataProfileOutput } from "@/lib/types";
import { logger } from "@/memory-framework/config";
import { generateStructuredJson } from "../providers/llm_clients";
import { appConfig } from "../config";

interface DataProfilingInput extends ToolInput {
  // parsedData is required by schema, but for type safety, allow it to be potentially missing if input validation fails
  parsedData: ParsedDataObject;
}

// This schema describes the *expected input argument 'parsedData'* for this tool.
// It's what the LLM should understand DataParsingTool *produces*.
const ParsedDataArgumentSchema: OpenAIToolParameterProperties = {
    type: "object" as const,
    description: "The structured data object output by the DataParsingTool. This is a required input.",
    properties: {
        headers: { type: "array", items: { type: "string" }, description: "List of column headers." } as OpenAIToolParameterProperties,
        rows: { type: "array", items: { type: "array", items: { type: ["string", "number", "null"] } }, description: "Array of data rows, where each row is an array of cell values." } as OpenAIToolParameterProperties,
        rowCount: { type: "number", description: "Total number of data rows." } as OpenAIToolParameterProperties,
        columnCount: { type: "number", description: "Total number of columns." } as OpenAIToolParameterProperties,
        fileName: { type: ["string", "null"], description: "Original name of the parsed file." } as OpenAIToolParameterProperties,
        fileType: { type: ["string", "null"], description: "MIME type of the parsed file." } as OpenAIToolParameterProperties,
    },
    required: ["headers", "rows", "rowCount", "columnCount", "fileName", "fileType"],
};


// This is the schema for the *output* of DataProfilingTool (what it generates using an LLM)
const PROFILING_OUTPUT_SCHEMA_FOR_LLM = {
  type: "object",
  properties: {
    rowCount: { type: "number" as const, description: "Total number of rows analyzed." } as OpenAIToolParameterProperties,
    columnCount: { type: "number" as const, description: "Total number of columns analyzed." } as OpenAIToolParameterProperties,
    columnDetails: {
      type: "object" as const,
      description: "Object where each key is a column name and value contains its profile.",
      // For `additionalProperties` with an object value, the value itself should define its schema if fixed.
      // If column names are truly dynamic and their *value structure* is fixed:
      additionalProperties: { // Allows dynamic column names as keys
        type: "object" as const,
        properties: {
          originalHeader: { type: "string", description: "Original header name." } as OpenAIToolParameterProperties,
          inferredType: { type: "string", enum: ["Number", "Text", "Date", "Currency", "Category", "Identifier", "Location", "Boolean", "Unknown"], description: "Inferred data type for the column." } as OpenAIToolParameterProperties,
          semanticMeaning: { type: ["string", "null"] as const, enum: ["SalesRevenue", "ExpenseAmount", "Date", "ProductName", "CustomerID", "ExpenseCategory", "TransactionID", "Quantity", "Other", null], description: "Inferred semantic meaning." } as OpenAIToolParameterProperties,
          missingValues: { type: "number", description: "Count of missing values." } as OpenAIToolParameterProperties,
          uniqueValues: { type: "number", description: "Count of unique values." } as OpenAIToolParameterProperties,
          sampleValues: { type: ["array", "null"] as const, items: { type: ["string", "number", "boolean", "null"] as const }, description: "Up to 5 sample values from the column." } as OpenAIToolParameterProperties, // Removed maxItems for schema
          min: { type: ["number", "string", "null"] as const, description: "Minimum value if numeric/date, or first alphabetically if text." } as OpenAIToolParameterProperties,
          max: { type: ["number", "string", "null"] as const, description: "Maximum value if numeric/date, or last alphabetically if text." } as OpenAIToolParameterProperties,
          mean: { type: ["number", "null"] as const, description: "Mean (average) if numeric." } as OpenAIToolParameterProperties,
          median: { type: ["number", "null"] as const, description: "Median if numeric." } as OpenAIToolParameterProperties,
          stddev: { type: ["number", "null"] as const, description: "Standard deviation if numeric." } as OpenAIToolParameterProperties,
        },
        // All properties of a columnDetail item are expected from the LLM
        required: ["originalHeader", "inferredType", "semanticMeaning", "missingValues", "uniqueValues", "sampleValues", "min", "max", "mean", "median", "stddev"],
        additionalProperties: false,
      } as OpenAIToolParameterProperties,
    } as OpenAIToolParameterProperties,
    potentialDateColumns: { type: "array" as const, items: { type: "string" as const }, description: "List of column names likely to be dates." } as OpenAIToolParameterProperties,
    potentialRevenueColumns: { type: "array" as const, items: { type: "string" as const }, description: "List of column names likely representing revenue." } as OpenAIToolParameterProperties,
    potentialExpenseColumns: { type: "array" as const, items: { type: "string" as const }, description: "List of column names likely representing expenses." } as OpenAIToolParameterProperties,
    potentialCategoryColumns: { type: "array" as const, items: { type: "string" as const }, description: "List of column names suitable for categorization." } as OpenAIToolParameterProperties,
    potentialIdColumns: { type: "array" as const, items: { type: "string" as const }, description: "List of column names that might be identifiers." } as OpenAIToolParameterProperties,
    warnings: { type: "array" as const, items: { type: "string" as const }, description: "Potential issues detected (e.g., high missing values, inconsistent types)." } as OpenAIToolParameterProperties,
  },
  required: ["rowCount", "columnCount", "columnDetails", "potentialDateColumns", "potentialRevenueColumns", "potentialExpenseColumns", "potentialCategoryColumns", "potentialIdColumns", "warnings"],
  additionalProperties: false,
};


export class DataProfilingTool extends BaseTool {
  name = "DataProfilingTool";
  description =
    "Analyzes parsed data to understand its structure, infer column types and meanings (like Dates, Revenue, Categories), and identify potential issues (like missing data).";
  argsSchema = {
    type: "object" as const,
    properties: {
      parsedData: ParsedDataArgumentSchema, // Use the defined schema for the input argument
    },
    required: ["parsedData"], // This tool only requires the output of DataParsingTool
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600; // Profiled data can be cached for a while

  async execute(
    input: DataProfilingInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { userId: contextUserId, parsedData } = input; // parsedData is guaranteed by 'required'
    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[DataProfilingTool User:${userId?.substring(0,8)} File:${parsedData?.fileName || "N/A"}]`;
    logger.info(`${logPrefix} Starting data profiling...`);

    const queryInputForStructuredData = { parsedData: `[Profile for ${parsedData?.fileName || 'data'}]`}; // Avoid logging full data

    if (!userId) return { error: "User ID required.", result: "Cannot profile data without user context.", structuredData: undefined };
    if (!parsedData || !parsedData.headers || !parsedData.rows) {
         return { error: "Invalid or missing parsedData from previous step.", result: "Minato needs the parsed data to profile it. Please parse a file first.", structuredData: undefined };
    }

    const headersString = parsedData.headers.join(", ");
    // Provide a more structured sample for the LLM if possible, or a concise string representation
    const sampleRowsPreview = parsedData.rows
      .slice(0, 3) // Fewer rows for brevity in prompt
      .map(row =>
          parsedData.headers.reduce((acc, header, idx) => {
              acc[header] = String(row[idx] ?? "").substring(0, 30); // Truncate long cell values
              return acc;
          }, {} as Record<string, string>)
      );

    const inputForLLM = `Data Headers: [${headersString}]\nNumber of Rows (in full dataset): ${parsedData.rowCount}\nSample Data (first few rows, values may be truncated):\n${JSON.stringify(sampleRowsPreview, null, 2)}`;

    const MAX_INPUT_LEN_PROFILING = 6000; // Slightly less to allow for prompt text itself
    const truncatedInputForLLM = inputForLLM.substring(0, MAX_INPUT_LEN_PROFILING);

    const systemPrompt = `You are an expert data analyst AI. Your task is to profile the provided dataset sample.
Based on the headers and sample rows, infer the data type and potential semantic meaning for each column.
Identify columns that might be dates, revenue, expenses, categories, or identifiers.
Calculate basic statistics (min, max, mean, median, stddev) for numeric columns *based ONLY on the provided sample rows*. If a statistic is not applicable or calculable from the sample, use null.
List any potential data quality warnings (e.g., many missing values in a column based on sample, inconsistent data types if inferable from sample).
Respond ONLY with a JSON object matching the 'data_profile_schema_v3' structure. Ensure all required fields are present.
Sample data is a small extract and might not represent the full dataset for statistical accuracy beyond basic type inference.
For 'sampleValues', provide up to 5 distinct non-null values from the sample for each column.
For 'inferredType' use one of: "Number", "Text", "Date", "Currency", "Category", "Identifier", "Location", "Boolean", "Unknown".
For 'semanticMeaning' use one of: "SalesRevenue", "ExpenseAmount", "Date", "ProductName", "CustomerID", "ExpenseCategory", "TransactionID", "Quantity", "Other", or null.
Focus on the structure and likely content of columns.
The overall rowCount and columnCount are for the full dataset and provided in the input. Your columnDetails should reflect an analysis of the *sample data given* to infer types and sample stats.
Acknowledge that stats like min/max/mean from sample might not represent the full dataset.
`;
    const userPromptForLLM = `Profile the following data sample:\n${truncatedInputForLLM}`;

    try {
      // Use the schema defined for the LLM's output
      const profileResult = await generateStructuredJson<DataProfile>(
        systemPrompt,
        userPromptForLLM,
        PROFILING_OUTPUT_SCHEMA_FOR_LLM, // This is the schema the LLM should fill
        "data_profile_schema_v3", // Updated schema name
        [],
        appConfig.openai.extractionModel, // Use a capable model for this complex JSON
        userId
      );

      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Profiling aborted.`);
        return { error: "Data profiling cancelled.", result: "Cancelled.", structuredData: undefined };
      }
      if ("error" in profileResult) {
        logger.error(`${logPrefix} LLM profiling failed: ${profileResult.error}`);
        throw new Error(`AI profiling failed: ${profileResult.error}`);
      }

      // Ensure rowCount and columnCount from the original parsedData are used
      const finalProfile: DataProfile = {
        ...profileResult,
        rowCount: parsedData.rowCount,
        columnCount: parsedData.columnCount,
        fileName: parsedData.fileName,
        fileType: parsedData.fileType,
      };

      finalProfile.warnings = finalProfile.warnings || [];
      // Example heuristic: This should ideally be done by the LLM based on sample values if it can count nulls
      for (const header in finalProfile.columnDetails) {
        const details = finalProfile.columnDetails[header];
        if (details.missingValues && details.missingValues > parsedData.rowCount / 2 && parsedData.rowCount > 0) {
          const warningMsg = `Column '${header}' has over 50% missing values (approx. ${details.missingValues} of ${parsedData.rowCount}).`;
          if (!finalProfile.warnings.includes(warningMsg)) finalProfile.warnings.push(warningMsg);
        }
      }


      logger.info(`${logPrefix} Profiling successful. Inferred types for some columns: ${Object.values(finalProfile.columnDetails).slice(0,3).map(d => `${d.originalHeader}:${d.inferredType}`).join(", ")}`);
      const summary = `Data profiled for '${finalProfile.fileName || 'your file'}': ${finalProfile.rowCount} rows, ${finalProfile.columnCount} columns. Identified potential date columns: [${finalProfile.potentialDateColumns?.join(", ")}], category columns: [${finalProfile.potentialCategoryColumns?.join(", ")}]. ${finalProfile.warnings?.length ? `Warnings: ${finalProfile.warnings.join("; ")}` : "No major warnings from sample."}`;

      const outputData: DataProfileOutput = {
        result_type: "data_profile_internal",
        source_api: "internal_profiler_llm", // Indicate LLM was used
        data: finalProfile,
        error: undefined,
      };

      return { result: summary, structuredData: outputData };
    } catch (error: any) {
      if (error.name === "AbortError") {
        logger.warn(`${logPrefix} Profiling aborted by signal.`);
        return { error: "Data profiling cancelled.", result: "Cancelled.", structuredData: undefined };
      }
      logger.error(`${logPrefix} Profiling failed: ${error.message}`);
      return {
        error: `Data profiling failed: ${error.message}`,
        result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't understand the structure of that data.`,
        structuredData: undefined,
      };
    }
  }
}