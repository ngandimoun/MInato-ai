// FILE: lib/tools/WebSearchTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is imported
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  CachedAnswerBox, CachedKnowledgeGraph, CachedProduct, CachedProductList,
  CachedRecipe, CachedSingleRecipe, CachedSingleWebResult, CachedTikTokVideo,
  CachedVideoList, CachedWebSnippet, AnyToolStructuredData, CachedYouTubeVideo,
} from "@/lib/types/index";

interface WebSearchInput extends ToolInput {
  query: string;
  mode: "product_search" | "tiktok_search" | "fallback_search";
  minPrice?: number | null;
  maxPrice?: number | null;
  color?: string | null;
  brand?: string | null;
  location?: string | null;
  language?: string | null;
}

interface SerperOrganicResult { price?: any; title?: string; link?: string; snippet?: string; position?: number; imageUrl?: string; attributes?: Record<string, any>; source?: string; }
interface SerperNewsResult { title?: string; link?: string; snippet?: string; date?: string; source?: string; imageUrl?: string; position?: number; }
interface SerperVideoResult { title?: string; link?: string; snippet?: string; date?: string; source?: string; imageUrl?: string; duration?: string; position?: number; channel?: string; videoUrl?: string; }
interface SerperRecipeResult { title?: string; link?: string; source?: string; rating?: number | string; ratingCount?: number | string; ingredients?: string[]; totalTime?: string; imageUrl?: string; position?: number; }
interface SerperShoppingResult { title?: string; link?: string; source?: string; price?: number; priceString?: string; rating?: number | string; reviews?: number | string; imageUrl?: string; position?: number; delivery?: string; offers?: string; productId?: string; attributes?: Record<string, any>; currency?: string; }
interface SerperAnswerBox { answer?: string; snippet?: string; snippetHighlighted?: string[]; title?: string; link?: string; }
interface SerperKnowledgeGraph { title?: string; type?: string; description?: string; imageUrl?: string; attributes?: Record<string, string>; link?: string; source?: string; }
interface SerperRelatedSearch { query: string; }
interface SerperResponse { searchParameters?: { q: string; gl?: string; hl?: string; type?: string }; answerBox?: SerperAnswerBox; knowledgeGraph?: SerperKnowledgeGraph; organic?: SerperOrganicResult[]; news?: SerperNewsResult[]; videos?: SerperVideoResult[]; recipes?: SerperRecipeResult[]; shopping?: SerperShoppingResult[]; relatedSearches?: SerperRelatedSearch[]; }


export class WebSearchTool extends BaseTool {
  name = "WebSearchTool";
  description =
    "Performs web searches using Serper API. Operates in three modes: 'product_search' for finding specific products online, 'tiktok_search' for finding TikTok videos, and 'fallback_search' for general information, current events, or when specialized tools fail.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "The keywords, question, or product name to search for. This is always required." } as OpenAIToolParameterProperties,
      mode: { type: "string" as const, enum: ["product_search", "tiktok_search", "fallback_search"], description: "The type of search: 'product_search' for products, 'tiktok_search' for TikTok videos, or 'fallback_search' for general web info. This is always required." } as OpenAIToolParameterProperties,
      location: { type: ["string", "null"] as const, description: "Optional: Two-letter country code (e.g., 'us', 'gb', 'fr') for search localization. Provide as string or null for global search." } as OpenAIToolParameterProperties,
      language: { type: ["string", "null"] as const, description: "Optional: Two-letter language code (e.g., 'en', 'es', 'fr') for search results. Provide as string or null for default." } as OpenAIToolParameterProperties,
      minPrice: { type: ["number", "null"] as const, description: "Optional: Minimum price filter for 'product_search' mode. Must be a positive number. Provide as number or null." } as OpenAIToolParameterProperties,
      maxPrice: { type: ["number", "null"] as const, description: "Optional: Maximum price filter for 'product_search' mode. Must be a positive number greater than minPrice if set. Provide as number or null." } as OpenAIToolParameterProperties,
      color: { type: ["string", "null"] as const, description: "Optional: Color filter for 'product_search' mode (e.g., 'red', 'blue'). Provide as string or null." } as OpenAIToolParameterProperties,
      brand: { type: ["string", "null"] as const, description: "Optional: Brand filter for 'product_search' mode (e.g., 'Apple', 'Sony'). Provide as string or null." } as OpenAIToolParameterProperties,
    },
    required: ["query", "mode", "location", "language", "minPrice", "maxPrice", "color", "brand"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 15; // Cache for 15 minutes

  private readonly API_KEY: string;
  private readonly SERPER_API_URL = "https://google.serper.dev/search";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;


  constructor() {
    super();
    this.API_KEY = appConfig.toolApiKeys?.serper || "";
    if (!this.API_KEY) { logger.error("[WebSearchTool] Serper API Key missing. Tool will not function."); }
    if (this.USER_AGENT.includes("support@example.com")) {
        this.log("warn", "Update WebSearchTool USER_AGENT contact info with actual details for API compliance.");
    }
  }

  private parsePrice(priceString?: string | number | null): { price: number | null; currency: string | null; } {
    if (typeof priceString === "number") { return { price: priceString, currency: null }; }
    if (!priceString || typeof priceString !== "string") { return { price: null, currency: null }; }
    const cleaned = priceString.replace(/,/g, "");
    const priceRegex = new RegExp(`(?:([$€£¥])\\s?(\\d+(?:\\.\\d{1,2})?))|(?:(\\d+(?:\\.\\d{1,2})?)\\s?([$€£¥]))|(?:(USD|EUR|GBP|JPY|CAD|AUD)\\s?(\\d+(?:\\.\\d{1,2})?))|(?:(\\d+(?:\\.\\d{1,2})?)\\s?(USD|EUR|GBP|JPY|CAD|AUD))`, "i");
    const match = cleaned.match(priceRegex);
    if (match) {
      let valueStr: string | undefined; let symbolOrCode: string | undefined;
      if (match[1] && match[2]) { symbolOrCode = match[1]; valueStr = match[2]; }
      else if (match[3] && match[4]) { valueStr = match[3]; symbolOrCode = match[4]; }
      else if (match[5] && match[6]) { symbolOrCode = match[5]; valueStr = match[6]; }
      else if (match[7] && match[8]) { valueStr = match[7]; symbolOrCode = match[8]; }
      if (valueStr) {
        const value = parseFloat(valueStr); let currency: string | null = null;
        if (symbolOrCode) { const upperSymbolOrCode = symbolOrCode.toUpperCase(); if (["$", "USD"].includes(upperSymbolOrCode)) currency = "USD"; else if (["€", "EUR"].includes(upperSymbolOrCode)) currency = "EUR"; else if (["£", "GBP"].includes(upperSymbolOrCode)) currency = "GBP"; else if (["¥", "JPY"].includes(upperSymbolOrCode)) currency = "JPY"; else if (["CAD", "AUD"].includes(upperSymbolOrCode)) currency = upperSymbolOrCode; else currency = upperSymbolOrCode.length === 3 ? upperSymbolOrCode : null; }
        return { price: value, currency };
      }
    }
    const directParse = parseFloat(cleaned); return !isNaN(directParse) ? { price: directParse, currency: null } : { price: null, currency: null };
  }

  private extractProductData(item: SerperShoppingResult, queryText: string): CachedProduct {
    const { price, currency } = this.parsePrice(item.priceString || item.price);
    const ratingSource = item.rating ?? item.attributes?.rating ?? item.attributes?.Rating ?? null;
    const reviewsSource = item.reviews ?? item.attributes?.reviews ?? item.attributes?.Reviews ?? null;
    const rating = typeof ratingSource === "number" ? ratingSource : typeof ratingSource === "string" ? parseFloat(ratingSource.replace(/[^\d.-]/g, '')) : null;
    const ratingCount = typeof reviewsSource === "number" ? reviewsSource : typeof reviewsSource === "string" ? parseInt(reviewsSource.replace(/\D/g, ""), 10) : null;
    return {
      result_type: "product", source_api: "serper_shopping", 
      title: item.title || "Unknown Product", 
      price: price, 
      currency: item.currency || currency || null,
      source: item.source || "Unknown Retailer", 
      link: item.link || "#", 
      imageUrl: item.imageUrl || null,
      rating: (rating !== null && !isNaN(rating)) ? rating : null, 
      ratingCount: (ratingCount !== null && !isNaN(ratingCount)) ? ratingCount : null,
      delivery: item.delivery || item.attributes?.delivery || null, 
      offers: item.offers || item.attributes?.offers || null,
      productId: item.productId || item.attributes?.product_id || null,
    };
  }
  
  private extractTikTokVideoData(item: SerperVideoResult, queryText: string): CachedTikTokVideo {
    let tiktokId: string | undefined;
    let embedUrl: string | undefined;
    if (item.link?.includes("tiktok.com") && item.link.includes("/video/")) { 
      try { 
        const url = new URL(item.link); 
        const pathParts = url.pathname.split("/"); 
        const videoIdIndex = pathParts.indexOf("video"); 
        if (videoIdIndex !== -1 && pathParts.length > videoIdIndex + 1) { 
          tiktokId = pathParts[videoIdIndex + 1]; 
          embedUrl = `https://www.tiktok.com/embed/v2/${tiktokId}`;
        } 
      } catch (e: any) { this.log("warn", `Could not parse TikTok URL: ${item.link}`, { error: e.message }); } 
    }
    return {
      result_type: "tiktok_video", source_api: "serper_tiktok", 
      videoId: tiktokId, 
      title: item.title || "TikTok Video", // More generic default
      description: item.snippet || null,
      channel: item.channel || null, 
      date: item.date || null, 
      thumbnailUrl: item.imageUrl || null, 
      videoUrl: item.link || "#", // This is the watch URL
      embedUrl: embedUrl, // Added embed URL
      source: "TikTok", 
      duration: item.duration || null
    };
  }

  private extractFallbackAnswer(data: SerperResponse | null, queryText: string): { resultText?: string | null; extractedData?: AnyToolStructuredData | null; resultType?: "web_snippet" | "answerBox" | "knowledgeGraph" | "recipe" | null; sourceApi?: string | null; } {
    if (!data) return { resultText: null, extractedData: null, resultType: null, sourceApi: null };
    const query = data.searchParameters?.q || queryText;
    if (data.answerBox && (data.answerBox.answer || data.answerBox.snippet)) {
      const text = data.answerBox.answer || data.answerBox.snippet || "No answer provided.";
      this.log("debug", `[WebSearchTool Fallback] Using Answer Box: ${text.substring(0, 50)}...`);
      const structured: CachedAnswerBox = { result_type: "answerBox", source_api: "serper_answerbox", answer: data.answerBox.answer, snippet: data.answerBox.snippet, title: data.answerBox.title, link: data.answerBox.link, sourcePlatform: "serper_answerbox" };
      return { resultText: text, extractedData: structured as AnyToolStructuredData, resultType: "answerBox", sourceApi: "serper_answerbox" };
    }
    if (data.knowledgeGraph?.description) {
        const kgData: CachedKnowledgeGraph = { result_type: "knowledgeGraph", source_api: "serper_kg", title: data.knowledgeGraph.title, type: data.knowledgeGraph.type, description: data.knowledgeGraph.description, imageUrl: data.knowledgeGraph.imageUrl, attributes: data.knowledgeGraph.attributes, link: data.knowledgeGraph.link, source: data.knowledgeGraph.source, sourcePlatform: "serper_kg" };
        const resultText = `${data.knowledgeGraph.title || "Information"} from ${data.knowledgeGraph.source || "the web"}: ${data.knowledgeGraph.description}`;
        return { resultText: resultText, extractedData: kgData as AnyToolStructuredData, resultType: "knowledgeGraph", sourceApi: "serper_kg" };
    }
    if (data.recipes && data.recipes.length > 0) {
        const recipe = data.recipes[0]; const readyInMinutes = recipe.totalTime ? parseInt(recipe.totalTime.replace(/\D/g, ""), 10) || null : null;
        // Ensure CachedRecipe here matches definition if recipe_detail is now distinct
        const recipeData: CachedRecipe = { result_type: "recipe_detail", source_api: "serper_recipes", title: recipe.title || "Recipe", sourceName: recipe.source || null, sourceUrl: recipe.link || "#", imageUrl: recipe.imageUrl || null, ingredients: recipe.ingredients, readyInMinutes: readyInMinutes, query: query, error: undefined };
        const resultText = `Found a recipe for ${recipe.title || query} from ${recipe.source || "a source"}.`;
        return { resultText: resultText, extractedData: recipeData as AnyToolStructuredData, resultType: "recipe", sourceApi: "serper_recipes" };
    }
    if (data.organic && data.organic.length > 0 && data.organic[0].snippet) {
        const organic = data.organic[0]; const snippetData: CachedWebSnippet = { result_type: "web_snippet", source_api: "serper_organic", title: organic.title || null, link: organic.link || null, snippet: organic.snippet || "", source: (organic.source && (organic.source === "serper_organic" || organic.source === "serper_news" || organic.source === "other")) ? organic.source : "other" };
        const resultText = `According to a web result from ${organic.source || "the web"}: ${organic.snippet}`;
        return { resultText: resultText, extractedData: snippetData as AnyToolStructuredData, resultType: "web_snippet", sourceApi: "serper_organic" };
    }
    if (data.news && data.news.length > 0 && data.news[0].snippet) {
        const news = data.news[0]; const snippetData: CachedWebSnippet = { result_type: "web_snippet", source_api: "serper_news", title: news.title || null, link: news.link || null, snippet: news.snippet || "", source: (news.source && (news.source === "serper_organic" || news.source === "serper_news" || news.source === "other")) ? news.source : "other" };
        const resultText = `From a recent news article by ${news.source || "a source"}: ${news.snippet}`;
        return { resultText: resultText, extractedData: snippetData as AnyToolStructuredData, resultType: "web_snippet", sourceApi: "serper_news" };
    }
    if (data.organic && data.organic.length > 0 && data.organic[0].title && data.organic[0].link) {
        const fallbackOrganic = data.organic[0]; const fallbackSnippet: CachedWebSnippet = { result_type: "web_snippet", source_api: "serper_organic", title: fallbackOrganic.title || null, link: fallbackOrganic.link || null, snippet: "No specific summary found, but this result might be relevant.", source: (fallbackOrganic.source && (fallbackOrganic.source === "serper_organic" || fallbackOrganic.source === "serper_news" || fallbackOrganic.source === "other")) ? fallbackOrganic.source : "other" };
        return { resultText: `Minato found a potentially relevant page titled "${fallbackOrganic.title}". I couldn't extract a direct summary, but you might find it useful.`, extractedData: fallbackSnippet as AnyToolStructuredData, resultType: "web_snippet", sourceApi: "serper_organic" };
    }
    this.log("warn", `[WebSearchTool Fallback] Query:"${query}" - No suitable answer/snippet extracted.`);
    return { resultText: null, extractedData: null, resultType: null, sourceApi: null };
  }


  async execute( toolInput: WebSearchInput, abortSignal?: AbortSignal ): Promise<ToolOutput> {
    const { query, mode } = toolInput;
    const location = (toolInput.location === null) ? undefined : toolInput.location;
    const language = (toolInput.language === null) ? undefined : toolInput.language;
    const minPrice = (toolInput.minPrice === null || toolInput.minPrice === undefined || toolInput.minPrice <= 0) ? undefined : toolInput.minPrice;
    const maxPrice = (toolInput.maxPrice === null || toolInput.maxPrice === undefined || toolInput.maxPrice <= 0) ? undefined : toolInput.maxPrice;
    const color = (toolInput.color === null) ? undefined : toolInput.color;
    const brand = (toolInput.brand === null) ? undefined : toolInput.brand;

    const safeQueryString = String(query || "");
    const logPrefix = `[WebSearchTool Mode:${mode}] Query:"${safeQueryString.substring(0,50)}..."`;
    const userNameForResponse = toolInput.context?.userName || "friend";

    if (abortSignal?.aborted) { return { error: "Web Search cancelled.", result: "Cancelled.", structuredData: undefined }; }
    if (!this.API_KEY) { return { error: "Web Search Tool is not configured.", result: `Sorry, ${userNameForResponse}, Minato cannot perform web searches right now.`, structuredData: undefined }; }
    if (!query?.trim()) { return { error: "Missing or empty search query.", result: "What exactly should Minato search the web for?", structuredData: undefined }; }
    if (!["product_search", "tiktok_search", "fallback_search"].includes(mode)) { return { error: "Invalid mode specified.", result: "Minato needs to know whether to search for products, TikToks, or general information.", structuredData: undefined };}

    const requestBody: Record<string, any> = { q: query.trim() };
    const langCode = language?.split("-")[0].toLowerCase() || toolInput.context?.locale?.split("-")[0] || "en";
    const countryCode = location?.toUpperCase() || toolInput.context?.countryCode?.toUpperCase() || "us";
    requestBody.hl = langCode; requestBody.gl = countryCode;
    this.log("info", `${logPrefix} Using lang:${langCode}, country:${countryCode}`);

    let refinedQuery = query.trim();
    if (mode === "product_search") {
      let prefix = "buy";
      if (brand) prefix += ` ${brand}`; if (color) prefix += ` ${color}`;
      refinedQuery = `${prefix} ${refinedQuery}`;
      if (minPrice !== undefined) refinedQuery += ` min price ${minPrice}`;
      if (maxPrice !== undefined && maxPrice > (minPrice ?? 0)) refinedQuery += ` max price ${maxPrice}`;
      requestBody.q = refinedQuery.replace(/\s+/g, " ").trim();
      requestBody.tbs = `mr:1,price:1,ppr_min:${minPrice || ""},ppr_max:${maxPrice || ""}`; // Serper specific shopping filters
      requestBody.type = "shopping"; // Ensure Serper uses shopping search type
      this.log("info", `${logPrefix} Product search refined query: "${requestBody.q.substring(0,70)}..."`);
    } else if (mode === "tiktok_search") {
      refinedQuery = `${query.trim()} site:tiktok.com`;
      requestBody.q = refinedQuery.replace(/\s+/g, " ").trim(); requestBody.type = "videos";
      this.log("info", `${logPrefix} TikTok search query: "${requestBody.q.substring(0,70)}..."`);
    } else { this.log("info", `${logPrefix} Executing general fallback search.`); }

    try {
      this.log("debug", `${logPrefix} Sending request to Serper API: ${this.SERPER_API_URL} with body: ${JSON.stringify(requestBody).substring(0,100)}`);
      const timeoutMs = appConfig.toolTimeoutMs || (appConfig.toolApiKeys as any).serperSearchTimeoutMs || 10000;
      const response = await fetch(this.SERPER_API_URL, {
        method: "POST", headers: { "X-API-KEY": this.API_KEY, "Content-Type": "application/json", "User-Agent": this.USER_AGENT },
        body: JSON.stringify(requestBody), signal: abortSignal ?? AbortSignal.timeout(timeoutMs),
      });

      if (abortSignal?.aborted) { return { error: "Web Search cancelled.", result: "Cancelled.", structuredData: undefined }; }
      if (!response.ok) {
        let errorDetail = `Serper API request failed: ${response.status} ${response.statusText}.`;
        let errorBodyText = await response.text();
        try { const errorBody = JSON.parse(errorBodyText); errorDetail += ` Message: ${String(errorBody?.message || JSON.stringify(errorBody))}`; }
        catch { errorDetail += ` Raw Body: ${errorBodyText.substring(0, 200)}`; }
        this.log("error", `${logPrefix} ${errorDetail}`);
        let userResultMessage = `Sorry, ${userNameForResponse}, the web search encountered an error.`;
        if (response.status === 401 || response.status === 403) userResultMessage = `Sorry, ${userNameForResponse}, Minato cannot perform web searches due to an authorization issue.`;
        else if (response.status === 429) userResultMessage = `Sorry, ${userNameForResponse}, the web search service is temporarily unavailable (rate limit).`;
        else if (response.status >= 500) userResultMessage = `Sorry, ${userNameForResponse}, the web search service seems to be having internal issues.`;
        return { error: errorDetail, result: userResultMessage, structuredData: undefined };
      }
      const data: SerperResponse = (await response.json()) as SerperResponse;
      this.log("debug", `${logPrefix} Received ${response.status} response from Serper API. Organic count: ${data.organic?.length}, Shopping: ${data.shopping?.length}, Videos: ${data.videos?.length}`);

      if (mode === "product_search") {
        const products = data.shopping; const organicProducts = data.organic?.filter(p => p.price || p.attributes?.price);
        let allProductResults: SerperShoppingResult[] = products || [];
        if (allProductResults.length === 0 && organicProducts && organicProducts.length > 0) { this.log("info", `${logPrefix} No direct shopping results, adapting ${organicProducts.length} organic results into product format.`); allProductResults = organicProducts.map(o => ({ title: o.title, link: o.link, source: o.source || (o.link ? new URL(o.link).hostname : "Unknown"), priceString: o.attributes?.price || o.price?.toString(), imageUrl: o.imageUrl, position: o.position } as SerperShoppingResult));}
        
        let outputData: CachedProductList = { result_type: "product_list", source_api: "serper_shopping", query: toolInput, products: [], error: undefined };
        if (allProductResults.length === 0) { return { result: `I couldn't find products matching "${query}" for ${userNameForResponse} with those criteria. How about a different search?`, structuredData: outputData };}
        
        this.log("info", `${logPrefix} Found ${allProductResults.length} potential product results.`);
        const extractedProducts: CachedProduct[] = allProductResults.map((p) => this.extractProductData(p, query)).filter((p): p is CachedProduct => !!(p.title && p.link));
        if (extractedProducts.length === 0) { outputData.error = "Failed to process product details from results"; return { result: `I found matches for "${query}" for ${userNameForResponse}, but had trouble extracting the details.`, structuredData: outputData };}
        
        outputData.products = extractedProducts; outputData.error = undefined;
        const topProduct = extractedProducts[0];
        let resultString = `Hey ${userNameForResponse}, I found some products for "${query}"! For example, there's "${topProduct.title}"`;
        if (topProduct.price) resultString += ` for around ${topProduct.currency || '$'}${topProduct.price}`;
        resultString += ` from ${topProduct.source}.`;
        if(extractedProducts.length > 1) resultString += ` There are ${extractedProducts.length -1} more options too. I can show you the list!`;
        else resultString += ` What do you think?`;
        return { result: resultString, structuredData: outputData };

      } else if (mode === "tiktok_search") {
        const videos = data.videos?.filter((v) => v.link?.includes("tiktok.com"));
        let outputData: CachedVideoList = { result_type: "video_list", source_api: "serper_tiktok", query: toolInput, videos: [], error: undefined };
        if (!videos || videos.length === 0) { return { result: `I couldn't find TikTok videos for "${query}" for ${userNameForResponse}. Maybe try a different search term?`, structuredData: outputData }; }
        
        this.log("info", `${logPrefix} Found ${videos.length} potential TikTok videos.`);
        const extractedVideos: (CachedTikTokVideo | CachedYouTubeVideo)[] = videos.map((v) => this.extractTikTokVideoData(v, query)).filter((v): v is CachedTikTokVideo => !!v.videoId || !!v.videoUrl);
        if (extractedVideos.length === 0) { outputData.error = "Failed to process TikTok video details"; return { result: `I found some TikToks related to "${query}" for ${userNameForResponse}, but couldn't get the details right now.`, structuredData: outputData }; }
        
        outputData.videos = extractedVideos; outputData.error = undefined;
        const firstTikTok = extractedVideos[0] as CachedTikTokVideo;
        let resultString = `Alright ${userNameForResponse}, I found some TikToks about "${query}" for you!`;
        if (firstTikTok.title) resultString += ` The top one is "${firstTikTok.title}"`;
        if (firstTikTok.channel) resultString += ` by ${firstTikTok.channel}.`;
        else resultString += ".";
        if (extractedVideos.length > 1) resultString += ` There are ${extractedVideos.length - 1} more. Want to see them?`;
        else resultString += ` Would you like to check it out?`;
        return { result: resultString, structuredData: outputData };

      } else { // fallback_search
        const { resultText, extractedData, resultType, sourceApi } = this.extractFallbackAnswer(data, query);
        if (!resultText || !extractedData || !resultType) {
          this.log("info", `${logPrefix} No direct answer or relevant snippet found.`);
          const related = data.relatedSearches?.map((r) => r.query).slice(0,3).join(", ");
          const fallbackMsg = `I searched for "${query}" for ${userNameForResponse} but couldn't find a direct answer or summary.${related ? ` Perhaps you'd be interested in these related searches: ${related}?` : ""}`;
          return { result: fallbackMsg, structuredData: undefined };
        }
        this.log("info", `${logPrefix} Found fallback answer/snippet. Type: ${resultType}`);
        let finalStructuredOutput: AnyToolStructuredData = extractedData;
        if (typeof finalStructuredOutput === 'object' && finalStructuredOutput !== null) {
            (finalStructuredOutput as any).query = toolInput; // Add original input to structured data
        }
        
        let conversationalResult = resultText; // Keep original for structured if better
        if (resultType === "answerBox" && (extractedData as CachedAnswerBox).answer) {
            conversationalResult = `I found this for "${query}", ${userNameForResponse}: ${(extractedData as CachedAnswerBox).answer}.`;
        } else if (resultType === "knowledgeGraph" && extractedData && (extractedData as CachedKnowledgeGraph).description) {
            const kg = extractedData as CachedKnowledgeGraph;
            conversationalResult = `Here's some info on "${kg && kg.title ? kg.title : query}" for you, ${userNameForResponse}: ${kg.description ? kg.description.substring(0, 150) : ""}...`;
        } else if (resultType === "web_snippet" && (extractedData as CachedWebSnippet).snippet) {
            conversationalResult = `I found a snippet from ${ (extractedData as CachedWebSnippet).source || "the web"} about "${query}", ${userNameForResponse}: "${(extractedData as CachedWebSnippet).snippet.substring(0, 150)}..."`;
        } else if (resultType === "recipe" && (extractedData as CachedRecipe).title) {
            conversationalResult = `Looks like I found a recipe for "${(extractedData as CachedRecipe).title || query}" for you, ${userNameForResponse}! Sounds tasty!`;
        }
        return { result: conversationalResult, structuredData: finalStructuredOutput };
      }
    } catch (error: any) {
      const originalErrorMessage = String(error?.message || (typeof error === 'string' ? error : "Unknown web search error"));
      const errorMessage = `Web search failed: ${originalErrorMessage}`;
      this.log( "error", `${logPrefix} Search failed: ${originalErrorMessage}`, { error });
      let responseStructuredData: AnyToolStructuredData | undefined;
      const baseErrorData = { query: toolInput, error: errorMessage };
      switch(mode) {
        case "product_search": responseStructuredData = { result_type: "product_list", source_api: "serper_shopping", products: [], ...baseErrorData }; break;
        case "tiktok_search": responseStructuredData = { result_type: "video_list", source_api: "serper_tiktok", videos: [], ...baseErrorData }; break;
        default: responseStructuredData = { result_type: "web_snippet", source_api: "serper_general", data: null, ...baseErrorData } as CachedSingleWebResult;
      }
      if (error.name === "AbortError" || error.name === 'TimeoutError') {
        this.log("warn", `${logPrefix} Request timed out.`);
        if (responseStructuredData) (responseStructuredData as any).error = "Request timed out.";
        return { error: "Web search timed out.", result: `Sorry, ${userNameForResponse}, the web search took too long to respond. Please try again in a moment.`, structuredData: responseStructuredData };
      }
      return { error: errorMessage, result: `Sorry, ${userNameForResponse}, Minato encountered an unexpected problem while searching the web. It might be a temporary issue.`, structuredData: responseStructuredData };
    }
  }
}