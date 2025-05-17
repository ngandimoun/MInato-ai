// FILE: lib/tools/base-tool.ts
import { UserState, AnyToolStructuredData } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

// Define a more restrictive type for properties within OpenAI tool parameters
export type OpenAIToolParameterProperties = {
    type: string | string[]; // e.g., "string", "number", "boolean", "object", "array", or ["string", "null"]
    description?: string;
    enum?: readonly string[] | string[]; // Allowed for string, number, integer types
    items?: OpenAIToolParameterProperties | { type: string }; // For array type
    properties?: Record<string, OpenAIToolParameterProperties>; // For object type
    required?: string[]; // For object type
    // Keywords like 'minimum', 'maximum', 'format', 'pattern' are NOT directly supported by OpenAI for tool parameters.
    // Convey these constraints in the 'description' field.
};

export interface ToolInput {
  query?: string;
  action?: string | null;
  userId?: string;
  lang?: string | null;
  sessionId?: string;
  context?: {
    ipAddress?: string;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string | null;
    locale?: string;
    countryCode?: string;
    runId?: string;
    userState?: UserState | null;
    abortSignal?: AbortSignal;
    userName?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ToolOutput {
  result?: string | null;
  structuredData?: AnyToolStructuredData;
  error?: string | null;
  needsFollowUp?: boolean;
  requiredInfo?: string[];
}

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  // Updated argsSchema structure to be more compliant
  abstract argsSchema: {
    type: "object"; // Root must be object
    properties: Record<string, OpenAIToolParameterProperties>;
    required?: string[]; // Optional at the root, but planner should be guided to fill them
    additionalProperties: false; // Must be false for strict mode
    description?: string;
  };
  cacheTTLSeconds?: number = 90;
  enabled: boolean = true;

  abstract execute( input: ToolInput, abortSignal?: AbortSignal ): Promise<ToolOutput>;

  protected log( level: "info" | "warn" | "error" | "debug", message: string, data?: any ): void {
    const logMessage = `[Tool:${this.name}] ${message}`;
    if (data !== undefined) { logger[level](logMessage, data); }
    else { logger[level](logMessage); }
  }
}