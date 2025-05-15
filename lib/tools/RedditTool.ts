// FILE: lib/tools/RedditTool.ts
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is a dependency
import { RedditStructuredOutput, RedditPost } from "@/lib/types/index";
import { appConfig } from "../config"; // appConfig is the unified config
import { logger } from "@/memory-framework/config"; // Unified logger

interface RedditInput extends ToolInput {
  subreddit: string;
  filter?: "hot" | "new" | "top" | "rising";
  time?: "hour" | "day" | "week" | "month" | "year" | "all";
  limit?: number;
}

interface RedditApiPostData {
  // --- Fields from Reddit API ---
  // Common fields
  id: string; // Unique ID for the post (e.g., "t3_xxxxxx")
  name?: string; // Fullname, including prefix (e.g., t3_xxxxxx)
  title: string;
  subreddit: string; // Subreddit name (without r/)
  author: string; // Username of the author
  score: number; // Net score (upvotes - downvotes)
  num_comments: number; // Number of comments
  permalink: string; // Relative URL to the comments page (e.g., /r/subreddit/comments/id/title/)
  url: string; // URL the post links to (if not a self-post)
  selftext?: string; // The content of a self-post (text post), in Markdown
  selftext_html?: string; // HTML version of selftext
  created_utc: number; // Unix timestamp (seconds) of when the post was created
  is_self: boolean; // True if this is a self-post (text post)
  stickied: boolean; // True if the post is stickied
  over_18?: boolean; // True if NSFW
  thumbnail?: string; // URL to the thumbnail image. Can be "self", "default", "nsfw", "image", or an actual URL.
  preview?: {
    images?: Array<{
      source: { url: string; width: number; height: number };
      resolutions?: Array<{ url: string; width: number; height: number }>;
      id: string;
    }>;
    enabled?: boolean;
  };
  // Less common or alternative names for some fields
  time?: number; // Might be present in some older or different API endpoints for created_utc
  by?: string; // Alternative for author
  descendants?: number; // Alternative for num_comments (often used in comment listings)
  upvote_ratio?: number; // Ratio of upvotes to total votes
  // Additional potentially useful fields (not exhaustive)
  subreddit_name_prefixed?: string; // e.g., "r/subreddit"
  link_flair_text?: string | null;
  author_flair_text?: string | null;
  total_awards_received?: number;
  gilded?: number;
  downs?: number; // Note: Reddit fuzzes vote counts, so exact downvotes might not be accurate/available.
  ups?: number; // Net score (ups) is more reliable than separate up/down.
  domain?: string; // Domain of the linked URL (e.g., "i.imgur.com", "self.subreddit")
  media?: any; // Can contain rich media like videos, images
  media_embed?: any;
  secure_media?: any;
  secure_media_embed?: any;
  crosspost_parent_list?: RedditApiPostData[]; // If it's a crosspost
  // These fields are usually string representations but might be numbers in some contexts
  // It's safer to parse them as numbers if needed, after checking their type.
  score_int?: number;
  num_comments_int?: number;
  created_utc_int?: number;
  type?: string; // e.g. "link", "self" (though kind: "t3" already indicates a link/post)
}

interface RedditListingChild {
  kind: "t3"; // "t3" signifies a "link" or "post" object
  data: RedditApiPostData;
}

interface RedditJsonResponse {
  kind: "Listing";
  data: {
    after: string | null; // Token for next page
    dist: number; // Number of items returned in this listing
    modhash: string; // A token used for some authenticated actions, not typically needed for read-only
    geo_filter: string | null;
    children: RedditListingChild[];
    before: string | null; // Token for previous page
  };
}

export class RedditTool extends BaseTool {
  name = "RedditTool";
  description =
    "Fetches recent or top posts from a specified public subreddit. Allows sorting by 'hot', 'new', 'top', or 'rising'.";
  argsSchema = {
    type: "object" as const,
    properties: {
      subreddit: {
        type: "string",
        description:
          "The name of the subreddit to fetch posts from (e.g., 'learnprogramming', 'explainlikeimfive'). Do not include 'r/'.",
      },
      filter: {
        type: "string",
        enum: ["hot", "new", "top", "rising"],
        description:
          "How to sort the posts ('hot', 'new', 'top', 'rising'). Defaults to 'hot'.",
        default: "hot",
      },
      time: {
        type: "string",
        enum: ["hour", "day", "week", "month", "year", "all"],
        description:
          "Timeframe for the 'top' filter ('hour', 'day', 'week', 'month', 'year', 'all'). Defaults to 'day' if filter is 'top'.",
        default: "day",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 10,
        description: "Maximum number of posts to return (1-10). Defaults to 5.",
        default: 5,
      },
    },
    required: ["subreddit"], // Subreddit is essential
  };
  cacheTTLSeconds = 60 * 5; // Cache for 5 minutes

  private readonly REDDIT_BASE_URL = "https://www.reddit.com";
  // Ensure appConfig.app.url and appConfig.emailFromAddress are correctly populated
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (by /u/MinatoAIProject contact: ${
    appConfig.emailFromAddress || "info@example.com"
  })`;

  constructor() {
    super();
    if (
      this.USER_AGENT.includes("info@example.com") ||
      this.USER_AGENT.includes("/u/MinatoAIProject")
    ) {
      this.log(
        "warn",
        "Update RedditTool USER_AGENT with specific contact info for API compliance."
      );
    }
  }

  private mapApiPostToStructured(post: RedditApiPostData): RedditPost | null {
    // Basic validation: must have id and title
    if (!post?.id || !post.title) {
      logger.warn(
        "[RedditTool Map] Skipping post due to missing id or title.",
        { postId: post?.id, postTitle: post?.title }
      );
      return null;
    }

    // Ensure 'id' field for RedditPost uses the 'name' (e.g., "t3_xxxx") if available, otherwise 'id'.
    // The 'id' from Reddit API (like "1b3a5x") is just the base36 ID, 'name' is the full thing_id.
    // For consistency in our app, we might prefer the base36 ID if that's what we use elsewhere.
    // Let's stick to `post.id` which is the base36 ID.
    const postId = post.id;

    // Infer type if missing (t3 implies link/self)
    const type = post.type || (post.is_self ? "self" : "link");

    return {
      id: postId,
      title: post.title,
      subreddit: post.subreddit, // API usually returns just the name without "r/"
      author: post.author ?? post.by ?? null, // Prefer 'author', fallback to 'by'
      score: post.score ?? null, // 'score' is net upvotes
      numComments: post.num_comments ?? post.descendants ?? null, // Prefer 'num_comments'
      permalink: `${this.REDDIT_BASE_URL}${post.permalink}`, // Construct full permalink
      url: post.url || null, // URL the post links to
      selfText: post.selftext || null, // Content of a self-post
      createdUtc: post.created_utc ?? post.time ?? null, // Unix timestamp (seconds)
      isSelf: post.is_self,
      hnLink: post.permalink, // Use Reddit permalink for HN link
      thumbnailUrl:
        post.preview?.images?.[0]?.resolutions?.[2]?.url ?? // Prefer a medium resolution
        post.preview?.images?.[0]?.resolutions?.[1]?.url ??
        post.preview?.images?.[0]?.source?.url ??
        (post.thumbnail &&
        ![
          "self",
          "default",
          "nsfw",
          "",
          "spoiler",
          "image",
          "hosted:video",
          "link",
          "richtext:lightbox",
        ].includes(post.thumbnail) // Filter out common non-URL thumbnails
          ? post.thumbnail
          : null),
    };
  }

  async execute(
    input: RedditInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const subredditInput = input.subreddit;
    const { query, time: inputTime } = input; // 'query' is not used by this tool based on description, but kept in input for future.

    if (!subredditInput?.trim()) {
      return {
        error: "Please specify a valid subreddit name.",
        result: "Which subreddit should I check?",
        structuredData: undefined,
      };
    }
    const subreddit = subredditInput.replace(/^(r\/)/i, "").trim();
    if (!/^[a-zA-Z0-9_]{3,21}$/.test(subreddit)) {
      // Reddit subreddit name validation
      return {
        error: `Invalid subreddit name format: "${subreddit}".`,
        result: `"${subreddit}" doesn't look like a valid subreddit name.`,
        structuredData: undefined,
      };
    }

    const filter =
      input.filter && ["hot", "new", "top", "rising"].includes(input.filter)
        ? input.filter
        : "hot";
    const limit = input.limit ? Math.max(1, Math.min(input.limit, 10)) : 5;
    // 'time' (t) parameter is only valid for 'top' and 'controversial' (not used here) sorts.
    const time =
      filter === "top" &&
      inputTime &&
      ["hour", "day", "week", "month", "year", "all"].includes(inputTime)
        ? inputTime
        : filter === "top"
        ? "day"
        : undefined; // Default to 'day' if filter is 'top' and no time is specified

    let url = `${this.REDDIT_BASE_URL}/r/${subreddit}/${filter}.json?limit=${limit}&raw_json=1`;
    if (time) {
      url += `&t=${time}`;
    }

    const logPrefix = `[RedditTool r/${subreddit} Filter:${filter}${
      time ? ` Time:${time}` : ""
    }]`;
    this.log(
      "info",
      `${logPrefix} Fetching ${limit} posts... URL: ${
        url.split(".json?")[0]
      }.json?...`
    );

    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return {
        error: "Reddit fetch cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }

    let outputStructuredData: RedditStructuredOutput = {
      result_type: "reddit_posts",
      source_api: "reddit",
      query: input, // Store original input
      subreddit: subreddit,
      filter: filter,
      time: time,
      count: 0,
      posts: [],
      error: null,
    };

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: abortSignal ?? AbortSignal.timeout(7000), // 7-second timeout
      });

      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Execution aborted after Reddit API call.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return {
          error: "Reddit fetch cancelled.",
          result: "Cancelled.",
          structuredData: outputStructuredData,
        };
      }

      if (!response.ok) {
        let errorDetail = `Reddit API request failed: ${response.status} ${response.statusText}. URL: ${url}`;
        if (response.status === 404)
          errorDetail = `Subreddit "r/${subreddit}" not found or it's private.`;
        else if (response.status === 403)
          errorDetail = `Access denied to "r/${subreddit}". It might be private or quarantined.`;
        else if (response.status === 429)
          errorDetail = `Rate limit exceeded accessing Reddit. Please try again later.`;
        else {
          try {
            const errorBody = await response.text();
            errorDetail += ` - ${errorBody.substring(0, 150)}`;
          } catch {}
        }
        this.log("error", `${logPrefix} ${errorDetail}`);
        throw new Error(errorDetail);
      }

      const data: RedditJsonResponse =
        (await response.json()) as RedditJsonResponse;

      if (data?.kind !== "Listing" || !data?.data?.children) {
        this.log(
          "warn",
          `${logPrefix} Unexpected response format from Reddit.`,
          data
        );
        throw new Error("Unexpected response format from Reddit API.");
      }

      // Filter out stickied posts and map data
      const apiPosts = data.data.children
        .filter(
          (child) => child.kind === "t3" && child.data && !child.data.stickied
        )
        .map((child) => child.data);

      if (apiPosts.length === 0) {
        const timeSuffix = time ? ` for the past ${time}` : "";
        const msg = `No non-stickied posts found in r/${subreddit} matching filter '${filter}'${timeSuffix}.`;
        this.log("info", `${logPrefix} ${msg}`);
        outputStructuredData.error = null; // Not an error, just no results
        return { result: msg, structuredData: outputStructuredData };
      }

      outputStructuredData.posts = apiPosts
        .map((post) => this.mapApiPostToStructured(post))
        .filter((p): p is RedditPost => p !== null);
      outputStructuredData.count = outputStructuredData.posts.length;
      outputStructuredData.error = null;

      if (outputStructuredData.count === 0) {
        // This can happen if all fetched posts were filtered out by mapApiPostToStructured (e.g., all were comments/deleted after initial API filter)
        const msg = `Found posts for r/${subreddit} (${filter}), but none were suitable after filtering.`;
        this.log("info", `${logPrefix} ${msg}`);
        return { result: msg, structuredData: outputStructuredData };
      }

      this.log(
        "info",
        `${logPrefix} Fetched ${outputStructuredData.count} valid posts.`
      );
      const resultString =
        `Top ${
          outputStructuredData.count
        } posts from r/${subreddit} (${filter}${time ? `/${time}` : ""}):\n` +
        outputStructuredData.posts
          .map((p: RedditPost, i: number) => {
            // Corrected type for p
            const points = p.score !== null ? ` (${p.score} pts)` : "";
            const comments =
              p.numComments !== null ? ` | ${p.numComments} comments` : "";
            const title =
              p.title.substring(0, 70) + (p.title.length > 70 ? "..." : "");
            return `${i + 1}. ${title}${points}${comments} [Discussion: ${
              p.hnLink
            }]`; // Note: p.hnLink is from HackerNewsStory, permalink is for Reddit
          })
          .join("\n")
          .replace(/\[Discussion: undefined\]/g, "[No Direct Link]"); // Clean up if hnLink was mistakenly used

      // Corrected resultString to use p.permalink for Reddit
      const correctedResultString =
        `Top ${
          outputStructuredData.count
        } posts from r/${subreddit} (${filter}${time ? `/${time}` : ""}):\n` +
        outputStructuredData.posts
          .map((p: RedditPost, i: number) => {
            const points = p.score !== null ? ` (${p.score} pts)` : "";
            const comments =
              p.numComments !== null ? ` | ${p.numComments} comments` : "";
            const title =
              p.title.substring(0, 70) + (p.title.length > 70 ? "..." : "");
            return `${i + 1}. ${title}${points}${comments} [Discussion: ${
              p.permalink
            }]`;
          })
          .join("\n");

      return {
        result: correctedResultString,
        structuredData: outputStructuredData,
      };
    } catch (error: any) {
      const errorMsg = `Failed Reddit fetch r/${subreddit}: ${error.message}`;
      outputStructuredData.error = errorMsg;
      if (error.name === "AbortError" || abortSignal?.aborted) {
        this.log(
          "warn",
          `${logPrefix} Request timed out or was aborted by signal.`
        );
        outputStructuredData.error = "Request timed out or cancelled.";
        return {
          error: outputStructuredData.error,
          result: "Sorry, the request to Reddit took too long.",
          structuredData: outputStructuredData,
        };
      }
      this.log("error", `${logPrefix} Error:`, error);
      const userMessage =
        error.message.includes("not found") ||
        error.message.includes("Access denied")
          ? error.message
          : "Failed getting posts from that subreddit.";
      return {
        error: errorMsg,
        result: `Sorry, couldn't get posts from r/${subreddit}. ${userMessage}`,
        structuredData: outputStructuredData,
      };
    }
  }
}
