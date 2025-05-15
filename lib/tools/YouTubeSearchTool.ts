// FILE: lib/tools/YouTubeSearchTool.ts
// (Content from finalcodebase.txt - verified)
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
// Import specific types directly
import { CachedVideoList, CachedYouTubeVideo } from "@/lib/types/index";

interface YouTubeSearchInput extends ToolInput {
  query: string;
  limit?: number;
}

// Structures matching YouTube API response (internal)
interface YouTubeThumbnail {
  url: string;
  width?: number;
  height?: number;
}
interface YouTubeThumbnails {
  default?: YouTubeThumbnail;
  medium?: YouTubeThumbnail;
  high?: YouTubeThumbnail;
}
interface YouTubeResourceId {
  kind: string;
  videoId?: string;
  channelId?: string;
  playlistId?: string;
}
interface YouTubeSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  liveBroadcastContent: string;
  publishTime?: string;
}
interface YouTubeSearchItem {
  kind: string;
  etag: string;
  id: YouTubeResourceId;
  snippet: YouTubeSnippet;
}
interface YouTubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  regionCode?: string;
  pageInfo: { totalResults: number; resultsPerPage: number };
  items: YouTubeSearchItem[];
  error?: { code: number; message: string; errors: any[] };
}

export class YouTubeSearchTool extends BaseTool {
  name = "YouTubeSearchTool";
  description =
    "Searches YouTube for videos based on keywords or a description.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Keywords or phrase to search YouTube videos for.",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 5,
        description: "Maximum number of videos to return (1-5). Defaults to 3.",
        default: 3,
      },
    },
    required: ["query"],
  };
  cacheTTLSeconds = 3600; // Cache YouTube results for 1 hour

  private readonly API_KEY: string;
  private readonly API_BASE = "https://www.googleapis.com/youtube/v3/search";
  private readonly USER_AGENT = "MinatoAICompanion/1.0";

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.youtube || "";
    if (!this.API_KEY) {
      this.log(
        "error",
        "YouTube API Key (YOUTUBE_API_KEY) is missing. Tool will fail."
      );
    }
  }

  private buildYouTubeUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  async execute(
    input: YouTubeSearchInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { query, limit = 3, lang } = input;
    const logPrefix = `[YouTubeTool] Query:"${query.substring(0, 30)}..."`;

    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return {
        error: "YouTube search cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    if (!this.API_KEY) {
      return {
        error: "YouTube Tool is not configured.",
        result: "Sorry, I cannot search YouTube right now.",
        structuredData: undefined,
      };
    }
    if (!query?.trim()) {
      return {
        error: "Missing search query.",
        result: "What video should I look for on YouTube?",
        structuredData: undefined,
      };
    }

    const langCode = lang?.split("-")[0] || "en";
    const params = new URLSearchParams({
      key: this.API_KEY,
      part: "snippet",
      q: query.trim(),
      type: "video",
      maxResults: String(Math.max(1, Math.min(limit, 5))),
      relevanceLanguage: langCode,
    });
    const url = `${this.API_BASE}?${params.toString()}`;
    this.log(
      `info`,
      `${logPrefix} Searching YouTube (Lang: ${langCode}, Limit: ${params.get(
        "maxResults"
      )})... URL: ${url.split("&key=")[0]}...`
    );

    let outputData: CachedVideoList = {
      result_type: "video_list",
      source_api: "youtube",
      query: input,
      videos: [],
      error: undefined,
    };

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: abortSignal ?? AbortSignal.timeout(8000),
      });
      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after YouTube API call.`);
        outputData.error = "Request timed out or cancelled.";
        return {
          error: "YouTube search cancelled.",
          result: "Cancelled.",
          structuredData: outputData,
        };
      }
      const data: YouTubeSearchResponse =
        (await response.json()) as YouTubeSearchResponse;

      if (!response.ok || data.error) {
        const errorMsg =
          data.error?.message ||
          `YouTube API request failed: ${response.status} ${response.statusText}`;
        this.log("error", `${logPrefix} ${errorMsg}`);
        throw new Error(errorMsg);
      }
      const videos =
        data.items?.filter((item) => item.id?.videoId && item.snippet) || [];

      if (videos.length === 0) {
        this.log("info", `${logPrefix} No videos found.`);
        return {
          result: `I couldn't find any YouTube videos matching "${query}".`,
          structuredData: outputData,
        };
      }

      this.log("info", `${logPrefix} Found ${videos.length} videos.`);
      const structuredResults: CachedYouTubeVideo[] = videos.map((item) => ({
        videoId: item.id.videoId!,
        title: item.snippet.title,
        description: item.snippet.description || null,
        channelTitle: item.snippet.channelTitle || null,
        publishedAt:
          item.snippet.publishedAt || item.snippet.publishTime || null,
        thumbnailUrl:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url ||
          null,
        videoUrl: this.buildYouTubeUrl(item.id.videoId!),
      }));
      const textResult = `Okay, I found ${structuredResults.length} video(s) on YouTube related to "${query}".`;
      outputData.videos = structuredResults;
      outputData.error = undefined;
      return { result: textResult, structuredData: outputData };
    } catch (error: any) {
      const errorMsg = `YouTube search failed: ${error.message}`;
      outputData.error = errorMsg;
      if (error.name === "AbortError") {
        this.log("error", `${logPrefix} Request timed out or was aborted.`);
        outputData.error = "Request timed out.";
        return {
          error: "YouTube search timed out or cancelled.",
          result: "Sorry, the YouTube search took too long.",
          structuredData: outputData,
        };
      }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return {
        error: errorMsg,
        result: "Sorry, I encountered an error searching YouTube.",
        structuredData: outputData,
      };
    }
  }
}
