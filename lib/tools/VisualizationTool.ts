// FILE: lib/tools/VisualizationTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import {
  AnalysisResultData,
  AnyToolStructuredData,
  AnalysisChartResult,
  AnalysisTableResult,
  AnalysisSummaryResult,
} from "@/lib/types/index";
import { logger } from "@/memory-framework/config";

// Schema for the 'analysisResult' input argument
const AnalysisResultDataSchemaForToolArg: OpenAIToolParameterProperties = {
    type: "object" as const,
    description: "The structured data result from DataAnalysisTool, containing title, description, type, and the data itself. This field is required.",
    properties: {
        type: { type: "string", enum: ["table", "chart_data", "summary", "text_insight"], description: "Type of analysis result (e.g., 'table', 'chart_data')." } as OpenAIToolParameterProperties,
        title: { type: ["string", "null"], description: "Title of the analysis. Can be null." } as OpenAIToolParameterProperties,
        description: { type: ["string", "null"], description: "Description of the analysis. Can be null." } as OpenAIToolParameterProperties,
        data: {
            type: ["object", "array", "string", "null"] as const,
            description: "The actual data: array of objects for table; object with x,y arrays for chart; or string for summary. Can be null if not applicable."
        } as OpenAIToolParameterProperties,
        chartSpec: { type: ["object", "null"] as const, description: "Optional: Vega-Lite chart specification if 'chart_data'. Can be null." } as OpenAIToolParameterProperties,
    },
    required: ["type", "title", "description", "data", "chartSpec"], // All defined properties required
};


interface VisualizationInput extends ToolInput {
  analysisResult: AnalysisResultData;
  visualizationType: "line" | "bar" | "pie" | "table" | "scatter" | "auto";
  title?: string | null;
  xAxisLabel?: string | null;
  yAxisLabel?: string | null;
}

export class VisualizationTool extends BaseTool {
  name = "VisualizationTool";
  description =
    "Generates visualization specifications (like for charts or tables) from structured analysis data.";
  argsSchema = {
    type: "object" as const,
    properties: {
      analysisResult: AnalysisResultDataSchemaForToolArg, // Use the defined schema for this complex object argument
      visualizationType: {
        type: "string" as const,
        enum: ["line", "bar", "pie", "table", "scatter", "auto"],
        description: "Desired visualization type. 'auto' lets Minato decide based on data. This is required.",
      } as OpenAIToolParameterProperties,
      title: { type: ["string", "null"] as const, description: "Optional title for the chart/table. Can be null." } as OpenAIToolParameterProperties,
      xAxisLabel: { type: ["string", "null"] as const, description: "Optional label for the X-axis. Can be null." } as OpenAIToolParameterProperties,
      yAxisLabel: { type: ["string", "null"] as const, description: "Optional label for the Y-axis. Can be null." } as OpenAIToolParameterProperties,
    },
    required: ["analysisResult", "visualizationType", "title", "xAxisLabel", "yAxisLabel"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 300;

  private determineBestVizType(data?: AnalysisResultData["data"]): "line" | "bar" | "pie" | "table" | "scatter" {
    if (!data) return "table";
    if (Array.isArray(data)) {
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        const numericCols = keys.filter((k) => data.every((row: any) => typeof row[k] === "number" || row[k] === null));
        const stringCols = keys.filter((k) => data.every((row: any) => typeof row[k] === "string" || row[k] === null));
        if (numericCols.length === 1 && stringCols.length === 1) return "bar";
        if (numericCols.length >= 2) return "scatter";
      }
      return "table";
    } else if (typeof data === "object" && data !== null && "x" in data && "y" in data) {
      const chartData = data as { x: any[], y: any[], type?: string };
      if (chartData.type && ["line", "bar", "pie", "scatter"].includes(chartData.type)) return chartData.type as "line" | "bar" | "pie" | "scatter";
      if (typeof chartData.x[0] === "string" && typeof chartData.y[0] === "number") return "bar";
      if (typeof chartData.x[0] === "number" && typeof chartData.y[0] === "number") return "line";
      return "line";
    }
    return "table";
  }


  async execute(input: VisualizationInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { userId: contextUserId, analysisResult, visualizationType: requestedType } = input;
    // Defaulting logic
    const title = (input.title === null) ? undefined : input.title;
    const xAxisLabel = (input.xAxisLabel === null) ? undefined : input.xAxisLabel;
    const yAxisLabel = (input.yAxisLabel === null) ? undefined : input.yAxisLabel;

    const userId = input.context?.userId || contextUserId;
    const logPrefix = `[VisualizationTool User:${userId?.substring(0, 8)}]`;
    let actualVizType = requestedType === "auto" ? this.determineBestVizType(analysisResult?.data) : requestedType;
    logger.info(`${logPrefix} Starting visualization. Requested: ${requestedType}, Chosen: ${actualVizType}`);

    const queryInputForStructuredData = { ...input, visualizationType: actualVizType, title, xAxisLabel, yAxisLabel, analysisResult: "[AnalysisResult Object]" };

    if (!userId) return { error: "User ID required.", result: "Cannot visualize data without user context.", structuredData: undefined };
    if (!analysisResult || !actualVizType) return { error: "Missing analysisResult or determined visualizationType.", result: "Need data and chart type to visualize.", structuredData: undefined };
    if ((analysisResult.type === "chart_data" || analysisResult.type === "table") && !analysisResult.data ) {
      const errorMsg = `Missing data payload for analysis type '${analysisResult.type}'.`;
      logger.error(`${logPrefix} ${errorMsg}`);
      return { error: errorMsg, result: "The analysis data needed for visualization is missing.", structuredData: undefined };
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    if (abortSignal?.aborted) { logger.warn(`${logPrefix} Visualization aborted.`); return { error: "Visualization generation cancelled.", result: "Cancelled.", structuredData: undefined }; }

    let vizSpec: any = null;
    let resultSummary = `Visualization generation failed for type ${actualVizType}.`;
    let finalStructuredData: AnyToolStructuredData | undefined;

    try {
      if (analysisResult.type === "table" || actualVizType === "table") {
        const tableData = Array.isArray(analysisResult.data) ? analysisResult.data : [];
        vizSpec = { type: "table", headers: tableData.length > 0 ? Object.keys(tableData[0]) : [], rows: tableData };
        resultSummary = `Generated table specification for: ${title || analysisResult.title || "Data Table"}.`;
        finalStructuredData = { result_type: "analysis_table", source_api: "data_analysis_tool", analysis: analysisResult, error: undefined } as AnalysisTableResult;
        logger.info(`${logPrefix} Generated table specification.`);
      } else if (analysisResult.type === "chart_data" && analysisResult.data && typeof analysisResult.data === "object" && "x" in analysisResult.data && "y" in analysisResult.data ) {
        const chartData = analysisResult.data as { x: any[]; y: any[]; type?: string; };
        vizSpec = {
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          title: title || analysisResult.title || `${actualVizType.charAt(0).toUpperCase() + actualVizType.slice(1)} Chart`,
          description: analysisResult.description || `Visualization of ${yAxisLabel || "value"} vs ${xAxisLabel || "category"}`,
          data: { values: chartData.x.map((xv, i) => ({ x: xv, y: chartData.y[i] })) },
          mark: actualVizType === "scatter" ? "point" : actualVizType,
          encoding: {
            x: { field: "x", type: typeof chartData.x[0] === "number" ? "quantitative" : (typeof chartData.x[0] === 'string' && new Date(chartData.x[0]).toString() !== 'Invalid Date' ? "temporal" : "nominal"), axis: { title: xAxisLabel } },
            y: { field: "y", type: typeof chartData.y[0] === "number" ? "quantitative" : "nominal", axis: { title: yAxisLabel } },
          },
        };
        if (actualVizType === "pie") { vizSpec.encoding = { theta: { field: "y", type: "quantitative", stack: true }, color: { field: "x", type: "nominal", legend: { title: xAxisLabel || "Category" }}};}
        resultSummary = `Generated ${actualVizType} chart specification: ${vizSpec.title}.`;
        const chartResultWithSpec: AnalysisResultData = { ...analysisResult, chartSpec: vizSpec };
        finalStructuredData = { result_type: "analysis_chart", source_api: "data_analysis_tool", analysis: chartResultWithSpec, error: undefined } as AnalysisChartResult;
        logger.info(`${logPrefix} Generated ${actualVizType} chart specification.`);
      } else if (analysisResult.type === "summary" || analysisResult.type === "text_insight") {
        resultSummary = (analysisResult.data as string) || "Analysis summary generated.";
        finalStructuredData = { result_type: "analysis_summary", source_api: "data_analysis_tool", analysis: analysisResult, error: undefined } as AnalysisSummaryResult;
        logger.info(`${logPrefix} Returning analysis summary as text.`);
      } else { throw new Error(`Cannot visualize data of type '${analysisResult.type}' as '${actualVizType}'. Data: ${JSON.stringify(analysisResult.data).substring(0,100)}`); }
    } catch (error: any) {
      logger.error(`${logPrefix} Visualization spec generation failed: ${error.message}`);
      return { error: `Visualization failed: ${error.message}`, result: "Sorry, I couldn't create that visualization.", structuredData: undefined };
    }
    return { result: resultSummary, structuredData: finalStructuredData };
  }
}