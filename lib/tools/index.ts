// FILE: lib/tools/index.ts
import { BaseTool } from "./base-tool";
import { logger } from "../../memory-framework/config";
import { getGlobalMemoryFramework } from "../memory-framework-global";
import { MemoryTool } from "./MemoryTool";

// --- Import Tool Implementations ---
import { WebSearchTool } from "./WebSearchTool";
import { GoogleCalendarReaderTool } from "./GoogleCalendarReaderTool";
import { GoogleGmailReaderTool } from "./GoogleGmailReaderTool";
import { ReminderReaderTool } from "./ReminderReaderTool";
import { ReminderSetterTool } from "./ReminderSetterTool";
import { ProactiveReminderTool } from "./ProactiveReminderTool";
import { StripePaymentLinkTool } from "./StripePaymentLinkTool";
// MemoryTool and InternalTaskTool would also be imported if they were in separate files
// For example: import { MemoryTool } from "./MemoryTool";

// --- Tool Registry (Canonical Names Only) ---
// The key MUST match the 'name' property of the tool instance. Aliases are handled in resolveToolName only.
export const tools: { [key: string]: BaseTool } = {
  WebSearchTool: Object.assign(new WebSearchTool(), { timeoutMs: 8000, maxCallsPerSession: 5, rateLimits: { perMinute: 5, perHour: 20 } }),
  GoogleCalendarReaderTool: Object.assign(new GoogleCalendarReaderTool(), { enabled: false }),
  GoogleGmailReaderTool: Object.assign(new GoogleGmailReaderTool(), { enabled: false }),
  ReminderReaderTool: new ReminderReaderTool(),
  ReminderSetterTool: new ReminderSetterTool(),
  ProactiveReminderTool: new ProactiveReminderTool(),
  StripePaymentLinkTool: Object.assign(new StripePaymentLinkTool(), { enabled: false, timeoutMs: 10000, maxCallsPerSession: 5, rateLimits: { perMinute: 5, perHour: 20 } }),
  MemoryTool: new MemoryTool(getGlobalMemoryFramework()),
  // MemoryTool and InternalTaskTool will be added to orchestrator's instance of the registry
  // Example: MemoryTool: new MemoryTool(),
};

// --- Tool Schema & Enabled Property Validation ---
if (typeof window === "undefined") {
  const staticToolNames = Object.keys(tools);
  logger.info(
    `[Tools Registry] Initialized ${staticToolNames.length} static tools in registry: ${staticToolNames.join(", ")}`
  );
  let mismatchFound = false;
  let schemaErrorFound = false;
  for (const key in tools) {
    const tool = tools[key];
    // Name check
    if (tool.name !== key) {
      logger.error(
        `[Tools Registry] CRITICAL MISMATCH! Tool object name "${tool.name}" != registry key "${key}".`
      );
      mismatchFound = true;
    }
    // argsSchema check
    if (!tool.argsSchema || tool.argsSchema.type !== "object" || !tool.argsSchema.properties) {
      logger.error(
        `[Tools Registry] Tool "${tool.name}" is missing a valid argsSchema (must be type: 'object' and have properties).`
      );
      schemaErrorFound = true;
    }
    // enabled property check (default to true if missing)
    if (typeof tool.enabled === "undefined") {
      logger.warn(
        `[Tools Registry] Tool "${tool.name}" missing 'enabled' property. Defaulting to true.`
      );
      tool.enabled = true;
    }
  }
  if (mismatchFound) {
    logger.error(
      `[Tools Registry] Tool registry key mismatch detected. Ensure keys in the 'tools' object match the 'name' property of the tool instances.`
    );
  } else {
    logger.info(
      "[Tools Registry] All static tool names verified against registry keys."
    );
  }
  if (schemaErrorFound) {
    logger.error(
      `[Tools Registry] One or more tools are missing a valid argsSchema. Tool orchestration may fail for those tools.`
    );
  }
}

// Example for WebSearchTool (assuming it's defined in its own file or here)
// export class WebSearchTool extends BaseTool {
//   name = "WebSearchTool";
//   description = "Effectue une recherche web";
//   argsSchema = {
//     type: "object" as const,
//     properties: {
//       query: { type: "string" as const },
//       max_results: { type: "number" as const, minimum: 1, maximum: 10 }
//     },
//     required: ["query"],
//     additionalProperties: false
//   };
//   async _call(args: { query: string; max_results?: number }): Promise<string> { /* ... implementation ... */ return ""; }
// }

// Add similar schema definitions to all tools

// --- Tool Aliases (Single Source of Truth) ---
/**
 * This is the single source of truth for all tool aliases.
 * All consumers (resolveToolName, API endpoints, utilities, etc.) MUST import this map.
 * Keys should be lowercase as input to resolveToolName is lowercased.
 */
export const toolAliases: { [key: string]: string } = {
  // WebSearchTool Aliases
  "search": "WebSearchTool",
  "websearch": "WebSearchTool",
  "googlesearch": "WebSearchTool",
  "find": "WebSearchTool",
  // New aliases
  "web": "WebSearchTool",
  "internetsearch": "WebSearchTool",
  "onlinesearch": "WebSearchTool",
  "lookup": "WebSearchTool",
  "browse": "WebSearchTool",
  "askweb": "WebSearchTool",
  "googleit": "WebSearchTool",
  "searchonline": "WebSearchTool",
  "queryweb": "WebSearchTool",

  // GoogleCalendarReaderTool Aliases
  "calendar": "GoogleCalendarReaderTool",
  "googlecalendar": "GoogleCalendarReaderTool",
  "checkschedule": "GoogleCalendarReaderTool",
  // New aliases
  "calendarsearch": "GoogleCalendarReaderTool",
  "gcal": "GoogleCalendarReaderTool",
  "mycalendar": "GoogleCalendarReaderTool",
  "schedule": "GoogleCalendarReaderTool",
  "appointments": "GoogleCalendarReaderTool",
  "viewcalendar": "GoogleCalendarReaderTool",
  "getcalendarevents": "GoogleCalendarReaderTool",
  "whatsnext": "GoogleCalendarReaderTool", // Often related to calendar

  // GoogleGmailReaderTool Aliases
  "email": "GoogleGmailReaderTool",
  "gmail": "GoogleGmailReaderTool",
  "checkemail": "GoogleGmailReaderTool",
  // New aliases
  "mail": "GoogleGmailReaderTool",
  "emails": "GoogleGmailReaderTool",
  "readmail": "GoogleGmailReaderTool",
  "reademail": "GoogleGmailReaderTool",
  "myemail": "GoogleGmailReaderTool",
  "inbox": "GoogleGmailReaderTool",
  "checkinbox": "GoogleGmailReaderTool",
  "getemails": "GoogleGmailReaderTool",
  "mymails": "GoogleGmailReaderTool",

  // ReminderReaderTool Aliases
  "reminder": "ReminderReaderTool",
  "checkreminders": "ReminderReaderTool",
  // New aliases
  "reminders": "ReminderReaderTool",
  "myreminders": "ReminderReaderTool",
  "viewreminders": "ReminderReaderTool",
  "getreminders": "ReminderReaderTool",
  "listreminders": "ReminderReaderTool",
  "showreminders": "ReminderReaderTool",
  
  // ReminderSetterTool Aliases
  "setreminder": "ReminderSetterTool",
  "createreminder": "ReminderSetterTool",
  "addreminder": "ReminderSetterTool",
  "remindme": "ReminderSetterTool",
  "remindmeto": "ReminderSetterTool",
  "schedulereminder": "ReminderSetterTool",
  "newreminder": "ReminderSetterTool",
  "makereminder": "ReminderSetterTool",
  "reminder_setter": "ReminderSetterTool",
  "savereminder": "ReminderSetterTool",
  
  // ProactiveReminderTool Aliases
  "proactivereminder": "ProactiveReminderTool",
  "checkduereminders": "ProactiveReminderTool",
  "duereminders": "ProactiveReminderTool",
  "upcomingreminders": "ProactiveReminderTool",
  "remindercheck": "ProactiveReminderTool",
  "proactive_reminder": "ProactiveReminderTool",

  // MemoryTool Aliases (Assuming MemoryTool is a registered tool)
  "memory": "MemoryTool",
  "recall": "MemoryTool",
  "remember": "MemoryTool",
  "memorydisplaytool": "MemoryTool", // Lowercased
  "displaymymemories": "MemoryTool", // Lowercased, no spaces
  "showmemory": "MemoryTool",
  // New aliases
  "memories": "MemoryTool",
  "memorystore": "MemoryTool",
  "getmemory": "MemoryTool",
  "retrievememory": "MemoryTool",
  "brain": "MemoryTool", // Metaphorical
  "recallinfo": "MemoryTool",
  "searchmemory": "MemoryTool",
  "whatdidisay": "MemoryTool",

  // StripePaymentLinkTool Aliases
  "stripe": "StripePaymentLinkTool",
  "paymentlink": "StripePaymentLinkTool",
  "payment": "StripePaymentLinkTool",
  "createpayment": "StripePaymentLinkTool",
  "sellproduct": "StripePaymentLinkTool",
  "sell": "StripePaymentLinkTool",
  "checkout": "StripePaymentLinkTool",
  "paymentlinks": "StripePaymentLinkTool",
  "stripepayment": "StripePaymentLinkTool",
  "createstripe": "StripePaymentLinkTool",
};

// Function to map tool name variations to the correct tool instance
export function resolveToolName(toolName: string): BaseTool | null {
  // Normalize: lowercase, remove spaces, underscores, and dashes
  const normalize = (name: string) => name.toLowerCase().replace(/[\s_-]+/g, '');
  const originalToolName = toolName;
  const lowerCaseToolName = normalize(toolName);
  let canonicalName: string | undefined = toolAliases[lowerCaseToolName];

  // If not found in aliases, check if the normalized toolName directly matches a canonical tool name
  if (!canonicalName) {
    // Try direct match with keys in `tools` (case-insensitive, normalized)
    const toolKeys = Object.keys(tools);
    const foundKey = toolKeys.find(key => normalize(key) === lowerCaseToolName);
    if (foundKey && tools[foundKey]) {
        canonicalName = tools[foundKey].name; // Use the actual 'name' property from the tool
    } else if (tools[toolName]) { // Original case exact match
        canonicalName = tools[toolName].name;
    }
  }
  
  const toolInstance = canonicalName ? tools[canonicalName] : undefined;

  if (!toolInstance) {
    logger.warn(`[Tools] Tool lookup: original='${originalToolName}', normalized='${lowerCaseToolName}' resolved to '${canonicalName || 'nothing'}', which was not found in the static tools registry. It might be a dynamic tool or an unrecognized tool name.`);
    return null;
  } else {
    logger.debug(`[Tools] Tool lookup: original='${originalToolName}', normalized='${lowerCaseToolName}' resolved to '${canonicalName}'.`);
  }
  return toolInstance;
}