//livingdossier/services/tools-livings/YouTubeSearchTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { CachedVideoList, CachedYouTubeVideo } from "../../../lib/types/index";
import { generateStructuredJson } from "../providers/llm_clients";

interface YouTubeSearchInput extends ToolInput {
  query: string;
  category?: string | null;
  description_keywords?: string | null;
  limit?: number | null;
  lang?: string | null;
  context?: {
    previous_query?: string;
    previous_video_title?: string;
    // Don't define userState here as it's already part of ToolInput context
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
          previous_video_title: { type: "string" },
          userState: {
            type: "object",
            properties: {
              workflow_preferences: { type: "array" },
            },
            required: [],
            additionalProperties: false
          }
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
    this.API_KEY = appConfig.toolApiKeys?.youtube || "";
    this.USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app?.url || 'https://minato.ai'}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;
    if (!this.API_KEY) this.log("error", "YouTube API Key (YOUTUBE_API_KEY) is missing. Tool will fail.");
    if (this.USER_AGENT.includes("support@example.com")) {
      this.log("warn", "Update YouTubeSearchTool USER_AGENT contact info with actual details.");
    }
  }

  private async extractYouTubeParameters(userInput: string): Promise<Partial<YouTubeSearchInput>> {
    // Enhanced extraction prompt for YouTube
    const extractionPrompt = `
You are an expert parameter extractor for Minato's YouTubeSearchTool which searches for videos on YouTube.

Given this user query about YouTube videos: "${userInput.replace(/\"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. VIDEO QUERY IDENTIFICATION:
   - Extract the core topic, keywords, or content the user is looking for
   - Focus on what type of video content they want to see (e.g., "how to make pasta", "drone footage", "latest SpaceX launch")
   - For complex requests, identify the main subject
   - If query references a previous video like "show me more like that", extract that context

2. CATEGORY SPECIFICATION:
   - Identify the general category or topic area (e.g., "music", "gaming", "education", "comedy", "science")
   - Use broad, standard YouTube categories
   - Leave empty if no clear category is evident

3. DESCRIPTION KEYWORDS EXTRACTION:
   - Identify specific keywords that should appear in video descriptions
   - Format as comma-separated terms for filtering
   - Focus on qualifying terms beyond the main query (e.g., "tutorial", "official", "4K", "2023")

4. RESULT LIMIT DETERMINATION:
   - Identify how many videos the user wants (1-5)
   - Map expressions like "a couple" to 2, "a few" to 3, etc.
   - Default to 3 if unspecified

5. CONTEXT ANALYSIS:
   - If query references previous videos or searches (e.g., "more like that", "similar videos")
   - Set appropriate context values if they can be inferred

OUTPUT FORMAT: JSON object with these fields:
- "query": (string) The core video search terms
- "category": (string|null) General video category or null if unspecified
- "description_keywords": (string|null) Comma-separated keywords for filtering or null if unspecified
- "limit": (number|null) Number of videos (1-5) or null if unspecified
- "context": (object|null) Contains previous_query and/or previous_video_title if applicable

If a parameter cannot be confidently extracted, set it to null rather than guessing.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      // Define the schema for YouTubeSearchInput
      const youtubeParamsSchema = {
        type: "object",
        properties: {
          query: { type: "string" },
          category: { type: ["string", "null"] },
          description_keywords: { type: ["string", "null"] },
          limit: { type: ["number", "null"] },
          context: {
            type: ["object", "null"],
            properties: {
              previous_query: { type: ["string", "null"] },
              previous_video_title: { type: ["string", "null"] },
              userState: {
                type: ["object", "null"],
                properties: {
                  workflow_preferences: { type: ["array", "null"] }
                }
              }
            }
          }
        }
      };

      const extractionResult = await generateStructuredJson<Partial<YouTubeSearchInput>>(
        extractionPrompt,
        userInput,
        youtubeParamsSchema
      );

      return extractionResult || {};
    } catch (error) {
      logger.error("[YouTubeSearchTool] Parameter extraction failed:", error);
      return {};
    }
  }

  private buildYouTubeEmbedUrl(videoId: string): string {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0`;
  }
  private buildYouTubeWatchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  async execute(input: YouTubeSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = `[YouTubeSearchTool]`;

    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      const extractedParams = await this.extractYouTubeParameters(input._rawUserInput);

      // Only use extracted parameters if they're not already specified
      if (extractedParams.query && input.query === undefined) {
        input.query = extractedParams.query;
      }
      if (extractedParams.category && input.category === undefined) {
        input.category = extractedParams.category;
      }
      if (extractedParams.limit && input.limit === undefined) {
        input.limit = extractedParams.limit;
      }
      if (extractedParams.description_keywords && input.description_keywords === undefined) {
        input.description_keywords = extractedParams.description_keywords;
      }
    }

    // Apply user preferences using the standard API context
    if (input._context?.userState?.workflow_preferences) {
      const prefs = input._context.userState.workflow_preferences;

      // If user has preferred YouTube channels, we can prioritize them in the query
      if (prefs.youtubePreferredChannels &&
        prefs.youtubePreferredChannels.length > 0 &&
        !input.query.toLowerCase().includes('channel:')) {
        // Add channel name to the query if there's only one preferred channel
        if (prefs.youtubePreferredChannels.length === 1) {
          const channel = prefs.youtubePreferredChannels[0];
          input.query = `${input.query} channel:"${channel}"`;
          logger.debug(`${logPrefix} Applied user's preferred YouTube channel: ${channel}`);
        }
      }

      // Apply preferred YouTube categories if user hasn't specified a category
      if (prefs.youtubePreferredCategories &&
        prefs.youtubePreferredCategories.length > 0 &&
        !input.category) {
        // Use the first preferred category as default
        input.category = prefs.youtubePreferredCategories[0] as any;
        logger.debug(`${logPrefix} Applied user's preferred YouTube category: ${input.category}`);
      }

      // Apply video length preference to the query if specified
      if (prefs.youtubeVideoLengthPreference && prefs.youtubeVideoLengthPreference !== "any") {
        if (prefs.youtubeVideoLengthPreference === "short") {
          input.query = `${input.query} short`;
          logger.debug(`${logPrefix} Applied video length preference: short videos`);
        } else if (prefs.youtubeVideoLengthPreference === "medium") {
          input.query = `${input.query} 4-20 minutes`;
          logger.debug(`${logPrefix} Applied video length preference: medium length videos`);
        } else if (prefs.youtubeVideoLengthPreference === "long") {
          input.query = `${input.query} long video tutorial`;
          logger.debug(`${logPrefix} Applied video length preference: long videos`);
        }
      }

      // Apply additional category-based query refinements
      if (input.category) {
        switch (input.category) {
          case "education":
            input.query = `${input.query} tutorial educational learn`;
            break;
          case "music":
            input.query = `${input.query} official music video song`;
            break;
          case "gaming":
            input.query = `${input.query} gameplay gaming review`;
            break;
          case "technology":
            input.query = `${input.query} tech review technology`;
            break;
          case "entertainment":
            input.query = `${input.query} entertainment funny viral`;
            break;
          case "news":
            input.query = `${input.query} news update latest`;
            break;
          case "sports":
            input.query = `${input.query} sports highlights game`;
            break;
          case "travel":
            input.query = `${input.query} travel vlog destination`;
            break;
        }
        logger.debug(`${logPrefix} Applied category-based query refinement for: ${input.category}`);
      }
    }

    const userNameForResponse = input._context?.userName || "friend";
    const queryString = input.query || "";
    const effectiveLimit = Math.min(Math.max(1, input.limit || 5), 10);

    if (!queryString.trim()) {
      const errorMsg = "Empty search query.";
      logger.error(`${logPrefix} ${errorMsg}`);
      return {
        error: errorMsg,
        result: `Minato needs a search term to find YouTube videos for ${userNameForResponse}.`,
        structuredData: {
          result_type: "video_list",
          source_api: "youtube",
          query: { ...input, limit: effectiveLimit },
          videos: [],
          error: "Empty search query."
        }
      };
    }

    let langCode = "en";
    if (input.context && typeof input.context === 'object') {
      if ('locale' in input.context && typeof (input.context as any).locale === 'string') {
        langCode = (input.context as any).locale.split("-")[0];
      } else if (input.lang && typeof input.lang === 'string') {
        langCode = input.lang.split("-")[0];
      }
    } else if (input.lang && typeof input.lang === 'string') {
      langCode = input.lang.split("-")[0];
    }
    const queryInputForStructuredData = { ...input, limit: effectiveLimit };
    if (abortSignal?.aborted) { return { error: "YouTube search cancelled.", result: "Cancelled." }; }
    if (!this.API_KEY) { return { error: "YouTube Tool is not configured.", result: `Sorry, ${userNameForResponse}, Minato cannot search YouTube right now.` }; }

    const params = new URLSearchParams({
      key: this.API_KEY, part: "snippet", q: queryString.trim(), type: "video",
      maxResults: String(effectiveLimit),
      relevanceLanguage: langCode,
    });
    const url = `${this.API_BASE}?${params.toString()}`;
    this.log(`info`, `${logPrefix} Searching YouTube (Lang: ${langCode}, Limit: ${params.get("maxResults")})... URL: ${url.split("&key=")[0]}...`);

    let outputData: CachedVideoList = {
      result_type: "video_list", source_api: "youtube", query: queryInputForStructuredData, videos: [], error: undefined,
    };

    try {
      // Create a timeout controller for node-fetch compatibility
      const timeoutController = new AbortController();
      const timeoutId = setTimeout(() => timeoutController.abort(), 8000);
      
      const response = await fetch(url, { 
        headers: { "User-Agent": this.USER_AGENT }, 
        signal: (abortSignal || timeoutController.signal) as any
      });
      
      clearTimeout(timeoutId);
      
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
      let effectiveQuery = queryString;
      if (
        (!queryString || queryString.trim().length < 4 || /^(show me more|more like that|another|again|similar|like last|like previous|find more|find another|next)$/i.test(queryString.trim())) &&
        input.context && (input.context.previous_video_title || input.context.previous_query)
      ) {
        // Use previous video title or query to refine
        effectiveQuery = input.context.previous_video_title || input.context.previous_query || queryString;
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
        if (effectiveQuery !== queryString) {
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