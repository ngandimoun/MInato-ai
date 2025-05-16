import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { NewsArticle, NewsArticleList } from "@/lib/types";

interface NewsInput extends ToolInput {
  query?: string;
  sources?: string | null;
  category?: "business" | "entertainment" | "general" | "health" | "science" | "sports" | "technology" | null;
  country?: string | null;
  limit?: number | null;
}

export class NewsAggregatorTool extends BaseTool {
  name = "NewsAggregatorTool";
  description =
    "Fetches recent news headlines and summaries based on query, category, country, or specific sources. Uses GNews.io and falls back to NewsAPI.org.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: ["string", "null"], description: "Optional. Keywords or phrase to search news for." },
      sources: { type: ["string", "null"], description: "Optional. Comma-separated news source IDs (e.g., 'bbc-news,cnn'). Use this OR category/country/query." },
      category: { type: ["string", "null"], enum: ["business", "entertainment", "general", "health", "science", "sports", "technology"], description: "Optional. Category to fetch news from.", default: "general" },
      country: { type: ["string", "null"], description: "Optional. 2-letter ISO country code (e.g., 'us', 'gb') for top headlines.", default: "us" },
      limit: { type: ["number", "null"], minimum: 1, maximum: 10, description: "Optional. Max articles (default 5).", default: 5 },
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

  private async fetchNews(provider: "gnews" | "newsapi", input: NewsInput, abortSignal?: AbortSignal): Promise<NewsArticle[] | { error: string }> {
    const { query, sources, category, limit } = input;
    const effectiveCategory = category ?? "general";
    const effectiveLimit = limit ?? 5;
    const country = input.country || input.context?.countryCode?.toLowerCase() || appConfig.defaultLocale.split("-")[1]?.toLowerCase() || "us";
    const langCode = (input.lang?.split("-")[0] || input.context?.locale?.split("-")[0] || appConfig.defaultLocale.split("-")[0] || "en").toLowerCase();
    let url = "";
    let apiKey: string | undefined;
    const params = new URLSearchParams();
    const logPrefix = `[NewsAggregatorTool Fetch:${provider}]`;

    if (provider === "gnews") {
      if (!this.GNEWS_API_KEY) return { error: "GNews API Key not configured." };
      apiKey = this.GNEWS_API_KEY;
      params.set("apikey", apiKey);
      params.set("country", country);
      params.set("lang", langCode);
      params.set("max", String(effectiveLimit));
      if (query) {
        url = `${this.GNEWS_API_BASE}/search`; params.set("q", query);
        if (sources) logger.warn(`${logPrefix} 'sources' param ignored for GNews search.`);
        if (effectiveCategory && effectiveCategory !== "general") params.set("topic", effectiveCategory);
      } else {
        url = `${this.GNEWS_API_BASE}/top-headlines`; params.set("topic", effectiveCategory);
        if (sources) logger.warn(`${logPrefix} 'sources' param ignored for GNews top-headlines.`);
      }
    } else if (provider === "newsapi") {
      if (!this.NEWSAPI_ORG_KEY) return { error: "NewsAPI.org API Key not configured." };
      apiKey = this.NEWSAPI_ORG_KEY;
      params.set("apiKey", apiKey);
      params.set("pageSize", String(effectiveLimit));
      if (query || sources) {
        url = `${this.NEWSAPI_ORG_BASE}/everything`;
        if (query) params.set("q", query);
        if (sources) {
          params.set("sources", sources);
          if (langCode !== "en") logger.warn(`${logPrefix} 'language' param ignored by NewsAPI when 'sources' is used.`);
        }
      }
    }

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": this.USER_AGENT,
        },
        signal: abortSignal,
      });

      if (!response.ok) {
        logger.error(`${logPrefix} HTTP error! status: ${response.status}`);
        return { error: "HTTP error" };
      }

      const data = await response.json();

      if (data.articles) {
        return data.articles.map((article: any) => ({
          title: article.title,
          summary: article.summary,
          url: article.url,
          source: article.source.name,
          publishedAt: article.publishedAt,
          category: article.category,
          country: article.country,
          lang: article.lang,
        }));
      } else {
        logger.error(`${logPrefix} No articles found in response`);
        return { error: "No articles found in response" };
      }
    } catch (error: any) {
      logger.error(`${logPrefix} Fetch error: ${error.message}`);
      return { error: "Fetch error" };
    }
  }

  async execute(input: NewsInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = `[NewsAggregatorTool Exec]`;
    let articles: NewsArticle[] = [];
    let sourceUsed: string = "N/A";
    let primaryError: string | null = null;
    let fallbackError: string | null = null;
    const queryInputForStructuredData = { ...input };

    if (this.GNEWS_API_KEY) {
      logger.debug(`${logPrefix} Attempting GNews...`);
      const gnewsResult = await this.fetchNews("gnews", input, abortSignal);
      if (abortSignal?.aborted) return { error: "News check cancelled.", result: "Cancelled." };
      if ("error" in gnewsResult) primaryError = `GNews Error: ${gnewsResult.error}`;
      else if (gnewsResult.length > 0) { articles = gnewsResult; sourceUsed = "GNews.io"; }
      else primaryError = "GNews returned no results";
    } else {
      logger.debug(`${logPrefix} Skipping GNews (no API key).`); primaryError = "GNews API Key missing";
    }

    if (articles.length === 0 && this.NEWSAPI_ORG_KEY) {
      logger.warn(`${logPrefix} ${primaryError || "Primary provider returned no results"}. Falling back to NewsAPI.org...`);
      const newsapiResult = await this.fetchNews("newsapi", input, abortSignal);
      if (abortSignal?.aborted) return { error: "News check cancelled.", result: "Cancelled." };
      if ("error" in newsapiResult) fallbackError = `NewsAPI.org Error: ${newsapiResult.error}`;
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
      const errorMsg = `No news found for ${input.context?.userName || "User"}. ${primaryError ? `Primary Error (${primaryError}). ` : ""}${fallbackError ? `Fallback Error (${fallbackError}).` : ""}`.trim();
      logger.warn(`${logPrefix} No articles found. ${errorMsg}`);
      outputStructuredData.error = errorMsg || "No results from any news provider.";
      return { result: `Sorry, ${input.context?.userName || "User"}, Minato couldn't find any relevant news headlines right now.`, structuredData: outputStructuredData, error: outputStructuredData.error };
    }

    logger.info(`${logPrefix} Found ${articles.length} articles via ${sourceUsed}.`);
    const headlineSummaries = articles.map((a, i) => `${i + 1}. ${a.title} (${a.sourceName})`);
    const resultString = `Top news headlines for ${input.context?.userName || "User"} from ${sourceUsed}:
${headlineSummaries.join("\n")}`;
    outputStructuredData = {
      result_type: "news_articles", source_api: sourceUsed.toLowerCase().replace(/[^a-z0-9]/g, ""),
      query: queryInputForStructuredData, articles: articles, error: undefined,
    };
    return { result: resultString, structuredData: outputStructuredData };
  }
}