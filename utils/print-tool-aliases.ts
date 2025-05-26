import { resolveToolName } from "../lib/tools/index";

// Extract the alias map from resolveToolName (by inspecting its code)
// We'll reconstruct the alias map here for clarity (keep in sync with lib/tools/index.ts)
const toolNameMap: { [key: string]: string } = {
  // WebSearchTool Aliases
  "search": "WebSearchTool",
  "websearch": "WebSearchTool",
  "googlesearch": "WebSearchTool",
  "find": "WebSearchTool",

  // NewsAggregatorTool Aliases
  "news": "NewsAggregatorTool",
  "newstool": "NewsAggregatorTool",
  "NewsTool": "NewsAggregatorTool",
  "latestnews": "NewsAggregatorTool",
  "headlines": "NewsAggregatorTool",

  // YouTubeSearchTool Aliases
  "youtube": "YouTubeSearchTool",
  "youtubesearch": "YouTubeSearchTool",
  "findvideo": "YouTubeSearchTool",

  // PexelsSearchTool Aliases
  "image": "PexelsSearchTool",
  "findimage": "PexelsSearchTool",
  "pexels": "PexelsSearchTool",

  // RecipeSearchTool Aliases
  "recipe": "RecipeSearchTool",
  "findrecipe": "RecipeSearchTool",
  "cook": "RecipeSearchTool",

  // DateTimeTool Aliases
  "datetime": "DateTimeTool",
  "currenttime": "DateTimeTool",
  "time": "DateTimeTool",

  // HackerNewsTool Aliases
  "hackernews": "HackerNewsTool",
  "HackerNewsTool": "HackerNewsTool",
  "hn": "HackerNewsTool",

  // RedditTool Aliases
  "reddit": "RedditTool",
  "redditsearch": "RedditTool",

  // SportsInfoTool Aliases
  "sports": "SportsInfoTool",
  "sportinfo": "SportsInfoTool",
  "gameresult": "SportsInfoTool",
  "nextgame": "SportsInfoTool",

  // EventFinderTool Aliases
  "eventfinder": "EventFinderTool",
  "findevent": "EventFinderTool",
  "ticketmaster": "EventFinderTool",

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