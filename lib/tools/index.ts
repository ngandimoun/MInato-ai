// FILE: lib/tools/index.ts
import { BaseTool } from "./base-tool";
import { logger } from "../../memory-framework/config";
import { getGlobalMemoryFramework } from "../memory-framework-global";
import { MemoryTool } from "./MemoryTool";

// --- Import Tool Implementations ---
import { WebSearchTool } from "./WebSearchTool";
import { YouTubeSearchTool } from "./YouTubeSearchTool";
import { PexelsSearchTool } from "./PexelsSearchTool";
import { RecipeSearchTool } from "./RecipeSearchTool";
import { DateTimeTool } from "./DateTimeTool";
import { HackerNewsTool } from "./HackerNewsTool";
import { RedditTool } from "./RedditTool";
import { RedditLeadGeneratorTool } from "./RedditLeadGeneratorTool";
import { SportsInfoTool } from "./SportsInfoTool";
import { EventFinderTool } from "./EventFinderTool";
import { GoogleCalendarReaderTool } from "./GoogleCalendarReaderTool";
import { GoogleGmailReaderTool } from "./GoogleGmailReaderTool";
import { NewsAggregatorTool } from "./NewsAggregatorTool";
import { ReminderReaderTool } from "./ReminderReaderTool";
import { ReminderSetterTool } from "./ReminderSetterTool";
import { ProactiveReminderTool } from "./ProactiveReminderTool";
import { StripePaymentLinkTool } from "./StripePaymentLinkTool";
import { LeadRedditTool } from "./leads/LeadRedditTool";
import { LeadHackerNewsTool } from "./leads/LeadHackerNewsTool";
import { LeadYouTubeTool } from "./leads/LeadYouTubeTool";
import { LeadTikTokTool } from "./leads/LeadTikTokTool";
import { LeadNewsTool } from "./leads/LeadNewsTool";
// MemoryTool and InternalTaskTool would also be imported if they were in separate files
// For example: import { MemoryTool } from "./MemoryTool";

// --- Main Tool Registry (for Minato Chat) ---
// The key MUST match the 'name' property of the tool instance. Aliases are handled in resolveToolName only.
// AI Leads tools are intentionally excluded from this registry to prevent access from main chat
export const tools: { [key: string]: BaseTool } = {
  WebSearchTool: Object.assign(new WebSearchTool(), { timeoutMs: 8000, maxCallsPerSession: 5, rateLimits: { perMinute: 5, perHour: 20 } }),
  YouTubeSearchTool: Object.assign(new YouTubeSearchTool(), { timeoutMs: 10000, maxCallsPerSession: 3, rateLimits: { perMinute: 3, perHour: 10 } }),
  PexelsSearchTool: new PexelsSearchTool(),
  RecipeSearchTool: new RecipeSearchTool(),
  NewsAggregatorTool: new NewsAggregatorTool(),
  DateTimeTool: new DateTimeTool(),
  HackerNewsTool: new HackerNewsTool(),
  RedditTool: new RedditTool(),
  RedditLeadGeneratorTool: new RedditLeadGeneratorTool(),
  SportsInfoTool: new SportsInfoTool(),
  EventFinderTool: new EventFinderTool(),
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

// --- Creation Hub Tool Registry (for Creation Hub interface only) ---
// These tools are available only in the Creation Hub, not in main chat
export const creationHubTools: { [key: string]: BaseTool } = {
  LeadRedditTool: Object.assign(new LeadRedditTool(), { timeoutMs: 15000, maxCallsPerSession: 3, rateLimits: { perMinute: 3, perHour: 10 } }),
  LeadHackerNewsTool: Object.assign(new LeadHackerNewsTool(), { timeoutMs: 15000, maxCallsPerSession: 3, rateLimits: { perMinute: 3, perHour: 10 } }),
  LeadYouTubeTool: Object.assign(new LeadYouTubeTool(), { timeoutMs: 15000, maxCallsPerSession: 3, rateLimits: { perMinute: 3, perHour: 10 } }),
  LeadTikTokTool: Object.assign(new LeadTikTokTool(), { timeoutMs: 15000, maxCallsPerSession: 3, rateLimits: { perMinute: 3, perHour: 10 } }),
  LeadNewsTool: Object.assign(new LeadNewsTool(), { timeoutMs: 15000, maxCallsPerSession: 3, rateLimits: { perMinute: 3, perHour: 10 } }),
};

// --- Tool Schema & Enabled Property Validation ---
if (typeof window === "undefined") {
  const staticToolNames = Object.keys(tools);
  logger.info(
    `[Tools Registry] Initialized ${staticToolNames.length} static tools in main registry: ${staticToolNames.join(", ")}`
  );
  
  const creationHubToolNames = Object.keys(creationHubTools);
  logger.info(
    `[Tools Registry] Initialized ${creationHubToolNames.length} Creation Hub tools: ${creationHubToolNames.join(", ")}`
  );
  
  let mismatchFound = false;
  let schemaErrorFound = false;
  
  // Validate main tools
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
  
  // Validate Creation Hub tools
  for (const key in creationHubTools) {
    const tool = creationHubTools[key];
    // Name check
    if (tool.name !== key) {
      logger.error(
        `[Creation Hub Tools Registry] CRITICAL MISMATCH! Tool object name "${tool.name}" != registry key "${key}".`
      );
      mismatchFound = true;
    }
    // argsSchema check
    if (!tool.argsSchema || tool.argsSchema.type !== "object" || !tool.argsSchema.properties) {
      logger.error(
        `[Creation Hub Tools Registry] Tool "${tool.name}" is missing a valid argsSchema (must be type: 'object' and have properties).`
      );
      schemaErrorFound = true;
    }
    // enabled property check (default to true if missing)
    if (typeof tool.enabled === "undefined") {
      logger.warn(
        `[Creation Hub Tools Registry] Tool "${tool.name}" missing 'enabled' property. Defaulting to true.`
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
      "[Tools Registry] All tool names verified against registry keys."
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
 * AI Leads tool aliases are intentionally excluded to prevent access from main chat.
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

  // NewsAggregatorTool Aliases
  "news": "NewsAggregatorTool",
  "newstool": "NewsAggregatorTool",
 // Duplicate "newstool" removed below
  "latestnews": "NewsAggregatorTool",
  "headlines": "NewsAggregatorTool",
  "headline": "NewsAggregatorTool",
  // New aliases
  "newssearch": "NewsAggregatorTool",
  "current_events": "NewsAggregatorTool",
  "topstories": "NewsAggregatorTool",
  "breakingnews": "NewsAggregatorTool",
  "getnews": "NewsAggregatorTool",
  "dailynews": "NewsAggregatorTool",
  "todaysnews": "NewsAggregatorTool",
  "fetchnews": "NewsAggregatorTool",
  "newssearchtool": "NewsAggregatorTool",
  "newssearch_tool": "NewsAggregatorTool",

  // YouTubeSearchTool Aliases
  "youtube": "YouTubeSearchTool",
  "youtubesearch": "YouTubeSearchTool",
  "findvideo": "YouTubeSearchTool",
  // New aliases
  "yt": "YouTubeSearchTool",
  "vidsearch": "YouTubeSearchTool",
  "playvideo": "YouTubeSearchTool",
  "watch": "YouTubeSearchTool",
  "searchyoutube": "YouTubeSearchTool",
  "ytsearch": "YouTubeSearchTool",
  "videosearch": "YouTubeSearchTool",
  "findyoutube": "YouTubeSearchTool",

  // PexelsSearchTool Aliases
  "image": "PexelsSearchTool",
  "findimage": "PexelsSearchTool",
  "pexels": "PexelsSearchTool",
  // New aliases
  "imgsearch": "PexelsSearchTool",
  "imagesearch": "PexelsSearchTool",
  "getimage": "PexelsSearchTool",
  "searchimage": "PexelsSearchTool",
  "picturesearch": "PexelsSearchTool",
  "findpicture": "PexelsSearchTool",
  "photosearch": "PexelsSearchTool",
  "pexelssearch": "PexelsSearchTool",
  "fetchimage": "PexelsSearchTool",

  // RecipeSearchTool Aliases
  "recipe": "RecipeSearchTool",
  "findrecipe": "RecipeSearchTool",
  "cook": "RecipeSearchTool",
  // New aliases
  "recipes": "RecipeSearchTool",
  "foodsearch": "RecipeSearchTool",
  "cooking": "RecipeSearchTool",
  "mealplan": "RecipeSearchTool",
  "getrecipe": "RecipeSearchTool",
  "searchrecipe": "RecipeSearchTool",
  "findmeal": "RecipeSearchTool",
  "whattocook": "RecipeSearchTool",
  "fetchrecipe": "RecipeSearchTool",

  // DateTimeTool Aliases
  "datetime": "DateTimeTool",
  "currenttime": "DateTimeTool",
  "time": "DateTimeTool",
  // New aliases
  "datetimeinfo": "DateTimeTool",
  "date": "DateTimeTool",
  "getdate": "DateTimeTool",
  "gettime": "DateTimeTool",
  "whattimeisit": "DateTimeTool",
  "todaydate": "DateTimeTool",
  "currentdatetime": "DateTimeTool",
  "now": "DateTimeTool",

  // HackerNewsTool Aliases
  "hackernews": "HackerNewsTool",
  // "HackerNewsTool": "HackerNewsTool", // Canonical name, not needed as alias if resolveToolName handles it
  "hn": "HackerNewsTool",
  // New aliases
  "hnnews": "HackerNewsTool",
  "ycombinatornews": "HackerNewsTool",
  "technews_hn": "HackerNewsTool", // to distinguish from general tech news
  "hnsearch": "HackerNewsTool",
  "gethackernews": "HackerNewsTool",
  "hacker_news": "HackerNewsTool",

  // RedditTool Aliases
  "reddit": "RedditTool",
  "redditsearch": "RedditTool",
  // New aliases
  "redditposts": "RedditTool",
  "searchreddit": "RedditTool",
  "findonreddit": "RedditTool",
  "getreddit": "RedditTool",
  "askreddit": "RedditTool", // Common subreddit, might be used as a general search term



  // SportsInfoTool Aliases
  "sports": "SportsInfoTool",
  "sportinfo": "SportsInfoTool",
  "gameresult": "SportsInfoTool",
  "nextgame": "SportsInfoTool",
  // New aliases
  "sport": "SportsInfoTool",
  "sportssearch": "SportsInfoTool",
  "sportsscores": "SportsInfoTool",
  "matchresults": "SportsInfoTool",
  "livescores": "SportsInfoTool",
  "getsportsinfo": "SportsInfoTool",
  "sportsupdates": "SportsInfoTool",
  "score": "SportsInfoTool",

  // EventFinderTool Aliases
  "eventfinder": "EventFinderTool",
  "findevent": "EventFinderTool",
  "ticketmaster": "EventFinderTool", // Could be specific, but often used generally
  // New aliases
  "events": "EventFinderTool",
  "eventsearch": "EventFinderTool",
  "findevents": "EventFinderTool",
  "upcomingevents": "EventFinderTool",
  "concerts": "EventFinderTool",
  "shows": "EventFinderTool",
  "localevents": "EventFinderTool",
  "find_event": "EventFinderTool", // Underscore version

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

// --- Creation Hub Tool Aliases (for Creation Hub interface only) ---
/**
 * Aliases for Creation Hub tools that are NOT available in main chat.
 * These tools can only be accessed through the Creation Hub interface.
 */
export const creationHubToolAliases: { [key: string]: string } = {
  // LeadRedditTool Aliases
  "leadreddit": "LeadRedditTool",
  "redditleadgen": "LeadRedditTool",
  "findleadsonreddit": "LeadRedditTool",
  "redditprospects": "LeadRedditTool",
  "airedditLeads": "LeadRedditTool",
  "smartredditleads": "LeadRedditTool",
  "redditleadanalysis": "LeadRedditTool",
  "redditoutreachleads": "LeadRedditTool",
  "redditaiprospecting": "LeadRedditTool",
  "redditbusinessleads": "LeadRedditTool",

  // LeadHackerNewsTool Aliases
  "leadhackernews": "LeadHackerNewsTool",
  "hnleads": "LeadHackerNewsTool",
  "hackernewsleads": "LeadHackerNewsTool",
  "hnprospects": "LeadHackerNewsTool",
  "techleads": "LeadHackerNewsTool",
  "startupprospects": "LeadHackerNewsTool",
  "aihnleads": "LeadHackerNewsTool",
  "hackernewsprospecting": "LeadHackerNewsTool",
  "hnleadgen": "LeadHackerNewsTool",
  "techprospecting": "LeadHackerNewsTool",
  
  // RedditLeadGeneratorTool Aliases (moved from main aliases)
  "redditleads": "RedditLeadGeneratorTool",
  "findleads": "RedditLeadGeneratorTool",
  "leadgen": "RedditLeadGeneratorTool",
  "leadgeneration": "RedditLeadGeneratorTool",
  "redditprospecting": "RedditLeadGeneratorTool",
  "prospecting": "RedditLeadGeneratorTool",
  "redditoutreach": "RedditLeadGeneratorTool",
  "socialmedialeads": "RedditLeadGeneratorTool",
  "generateleads": "RedditLeadGeneratorTool",
  "scanlead": "RedditLeadGeneratorTool",
};

// --- Creation Hub Tool Resolution ---
/**
 * Resolves Creation Hub tool names and aliases to actual tool instances.
 * This function is separate from resolveToolName to ensure Creation Hub tools
 * are only accessible through the Creation Hub interface.
 */
export function resolveCreationHubTool(toolName: string): BaseTool | null {
  if (!toolName || typeof toolName !== "string") {
    return null;
  }

  const normalize = (name: string) => name.toLowerCase().replace(/[\s_-]+/g, '');
  const normalizedToolName = normalize(toolName);

  // Check direct tool name match first
  for (const key in creationHubTools) {
    if (normalize(key) === normalizedToolName) {
      const tool = creationHubTools[key];
      if (tool.enabled !== false) {
        return tool;
      }
    }
  }

  // Check aliases
  const canonicalName = creationHubToolAliases[normalizedToolName];
  if (canonicalName && creationHubTools[canonicalName]) {
    const tool = creationHubTools[canonicalName];
    if (tool.enabled !== false) {
      return tool;
    }
  }

  return null;
}

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