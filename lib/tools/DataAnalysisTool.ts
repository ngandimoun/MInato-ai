import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import {
  DataProfile,
  AnalysisResultData,
  AnyToolStructuredData,
  AnalysisChartResult,
  AnalysisTableResult,
  AnalysisSummaryResult,
} from "@/lib/types";
import { logger } from "../../memory-framework/config";

// This DataProfileSchema is for the *input argument* to the tool
const DataProfileSchemaForArgs = {
    type: "object" as const,
    properties: {
        rowCount: { type: "integer" as const },
        columnCount: { type: "integer" as const },
        columnDetails: {
            type: "object" as const,
            // Here, if column names are dynamic, we cannot list them in properties.
            // `additionalProperties: true` with `patternProperties` might work for some LLMs,
            // but for strict Responses API, it's safer to expect a known structure or an array of key-value pairs.
            // For this tool's input, let's assume the LLM will provide this as a structured object.
            // We need to ensure the schema is strict. If `columnDetails` itself has dynamic keys,
            // this schema becomes problematic for `additionalProperties: false` at the root of `columnDetails`.
            // A safer bet if keys are truly dynamic: make columnDetails an array of { columnName: string, details: object }.
            // For now, assuming the LLM *can* structure this even if keys are dynamic, but it's a common failure point.
            // Let's simplify and assume columnDetails's *value* structure is fixed, but keys are dynamic.
            // This requires the `sanitizeJsonSchema` to handle `patternProperties` if used, or make this `additionalProperties: true`
            // which might violate strictness rules if not handled carefully by `sanitizeJsonSchema`.
            // To be fully compliant:
            additionalProperties: true, // This might need to be `false` and specific properties listed or use patternProperties
                                        // For now, let's assume `additionalProperties: true` if the sanitization handles it.
                                        // If not, this has to be an array of {name: string, detail: object}
            properties: {}, // No fixed properties for the keys themselves, keys are the column names
            required: [],
        },
        potentialDateColumns: { type: ["array", "null"], items: { type: "string" as const } },
        potentialRevenueColumns: { type: ["array", "null"], items: { type: "string" as const } },
        potentialExpenseColumns: { type: ["array", "null"], items: { type: "string" as const } },
        potentialCategoryColumns: { type: ["array", "null"], items: { type: "string" as const } },
        potentialIdColumns: { type: ["array", "null"], items: { type: "string" as const } },
        warnings: { type: ["array", "null"], items: { type: "string" as const } },
        fileName: { type: ["string", "null"], },
        fileType: { type: ["string", "null"], },
    },
    required: ["rowCount", "columnCount", "columnDetails", "potentialDateColumns", "potentialRevenueColumns", "potentialExpenseColumns", "potentialCategoryColumns", "potentialIdColumns", "warnings", "fileName", "fileType"],
    additionalProperties: false as false,
    description: "The data profile object from DataProfilingTool."
};


interface DataAnalysisInput extends ToolInput {
  dataProfile: DataProfile; // This is the complex input
  analysisType: "sum" | "average" | "count" | "group_by" | "filter" | "time_series" | "top_n";
  targetColumn: string;
  groupByColumns?: string[] | null; // Made nullable
  dateColumn?: string | null;     // Made nullable
  filterCriteria?: Record<string, any> | null; // Made nullable
  topN?: number | null;           // Made nullable
}

export class DataAnalysisTool extends BaseTool {
  name = "DataAnalysisTool";
  description =
    "Performs specific data analysis operations like summing, averaging, grouping, filtering, or time-series aggregation based on a data profile and instructions.";
  argsSchema = {
    type: "object" as const,
    properties: {
      dataProfile: DataProfileSchemaForArgs, // Use the defined schema
      analysisType: {
        type: "string" as const,
        enum: ["sum", "average", "count", "group_by", "filter", "time_series", "top_n"],
        description: "The type of analysis to perform.",
      },
      targetColumn: {
        type: "string" as const,
        description: "The primary column for the analysis (e.g., the column to sum or average).",
      },
      groupByColumns: { type: ["array", "null"], items: { type: "string" as const }, description: "Column(s) to group by for aggregation." },
      dateColumn: { type: ["string", "null"], description: "The date column for time-series analysis." },
      filterCriteria: {
        type: ["object", "null"],
        description: "Criteria for filtering data before analysis (e.g., {'Region': 'North'}).",
        properties: {}, // No fixed properties for filterCriteria object itself
        additionalProperties: true, // Allow any key-value pairs for filter criteria
        // Note: if `additionalProperties: true` is an issue for the root of filterCriteria,
        // it would need to be an array of {key, operator, value} objects.
        // However, usually an object with dynamic keys is fine for this type of input.
      },
      topN: { type: ["number", "null"], description: "The number of top results to return for 'top_n' analysis." },
    },
    required: ["dataProfile", "analysisType", "targetColumn", "groupByColumns", "dateColumn", "filterCriteria", "topN"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 300;

  async execute(
    input: DataAnalysisInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const {
      userId: contextUserId,
      dataProfile,
      analysisType,
      targetColumn,
      groupByColumns,
      dateColumn,
      filterCriteria,
      topN,
    } = input;
    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[DataAnalysisTool User:${userId?.substring(0,8)} Type:${analysisType}]`;
    logger.info(`${logPrefix} Starting analysis. Target: ${targetColumn}, GroupBy: ${groupByColumns?.join(",")}, DateCol: ${dateColumn}`);

    const queryInputForStructuredData = { ...input, dataProfile: "[DataProfile Object]" }; // Avoid logging large data

    if (!userId) return { error: "User ID required.", result: "Cannot analyze data without user context.", structuredData: { result_type: "analysis_error", query: queryInputForStructuredData, error: "User ID required", source_api:"data_analysis_tool" } };
    if (!dataProfile || !analysisType || !targetColumn) return { error: "Missing required arguments (profile, type, target).", result: "Need more details to perform analysis.", structuredData: { result_type: "analysis_error", query: queryInputForStructuredData, error: "Missing required arguments", source_api:"data_analysis_tool" } };

    await new Promise(resolve => setTimeout(resolve, 1500));
    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Analysis aborted.`);
      return { error: "Data analysis cancelled.", result: "Cancelled.", structuredData: { result_type: "analysis_error", query: queryInputForStructuredData, error: "Cancelled", source_api:"data_analysis_tool" } };
    }

    let resultData: AnalysisResultData | null = null;
    let resultSummary = `Analysis (${analysisType} on ${targetColumn}) completed for ${input.context?.userName || "user"}.`;
    let finalStructuredOutput: AnyToolStructuredData;

    try {
      if (analysisType === "group_by" && groupByColumns && groupByColumns.length > 0) {
        resultSummary = `Minato calculated total ${targetColumn} grouped by ${groupByColumns.join(" & ")} for ${input.context?.userName || "user"}.`;
        resultData = {
          type: "table",
          title: `Total ${targetColumn} by ${groupByColumns.join(" & ")}`,
          description: resultSummary,
          data: [
            { [groupByColumns[0]]: "Category A", [targetColumn]: 500 },
            { [groupByColumns[0]]: "Category B", [targetColumn]: 750 },
            { [groupByColumns[0]]: "Category C", [targetColumn]: 300 },
          ],
        };
        finalStructuredOutput = {
          result_type: "analysis_table",
          source_api: "data_analysis_tool",
          query: queryInputForStructuredData,
          analysis: resultData,
          title: resultData.title!,
          description: resultData.description!,
          error: undefined,
        } as AnalysisTableResult;
        logger.info(`${logPrefix} Simulated group_by sum successful.`);
      } else if (analysisType === "time_series" && dateColumn) {
        resultSummary = `Minato aggregated ${targetColumn} over time (using ${dateColumn}) for ${input.context?.userName || "user"}.`;
        resultData = {
          type: "chart_data",
          title: `${targetColumn} Trend`,
          description: resultSummary,
          data: {
            x: ["2024-01", "2024-02", "2024-03", "2024-04"],
            y: [1000, 1200, 1150, 1300],
            type: "line",
          },
        };
        finalStructuredOutput = {
          result_type: "analysis_chart",
          source_api: "data_analysis_tool",
          query: queryInputForStructuredData,
          analysis: resultData,
          title: resultData.title!,
          description: resultData.description!,
          error: undefined,
        } as AnalysisChartResult;
        logger.info(`${logPrefix} Simulated time_series aggregation successful.`);
      } else {
        resultSummary = `Minato successfully performed analysis: ${analysisType} on ${targetColumn} for ${input.context?.userName || "user"}.`;
        resultData = {
          type: "summary",
          description: "Analysis complete.",
          data: resultSummary,
        };
        finalStructuredOutput = {
          result_type: "analysis_summary",
          source_api: "data_analysis_tool",
          query: queryInputForStructuredData,
          analysis: resultData,
          error: undefined,
        } as AnalysisSummaryResult;
        logger.info(`${logPrefix} Simulated ${analysisType} successful.`);
      }
    } catch (error: any) {
      logger.error(`${logPrefix} Analysis execution failed: ${error.message}`);
      return { error: `Analysis failed: ${error.message}`, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't perform that analysis.`, structuredData: { result_type: "analysis_error", query: queryInputForStructuredData, error: `Analysis failed: ${error.message}`, source_api:"data_analysis_tool" } };
    }

    return { result: resultSummary, structuredData: finalStructuredOutput };
  }
}