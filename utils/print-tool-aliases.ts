import { resolveToolName } from "../lib/tools/index";

// Extract the alias map from resolveToolName (by inspecting its code)
// We'll reconstruct the alias map here for clarity (keep in sync with lib/tools/index.ts)
const toolNameMap: { [key: string]: string } = {
  // WebSearchTool Aliases
  "search": "WebSearchTool",
  "websearch": "WebSearchTool",
  "googlesearch": "WebSearchTool",
  "find": "WebSearchTool",

  // GoogleCalendarReaderTool Aliases
  "calendar": "GoogleCalendarReaderTool",
  "googlecalendar": "GoogleCalendarReaderTool",
  "checkschedule": "GoogleCalendarReaderTool",

  // GoogleGmailReaderTool Aliases
  "email": "GoogleGmailReaderTool",
  "gmail": "GoogleGmailReaderTool",
  "checkemail": "GoogleGmailReaderTool",

  // ReminderReaderTool Aliases
  "reminder": "ReminderReaderTool",
  "checkreminders": "ReminderReaderTool",

  // MemoryTool Aliases
  "memory": "MemoryTool",
  "recall": "MemoryTool",
  "remember": "MemoryTool",
  "MemoryDisplayTool": "MemoryTool",
  "display my memories": "MemoryTool",
  "showmemory": "MemoryTool",
};

console.log("\n=== Minato Tool Alias Map ===\n");
Object.entries(toolNameMap).forEach(([alias, canonical]) => {
  console.log(`Alias: '${alias}'  =>  Canonical: '${canonical}'`);
});
console.log("\nTotal aliases:", Object.keys(toolNameMap).length); 