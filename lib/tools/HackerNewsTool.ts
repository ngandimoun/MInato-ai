import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { HackerNewsStructuredOutput, HackerNewsStory } from "@/lib/types/index";
import { appConfig } from "../config";
import { logger } from "@/memory-framework/config";

interface HNInput extends ToolInput {
  query?: string;
  filter?: "top" | "new" | "best" | "ask" | "show" | "job" | null;
  time?: "hour" | "day" | "week" | "month" | "year" | "all" | null;
  limit?: number | null;
}

interface HNStoryApiData {
  deleted?: boolean; // Made optional as not always present
  id: number;
  objectID?: string;
  title?: string; // Made optional as it could be missing in rare API errors
  url?: string;
  points?: number;
  author?: string;
  num_comments?: number;
  created_at_i?: number;
  time?: number;
  type?: string;
  text?: string;
  story_text?: string;
  by?: string;
  descendants?: number;
  score?: number;
  kids?: number[];
  _tags?: string[];
  permalink?: string;
}
interface AlgoliaResponse { hits?: HNStoryApiData[]; nbHits?: number; }
type FirebaseListResponse = number[];

export class HackerNewsTool extends BaseTool {
  name = "HackerNewsTool";
  description =
    "Fetches stories from Hacker News (HN). Can retrieve lists like 'top', 'new', 'best', 'ask', 'show', or 'job' stories, or search HN posts using a query.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: ["string", "null"], description: "Keywords to search HN stories for. Use this OR filter." },
      filter: { type: ["string", "null"], enum: ["top", "new", "best", "ask", "show", "job"], description: "Type of story list to fetch (e.g., 'top', 'new'). Use this OR query. Defaults to 'top' if no query.", default: "top" },
      time: { type: ["string", "null"], enum: ["hour", "day", "week", "month", "year", "all"], description: "Timeframe for the 'top' filter (e.g., 'day', 'week'). Defaults to 'day' if filter is 'top'.", default: "day" },
      limit: { type: ["number", "null"], minimum: 1, maximum: 10, description: "Maximum number of stories to return. Defaults to 5.", default: 5 },
    },
    required: ["query", "filter", "time", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 10;

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
    if (!story || (!story.id && !story.objectID) || !story.title) {
      logger.warn("[HNTool Map] Skipping story due to missing id or title.", story);
      return null;
    }
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
    type = type || "story";

    const createdAtTimestamp = story.created_at_i || story.time;

    return {
      id: id, objectID: story.objectID || String(id), title: story.title,
      url: story.url || null, points: story.points ?? story.score ?? null,
      author: story.author ?? story.by ?? null,
      numComments: story.num_comments ?? story.descendants ?? null,
      createdAt: createdAtTimestamp ? new Date(createdAtTimestamp * 1000).toISOString() : null,
      type: type, text: story.text || story.story_text || null,
      hnLink: `${this.HN_ITEM_URL_BASE}${id}`,
    };
  }

  private async fetchItemDetails(itemId: number, abortSignal?: AbortSignal): Promise<HNStoryApiData | null> {
    if (!itemId) return null;
    const url = `${this.FIREBASE_API_BASE}/item/${itemId}.json`;
    try {
      const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(4000) });
      if (!response.ok) { this.log("warn", `Failed HN item fetch ${itemId}, status: ${response.status}`); return null; }
      const item = await response.json() as HNStoryApiData | null;
      if (!item || typeof item !== 'object' || item.type === "comment" || item.type === "pollopt" || item.deleted) {
        this.log("warn", `Received invalid/comment/deleted data for HN item ${itemId}. Type: ${item?.type}, Deleted: ${item?.deleted}`);
        return null;
      }
      item.id = itemId;
      return item;
    } catch (error: any) {
      if (error.name !== 'AbortError') { this.log("error", `Error fetching HN item details for ${itemId}:`, error.message); }
      else { this.log("warn", `Fetching HN item ${itemId} aborted.`); }
      return null;
    }
  }

  async execute(input: HNInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const { query, filter: inputFilter, time: inputTime } = input;
    const effectiveQuery = (query === null || query === undefined) ? undefined : query;
    const effectiveFilter = effectiveQuery ? null : (inputFilter ?? "top"); // If query, filter is not primary. Default to 'top' if no query and no filter.
    const limit = input.limit ?? 5;
    const logPrefix = `[HNTool ${effectiveQuery ? `Query:'${effectiveQuery.substring(0,20)}'` : `Filter:${effectiveFilter}`}]`;
    const queryInputForStructuredData = { ...input, query: effectiveQuery, filter: effectiveFilter, limit };

    if (!effectiveQuery && !effectiveFilter) {
      return { error: "Must provide query or filter.", result: "What to fetch from Hacker News?", structuredData: {result_type: "hn_stories", source_api: "hackernews", query: queryInputForStructuredData, sourceDescription: "Error", count: 0, stories: [], error: "Must provide query or filter." }};
    }

    let sourceDescription = "";
    let outputStructuredData: HackerNewsStructuredOutput = {
      result_type: "hn_stories",
      source_api: "hackernews",
      query: queryInputForStructuredData,
      sourceDescription: "",
      count: 0,
      stories: [],
      error: null,
    };

    try {
      let rawStories: HNStoryApiData[] = [];
      if (effectiveQuery) {
        sourceDescription = `search results for "${effectiveQuery}"`;
        const searchTags = "(story,ask_hn,show_hn,job)";
        let algoliaUrl = `${this.ALGOLIA_API_BASE}/search?query=${encodeURIComponent(effectiveQuery)}&hitsPerPage=${limit}&tags=${searchTags}`;
        if (inputTime) { // Allow time filter with query
          const now = Math.floor(Date.now() / 1000);
          let startTime = 0;
          if (inputTime === "hour") startTime = now - 3600;
          else if (inputTime === "day") startTime = now - 86400;
          // ... other time cases
          if (startTime > 0) algoliaUrl += `&numericFilters=created_at_i>${startTime}`;
          sourceDescription += ` (last ${inputTime})`;
        }
        this.log("info", `${logPrefix} Searching Algolia HN: ${algoliaUrl.split("?query=")[0]}...query=${effectiveQuery.substring(0,30)}...`);
        const response = await fetch(algoliaUrl, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(6000) });
        if (abortSignal?.aborted) throw new Error("Request aborted during Algolia fetch.");
        if (!response.ok) throw new Error(`HN search API (Algolia) failed: ${response.status} ${response.statusText}`);
        const data: AlgoliaResponse = await response.json();
        rawStories = (data?.hits || []).filter(h => h.objectID && h.title && !h._tags?.includes("comment") && !h._tags?.includes("pollopt"));
      } else if (effectiveFilter) {
        sourceDescription = `${effectiveFilter} stories`;
        const listType = `${effectiveFilter}stories`;
        const listUrl = `${this.FIREBASE_API_BASE}/${listType}.json`;
        this.log("info", `${logPrefix} Fetching ${effectiveFilter} IDs from Firebase: ${listUrl}`);
        const listResponse = await fetch(listUrl, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(6000) });
        if (abortSignal?.aborted) throw new Error("Request aborted fetching story IDs.");
        if (!listResponse.ok) throw new Error(`HN list API (${effectiveFilter}) failed: ${listResponse.status} ${listResponse.statusText}`);
        const itemIds: FirebaseListResponse = await listResponse.json();

        if (!itemIds?.length) {
          rawStories = []; this.log("info", `${logPrefix} Firebase returned empty list for ${effectiveFilter}.`);
        } else {
          const idsToFetch = itemIds.slice(0, limit * 2);
          const itemPromises = idsToFetch.map(id => this.fetchItemDetails(id, abortSignal));
          const fetchedItems = await Promise.all(itemPromises);
          if (abortSignal?.aborted) throw new Error("Request aborted during item detail fetch.");
          rawStories = fetchedItems.filter((item): item is HNStoryApiData => item !== null).slice(0, limit);
        }
      }

      outputStructuredData.sourceDescription = sourceDescription;
      outputStructuredData.stories = rawStories.map(s => this.mapApiStoryToStructured(s)).filter((s): s is HackerNewsStory => s !== null);
      outputStructuredData.count = outputStructuredData.stories.length;

      if (outputStructuredData.count === 0) {
        const msg = `Minato couldn't find any relevant HN ${sourceDescription} for ${input.context?.userName || "you"} right now.`;
        this.log("info", `${logPrefix} ${msg}`);
        return { result: msg, structuredData: outputStructuredData };
      }

      this.log("info", `${logPrefix} Fetched ${outputStructuredData.count} valid stories.`);
      const resultString = `Here are the top ${outputStructuredData.count} HN ${sourceDescription} for ${input.context?.userName || "you"}:\n` +
        outputStructuredData.stories.map((s: HackerNewsStory, i: number) => {
          const points = s.points !== null ? ` (${s.points} pts)` : "";
          const comments = s.numComments !== null ? ` | ${s.numComments} comments` : "";
          const title = s.title.substring(0, 70) + (s.title.length > 70 ? "..." : "");
          return `${i + 1}. ${title}${points}${comments} [Discussion: ${s.hnLink}]`;
        }).join("\n");
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Failed HN data fetch: ${error.message}`;
      outputStructuredData.error = errorMsg || null;
      if (error.name === 'AbortError' || abortSignal?.aborted) {
        this.log("warn", `${logPrefix} Request timed out or was aborted by signal.`);
        outputStructuredData.error = "Request timed out or cancelled.";
        return { error: outputStructuredData.error, result: `Sorry, ${input.context?.userName || "User"}, the Hacker News request took too long.`, structuredData: outputStructuredData };
      }
      this.log("error", `${logPrefix} Error:`, error);
      return { error: errorMsg, result: `Sorry, ${input.context?.userName || "User"}, an error occurred while getting Hacker News data.`, structuredData: outputStructuredData };
    }
  }
}