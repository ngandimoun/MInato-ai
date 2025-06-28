//livingdossier/services/tools-livings/Serper_WebSearchTool.ts

import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "./base-tool";
import { logger } from "../../memory-framework/config";
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

// --- MISSING TYPE DEFINITIONS ---

interface CachedNewsList {
  result_type: "news_list";
  source_api: string;
  results: SerperNewsResult[];
  query?: Record<string, any>;
  error?: string;
}

interface CachedPlacesList {
  result_type: "places_list";
  source_api: string;
  results: SerperPlaceResult[];
  query?: Record<string, any>;
  error?: string;
}

interface CachedScholarList {
  result_type: "scholar_list";
  source_api: string;
  results: SerperScholarResult[];
  query?: Record<string, any>;
  error?: string;
}

interface CachedPatentsList {
  result_type: "patents_list";
  source_api: string;
  results: SerperPatentResult[];
  query?: Record<string, any>;
  error?: string;
}

// --- MAIN TOOL CLASS ---

export class SerperWebSearchTool extends BaseTool {
  name = 'SerperWebSearchTool';
  description = 'A powerful tool for web intelligence. It can perform targeted web searches (including social media, news, and academic papers), scrape full content from webpages, and crawl entire websites.';
  argsSchema = {
    type: "object" as const,
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
    required: ["query"],
    additionalProperties: false as const
  };

  private serperApiKey: string;
  private firecrawlApiKey: string;
  private jinaApiKey: string;

  constructor() {
    super();
    
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
      return { error: "Serper API key is not configured." };
    }
    if (!params.query) {
      return { error: "Search query is required." };
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
      return { result: "Search completed successfully", structuredData: formattedResults[0] };

    } catch (error: any) {
      logger.error('Error executing Serper search:', error);
      return { error: `Serper search failed: ${error.message}` };
    }
  }

  /**
   * Scrapes full content from multiple URLs. Prioritizes the free Jina AI service and falls back to the robust Firecrawl.
   */
  public async scrape_webpage(params: ScrapeInput): Promise<ToolOutput> {
    if (!params.urls || params.urls.length === 0) {
      return { error: "At least one URL is required for scraping." };
    }

    const scrapePromises = params.urls.map(url => this.scrapeSingleUrl(url));
    const results = await Promise.all(scrapePromises);

    const successfulScrapes = results.filter(r => r.success);
    const failedScrapes = results.filter(r => !r.success);

    return {
      result: `Scraped ${successfulScrapes.length} URLs successfully and failed on ${failedScrapes.length}.`,
      structuredData: {
        result_type: "scrape_results",
        source_api: "serper_websearch",
        successful: successfulScrapes,
        failed: failedScrapes,
      }
    };
  }

  /**
   * Initiates an asynchronous crawl of an entire website using Firecrawl.
   */
  public async crawl_website(params: CrawlInput): Promise<ToolOutput> {
    if (!this.firecrawlApiKey) return { error: "Firecrawl API key is not configured." };
    if (!params.url) return { error: "URL is required to start a crawl." };

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
        result: `Crawl successfully started for ${params.url}. Use the 'check_crawl_status' tool with the returned job ID.`,
        structuredData: {
          result_type: "crawl_initiated",
          source_api: "firecrawl",
          jobId: response.data.jobId
        }
      };
    } catch (error: any) {
      logger.error('Error initiating Firecrawl crawl:', error);
      return { error: `Failed to start crawl: ${error.message}` };
    }
  }

  /**
   * Checks the status of a Firecrawl job and returns the data if complete.
   */
  public async check_crawl_status(params: CheckCrawlStatusInput): Promise<ToolOutput> {
    if (!this.firecrawlApiKey) return { error: "Firecrawl API key is not configured." };
    if (!params.job_id) return { error: "Job ID is required to check crawl status." };

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
          result: `Crawl job complete. Found ${response.data.data.length} pages.`,
          structuredData: {
            result_type: "crawl_completed",
            source_api: "firecrawl",
            status: "completed",
            data: response.data.data
          }
        };
      } else {
        return { 
          result: `Crawl is not complete yet. Current status: ${status}. Please check again later.`,
          structuredData: {
            result_type: "crawl_status",
            source_api: "firecrawl",
            status: status
          }
        };
      }
    } catch (error: any) {
      logger.error('Error checking crawl status:', error);
      return { error: `Failed to check crawl status: ${error.message}` };
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

  private formatSerperResults(data: SerperResponse): any[] {
    const results: any[] = [];
    if (data.answerBox) results.push({ type: 'answer_box', ...data.answerBox });
    if (data.knowledgeGraph) results.push({ type: 'knowledge_graph', ...data.knowledgeGraph });
    if (data.organic) results.push({ type: 'web_results', results: data.organic });
    if (data.videos) results.push({ type: 'video_list', results: data.videos });
    if (data.images) results.push({ type: 'image_list', results: data.images });
    if (data.news) results.push({ 
      type: 'news_list', 
      result_type: 'news_list',
      source_api: 'serper',
      results: data.news 
    } as CachedNewsList);
    if (data.shopping) results.push({ type: 'product_list', results: data.shopping });
    if (data.places) results.push({ 
      type: 'places_list', 
      result_type: 'places_list',
      source_api: 'serper',
      results: data.places 
    } as CachedPlacesList);
    if (data.scholar) results.push({ 
      type: 'scholar_list', 
      result_type: 'scholar_list',
      source_api: 'serper',
      results: data.scholar 
    } as CachedScholarList);
    if (data.patents) results.push({ 
      type: 'patents_list', 
      result_type: 'patents_list',
      source_api: 'serper',
      results: data.patents 
    } as CachedPatentsList);
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