import { UserState, AnyToolStructuredData } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

export interface ToolInput {
  query?: string; // Often the primary input for search-like tools
  action?: string | null; // For tools with multiple actions
  userId?: string; // User ID from context, will be injected by Orchestrator/ToolExecute API
  lang?: string | null; // Language from context
  sessionId?: string; // Session ID from context
  context?: {
    ipAddress?: string;
    latitude?: number | null;
    longitude?: number | null;
    timezone?: string | null;
    locale?: string; // Full locale like en-US
    countryCode?: string; // e.g., US
    runId?: string; // Specific run ID for an interaction
    userState?: UserState | null;
    abortSignal?: AbortSignal; // Optional AbortSignal for cancellation
    userName?: string; // Added for personalized tool responses
    [key: string]: any; // For other contextual data
  };
  [key: string]: any; // For tool-specific arguments passed by the LLM
}

export interface ToolOutput {
  result?: string | null; // User-facing text summary of the tool's action/result
  structuredData?: AnyToolStructuredData; // Data for UI rendering or further processing
  error?: string | null;
  needsFollowUp?: boolean;
  requiredInfo?: string[]; // If tool needs more info from user (rare, usually handled by LLM clarification)
}

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract argsSchema: { // More specific type for argsSchema
    type: "object";
    properties: Record<string, {
        type: string | string[];
        description?: string;
        enum?: readonly string[] | string[];
        format?: string;
        minimum?: number;
        maximum?: number;
        default?: any;
        items?: any; // For array types
        nullable?: boolean; // Custom flag, OpenAPI uses `type: ["string", "null"]`
    }>;
    required: string[];
    additionalProperties: false;
    description?: string; // Optional description for the overall args object
  };
  cacheTTLSeconds?: number = 90; // Default TTL for caching tool output
  enabled: boolean = true; // Default to enabled

  abstract execute( input: ToolInput, abortSignal?: AbortSignal ): Promise<ToolOutput>;

  protected log( level: "info" | "warn" | "error" | "debug", message: string, data?: any ): void {
    const logMessage = `[Tool:${this.name}] ${message}`;
    if (data !== undefined) { logger[level](logMessage, data); }
    else { logger[level](logMessage); }
  }
}