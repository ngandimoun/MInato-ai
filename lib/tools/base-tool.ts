// FILE: lib/tools/base-tool.ts
// (Content from finalcodebase.txt - verified)
import { UserState, AnyToolStructuredData } from "@/lib/types/index";
import { logger } from "../../memory-framework/config";

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
    abortSignal?: AbortSignal; // Optional AbortSignal
    [key: string]: any;
  };
  [key: string]: any;
}

export interface ToolOutput {
  result?: string | null;
  structuredData?: AnyToolStructuredData; // Union type of all possible structured outputs
  error?: string | null;
  needsFollowUp?: boolean;
  requiredInfo?: string[];
}

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract argsSchema: object; // JSON schema
  cacheTTLSeconds?: number = 90; // Default TTL
  enabled: boolean = true; // Default to enabled

  abstract execute( input: ToolInput, abortSignal?: AbortSignal ): Promise<ToolOutput>;

  protected log( level: "info" | "warn" | "error" | "debug", message: string, data?: any ): void {
    const logMessage = `[Tool:${this.name}] ${message}`;
    if (data !== undefined) { logger[level](logMessage, data); }
    else { logger[level](logMessage); }
  }
}