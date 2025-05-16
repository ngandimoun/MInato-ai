// components/chat/structured-data-renderer.tsx
"use client";
import { motion } from "framer-motion";
import { logger } from "@/memory-framework/config";
import { AnyToolStructuredData, isStructuredData, CachedWeather, CachedSingleWeather, DataProfileOutput, DataParsedOutput, AnalysisTableResult, AnalysisChartResult, AnalysisSummaryResult, DateTimeStructuredOutput, EventFinderStructuredOutput, GeolocationStructuredOutput, MoodJournalStructuredOutput, NewsArticleList, CachedImageList, CachedSinglePlace, PublicHolidayStructuredOutput, CachedSingleRecipe, RedditStructuredOutput, SportsStructuredOutput, SunriseSunsetStructuredOutput, WaterIntakeStructuredOutput, CachedVideoList, MemoryToolResult, InternalTaskResult, ReminderResult } from "@/lib/types";

// Import your new tool cards
import { WeatherCard } from "../tool-cards/WeatherCard";
import { GenericToolCard } from "../tool-cards/GenericToolCard";
import { DataAnalysisCard } from "../tool-cards/DataAnalysisCard";
import { DataParsingCard } from "../tool-cards/DataParsingCard";
import { DataProfilingCard } from "../tool-cards/DataProfilingCard";
import { DateTimeCard } from "../tool-cards/DateTimeCard";
import { EventFinderCard } from "../tool-cards/EventFinderCard";
import { GeolocationCard } from "../tool-cards/GeolocationCard";
import { MoodJournalCard } from "../tool-cards/MoodJournalCard";
import { NewsAggregatorCard } from "../tool-cards/NewsAggregatorCard";
import { PexelsCard } from "../tool-cards/PexelsCard"; // Assuming Pexels images use 'image_list'
import { PlaceSearchCard } from "../tool-cards/PlaceSearchCard";
import { PublicHolidayCard } from "../tool-cards/PublicHolidayCard";
import { RecipeCard } from "../tool-cards/RecipeCard";
import { RedditCard } from "../tool-cards/RedditCard";
import { SportsInfoCard } from "../tool-cards/SportsInfoCard";
import { SunriseSunsetCard } from "../tool-cards/SunriseSunsetCard";
import { WaterIntakeCard } from "../tool-cards/WaterIntakeCard";
import { YouTubeSearchCard } from "../tool-cards/YouTubeSearchCard";
import { MemoryToolCard } from "../tool-cards/MemoryToolCard";
import { InternalTaskCard } from "../tool-cards/InternalTaskCard";
import { ReminderReaderCard } from "../tool-cards/ReminderReaderCard";
// Note: WolframAlphaCard is intentionally omitted as per your request.

interface StructuredDataRendererProps {
  data: string | AnyToolStructuredData | null | undefined;
}

export function StructuredDataRenderer({ data }: StructuredDataRendererProps) {
  let parsedData: AnyToolStructuredData | null = null;

  if (typeof data === 'string') {
    try {
      const tempParsed = JSON.parse(data);
      if (isStructuredData(tempParsed)) {
        parsedData = tempParsed;
      } else {
        logger.warn("[StructDataRender] String input did not match expected structured data format:", data.substring(0, 100));
        // Display as plain text if it doesn't seem like an error but also not our specific structure
        return <div className="text-sm prose dark:prose-invert max-w-none break-words whitespace-pre-wrap">{data}</div>;
      }
    } catch (error) {
      logger.error("[StructDataRender] Error parsing structured data string:", error, data.substring(0, 100));
      return <div className="text-sm text-destructive">Error displaying structured data (JSON parse failed).</div>;
    }
  } else if (data && isStructuredData(data)) {
    parsedData = data;
  }

  if (!parsedData) {
    // logger.debug("[StructDataRender] No valid parsed data to render.");
    return null;
  }

  let contentToRender;
  switch (parsedData.result_type) {
    case "weather":
      // Ensure the 'weather' property exists and is of type CachedWeather
      const weatherData = (parsedData as CachedSingleWeather).weather;
      if (weatherData) {
        contentToRender = <WeatherCard data={weatherData} />;
      } else {
        contentToRender = <GenericToolCard data={parsedData} />; // Fallback if weather data is missing
      }
      break;
    case "analysis_table":
    case "analysis_chart":
    case "analysis_summary":
      if (parsedData.analysis) { // Assuming 'analysis' holds the core AnalysisResultData
        contentToRender = <DataAnalysisCard data={parsedData as any} analysisResult={parsedData.analysis as any} />;
      } else {
        contentToRender = <GenericToolCard data={parsedData} />;
      }
      break;
    case "parsed_data_internal":
      contentToRender = <DataParsingCard data={parsedData as DataParsedOutput} />;
      break;
    case "data_profile_internal":
      contentToRender = <DataProfilingCard data={parsedData as DataProfileOutput} />;
      break;
    case "datetime_info":
      contentToRender = <DateTimeCard data={parsedData as DateTimeStructuredOutput} />;
      break;
    case "event_list":
      contentToRender = <EventFinderCard data={parsedData as EventFinderStructuredOutput} />;
      break;
    case "geolocation":
      contentToRender = <GeolocationCard data={parsedData as GeolocationStructuredOutput} />;
      break;
    case "mood_journal_log":
      contentToRender = <MoodJournalCard data={parsedData as MoodJournalStructuredOutput} />;
      break;
    case "news_articles":
      contentToRender = <NewsAggregatorCard data={parsedData as NewsArticleList} />;
      break;
    case "image_list":
      if (parsedData.source_api === "pexels_photo") {
        contentToRender = <PexelsCard data={parsedData as CachedImageList} />;
      } else {
        // Could add more specific image list cards here for other sources like Unsplash if re-enabled
        contentToRender = <GenericToolCard data={parsedData} />;
      }
      break;
    case "place":
      contentToRender = <PlaceSearchCard data={parsedData as CachedSinglePlace} />;
      break;
    case "holiday":
      contentToRender = <PublicHolidayCard data={parsedData as PublicHolidayStructuredOutput} />;
      break;
    case "recipe":
      contentToRender = <RecipeCard data={parsedData as CachedSingleRecipe} />;
      break;
    case "reddit_posts":
      contentToRender = <RedditCard data={parsedData as RedditStructuredOutput} />;
      break;
    case "sports_info":
      contentToRender = <SportsInfoCard data={parsedData as SportsStructuredOutput} />;
      break;
    case "sun_times":
      contentToRender = <SunriseSunsetCard data={parsedData as SunriseSunsetStructuredOutput} />;
      break;
    case "water_intake_result":
      contentToRender = <WaterIntakeCard data={parsedData as WaterIntakeStructuredOutput} />;
      break;
    case "video_list": // Generic video list, source_api can differentiate
      if (parsedData.source_api === "youtube") {
        contentToRender = <YouTubeSearchCard data={parsedData as CachedVideoList} />;
      } else {
        contentToRender = <GenericToolCard data={parsedData} />; // Fallback for other video list types
      }
      break;
    case "tiktok_video": // Specific handling if needed, or reuse YouTubeSearchCard if similar enough
      contentToRender = <YouTubeSearchCard data={parsedData as CachedVideoList} />; // Re-using for now
      break;
    case "internal_memory_result":
      contentToRender = <MemoryToolCard data={parsedData as MemoryToolResult} />;
      break;
    case "internal_tasks":
      contentToRender = <InternalTaskCard data={parsedData as InternalTaskResult} />;
      break;
    case "reminders":
      contentToRender = <ReminderReaderCard data={parsedData as ReminderResult} />;
      break;
    // case "calculation_or_fact": // WolframAlpha - Skipped as per user request
    //   contentToRender = <WolframAlphaCard data={parsedData as CachedSingleFact} />;
    //   break;
    case "permission_denied":
      contentToRender = (
        <div className="p-3 border rounded-md bg-destructive/10 text-destructive-foreground text-sm">
          <p className="font-medium">Access Denied</p>
          <p>{parsedData.message || "Minato does not have permission to access this resource."}</p>
          <p className="text-xs opacity-70">Source: {parsedData.source_api}</p>
        </div>
      );
      break;
    default:
      logger.warn(`[StructDataRender] No specific card for result_type: '${parsedData.result_type}'. Using GenericToolCard.`);
      contentToRender = <GenericToolCard data={parsedData} />;
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mt-2" // Add some margin for spacing from the message bubble
    >
      {contentToRender}
    </motion.div>
  );
}