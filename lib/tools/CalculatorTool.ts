// FILE: lib/tools/CalculatorTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { logger } from "../../memory-framework/config";
import { CachedCalculationOrFact, CachedSingleFact } from "@/lib/types/index";
import { create, all, MathJsStatic } from "mathjs";

const math: MathJsStatic = create(all, {
  epsilon: 1e-12,
  matrix: "Matrix",
  number: "number",
  precision: 64,
  predictable: false,
  randomSeed: null,
});

interface CalculatorInput extends ToolInput {
  expression: string;
}

export class CalculatorTool extends BaseTool {
  name = "CalculatorTool";
  description =
    "Evaluates mathematical expressions. Supports arithmetic (addition '+', subtraction '-', multiplication '*', division '/'), exponentiation ('^'), parentheses '()', and common functions like sqrt, sin, cos, log. Use as a reliable fallback for calculations.";
  argsSchema = {
    type: "object" as const,
    properties: {
      expression: {
        type: "string" as const,
        description:
          "The mathematical expression to evaluate (e.g., '2 + 2 * 3', 'sqrt(16) / (2^3 - 4)', 'log(100, 10)'). This is a required field.",
      } as OpenAIToolParameterProperties,
    },
    required: ["expression"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = undefined; // Calculations are generally fast, no need to cache results unless complex

  constructor() {
    super();
    this.log("info", "CalculatorTool initialized using math.js.");
  }

  async execute(
    input: CalculatorInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { expression } = input; // expression is guaranteed by 'required'
    const logPrefix = `[CalculatorTool] Expr:"${expression?.substring(0,40)}..."`;

    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return { error: "Calculation cancelled.", result: "Cancelled." };
    }

    let outputStructuredData: CachedSingleFact = {
      result_type: "calculation_or_fact",
      source_api: "internal_calculator",
      query: { expression: expression }, // Use the guaranteed expression
      data: {
        query: expression,
        result: null,
        sourcePlatform: "internal_calculator",
        error: "Invalid input",
      },
      error: "Invalid input",
    };

    if (!expression || typeof expression !== "string" || expression.trim().length === 0) {
      // This case should ideally not be hit if LLM respects 'required', but good for robustness
      outputStructuredData.data!.error = "Missing or invalid mathematical expression.";
      outputStructuredData.error = "Missing or invalid mathematical expression.";
      return {
        error: outputStructuredData.error,
        result: "What calculation would you like Minato to perform?",
        structuredData: outputStructuredData,
      };
    }

    const trimmedExpression = expression.trim();
    const allowedCharsRegex = /^[0-9a-zA-Z\s()+\-*/.^,%]+$/;
    if (!allowedCharsRegex.test(trimmedExpression)) {
      const errorMsg = "Expression contains invalid characters.";
      logger.warn(`${logPrefix} ${errorMsg} Original: ${trimmedExpression}`);
      outputStructuredData.data!.error = errorMsg;
      outputStructuredData.error = errorMsg;
      return {
        error: errorMsg,
        result: `Sorry, ${input.context?.userName || "User"}, that expression contains characters Minato can't process for calculation. Please use standard math symbols.`,
        structuredData: outputStructuredData,
      };
    }

    try {
      this.log("info", `${logPrefix} Evaluating with math.js: ${trimmedExpression}`);
      const resultValue = math.evaluate(trimmedExpression);

      if (
        typeof resultValue === "function" ||
        (typeof resultValue === "object" && resultValue !== null &&
         !("compile" in resultValue) && !(resultValue instanceof Date) && !Array.isArray(resultValue) &&
         !(typeof resultValue === 'object' && "re" in resultValue && "im" in resultValue)) // Exclude complex numbers unless specifically handled
      ) {
        throw new Error("Expression resulted in a complex type (e.g. function, matrix) not directly convertible to a single string/number result.");
      }

      let resultString: string;
      if (typeof resultValue === "number") {
        // Format number to a reasonable precision to avoid overly long strings
        resultString = Number(resultValue.toPrecision(15)).toString();
      } else if (resultValue && typeof resultValue.toString === "function") {
        resultString = resultValue.toString();
      } else {
        resultString = String(resultValue); // Fallback
      }
      this.log("info", `${logPrefix} Result: ${resultString}`);

      const structuredResultData: CachedCalculationOrFact = {
        query: trimmedExpression,
        result: resultString,
        interpretation: `Minato calculated: ${trimmedExpression} = ${resultString}`,
        sourcePlatform: "internal_calculator",
        error: undefined,
      };
      outputStructuredData.data = structuredResultData;
      outputStructuredData.error = undefined;

      return { result: `${trimmedExpression} = ${resultString}`, structuredData: outputStructuredData };
    } catch (error: any) {
      this.log("error", `${logPrefix} math.js evaluation error:`, error.message);
      const userErrorMessage = `Sorry, ${input.context?.userName || "User"}, Minato couldn't calculate that. The expression might be invalid or too complex. Error: ${error.message.substring(0,100)}`;
      outputStructuredData.data!.error = `Calculation error: ${error.message}`;
      outputStructuredData.error = `Calculation error: ${error.message}`;
      return {
        error: `Calculation error with math.js: ${error.message}`,
        result: userErrorMessage,
        structuredData: outputStructuredData,
      };
    }
  }
}