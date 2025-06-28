// FILE: lib/tools/WebSearchTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch"; // Ensure node-fetch is imported
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  CachedAnswerBox, CachedKnowledgeGraph, CachedProduct, CachedProductList,
  CachedSingleWebResult, CachedTikTokVideo,
  CachedVideoList, CachedWebSnippet, AnyToolStructuredData,
} from "@/lib/types/index";
import Ajv, { ValidateFunction } from "ajv";
import { SchemaService } from "../services/schemaService";
import { generateStructuredJson } from "../providers/llm_clients";

interface WebSearchInput extends ToolInput {
  query: string;
  mode: "tiktok_search" | "fallback_search";
  location?: string | null;
  language?: string | null;
  apiContext?: Record<string, any>;
  skipSearch?: boolean;
}

interface SerperOrganicResult { price?: any; title?: string; link?: string; snippet?: string; position?: number; imageUrl?: string; attributes?: Record<string, any>; source?: string; }
interface SerperVideoResult { title?: string; link?: string; snippet?: string; date?: string; source?: string; imageUrl?: string; duration?: string; position?: number; channel?: string; videoUrl?: string; }
interface SerperShoppingResult { title?: string; link?: string; source?: string; price?: number; priceString?: string; rating?: number | string; reviews?: number | string; imageUrl?: string; position?: number; delivery?: string; offers?: string; productId?: string; attributes?: Record<string, any>; currency?: string; }
interface SerperAnswerBox { answer?: string; snippet?: string; snippetHighlighted?: string[]; title?: string; link?: string; }
interface SerperKnowledgeGraph { title?: string; type?: string; description?: string; imageUrl?: string; attributes?: Record<string, string>; link?: string; source?: string; }
interface SerperRelatedSearch { query: string; }
interface SerperResponse { searchParameters?: { q: string; gl?: string; hl?: string; type?: string }; answerBox?: SerperAnswerBox; knowledgeGraph?: SerperKnowledgeGraph; organic?: SerperOrganicResult[]; videos?: SerperVideoResult[]; shopping?: SerperShoppingResult[]; relatedSearches?: SerperRelatedSearch[]; }

interface SchemaDefinition {
  name: string;
  version: string;
  schema: object;
  validator?: (data: any) => boolean;
}

const SCHEMA_VERSIONS: Record<string, SchemaDefinition> = {
  'tool_router_v1.1': {
    name: 'tool_router',
    version: '1.1',
    schema: {
      type: "object",
      properties: {
        planned_tools: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tool_name: { type: "string" },
              arguments: { 
                type: "object",
                additionalProperties: true,
                properties: {}
              },
              reason: { type: "string" }
            },
            required: ["tool_name", "arguments", "reason"],
            additionalProperties: false
          }
        }
      },
      required: ["planned_tools"],
      additionalProperties: false
    }
  }
};

export class WebSearchTool extends BaseTool {
  name = "WebSearchTool";
  description =
    "Performs web searches using Serper API. Supports TikTok video search (with 'tiktok_search' mode) and general web search (with 'fallback_search' mode) ONLY when LLM knowledge is insufficient to answer user queries. Use 'fallback_search' mode sparingly and only when other specialized tools cannot handle the query.";
  argsSchema = {
    type: "object" as const,
    properties: {
      query: { type: "string" as const, description: "The keywords, question, or search term. This is always required." } as OpenAIToolParameterProperties,
      mode: { type: "string" as const, enum: ["tiktok_search", "fallback_search"], description: "The type of search: 'tiktok_search' for TikTok videos, or 'fallback_search' ONLY when LLM knowledge is insufficient and other specialized tools cannot handle the query. This is always required." } as OpenAIToolParameterProperties,
      location: { type: ["string", "null"] as const, description: "Optional: Two-letter country code (e.g., 'us', 'gb', 'fr') for search localization. Provide as string or null for global search." } as OpenAIToolParameterProperties,
      language: { type: ["string", "null"] as const, description: "Optional: Two-letter language code (e.g., 'en', 'es', 'fr') for search results. Provide as string or null for default." } as OpenAIToolParameterProperties,
    },
    required: ["query", "mode"],
    additionalProperties: false as false,
  };
  cacheTTLSeconds = 60 * 15; // Cache for 15 minutes
  categories = ["search", "web"];
  version = "1.0.0";
  metadata = { provider: "Serper API", supports: ["tiktok_search", "fallback_search"] };

  private readonly API_KEY: string;
  private readonly SERPER_API_URL = "https://google.serper.dev/search";
  private readonly USER_AGENT = `MinatoAICompanion/1.0 (${(appConfig as any).app?.url}; mailto:${(appConfig as any).emailFromAddress || "support@example.com"})`;


  constructor() {
    super();
    this.API_KEY = (appConfig as any).toolApiKeys?.serper || "";
    if (!this.API_KEY) { logger.error("[WebSearchTool] Serper API Key missing. Tool will not function."); }
    if (this.USER_AGENT.includes("support@example.com")) {
      this.log("warn", "Update WebSearchTool USER_AGENT contact info with actual details for API compliance.");
    }
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

  private extractFallbackAnswer(data: SerperResponse | null, queryText: string): { resultText?: string | null; extractedData?: AnyToolStructuredData | null; resultType?: "web_snippet" | "answerBox" | "knowledgeGraph" | null; sourceApi?: string | null; } {
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
    if (data.organic && data.organic.length > 0 && data.organic[0].snippet) {
      const organic = data.organic[0]; const snippetData: CachedWebSnippet = { result_type: "web_snippet", source_api: "serper_organic", title: organic.title || null, link: organic.link || null, snippet: organic.snippet || "", source: (organic.source && (organic.source === "serper_organic" || organic.source === "serper_news" || organic.source === "other")) ? organic.source : "other" };
      const resultText = `According to a web result from ${organic.source || "the web"}: ${organic.snippet}`;
      return { resultText: resultText, extractedData: snippetData as AnyToolStructuredData, resultType: "web_snippet", sourceApi: "serper_organic" };
    }
    if (data.organic && data.organic.length > 0 && data.organic[0].title && data.organic[0].link) {
      const fallbackOrganic = data.organic[0]; const fallbackSnippet: CachedWebSnippet = { result_type: "web_snippet", source_api: "serper_organic", title: fallbackOrganic.title || null, link: fallbackOrganic.link || null, snippet: "No specific summary found, but this result might be relevant.", source: (fallbackOrganic.source && (fallbackOrganic.source === "serper_organic" || fallbackOrganic.source === "serper_news" || fallbackOrganic.source === "other")) ? fallbackOrganic.source : "other" };
      return { resultText: `Minato found a potentially relevant page titled "${fallbackOrganic.title}". I couldn't extract a direct summary, but you might find it useful.`, extractedData: fallbackSnippet as AnyToolStructuredData, resultType: "web_snippet", sourceApi: "serper_organic" };
    }
    this.log("warn", `[WebSearchTool Fallback] Query:"${query}" - No suitable answer/snippet extracted.`);
    return { resultText: null, extractedData: null, resultType: null, sourceApi: null };
  }

  private inferSearchMode(queryText: string): "tiktok_search" | "fallback_search" {
    const lowerQuery = queryText.toLowerCase();
    
    // Check for explicit TikTok searches first with stronger matching
    if (
      lowerQuery.includes('tiktok') || 
      lowerQuery.includes('tik tok') ||
      lowerQuery.includes('tik-tok') ||
      // Look for TikTok + action phrases
      (lowerQuery.match(/\b(find|show|get|search|watch)\b/) && lowerQuery.includes('tiktok')) ||
      // More specific TikTok video requests
      lowerQuery.match(/\b(tiktok|tik tok).+\b(video|videos|clip|trend|trending)\b/) ||
      // Detect TikTok creators
      lowerQuery.match(/\b(@\w+).+(tiktok|tik tok)\b/)
    ) {
      return "tiktok_search";
    }
    
    // Default to fallback search for general queries
    return "fallback_search";
  }

  private detectProductSearchIntent(queryText: string): boolean {
    const lowerQuery = queryText.toLowerCase();
    
    // Check for shopping/product specific keywords
    const productKeywords = [
      // Shopping intent
      'buy', 'purchase', 'shop', 'shopping', 'price', 'cheap', 'expensive',
      'cost', 'order', 'amazon', 'ebay', 'etsy', 'store', 'mall', 'retail',
      'dollar', 'euro', 'pound', '$', '€', '£', 'discount', 'deal', 'sale',
      'coupon', 'promo', 'promotion', 'offer',
      
      // Product categories
      'brand', 'product', 'item', 'wear', 'fashion', 'clothing', 'shoe', 'dress',
      'furniture', 'electronics', 'phone', 'laptop', 'computer', 'tablet',
      
      // Travel/accommodations
      'hotel', 'flight', 'vacation', 'trip', 'booking', 'reservation',
      'airbnb', 'stay', 'accommodation', 'resort', 'airline', 'ticket',
      
      // E-commerce specific
      'shipping', 'delivery', 'checkout', 'cart', 'add to cart', 'in stock',
      'out of stock', 'available', 'sold out', 'marketplace',
      
      // Comparison shopping
      'compare', 'comparison', 'best price', 'cheapest', 'affordable',
      'alternative', 'vs', 'versus', 'better than'
    ];
    
    for (const keyword of productKeywords) {
      if (lowerQuery.includes(keyword)) {
        return true;
      }
    }
    
    return false;
  }
  
  // NEW: Helper method to check if a query is explicitly about TikTok
  private isExplicitlyTikTokQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return (
      lowerQuery.includes('tiktok') ||
      lowerQuery.includes('tik tok') ||
      lowerQuery.includes('tik-tok')
    );
  }
  
  // NEW: Helper method to analyze video intent type
  private analyzeVideoIntent(query: string): 'tiktok' | 'general' {
    // Directly check for platform mentions first
    if (this.isExplicitlyTikTokQuery(query)) return 'tiktok';
    
    const lowerQuery = query.toLowerCase();
    
    // Check for TikTok-specific terms/patterns - Enhanced with more patterns
    const tiktokPatterns = [
      // Platform-specific mentions
      /\btrending\s+on\s+tik\s*tok\b/i,
      /\btiktok\s+trend\b/i,
      /\bviral\s+(on\s+)?tik\s*tok\b/i,
      /\btiktok\s+dance\b/i,
      /\btiktok\s+challenge\b/i,
      /\bfor\s+you\s+page\b/i,
      /\bfyp\b/i,
      
      // Content format indicators
      /\bshort(\s+form)?\s+video\b/i,
      /\bshort\s+clip\b/i,
      /\bvertical\s+video\b/i,
      /\b(15|30|60)\s+second\b/i,
      /\bone\s+minute\b/i,
      /\bquick\s+video\b/i,
      
      // TikTok-specific features
      /\bduet\b/i,
      /\bstitch\b/i,
      /\bsound\b/i,
      /\btrend\s+sound\b/i,
      /\bfilter\b/i,
      /\beffect\b/i,
      /\btransition\b/i,
      
      // TikTok creator terms
      /\b@[a-z0-9_.]+\b/i,
      /\btiktok\s+creator\b/i,
      /\btiktoker\b/i,
      
      // TikTok content categories
      /\b(skincare|makeup|beauty)\s+(routine|tutorial)\s+(short|quick)\b/i,
      /\blifehack\b/i,
      /\bhair\s+tutorial\s+short\b/i,
      /\bdiy\s+quick\b/i,
      /\bfood\s+hack\b/i,
      /\bdance\s+trend\b/i,
      /\boutfit\s+ideas\b/i,
    ];
    
    for (const pattern of tiktokPatterns) {
      if (pattern.test(lowerQuery)) return 'tiktok';
    }
    
    // Enhanced topic-based indicators
    const tiktokTopics = [
      'skincare routine', 'beauty hack', 'dance', 'makeup tutorial short',
     'life hack', 'trend', 'viral', 'challenge',
      'fashion tips', 'outfit idea', 'prank', 'reaction', 'before and after',
      'transformation', 'get ready with me', 'grwm', 'day in my life',
      'aesthetic', 'satisfying', 'asmr short', 'morning routine',
      'storytime', 'duet with', 'pov', 'point of view'
    ];
    
    // Count topic matches with better matching
    let tiktokScore = 0;
    
    // Improve topic matching by checking for whole phrase presence
    for (const topic of tiktokTopics) {
      if (lowerQuery.includes(topic)) tiktokScore += 2;
      // Also check for partial matches with word boundaries
      else {
        const words = topic.split(' ');
        for (const word of words) {
          if (word.length > 3 && new RegExp(`\\b${word}\\b`, 'i').test(lowerQuery)) {
            tiktokScore += 0.5;
          }
        }
      }
    }
    
    // Video length indicators
    if (lowerQuery.match(/\b(short|quick|brief|fast)\b/i)) tiktokScore += 1.5;
    
    // Debug logging for analysis scores
    this.log("debug", `Video intent analysis - TikTok score: ${tiktokScore} for query: "${lowerQuery}"`);
    
    // Decide based on topic scores with stronger threshold
    if (tiktokScore >= 1.5) return 'tiktok';
    
    // If no clear signal, return general
    return 'general';
  }

  private async extractWebSearchParameters(userInput: string, userId?: string): Promise<Partial<WebSearchInput>> {
    if (!userInput.trim()) {
      return {};
    }
    
    // NEW: First check if this is just a conversational response that shouldn't trigger a search
    if (this.isConversationalResponse(userInput)) {
      this.log("info", `Detected conversational response: "${userInput}" - Not triggering web search`);
      return { skipSearch: true };
    }
    
    // Clean the user input by removing phrases like "use websearch to" or "find me"
    const cleanedInput = userInput
      .replace(/^use\s+web(\s*search)?\s*(tool)?\s*to\s*/i, '')
      .replace(/^(hey|hi|hello|ok|okay)\s+(minato|there)\s*/i, '')
      .replace(/^can\s+you\s+/i, '')
      .replace(/^please\s+/i, '')
      .trim();
      
    // NEW: After cleaning, check again for conversational responses
    if (this.isConversationalResponse(cleanedInput)) {
      this.log("info", `Cleaned input is still just a conversational response: "${cleanedInput}" - Not triggering search`);
      return { skipSearch: true };
    }
      
    // Analyze the video intent of the user query
    const videoIntent = this.analyzeVideoIntent(cleanedInput);
    
          // Check for TikTok intent in the original user input
      if (videoIntent === 'tiktok') {
        // Force TikTok mode if TikTok is the intent
        return {
          query: cleanedInput.replace(/\b(use websearch to find|find me|search for|look for|show me)\b/i, '')
            .replace(/\b(a|some)\b/i, '')
            .replace(/\b(tiktok|tik tok|tik-tok)\b/i, '')
            .trim(),
          mode: "tiktok_search" as const
        };
      }
      // If the query seems to be about general content, use fallback search
      else {
        return {
          query: cleanedInput,
          mode: "fallback_search" as const
        };
      }
    
    try {
      // The extraction prompt for identifying WebSearchTool parameters
      const extractionPrompt = `
You are an expert parameter extractor for Minato's WebSearchTool which operates in two distinct modes:
1. "tiktok_search" - For finding TikTok-specific content, short-form videos, trends
2. "fallback_search" - For general information ONLY when LLM knowledge is insufficient and other specialized tools cannot handle the query

IMPORTANT: There are OTHER SPECIALIZED TOOLS for:
- YouTube videos (do not use WebSearchTool for this)
- News articles (do not use WebSearchTool for this)
- Reddit content (do not use WebSearchTool for this)
- Recipes (do not use WebSearchTool for this)
- Images (do not use WebSearchTool for this)
- Events (do not use WebSearchTool for this)

Given this user query: "${cleanedInput.replace(/"/g, '\\"')}"

COMPREHENSIVE ANALYSIS GUIDELINES:

1. USER INTENT CLASSIFICATION:
   - Primarily determine if the user wants to purchase something or find products
   - Secondarily check if they want TikTok content
   - Only use fallback search if the query doesn't match other specialized tools

2. SHOPPING PARAMETERS EXTRACTION:
   - Identify price ranges (both explicit "under $50" and implicit "affordable")
   - Recognize brand mentions (including misspelled or incomplete brand names)
   - Extract color preferences (including descriptive terms like "dark", "bright", "pastel")
   - Detect quality indicators ("high-quality", "premium", "budget")

3. LOCATION & LANGUAGE AWARENESS:
   - Extract location references for region-specific searches
   - Identify language preferences for results
   - Handle multilingual queries appropriately

4. QUERY REFINEMENT:
   - Remove unnecessary filler words while preserving meaning
   - Maintain key search terms especially for product specifications
   - Preserve quoted phrases exactly as provided

MODE SELECTION RULES:
- "tiktok_search": Select ONLY when the user EXPLICITLY requests TikTok content or clearly wants short-form viral videos
- "fallback_search": Use ONLY when LLM knowledge is insufficient and query doesn't fit into any specialized tool category

Analyze what the user is looking for and extract these parameters:
- query: The exact search query (required)
- mode: One of ["tiktok_search", "fallback_search"] (required)
- location: Location mentioned (country code, city name, or null)
- language: Language preference if mentioned (language code or null)

Output as JSON with these exact fields.`;

      const model = (appConfig as any).openai?.extractionModel || "gpt-4o-mini-2024-07-18";
      this.log("debug", `Extracting WebSearch parameters from: "${cleanedInput.substring(0, 50)}..." using ${model}`);
      
              const llmResult = await generateStructuredJson<{
        query: string;
        mode: "tiktok_search" | "fallback_search";
        location?: string | null;
        language?: string | null;
      }>(
        extractionPrompt,
        cleanedInput,
        SchemaService.getLatestVersion('minato_websearch_extraction')?.schema || {
          type: "object",
          properties: {
            query: { type: "string" },
            mode: { type: "string", enum: ["tiktok_search", "fallback_search"] },
            location: { type: ["string", "null"] },
            language: { type: ["string", "null"] }
          },
          required: ["query", "mode"],
          additionalProperties: false
        },
        "minato_websearch_extraction_v1",
        [],
        model,
        userId
      );

      if (llmResult && typeof llmResult === 'object' && !('error' in llmResult)) {
        this.log("info", `Successfully extracted WebSearch parameters: ${JSON.stringify(llmResult)}`);
        return llmResult;
      } else {
        this.log("warn", `LLM extraction failed: ${JSON.stringify(llmResult)}`);
        return {
          query: cleanedInput,
          mode: this.inferSearchMode(cleanedInput)
        };
      }
    } catch (error) {
      this.log("error", `Error extracting WebSearch parameters: ${(error as Error).message}`);
      return {
        query: cleanedInput,
        mode: this.inferSearchMode(cleanedInput)
      };
    }
  }
  
  // NEW: Helper method to detect simple conversational responses
  private isConversationalResponse(text: string): boolean {
    // Normalize and clean input
    const normalized = text.toLowerCase().trim();
    
    // 1. Single word affirmative/negative responses
    const simpleResponses = [
      'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'fine',
      'no', 'nope', 'nah', 'never', 
      'thanks', 'thank', 'thx',
      'good', 'great', 'awesome', 'cool', 'nice', 'perfect'
    ];
    
    if (simpleResponses.includes(normalized)) {
      return true;
    }
    
    // 2. Very short phrases (likely conversational)
    if (normalized.length < 5 && !normalized.includes('?')) {
      return true;
    }
    
    // 3. Common conversation continuers
    const conversationContinuers = [
      'i see', 'got it', 'i understand', 'understood',
      'that\'s good', 'that\'s great', 'that\'s nice',
      'please do', 'go ahead', 'continue', 
      'tell me more', 'i agree', 'sounds good',
      'thank you', 'thanks for', 'appreciate it',
      'that works', 'perfect', 'exactly'
    ];
    
    for (const phrase of conversationContinuers) {
      if (normalized.includes(phrase)) {
        return true;
      }
    }
    
    // 4. Questions that aren't information seeking
    const conversationalQuestions = [
      'can you', 'could you', 'would you',
      'will you', 'do you', 'are you',
      'is that', 'was that', 'what about'
    ];
    
    // Only if the text ends with a question mark and contains one of these phrases
    if (normalized.endsWith('?')) {
      for (const phrase of conversationalQuestions) {
        if (normalized.includes(phrase)) {
          return true;
        }
      }
    }
    
    // 5. Check if this is just expressing an emotion
    const emotionExpressions = [
      'wow', 'oh', 'ah', 'hmm', 'huh', 'lol', 'haha', 
      'omg', 'really', 'seriously', 'awesome', 'amazing'
    ];
    
    for (const emotion of emotionExpressions) {
      // Check for exact match or with punctuation
      if (normalized === emotion || normalized === `${emotion}!` || normalized === `${emotion}.`) {
        return true;
      }
    }
    
    return false;
  }

  async execute(toolInput: WebSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // Handle the context property if it exists by moving it to apiContext
    if ('context' in toolInput) {
      // @ts-ignore - Handle the context property even though it's not in the interface
      const contextValue = toolInput.context;
      
      // Move context to apiContext to avoid validation errors
      if (!toolInput.apiContext) {
        toolInput.apiContext = {};
      }
      
      if (typeof contextValue === 'object' && contextValue !== null) {
        toolInput.apiContext.webSearchContext = contextValue;
      }
      
      // Delete the context property to avoid validation errors
      // @ts-ignore - Delete property even though it's not in the interface
      delete toolInput.context;
    }

    // Early detection for product/shopping search intent
    if (this.detectProductSearchIntent(toolInput.query)) {
      const userNameForResponse = toolInput.apiContext?.userName || "friend";
      return {
        result: `Sorry ${userNameForResponse}, product and shopping search features are coming in the next months of Minato updates. For now, I can help you with TikTok videos or general information searches.`,
        structuredData: undefined,
        error: null
      };
    }
    
    // Apply user preferences from user state if available before other processing
    if (toolInput._context?.userState?.workflow_preferences) {
      const prefs = toolInput._context.userState.workflow_preferences;
      
      // Apply preferred web search sources if available and in fallback mode
      if (prefs.webSearchPreferredSources && 
          prefs.webSearchPreferredSources.length > 0 && 
          toolInput.mode === "fallback_search") {
        // Add preferred sources as part of the query refinement
        if (!toolInput.query.includes('site:')) {
          this.log("debug", `[WebSearchTool] Applying user's preferred search source: ${prefs.webSearchPreferredSources[0]}`);
          // Just use the first preferred source to avoid overly complex queries
          if (prefs.webSearchPreferredSources.length === 1) {
            toolInput.query = `${toolInput.query} site:${prefs.webSearchPreferredSources[0]}`;
          }
        }
      }
      

      
      // Apply TikTok preferences for TikTok searches
      if (toolInput.query.toLowerCase().includes('tiktok') && prefs.webSearchTikTokPreferences) {
        const tiktokPrefs = prefs.webSearchTikTokPreferences;
        
        // Apply preferred creators to the query
        if (tiktokPrefs.preferredCreators && tiktokPrefs.preferredCreators.length > 0) {
          const creatorQuery = tiktokPrefs.preferredCreators.map((creator: string) => `@${creator}`).join(' OR ');
          toolInput.query = `${toolInput.query} (${creatorQuery})`;
          this.log("debug", `[WebSearchTool] Applied TikTok creators: ${tiktokPrefs.preferredCreators.join(', ')}`);
        }
        
        // Apply preferred hashtags to the query
        if (tiktokPrefs.preferredHashtags && tiktokPrefs.preferredHashtags.length > 0) {
          const hashtagQuery = tiktokPrefs.preferredHashtags.join(' OR ');
          toolInput.query = `${toolInput.query} (${hashtagQuery})`;
          this.log("debug", `[WebSearchTool] Applied TikTok hashtags: ${tiktokPrefs.preferredHashtags.join(', ')}`);
        }
        
        // Apply content types to the query
        if (tiktokPrefs.contentTypes && tiktokPrefs.contentTypes.length > 0) {
          const contentTypeQuery = tiktokPrefs.contentTypes.join(' OR ');
          toolInput.query = `${toolInput.query} (${contentTypeQuery})`;
          this.log("debug", `[WebSearchTool] Applied TikTok content types: ${tiktokPrefs.contentTypes.join(', ')}`);
        }
        
        // Apply video length preference to the query
        if (tiktokPrefs.videoLengthPreference && tiktokPrefs.videoLengthPreference !== "any") {
          if (tiktokPrefs.videoLengthPreference === "short") {
            toolInput.query = `${toolInput.query} "short video" OR "quick clip"`;
          } else if (tiktokPrefs.videoLengthPreference === "medium") {
            toolInput.query = `${toolInput.query} "medium length"`;
          } else if (tiktokPrefs.videoLengthPreference === "long") {
            toolInput.query = `${toolInput.query} "long video" OR "extended"`;
          }
          this.log("debug", `[WebSearchTool] Applied TikTok video length preference: ${tiktokPrefs.videoLengthPreference}`);
        }
      }
    }
    
    // NEW: Check if this request should be skipped (conversational response)
    if (toolInput.skipSearch) {
      return { 
        error: "Search skipped - detected conversational response", 
        result: "I'll continue our conversation without searching for that.", 
        structuredData: undefined 
      };
    }
    
    // Get context from apiContext early to check for TikTok intent
    const apiContext = toolInput.apiContext || {};
    const webSearchContext = apiContext.webSearchContext || {};
    const userInput = webSearchContext.userInput || toolInput.query || "";
    
    // NEW: Check one more time if the user input is conversational
    if (this.isConversationalResponse(userInput)) {
      return { 
        error: "Search skipped - detected conversational response", 
        result: "I'll continue our conversation without searching for that.", 
        structuredData: undefined 
      };
    }
    
    const userNameForResponse = toolInput.apiContext?.userName || "friend";
    const initialLogPrefix = `[WebSearchTool ${toolInput.mode}]`;
    const effectiveMode = toolInput.mode || this.inferSearchMode(toolInput.query);
    
    // Clean query
    const normalizedQuery = toolInput.query.trim();
    
    if (!normalizedQuery) {
      this.log("warn", `${initialLogPrefix} Empty query`);
      return {
        error: "Empty search query",
        result: `Minato needs a search query to help ${userNameForResponse} find information online.`,
        structuredData: undefined
      };
    }
    
    // Cache checking is handled by BaseTool - don't need to manually check
    
    // Analyze the video intent of the user query
    const videoIntent = this.analyzeVideoIntent(userInput);
    
    // Check for TikTok intent in the original user input
    if (videoIntent === 'tiktok') {
      // Force TikTok mode if TikTok is the intent
      toolInput.mode = "tiktok_search";
      
      // Clean up the query by removing "tiktok" mentions if needed
      if (!toolInput.query || toolInput.query.trim() === "") {
        toolInput.query = userInput.replace(/\b(use websearch to find|find me|search for|look for|show me)\b/i, '')
          .replace(/\b(a|some)\b/i, '')
          .replace(/\b(tiktok|tik tok|tik-tok)\b/i, '')
          .trim();
      }
      
      this.log("info", `Forced TikTok search mode based on video intent analysis: "${userInput.substring(0, 50)}..."`);
    }
    // If general intent, use fallback search
    else if (videoIntent === 'general') {
      // Use fallback search for general queries
      this.log("info", `Using fallback search for general query: "${userInput.substring(0, 50)}..."`);
    }
    
    // Extract the base properties
    let { query, mode } = toolInput;
    const location = (toolInput.location === null) ? undefined : toolInput.location;
    const language = (toolInput.language === null) ? undefined : toolInput.language;

    const executionLogPrefix = `[WebSearchTool Mode:${mode}] Query:"${normalizedQuery.substring(0, 50)}..."`;

    if (abortSignal?.aborted) { return { error: "Web Search cancelled.", result: "Cancelled.", structuredData: undefined }; }
    if (!this.API_KEY) { return { error: "Web Search Tool is not configured.", result: `Sorry, ${userNameForResponse}, Minato cannot perform web searches right now.`, structuredData: undefined }; }
    if (!query?.trim()) { return { error: "Missing or empty search query.", result: "What exactly should Minato search the web for?", structuredData: undefined }; }
    if (!["tiktok_search", "fallback_search"].includes(mode)) { 
      this.log("warn", `Invalid mode '${mode}', falling back to 'fallback_search'`);
      mode = "fallback_search"; 
    }

    const requestBody: Record<string, any> = { q: query.trim() };
    const langCode = language?.split("-")[0].toLowerCase() || webSearchContext.locale?.split("-")[0] || "en";
    const countryCode = location?.toUpperCase() || webSearchContext.countryCode?.toUpperCase() || "us";
    requestBody.hl = langCode; requestBody.gl = countryCode;
    this.log("info", `${executionLogPrefix} Using lang:${langCode}, country:${countryCode}`);

    let refinedQuery = query.trim();
    if (mode === "tiktok_search") {
      refinedQuery = `${query.trim()} site:tiktok.com`;
      requestBody.q = refinedQuery.replace(/\s+/g, " ").trim(); requestBody.type = "videos";
      this.log("info", `${executionLogPrefix} TikTok search query: "${requestBody.q.substring(0, 70)}..."`);
    } else { this.log("info", `${executionLogPrefix} Executing general fallback search.`); }

    try {
      this.log("debug", `${executionLogPrefix} Sending request to Serper API: ${this.SERPER_API_URL} with body: ${JSON.stringify(requestBody).substring(0, 100)}`);
      const timeoutMs = (appConfig as any).toolTimeoutMs || ((appConfig as any).toolApiKeys?.serperSearchTimeoutMs) || 10000;
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
        this.log("error", `${executionLogPrefix} ${errorDetail}`);
        let userResultMessage = `Sorry, ${userNameForResponse}, the web search encountered an error.`;
        if (response.status === 401 || response.status === 403) userResultMessage = `Sorry, ${userNameForResponse}, Minato cannot perform web searches due to an authorization issue.`;
        else if (response.status === 429) userResultMessage = `Sorry, ${userNameForResponse}, the web search service is temporarily unavailable (rate limit).`;
        else if (response.status >= 500) userResultMessage = `Sorry, ${userNameForResponse}, the web search service seems to be having internal issues.`;
        return { error: errorDetail, result: userResultMessage, structuredData: undefined };
      }
      const data: SerperResponse = (await response.json()) as SerperResponse;
      this.log("debug", `${executionLogPrefix} Received ${response.status} response from Serper API. Organic count: ${data.organic?.length}, Shopping: ${data.shopping?.length}, Videos: ${data.videos?.length}`);

      if (mode === "tiktok_search") {
        const videos = data.videos?.filter((v) => v.link?.includes("tiktok.com"));
        let outputData: CachedVideoList = { result_type: "video_list", source_api: "serper_tiktok", query: toolInput, videos: [], error: undefined };
        if (!videos || videos.length === 0) { return { result: `I couldn't find TikTok videos for "${query}" for ${userNameForResponse}. Maybe try a different search term?`, structuredData: outputData }; }

        this.log("info", `${executionLogPrefix} Found ${videos.length} potential TikTok videos.`);
        const extractedVideos: CachedTikTokVideo[] = videos.map((v) => this.extractTikTokVideoData(v, query)).filter((v): v is CachedTikTokVideo => !!v.videoId || !!v.videoUrl);
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
          this.log("info", `${executionLogPrefix} No direct answer or relevant snippet found.`);
          const related = data.relatedSearches?.map((r) => r.query).slice(0, 3).join(", ");
          const fallbackMsg = `I searched for "${query}" for ${userNameForResponse} but couldn't find a direct answer or summary.${related ? ` Perhaps you'd be interested in these related searches: ${related}?` : ""}`;
          return { result: fallbackMsg, structuredData: undefined };
        }
        this.log("info", `${executionLogPrefix} Found fallback answer/snippet. Type: ${resultType}`);
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
          conversationalResult = `I found a snippet from ${(extractedData as CachedWebSnippet).source || "the web"} about "${query}", ${userNameForResponse}: "${(extractedData as CachedWebSnippet).snippet.substring(0, 150)}..."`;
        }
        return { result: conversationalResult, structuredData: finalStructuredOutput };
      }
    } catch (error: any) {
      const originalErrorMessage = String(error?.message || (typeof error === 'string' ? error : "Unknown web search error"));
      const errorMessage = `Web search failed: ${originalErrorMessage}`;
      this.log("error", `${executionLogPrefix} Search failed: ${originalErrorMessage}`, { error });
      let responseStructuredData: AnyToolStructuredData | undefined;
      const baseErrorData = { query: toolInput, error: errorMessage };
      switch (mode) {
        case "tiktok_search": responseStructuredData = { result_type: "video_list", source_api: "serper_tiktok", videos: [], ...baseErrorData }; break;
        default: responseStructuredData = { result_type: "web_snippet", source_api: "serper_general", data: null, ...baseErrorData } as CachedSingleWebResult;
      }
      if (error.name === "AbortError" || error.name === 'TimeoutError') {
        this.log("warn", `${executionLogPrefix} Request timed out.`);
        if (responseStructuredData) (responseStructuredData as any).error = "Request timed out.";
        return { error: "Web search timed out.", result: `Sorry, ${userNameForResponse}, the web search took too long to respond. Please try again in a moment.`, structuredData: responseStructuredData };
      }
      return { error: errorMessage, result: `Sorry, ${userNameForResponse}, Minato encountered an unexpected problem while searching the web. It might be a temporary issue.`, structuredData: responseStructuredData };
    }
    
    // Make sure to add a return statement at the end to satisfy TypeScript
    return { 
      error: "Execution not implemented", 
      result: "Web search implementation not complete", 
      structuredData: undefined 
    };
  }
}
