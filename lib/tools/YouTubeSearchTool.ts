// FILE: lib/tools/YouTubeSearchTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedVideoList, CachedYouTubeVideo } from "@/lib/types/index";
interface YouTubeSearchInput extends ToolInput {
  query: string;
  limit?: number | null;
  category?: string;
  description_keywords?: string;
  context?: {
    previous_query?: string;
    previous_video_title?: string;
  };
}
interface YouTubeThumbnail { url: string; width?: number; height?: number; }
interface YouTubeThumbnails { default?: YouTubeThumbnail; medium?: YouTubeThumbnail; high?: YouTubeThumbnail; }
interface YouTubeResourceId { kind: string; videoId?: string; channelId?: string; playlistId?: string; }
interface YouTubeSnippet { publishedAt: string; channelId: string; title: string; description: string; thumbnails: YouTubeThumbnails; channelTitle: string; liveBroadcastContent: string; publishTime?: string; }
interface YouTubeSearchItem { kind: string; etag: string; id: YouTubeResourceId; snippet: YouTubeSnippet; }
interface YouTubeSearchResponse { kind: string; etag: string; nextPageToken?: string; regionCode?: string; pageInfo: { totalResults: number; resultsPerPage: number }; items: YouTubeSearchItem[]; error?: { code: number; message: string; errors: any[] }; }
export class YouTubeSearchTool extends BaseTool {
  name = "YouTubeSearchTool";
  description = "Searches YouTube for videos based on keywords or a description. Returns a list of videos with titles, thumbnails, and links.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "Keywords or phrase to search YouTube videos for." } as OpenAIToolParameterProperties,
      limit: {
        type: ["number", "null"] as const,
        description: "Maximum number of videos to return (1-5). Defaults to 3 if null or not provided.",
      } as OpenAIToolParameterProperties,
      category: { type: "string", description: "Intended video category (music, sports, education, etc)" },
      description_keywords: { type: "string", description: "Comma-separated keywords for video description" },
      context: {
        type: "object",
        properties: {
          previous_query: { type: "string" },
          previous_video_title: { type: "string" }
        },
        required: [],
        additionalProperties: false
      }
    },
    required: ["query", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 3600; // Cache YouTube results for 1 hour
  private readonly API_KEY: string;
  private readonly API_BASE = "https://www.googleapis.com/youtube/v3/search";
  private readonly USER_AGENT: string;
  categories = ["search", "video", "media"];
  version = "1.0.0";
  metadata = { provider: "YouTube Data API", maxResults: 5 };
  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.youtube || "";
    this.USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;
    if (!this.API_KEY) this.log("error", "YouTube API Key (YOUTUBE_API_KEY) is missing. Tool will fail.");
    if (this.USER_AGENT.includes("support@example.com")) {
      this.log("warn", "Update YouTubeSearchTool USER_AGENT contact info with actual details.");
    }
  }
  private buildYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0`;
  }
  private buildYouTubeWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  async execute(input: YouTubeSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { query } = input;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 3 : Math.max(1, Math.min(input.limit, 5));
    let userNameForResponse = "friend";
    let langCode = "en";
    if (input.context && typeof input.context === 'object') {
      if ('userName' in input.context && typeof (input.context as any).userName === 'string') {
        userNameForResponse = (input.context as any).userName;
      }
      if ('locale' in input.context && typeof (input.context as any).locale === 'string') {
        langCode = (input.context as any).locale.split("-")[0];
      } else if (input.lang && typeof input.lang === 'string') {
        langCode = input.lang.split("-")[0];
      }
    } else if (input.lang && typeof input.lang === 'string') {
      langCode = input.lang.split("-")[0];
    }
    const logPrefix = `[YouTubeTool] Query: "${query.substring(0, 30)}..."`;
    if (input.category || input.description_keywords || input.context) {
      this.log("info", `${logPrefix} Extra fields: category=${input.category}, description_keywords=${input.description_keywords}, context=${JSON.stringify(input.context)}`);
    }
    const queryInputForStructuredData = { ...input, limit: effectiveLimit };
    if (abortSignal?.aborted) { return { error: "YouTube search cancelled.", result: "Cancelled." }; }
    if (!this.API_KEY) { return { error: "YouTube Tool is not configured.", result: `Sorry, ${userNameForResponse}, Minato cannot search YouTube right now.` }; }
    if (!query?.trim()) { return { error: "Missing search query.", result: `What video should Minato look for on YouTube, ${userNameForResponse}?`, structuredData: { result_type: "video_list", source_api: "youtube", query: queryInputForStructuredData, videos: [], error: "Missing search query." } }; }

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

      // --- BEGIN: Post-fetch filtering/ranking and conversational follow-up logic ---
      let filteredVideos = videos;
      // 1. Conversational follow-up: If query is vague and context is present, refine query
      let effectiveQuery = query;
      if (
        (!query || query.trim().length < 4 || /^(show me more|more like that|another|again|similar|like last|like previous|find more|find another|next)$/i.test(query.trim())) &&
        input.context && (input.context.previous_video_title || input.context.previous_query)
      ) {
        // Use previous video title or query to refine
        effectiveQuery = input.context.previous_video_title || input.context.previous_query || query;
        this.log("info", `${logPrefix} Using conversational context for vague query. Refined query: ${effectiveQuery}`);
      }
      // 2. Post-fetch filtering/ranking using description_keywords and category
      let keywords: string[] = [];
      if (input.description_keywords) {
        keywords = input.description_keywords
          .split(",")
          .map(k => k.trim().toLowerCase())
          .filter(Boolean);
      }
      // If keywords are present, re-rank videos by keyword match in title/description
      if (keywords.length > 0) {
        filteredVideos = filteredVideos
          .map(item => {
            const title = item.snippet.title.toLowerCase();
            const desc = (item.snippet.description || "").toLowerCase();
            const keywordMatches = keywords.filter(k => title.includes(k) || desc.includes(k)).length;
            return { item, keywordMatches };
          })
          .sort((a, b) => b.keywordMatches - a.keywordMatches)
          .map(obj => obj.item);
      }
      // Optionally, if category is present, deprioritize videos that don't match category in title/desc
      if (input.category && input.category.trim() && input.category !== "general") {
        const cat = input.category.trim().toLowerCase();
        filteredVideos = filteredVideos.sort((a, b) => {
          const aText = (a.snippet.title + " " + (a.snippet.description || "")).toLowerCase();
          const bText = (b.snippet.title + " " + (b.snippet.description || "")).toLowerCase();
          const aCat = aText.includes(cat) ? 1 : 0;
          const bCat = bText.includes(cat) ? 1 : 0;
          return bCat - aCat;
        });
      }
      // Limit to effectiveLimit
      const limitedVideos = filteredVideos.slice(0, effectiveLimit);
      // --- END: Filtering/ranking and follow-up logic ---

      if (limitedVideos.length === 0) {
        this.log("info", `${logPrefix} No videos found after filtering.`);
        return { result: `Minato couldn't find any YouTube videos matching "${effectiveQuery}" for ${userNameForResponse}.`, structuredData: outputData };
      }

      this.log("info", `${logPrefix} Found ${limitedVideos.length} videos after filtering/ranking.`);
      const structuredResults: CachedYouTubeVideo[] = limitedVideos.map(item => ({
        videoId: item.id.videoId!, title: item.snippet.title, description: item.snippet.description || null,
        channelTitle: item.snippet.channelTitle || null, publishedAt: item.snippet.publishedAt || item.snippet.publishTime || null,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || null,
        videoUrl: this.buildYouTubeWatchUrl(item.id.videoId!),
        embedUrl: this.buildYouTubeEmbedUrl(item.id.videoId!),
      }));

      let textResult = "";
      if (structuredResults.length > 0) {
        const firstVideo = structuredResults[0];
        // If context was used for follow-up, mention it
        if (effectiveQuery !== query) {
          textResult = `Based on your previous video, I found "${firstVideo.title}" for you, ${userNameForResponse}. Want to watch it?`;
        } else {
          textResult = `Hey ${userNameForResponse}, I found a great video called "${firstVideo.title}" about "${effectiveQuery}"! It looks interesting. Would you like to watch it together right here?`;
        }
        if (structuredResults.length > 1) {
          textResult += ` I also found ${structuredResults.length - 1} other video(s) if this one isn't quite right.`;
        }
      } else {
        textResult = `Minato searched YouTube for "${effectiveQuery}" for ${userNameForResponse} but didn't find specific videos to highlight.`;
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