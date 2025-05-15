// FILE: lib/tools/WebSearchTool.ts
import { BaseTool, ToolInput, ToolOutput } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  CachedAnswerBox,
  CachedKnowledgeGraph,
  CachedProduct,
  CachedProductList,
  CachedRecipe,
  CachedSingleRecipe,
  CachedSingleWebResult,
  CachedTikTokVideo,
  CachedVideoList,
  CachedWebSnippet,
  AnyToolStructuredData,
  // Assurez-vous que ces types sont correctement définis dans @/lib/types/index
} from "@/lib/types/index";

interface WebSearchInput extends ToolInput {
  query: string;
  mode: "product_search" | "tiktok_search" | "fallback_search";
  minPrice?: number;
  maxPrice?: number;
  color?: string;
  brand?: string;
  location?: string;
  language?: string;
}

interface SerperOrganicResult {
  price?: any;
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
  imageUrl?: string;
  attributes?: Record<string, any>;
  source?: string;
}
interface SerperNewsResult {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  source?: string;
  imageUrl?: string;
  position?: number;
}
interface SerperVideoResult {
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
  source?: string;
  imageUrl?: string;
  duration?: string;
  position?: number;
  channel?: string;
  videoUrl?: string;
}
interface SerperRecipeResult {
  title?: string;
  link?: string;
  source?: string;
  rating?: number | string;
  ratingCount?: number | string;
  ingredients?: string[];
  totalTime?: string;
  imageUrl?: string;
  position?: number;
}
interface SerperShoppingResult {
  title?: string;
  link?: string;
  source?: string;
  price?: number;
  priceString?: string;
  rating?: number | string;
  reviews?: number | string;
  imageUrl?: string;
  position?: number;
  delivery?: string;
  offers?: string;
  productId?: string;
  attributes?: Record<string, any>;
  currency?: string;
}
interface SerperAnswerBox {
  answer?: string;
  snippet?: string;
  snippetHighlighted?: string[];
  title?: string;
  link?: string;
}
interface SerperKnowledgeGraph {
  title?: string;
  type?: string;
  description?: string;
  imageUrl?: string;
  attributes?: Record<string, string>;
  link?: string;
  source?: string;
}
interface SerperRelatedSearch {
  query: string;
}
interface SerperResponse {
  searchParameters?: { q: string; gl?: string; hl?: string; type?: string };
  answerBox?: SerperAnswerBox;
  knowledgeGraph?: SerperKnowledgeGraph;
  organic?: SerperOrganicResult[];
  news?: SerperNewsResult[];
  videos?: SerperVideoResult[];
  recipes?: SerperRecipeResult[];
  shopping?: SerperShoppingResult[];
  relatedSearches?: SerperRelatedSearch[];
}

export class WebSearchTool extends BaseTool {
  name = "WebSearchTool";
  description =
    "Performs web searches using Serper API. Operates in three modes: 'product_search' for finding specific products online, 'tiktok_search' for finding TikTok videos, and 'fallback_search' for general information, current events, or when specialized tools fail.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "The keywords, question, or product name to search for.",
      },
      mode: {
        type: "string",
        enum: ["product_search", "tiktok_search", "fallback_search"],
        description:
          "The type of search: 'product_search', 'tiktok_search', or 'fallback_search'.",
      },
      location: {
        type: "string",
        description:
          "Optional: Two-letter country code (e.g., 'us', 'gb', 'fr') for localization.",
      },
      language: {
        type: "string",
        description:
          "Optional: Two-letter language code (e.g., 'en', 'es', 'fr').",
      },
      minPrice: {
        type: "number",
        description: "Optional: Minimum price filter (product search).",
      },
      maxPrice: {
        type: "number",
        description: "Optional: Maximum price filter (product search).",
      },
      color: {
        type: "string",
        description: "Optional: Color filter (product search).",
      },
      brand: {
        type: "string",
        description: "Optional: Brand filter (product search).",
      },
    },
    required: ["query", "mode"],
  };
  cacheTTLSeconds = 60 * 15;

  private readonly API_KEY: string;
  private readonly SERPER_API_URL = "https://google.serper.dev/search";
  private readonly USER_AGENT = "MinatoAICompanion/1.0";

  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys.serper || "";
    if (!this.API_KEY) {
      this.log(
        "error",
        "Serper API Key (SERPER_API_KEY) is missing. WebSearchTool will not function."
      );
    }
  }

  private parsePrice(priceString?: string | number | null): {
    price: number | null;
    currency: string | null;
  } {
    if (typeof priceString === "number") {
      return { price: priceString, currency: null };
    }
    if (!priceString || typeof priceString !== "string") {
      return { price: null, currency: null };
    }
    const cleaned = priceString.replace(/,/g, "");
    // Correction de la regex pour la concaténation
    const priceRegex = new RegExp(
      `(?:([$€£¥])\\s?(\\d+(?:\\.\\d{1,2})?))` + // Symbole avant valeur
        `|(?:(\\d+(?:\\.\\d{1,2})?)\\s?([$€£¥]))` + // Valeur avant symbole
        `|(?:(USD|EUR|GBP|JPY|CAD|AUD)\\s?(\\d+(?:\\.\\d{1,2})?))` + // Code devise avant valeur
        `|(?:(\\d+(?:\\.\\d{1,2})?)\\s?(USD|EUR|GBP|JPY|CAD|AUD))`, // Valeur avant code devise
      "i"
    );
    const match = cleaned.match(priceRegex);

    if (match) {
      let valueStr: string | undefined;
      let symbolOrCode: string | undefined;
      if (match[1] && match[2]) {
        symbolOrCode = match[1];
        valueStr = match[2];
      } else if (match[3] && match[4]) {
        valueStr = match[3];
        symbolOrCode = match[4];
      } else if (match[5] && match[6]) {
        symbolOrCode = match[5];
        valueStr = match[6];
      } else if (match[7] && match[8]) {
        valueStr = match[7];
        symbolOrCode = match[8];
      }

      if (valueStr) {
        const value = parseFloat(valueStr);
        let currency: string | null = null;
        if (symbolOrCode) {
          const upperSymbolOrCode = symbolOrCode.toUpperCase();
          if (["$", "USD"].includes(upperSymbolOrCode)) currency = "USD";
          else if (["€", "EUR"].includes(upperSymbolOrCode)) currency = "EUR";
          else if (["£", "GBP"].includes(upperSymbolOrCode)) currency = "GBP";
          else if (["¥", "JPY"].includes(upperSymbolOrCode)) currency = "JPY";
          else if (["CAD", "AUD"].includes(upperSymbolOrCode))
            currency = upperSymbolOrCode;
          else
            currency =
              upperSymbolOrCode.length === 3 ? upperSymbolOrCode : null;
        }
        return { price: value, currency };
      }
    }
    const directParse = parseFloat(cleaned);
    return !isNaN(directParse)
      ? { price: directParse, currency: null }
      : { price: null, currency: null };
  }

  private extractProductData(item: SerperShoppingResult): CachedProduct {
    const { price, currency } = this.parsePrice(item.priceString || item.price);
    const ratingSource =
      item.rating ?? item.attributes?.rating ?? item.attributes?.Rating ?? null;
    const reviewsSource =
      item.reviews ??
      item.attributes?.reviews ??
      item.attributes?.Reviews ??
      null;

    const rating =
      typeof ratingSource === "number"
        ? ratingSource
        : typeof ratingSource === "string"
        ? parseFloat(ratingSource)
        : null;
    const ratingCount =
      typeof reviewsSource === "number"
        ? reviewsSource
        : typeof reviewsSource === "string"
        ? parseInt(reviewsSource.replace(/\D/g, ""), 10)
        : null;

    return {
      result_type: "product", // Ajout du result_type
      source_api: "serper_shopping", // Ajout source_api
      title: item.title || "Unknown Product",
      price: price,
      currency: item.currency || currency || null,
      source: item.source || "Unknown Retailer",
      link: item.link || "#",
      imageUrl: item.imageUrl || null,
      rating: isNaN(Number(rating)) ? null : Number(rating),
      ratingCount: isNaN(Number(ratingCount)) ? null : Number(ratingCount),
      delivery: item.delivery || item.attributes?.delivery || null,
      offers: item.offers || item.attributes?.offers || null,
      productId: item.productId || item.attributes?.product_id || null,
      // query: item.query // 'query' n'est pas sur SerperShoppingResult, il sera sur le parent CachedProductList
    };
  }

  private extractTikTokVideoData(item: SerperVideoResult): CachedTikTokVideo {
    let tiktokId: string | undefined;
    if (item.link?.includes("tiktok.com") && item.link.includes("/video/")) {
      try {
        const url = new URL(item.link);
        const pathParts = url.pathname.split("/");
        const videoIdIndex = pathParts.indexOf("video");
        if (videoIdIndex !== -1 && pathParts.length > videoIdIndex + 1) {
          tiktokId = pathParts[videoIdIndex + 1];
        }
      } catch (e: any) {
        // Type 'any' pour l'erreur
        this.log("warn", `Could not parse TikTok URL: ${item.link}`, e.message);
      }
    }
    return {
      result_type: "tiktok_video", // Ajout du result_type
      source_api: "serper_tiktok", // Ajout source_api
      videoId: tiktokId,
      title: item.title || null,
      description: item.snippet || null,
      channel: item.channel || null,
      date: item.date || null,
      thumbnailUrl: item.imageUrl || null,
      videoUrl: item.link || "#",
      source: "TikTok", // Spécifique à TikTok
      duration: item.duration || null,
      // query: item.query // 'query' n'est pas sur SerperVideoResult, il sera sur le parent CachedVideoList
    };
  }

  private extractFallbackAnswer(data: SerperResponse | null): {
    resultText?: string | null;
    extractedData?:
      | CachedWebSnippet
      | CachedAnswerBox
      | CachedKnowledgeGraph
      | CachedSingleRecipe["recipe"]
      | null; // Ajuster pour CachedRecipe
    resultType?:
      | "web_snippet"
      | "answerBox"
      | "knowledgeGraph"
      | "recipe"
      | null;
    sourceApi?: string | null;
  } {
    if (!data)
      return {
        resultText: null,
        extractedData: null,
        resultType: null,
        sourceApi: null,
      };
    const query = data.searchParameters?.q || "your query";

    if (data.answerBox && (data.answerBox.answer || data.answerBox.snippet)) {
      const text =
        data.answerBox.answer ||
        data.answerBox.snippet ||
        "No answer provided.";
      this.log(
        "debug",
        `[WebSearchTool Fallback] Using Answer Box: ${text.substring(0, 50)}...`
      );
      const structured: CachedAnswerBox = {
        result_type: "answerBox",
        source_api: "serper_answerbox",
        answer: data.answerBox.answer,
        snippet: data.answerBox.snippet,
        title: data.answerBox.title,
        link: data.answerBox.link,
        sourcePlatform: "serper_answerbox",
      };
      return {
        resultText: text,
        extractedData: structured,
        resultType: "answerBox",
        sourceApi: "serper_answerbox",
      };
    }
    if (data.knowledgeGraph?.description) {
      this.log(
        "debug",
        `[WebSearchTool Fallback] Using Knowledge Graph: ${data.knowledgeGraph.title}`
      );
      const kgData: CachedKnowledgeGraph = {
        result_type: "knowledgeGraph",
        source_api: "serper_kg",
        title: data.knowledgeGraph.title,
        type: data.knowledgeGraph.type,
        description: data.knowledgeGraph.description,
        imageUrl: data.knowledgeGraph.imageUrl,
        attributes: data.knowledgeGraph.attributes,
        link: data.knowledgeGraph.link,
        source: data.knowledgeGraph.source,
        sourcePlatform: "serper_kg",
      };
      const resultText = `${data.knowledgeGraph.title || "Information"} from ${
        data.knowledgeGraph.source || "the web"
      }: ${data.knowledgeGraph.description}`;
      return {
        resultText: resultText,
        extractedData: kgData,
        resultType: "knowledgeGraph",
        sourceApi: "serper_kg",
      };
    }
    if (data.recipes && data.recipes.length > 0) {
      const recipe = data.recipes[0];
      this.log(
        "debug",
        `[WebSearchTool Fallback] Using Recipe: ${recipe.title}`
      );
      const readyInMinutes = recipe.totalTime
        ? parseInt(recipe.totalTime.replace(/\D/g, ""), 10) || null
        : null;
      const recipeData: CachedRecipe = {
        // Ceci est la structure de CachedRecipe, pas CachedSingleRecipe
        result_type: "recipe_detail", // Type interne de CachedRecipe
        source_api: "serper_recipes",
        title: recipe.title || "Recipe",
        sourceName: recipe.source || null,
        sourceUrl: recipe.link || "#",
        imageUrl: recipe.imageUrl || null,
        ingredients: recipe.ingredients,
        readyInMinutes: readyInMinutes,
        query: query,
        error: undefined,
        // Ajoutez d'autres champs de CachedRecipe si nécessaire (servings, category, etc.)
      };
      const resultText = `Found a recipe for ${recipe.title || query} from ${
        recipe.source || "a source"
      }.`;
      return {
        resultText: resultText,
        extractedData: recipeData,
        resultType: "recipe",
        sourceApi: "serper_recipes",
      };
    }
    if (data.organic && data.organic.length > 0 && data.organic[0].snippet) {
      const organic = data.organic[0];
      this.log(
        "debug",
        `[WebSearchTool Fallback] Using Organic Snippet: ${organic.title}`
      );
      const snippetData: CachedWebSnippet = {
        result_type: "web_snippet",
        source_api: "serper_organic",
        title: organic.title || null,
        link: organic.link || null,
        snippet: organic.snippet || "",
        source: "serper_organic", // La source du snippet est 'serper_organic'
      };
      const resultText = `According to a web result from ${
        organic.source || "the web"
      }: ${organic.snippet}`;
      return {
        resultText: resultText,
        extractedData: snippetData,
        resultType: "web_snippet",
        sourceApi: "serper_organic",
      };
    }
    if (data.news && data.news.length > 0 && data.news[0].snippet) {
      const news = data.news[0];
      this.log(
        "debug",
        `[WebSearchTool Fallback] Using News Snippet: ${news.title}`
      );
      const snippetData: CachedWebSnippet = {
        result_type: "web_snippet",
        source_api: "serper_news",
        title: news.title || null,
        link: news.link || null,
        snippet: news.snippet || "",
        source: "serper_news", // La source du snippet est 'serper_news'
      };
      const resultText = `From a recent news article by ${
        news.source || "a source"
      }: ${news.snippet}`;
      return {
        resultText: resultText,
        extractedData: snippetData,
        resultType: "web_snippet",
        sourceApi: "serper_news",
      };
    }
    if (
      data.organic &&
      data.organic.length > 0 &&
      data.organic[0].title &&
      data.organic[0].link
    ) {
      const fallbackOrganic = data.organic[0];
      this.log(
        "debug",
        `[WebSearchTool Fallback] Using Organic Title/Link only: ${fallbackOrganic.title}`
      );
      const fallbackSnippet: CachedWebSnippet = {
        result_type: "web_snippet",
        source_api: "serper_organic",
        title: fallbackOrganic.title || null,
        link: fallbackOrganic.link || null,
        snippet:
          "No specific summary found, but this result might be relevant.",
        source: "serper_organic",
      };
      return {
        resultText: `I found a potentially relevant page titled "${fallbackOrganic.title}". I couldn't extract a direct summary.`,
        extractedData: fallbackSnippet,
        resultType: "web_snippet",
        sourceApi: "serper_organic",
      };
    }
    this.log(
      "warn",
      `[WebSearchTool Fallback] Query:"${query}" - No suitable answer/snippet extracted.`
    );
    return {
      resultText: null,
      extractedData: null,
      resultType: null,
      sourceApi: null,
    };
  }

  async execute(
    input: WebSearchInput,
    abortSignal?: AbortSignal
  ): Promise<ToolOutput> {
    const {
      query,
      mode,
      location,
      language,
      minPrice,
      maxPrice,
      color,
      brand,
    } = input;
    const logPrefix = `[WebSearchTool Mode:${mode}] Query:"${query.substring(
      0,
      50
    )}..."`;

    if (abortSignal?.aborted) {
      logger.warn(`${logPrefix} Execution aborted before starting.`);
      return {
        error: "Web Search cancelled.",
        result: "Cancelled.",
        structuredData: undefined,
      };
    }
    if (!this.API_KEY) {
      this.log("error", `${logPrefix} FAILED - API Key missing.`);
      return {
        error: "Web Search Tool is not configured.",
        result: "Sorry, I cannot perform web searches right now.",
        structuredData: undefined,
      };
    }
    if (!query?.trim()) {
      this.log("warn", `${logPrefix} FAILED - Empty query.`);
      return {
        error: "Missing or empty search query.",
        result: "What exactly should I search the web for?",
        structuredData: undefined,
      };
    }
    if (
      !["product_search", "tiktok_search", "fallback_search"].includes(mode)
    ) {
      this.log("error", `${logPrefix} FAILED - Invalid mode '${mode}'.`);
      return {
        error: "Invalid mode specified.",
        result:
          "I need to know whether to search for products, TikToks, or general information.",
        structuredData: undefined,
      };
    }

    const requestBody: Record<string, any> = { q: query.trim() };
    const langCode =
      language?.split("-")[0].toLowerCase() ||
      input.context?.locale?.split("-")[0] ||
      "en";
    const countryCode =
      location?.toUpperCase() ||
      input.context?.countryCode?.toUpperCase() ||
      "us";
    requestBody.hl = langCode;
    requestBody.gl = countryCode;
    this.log(
      "info",
      `${logPrefix} Using lang:${langCode}, country:${countryCode}`
    );

    let refinedQuery = query.trim();
    if (mode === "product_search") {
      let prefix = "buy";
      if (brand) prefix += ` ${brand}`;
      if (color) prefix += ` ${color}`;
      refinedQuery = `${prefix} ${refinedQuery}`;
      if (minPrice !== undefined && minPrice > 0)
        refinedQuery += ` min price ${minPrice}`;
      if (maxPrice !== undefined && maxPrice > (minPrice ?? 0))
        refinedQuery += ` max price ${maxPrice}`;
      requestBody.q = refinedQuery.replace(/\s+/g, " ").trim();
      requestBody.tbs = `mr:1,price:1,ppr_min:${minPrice || ""},ppr_max:${
        maxPrice || ""
      }`;
      this.log(
        "info",
        `${logPrefix} Product search refined query: "${requestBody.q.substring(
          0,
          70
        )}..."`
      );
    } else if (mode === "tiktok_search") {
      refinedQuery = `${refinedQuery} site:tiktok.com`;
      requestBody.q = refinedQuery.replace(/\s+/g, " ").trim();
      requestBody.type = "videos"; // Serper specific param for video search
      this.log(
        "info",
        `${logPrefix} TikTok search query: "${requestBody.q.substring(
          0,
          70
        )}..."`
      );
    } else {
      this.log("info", `${logPrefix} Executing general fallback search.`);
    }

    try {
      this.log(
        "debug",
        `${logPrefix} Sending request to Serper API: ${this.SERPER_API_URL}`
      );
      const response = await fetch(this.SERPER_API_URL, {
        method: "POST",
        headers: {
          "X-API-KEY": this.API_KEY,
          "Content-Type": "application/json",
          "User-Agent": this.USER_AGENT,
        },
        body: JSON.stringify(requestBody),
        signal: abortSignal ?? AbortSignal.timeout(10000),
      });

      if (abortSignal?.aborted) {
        logger.warn(`${logPrefix} Aborted after API call.`);
        return {
          error: "Web Search cancelled.",
          result: "Cancelled.",
          structuredData: undefined,
        };
      }

      if (!response.ok) {
        let errorDetail = `Serper API request failed: ${response.status} ${response.statusText}.`;
        let errorBodyText = await response.text();
        try {
          const errorBody = JSON.parse(errorBodyText);
          errorDetail += ` Message: ${
            errorBody?.message || JSON.stringify(errorBody)
          }`;
        } catch {
          errorDetail += ` Raw Body: ${errorBodyText.substring(0, 200)}`; // Limiter la taille du raw body
        }
        this.log("error", `${logPrefix} ${errorDetail}`);
        let userResultMessage = "Sorry, the web search encountered an error.";
        if (response.status === 401 || response.status === 403)
          userResultMessage =
            "Sorry, I cannot perform web searches right now due to an authorization issue.";
        else if (response.status === 429)
          userResultMessage =
            "Sorry, the web search service is temporarily unavailable (rate limit).";
        else if (response.status >= 500)
          userResultMessage =
            "Sorry, the web search service seems to be having internal issues.";
        return {
          error: errorDetail,
          result: userResultMessage,
          structuredData: undefined,
        };
      }

      const data: SerperResponse = (await response.json()) as SerperResponse;
      this.log(
        "debug",
        `${logPrefix} Received ${response.status} response from Serper API.`
      );

      if (mode === "product_search") {
        const products = data.shopping;
        const organicProducts = data.organic?.filter(
          (p) => p.price || p.attributes?.price
        );
        let allProductResults: SerperShoppingResult[] = products || [];
        if (
          allProductResults.length === 0 &&
          organicProducts &&
          organicProducts.length > 0
        ) {
          this.log(
            "info",
            `${logPrefix} No direct shopping results, adapting ${organicProducts.length} organic results.`
          );
          allProductResults = organicProducts.map(
            (o) =>
              ({
                title: o.title,
                link: o.link,
                source:
                  o.source || (o.link ? new URL(o.link).hostname : "Unknown"),
                priceString: o.attributes?.price || o.price?.toString(),
                imageUrl: o.imageUrl,
                position: o.position,
              } as SerperShoppingResult)
          );
        }

        let outputData: CachedProductList = {
          result_type: "product_list",
          source_api: "serper_shopping",
          query: input,
          products: [],
          error: undefined,
        };
        if (allProductResults.length === 0) {
          this.log("info", `${logPrefix} No usable product results found.`);
          return {
            result: `I couldn't find specific products matching "${query}" with those criteria. Perhaps broaden the search?`,
            structuredData: outputData,
          };
        }

        this.log(
          "info",
          `${logPrefix} Found ${allProductResults.length} potential product results.`
        );
        const extractedProducts: CachedProduct[] = allProductResults
          .map((p) => this.extractProductData(p))
          .filter((p): p is CachedProduct => !!(p.title && p.link)); // Type guard
        if (extractedProducts.length === 0) {
          this.log(
            "warn",
            `${logPrefix} Failed to extract valid structured product data.`
          );
          outputData.error = "Failed to process product details";
          return {
            result: `I found some potential matches for "${query}", but had trouble processing the details.`,
            structuredData: outputData,
          };
        }
        const prelimResult = `Okay, I found ${extractedProducts.length} product(s) matching your search for "${query}".`;
        outputData.products = extractedProducts;
        outputData.error = undefined;
        return { result: prelimResult, structuredData: outputData };
      } else if (mode === "tiktok_search") {
        const videos = data.videos?.filter((v) =>
          v.link?.includes("tiktok.com")
        );
        let outputData: CachedVideoList = {
          result_type: "tiktok_video",
          source_api: "serper_tiktok",
          query: input,
          videos: [],
          error: undefined,
        };
        if (!videos || videos.length === 0) {
          this.log("info", `${logPrefix} No TikTok videos found for query.`);
          return {
            result: `I couldn't find any TikTok videos matching "${query}".`,
            structuredData: outputData,
          };
        }
        this.log(
          "info",
          `${logPrefix} Found ${videos.length} potential TikTok videos.`
        );
        const extractedVideos: CachedTikTokVideo[] = videos
          .map((v) => this.extractTikTokVideoData(v))
          .filter((v): v is CachedTikTokVideo => !!v.videoId); // Ensure videoId is present

        const prelimResult = `Okay, I found ${extractedVideos.length} TikTok video(s) related to "${query}".`;
        outputData.videos = extractedVideos;
        outputData.error = undefined;
        return { result: prelimResult, structuredData: outputData };
      } else {
        // fallback_search
        const { resultText, extractedData, resultType, sourceApi } =
          this.extractFallbackAnswer(data);
        if (!resultText || !extractedData || !resultType) {
          this.log(
            "info",
            `${logPrefix} No direct answer or relevant snippet found.`
          );
          const related = data.relatedSearches?.map((r) => r.query).join(", ");
          const fallbackMsg = `I searched for "${query}" but couldn't find a direct answer or summary.${
            related ? ` Related searches include: ${related}` : ""
          }`;
          return { result: fallbackMsg, structuredData: undefined };
        }
        this.log(
          "info",
          `${logPrefix} Found fallback answer/snippet. Type: ${resultType}`
        );

        let finalStructuredOutput: AnyToolStructuredData;
        if (resultType === "recipe" && extractedData) {
          finalStructuredOutput = {
            result_type: "recipe", // This will be the type for CachedSingleRecipe
            source_api: sourceApi || "serper_recipes",
            query: input,
            recipe: extractedData as CachedRecipe, // extractedData is CachedRecipe here
            error: undefined,
          } as CachedSingleRecipe;
        } else if (
          (resultType === "answerBox" ||
            resultType === "knowledgeGraph" ||
            resultType === "web_snippet") &&
          extractedData
        ) {
          finalStructuredOutput = {
            result_type: resultType as
              | "answerBox"
              | "knowledgeGraph"
              | "web_snippet",
            source_api: sourceApi || "serper_general",
            query: input,
            data: extractedData as
              | CachedWebSnippet
              | CachedAnswerBox
              | CachedKnowledgeGraph,
            error: undefined,
          } as CachedSingleWebResult;
        } else {
          logger.warn(
            `${logPrefix} Unexpected fallback result type or missing data: ${resultType}`
          );
          return { result: resultText, structuredData: undefined };
        }
        return { result: resultText, structuredData: finalStructuredOutput };
      }
    } catch (error: any) {
      const errorMessage = `Web search failed: ${error.message}`;
      let responseStructuredData: AnyToolStructuredData;

      // S'assurer que la structure de l'erreur correspond au type attendu pour chaque mode
      if (mode === "product_search")
        responseStructuredData = {
          result_type: "product_list",
          source_api: "serper_shopping",
          query: input,
          products: [],
          error: errorMessage,
        };
      else if (mode === "tiktok_search")
        responseStructuredData = {
          result_type: "tiktok_video",
          source_api: "serper_tiktok",
          query: input,
          videos: [],
          error: errorMessage,
        };
      else
        responseStructuredData = {
          result_type: "web_snippet",
          source_api: "serper_general",
          query: input,
          data: null,
          error: errorMessage,
        } as CachedSingleWebResult; // Cast explicite

      if (error.name === "AbortError") {
        this.log("error", `${logPrefix} Request timed out via AbortSignal.`);
        if (
          responseStructuredData &&
          typeof responseStructuredData === "object" &&
          responseStructuredData !== null
        ) {
          // Vérifier si c'est un objet
          (responseStructuredData as any).error = "Request timed out.";
        }
        return {
          error: "Web search timed out.",
          result: "Sorry, the web search took too long to respond.",
          structuredData: responseStructuredData,
        };
      }
      this.log(
        "error",
        `${logPrefix} Search failed unexpectedly: ${error.message}`,
        error
      );
      return {
        error: errorMessage,
        result:
          "Sorry, I encountered an unexpected problem while searching the web.",
        structuredData: responseStructuredData,
      };
    }
  }
}
