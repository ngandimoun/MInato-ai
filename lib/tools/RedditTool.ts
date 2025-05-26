// FILE: lib/tools/RedditTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is correctly imported or use global fetch
import { RedditStructuredOutput, RedditPost } from "@/lib/types/index";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { formatDistanceToNowStrict, fromUnixTime } from 'date-fns'; // For better date formatting

interface RedditInput extends ToolInput {
  subreddit: string;
  filter?: "hot" | "new" | "top" | "rising" | null;
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
      filter: { type: ["string", "null"] as const, enum: ["hot", "new", "top", "rising", null], description: "How to sort the posts ('hot', 'new', 'top', 'rising'). If null or omitted, defaults to 'hot'.", } as OpenAIToolParameterProperties,
      time: { type: ["string", "null"] as const, enum: ["hour", "day", "week", "month", "year", "all", null], description: "Timeframe for the 'top' filter ('hour', 'day', 'week', 'month', 'year', 'all'). Only relevant if filter is 'top'. If null or omitted when filter is 'top', defaults to 'day'.", } as OpenAIToolParameterProperties,
      limit: { type: ["number", "null"] as const, description: "Maximum number of posts to return (must be between 1 and 10). If null or omitted, defaults to 5." } as OpenAIToolParameterProperties,
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

  async execute(input: RedditInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const subredditInput = String(input.subreddit || "").trim(); 
    const effectiveFilter = (input.filter === null || input.filter === undefined) ? "hot" : input.filter;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 5 : Math.max(1, Math.min(input.limit, 10));
    const effectiveTime = (input.time === null || input.time === undefined) ? (effectiveFilter === "top" ? "day" : undefined) : input.time;
    const safeSubredditString = String(subredditInput || "").trim(); 
    const userNameForResponse = input.context?.userName || "friend";
    const logPrefix = `[RedditTool r/${safeSubredditString.substring(0,15)} Filter:${effectiveFilter}${effectiveTime ? ` Time:${effectiveTime}` : ""}]`;
    const queryInputForStructuredData = { ...input, filter: effectiveFilter, limit: effectiveLimit, time: effectiveTime, subreddit: safeSubredditString }; 

    if (abortSignal?.aborted) { return { error: "Reddit fetch cancelled.", result: "Cancelled." }; }

    if (!safeSubredditString) { 
        const errorMsg = "Please specify a valid subreddit name.";
        logger.warn(`${logPrefix} ${errorMsg}`);
        return { 
            error: errorMsg, 
            result: `Which subreddit should Minato check, ${userNameForResponse}?`, 
            structuredData: { result_type: "reddit_posts", source_api: "reddit", query: queryInputForStructuredData, subreddit: "", filter: effectiveFilter, count:0, posts:[], error: "Subreddit name required" } 
        }; 
    }

    const subreddit = safeSubredditString.replace(/^(r\/)/i, ""); 
    if (!/^[a-zA-Z0-9_]{3,21}$/.test(subreddit)) { 
        const errorMsg = `Invalid subreddit name format: "${subreddit}".`;
        logger.warn(`${logPrefix} ${errorMsg}`);
        return { 
            error: errorMsg, 
            result: `"${subreddit}" doesn't look like a valid subreddit name for Minato.`, 
            structuredData: { result_type: "reddit_posts", source_api: "reddit", query: queryInputForStructuredData, subreddit: subreddit, filter: effectiveFilter, count:0, posts:[], error: `Invalid subreddit: ${subreddit}` } 
        }; 
    }

    let url = `${this.REDDIT_BASE_URL}/r/${subreddit}/${effectiveFilter}.json?limit=${effectiveLimit}&raw_json=1`;
    if (effectiveTime && effectiveFilter === "top" && ["hour", "day", "week", "month", "year", "all"].includes(effectiveTime)) {
        url += `&t=${effectiveTime}`;
    }

    this.log("info", `${logPrefix} Fetching ${effectiveLimit} posts... URL: ${url.split(".json?")[0]}.json?...`);
    let outputStructuredData: RedditStructuredOutput = {
      result_type: "reddit_posts", source_api: "reddit", query: queryInputForStructuredData,
      subreddit: subreddit, filter: effectiveFilter, time: effectiveTime, count: 0, posts: [], error: null,
    };

    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(7000) });
      if (abortSignal?.aborted) { outputStructuredData.error = "Request timed out or cancelled."; return { error: "Reddit fetch cancelled.", result: "Cancelled.", structuredData: outputStructuredData }; }
      if (!response.ok) { throw new Error(`Reddit API request failed: ${response.status} ${String(response.statusText || "Unknown Status")}.`); }
      const data: RedditJsonResponse = await response.json() as RedditJsonResponse;
      if (data?.kind !== "Listing" || !data?.data?.children) { throw new Error("Unexpected response format from Reddit API."); }

      const apiPosts = data.data.children.filter(child => child.kind === "t3" && child.data && !child.data.stickied).map(child => child.data);
      if (apiPosts.length === 0) {
        const timeSuffix = effectiveTime ? ` for the past ${effectiveTime}` : "";
        const msg = `Minato didn't find any non-stickied posts in r/${subreddit} for ${userNameForResponse} with filter '${effectiveFilter}'${timeSuffix}. Try a different filter?`;
        this.log("info", `${logPrefix} ${msg}`);
        return { result: msg, structuredData: outputStructuredData };
      }

      outputStructuredData.posts = apiPosts.map(post => this.mapApiPostToStructured(post)).filter((p): p is RedditPost => p !== null);
      outputStructuredData.count = outputStructuredData.posts.length;
      outputStructuredData.error = null;

      if (outputStructuredData.count === 0) {
        const msg = `Minato found posts for r/${subreddit} (${effectiveFilter}) for ${userNameForResponse}, but none were suitable after filtering.`;
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