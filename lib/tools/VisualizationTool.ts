// FILE: lib/tools/VisualizationTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import {
  AnalysisResultData,
  AnyToolStructuredData,
  AnalysisChartResult,
  AnalysisTableResult,
  AnalysisSummaryResult,
} from "@/lib/types/index";
import { logger } from "@/memory-framework/config";
// Simulation placeholders - replace with actual charting library integration if needed frontend/backend
// E.g., using Vega-Lite spec generation or similar

interface VisualizationInput extends ToolInput {
  analysisResult: AnalysisResultData;
  visualizationType: "line" | "bar" | "pie" | "table" | "scatter" | "auto"; // Added scatter, auto
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export class VisualizationTool extends BaseTool {
  name = "VisualizationTool";
  description =
    "Generates visualization specifications (like for charts or tables) from structured analysis data.";
  argsSchema = {
    type: "object" as const,
    properties: {
      analysisResult: {
        type: "object",
        description: "The structured data result from the DataAnalysisTool.",
      },
      visualizationType: {
        type: "string",
        enum: ["line", "bar", "pie", "table", "scatter", "auto"],
        description: "Desired visualization ('auto' lets tool decide).",
        default: "auto",
      },
      title: {
        type: "string",
        description: "Optional title for the chart/table.",
      },
      xAxisLabel: {
        type: "string",
        description: "Optional label for the X-axis.",
      },
      yAxisLabel: {
        type: "string",
        description: "Optional label for the Y-axis.",
      },
    },
    required: ["analysisResult", "visualizationType"],
    additionalProperties: false as const,
  };
  cacheTTLSeconds = 300;

  private determineBestVizType(
    data?: AnalysisResultData["data"]
  ): "line" | "bar" | "pie" | "table" | "scatter" {
    if (!data) return "table"; // Default to table if no data
    if (Array.isArray(data)) {
      // Likely table data
      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        const numericCols = keys.filter((k) =>
          data.every((row) => typeof row[k] === "number" || row[k] === null)
        );
        const stringCols = keys.filter((k) =>
          data.every((row) => typeof row[k] === "string" || row[k] === null)
        );
        if (numericCols.length === 1 && stringCols.length === 1) return "bar"; // Good for category vs value
        if (numericCols.length >= 2) return "scatter"; // Good for comparing two numeric values
      }
      return "table"; // Default table for multi-column array data
    } else if (typeof data === "object" && "x" in data && "y" in data) {
      // Likely chart_data
      if (data.type && ["line", "bar", "pie", "scatter"].includes(data.type))
        return data.type;
      if (typeof data.x[0] === "string" && typeof data.y[0] === "number")
        return "bar";
      if (typeof data.x[0] === "number" && typeof data.y[0] === "number")
        return "line"; // Or scatter
      return "line"; // Default line for generic x/y
    }
    return "table"; // Fallback
  }

  async execute(
    input: VisualizationInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const {
      userId,
      analysisResult,
      visualizationType: requestedType,
      title,
      xAxisLabel,
      yAxisLabel,
    } = input;
    const logPrefix = `[VisualizationTool User:${userId?.substring(0, 8)}]`;
    let actualVizType =
      requestedType === "auto"
        ? this.determineBestVizType(analysisResult?.data)
        : requestedType;
    logger.info(
      `${logPrefix} Starting visualization generation... Requested: ${requestedType}, Chosen: ${actualVizType}`
    );

    if (!userId)
      return {
        error: "User ID required.",
        result: "Cannot visualize data without user context.",
        structuredData: undefined,
      };
    if (!analysisResult || !actualVizType)
      return {
        error: "Missing analysisResult or determined visualizationType.",
        result: "Need data and chart type to visualize.",
        structuredData: undefined,
      };
    if (
      (analysisResult.type === "chart_data" ||
        analysisResult.type === "table") &&
      !analysisResult.data
    ) {
      const errorMsg = `Missing data payload for analysis type '${analysisResult.type}'.`;
      logger.error(`${logPrefix} ${errorMsg}`);
      return {
        error: errorMsg,
        result: "The analysis data needed for visualization is missing.",
        structuredData: undefined,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate minimal processing
    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Visualization aborted.`);
      return {
        error: "Visualization generation cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }

    let vizSpec: any = null;
    let resultSummary = `Visualization generation failed for type ${actualVizType}.`;
    let finalStructuredData: AnyToolStructuredData | undefined;

    try {
      // Generate a simple spec (like Vega-Lite or just component props)
      if (analysisResult.type === "table" || actualVizType === "table") {
        // Ensure data is an array of objects
        const tableData = Array.isArray(analysisResult.data)
          ? analysisResult.data
          : [];
        vizSpec = {
          type: "table",
          headers: tableData.length > 0 ? Object.keys(tableData[0]) : [],
          rows: tableData,
        };
        resultSummary = `Generated table specification for: ${
          title || analysisResult.title || "Data Table"
        }.`;
        finalStructuredData = {
          result_type: "analysis_table",
          source_api: "data_analysis_tool",
          analysis: analysisResult,
          error: undefined,
        };
        logger.info(`${logPrefix} Generated table specification.`);
      } else if (
        analysisResult.type === "chart_data" &&
        analysisResult.data &&
        typeof analysisResult.data === "object" &&
        "x" in analysisResult.data &&
        "y" in analysisResult.data
      ) {
        const chartData = analysisResult.data as {
          x: any[];
          y: any[];
          type?: string;
        }; // Cast after check
        // Basic Vega-Lite spec example
        vizSpec = {
          $schema: "https://vega.github.io/schema/vega-lite/v5.json",
          title:
            title ||
            analysisResult.title ||
            `${
              actualVizType.charAt(0).toUpperCase() + actualVizType.slice(1)
            } Chart`,
          description:
            analysisResult.description ||
            `Visualization of ${yAxisLabel || "value"} vs ${
              xAxisLabel || "category"
            }`,
          data: {
            values: chartData.x.map((xv, i) => ({ x: xv, y: chartData.y[i] })),
          }, // Convert to array of objects
          mark: actualVizType,
          encoding: {
            x: {
              field: "x",
              type:
                typeof chartData.x[0] === "number"
                  ? "quantitative"
                  : typeof chartData.x[0] === "string" &&
                    new Date(chartData.x[0]).toString() !== "Invalid Date"
                  ? "temporal"
                  : "nominal",
              axis: { title: xAxisLabel },
            },
            y: {
              field: "y",
              type:
                typeof chartData.y[0] === "number" ? "quantitative" : "nominal",
              axis: { title: yAxisLabel },
            },
          },
        };
        if (actualVizType === "pie") {
          vizSpec.encoding = {
            theta: { field: "y", type: "quantitative", stack: true },
            color: {
              field: "x",
              type: "nominal",
              legend: { title: xAxisLabel || "Category" },
            },
          };
        } else if (actualVizType === "scatter") {
          vizSpec.mark = "point"; // Ensure scatter uses point mark
        }
        resultSummary = `Generated ${actualVizType} chart specification: ${vizSpec.title}.`;
        finalStructuredData = {
          result_type: "analysis_chart",
          source_api: "data_analysis_tool",
          analysis: analysisResult,
          error: undefined,
        };
        logger.info(
          `${logPrefix} Generated ${actualVizType} chart specification.`
        );
      } else if (
        analysisResult.type === "summary" ||
        analysisResult.type === "text_insight"
      ) {
        resultSummary =
          (analysisResult.data as string) || "Analysis summary generated.";
        finalStructuredData = {
          result_type: "analysis_summary",
          source_api: "data_analysis_tool",
          analysis: analysisResult,
          error: undefined,
        };
        logger.info(`${logPrefix} Returning analysis summary as text.`);
      } else {
        throw new Error(
          `Cannot visualize data of type '${analysisResult.type}' as '${actualVizType}'.`
        );
      }
    } catch (error: any) {
      logger.error(
        `${logPrefix} Visualization spec generation failed: ${error.message}`
      );
      return {
        error: `Visualization failed: ${error.message}`,
        result: "Sorry, I couldn't create that visualization.",
        structuredData: undefined,
      };
    }

    return { result: resultSummary, structuredData: finalStructuredData };
  }
}
