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
    // Enhanced extraction prompt for Reddit with intelligent subreddit mapping
    const extractionPrompt = `
You are an expert parameter extractor for Minato's RedditTool which fetches posts from Reddit subreddits.

Given this user query about Reddit content: "${userInput.replace(/\"/g, '\\"')}"

CRITICAL SUBREDDIT MAPPING RULES:

1. INTELLIGENT SUBREDDIT EXTRACTION - PRIORITIZE SPECIFIC SUBREDDITS:
   NEVER default to "all" unless the query is extremely generic like "show me reddit posts"
   
       Map specific topics to their BEST subreddits:
    * AI/Artificial Intelligence/Machine Learning/ChatGPT/GPT/LLM → "MachineLearning" (primary choice for AI)
    * AI news/AI updates/AI developments → "artificial" 
    * Tech/Technology news/tech trends → "technology"
    * Programming/coding/software development → "programming"
    * Web development/JavaScript/Python/coding help → "webdev"
    * News/current events/world news → "worldnews"
    * Gaming/games/video games → "gaming"
    * Science/scientific research → "science"
    * Politics/political news/politicians/Trump/Biden/elections/government → "politics"
    * Conservative politics/Republican → "Conservative"
    * Liberal politics/Democrat → "democrats"
    * Funny/humor/memes/jokes → "funny"
    * Movies/films/cinema → "movies"
    * Music/songs/artists → "Music"
    * Sports/athletics/teams → "sports"
    * Crypto/Bitcoin/Cryptocurrency/blockchain → "CryptoCurrency"
    * Stocks/Investing/Finance/trading → "investing"
    * Food/Cooking/Recipes/cuisine → "food"
    * Startups/entrepreneurship/business → "startups"
    * Ask questions/advice → "AskReddit"
    * Today I learned/facts → "todayilearned"
    * Life tips/advice → "LifeProTips"
    * Shower thoughts → "Showerthoughts"
    * Data/statistics/visualization → "dataisbeautiful"
    * Photography/photos → "pics"

   - If user explicitly mentions a subreddit (e.g., "r/AskReddit"), use that exact subreddit
   - Remove "r/" prefix if present
   - For AI-related queries, ALWAYS prefer "MachineLearning" over "all"

2. FILTER TYPE DETERMINATION:
   - Look for explicit mentions: "top posts" → "top", "hot content" → "hot", "new threads" → "new", "trending" → "rising"
   - For news/current events/recent developments, prefer "hot"
   - For "best of" or "popular" requests, use "top"
   - For latest/newest content, use "new"
   - Default to "hot" if no specific filter is mentioned

3. TIME PERIOD EXTRACTION (for "top" and "controversial" filters):
   - Map time indicators: "today" → "day", "this week" → "week", "this month" → "month", "all time" → "all"
   - Only include if filter is "top" or "controversial"
   - Default to "week" for "top" filter to get good variety

4. RESULT LIMIT DETERMINATION:
   - Extract specific numbers mentioned
   - Map expressions: "a few" → 5, "several" → 8, "many" → 12, "lots" → 15
   - Default to 8 for good variety

 EXAMPLES:
 - "find me some post about ai on reddit" → {"subreddit": "MachineLearning", "filter": "hot", "time": null, "limit": 8}
 - "show me top AI posts this week" → {"subreddit": "MachineLearning", "filter": "top", "time": "week", "limit": 8}
 - "latest tech news" → {"subreddit": "technology", "filter": "new", "time": null, "limit": 8}
 - "funny posts" → {"subreddit": "funny", "filter": "hot", "time": null, "limit": 8}
 - "crypto discussions" → {"subreddit": "CryptoCurrency", "filter": "hot", "time": null, "limit": 8}
 - "find some post on reddit about trump" → {"subreddit": "politics", "filter": "hot", "time": null, "limit": 8}
 - "trump news" → {"subreddit": "politics", "filter": "hot", "time": null, "limit": 8}
 - "political discussions" → {"subreddit": "politics", "filter": "hot", "time": null, "limit": 8}

OUTPUT FORMAT: JSON object with these fields:
- "subreddit": (string) Name of subreddit without "r/" prefix - NEVER use "all" unless query is extremely generic
- "filter": (string) One of: "hot", "new", "top", "rising", "controversial"
- "time": (string|null) Only for "top" or "controversial" filters: "hour", "day", "week", "month", "year", "all"
- "limit": (number) Number of posts (1-25)

RESPOND ONLY WITH THE JSON OBJECT.`;

    const defaultInput: RedditInput = {
      subreddit: "popular", // Changed from "all" to "popular" for better default content
      filter: "hot",
      time: null,
      limit: 8,
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
      
      logger.info(`[RedditTool] LLM extraction result: ${JSON.stringify(extractionResult)}`);
      
      // Ensure we have a valid result with all required fields
      if (extractionResult && 'subreddit' in extractionResult && 'filter' in extractionResult) {
        const result: RedditInput = {
          ...defaultInput,
          ...extractionResult
        };
        
        // Enhanced subreddit selection with intelligent fallbacks
        if (!result.subreddit || result.subreddit === "all") {
          logger.info(`[RedditTool] Applying fallback logic for subreddit: "${result.subreddit}" with input: "${userInput}"`);
          // Apply intelligent topic-based fallbacks
          const lowerInput = userInput.toLowerCase();
          if (lowerInput.includes('ai') || lowerInput.includes('artificial intelligence') || lowerInput.includes('machine learning') || lowerInput.includes('chatgpt') || lowerInput.includes('gpt') || lowerInput.includes('llm')) {
            result.subreddit = "MachineLearning";
            logger.info(`[RedditTool] Fallback detected AI keywords → MachineLearning`);
          } else if (lowerInput.includes('trump') || lowerInput.includes('biden') || lowerInput.includes('politic') || lowerInput.includes('election') || lowerInput.includes('government') || lowerInput.includes('democrat') || lowerInput.includes('republican') || lowerInput.includes('congress') || lowerInput.includes('senate')) {
            result.subreddit = "politics";
            logger.info(`[RedditTool] Fallback detected political keywords → politics`);
          } else if (lowerInput.includes('tech') || lowerInput.includes('technology')) {
            result.subreddit = "technology";
            logger.info(`[RedditTool] Fallback detected tech keywords → technology`);
          } else if (lowerInput.includes('program') || lowerInput.includes('coding') || lowerInput.includes('software')) {
            result.subreddit = "programming";
            logger.info(`[RedditTool] Fallback detected programming keywords → programming`);
          } else if (lowerInput.includes('news') || lowerInput.includes('current events')) {
            result.subreddit = "worldnews";
            logger.info(`[RedditTool] Fallback detected news keywords → worldnews`);
          } else if (lowerInput.includes('crypto') || lowerInput.includes('bitcoin') || lowerInput.includes('cryptocurrency')) {
            result.subreddit = "CryptoCurrency";
            logger.info(`[RedditTool] Fallback detected crypto keywords → CryptoCurrency`);
          } else if (lowerInput.includes('funny') || lowerInput.includes('humor') || lowerInput.includes('meme')) {
            result.subreddit = "funny";
            logger.info(`[RedditTool] Fallback detected humor keywords → funny`);
          } else if (lowerInput.includes('gaming') || lowerInput.includes('games')) {
            result.subreddit = "gaming";
            logger.info(`[RedditTool] Fallback detected gaming keywords → gaming`);
          } else {
            result.subreddit = "popular"; // Better default than "all"
            logger.info(`[RedditTool] Fallback using default → popular`);
          }
        }
        
        // Apply time defaults based on filter if not specified
        if ((result.filter === "top" || result.filter === "controversial") && !result.time) {
          result.time = result.filter === "top" ? "week" : "all"; // Changed default from "day" to "week" for better variety
        }
        
        // Ensure limit is between 1-25
        if (!result.limit || result.limit < 1) {
          result.limit = defaultInput.limit;
        } else if (result.limit > 25) {
          result.limit = 25;
        }
        
        logger.info(`[RedditTool] Final extracted parameters: ${JSON.stringify(result)}`);
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
    
    logger.info(`${logPrefix} Execute called with input: ${JSON.stringify(input)}`);
    
    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      try {
        const extractedParams = await this.extractRedditParameters(input._rawUserInput);
        
        // Use extracted parameters, prioritizing them over defaults
        input.subreddit = extractedParams.subreddit || input.subreddit;
        input.filter = extractedParams.filter || input.filter;
        input.time = extractedParams.time || input.time;
        input.limit = extractedParams.limit || input.limit;
      } catch (error) {
        logger.error(`${logPrefix} Error extracting parameters:`, error);
        // Continue with default values if extraction fails
      }
    }
    
    // Simple fallback: if subreddit is still "all", default to "popular" for better content
    if (input.subreddit === "all") {
      logger.info(`${logPrefix} Converting "all" to "popular" for better content quality`);
      input.subreddit = "popular";
    }
    
    // Apply user preferences if available
    if (input.context?.userState?.workflow_preferences) {
      const prefs = input.context.userState.workflow_preferences;
      
      // If user didn't specify a subreddit and has preferred subreddits, use the first one
      // But only if we still have "all" or empty - don't override intelligent extractions
      if (prefs.redditPreferredSubreddits && 
          prefs.redditPreferredSubreddits.length > 0 && 
          (!input.subreddit || input.subreddit === "all" || input.subreddit === "popular")) {
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
        let suggestion = "";
        if (subreddit === "MachineLearning") {
          suggestion = " Try checking r/artificial or r/ArtificialIntelligence instead?";
        } else if (subreddit === "artificial") {
          suggestion = " Try checking r/MachineLearning or r/technology instead?";
        } else if (filter === "top") {
          suggestion = " Try changing the time period or using 'hot' posts instead?";
        } else {
          suggestion = " Try a different filter like 'new' or 'top'?";
        }
        const msg = `No posts found in r/${subreddit} with filter '${filter}'${timeSuffix}, ${userNameForResponse}.${suggestion}`;
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
      
      // Create contextual response based on subreddit and user query
      let contextualIntro = "";
      let emoji = "📋";
      
      if (subreddit === "MachineLearning") {
        contextualIntro = "Found some great AI & Machine Learning discussions from r/MachineLearning";
        emoji = "🤖";
      } else if (subreddit === "artificial") {
        contextualIntro = "Here are the latest AI developments from r/artificial";
        emoji = "🧠";
      } else if (subreddit === "technology") {
        contextualIntro = "Here are the hottest tech trends from r/technology";
        emoji = "💻";
      } else if (subreddit === "worldnews" || subreddit === "news") {
        contextualIntro = "Here are current news stories from r/worldnews";
        emoji = "📰";
      } else if (subreddit === "programming") {
        contextualIntro = "Here are some programming discussions from r/programming";
        emoji = "👨‍💻";
      } else if (subreddit === "politics") {
        contextualIntro = "Here are some political discussions from r/politics";
        emoji = "🏛️";
      } else if (subreddit === "Conservative") {
        contextualIntro = "Here are some conservative discussions from r/Conservative";
        emoji = "🇺🇸";
      } else if (subreddit === "democrats") {
        contextualIntro = "Here are some democratic discussions from r/democrats";
        emoji = "🗳️";
      } else if (subreddit === "CryptoCurrency") {
        contextualIntro = "Here are the latest crypto discussions from r/CryptoCurrency";
        emoji = "₿";
      } else if (subreddit === "investing") {
        contextualIntro = "Here are some investing insights from r/investing";
        emoji = "📈";
      } else if (subreddit === "food") {
        contextualIntro = "Here are some delicious food posts from r/food";
        emoji = "🍕";
      } else if (subreddit === "gaming") {
        contextualIntro = "Here are some gaming discussions from r/gaming";
        emoji = "🎮";
      } else if (subreddit === "funny") {
        contextualIntro = "Here are some funny posts from r/funny";
        emoji = "😂";
      } else if (subreddit === "popular") {
        contextualIntro = "Here are some popular posts trending on Reddit";
        emoji = "🔥";
      } else {
        contextualIntro = `Here are some interesting posts from r/${subreddit}`;
        emoji = "📋";
      }
      
      // More informative response with filter and time context
      let filterContext = "";
      if (filter === "top" && time) {
        filterContext = ` (top posts from the past ${time})`;
      } else if (filter === "new") {
        filterContext = " (newest posts)";
      } else if (filter === "rising") {
        filterContext = " (trending posts)";
      } else if (filter === "hot") {
        filterContext = " (hot posts)";
      }
      
      let resultString = `${contextualIntro}${filterContext}, ${userNameForResponse}! The top post is "${firstPost.title.substring(0, 80)}..." by u/${firstPost.author || 'someone'}`;
      if (firstPost.score !== null) resultString += ` (${firstPost.score} upvotes)`;
      if (outputStructuredData.count > 1) {
          resultString += `. Found ${outputStructuredData.count} posts total - check them out below! ${emoji}`;
      } else {
          resultString += ` ${emoji}`;
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