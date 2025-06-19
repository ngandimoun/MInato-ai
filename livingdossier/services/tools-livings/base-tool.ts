//livingdossier/services/tools-livings/base-tool.ts
// Replace the import with local interface definitions
// import { UserState, AnyToolStructuredData } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

// Define local interfaces to replace the imports
interface UserState {
  location?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    timestamp?: number;
  };
  preferences?: {
    theme?: string;
    language?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Generic interface for structured data returned by tools
interface AnyToolStructuredData {
  result_type?: string;
  source_api?: string;
  [key: string]: any;
}

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
  /**
   * Optional: Categories describing the tool's domain or use-case (e.g., ["search", "news", "media"])
   */
  categories?: string[];
  /**
   * Optional: Version string for the tool implementation (e.g., "1.0.0")
   */
  version?: string;
  /**
   * Optional: Arbitrary metadata for the tool (for future extensibility)
   */
  metadata?: Record<string, any>;
  cacheTTLSeconds?: number = 90;
  enabled: boolean = true;
  /**
   * Optional: Per-tool execution timeout in milliseconds. Overrides global default if set.
   */
  timeoutMs?: number;
  /**
   * Optional: Maximum number of times this tool can be called per session/user. If exceeded, tool will not execute.
   */
  maxCallsPerSession?: number;
  /**
   * Optional: Per-user rate limits for this tool (calls per minute, hour, day).
   */
  rateLimits?: {
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };

  abstract execute( input: ToolInput, abortSignal?: AbortSignal ): Promise<ToolOutput>;

  protected log( level: "info" | "warn" | "error" | "debug", message: string, data?: any ): void {
    const logMessage = `[Tool:${this.name}] ${message}`;
    if (data !== undefined) { logger[level](logMessage, data); }
    else { logger[level](logMessage); }
  }
}