// FILE: lib/tools/YouTubeSearchTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedVideoList, CachedYouTubeVideo } from "@/lib/types/index";

interface YouTubeSearchInput extends ToolInput {
  query: string;
  limit?: number | null;
}

interface YouTubeThumbnail { url: string; width?: number; height?: number; }
interface YouTubeThumbnails { default?: YouTubeThumbnail; medium?: YouTubeThumbnail; high?: YouTubeThumbnail; }
interface YouTubeResourceId { kind: string; videoId?: string; channelId?: string; playlistId?: string; }
interface YouTubeSnippet { publishedAt: string; channelId: string; title: string; description: string; thumbnails: YouTubeThumbnails; channelTitle: string; liveBroadcastContent: string; publishTime?: string; }
interface YouTubeSearchItem { kind: string; etag: string; id: YouTubeResourceId; snippet: YouTubeSnippet; }
interface YouTubeSearchResponse { kind: string; etag: string; nextPageToken?: string; regionCode?: string; pageInfo: { totalResults: number; resultsPerPage: number }; items: YouTubeSearchItem[]; error?: { code: number; message: string; errors: any[] }; }

export class YouTubeSearchTool extends BaseTool {
  name = "YouTubeSearchTool";
  description = "Searches YouTube for videos based on keywords or a description.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "Keywords or phrase to search YouTube videos for." } as OpenAIToolParameterProperties,
      limit: {
        type: ["number", "null"] as const,
        description: "Maximum number of videos to return (1-5). Defaults to 3 if null or not provided.",
      } as OpenAIToolParameterProperties,
    },
    required: ["query", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600;

  private readonly API_KEY: string;
  private readonly API_BASE = "https://www.googleapis.com/youtube/v3/search";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.youtube || "";
    if (!this.API_KEY) this.log("error", "YouTube API Key (YOUTUBE_API_KEY) is missing. Tool will fail.");
    if (this.USER_AGENT.includes("support@example.com")) {
        this.log("warn", "Update YouTubeSearchTool USER_AGENT contact info with actual details.");
    }
  }

  private buildYouTubeUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  async execute(input: YouTubeSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { query } = input;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 3 : Math.max(1, Math.min(input.limit, 5));
    const userNameForResponse = input.context?.userName || "friend";
    const logPrefix = `[YouTubeTool] Query:"${query.substring(0,30)}..."`;
    const queryInputForStructuredData = { ...input, limit: effectiveLimit };

    if (abortSignal?.aborted) { return { error: "YouTube search cancelled.", result: "Cancelled." }; }
    if (!this.API_KEY) { return { error: "YouTube Tool is not configured.", result: `Sorry, ${userNameForResponse}, Minato cannot search YouTube right now.` }; }
    if (!query?.trim()) { return { error: "Missing search query.", result: `What video should Minato look for on YouTube, ${userNameForResponse}?`, structuredData: { result_type: "video_list", source_api:"youtube", query: queryInputForStructuredData, videos:[], error:"Missing search query."} }; }

    const langCode = input.context?.locale?.split("-")[0] || input.lang?.split("-")[0] || "en";
    const params = new URLSearchParams({
      key: this.API_KEY, part: "snippet", q: query.trim(), type: "video",
      maxResults: String(effectiveLimit),
      relevanceLanguage: langCode,
    });
    const url = `${this.API_BASE}?${params.toString()}`;
    this.log(`info`, `${logPrefix} Searching YouTube (Lang: ${langCode}, Limit: ${params.get("maxResults")})... URL: ${url.split("&key=")[0]}...`);

    let outputData: CachedVideoList = {
      result_type: "video_list", source_api: "youtube", query: queryInputForStructuredData, videos: [], error: undefined,
    };

    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(8000) });
      if (abortSignal?.aborted) { outputData.error = "Request timed out or cancelled."; return { error: "YouTube search cancelled.", result: "Cancelled.", structuredData: outputData }; }
      const data: YouTubeSearchResponse = await response.json() as YouTubeSearchResponse;

      if (!response.ok || data.error) {
        const errorMsg = data.error?.message || `YouTube API request failed: ${response.status} ${response.statusText}`;
        this.log("error", `${logPrefix} ${errorMsg}`); throw new Error(errorMsg);
      }
      const videos = data.items?.filter(item => item.id?.videoId && item.snippet) || [];

      if (videos.length === 0) {
        this.log("info", `${logPrefix} No videos found.`);
        return { result: `Minato couldn't find any YouTube videos matching "${query}" for ${userNameForResponse}.`, structuredData: outputData };
      }

      this.log("info", `${logPrefix} Found ${videos.length} videos.`);
      const structuredResults: CachedYouTubeVideo[] = videos.map(item => ({
        videoId: item.id.videoId!, title: item.snippet.title, description: item.snippet.description || null,
        channelTitle: item.snippet.channelTitle || null, publishedAt: item.snippet.publishedAt || item.snippet.publishTime || null,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null,
        videoUrl: this.buildYouTubeUrl(item.id.videoId!),
      }));
      
      const topVideos = structuredResults.slice(0, 2); // Show first 2 in conversational summary
      let textResult = `Okay, ${userNameForResponse}, Minato found ${structuredResults.length} video(s) on YouTube related to "${query}".`;
      if (topVideos.length > 0) {
          const videoSummaries = topVideos.map(v => `"${v.title}" by ${v.channelTitle || 'a creator'}`).join(topVideos.length > 1 ? ', and ' : '');
          textResult += ` Some top ones are: ${videoSummaries}. I can show you the full list!`;
      } else if (structuredResults.length > 0) {
          textResult += ` I can display them for you.`;
      } else { // Should be caught by videos.length === 0 earlier, but as a fallback
          textResult = `Minato searched YouTube for "${query}" for ${userNameForResponse} but didn't find specific videos to highlight.`;
      }
      
      outputData.videos = structuredResults; outputData.error = undefined;
      return { result: textResult, structuredData: outputData };
    } catch (error: any) {
      const errorMsg = `YouTube search failed: ${error.message}`;
      outputData.error = errorMsg;
      if (error.name === 'AbortError') { outputData.error = "Request timed out."; return { error: "YouTube search timed out.", result: `Sorry, ${userNameForResponse}, the YouTube search took too long.`, structuredData: outputData }; }
      this.log("error", `${logPrefix} Failed:`, error.message);
      return { error: errorMsg, result: `Sorry, ${userNameForResponse}, Minato encountered an error searching YouTube.`, structuredData: outputData };
    }
  }
}