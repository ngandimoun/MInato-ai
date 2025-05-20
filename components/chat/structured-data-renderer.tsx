// components/chat/structured-data-renderer.tsx
"use client";

import { motion } from "framer-motion";
import { logger } from "@/memory-framework/config";
import type { 
  AnyToolStructuredData, 
  DateTimeStructuredOutput, 
  EventFinderStructuredOutput, 
  CachedImageList, 
  CachedSingleRecipe, 
  RedditStructuredOutput, 
  SportsStructuredOutput, 
  CachedVideoList, 
  MemoryToolResult, 
  ReminderResult, 
  NewsArticleList
} from "@/lib/types";
import { isStructuredData } from "@/lib/types";

// Import your new tool cards

import { DateTimeCard } from "../tool-cards/DateTimeCard";
import { EventFinderCard } from "../tool-cards/EventFinderCard";
import { PexelsCard } from "../tool-cards/PexelsCard";
import { RedditCard } from "../tool-cards/RedditCard";
import { SportsInfoCard } from "../tool-cards/SportsInfoCard";
import { YouTubeSearchCard } from "../tool-cards/YouTubeSearchCard";
import { MemoryToolCard } from "../tool-cards/MemoryToolCard";
import { ReminderReaderCard } from "../tool-cards/ReminderReaderCard";


import { WebSearchCard } from "../tool-cards/WebSearchCard"; // ADD THIS IMPORT
import { RecipeCard } from "../tool-cards/RecipeCard";
import { GenericToolCard } from "../tool-cards/GenericToolCard";

import { NewsAggregatorCard } from "../tool-cards/NewsAggregatorCard"; 




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
    case "product_list":
    case "web_snippet":
    case "answerBox":
    case "knowledgeGraph":
      contentToRender = <WebSearchCard data={parsedData as any} />;
      break;
    case "datetime_info":
      contentToRender = <DateTimeCard data={parsedData as DateTimeStructuredOutput} />;
      break;
    case "event_list":
      contentToRender = <EventFinderCard data={parsedData as EventFinderStructuredOutput} />;
      break;
    case "image_list":
      if (parsedData.source_api === "pexels_photo") {
        contentToRender = <PexelsCard data={parsedData as CachedImageList} />;
      } else {
        // Could add more specific image list cards here for other sources like Unsplash if re-enabled
        contentToRender = <GenericToolCard data={parsedData} />;
      }
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
    case "video_list":
      if (parsedData.source_api === "youtube") {
        contentToRender = <YouTubeSearchCard data={parsedData as CachedVideoList} />;
      } else {
        contentToRender = <GenericToolCard data={parsedData} />;
      }
      break;
    case "tiktok_video":
      contentToRender = <YouTubeSearchCard data={parsedData as CachedVideoList} />;
      break;
    case "internal_memory_result":
      contentToRender = <MemoryToolCard data={parsedData as MemoryToolResult} />;
      break;
    case "reminders":
      contentToRender = <ReminderReaderCard data={parsedData as ReminderResult} />;
      break;
      case "reminders":
      contentToRender = <NewsAggregatorCard data={parsedData as NewsArticleList} />;
      break;
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