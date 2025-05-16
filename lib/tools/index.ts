// FILE: lib/tools/index.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool } from "./base-tool";
import { logger } from "../../memory-framework/config";

// --- Import Tool Implementations ---
import { WebSearchTool } from "./WebSearchTool";
import { YouTubeSearchTool } from "./YouTubeSearchTool";
//import { UnsplashSearchTool } from "./UnsplashSearchTool";
import { PexelsSearchTool } from "./PexelsSearchTool";
import { WeatherTool } from "./WeatherTool";
import { PlaceSearchTool } from "./PlaceSearchTool";
import { WolframAlphaTool } from "./WolframAlphaTool";
import { RecipeSearchTool } from "./RecipeSearchTool";
import { DateTimeTool } from "./DateTimeTool";
import { PublicHolidayTool } from "./PublicHolidayTool";
import { GeolocationTool } from "./GeolocationTool";
import { SunriseSunsetTool } from "./SunriseSunsetTool";
import { MapLinkTool } from "./MapLinkTool";
import { HackerNewsTool } from "./HackerNewsTool";
import { RedditTool } from "./RedditTool";
import { SportsInfoTool } from "./SportsInfoTool";
import { EventFinderTool } from "./EventFinderTool";
import { MoodJournalTool } from "./MoodJournalTool";
import { HabitTrackerTool } from "./HabitTrackerTool";
import { WaterIntakeTool } from "./WaterIntakeTool";
import { GoogleCalendarReaderTool } from "./GoogleCalendarReaderTool";
import { GoogleGmailReaderTool } from "./GoogleGmailReaderTool";
import { NewsAggregatorTool } from "./NewsAggregatorTool";
import { ReminderReaderTool } from "./ReminderReaderTool";
// InternalTaskTool & MemoryTool are added dynamically by Orchestrator
import { CalculatorTool } from "./CalculatorTool";
import { DataParsingTool } from "./DataParsingTool";
import { DataProfilingTool } from "./DataProfilingTool";
import { DataAnalysisTool } from "./DataAnalysisTool";
import { VisualizationTool } from "./VisualizationTool";


// --- Tool Registry ---
// Key MUST match the tool's 'name' property.
export const tools: { [key: string]: BaseTool } = {
  WebSearchTool: new WebSearchTool(),
  YouTubeSearchTool: new YouTubeSearchTool(),
  //UnsplashSearchTool: new UnsplashSearchTool(),
  PexelsSearchTool: new PexelsSearchTool(),
  WeatherTool: new WeatherTool(),
  PlaceSearchTool: new PlaceSearchTool(),
  WolframAlphaTool: new WolframAlphaTool(),
  RecipeSearchTool: new RecipeSearchTool(),
  NewsAggregatorTool: new NewsAggregatorTool(),
  DateTimeTool: new DateTimeTool(),
  PublicHolidayTool: new PublicHolidayTool(),
  GeolocationTool: new GeolocationTool(),
  SunriseSunsetTool: new SunriseSunsetTool(),
  MapLinkTool: new MapLinkTool(),
  HackerNewsTool: new HackerNewsTool(),
  RedditTool: new RedditTool(),
  SportsInfoTool: new SportsInfoTool(),
  EventFinderTool: new EventFinderTool(),
  MoodJournalTool: new MoodJournalTool(),
  HabitTrackerTool: new HabitTrackerTool(),
  WaterIntakeTool: new WaterIntakeTool(),
  GoogleCalendarReaderTool: new GoogleCalendarReaderTool(),
  GoogleGmailReaderTool: new GoogleGmailReaderTool(),
  ReminderReaderTool: new ReminderReaderTool(),
  CalculatorTool: new CalculatorTool(),
  DataParsingTool: new DataParsingTool(),
  DataProfilingTool: new DataProfilingTool(),
  DataAnalysisTool: new DataAnalysisTool(),
  VisualizationTool: new VisualizationTool(),
  // Dynamic tools (MemoryTool, InternalTaskTool) are NOT listed here.
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