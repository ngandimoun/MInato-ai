// FILE: lib/tools/index.ts
import { BaseTool } from "./base-tool";
import { logger } from "../../memory-framework/config";

// --- Import Tool Implementations ---
import { WebSearchTool } from "./WebSearchTool";
import { YouTubeSearchTool } from "./YouTubeSearchTool";
import { PexelsSearchTool } from "./PexelsSearchTool";
import { WeatherTool } from "./WeatherTool"; // Assurez-vous que ce fichier existe et exporte WeatherTool
import { PlaceSearchTool } from "./PlaceSearchTool";
import { RecipeSearchTool } from "./RecipeSearchTool";
import { DateTimeTool } from "./DateTimeTool";
import { PublicHolidayTool } from "./PublicHolidayTool";
import { GeolocationTool } from "./GeolocationTool";
import { SunriseSunsetTool } from "./SunriseSunsetTool";
import { MapLinkTool } from "./MapLinkTool";
import { HackerNewsTool } from "./HackerNewsTool";
import { RedditTool } from "./RedditTool";
import { SportsInfoTool } from "./SportsInfoTool";
import { EventFinderTool } from "./EventFinderTool"; // Renommé de TicketmasterEventFinderTool pour correspondre au nom de classe
import { MoodJournalTool } from "./MoodJournalTool";
import { HabitTrackerTool } from "./HabitTrackerTool";
import { WaterIntakeTool } from "./WaterIntakeTool";
import { GoogleCalendarReaderTool } from "./GoogleCalendarReaderTool";
import { GoogleGmailReaderTool } from "./GoogleGmailReaderTool";
import { NewsAggregatorTool } from "./NewsAggregatorTool";
import { ReminderReaderTool } from "./ReminderReaderTool";
import { CalculatorTool } from "./CalculatorTool";
import { DataParsingTool } from "./DataParsingTool";
import { DataProfilingTool } from "./DataProfilingTool";
import { DataAnalysisTool } from "./DataAnalysisTool";
import { VisualizationTool } from "./VisualizationTool";
// MemoryTool et InternalTaskTool sont ajoutés dynamiquement par l'Orchestrator

// --- Tool Registry ---
// La clé DOIT correspondre à la propriété 'name' de l'outil.
export const tools: { [key: string]: BaseTool } = {
  WebSearchTool: new WebSearchTool(),
  YouTubeSearchTool: new YouTubeSearchTool(),
  PexelsSearchTool: new PexelsSearchTool(),
  WeatherTool: new WeatherTool(), // CORRIGÉ : Doit instancier WeatherTool
  PlaceSearchTool: new PlaceSearchTool(),
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
  EventFinderTool: new EventFinderTool(), // Utiliser le nom de classe réel
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