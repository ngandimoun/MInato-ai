// FILE: lib/tools/CalculatorTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
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
// Basic sanitization/safety: Limit evaluated functions further if needed
// e.g., delete math.import; delete math.evaluate; (if not needed by other safe tools)

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
        type: "string",
        description:
          "The mathematical expression to evaluate (e.g., '2 + 2 * 3', 'sqrt(16) / (2^3 - 4)', 'log(100, 10)').",
      },
    },
    required: ["expression"],
  };
  cacheTTLSeconds = undefined;

  constructor() {
    super();
    this.log("info", "CalculatorTool initialized using math.js.");
  }

  async execute(
    input: CalculatorInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { expression } = input;
    const logPrefix = `[CalculatorTool] Expr:"${expression?.substring(
      0,
      40
    )}..."`;
    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return {
        error: "Calculation cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    let outputStructuredData: CachedSingleFact = {
      result_type: "calculation_or_fact",
      source_api: "internal_calculator",
      query: input,
      data: {
        query: expression || "",
        result: null,
        sourcePlatform: "internal_calculator",
        error: "Invalid input",
      },
      error: "Invalid input",
    }; // Init with error state
    if (
      !expression ||
      typeof expression !== "string" ||
      expression.trim().length === 0
    ) {
      return {
        error: "Missing or invalid mathematical expression.",
        result: "What calculation would you like Minato to perform?",
        structuredData: outputStructuredData,
      };
    }

    // Allow basic math chars, letters (for functions like sqrt), digits, spaces, comma (some locales), period.
    const allowedCharsRegex = /^[0-9a-zA-Z\s()+\-*/.^,%]+$/;
    if (!allowedCharsRegex.test(expression)) {
      const errorMsg = "Expression contains invalid characters.";
      logger.warn(`${logPrefix} ${errorMsg} Original: ${expression}`);
      outputStructuredData!.data!.error = errorMsg;
      outputStructuredData!.error = errorMsg;
      return {
        error: errorMsg,
        result: `Sorry, ${
          input.context?.userName || "User"
        }, that expression contains characters Minato can't process for calculation. Please use standard math symbols.`,
        structuredData: outputStructuredData,
      };
    }

    try {
      this.log("info", `${logPrefix} Evaluating with math.js: ${expression}`);
      const resultValue = math.evaluate(expression); // Safe evaluation

      // Check for complex results that shouldn't occur in basic calculations
      if (
        typeof resultValue === "function" ||
        (typeof resultValue === "object" &&
          resultValue !== null &&
          !("compile" in resultValue) &&
          !(resultValue instanceof Date) &&
          !Array.isArray(resultValue) &&
          !(
            "re" in resultValue && "im" in resultValue
          )) /* Allow complex numbers */
      ) {
        throw new Error(
          "Expression resulted in a complex type, not a calculable value."
        );
      }

      let resultString: string;
      if (typeof resultValue === "number") {
        resultString = Number(resultValue.toPrecision(15)).toString();
      } else if (resultValue && typeof resultValue.toString === "function") {
        resultString = resultValue.toString();
      } else {
        resultString = String(resultValue);
      }
      this.log("info", `${logPrefix} Result: ${resultString}`);

      const structuredResult: CachedCalculationOrFact = {
        query: expression,
        result: resultString,
        interpretation: `Minato calculated: ${expression} = ${resultString}`,
        sourcePlatform: "internal_calculator",
        error: undefined,
      };
      outputStructuredData = {
        result_type: "calculation_or_fact",
        source_api: "internal_calculator",
        query: input,
        data: structuredResult,
        error: undefined,
      };
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      this.log(
        "error",
        `${logPrefix} math.js evaluation error:`,
        error.message
      );
      const userErrorMessage = `Sorry, ${
        input.context?.userName || "User"
      }, Minato couldn't calculate that. The expression might be invalid or too complex. Error: ${error.message.substring(
        0,
        100
      )}`;
      outputStructuredData!.data!.error = `Calculation error: ${error.message}`;
      outputStructuredData!.error = `Calculation error: ${error.message}`;
      return {
        error: `Calculation error with math.js: ${error.message}`,
        result: userErrorMessage,
        structuredData: outputStructuredData,
      };
    }
  }
}
