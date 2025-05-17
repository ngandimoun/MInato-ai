// FILE: lib/tools/RedditTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { RedditStructuredOutput, RedditPost } from "@/lib/types/index";
import { appConfig } from "../config";
import { logger } from "@/memory-framework/config";

interface RedditInput extends ToolInput {
  subreddit: string; // Required
  filter?: "hot" | "new" | "top" | "rising" | null;
  time?: "hour" | "day" | "week" | "month" | "year" | "all" | null;
  limit?: number | null;
}

interface RedditApiPostData { id: string; name?: string; title: string; subreddit: string; author: string; score: number; num_comments: number; permalink: string; url: string; selftext?: string; selftext_html?: string; created_utc: number; is_self: boolean; stickied?: boolean; over_18?: boolean; thumbnail?: string; preview?: { images?: Array<{ source: { url: string; width: number; height: number }; resolutions?: Array<{ url: string; width: number; height: number }>; id: string; }>; enabled?: boolean; }; time?: number; by?: string; descendants?: number; upvote_ratio?: number; subreddit_name_prefixed?: string; link_flair_text?: string | null; author_flair_text?: string | null; total_awards_received?: number; gilded?: number; domain?: string; media?: any; media_embed?: any; secure_media?: any; secure_media_embed?: any; crosspost_parent_list?: RedditApiPostData[]; type?: string; }
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
      filter: { type: ["string", "null"] as const, enum: ["hot", "new", "top", "rising", null], description: "How to sort the posts ('hot', 'new', 'top', 'rising'). If null or omitted, defaults to 'hot'.", } as OpenAIToolParameterProperties, // Removed default
      time: { type: ["string", "null"] as const, enum: ["hour", "day", "week", "month", "year", "all", null], description: "Timeframe for the 'top' filter ('hour', 'day', 'week', 'month', 'year', 'all'). Only relevant if filter is 'top'. If null or omitted when filter is 'top', defaults to 'day'.", } as OpenAIToolParameterProperties, // Removed default
      limit: { type: ["number", "null"] as const, description: "Maximum number of posts to return (must be between 1 and 10). If null or omitted, defaults to 5." } as OpenAIToolParameterProperties, // Removed min/max/default
    },
    required: ["subreddit", "filter", "time", "limit"], // All defined properties are required
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 5; // Cache Reddit for 5 mins

  private readonly REDDIT_BASE_URL = "https://www.reddit.com";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (by /u/YourRedditUsername contact: ${appConfig.emailFromAddress || "support@example.com"})`;

  constructor() {
    super();
    if (this.USER_AGENT.includes("support@example.com") || this.USER_AGENT.includes("/u/YourRedditUsername")) {
      this.log("warn", "Update RedditTool USER_AGENT with specific contact info/username for API compliance.");
    }
  }

  private mapApiPostToStructured(post: RedditApiPostData): RedditPost | null {
    if (!post?.id || !post.title) { logger.warn("[RedditTool Map] Skipping post due to missing id or title.", { postId: post?.id, postTitle: post?.title }); return null; }
    const postId = post.id;
    const type = post.type || (post.is_self ? "self" : "link");
    return {
      id: postId, title: post.title, subreddit: post.subreddit, author: post.author ?? post.by ?? null,
      score: post.score ?? null, numComments: post.num_comments ?? post.descendants ?? null,
      permalink: `${this.REDDIT_BASE_URL}${post.permalink}`, url: post.url || null, selfText: post.selftext || null,
      createdUtc: post.created_utc ?? post.time ?? null, isSelf: post.is_self,
      hnLink: post.permalink, // This seems like a misnomer, should be redditLink or similar
      thumbnailUrl: post.preview?.images?.[0]?.resolutions?.[2]?.url ?? post.preview?.images?.[0]?.resolutions?.[1]?.url ?? post.preview?.images?.[0]?.source?.url ?? (post.thumbnail && !["self", "default", "nsfw", "", "spoiler", "image", "hosted:video", "link", "richtext:lightbox"].includes(post.thumbnail) ? post.thumbnail : null),
    };
  }


  async execute(input: RedditInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { subreddit: subredditInput } = input; // subredditInput is required
    // Defaulting logic
    const effectiveFilter = (input.filter === null || input.filter === undefined) ? "hot" : input.filter;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 5 : Math.max(1, Math.min(input.limit, 10));
    const effectiveTime = (input.time === null || input.time === undefined) ? (effectiveFilter === "top" ? "day" : undefined) : input.time;


    const queryInputForStructuredData = { ...input, filter: effectiveFilter, limit: effectiveLimit, time: effectiveTime };

    if (abortSignal?.aborted) { return { error: "Reddit fetch cancelled.", result: "Cancelled." }; }
    if (!subredditInput?.trim()) { return { error: "Please specify a valid subreddit name.", result: "Which subreddit should Minato check?", structuredData: {result_type: "reddit_posts", source_api: "reddit", query: queryInputForStructuredData, subreddit: "", filter: effectiveFilter, count:0, posts:[], error: "Subreddit name required"} }; }

    const subreddit = subredditInput.replace(/^(r\/)/i, "").trim();
    const logPrefix = `[RedditTool r/${subreddit} Filter:${effectiveFilter}${effectiveTime ? ` Time:${effectiveTime}` : ""}]`;

    if (!/^[a-zA-Z0-9_]{3,21}$/.test(subreddit)) { return { error: `Invalid subreddit name format: "${subreddit}".`, result: `"${subreddit}" doesn't look like a valid subreddit name for Minato.`, structuredData: {result_type: "reddit_posts", source_api: "reddit", query: queryInputForStructuredData, subreddit: subreddit, filter: effectiveFilter, count:0, posts:[], error: `Invalid subreddit: ${subreddit}`} }; }

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
      if (!response.ok) { throw new Error(`Reddit API request failed: ${response.status} ${response.statusText}.`); }
      const data: RedditJsonResponse = await response.json() as RedditJsonResponse;
      if (data?.kind !== "Listing" || !data?.data?.children) { throw new Error("Unexpected response format from Reddit API."); }

      const apiPosts = data.data.children.filter(child => child.kind === "t3" && child.data && !child.data.stickied).map(child => child.data);
      if (apiPosts.length === 0) {
        const timeSuffix = effectiveTime ? ` for the past ${effectiveTime}` : "";
        const msg = `No non-stickied posts found in r/${subreddit} for ${input.context?.userName || "User"} matching filter '${effectiveFilter}'${timeSuffix}.`;
        this.log("info", `${logPrefix} ${msg}`);
        return { result: msg, structuredData: outputStructuredData };
      }

      outputStructuredData.posts = apiPosts.map(post => this.mapApiPostToStructured(post)).filter((p): p is RedditPost => p !== null);
      outputStructuredData.count = outputStructuredData.posts.length;
      outputStructuredData.error = null;

      if (outputStructuredData.count === 0) {
        const msg = `Found posts for r/${subreddit} (${effectiveFilter}) for ${input.context?.userName || "User"}, but none were suitable after filtering.`;
        this.log("info", `${logPrefix} ${msg}`);
        return { result: msg, structuredData: outputStructuredData };
      }

      this.log("info", `${logPrefix} Fetched ${outputStructuredData.count} valid posts.`);
      const resultString = `Top ${outputStructuredData.count} posts for ${input.context?.userName || "User"} from r/${subreddit} (${effectiveFilter}${effectiveTime ? `/${effectiveTime}` : ""}):\n` +
        outputStructuredData.posts.map((p: RedditPost, i: number) => {
          const points = p.score !== null ? ` (${p.score} pts)` : "";
          const comments = p.numComments !== null ? ` | ${p.numComments} comments` : "";
          const title = p.title.substring(0,70) + (p.title.length > 70 ? "..." : "");
          return `${i + 1}. ${title}${points}${comments} [Discussion: ${p.permalink}]`;
        }).join("\n");
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Failed Reddit fetch r/${subreddit}: ${error.message}`;
      outputStructuredData.error = errorMsg;
      if (error.name === 'AbortError' || abortSignal?.aborted) { outputStructuredData.error = "Request timed out or cancelled."; return { error: "Reddit fetch timed out.", result: `Sorry, ${input.context?.userName || "User"}, the request to Reddit took too long.`, structuredData: outputStructuredData }; }
      this.log("error", `${logPrefix} Error:`, error);
      const userMessage = error.message.includes("not found") || error.message.includes("Access denied") ? error.message : "Failed getting posts from that subreddit.";
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't get posts from r/${subreddit}. ${userMessage}`, structuredData: outputStructuredData };
    }
  }
}