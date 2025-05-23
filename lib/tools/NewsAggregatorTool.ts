// FILE: lib/tools/NewsAggregatorTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is imported
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { NewsArticle, NewsArticleList } from "@/lib/types";
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';
// Import specific locales as needed
import { enUS, fr as frLocale, es as esLocale, de as deLocale, ja as jaLocale } from 'date-fns/locale'; // Renamed to avoid conflict
import type { Locale as DateFnsLocaleType } from 'date-fns';

// Map of supported locales for date-fns
const dateFnsLocalesMap: { [key: string]: DateFnsLocaleType } = {
  'en': enUS, 'en-us': enUS, 'en-gb': enUS,
  'fr': frLocale, 'fr-fr': frLocale,
  'es': esLocale, 'es-es': esLocale,
  'de': deLocale, 'de-de': deLocale,
  'ja': jaLocale, 'ja-jp': jaLocale
  // Add more mappings as needed
};


interface NewsInput extends ToolInput {
  query?: string;
  sources?: string;
  category?: "business" | "entertainment" | "general" | "health" | "science" | "sports" | "technology";
  country?: string;
  limit?: number;
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
  cacheTTLSeconds = 60 * 15; // 15 minutes

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
  
  private getFaviconUrl(sourceUrl: string): string {
    try {
      const url = new URL(sourceUrl);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`; 
    } catch {
      return ""; 
    }
  }

  private async fetchFromGNews(input: NewsInput, abortSignal?: AbortSignal): Promise<NewsArticle[]> {
    if (!this.GNEWS_API_KEY) return [];
    const { query } = input;
    const effectiveCategory = (input.category === null || input.category === undefined) ? "general" : input.category;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 5 : Math.max(1, Math.min(input.limit, 10));
    const country = input.country || input.context?.countryCode?.toLowerCase() || appConfig.defaultLocale.split("-")[1]?.toLowerCase() || "us";
    const langCode = (input.lang?.split("-")[0] || input.context?.locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en").toLowerCase();

    const params = new URLSearchParams({ token: this.GNEWS_API_KEY, country, lang: langCode, max: String(effectiveLimit) });
    let url = "";

    if (query) {
        url = `${this.GNEWS_API_BASE}/search`;
        params.set("q", query);
        if (effectiveCategory !== "general") params.set("topic", effectiveCategory); 
    } else { 
        url = `${this.GNEWS_API_BASE}/top-headlines`;
        params.set("topic", effectiveCategory);
    }
    url += `?${params.toString()}`;

    this.log("info", `[NewsAggregatorTool GNews] Fetching from: ${url.replace(this.GNEWS_API_KEY, "***KEY***")}`);
    try {
        const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(7000) });
        if (!response.ok) { this.log("warn", `[NewsAggregatorTool GNews] API error: ${response.status}`); return []; }
        const data = await response.json() as any; 
        return (data.articles || []).map((article: any): NewsArticle => ({
            title: article.title,
            description: article.description ?? null,
            url: article.url,
            sourceName: article.source?.name || "GNews.io",
            publishedAt: article.publishedAt ?? null,
            imageUrl: article.image ?? null,
            sourceFavicon: this.getFaviconUrl(article.source?.url || article.url),
        }));
    } catch (e:any) {
        if (e.name !== 'AbortError') this.log("error", "[NewsAggregatorTool GNews] Fetch exception:", e.message);
        return [];
    }
  }

  private async fetchFromNewsAPI(input: NewsInput, abortSignal?: AbortSignal): Promise<NewsArticle[]> {
    if (!this.NEWSAPI_ORG_KEY) return [];
    const { query, sources } = input;
    const effectiveCategory = (input.category === null || input.category === undefined) ? "general" : input.category;
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 5 : Math.max(1, Math.min(input.limit, 10));
    const country = input.country || input.context?.countryCode?.toLowerCase() || appConfig.defaultLocale.split("-")[1]?.toLowerCase() || "us";
    const langCode = (input.lang?.split("-")[0] || input.context?.locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en").toLowerCase();

    const params = new URLSearchParams({ apiKey: this.NEWSAPI_ORG_KEY, pageSize: String(effectiveLimit) });
    let url = "";

    if (query) { 
        params.set("q", query);
        if (sources) { 
            url = `${this.NEWSAPI_ORG_BASE}/everything`;
            params.set("sources", sources);
            if (params.has("language")) params.delete("language"); // Sources param overrides language/country/category for NewsAPI
        } else { 
            url = `${this.NEWSAPI_ORG_BASE}/${query ? 'everything' : 'top-headlines'}`; // Use 'everything' if query, 'top-headlines' otherwise
            if (!query && effectiveCategory !== "general") params.set("category", effectiveCategory);
            if (!query) params.set("country", country); 
            params.set("language", langCode);
        }
    } else if (sources) { 
        url = `${this.NEWSAPI_ORG_BASE}/top-headlines`;
        params.set("sources", sources);
    } else { 
        url = `${this.NEWSAPI_ORG_BASE}/top-headlines`;
        params.set("country", country);
        if (effectiveCategory !== "general") params.set("category", effectiveCategory);
    }
    url += `?${params.toString()}`;

    this.log("info", `[NewsAggregatorTool NewsAPI] Fetching from: ${url.replace(this.NEWSAPI_ORG_KEY, "***KEY***")}`);
    try {
        const response = await fetch(url, { headers: { "User-Agent": this.USER_AGENT }, signal: abortSignal ?? AbortSignal.timeout(7000) });
        if (!response.ok) { this.log("warn", `[NewsAggregatorTool NewsAPI] API error: ${response.status}`); return []; }
        const data = await response.json() as any; 
        return (data.articles || []).map((article: any): NewsArticle => ({
            title: article.title,
            description: article.description ?? null,
            url: article.url,
            sourceName: article.source?.name || "NewsAPI.org",
            publishedAt: article.publishedAt ?? null,
            imageUrl: article.urlToImage ?? null,
            sourceFavicon: this.getFaviconUrl(article.url), // Derive from article URL
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
    const userNameForResponse = input.context?.userName || "friend";

    const effectiveQuery = (typeof input.query === "string" && input.query.trim() !== "") ? input.query : undefined;
    const effectiveSources = (typeof input.sources === "string" && input.sources.trim() !== "") ? input.sources : undefined;
    const effectiveCategory = (typeof input.category === "string" && input.category.trim() !== "" && input.category !== null) ? input.category : "general";
    const effectiveCountry = (typeof input.country === "string" && input.country.trim() !== "") ? input.country : (input.context?.countryCode?.toLowerCase() || appConfig.defaultLocale.split("-")[1]?.toLowerCase() || "us");
    const effectiveLimit = (input.limit === null || input.limit === undefined) ? 5 : Math.max(1, Math.min(input.limit, 10));
    const userLocaleKey = (input.context?.locale || 'en-US').split('-')[0].toLowerCase();
    const dateFnsLocale = dateFnsLocalesMap[userLocaleKey] || enUS;


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
      if (gnewsResult.length > 0) { articles = gnewsResult; sourceUsed = "GNews.io"; }
      else primaryError = "GNews returned no results";
    } else {
      logger.debug(`${logPrefix} Skipping GNews (no API key).`); primaryError = "GNews API Key missing";
    }

    if (articles.length === 0 && this.NEWSAPI_ORG_KEY) {
      logger.warn(`${logPrefix} ${primaryError || "Primary provider (GNews) returned no results"}. Falling back to NewsAPI.org...`);
      const newsapiResult = await this.fetchFromNewsAPI(defaultedInput, abortSignal);
      if (abortSignal?.aborted) return { error: "News check cancelled.", result: "Cancelled." } as ToolOutput;
      if (newsapiResult.length > 0) { articles = newsapiResult; sourceUsed = "NewsAPI.org"; primaryError = null; }
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
      return { result: `Sorry, ${userNameForResponse}, Minato couldn't find any relevant news headlines for you right now.`, structuredData: outputStructuredData, error: outputStructuredData.error } as ToolOutput;
    }

    logger.info(`${logPrefix} Found ${articles.length} articles via ${sourceUsed}.`);
    const topArticlesForSummary = articles.slice(0, Math.min(3, effectiveLimit));
    let resultString = `Okay ${userNameForResponse}, I found some news from ${sourceUsed} for you. `;
    if (topArticlesForSummary.length > 0) {
      resultString += `Here are the top headlines:\n`;
      resultString += topArticlesForSummary.map((a, i) => {
        const publishedAgo = a.publishedAt ? `(${formatDistanceToNowStrict(parseISO(a.publishedAt), { addSuffix: true, locale:dateFnsLocale })})` : "";
        return `${i + 1}. "${a.title}" from ${a.sourceName} ${publishedAgo}`;
      }).join("\n");
      if (articles.length > topArticlesForSummary.length) {
        resultString += `\n...and ${articles.length - topArticlesForSummary.length} more. I can show you the full list.`;
      }
    } else { 
        resultString = `Minato found ${articles.length} articles from ${sourceUsed}, ${userNameForResponse}. You can see them in the card.`;
    }
    
    outputStructuredData = {
      result_type: "news_articles", source_api: sourceUsed.toLowerCase().replace(/[^a-z0-9]/g, ""),
      query: queryInputForStructuredData, articles: articles.slice(0, effectiveLimit), error: undefined,
    };
    return { result: resultString, structuredData: outputStructuredData } as ToolOutput;
  }
}