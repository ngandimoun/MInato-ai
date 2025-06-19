//livingdossier/services/tools-livings/Serper_WebSearchTool.ts

import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import fetch from "node-fetch";
import { appConfig } from "../config";
import { logger } from "../../memory-framework/config";
import {
  CachedAnswerBox, CachedKnowledgeGraph, CachedWebSnippet, CachedSingleWebResult,
  CachedVideoList, CachedTikTokVideo, CachedProduct, CachedProductList,
  CachedImageList, CachedImageResult, CachedNewsList, CachedNewsArticle,
  CachedPlacesList, CachedPlace, CachedScholarList, CachedScholarArticle, 
  CachedPatentsList, CachedPatent, AnyToolStructuredData
} from "@/lib/types/index";
import { generateStructuredJson } from "../providers/llm_clients";
import axios from 'axios';
import { config } from '../../config/config';

// --- ENHANCED INPUT INTERFACES ---

interface WebSearchInput extends ToolInput {
  query: string;
  search_type?: "general" | "videos" | "images" | "news" | "shopping" | "places" | "scholar" | "patents" | "social";
  num_results?: number;
  location?: string | null;
  language?: string | null;
  // NEW: Specify the social media platform for a 'social' search
  social_platform?: "tiktok" | "instagram" | "facebook" | "twitter" | "reddit" | "linkedin";
}

interface ScrapeInput extends ToolInput {
  urls: string[]; // Expect an array of URLs for efficiency
}

interface CrawlInput extends ToolInput {
  url: string;
  // JSON string for crawler options, e.g., includes, excludes, maxDepth
  crawler_options?: string; 
}

interface CheckCrawlStatusInput extends ToolInput {
  job_id: string;
}

// --- SERPER API RESPONSE TYPES ---

interface SerperOrganicResult { title?: string; link?: string; snippet?: string; position?: number; imageUrl?: string; source?: string; }
interface SerperImageResult { title?: string; imageUrl?: string; link?: string; source?: string; }
interface SerperNewsResult { title?: string; link?: string; snippet?: string; source?: string; date?: string; imageUrl?: string; }
interface SerperVideoResult { title?: string; link?: string; snippet?: string; date?: string; source?: string; imageUrl?: string; duration?: string; channel?: string; }
interface SerperShoppingResult { title?: string; link?: string; source?: string; price?: number; priceString?: string; rating?: number | string; reviews?: number | string; imageUrl?: string; productId?: string; currency?: string; }
interface SerperPlaceResult { title?: string; address?: string; category?: string; rating?: number; reviews?: number; latitude?: number; longitude?: number; link?: string; }
interface SerperScholarResult { title?: string; link?: string; snippet?: string; source?: string; publicationInfo?: string; totalCitations?: number; authors?: string; }
interface SerperPatentResult { title?: string; link?: string; snippet?: string; patentOffice?: string; grantDate?: string; patentNumber?: string; inventors?: string; assignee?: string; }
interface SerperAnswerBox { answer?: string; snippet?: string; title?: string; link?: string; }
interface SerperKnowledgeGraph { title?: string; type?: string; description?: string; imageUrl?: string; attributes?: Record<string, string>; link?: string; source?: string; }

interface SerperResponse {
  searchParameters?: { q: string; gl?: string; hl?: string; type?: string };
  answerBox?: SerperAnswerBox;
  knowledgeGraph?: SerperKnowledgeGraph;
  organic?: SerperOrganicResult[];
  videos?: SerperVideoResult[];
  images?: SerperImageResult[];
  news?: SerperNewsResult[];
  shopping?: SerperShoppingResult[];
  places?: SerperPlaceResult[];
  scholar?: SerperScholarResult[];
  patents?: SerperPatentResult[];
}

// --- MAIN TOOL CLASS ---

export class SerperWebSearchTool extends BaseTool {
  private serperApiKey: string;
  private firecrawlApiKey: string;
  private jinaApiKey: string;

  constructor() {
    super();
    
    this.name = 'SerperWebSearchTool';
    this.description = 'A powerful tool for web intelligence. It can perform targeted web searches (including social media, news, and academic papers), scrape full content from webpages, and crawl entire websites.';
    this.argsSchema = {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query"
        },
        search_type: {
          type: "string",
          enum: ["general", "videos", "images", "news", "shopping", "places", "scholar", "patents", "social"],
          description: "Type of search to perform"
        },
        num_results: {
          type: "number",
          description: "Number of results to return"
        },
        location: {
          type: "string",
          description: "Location for search context"
        },
        language: {
          type: "string",
          description: "Language for search results"
        },
        social_platform: {
          type: "string",
          enum: ["tiktok", "instagram", "facebook", "twitter", "reddit", "linkedin"],
          description: "Social media platform for social searches"
        }
      },
      required: ["query"]
    };

    this.serperApiKey = config.SERPER_API_KEY || '';
    this.firecrawlApiKey = config.FIRECRAWL_API_KEY || '';
    this.jinaApiKey = config.JINA_API_KEY || ''; // Jina is preferred for scraping; can be optional

    if (!this.serperApiKey) logger.warn("SERPER_API_KEY is not set. Web search will fail.");
    if (!this.firecrawlApiKey) logger.warn("FIRECRAWL_API_KEY is not set. Scraping and crawling will be limited.");
    if (!this.jinaApiKey) logger.warn("JINA_API_KEY is not set. Falling back to Firecrawl for all scraping.");
  }

  /**
   * Performs a targeted web search using the Serper API, with added social media capabilities.
   */
  public async search(params: WebSearchInput): Promise<ToolOutput> {
    if (!this.serperApiKey) {
      return { success: false, error: "Serper API key is not configured." };
    }
    if (!params.query) {
      return { success: false, error: "Search query is required." };
    }

    let finalQuery = params.query;
    const searchType = params.search_type || "general";

    // Enhance query for social media searches
    if (searchType === 'social' && params.social_platform) {
      finalQuery = `${params.query} site:${params.social_platform}.com`;
    }

    try {
      const payload = {
        q: finalQuery,
        gl: params.location,
        hl: params.language,
        num: params.num_results || 10,
      };

      const response = await axios.post<SerperResponse>(
        `https://google.serper.dev/${searchType === 'general' || searchType === 'social' ? 'search' : searchType}`,
        payload,
        { headers: { 'X-API-KEY': this.serperApiKey, 'Content-Type': 'application/json' } }
      );

      // Format the raw results into a clean, structured output
      const formattedResults = this.formatSerperResults(response.data);
      return { success: true, results: formattedResults };

    } catch (error: any) {
      logger.error('Error executing Serper search:', error);
      return { success: false, error: `Serper search failed: ${error.message}` };
    }
  }

  /**
   * Scrapes full content from multiple URLs. Prioritizes the free Jina AI service and falls back to the robust Firecrawl.
   */
  public async scrape_webpage(params: ScrapeInput): Promise<ToolOutput> {
    if (!params.urls || params.urls.length === 0) {
      return { success: false, error: "At least one URL is required for scraping." };
    }

    const scrapePromises = params.urls.map(url => this.scrapeSingleUrl(url));
    const results = await Promise.all(scrapePromises);

    const successfulScrapes = results.filter(r => r.success);
    const failedScrapes = results.filter(r => !r.success);

    return {
      success: successfulScrapes.length > 0,
      results: {
        message: `Scraped ${successfulScrapes.length} URLs successfully and failed on ${failedScrapes.length}.`,
        successful: successfulScrapes,
        failed: failedScrapes,
      }
    };
  }

  /**
   * Initiates an asynchronous crawl of an entire website using Firecrawl.
   */
  public async crawl_website(params: CrawlInput): Promise<ToolOutput> {
    if (!this.firecrawlApiKey) return { success: false, error: "Firecrawl API key is not configured." };
    if (!params.url) return { success: false, error: "URL is required to start a crawl." };

    try {
      const payload: { url: string; crawlerOptions?: any } = { url: params.url };
      if (params.crawler_options) {
        payload.crawlerOptions = JSON.parse(params.crawler_options);
      }

      const response = await axios.post(
        'https://api.firecrawl.dev/v1/crawl',
        payload,
        { headers: { 'Authorization': `Bearer ${this.firecrawlApiKey}`, 'Content-Type': 'application/json' }}
      );
      
      return { 
        success: true, 
        results: {
          message: `Crawl successfully started for ${params.url}. Use the 'check_crawl_status' tool with the returned job ID.`,
          jobId: response.data.jobId 
        }
      };
    } catch (error: any) {
      logger.error('Error initiating Firecrawl crawl:', error);
      return { success: false, error: `Failed to start crawl: ${error.message}` };
    }
  }

  /**
   * Checks the status of a Firecrawl job and returns the data if complete.
   */
  public async check_crawl_status(params: CheckCrawlStatusInput): Promise<ToolOutput> {
    if (!this.firecrawlApiKey) return { success: false, error: "Firecrawl API key is not configured." };
    if (!params.job_id) return { success: false, error: "Job ID is required to check crawl status." };

    try {
      const response = await axios.get(
        `https://api.firecrawl.dev/v1/crawl/status/${params.job_id}`,
        { headers: { 'Authorization': `Bearer ${this.firecrawlApiKey}`, 'Content-Type': 'application/json' }}
      );

      const status = response.data.status;
      if (status === "completed") {
        // In a real application, you would save this large data to a file/DB and return a pointer.
        // For now, we return a summary and the data itself.
        return {
          success: true,
          results: {
            status: "completed",
            message: `Crawl job complete. Found ${response.data.data.length} pages.`,
            data: response.data.data
          }
        };
      } else {
        return { success: true, results: { status: status, message: `Crawl is not complete yet. Current status: ${status}. Please check again later.` } };
      }
    } catch (error: any) {
      logger.error('Error checking crawl status:', error);
      return { success: false, error: `Failed to check crawl status: ${error.message}` };
    }
  }

  // --- HELPER METHODS ---

  private async scrapeSingleUrl(url: string): Promise<{ success: boolean; url: string; content?: string; error?: string; source: 'jina' | 'firecrawl' | 'none' }> {
    // Attempt 1: Jina AI (Free and fast)
    if (this.jinaApiKey) {
      try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const response = await axios.get(jinaUrl, {
          headers: { 'Authorization': `Bearer ${this.jinaApiKey}`, 'Accept': 'application/json' },
          timeout: 20000 // 20-second timeout
        });
        if (response.data && response.data.data && response.data.data.content) {
          return { success: true, url, content: response.data.data.content, source: 'jina' };
        }
      } catch (error) {
        logger.warn(`Jina AI scrape failed for ${url}, falling back to Firecrawl. Error: ${error}`);
      }
    }

    // Attempt 2: Firecrawl (Robust fallback)
    if (this.firecrawlApiKey) {
      try {
        const response = await axios.post(
          'https://api.firecrawl.dev/v1/scrape',
          { url: url, pageOptions: { onlyMainContent: true } },
          { headers: { 'Authorization': `Bearer ${this.firecrawlApiKey}`, 'Content-Type': 'application/json' }, timeout: 45000 }
        );
        if (response.data && response.data.data && response.data.data.markdown) {
          return { success: true, url, content: response.data.data.markdown, source: 'firecrawl' };
        }
      } catch (error: any) {
        logger.error(`Firecrawl scrape failed for ${url}. Error: ${error.message}`);
        return { success: false, url, error: error.message, source: 'none' };
      }
    }
    
    return { success: false, url, error: 'All scraping services failed or are not configured.', source: 'none' };
  }

  private formatSerperResults(data: SerperResponse): AnyToolStructuredData[] {
    const results: AnyToolStructuredData[] = [];
    if (data.answerBox) results.push({ type: 'answer_box', ...data.answerBox } as CachedAnswerBox);
    if (data.knowledgeGraph) results.push({ type: 'knowledge_graph', ...data.knowledgeGraph } as CachedKnowledgeGraph);
    if (data.organic) results.push({ type: 'web_results', results: data.organic } as CachedWebSnippet);
    if (data.videos) results.push({ type: 'video_list', results: data.videos } as CachedVideoList);
    if (data.images) results.push({ type: 'image_list', results: data.images } as CachedImageList);
    if (data.news) results.push({ type: 'news_list', results: data.news } as CachedNewsList);
    if (data.shopping) results.push({ type: 'product_list', results: data.shopping } as CachedProductList);
    if (data.places) results.push({ type: 'places_list', results: data.places } as CachedPlacesList);
    if (data.scholar) results.push({ type: 'scholar_list', results: data.scholar } as CachedScholarList);
    if (data.patents) results.push({ type: 'patents_list', results: data.patents } as CachedPatentsList);
    return results;
  }
  
  /**
   * Required abstract method from BaseTool. Delegates to the search method by default.
   */
  async execute(input: WebSearchInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    // By default, delegate to the search method
    return this.search(input);
  }
}