// components/chat/structured-data-renderer.tsx
"use client";

import React, { useState } from 'react';
import { motion } from "framer-motion";
import { logger } from "@/memory-framework/config";
import type { 
  AnyToolStructuredData, 
  DateTimeStructuredOutput, 
  EventFinderStructuredOutput, 
  CachedImageList, 
  CachedSingleRecipe, 
  RedditStructuredOutput, 
  RedditLeadGeneratorOutput,
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
import { RedditLeadGeneratorCard } from "../tool-cards/RedditLeadGeneratorCard";
import { SportsInfoCard } from "../tool-cards/SportsInfoCard";
import { YouTubeSearchCard } from "../tool-cards/YouTubeSearchCard";
import { MemoryToolCard } from "../tool-cards/MemoryToolCard";
import { ReminderReaderCard } from "../tool-cards/ReminderReaderCard";
import { GoogleCalendarCard } from "../tool-cards/GoogleCalendarCard";
import { GoogleGmailCard } from "../tool-cards/GoogleGmailCard";

import { WebSearchCard } from "../tool-cards/WebSearchCard"; // ADD THIS IMPORT
import { RecipeCard } from "../tool-cards/RecipeCard";
import { GenericToolCard } from "../tool-cards/GenericToolCard";

import { NewsAggregatorCard } from "../tool-cards/NewsAggregatorCard"; 
import { HackerNewsCard } from "../tool-cards/HackerNewsCard";

import ReminderConfirmationCard from "../tool-cards/ReminderConfirmationCard";
import { TikTokCard } from '../tool-cards/TikTokCard';
import { StripePaymentLinkCard } from '../tool-cards/StripePaymentLinkCard';
import { StripeImageUploadHandler } from '../tool-handlers/StripeImageUploadHandler';

interface StructuredDataRendererProps {
  data: string | AnyToolStructuredData | null | undefined;
}

export function StructuredDataRenderer({ data }: StructuredDataRendererProps) {
  const [handlerResult, setHandlerResult] = useState<AnyToolStructuredData | null>(null);
  
  console.log("[StructuredDataRenderer] Incoming data prop:", data);
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

  console.log("[StructuredDataRenderer] parsedData:", parsedData);
  if (parsedData) {
    console.log("[StructuredDataRenderer] parsedData.result_type:", parsedData.result_type);
  }

  if (!parsedData) {
    // logger.debug("[StructDataRender] No valid parsed data to render.");
    return null;
  }

  // Handle UI actions for Stripe payment link tool
  if (parsedData.result_type === 'payment_link' && 
      parsedData.source_api === 'stripe' && 
      'ui_action' in parsedData) {
    
    // Disable all payment link UI processing in conversations
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mt-2"
      >
        <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950/20 text-sm">
          <p className="font-medium">Payment Link Creation</p>
          <p>Payment link creation during conversations is currently disabled. This feature will be available in a future Minato upgrade.</p>
          <p className="text-xs opacity-70 mt-1">You can still create payment links from the dashboard settings.</p>
        </div>
      </motion.div>
    );
  }

  // Check if this is a video list of TikTok videos - moved before general web search check
  const isTikTokVideoList = 
    parsedData && 
    typeof parsedData === 'object' && 
    'result_type' in parsedData && 
    parsedData.result_type === 'video_list' &&
    'source_api' in parsedData && 
    parsedData.source_api === 'serper_tiktok';

  // Check if this is a TikTok video result directly
  const isTikTokVideo = 
    parsedData &&
    typeof parsedData === 'object' &&
    'result_type' in parsedData &&
    ['product_list', 'web_snippet', 'answerBox', 'knowledgeGraph'].includes(parsedData.result_type as string) &&
    (!('source_api' in parsedData) || parsedData.source_api !== 'youtube') && // Exclude YouTube videos
    (!('source_api' in parsedData) || parsedData.source_api !== 'themealdb'); // Exclude recipe results

  if (isTikTokVideoList || isTikTokVideo) {
    return <TikTokCard data={parsedData as CachedVideoList} />;
  }

  let contentToRender;
  const normalizedResultType = parsedData.result_type?.trim().toLowerCase();
  console.log("[StructuredDataRenderer] normalizedResultType:", normalizedResultType);
  
  switch (normalizedResultType) {
    case "payment_link":
      if (parsedData.source_api === "stripe") {
        // Disable payment link UI in conversations
        contentToRender = (
          <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-950/20 text-sm">
            <p className="font-medium">Payment Link Creation</p>
            <p>Payment link creation during conversations is currently disabled. This feature will be available in a future Minato upgrade.</p>
            <p className="text-xs opacity-70 mt-1">You can still create payment links from the dashboard settings.</p>
          </div>
        );
      } else {
        contentToRender = <GenericToolCard data={parsedData} />;
      }
      break;
    
    // DateTime Tool
    case "datetime_info":
      contentToRender = <DateTimeCard data={parsedData as DateTimeStructuredOutput} />;
      break;
    
    // EventFinder Tool  
    case "event_list":
      contentToRender = <EventFinderCard data={parsedData as EventFinderStructuredOutput} />;
      break;
    
    // HackerNews Tool
    case "hn_stories":
      contentToRender = <HackerNewsCard data={parsedData as any} />;
      break;
    
    // Memory Tool
    case "internal_memory_result":
      contentToRender = <MemoryToolCard data={parsedData as MemoryToolResult} />;
      break;
    
    // NewsAggregator Tool  
    case "news_articles":
      contentToRender = <NewsAggregatorCard data={parsedData as NewsArticleList} />;
      break;
    
    // Pexels Tool
    case "image_list":
      if (parsedData.source_api === "pexels_photo") {
        contentToRender = <PexelsCard data={parsedData as CachedImageList} />;
      } else {
        contentToRender = <GenericToolCard data={parsedData} />;
      }
      break;
    
    // Recipe Tool
    case "recipe":
    case "recipe_detail":
      contentToRender = <RecipeCard data={parsedData as CachedSingleRecipe} />;
      break;
    
    // Reddit Tool
    case "reddit_posts":
      contentToRender = <RedditCard data={parsedData as RedditStructuredOutput} />;
      break;
    
    // Reddit Lead Generator Tool
    case "reddit_leads":
      contentToRender = <RedditLeadGeneratorCard data={parsedData as RedditLeadGeneratorOutput} />;
      break;
    
    // SportsInfo Tool
    case "sports_info":
      contentToRender = <SportsInfoCard data={parsedData as SportsStructuredOutput} />;
      break;
    
    // YouTube Tool
    case "video_list":
      if (parsedData.source_api === "youtube") {
        contentToRender = <YouTubeSearchCard data={parsedData as CachedVideoList} />;
      } else if (parsedData.source_api === "serper_tiktok") {
        contentToRender = <TikTokCard data={parsedData as CachedVideoList} />;
      } else {
        contentToRender = <GenericToolCard data={parsedData} />;
      }
      break;
    
    // TikTok directly
    case "tiktok_video":
      contentToRender = <TikTokCard data={parsedData as CachedVideoList} />;
      break;
    
    // ReminderReader Tool
    case "reminders":
      contentToRender = <ReminderReaderCard data={parsedData as ReminderResult} />;
      break;
    
    // Google Calendar Tool
    case "calendar_events":
      contentToRender = <GoogleCalendarCard data={parsedData as any} />;
      break;
    
    // Google Gmail Tool
    case "email_headers":
      contentToRender = <GoogleGmailCard data={parsedData as any} />;
      break;
    
    // WebSearch Tool - for general web search results
    case "product_list":
    case "web_snippet": 
    case "answerbox":
    case "knowledgegraph":
      contentToRender = <WebSearchCard data={parsedData as any} />;
      break;
    
    // Permission denied
    case "permission_denied":
      contentToRender = (
        <div className="p-3 border rounded-md bg-destructive/10 text-destructive-foreground text-sm">
          <p className="font-medium">Access Denied</p>
          <p>{('message' in parsedData && typeof parsedData.message === 'string') ? parsedData.message : "Minato does not have permission to access this resource."}</p>
          <p className="text-xs opacity-70">Source: {parsedData.source_api}</p>
        </div>
      );
      break;
    
    // Reminder confirmation
    case "reminder_set_confirmation":
      contentToRender = <ReminderConfirmationCard data={parsedData as any} />;
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
      className="mt-2 w-[330px] sm:w-[740px]" // Add some margin for spacing from the message bubble
    >
      {contentToRender}
    </motion.div>
  );
}