// FILE: lib/tools/index.ts
import { BaseTool } from "./base-tool";
import { logger } from "../../memory-framework/config";

// --- Import Tool Implementations ---
import { WebSearchTool } from "./WebSearchTool";
import { YouTubeSearchTool } from "./YouTubeSearchTool";
import { PexelsSearchTool } from "./PexelsSearchTool";
import { RecipeSearchTool } from "./RecipeSearchTool";
import { DateTimeTool } from "./DateTimeTool";
import { HackerNewsTool } from "./HackerNewsTool";
import { RedditTool } from "./RedditTool";
import { SportsInfoTool } from "./SportsInfoTool";
import { EventFinderTool } from "./EventFinderTool";
import { GoogleCalendarReaderTool } from "./GoogleCalendarReaderTool";
import { GoogleGmailReaderTool } from "./GoogleGmailReaderTool";
import { NewsAggregatorTool } from "./NewsAggregatorTool";
import { ReminderReaderTool } from "./ReminderReaderTool";

// --- Tool Registry ---
// La clé DOIT correspondre à la propriété 'name' de l'outil.
export const tools: { [key: string]: BaseTool } = {
  WebSearchTool: new WebSearchTool(),
  YouTubeSearchTool: new YouTubeSearchTool(),
  PexelsSearchTool: new PexelsSearchTool(),
  RecipeSearchTool: new RecipeSearchTool(),
  NewsAggregatorTool: new NewsAggregatorTool(),
  DateTimeTool: new DateTimeTool(),
  HackerNewsTool: new HackerNewsTool(),
  RedditTool: new RedditTool(),
  SportsInfoTool: new SportsInfoTool(),
  EventFinderTool: new EventFinderTool(),
  GoogleCalendarReaderTool: new GoogleCalendarReaderTool(),
  GoogleGmailReaderTool: new GoogleGmailReaderTool(),
  ReminderReaderTool: new ReminderReaderTool(),
};

// --- Server Startup Verification ---
if (typeof window === "undefined") {
  const staticToolNames = Object.keys(tools);
  logger.info(
    `[Tools Registry] Initialized ${
      staticToolNames.length
    } static tools: ${staticToolNames.join(", ")}`
  );
  let mismatchFound = false;
  for (const key in tools) {
    if (tools[key].name !== key) {
      logger.error(
        `[Tools Registry] CRITICAL MISMATCH! Tool object name "${tools[key].name}" != registry key "${key}".`
      );
      mismatchFound = true;
    }
  }
  if (mismatchFound) {
    logger.error(
      `[Tools Registry] Tool registry key mismatch detected. Check tool names and registry keys in lib/tools/index.ts.`
    );
  } else {
    logger.info(
      "[Tools Registry] All static tool names verified against registry keys."
    );
  }
  logger.info(
    "[Tools Registry] Note: MemoryTool & InternalTaskTool added dynamically by Orchestrator."
  );
}