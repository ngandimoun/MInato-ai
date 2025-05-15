// FILE: lib/tools/HackerNewsTool.ts
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is a dependency if running in Node.js
import { HackerNewsStructuredOutput, HackerNewsStory } from "@/lib/types/index";
import { appConfig } from "../config"; // appConfig is the unified config
import { logger } from "@/memory-framework/config"; // Unified logger

interface HNInput extends ToolInput {
  query?: string;
  filter?: "top" | "new" | "best" | "ask" | "show" | "job";
  time?: "hour" | "day" | "week" | "month" | "year" | "all"; // Added time for 'top' filter
  limit?: number;
}

interface HNStoryApiData {
  deleted: boolean;
  id: number;
  objectID?: string;
  title?: string;
  url?: string;
  points?: number;
  author?: string;
  num_comments?: number;
  created_at_i?: number; // Algolia timestamp (seconds)
  time?: number; // Firebase timestamp (seconds)
  type?: string; // 'story', 'comment', 'job', 'poll', 'pollopt', 'ask_hn', 'show_hn'
  text?: string; // HTML content for Ask/Show HN
  story_text?: string; // Sometimes used by Algolia for self-post text
  by?: string; // Firebase author
  descendants?: number; // Firebase comment count
  score?: number; // Firebase points
  kids?: number[]; // Firebase child comment IDs
  _tags?: string[]; // Algolia tags like "story", "author_...", "ask_hn"
  permalink?: string; // Not directly from API, usually constructed
}

interface AlgoliaResponse {
  hits?: HNStoryApiData[];
  nbHits?: number;
  // Add other fields if needed, e.g., page, nbPages, hitsPerPage
}

type FirebaseListResponse = number[]; // Array of story IDs

export class HackerNewsTool extends BaseTool {
  name = "HackerNewsTool";
  description =
    "Fetches stories from Hacker News (HN). Can retrieve lists like 'top', 'new', 'best', 'ask', 'show', or 'job' stories, or search HN posts using a query.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "Keywords to search HN stories for. Use this OR filter.",
      },
      filter: {
        type: "string",
        enum: ["top", "new", "best", "ask", "show", "job"],
        description:
          "Type of story list to fetch (e.g., 'top', 'new'). Use this OR query. Defaults to 'top' if no query.",
        default: "top",
      },
      time: {
        // Added for 'top' stories timeframe
        type: "string",
        enum: ["hour", "day", "week", "month", "year", "all"],
        description:
          "Timeframe for the 'top' filter (e.g., 'day', 'week'). Defaults to 'day' if filter is 'top'.",
        default: "day",
      },
      limit: {
        type: "number",
        minimum: 1,
        maximum: 10, // Sensible limit to avoid overly long responses
        description: "Maximum number of stories to return. Defaults to 5.",
        default: 5,
      },
    },
    // No 'required' if query XOR filter is the logic, handled in execute
    required: [],
  };
  cacheTTLSeconds = 60 * 10; // Cache for 10 minutes

  private readonly FIREBASE_API_BASE = "https://hacker-news.firebaseio.com/v0";
  private readonly ALGOLIA_API_BASE = "https://hn.algolia.com/api/v1";
  private readonly HN_ITEM_URL_BASE = "https://news.ycombinator.com/item?id=";
  // Ensure appUrl is correctly sourced from appConfig
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${
    appConfig.app.url
  }; contact: ${appConfig.emailFromAddress || "renemakoule@gmail.com"})`;

  constructor() {
    super();
    if (
      this.USER_AGENT.includes("replace-with-your-contact") ||
      this.USER_AGENT.includes("support@example.com")
    ) {
      this.log(
        "warn",
        "Update HN USER_AGENT contact info in HackerNewsTool constructor with actual contact details."
      );
    }
  }

  private mapApiStoryToStructured(
    story: HNStoryApiData
  ): HackerNewsStory | null {
    if (!story || (!story.id && !story.objectID) || !story.title) {
      logger.warn(
        "[HNTool Map] Skipping story due to missing id or title.",
        story
      );
      return null;
    }
    const id = story.id || parseInt(story.objectID || "0", 10);
    if (!id) {
      logger.warn("[HNTool Map] Skipping story due to invalid id.", story);
      return null;
    }

    let type = story.type; // Firebase often has 'type'
    if (!type && story._tags) {
      // Algolia uses _tags
      if (story._tags.includes("ask_hn")) type = "ask";
      else if (story._tags.includes("show_hn")) type = "show";
      else if (story._tags.includes("job")) type = "job";
      else if (story._tags.includes("story")) type = "story";
      else if (story._tags.includes("poll")) type = "poll";
    }
    type = type || "story"; // Default if still undetermined

    const createdAtTimestamp = story.created_at_i || story.time; // Algolia uses created_at_i, Firebase uses time

    return {
      id: id,
      objectID: story.objectID || String(id),
      title: story.title,
      url: story.url || null, // Story URL or null for self-posts (Ask HN, Show HN text)
      points: story.points ?? story.score ?? null,
      author: story.author ?? story.by ?? null,
      numComments: story.num_comments ?? story.descendants ?? null,
      createdAt: createdAtTimestamp
        ? new Date(createdAtTimestamp * 1000).toISOString()
        : null,
      type: type,
      text: story.text || story.story_text || null, // Text content for self-posts
      hnLink: `${this.HN_ITEM_URL_BASE}${id}`, // Link to the HN discussion page
    };
  }

  private async fetchItemDetails(
    itemId: number,
    abortSignal?: AbortSignal
  ): Promise<HNStoryApiData | null> {
    if (!itemId) return null;
    const url = `${this.FIREBASE_API_BASE}/item/${itemId}.json`;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: abortSignal ?? AbortSignal.timeout(4000), // Short timeout for individual item fetch
      });
      if (!response.ok) {
        this.log(
          "warn",
          `Failed HN item fetch ${itemId}, status: ${response.status}`
        );
        return null;
      }
      const item = (await response.json()) as HNStoryApiData | null; // API can return null for deleted items
      if (
        !item ||
        typeof item !== "object" ||
        item.type === "comment" ||
        item.type === "pollopt" ||
        item.deleted
      ) {
        this.log(
          "warn",
          `Received invalid, comment, pollopt, or deleted data for HN item ${itemId}. Type: ${item?.type}, Deleted: ${item?.deleted}`
        );
        return null;
      }
      item.id = itemId; // Ensure ID is set from param, as Firebase response uses it as key
      return item;
    } catch (error: any) {
      if (error.name !== "AbortError") {
        // Don't log AbortError as a full error
        this.log(
          "error",
          `Error fetching HN item details for ${itemId}:`,
          error.message
        );
      } else {
        this.log("warn", `Fetching HN item ${itemId} aborted.`);
      }
      return null;
    }
  }

  async execute(
    input: HNInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const { query, filter: inputFilter, time: inputTime } = input;
    const effectiveFilter = inputFilter || (query ? undefined : "top"); // Default to 'top' only if no query
    const limit = input.limit ? Math.max(1, Math.min(input.limit, 10)) : 5;
    const logPrefix = `[HNTool ${
      query ? `Query:'${query.substring(0, 20)}'` : `Filter:${effectiveFilter}`
    }]`;

    if (query && effectiveFilter && effectiveFilter !== "top") {
      // Allow query with 'top' for time-filtered search
      logger.warn(
        `${logPrefix} Both query and a non-top filter ('${effectiveFilter}') provided. Prioritizing query.`
      );
      // Consider if query should always override filter or if this is an error.
      // For now, let query take precedence if both are given, unless filter is 'top' (for time-based top searches).
    }
    if (!query && !effectiveFilter) {
      // Should not happen if default works
      return {
        error: "Must provide query or filter.",
        result: "What to fetch from Hacker News?",
        structuredData: undefined,
      };
    }

    let sourceDescription = "";
    let outputStructuredData: HackerNewsStructuredOutput = {
      result_type: "hn_stories",
      source_api: "hackernews",
      query: input, // Store original input for context
      sourceDescription: "",
      count: 0,
      stories: [],
      error: null,
    };

    try {
      let rawStories: HNStoryApiData[] = [];
      if (query) {
        sourceDescription = `search results for "${query}"`;
        // Algolia tags: (story,comment,poll,pollopt,show_hn,ask_hn,front_page,author_:USERNAME,story_:ID)
        const searchTags = "(story,ask_hn,show_hn,job)"; // Focus on primary content types
        let algoliaUrl = `${
          this.ALGOLIA_API_BASE
        }/search?query=${encodeURIComponent(
          query
        )}&hitsPerPage=${limit}&tags=${searchTags}`;
        if (effectiveFilter === "top" && inputTime) {
          // Support time-filtered search via Algolia
          const now = Math.floor(Date.now() / 1000);
          let startTime = 0;
          if (inputTime === "hour") startTime = now - 3600;
          else if (inputTime === "day") startTime = now - 86400;
          else if (inputTime === "week") startTime = now - 86400 * 7;
          else if (inputTime === "month") startTime = now - 86400 * 30;
          else if (inputTime === "year") startTime = now - 86400 * 365;
          if (startTime > 0)
            algoliaUrl += `&numericFilters=created_at_i>${startTime}`;
          sourceDescription += ` (last ${inputTime})`;
        }

        this.log(
          "info",
          `${logPrefix} Searching Algolia HN: ${
            algoliaUrl.split("?query=")[0]
          }...query=${query.substring(0, 30)}...`
        );
        const response = await fetch(algoliaUrl, {
          headers: { "User-Agent": this.USER_AGENT },
          signal: abortSignal ?? AbortSignal.timeout(6000),
        });
        if (abortSignal?.aborted)
          throw new Error("Request aborted during Algolia fetch.");
        if (!response.ok)
          throw new Error(
            `HN search API (Algolia) failed: ${response.status} ${response.statusText}`
          );
        const data: AlgoliaResponse = await response.json();
        rawStories = (data?.hits || []).filter(
          (h) =>
            h.objectID &&
            h.title &&
            !h._tags?.includes("comment") &&
            !h._tags?.includes("pollopt")
        ); // Ensure basic fields and not just comments
      } else if (effectiveFilter) {
        // Only filter, no query
        sourceDescription = `${effectiveFilter} stories`;
        const listType = `${effectiveFilter}stories`; // topstories, newstories, beststories, askstories, showstories, jobstories
        const listUrl = `${this.FIREBASE_API_BASE}/${listType}.json`;
        this.log(
          "info",
          `${logPrefix} Fetching ${effectiveFilter} IDs from Firebase: ${listUrl}`
        );
        const listResponse = await fetch(listUrl, {
          headers: { "User-Agent": this.USER_AGENT },
          signal: abortSignal ?? AbortSignal.timeout(6000),
        });
        if (abortSignal?.aborted)
          throw new Error("Request aborted fetching story IDs.");
        if (!listResponse.ok)
          throw new Error(
            `HN list API (${effectiveFilter}) failed: ${listResponse.status} ${listResponse.statusText}`
          );
        const itemIds: FirebaseListResponse = await listResponse.json();

        if (!itemIds?.length) {
          rawStories = [];
          this.log(
            "info",
            `${logPrefix} Firebase returned empty list for ${effectiveFilter}.`
          );
        } else {
          // Fetch details for N items, but fetch a bit more to account for comments/deleted items that might be filtered out
          const idsToFetch = itemIds.slice(0, limit * 2); // Fetch more initially
          const itemPromises = idsToFetch.map((id) =>
            this.fetchItemDetails(id, abortSignal)
          );
          const fetchedItems = await Promise.all(itemPromises);
          if (abortSignal?.aborted)
            throw new Error("Request aborted during item detail fetch.");
          rawStories = fetchedItems
            .filter((item): item is HNStoryApiData => item !== null)
            .slice(0, limit); // Filter nulls and then slice
        }
      }

      outputStructuredData.sourceDescription = sourceDescription;
      outputStructuredData.stories = rawStories
        .map((s) => this.mapApiStoryToStructured(s))
        .filter((s): s is HackerNewsStory => s !== null);
      outputStructuredData.count = outputStructuredData.stories.length;

      if (outputStructuredData.count === 0) {
        const msg = `Couldn't find any relevant HN ${sourceDescription} right now.`;
        this.log("info", `${logPrefix} ${msg}`);
        // error remains null as it's a valid "no results" scenario
        return { result: msg, structuredData: outputStructuredData };
      }

      this.log(
        "info",
        `${logPrefix} Fetched ${outputStructuredData.count} valid stories.`
      );
      const resultString =
        `Here are the top ${outputStructuredData.count} HN ${sourceDescription}:\n` +
        outputStructuredData.stories
          .map((s: HackerNewsStory, i: number) => {
            // Corrected type for s
            const points = s.points !== null ? ` (${s.points} pts)` : "";
            const comments =
              s.numComments !== null ? ` | ${s.numComments} comments` : "";
            const title =
              s.title.substring(0, 70) + (s.title.length > 70 ? "..." : "");
            return `${i + 1}. ${title}${points}${comments} [Discussion: ${
              s.hnLink
            }]`;
          })
          .join("\n");
      return { result: resultString, structuredData: outputStructuredData };
    } catch (error: any) {
      const errorMsg = `Failed HN data fetch: ${error.message}`;
      outputStructuredData.error = errorMsg;
      if (error.name === "AbortError" || abortSignal?.aborted) {
        this.log(
          "warn",
          `${logPrefix} Request timed out or was aborted by signal.`
        );
        outputStructuredData.error = "Request timed out or cancelled.";
        return {
          error: outputStructuredData.error,
          result: "Sorry, the Hacker News request took too long.",
          structuredData: outputStructuredData,
        };
      }
      this.log("error", `${logPrefix} Error:`, error);
      return {
        error: errorMsg,
        result: `Sorry, an error occurred while getting Hacker News data.`,
        structuredData: outputStructuredData,
      };
    }
  }
}
