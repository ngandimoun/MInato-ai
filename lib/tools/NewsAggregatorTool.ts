// FILE: lib/tools/NewsAggregatorTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { NewsArticle, NewsArticleList } from "@/lib/types";

interface NewsInput extends ToolInput {
  query?: string;
  sources?: string;
  category?: "business" | "entertainment" | "general" | "health" | "science" | "sports" | "technology";
  country?: string;
  limit?: number | null;
}

export class NewsAggregatorTool extends BaseTool {
  name = "NewsAggregatorTool";
  description =
    "Fetches recent news headlines and summaries based on query, category, country, or specific sources. Uses GNews.io and falls back to NewsAPI.org if available.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: ["string", "null"] as const, description: "Optional. Keywords or phrase to search news for. Can be null if using other filters." } as OpenAIToolParameterProperties,
      sources: { type: ["string", "null"] as const, description: "Optional. Comma-separated news source IDs (e.g., 'bbc-news,cnn'). Use this OR category/country/query. Can be null." } as OpenAIToolParameterProperties,
      category: {
        type: ["string", "null"] as const,
        enum: ["business", "entertainment", "general", "health", "science", "sports", "technology", null],
        description: "Optional. Category to fetch news from. If null or omitted, defaults to 'general'.",
      } as OpenAIToolParameterProperties,
      country: { type: ["string", "null"] as const, description: "Optional. 2-letter ISO country code (e.g., 'us', 'gb') for top headlines. If null or omitted, defaults to user's context or 'us'." } as OpenAIToolParameterProperties,
      limit: { type: ["number", "null"] as const, description: "Optional. Maximum number of articles to return (must be between 1 and 10). If null or omitted, defaults to 5." } as OpenAIToolParameterProperties,
    },
    required: ["query", "sources", "category", "country", "limit"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 15;

  private readonly GNEWS_API_KEY: string | undefined;
  private readonly NEWSAPI_ORG_KEY: string | undefined;
  private readonly GNEWS_API_BASE = "https://gnews.io/api/v4";
  private readonly NEWSAPI_ORG_BASE = "https://newsapi.org/v2";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;

  constructor() {
    super();
    this.GNEWS_API_KEY = appConfig.toolApiKeys.gnews;
    this.NEWSAPI_ORG_KEY = appConfig.toolApiKeys.newsapiOrg;
    if (!this.GNEWS_API_KEY && !this.NEWSAPI_ORG_KEY) logger.error("[NewsAggregatorTool] CRITICAL: NEITHER GNews NOR NewsAPI.org API Key is configured. Tool WILL FAIL.");
    else {
      if (!this.GNEWS_API_KEY) logger.warn("[NewsAggregatorTool] GNews API Key missing. Will rely solely on NewsAPI.org.");
      if (!this.NEWSAPI_ORG_KEY) logger.warn("[NewsAggregatorTool] NewsAPI.org API Key missing. Will rely solely on GNews.");
    }
    if (this.USER_AGENT.includes("support@example.com")) {
        this.log("warn", "Update NewsAggregatorTool USER_AGENT contact info with actual details.");
    }
  }

  private async fetchFromGNews(input: NewsInput, abortSignal?: AbortSignal): Promise<NewsArticle[]> {
    if (!this.GNEWS_API_KEY) return [];
    const { query, category } = input; // Sources not used by GNews search directly
    // Defaulting for GNews
    const effectiveCategory = (category === null || category === undefined) ? "general" : category;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 5 : Math.max(1, Math.min(input.limit, 10)); // GNews max is 10 for free, 100 paid
    const country = input.country || input.context?.countryCode?.toLowerCase() || appConfig.defaultLocale.split("-")[1]?.toLowerCase() || "us";
    const langCode = (input.lang?.split("-")[0] || input.context?.locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en").toLowerCase();

    const params = new URLSearchParams({ token: this.GNEWS_API_KEY, country, lang: langCode, max: String(effectiveLimit) });
    let url = "";

    if (query) {
        url = `${this.GNEWS_API_BASE}/search`;
        params.set("q", query);
        if (effectiveCategory !== "general") params.set("topic", effectiveCategory); // GNews uses 'topic' for category in search
    } else { // No query, use top-headlines
        url = `${this.GNEWS_API_BASE}/top-headlines`;
        params.set("topic", effectiveCategory);
    }
    url += `?${params.toString()}`;

    this.log("info", `[NewsAggregatorTool GNews] Fetching from: ${url.replace(this.GNEWS_API_KEY, "***KEY***")}`);
    try {
        const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(7000) });
        if (!response.ok) { this.log("warn", `[NewsAggregatorTool GNews] API error: ${response.status}`); return []; }
        const data = await response.json() as any; // Type for GNews response if available
        return (data.articles || []).map((article: any): NewsArticle => ({
            title: article.title,
            description: article.description ?? null,
            url: article.url,
            sourceName: article.source?.name || "GNews.io",
            publishedAt: article.publishedAt ?? null,
            imageUrl: article.image ?? null,
        }));
    } catch (e:any) {
        if (e.name !== 'AbortError') this.log("error", "[NewsAggregatorTool GNews] Fetch exception:", e.message);
        return [];
    }
  }

  private async fetchFromNewsAPI(input: NewsInput, abortSignal?: AbortSignal): Promise<NewsArticle[]> {
    if (!this.NEWSAPI_ORG_KEY) return [];
    const { query, sources, category } = input;
    const effectiveCategory = (category === null || category === undefined) ? "general" : category;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 5 : Math.max(1, Math.min(input.limit, 10)); // NewsAPI limit usually around 100, but keep small for Minato
    const country = input.country || input.context?.countryCode?.toLowerCase() || appConfig.defaultLocale.split("-")[1]?.toLowerCase() || "us";
    const langCode = (input.lang?.split("-")[0] || input.context?.locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en").toLowerCase();

    const params = new URLSearchParams({ apiKey: this.NEWSAPI_ORG_KEY, pageSize: String(effectiveLimit) });
    let url = "";

    if (query) { // q parameter for /everything or /top-headlines
        params.set("q", query);
        if (sources) { // /everything endpoint if sources are specified
            url = `${this.NEWSAPI_ORG_BASE}/everything`;
            params.set("sources", sources);
            // language param is not compatible with sources for /everything
            if (params.has("language")) params.delete("language");
        } else { // No sources, use /top-headlines if no query, or /everything if query exists
            url = `${this.NEWSAPI_ORG_BASE}/${query ? 'everything' : 'top-headlines'}`;
            if (!query && effectiveCategory !== "general") params.set("category", effectiveCategory);
            if (!query) params.set("country", country); // country only for top-headlines without query
            params.set("language", langCode);
        }
    } else if (sources) { // Top headlines from specific sources
        url = `${this.NEWSAPI_ORG_BASE}/top-headlines`;
        params.set("sources", sources);
    } else { // Top headlines for country/category
        url = `${this.NEWSAPI_ORG_BASE}/top-headlines`;
        params.set("country", country);
        if (effectiveCategory !== "general") params.set("category", effectiveCategory);
    }
    url += `?${params.toString()}`;

    this.log("info", `[NewsAggregatorTool NewsAPI] Fetching from: ${url.replace(this.NEWSAPI_ORG_KEY, "***KEY***")}`);
    try {
        const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(7000) });
        if (!response.ok) { this.log("warn", `[NewsAggregatorTool NewsAPI] API error: ${response.status}`); return []; }
        const data = await response.json() as any; // Type for NewsAPI response
        return (data.articles || []).map((article: any): NewsArticle => ({
            title: article.title,
            description: article.description ?? null,
            url: article.url,
            sourceName: article.source?.name || "NewsAPI.org",
            publishedAt: article.publishedAt ?? null,
            imageUrl: article.urlToImage ?? null,
        }));
    } catch (e:any) {
        if (e.name !== 'AbortError') this.log("error", "[NewsAggregatorTool NewsAPI] Fetch exception:", e.message);
        return [];
    }
  }


  async execute(input: NewsInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = `[NewsAggregatorTool Exec]`;
    let articles: NewsArticle[] = [];
    let sourceUsed: string = "N/A";
    let primaryError: string | null = null;
    let fallbackError: string | null = null;

    const effectiveQuery = (typeof input.query === "string" && input.query.trim() !== "") ? input.query : undefined;
    const effectiveSources = (typeof input.sources === "string" && input.sources.trim() !== "") ? input.sources : undefined;
    const effectiveCategory = (typeof input.category === "string" && input.category.trim() !== "") ? input.category : "general";
    const effectiveCountry = (typeof input.country === "string" && input.country.trim() !== "") ? input.country : (input.context?.countryCode?.toLowerCase() || appConfig.defaultLocale.split("-")[1]?.toLowerCase() || "us");
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 5 : Math.max(1, Math.min(input.limit, 10));

    const defaultedInput: NewsInput = {
        ...input,
        query: effectiveQuery,
        sources: effectiveSources,
        category: effectiveCategory,
        country: effectiveCountry,
        limit: effectiveLimit,
    };
    const queryInputForStructuredData = { ...defaultedInput };


    if (this.GNEWS_API_KEY) {
      logger.debug(`${logPrefix} Attempting GNews...`);
      const gnewsResult = await this.fetchFromGNews(defaultedInput, abortSignal);
      if (abortSignal?.aborted) return { error: "News check cancelled.", result: "Cancelled." } as ToolOutput;
      if ("error" in gnewsResult) primaryError = `GNews Error: ${gnewsResult.error}`; // Should not happen based on fetchFromGNews returning NewsArticle[]
      else if (gnewsResult.length > 0) { articles = gnewsResult; sourceUsed = "GNews.io"; }
      else primaryError = "GNews returned no results";
    } else {
      logger.debug(`${logPrefix} Skipping GNews (no API key).`); primaryError = "GNews API Key missing";
    }

    if (articles.length === 0 && this.NEWSAPI_ORG_KEY) {
      logger.warn(`${logPrefix} ${primaryError || "Primary provider (GNews) returned no results"}. Falling back to NewsAPI.org...`);
      const newsapiResult = await this.fetchFromNewsAPI(defaultedInput, abortSignal);
      if (abortSignal?.aborted) return { error: "News check cancelled.", result: "Cancelled." } as ToolOutput;
      if ("error" in newsapiResult) fallbackError = `NewsAPI.org Error: ${newsapiResult.error}`; // Should not happen
      else if (newsapiResult.length > 0) { articles = newsapiResult; sourceUsed = "NewsAPI.org"; primaryError = null; }
      else fallbackError = "NewsAPI.org returned no results";
    } else if (articles.length === 0 && !this.NEWSAPI_ORG_KEY) {
      logger.warn(`${logPrefix} ${primaryError || "Primary provider returned no results"}. Cannot fallback (NewsAPI.org key missing).`);
      fallbackError = "NewsAPI.org key missing";
    }

    let outputStructuredData: NewsArticleList = {
      result_type: "news_articles", source_api: "none", query: queryInputForStructuredData, articles: [], error: undefined,
    };

    if (articles.length === 0) {
      const errorMsg = `No news found. ${primaryError ? `Primary (${primaryError}). ` : ""}${fallbackError ? `Fallback (${fallbackError}).` : ""}`.trim();
      logger.warn(`${logPrefix} No articles found. ${errorMsg}`);
      outputStructuredData.error = errorMsg || "No results from any news provider.";
      outputStructuredData.source_api = "none";
      return { result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't find any relevant news headlines right now.`, structuredData: outputStructuredData, error: outputStructuredData.error } as ToolOutput;
    }

    logger.info(`${logPrefix} Found ${articles.length} articles via ${sourceUsed}.`);
    const headlineSummaries = articles.slice(0, effectiveLimit).map((a, i) => `${i + 1}. ${a.title} (${a.sourceName})`);
    const resultString = `Top news headlines for ${input.context?.userName || "User"} from ${sourceUsed}:\n${headlineSummaries.join("\n")}`;
    outputStructuredData = {
      result_type: "news_articles", source_api: sourceUsed.toLowerCase().replace(/[^a-z0-9]/g, ""),
      query: queryInputForStructuredData, articles: articles.slice(0, effectiveLimit), error: undefined,
    };
    return { result: resultString, structuredData: outputStructuredData } as ToolOutput;
  }
}