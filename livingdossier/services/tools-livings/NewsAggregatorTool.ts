//livingdossier/services/tools-livings/NewsAggregatorTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is imported
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import { NewsArticle, NewsArticleList } from "@/lib/types";
import { formatDistanceToNowStrict, parseISO, format } from 'date-fns';
// Import specific locales as needed
import { enUS, fr as frLocale, es as esLocale, de as deLocale, ja as jaLocale } from 'date-fns/locale'; // Renamed to avoid conflict
import type { Locale as DateFnsLocaleType } from 'date-fns';
import { generateStructuredJson } from "../providers/llm_clients";
import { SchemaService } from "../services/schemaService";

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
      query: {
        type: ["string", "null"] as const,
        description: "Optional. Keywords or phrase to search news for. If null, will fetch top headlines.",
        default: null
      } as OpenAIToolParameterProperties,
      sources: {
        type: ["string", "null"] as const,
        description: "Optional. Comma-separated news source IDs (e.g., 'bbc-news,cnn'). Must be valid source IDs or 'all'. See NewsAPI docs for full list.",
        pattern: "^(all|([a-z0-9-]+)(,[a-z0-9-]+)*)?$",
        default: "all"
      } as OpenAIToolParameterProperties,
      category: {
        type: ["string", "null"] as const,
        enum: ["business", "entertainment", "general", "health", "science", "sports", "technology", null],
        description: "Optional. Category to fetch news from. If null or omitted, defaults to 'general'.",
        default: "general"
      } as OpenAIToolParameterProperties,
      country: {
        type: ["string", "null"] as const,
        enum: ["us", "gb", "au", "ca", "de", "fr", "it", "es", "ru", "in", "br", "ar", "sa", "ie", "nl", "no", "se", "is", "zh", null],
        description: "Optional. 2-letter ISO country code (e.g., 'us', 'gb'). If null or omitted, defaults to 'us'.",
        default: "us"
      } as OpenAIToolParameterProperties,
      limit: {
        type: ["number", "null"] as const,
        description: "Optional. Maximum number of articles to return (must be between 1 and 10). If null or omitted, defaults to 5.",
        minimum: 1,
        maximum: 10,
        default: 5
      } as OpenAIToolParameterProperties,
    },
    required: ["sources"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 15; // 15 minutes
  categories = ["news", "search", "media"];
  version = "1.0.0";
  metadata = { providers: ["GNews.io", "NewsAPI.org"], supportsCategories: ["business", "entertainment", "general", "health", "science", "sports", "technology"] };

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

    // --- LOGGING: Print query and sources ---
    this.log("info", `[GNews] User query: ${input.query}, Final q: ${query}, Category: ${effectiveCategory}, Sources: ${input.sources}`);

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

    // --- LOGGING: Print query and sources ---
    this.log("info", `[NewsAPI] User query: ${input.query}, Final q: ${query}, Category: ${effectiveCategory}, Sources: ${sources}`);

    if (query) { 
        params.set("q", query);
        if (sources && sources !== "all") { 
            url = `${this.NEWSAPI_ORG_BASE}/everything`;
            params.set("sources", sources);
            if (params.has("language")) params.delete("language"); // Sources param overrides language/country/category for NewsAPI
        } else { 
            url = `${this.NEWSAPI_ORG_BASE}/${query ? 'everything' : 'top-headlines'}`; // Use 'everything' if query, 'top-headlines' otherwise
            if (!query && effectiveCategory !== "general") params.set("category", effectiveCategory);
            if (!query) params.set("country", country); 
            params.set("language", langCode);
        }
    } else if (sources && sources !== "all") { 
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

  private async extractNewsParameters(userInput: string): Promise<Partial<NewsInput>> {
    // Enhanced extraction prompt for News
    const extractionPrompt = `
You are an expert parameter extractor for Minato's NewsAggregatorTool which fetches news headlines and articles.

Given this user query about news: "${userInput.replace(/\"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. NEWS QUERY EXTRACTION:
   - Extract specific search terms if the user is looking for news about a particular topic or entity
   - Focus on the core topic or entity (e.g., "climate change", "Apple", "elections")
   - Only populate query if user is clearly looking for specific topics
   - If query is very generic like "latest news", leave query null and rely on category instead

2. NEWS CATEGORY IDENTIFICATION:
   - Determine if the news falls into one of these specific categories: "business", "entertainment", "general", "health", "science", "sports", "technology"
   - Map user expressions to these categories (e.g., "financial news" → "business", "celebrity gossip" → "entertainment")
   - Default to "general" if no clear category is specified or if request spans multiple categories

3. SOURCE SPECIFICATION:
   - Identify if user mentions specific news sources (e.g., "BBC", "CNN")
   - Format as comma-separated string without spaces (e.g., "bbc-news,cnn")
   - Use "all" if no specific sources mentioned

4. COUNTRY PREFERENCE:
   - Detect if user mentions a specific country for news (use 2-letter ISO code)
   - Map country names to codes (e.g., "United States" → "us", "UK" → "gb", "Japan" → "jp")
   - Look for phrases like "news from China" or "French news"

5. RESULT LIMIT DETERMINATION:
   - Identify how many news items the user wants (1-10)
   - Map expressions like "a few" to 3, "several" to 5, etc.
   - Default to 5 if unspecified

OUTPUT FORMAT: JSON object with these fields:
- "query": (string|null) Search terms for specific topics, or null if browsing categories
- "category": (string|null) One of: "business", "entertainment", "general", "health", "science", "sports", "technology", or null
- "sources": (string|null) Comma-separated source IDs or "all", or null if unspecified
- "country": (string|null) 2-letter country code ("us", "gb", etc.) or null if unspecified
- "limit": (number|null) Number of articles (1-10) or null if unspecified

If a parameter cannot be confidently extracted, set it to null rather than guessing.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      // Define the schema for NewsInput
      const newsParamsSchema = {
        type: "object",
        properties: {
          query: { type: ["string", "null"] },
          category: { 
            type: ["string", "null"], 
            enum: ["business", "entertainment", "general", "health", "science", "sports", "technology", null] 
          },
          sources: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          limit: { type: ["number", "null"] }
        }
      };

      const extractionResult = await generateStructuredJson<Partial<NewsInput>>(
        extractionPrompt,
        userInput,
        newsParamsSchema,
        "NewsAggregatorToolParameters",
        [], // no history context needed
        "gpt-4o-mini"
      );
      
      return extractionResult || {};
    } catch (error) {
      logger.error("[NewsAggregatorTool] Parameter extraction failed:", error);
      return {};
    }
  }

  async execute(input: NewsInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // If input is from natural language, extract parameters
    if (input._rawUserInput && typeof input._rawUserInput === 'string') {
      const extractedParams = await this.extractNewsParameters(input._rawUserInput);
      
      // Only use extracted parameters if they're not already specified
      if (extractedParams.query && input.query === undefined) {
        input.query = extractedParams.query;
      }
      if (extractedParams.category && input.category === undefined) {
        input.category = extractedParams.category;
      }
      if (extractedParams.sources && input.sources === undefined) {
        input.sources = extractedParams.sources;
      }
      if (extractedParams.country && input.country === undefined) {
        input.country = extractedParams.country;
      }
      if (extractedParams.limit && input.limit === undefined) {
        input.limit = extractedParams.limit;
      }
    }

    const logPrefix = `[NewsAggregatorTool Exec]`;
    let articles: NewsArticle[] = [];
    let sourceUsed: string = "N/A";
    let primaryError: string | null = null;
    let fallbackError: string | null = null;
    const userNameForResponse = input.context?.userName || "friend";
    
    // Apply user preferences if available
    if (input.context?.userState?.workflow_preferences) {
      const prefs = input.context.userState.workflow_preferences;
      
      // Apply preferred news sources if user didn't specify any
      if (prefs.newsSources && prefs.newsSources.length > 0 && !input.sources) {
        input.sources = prefs.newsSources.join(',');
        logger.debug(`${logPrefix} Applied user's preferred news sources: ${input.sources}`);
      }
      
      // Apply preferred news category if user didn't specify
      if (prefs.newsPreferredCategories && 
          prefs.newsPreferredCategories.length > 0 && 
          !input.category) {
        // Use the first preferred category
        input.category = prefs.newsPreferredCategories[0] as any;
        logger.debug(`${logPrefix} Applied user's preferred news category: ${input.category}`);
      }
    }

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
    const topNForSummary = Math.min(3, articles.length); // Summarize top 3 or fewer
    const articlesForSummary = articles.slice(0, topNForSummary);
    let narrativeSummary = `Okay ${userNameForResponse}, I found some interesting news about ${input.query || 'the topics you asked about'} from ${sourceUsed}. `;

    if (articlesForSummary.length > 0) {
      if (articlesForSummary.length === 1) {
        const article = articlesForSummary[0];
        narrativeSummary += `Specifically, ${article.sourceName} reports that "${article.title.substring(0,150)}". `;
        if (article.description) {
            narrativeSummary += `It's about: ${article.description.substring(0, 120)}... `;
        }
      } else {
        narrativeSummary += "Here's a quick look: ";
        articlesForSummary.forEach((article, index) => {
          narrativeSummary += `${article.sourceName} mentions "${article.title.substring(0, 70)}..."`;
          if (index < articlesForSummary.length - 1) {
            narrativeSummary += "; ";
          } else {
            narrativeSummary += ". ";
          }
        });
      }
      if (articles.length > topNForSummary) {
        narrativeSummary += `There ${articles.length - topNForSummary === 1 ? 'is' : 'are'} ${articles.length - topNForSummary} more article${articles.length - topNForSummary === 1 ? '' : 's'} in the card.`;
      } else {
        narrativeSummary += `You can see the full details in the card.`;
      }
    } else { // Should not happen if articles.length > 0, but as a fallback
        narrativeSummary = `Minato found ${articles.length} articles from ${sourceUsed}, ${userNameForResponse}. You can see them in the card.`;
    }

    outputStructuredData = {
      result_type: "news_articles", source_api: sourceUsed.toLowerCase().replace(/[^a-z0-9]/g, ""),
      query: queryInputForStructuredData, articles: articles.slice(0, effectiveLimit), error: undefined,
    };
    return { result: narrativeSummary, structuredData: outputStructuredData } as ToolOutput;
  }
}