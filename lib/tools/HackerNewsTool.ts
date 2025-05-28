// FILE: lib/tools/HackerNewsTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is imported
import { HackerNewsStructuredOutput, HackerNewsStory } from "@/lib/types/index";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { formatDistanceToNowStrict, parseISO, fromUnixTime, format } from 'date-fns'; // Added more date-fns functions
import { generateStructuredJson } from "../providers/llm_clients";

interface HNInput extends ToolInput {
  query?: string;
  filter?: "top" | "new" | "best" | "ask" | "show" | "job";
  time?: "hour" | "day" | "week" | "month" | "year" | "all";
  limit?: number;
}

interface HNStoryApiData {
  deleted?: boolean;
  id: number;
  objectID?: string;
  title?: string;
  url?: string;
  points?: number;
  author?: string;
  num_comments?: number;
  created_at_i?: number; // Algolia uses this (seconds)
  time?: number; // Firebase uses this (seconds)
  type?: string; // e.g., "story", "job", "ask_hn"
  text?: string; // For Ask HN, Show HN
  story_text?: string; // Algolia often uses this for self-posts
  by?: string; // Firebase author
  descendants?: number; // Firebase num_comments
  score?: number; // Firebase points
  kids?: number[]; // Firebase comment IDs
  _tags?: string[]; // Algolia tags like "story", "ask_hn"
  permalink?: string; // Not directly from API, usually constructed
}
interface AlgoliaResponse { hits?: HNStoryApiData[]; nbHits?: number; }
type FirebaseListResponse = number[]; // Array of item IDs

export class HackerNewsTool extends BaseTool {
  name = "HackerNewsTool";
  description =
    "Fetches stories from Hacker News (HN). Can retrieve lists like 'top', 'new', 'best', 'ask', 'show', or 'job' stories, or search HN posts using a query.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: ["string", "null"] as const, description: "Keywords to search HN stories for. Provide as string or null if using filter." } as OpenAIToolParameterProperties,
      filter: {
        type: ["string", "null"] as const,
        enum: ["top", "new", "best", "ask", "show", "job", null],
        description: "Type of story list to fetch (e.g., 'top', 'new'). If null or query is provided, query takes precedence. Defaults to 'top' if both query and filter are null.",
      } as OpenAIToolParameterProperties,
      time: {
        type: ["string", "null"] as const,
        enum: ["hour", "day", "week", "month", "year", "all", null],
        description: "Timeframe for the 'top' filter (e.g., 'day', 'week'). Only applicable if filter is 'top'. If null or omitted, defaults to 'day' for 'top' filter.",
      } as OpenAIToolParameterProperties,
      limit: {
        type: ["number", "null"] as const,
        description: "Maximum number of stories to return (1-10). If null or omitted, defaults to 5.",
      } as OpenAIToolParameterProperties,
    },
    required: ["query", "filter", "time", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 10; // Cache HN for 10 minutes
  categories = ["news", "tech", "community"];
  version = "1.0.0";
  metadata = { provider: "Hacker News API", supports: ["top", "new", "best", "ask", "show", "job"] };

  private readonly FIREBASE_API_BASE = "https://hacker-news.firebaseio.com/v0";
  private readonly ALGOLIA_API_BASE = "https://hn.algolia.com/api/v1";
  private readonly HN_ITEM_URL_BASE = "https://news.ycombinator.com/item?id=";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;

  constructor() {
    super();
    if (this.USER_AGENT.includes("support@example.com")) {
      this.log("warn", "Update HN USER_AGENT contact info in HackerNewsTool with actual contact details.");
    }
  }

  private mapApiStoryToStructured(story: HNStoryApiData): HackerNewsStory | null {
    if (!story || (!story.id && !story.objectID) || !story.title) { logger.warn("[HNTool Map] Skipping story due to missing id or title.", story); return null; }
    const id = story.id || parseInt(story.objectID || "0", 10);
    if (!id) { logger.warn("[HNTool Map] Skipping story due to invalid id.", story); return null; }
    
    let type = story.type;
    if (!type && story._tags) { 
      if (story._tags.includes("ask_hn")) type = "ask"; 
      else if (story._tags.includes("show_hn")) type = "show"; 
      else if (story._tags.includes("job")) type = "job"; 
      else if (story._tags.includes("story")) type = "story"; 
      else if (story._tags.includes("poll")) type = "poll"; 
    }
    type = type || "story"; // Default to 'story'

    const createdAtTimestampSeconds = story.created_at_i || story.time;
    const createdAtDate = createdAtTimestampSeconds ? fromUnixTime(createdAtTimestampSeconds) : null;
    
    return {
      id: id, objectID: story.objectID || String(id), title: story.title,
      url: story.url || null, 
      points: story.points ?? story.score ?? null,
      author: story.author ?? story.by ?? null,
      numComments: story.num_comments ?? story.descendants ?? null,
      createdAt: createdAtDate ? createdAtDate.toISOString() : null,
      type: type, 
      text: story.text || story.story_text || null,
      hnLink: story.permalink ? `${this.FIREBASE_API_BASE}${story.permalink}` : `${this.HN_ITEM_URL_BASE}${id}`, // Use permalink if available
    };
  }

  private async fetchItemDetails(itemId: number, abortSignal?: AbortSignal): Promise<HNStoryApiData | null> {
    if (!itemId) return null;
    const url = `${this.FIREBASE_API_BASE}/item/${itemId}.json`;
    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(4000) });
      if (!response.ok) { this.log("warn", `Failed HN item fetch ${itemId}, status: ${response.status}`); return null; }
      const item = await response.json() as HNStoryApiData | null;
      // Filter out comments or deleted items more reliably
      if (!item || typeof item !== 'object' || item.type === "comment" || item.type === "pollopt" || item.deleted === true) { 
        this.log("warn", `Received invalid/comment/deleted data for HN item ${itemId}. Type: ${item?.type}, Deleted: ${item?.deleted}`); return null; 
      }
      item.id = itemId; // Ensure ID is set from input if not in response (should be)
      return item;
    } catch (error: any) {
      if (error.name !== 'AbortError') { this.log("error", `Error fetching HN item details for ${itemId}:`, error.message); }
      else { this.log("warn", `Fetching HN item ${itemId} aborted.`); }
      return null;
    }
  }

  private async extractHackerNewsParameters(userInput: string): Promise<Partial<HNInput>> {
    // Enhanced extraction prompt for HackerNews
    const extractionPrompt = `
You are an expert parameter extractor for Minato's HackerNewsTool which fetches stories from Hacker News.

Given this user query about Hacker News: "${userInput.replace(/\"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. FILTER TYPE DETECTION:
   - Identify if user wants "top", "new", "best", "ask", "show", or "job" stories
   - Look for keywords like "trending" (→top), "latest" (→new), "best", "Ask HN", "Show HN", "jobs"
   - Default to "top" if unspecified but implied by context

2. SEARCH QUERY EXTRACTION:
   - If user wants to search for specific topics (e.g., "Find HN posts about AI"), extract the search query ("AI")
   - Only populate query if user is clearly looking for specific content vs. browsing a list
   - If both filter and query are detected, prioritize query (as it overrides filter)

3. TIME RANGE ANALYSIS:
   - For "top" stories, determine desired time range: "hour", "day", "week", "month", "year", "all"
   - Map expressions like "today" to "day", "this week" to "week", etc.
   - Default to "day" for top stories if unspecified

4. RESULT LIMIT DETERMINATION:
   - Identify how many stories the user wants (1-10)
   - Map expressions like "a few" to 3, "several" to 5, etc.
   - Default to 5 if unspecified

OUTPUT FORMAT: JSON object with these fields:
- "query": (string|null) Search terms if the user wants to search for specific content, null if browsing lists
- "filter": (string|null) One of: "top", "new", "best", "ask", "show", "job", or null if unspecified
- "time": (string|null) For top stories: "hour", "day", "week", "month", "year", "all", or null if unspecified
- "limit": (number|null) Number of stories (1-10) or null if unspecified

If a parameter cannot be confidently extracted, set it to null rather than guessing.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      // Define the schema for HNInput
      const hnParamsSchema = {
        type: "object",
        properties: {
          query: { type: ["string", "null"] },
          filter: { type: ["string", "null"], enum: ["top", "new", "best", "ask", "show", "job", null] },
          time: { type: ["string", "null"], enum: ["hour", "day", "week", "month", "year", "all", null] },
          limit: { type: ["number", "null"] }
        }
      };

      const extractionResult = await generateStructuredJson<Partial<HNInput>>(
        extractionPrompt,
        userInput,
        hnParamsSchema,
        "HackerNewsToolParameters",
        [], // no history context needed
        "gpt-4o-mini"
      );
      
      return extractionResult || {};
    } catch (error) {
      logger.error("[HackerNewsTool] Parameter extraction failed:", error);
      return {};
    }
  }

  async execute(input: HNInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      const extractedParams = await this.extractHackerNewsParameters(input._rawUserInput);
      
      // Only use extracted parameters if they're not already specified
      if (extractedParams.query && input.query === undefined) {
        input.query = extractedParams.query;
      }
      if (extractedParams.filter && input.filter === undefined) {
        input.filter = extractedParams.filter;
      }
      if (extractedParams.time && input.time === undefined) {
        input.time = extractedParams.time;
      }
      if (extractedParams.limit && input.limit === undefined) {
        input.limit = extractedParams.limit;
      }
    }

    const effectiveQuery = (typeof input.query === "string" && input.query.trim() !== "") ? input.query.trim() : undefined;
    const effectiveFilter = effectiveQuery ? undefined : (typeof input.filter === "string" && input.filter.trim() !== "" ? input.filter : "top");
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 5 : Math.max(1, Math.min(input.limit, 10));
    const effectiveTime = (typeof input.time === "string" && input.time.trim() !== "") ? input.time : (effectiveFilter === "top" ? "day" : undefined);
    const userNameForResponse = input.context?.userName || "friend";

    const logPrefix = `[HNTool ${effectiveQuery ? `Query:'${effectiveQuery.substring(0,20)}'` : `Filter:${effectiveFilter}`}]`;
    const queryInputForStructuredData = { ...input, query: effectiveQuery, filter: effectiveFilter, limit: effectiveLimit, time: effectiveTime };

    if (!effectiveQuery && !effectiveFilter) {
      const errorMsg = "Must provide query or filter.";
      const outputStructuredData: HackerNewsStructuredOutput = {
        result_type: "hn_stories",
        source_api: "hackernews",
        query: queryInputForStructuredData,
        sourceDescription: "Error: No query or filter provided.",
        count: 0,
        stories: [],
        error: errorMsg,
      };
      return {
        error: errorMsg,
        result: `What would you like to see from Hacker News, ${userNameForResponse}? (e.g., top stories, or search for a topic)` ,
        structuredData: outputStructuredData
      } as ToolOutput;
    }

    let sourceDescription = "";
    let outputStructuredData: HackerNewsStructuredOutput = {
      result_type: "hn_stories", source_api: "hackernews", query: queryInputForStructuredData,
      sourceDescription: "", count: 0, stories: [], error: null,
    };

    try {
      let rawStories: HNStoryApiData[] = [];
      if (effectiveQuery) {
        sourceDescription = `search results for "${effectiveQuery}"`;
        const searchTags = "(story,ask_hn,show_hn,job)"; 
        let algoliaUrl = `${this.ALGOLIA_API_BASE}/search?query=${encodeURIComponent(effectiveQuery)}&hitsPerPage=${effectiveLimit}&tags=${searchTags}`;
        if (effectiveTime && ["hour", "day", "week", "month", "year", "all"].includes(effectiveTime)) {
          const nowSeconds = Math.floor(Date.now() / 1000);
          let startTimeSeconds = 0;
          if (effectiveTime === "hour") startTimeSeconds = nowSeconds - 3600;
          else if (effectiveTime === "day") startTimeSeconds = nowSeconds - 86400;
          else if (effectiveTime === "week") startTimeSeconds = nowSeconds - 7 * 86400;
          else if (effectiveTime === "month") startTimeSeconds = nowSeconds - 30 * 86400; 
          else if (effectiveTime === "year") startTimeSeconds = nowSeconds - 365 * 86400; 
          if (startTimeSeconds > 0 && effectiveTime !== "all") {
            algoliaUrl += `&numericFilters=created_at_i>${startTimeSeconds}`;
          }
          sourceDescription += ` (from the last ${effectiveTime})`;
        }
        this.log("info", `${logPrefix} Searching Algolia HN: ${algoliaUrl.split("?query=")[0]}...query=${effectiveQuery.substring(0,30)}...`);
        const response = await fetch(algoliaUrl, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(6000) });
        if (abortSignal?.aborted) throw new Error("Request aborted during Algolia fetch.");
        if (!response.ok) throw new Error(`HN search API (Algolia) failed: ${response.status} ${response.statusText}`);
        const data: AlgoliaResponse = await response.json() as AlgoliaResponse;
        rawStories = (data?.hits || []).filter(h => h.objectID && h.title && !h._tags?.includes("comment") && !h._tags?.includes("pollopt"));
      } else if (effectiveFilter) {
        sourceDescription = `Hacker News ${effectiveFilter} stories`;
        if (effectiveFilter === "top" && effectiveTime) sourceDescription += ` (from the last ${effectiveTime})`;

        if (effectiveFilter === 'top' && effectiveTime && effectiveTime !== 'all') {
            const nowSeconds = Math.floor(Date.now() / 1000);
            let startTimeSeconds = 0;
            if (effectiveTime === "hour") startTimeSeconds = nowSeconds - 3600;
            else if (effectiveTime === "day") startTimeSeconds = nowSeconds - 86400;
            else if (effectiveTime === "week") startTimeSeconds = nowSeconds - 7 * 86400;
            else if (effectiveTime === "month") startTimeSeconds = nowSeconds - 30 * 86400;
            else if (effectiveTime === "year") startTimeSeconds = nowSeconds - 365 * 86400;
            const algoliaUrl = `${this.ALGOLIA_API_BASE}/search_by_date?tags=(story,ask_hn,show_hn,job)&hitsPerPage=${effectiveLimit}${startTimeSeconds > 0 ? `&numericFilters=created_at_i>${startTimeSeconds}` : ''}`;
            this.log("info", `${logPrefix} Searching Algolia HN for ${effectiveFilter} stories: ${algoliaUrl.split('?')[0]}...`);
            const response = await fetch(algoliaUrl, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(6000) });
            if (abortSignal?.aborted) throw new Error("Request aborted during Algolia 'top' fetch.");
            if (!response.ok) throw new Error(`HN '${effectiveFilter}' (Algolia) failed: ${response.status} ${response.statusText}`);
            const data: AlgoliaResponse = await response.json() as AlgoliaResponse;
            rawStories = (data?.hits || []).filter(h => h.objectID && h.title && !h._tags?.includes("comment") && !h._tags?.includes("pollopt"));
        } else {
            const listType = `${effectiveFilter}stories`; 
            const listUrl = `${this.FIREBASE_API_BASE}/${listType}.json`;
            this.log("info", `${logPrefix} Fetching ${effectiveFilter} IDs from Firebase: ${listUrl}`);
            const listResponse = await fetch(listUrl, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(6000) });
            if (abortSignal?.aborted) throw new Error("Request aborted fetching story IDs.");
            if (!listResponse.ok) throw new Error(`HN list API (${effectiveFilter}) failed: ${listResponse.status} ${listResponse.statusText}`);
            const itemIds: FirebaseListResponse = await listResponse.json() as FirebaseListResponse;

            if (!itemIds?.length) { rawStories = []; this.log("info", `${logPrefix} Firebase returned empty list for ${effectiveFilter}.`); }
            else {
              const idsToFetch = itemIds.slice(0, effectiveLimit * 2); 
              const itemPromises = idsToFetch.map(id => this.fetchItemDetails(id, abortSignal));
              const fetchedItems = await Promise.all(itemPromises);
              if (abortSignal?.aborted) throw new Error("Request aborted during item detail fetch.");
              rawStories = fetchedItems.filter((item): item is HNStoryApiData => item !== null).slice(0, effectiveLimit);
            }
        }
      }

      outputStructuredData.sourceDescription = sourceDescription;
      outputStructuredData.stories = rawStories.map(s => this.mapApiStoryToStructured(s)).filter((s): s is HackerNewsStory => s !== null);
      outputStructuredData.count = outputStructuredData.stories.length;

      if (outputStructuredData.count === 0) {
        const msg = `Minato couldn't find any relevant ${sourceDescription} for ${userNameForResponse} right now. Perhaps try a broader search?`;
        outputStructuredData.error = msg;
        return { result: msg, structuredData: outputStructuredData } as ToolOutput;
      }

      this.log("info", `${logPrefix} Fetched ${outputStructuredData.count} valid stories.`);
      const firstStory = outputStructuredData.stories[0];
      let resultString = `Okay ${userNameForResponse}, I found some ${sourceDescription} on Hacker News for you! `;
      if (firstStory) {
          resultString += `For example, there's "${firstStory.title.substring(0, 70)}..." posted by ${firstStory.author || 'someone'} ${firstStory.createdAt || ''}.`;
      }
      if (outputStructuredData.count > 1) {
          resultString += ` There are ${outputStructuredData.count -1} more. I can show you the full list!`;
      } else if (firstStory) {
          resultString += ` What do you think about this one?`;
      }
      outputStructuredData.error = null;
      return { result: resultString, structuredData: outputStructuredData } as ToolOutput;
    } catch (error: any) {
      const errorMsg = `Failed HN data fetch: ${error.message}`;
      outputStructuredData.error = errorMsg;
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        this.log("warn", `${logPrefix} Request timed out or was aborted by signal.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return { error: outputStructuredData.error, result: `Sorry, ${userNameForResponse}, the Hacker News request took too long.`, structuredData: outputStructuredData } as ToolOutput;
      }
      this.log("error", `${logPrefix} Error:`, error);
      return { error: errorMsg, result: `Sorry, ${userNameForResponse}, an error occurred while getting Hacker News data. Please try again.`, structuredData: outputStructuredData } as ToolOutput;
    }
  }
}