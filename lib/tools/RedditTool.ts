// FILE: lib/tools/RedditTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is correctly imported or use global fetch
import { RedditStructuredOutput, RedditPost } from "@/lib/types/index";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { formatDistanceToNowStrict, fromUnixTime } from 'date-fns'; // For better date formatting
import { generateStructuredJson } from "../providers/llm_clients";

interface RedditInput extends ToolInput {
  subreddit: string;
  filter?: "hot" | "new" | "top" | "rising" | "controversial" | null;
  time?: "hour" | "day" | "week" | "month" | "year" | "all" | null;
  limit?: number | null;
}

interface RedditApiPostData {
  id: string; name?: string; title: string; subreddit: string; author: string;
  score: number; num_comments: number; permalink: string; url: string;
  selftext?: string; selftext_html?: string; created_utc: number; is_self: boolean;
  stickied?: boolean; over_18?: boolean; thumbnail?: string;
  preview?: { images?: Array<{ source: { url: string; width: number; height: number }; resolutions?: Array<{ url: string; width: number; height: number }>; id: string; }>; enabled?: boolean; };
  time?: number; by?: string; descendants?: number; upvote_ratio?: number;
  subreddit_name_prefixed?: string; link_flair_text?: string | null;
  author_flair_text?: string | null; total_awards_received?: number; gilded?: number;
  domain?: string; media?: any; media_embed?: any; secure_media?: any; secure_media_embed?: any;
  crosspost_parent_list?: RedditApiPostData[]; type?: string; is_video?: boolean; // Add is_video if API provides it
  post_hint?: 'image' | 'link' | 'hosted:video' | 'rich:video' | 'self'; // Common hints
}
interface RedditListingChild { kind: "t3"; data: RedditApiPostData; }
interface RedditJsonResponse { kind: "Listing"; data: { after: string | null; dist: number; modhash: string; geo_filter: string | null; children: RedditListingChild[]; before: string | null; }; }

export class RedditTool extends BaseTool {
  name = "RedditTool";
  description =
    "Fetches recent or top posts from a specified public subreddit. Allows sorting by 'hot', 'new', 'top', or 'rising'.";
  argsSchema = {
    type: "object" as const,
    properties: {
      subreddit: { type: "string" as const, description: "The name of the subreddit to fetch posts from (e.g., 'learnprogramming', 'explainlikeimfive'). Do not include 'r/'. This is required." } as OpenAIToolParameterProperties,
      filter: { type: ["string", "null"] as const, enum: ["hot", "new", "top", "rising", "controversial", null], description: "How to sort the posts ('hot', 'new', 'top', 'rising', 'controversial'). If null or omitted, defaults to 'hot'.", } as OpenAIToolParameterProperties,
      time: { type: ["string", "null"] as const, enum: ["hour", "day", "week", "month", "year", "all", null], description: "Timeframe for the 'top' filter ('hour', 'day', 'week', 'month', 'year', 'all'). Only relevant if filter is 'top'. If null or omitted when filter is 'top', defaults to 'day'.", } as OpenAIToolParameterProperties,
      limit: { type: ["number", "null"] as const, description: "Maximum number of posts to return (must be between 1 and 25). If null or omitted, defaults to 5." } as OpenAIToolParameterProperties,
    },
    required: ["subreddit", "filter", "time", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 5;
  private readonly REDDIT_BASE_URL = "https://www.reddit.com";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (by /u/YourRedditUsername contact: ${appConfig.emailFromAddress || "support@example.com"})`;
  categories = [
    "community",
    "news",
    "search",
    "discussion",
    "trending",
    "memes",
    "social",
    "forums",
    "subreddits",
    "topics",
    "user-generated",
    "community-news"
  ];
  version = "1.0.0";
  metadata = { provider: "Reddit API", supports: [
    "hot",
    "new",
    "top",
    "rising",
    "controversial",
    "gilded",
    "random",
    "best",
    "search",
    "comments"
  ] };

  constructor() {
    super();
    if (typeof this.USER_AGENT === "string" && (this.USER_AGENT.includes("support@example.com") || this.USER_AGENT.includes("/u/YourRedditUsername"))) {
      this.log("warn", "Update RedditTool USER_AGENT with specific contact info/username for API compliance.");
    }
  }

  private mapApiPostToStructured(post: RedditApiPostData): RedditPost | null {
    if (!post?.id || !post.title) { logger.warn("[RedditTool Map] Skipping post due to missing id or title.", { postId: post?.id, postTitle: post?.title }); return null; }
    
    const postId = post.id;
    // Determine post type more explicitly
    // let postType: RedditPost['postType'] = 'link';
    // if (post.is_self) {
    //     postType = 'self';
    // } else if (post.is_video || post.post_hint === 'hosted:video' || post.post_hint === 'rich:video') {
    //     postType = 'video';
    // } else if (post.post_hint === 'image') {
    //     postType = 'image';
    // }

    const createdDate = post.created_utc ? fromUnixTime(post.created_utc) : (post.time ? fromUnixTime(post.time) : null);
    // const formattedDate = createdDate ? format(createdDate, "MMM d, yyyy") : null;
    // const relativeDate = createdDate ? formatDistanceToNowStrict(createdDate, { addSuffix: true }) : null;

    return {
      id: postId, title: post.title, subreddit: post.subreddit, author: post.author ?? post.by ?? null,
      score: post.score ?? null, numComments: post.num_comments ?? post.descendants ?? null,
      permalink: `${this.REDDIT_BASE_URL}${post.permalink}`, url: post.url || null, selfText: post.selftext || null,
      createdUtc: post.created_utc ?? post.time ?? null, 
      isSelf: post.is_self,
      // postType: postType, // supprimé car non supporté
      // formattedDate: formattedDate, // supprimé car non supporté
      // relativeDate: relativeDate, // supprimé car non supporté
      // Enhanced thumbnail logic: prefer preview if available, then regular thumbnail
      thumbnailUrl: post.preview?.images?.[0]?.resolutions?.[2]?.url ?? // Higher res preview
                    post.preview?.images?.[0]?.resolutions?.[1]?.url ?? // Medium res preview
                    post.preview?.images?.[0]?.source?.url ??           // Original preview source
                    (post.thumbnail && !["self", "default", "nsfw", "", "spoiler", "image", "hosted:video", "link", "richtext:lightbox"].includes(post.thumbnail) ? post.thumbnail : null),
      // Retain hnLink for consistency if used elsewhere, though it's a Reddit permalink
      hnLink: `${this.REDDIT_BASE_URL}${post.permalink}`,
    };
  }

  private async extractRedditParameters(userInput: string): Promise<RedditInput> {
    // Enhanced extraction prompt for Reddit
    const extractionPrompt = `
You are an expert parameter extractor for Minato's RedditTool which fetches posts from Reddit subreddits.

Given this user query about Reddit content: "${userInput.replace(/\"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. SUBREDDIT EXTRACTION:
   - Extract the subreddit name that the user wants to view (e.g., "AskReddit", "worldnews")
   - Remove "r/" prefix if present
   - Default to "all" only if no specific subreddit is mentioned

2. FILTER TYPE DETERMINATION:
   - Determine the filter type based on context: "hot", "new", "top", "rising", "controversial"
   - Look for explicit mentions like "top posts", "hot in r/pics", "new threads"
   - Default to "hot" if no specific filter is mentioned

3. TIME PERIOD EXTRACTION (for "top" and "controversial" filters):
   - Identify time period: "hour", "day", "week", "month", "year", "all"
   - Look for time indicators like "this week", "this month", "all time"
   - Only include if filter is "top" or "controversial"
   - Default to "day" for "top" filter and "all" for "controversial" if not specified

4. RESULT LIMIT DETERMINATION:
   - Extract the number of posts the user wants (1-25)
   - Map expressions like "a few" to 3, "several" to 5, etc.
   - Default to 5 if unspecified

OUTPUT FORMAT: JSON object with these fields:
- "subreddit": (string) Name of subreddit without "r/" prefix
- "filter": (string) One of: "hot", "new", "top", "rising", "controversial"
- "time": (string|null) Only for "top" or "controversial" filters: "hour", "day", "week", "month", "year", "all"
- "limit": (number) Number of posts (1-25)

RESPOND ONLY WITH THE JSON OBJECT.`;

    const defaultInput: RedditInput = {
      subreddit: "all",
      filter: "hot",
      time: null,
      limit: 5,
    };

    try {
      // Define the schema for RedditInput
      const redditParamsSchema = {
        type: "object",
        properties: {
          subreddit: { type: "string" },
          filter: { 
            type: "string", 
            enum: ["hot", "new", "top", "rising", "controversial"] 
          },
          time: { 
            type: ["string", "null"], 
            enum: ["hour", "day", "week", "month", "year", "all", null] 
          },
          limit: { type: "number", minimum: 1, maximum: 25 }
        },
        required: ["subreddit", "filter"]
      };

      const extractionResult = await generateStructuredJson<RedditInput>(
        extractionPrompt,
        userInput,
        redditParamsSchema,
        "RedditToolParameters",
        [], // no history context needed
        "gpt-4o-mini"
      );
      
      // Ensure we have a valid result with all required fields
      if (extractionResult && 'subreddit' in extractionResult && 'filter' in extractionResult) {
        const result: RedditInput = {
          ...defaultInput,
          ...extractionResult
        };
        
        // Apply time defaults based on filter if not specified
        if ((result.filter === "top" || result.filter === "controversial") && !result.time) {
          result.time = result.filter === "top" ? "day" : "all";
        }
        
        // Ensure limit is between 1-25
        if (!result.limit || result.limit < 1) {
          result.limit = defaultInput.limit;
        } else if (result.limit > 25) {
          result.limit = 25;
        }
        
        return result;
      }
      
      return defaultInput;
    } catch (error) {
      logger.error("[RedditTool] Parameter extraction failed:", error);
      return defaultInput;
    }
  }

  async execute(input: RedditInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = "[RedditTool]";
    
    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      try {
        const extractedParams = await this.extractRedditParameters(input._rawUserInput);
        
        // Only use extracted parameters if they're not already specified
        if (extractedParams.subreddit && !input.subreddit) {
          input.subreddit = extractedParams.subreddit;
        }
        if (extractedParams.filter && !input.filter) {
          input.filter = extractedParams.filter;
        }
        if (extractedParams.time && !input.time) {
          input.time = extractedParams.time;
        }
        if (extractedParams.limit && !input.limit) {
          input.limit = extractedParams.limit;
        }
      } catch (error) {
        logger.error(`${logPrefix} Error extracting parameters:`, error);
        // Continue with default values if extraction fails
      }
    }
    
    // Apply user preferences if available
    if (input.context?.userState?.workflow_preferences) {
      const prefs = input.context.userState.workflow_preferences;
      
      // If user didn't specify a subreddit and has preferred subreddits, use the first one
      if (prefs.redditPreferredSubreddits && 
          prefs.redditPreferredSubreddits.length > 0 && 
          (!input.subreddit || input.subreddit === "all")) {
        input.subreddit = prefs.redditPreferredSubreddits[0];
        logger.debug(`${logPrefix} Applied user's preferred subreddit: ${input.subreddit}`);
      }
    }

    let subreddit = (input.subreddit || "all").replace(/^r\//i, "");
    const filter = input.filter || "hot";
    const time = (filter === "top" || filter === "controversial") ? (input.time || (filter === "top" ? "day" : "all")) : undefined;
    const limit = Math.min(Math.max(1, input.limit || 5), 25);
    
    const safeSubredditString = String(subreddit || "").trim(); 
    const userNameForResponse = input.context?.userName || "friend";
    const queryInputForStructuredData = { ...input, filter: filter, limit: limit, time: time, subreddit: safeSubredditString }; 

    if (abortSignal?.aborted) { return { error: "Reddit fetch cancelled.", result: "Cancelled." }; }

    if (!safeSubredditString) { 
        const errorMsg = "Please specify a valid subreddit name.";
        logger.warn(`${logPrefix} ${errorMsg}`);
        return { 
            error: errorMsg, 
            result: `Which subreddit should Minato check, ${userNameForResponse}?`, 
            structuredData: { result_type: "reddit_posts", source_api: "reddit", query: queryInputForStructuredData, subreddit: "", filter: filter, count:0, posts:[], error: "Subreddit name required" } 
        }; 
    }

    if (!/^[a-zA-Z0-9_]{3,21}$/.test(subreddit)) { 
        const errorMsg = `Invalid subreddit name format: "${subreddit}".`;
        logger.warn(`${logPrefix} ${errorMsg}`);
        return { 
            error: errorMsg, 
            result: `"${subreddit}" doesn't look like a valid subreddit name for Minato.`, 
            structuredData: { result_type: "reddit_posts", source_api: "reddit", query: queryInputForStructuredData, subreddit: subreddit, filter: filter, count:0, posts:[], error: `Invalid subreddit: ${subreddit}` } 
        }; 
    }

    let url = `${this.REDDIT_BASE_URL}/r/${subreddit}/${filter}.json?limit=${limit}&raw_json=1`;
    if (time && filter === "top" && ["hour", "day", "week", "month", "year", "all"].includes(time)) {
        url += `&t=${time}`;
    }

    this.log("info", `${logPrefix} Fetching ${limit} posts... URL: ${url.split(".json?")[0]}.json?...`);
    let outputStructuredData: RedditStructuredOutput = {
      result_type: "reddit_posts", source_api: "reddit", query: queryInputForStructuredData,
      subreddit: subreddit, filter: filter, time: time, count: 0, posts: [], error: null,
    };

    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(7000) });
      if (abortSignal?.aborted) { outputStructuredData.error = "Request timed out or cancelled."; return { error: "Reddit fetch cancelled.", result: "Cancelled.", structuredData: outputStructuredData }; }
      if (!response.ok) { throw new Error(`Reddit API request failed: ${response.status} ${String(response.statusText || "Unknown Status")}.`); }
      const data: RedditJsonResponse = await response.json() as RedditJsonResponse;
      if (data?.kind !== "Listing" || !data?.data?.children) { throw new Error("Unexpected response format from Reddit API."); }

      const apiPosts = data.data.children.filter(child => child.kind === "t3" && child.data && !child.data.stickied).map(child => child.data);
      if (apiPosts.length === 0) {
        const timeSuffix = time ? ` for the past ${time}` : "";
        const msg = `Minato didn't find any non-stickied posts in r/${subreddit} for ${userNameForResponse} with filter '${filter}'${timeSuffix}. Try a different filter?`;
        this.log("info", `${logPrefix} ${msg}`);
        return { result: msg, structuredData: outputStructuredData };
      }

      outputStructuredData.posts = apiPosts.map(post => this.mapApiPostToStructured(post)).filter((p): p is RedditPost => p !== null);
      outputStructuredData.count = outputStructuredData.posts.length;
      outputStructuredData.error = null;

      if (outputStructuredData.count === 0) {
        const msg = `Minato found posts for r/${subreddit} (${filter}) for ${userNameForResponse}, but none were suitable after filtering.`;
        this.log("info", `${logPrefix} ${msg}`);
        return { result: msg, structuredData: outputStructuredData };
      }

      this.log("info", `${logPrefix} Fetched ${outputStructuredData.count} valid posts.`);
      const firstPost = outputStructuredData.posts[0];
      let resultString = `Okay ${userNameForResponse}, I found some interesting posts on r/${subreddit}! For example, there's one titled "${firstPost.title.substring(0, 70)}..." by u/${firstPost.author || 'someone'}`;
      if (firstPost.score !== null) resultString += ` with ${firstPost.score} upvotes.`;
      if (outputStructuredData.count > 1) {
          resultString += ` There are ${outputStructuredData.count - 1} more. I can show you the list!`;
      } else {
          resultString += " What do you think?";
      }
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const originalErrorMessage = String(error?.message || (typeof error === 'string' ? error : "Unknown Reddit API error"));
      const errorMsg = `Failed Reddit fetch r/${subreddit}: ${originalErrorMessage}`;
      outputStructuredData.error = errorMsg;
      if (error.name === 'AbortError' || abortSignal?.aborted) { outputStructuredData.error = "Request timed out or cancelled."; return { error: "Reddit fetch timed out.", result: `Sorry, ${userNameForResponse}, the request to Reddit took too long.`, structuredData: outputStructuredData }; }
      this.log("error", `${logPrefix} Error:`, error);
      const userMessage = originalErrorMessage.includes("not found") || originalErrorMessage.includes("Access denied") ? `It seems r/${subreddit} might not exist or is private.` : "There was an issue getting posts from that subreddit.";
      return { error: errorMsg, result: `Sorry, ${userNameForResponse}, Minato couldn't get posts from r/${subreddit}. ${userMessage}`, structuredData: outputStructuredData };
    }
  }
}