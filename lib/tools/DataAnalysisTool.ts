// FILE: lib/tools/DataAnalysisTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import {
  DataProfile,
  AnalysisResultData,
  AnyToolStructuredData,
  AnalysisChartResult,
  AnalysisTableResult,
  AnalysisSummaryResult,
} from "@/lib/types";
import { logger } from "../../memory-framework/config";

const DataProfileSchemaForArgs = {
    type: "object" as const,
    description: "The data profile object from DataProfilingTool. This is required.",
    properties: { // Define expected top-level properties of DataProfile
        rowCount: { type: "number" as const, description: "Number of rows in the dataset." } as OpenAIToolParameterProperties,
        columnCount: { type: "number" as const, description: "Number of columns in the dataset." } as OpenAIToolParameterProperties,
        columnDetails: {
            type: "object" as const,
            description: "Details about each column, where keys are column names.",
            // Since column names are dynamic, we cannot list them as fixed properties for OpenAI strict mode.
            // This implies the LLM should provide this as an object, and we'll process its dynamic keys.
            // For strictness with OpenAI, if we knew specific columns, we'd list them.
            // `additionalProperties: true` here would be for the *values* of columnDetails, if those values had dynamic keys.
            // The keys of `columnDetails` *are themselves* dynamic.
            // A common way to handle this for LLMs is to expect an array of objects:
            // items: { type: "object", properties: { columnName: {type: "string"}, details: { ...fixed detail schema ... }}}
            // But since the prompt asks for an object, we'll assume `additionalProperties: true` is implicitly handled by parsing
            // and the values adhere to a fixed (though not fully specified here for brevity) structure.
            // Let's define a minimal structure for what a column detail might contain for the LLM's understanding.
            additionalProperties: { // This allows dynamic keys (column names)
                type: "object" as const,
                properties: {
                    originalHeader: { type: "string", description: "Original header name." } as OpenAIToolParameterProperties,
                    inferredType: { type: "string", description: "Inferred data type." } as OpenAIToolParameterProperties,
                    // Add other common fields if the LLM needs to be aware of them for planning
                },
                required: ["originalHeader", "inferredType"], // Example minimal requirement
            } as OpenAIToolParameterProperties,
        } as OpenAIToolParameterProperties,
        fileName: { type: ["string", "null"] as const, description: "Original name of the file." } as OpenAIToolParameterProperties,
        fileType: { type: ["string", "null"] as const, description: "MIME type of the file." } as OpenAIToolParameterProperties,
        // Other DataProfile fields (warnings, potential columns) are harder for LLM to provide accurately in this context.
        // The description of `dataProfile` argument should guide LLM about what it needs.
    },
    // All these top-level fields of DataProfile are expected to be provided by the previous tool.
    required: ["rowCount", "columnCount", "columnDetails", "fileName", "fileType"],
    additionalProperties: false as false, // The DataProfile object itself has a fixed structure
};


interface DataAnalysisInput extends ToolInput {
  dataProfile: DataProfile;
  analysisType: "sum" | "average" | "count" | "group_by" | "filter" | "time_series" | "top_n";
  targetColumn: string;
  groupByColumns?: string[] | null;
  dateColumn?: string | null;
  filterCriteria?: Record<string, any> | null;
  topN?: number | null;
}

export class DataAnalysisTool extends BaseTool {
  name = "DataAnalysisTool";
  description =
    "Performs specific data analysis operations like summing, averaging, grouping, filtering, or time-series aggregation based on a data profile and instructions.";
  argsSchema = {
    type: "object" as const,
    properties: {
      dataProfile: DataProfileSchemaForArgs as OpenAIToolParameterProperties, // Use the defined schema
      analysisType: {
        type: "string" as const,
        enum: ["sum", "average", "count", "group_by", "filter", "time_series", "top_n"],
        description: "The type of analysis to perform. This is required.",
      } as OpenAIToolParameterProperties,
      targetColumn: {
        type: "string" as const,
        description: "The primary column for the analysis (e.g., the column to sum or average). This is required.",
      } as OpenAIToolParameterProperties,
      groupByColumns: { type: ["array", "null"] as const, items: { type: "string" as const }, description: "Column(s) to group by for aggregation. Provide as an array of strings, or null if not applicable." } as OpenAIToolParameterProperties,
      dateColumn: { type: ["string", "null"] as const, description: "The date column for time-series analysis. Provide as string, or null if not applicable." } as OpenAIToolParameterProperties,
      filterCriteria: {
        type: ["object", "null"] as const,
        description: "Criteria for filtering data before analysis (e.g., {'Region': 'North'}). Provide as a JSON object or null if no filter.",
        // For an object with dynamic keys, `additionalProperties: true` makes sense if values have a consistent type.
        // Or, more strictly, define it as an array of key-operator-value triplets.
        // Given OpenAI's preference for simpler structures for LLM generation, an object is often fine,
        // assuming the LLM can construct it based on description.
        additionalProperties: true, // Allow any key-value pairs for filter criteria
      } as OpenAIToolParameterProperties,
      topN: { type: ["number", "null"] as const, description: "The number of top results to return for 'top_n' analysis. Must be a positive integer. Provide as number or null." } as OpenAIToolParameterProperties, // Removed minimum
    },
    required: ["dataProfile", "analysisType", "targetColumn", "groupByColumns", "dateColumn", "filterCriteria", "topN"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 300;

  async execute(
    input: DataAnalysisInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { userId: contextUserId, dataProfile, analysisType, targetColumn } = input;
    // Handle defaulting for nullable fields that LLM might send as null
    const groupByColumns = input.groupByColumns === null ? undefined : input.groupByColumns;
    const dateColumn = input.dateColumn === null ? undefined : input.dateColumn;
    const filterCriteria = input.filterCriteria === null ? undefined : input.filterCriteria;
    const topN = (input.topN === null || input.topN === undefined) ? undefined : Math.max(1, input.topN);


    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[DataAnalysisTool User:${userId?.substring(0,8)} Type:${analysisType}]`;
    logger.info(`${logPrefix} Starting analysis. Target: ${targetColumn}, GroupBy: ${groupByColumns?.join(",")}, DateCol: ${dateColumn}, TopN: ${topN}`);

    const queryInputForStructuredData = { ...input, dataProfile: "[DataProfile Object]" };

    if (!userId) return { error: "User ID required.", result: "Cannot analyze data without user context.", structuredData: { result_type: "analysis_error" as any, query: queryInputForStructuredData, error: "User ID required", source_api:"data_analysis_tool" } };
    if (!dataProfile || !analysisType || !targetColumn) return { error: "Missing required arguments (profile, type, target).", result: "Need more details to perform analysis.", structuredData: { result_type: "analysis_error" as any, query: queryInputForStructuredData, error: "Missing required arguments", source_api:"data_analysis_tool" } };

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Analysis aborted.`);
      return { error: "Data analysis cancelled.", result: "Cancelled.", structuredData: { result_type: "analysis_error" as any, query: queryInputForStructuredData, error: "Cancelled", source_api:"data_analysis_tool" } };
    }

    let resultData: AnalysisResultData | null = null;
    let resultSummary = `Analysis (${analysisType} on ${targetColumn}) completed for ${input.context?.userName || "user"}.`;
    let finalStructuredOutput: AnyToolStructuredData;

    try {
      // Placeholder logic - replace with actual data analysis
      if (analysisType === "group_by" && groupByColumns && groupByColumns.length > 0) {
        resultSummary = `Minato calculated total ${targetColumn} grouped by ${groupByColumns.join(" & ")} for ${input.context?.userName || "user"}.`;
        resultData = {
          type: "table",
          title: `Total ${targetColumn} by ${groupByColumns.join(" & ")}`,
          description: resultSummary,
          data: [ // Sample data
            { [groupByColumns[0]]: "Category A", [targetColumn]: Math.floor(Math.random() * 1000) },
            { [groupByColumns[0]]: "Category B", [targetColumn]: Math.floor(Math.random() * 1000) },
            { [groupByColumns[0]]: "Category C", [targetColumn]: Math.floor(Math.random() * 1000) },
          ],
        };
        finalStructuredOutput = {
          result_type: "analysis_table", source_api: "data_analysis_tool",
          analysis: resultData, error: undefined,
        } as AnalysisTableResult; // Removed query, title, desc as they are inside analysis
        logger.info(`${logPrefix} Simulated group_by sum successful.`);
      } else if (analysisType === "time_series" && dateColumn) {
        resultSummary = `Minato aggregated ${targetColumn} over time (using ${dateColumn}) for ${input.context?.userName || "user"}.`;
        resultData = {
          type: "chart_data", title: `${targetColumn} Trend`, description: resultSummary,
          data: {
            x: ["2024-01", "2024-02", "2024-03", "2024-04"],
            y: [Math.random()*100, Math.random()*150, Math.random()*120, Math.random()*180].map(v => Math.round(v)),
            type: "line",
          },
        };
        finalStructuredOutput = {
          result_type: "analysis_chart", source_api: "data_analysis_tool",
          analysis: resultData, error: undefined,
        } as AnalysisChartResult;
        logger.info(`${logPrefix} Simulated time_series aggregation successful.`);
      } else { // sum, average, count, filter, top_n - generic summary for now
        resultSummary = `Minato successfully performed analysis: ${analysisType} on ${targetColumn} for ${input.context?.userName || "user"}. Example result: ${Math.floor(Math.random()*1000)}.`;
        resultData = { type: "summary", description: "Analysis complete.", data: resultSummary };
        finalStructuredOutput = {
          result_type: "analysis_summary", source_api: "data_analysis_tool",
          analysis: resultData, error: undefined,
        } as AnalysisSummaryResult;
        logger.info(`${logPrefix} Simulated ${analysisType} successful.`);
      }
    } catch (error: any) {
      logger.error(`${logPrefix} Analysis execution failed: ${error.message}`);
      return { error: `Analysis failed: ${error.message}`, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't perform that analysis.`, structuredData: { result_type: "analysis_error" as any, query: queryInputForStructuredData, error: `Analysis failed: ${error.message}`, source_api:"data_analysis_tool" } };
    }

    return { result: resultSummary, structuredData: finalStructuredOutput };
  }
}