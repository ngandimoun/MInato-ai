import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "../base-tool";
import { WebSearchTool } from "../WebSearchTool";
import { generateStructuredJson } from "../../providers/llm_clients";
import { logger } from "../../../memory-framework/config";
import { LEAD_KEYWORDS_BY_LANGUAGE } from "./lead-prompts";

interface LeadYouTubeInput extends ToolInput {
  search_prompt: string;
  industry_focus?: string;
  target_audience?: string;
  limit?: number;
}

interface YouTubeLeadAnalysis {
  lead_score: number;
  urgency_level: "low" | "medium" | "high" | "urgent";
  pain_points: string[];
  decision_maker_indicators: string[];
  engagement_potential: number;
  platform_insights: {
    content_relevance: number;
    channel_authority: number;
    engagement_quality: number;
    video_quality: number;
  };
  tags: string[];
  reasoning: string;
}

export class LeadYouTubeTool extends BaseTool {
  name = "LeadYouTubeTool";
  description = "Finds potential leads from YouTube videos by searching for YouTube content and analyzing it for business opportunities and pain points";
  
  argsSchema = {
    type: "object" as const,
    properties: {
      search_prompt: {
        type: "string" as const,
        description: "Search query to find relevant YouTube videos (e.g., 'small business struggling with marketing')"
      } as OpenAIToolParameterProperties,
      industry_focus: {
        type: ["string", "null"] as const,
        description: "Optional industry focus to narrow down results (e.g., 'SaaS', 'e-commerce', 'healthcare')"
      } as OpenAIToolParameterProperties,
      target_audience: {
        type: ["string", "null"] as const,
        description: "Optional target audience description (e.g., 'startup founders', 'marketing managers')"
      } as OpenAIToolParameterProperties,
      limit: {
        type: ["number", "null"] as const,
        description: "Maximum number of lead videos to analyze (1-10, default 5)",
        minimum: 1,
        maximum: 10
      } as OpenAIToolParameterProperties
    },
    required: ["search_prompt"],
    additionalProperties: false as false
  };

  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_REQUESTS_PER_MINUTE = 20; // YouTube API quota management
  private readonly YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
  private readonly USER_AGENT = `MinatoAILeads/1.0 (production; contact: ${process.env.EMAIL_FROM_ADDRESS || "support@example.com"})`;
  private lastRequestTime: number = 0;

  private webSearchTool: WebSearchTool;

  constructor() {
    super();
    this.webSearchTool = new WebSearchTool();
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minTimeBetweenRequests = (60 * 1000) / this.MAX_REQUESTS_PER_MINUTE;

    if (timeSinceLastRequest < minTimeBetweenRequests) {
      await this.wait(minTimeBetweenRequests - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
    try {
      await this.enforceRateLimit();
      const response = await fetch(url, {
        ...options,
        headers: new Headers({
          ...(options.headers instanceof Headers ? Object.fromEntries(options.headers.entries()) : options.headers || {}),
          "User-Agent": this.USER_AGENT
        })
      });

      // Handle different response statuses
      if (response.status === 200) {
        return response;
      } else if (response.status === 403) {
        // API key issues or quota exceeded
        throw new Error("YouTube API access denied. Please check API key and quota.");
      } else if (response.status === 429) {
        // Too Many Requests
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
        this.log("warn", `Rate limited by YouTube API. Waiting ${retryAfter} seconds before retry.`);
        await this.wait(retryAfter * 1000);
        throw new Error("Rate limited");
      } else if (response.status >= 500) {
        // Server error - should retry
        throw new Error(`YouTube API server error: ${response.status}`);
      } else {
        // Client error - should not retry
        this.log("error", `YouTube API error: ${response.status} ${response.statusText}`);
        return response;
      }
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        this.log("warn", `Retrying request after ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await this.wait(delay);
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  private async searchYouTubeVideos(query: string, language: string, limit: number = 5): Promise<any[]> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      this.log("error", "YouTube API key not configured");
      return [];
    }

    const searchUrl = new URL(`${this.YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.append("key", apiKey);
    searchUrl.searchParams.append("part", "snippet");
    searchUrl.searchParams.append("q", query);
    searchUrl.searchParams.append("type", "video");
    searchUrl.searchParams.append("maxResults", String(Math.min(limit, 10)));
    searchUrl.searchParams.append("relevanceLanguage", language.split("-")[0]);
    searchUrl.searchParams.append("videoEmbeddable", "true");

    try {
      const response = await this.fetchWithRetry(searchUrl.toString(), {
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        this.log("error", `YouTube API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data?.items || !Array.isArray(data.items)) {
        this.log("warn", "Invalid YouTube API response structure");
        return [];
      }

      // Get video details for each result
      const videoIds = data.items.map((item: any) => item.id.videoId).join(",");
      if (!videoIds) {
        return [];
      }

      const detailsUrl = new URL(`${this.YOUTUBE_API_BASE}/videos`);
      detailsUrl.searchParams.append("key", apiKey);
      detailsUrl.searchParams.append("part", "snippet,statistics");
      detailsUrl.searchParams.append("id", videoIds);

      const detailsResponse = await this.fetchWithRetry(detailsUrl.toString(), {
        signal: AbortSignal.timeout(30000)
      });

      if (!detailsResponse.ok) {
        this.log("error", `YouTube video details API error: ${detailsResponse.status}`);
        return data.items;
      }

      const detailsData = await detailsResponse.json();
      
      // Merge search results with video details
      return data.items.map((item: any) => {
        const details = detailsData.items?.find((v: any) => v.id === item.id.videoId);
        return {
          ...item,
          statistics: details?.statistics || {}
        };
      });

    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      this.log("error", `Error searching YouTube: ${errorMessage}`);
      
      // If it's a timeout error, return empty array
      if (errorMessage.includes('timeout')) {
        return [];
      }
      
      throw error;
    }
  }

  async execute(input: LeadYouTubeInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = "[LeadYouTubeTool]";
    
    try {
      const limit = Math.min(Math.max(1, input.limit || 5), 10);
      
      // Detect language from search prompt
      const detectedLanguage = this.detectLanguage(input.search_prompt);
      logger.info(`${logPrefix} Detected language: ${detectedLanguage}`);
      
      // Build enhanced search query for lead generation
      let searchQuery = input.search_prompt;
      
      // Add industry and audience context to search
      if (input.industry_focus) {
        searchQuery += ` ${input.industry_focus}`;
      }
      if (input.target_audience) {
        searchQuery += ` ${input.target_audience}`;
      }
      
      // Add language-specific YouTube lead keywords
      const localizedKeywords = this.getLocalizedKeywords(detectedLanguage);
      const keywordSample = localizedKeywords.slice(0, 6);
      searchQuery += ` ${keywordSample.join(' ')}`;

      logger.info(`${logPrefix} Searching YouTube content for: "${searchQuery}" (Language: ${detectedLanguage})`);

      // Search for YouTube videos
      const videos = await this.searchYouTubeVideos(searchQuery, detectedLanguage, limit);
      
      if (!videos || videos.length === 0) {
        return {
          result: "No relevant YouTube videos found",
          error: "No videos found matching the search criteria",
          structuredData: {
            result_type: "youtube_leads",
            leads: [],
            summary: {
              total_leads: 0,
              search_query: searchQuery,
              language: detectedLanguage,
              industry_focus: input.industry_focus,
              target_audience: input.target_audience
            }
          }
        };
      }

      // Analyze each video for lead potential
      const leadResults = await Promise.all(videos.map(async (video: any) => {
        if (abortSignal?.aborted) return null;

        const analysis = await this.analyzeVideoLeadPotential(video, input.search_prompt);
        
        return {
          id: video.id.videoId,
          title: video.snippet.title,
          description: video.snippet.description,
          channel: video.snippet.channelTitle,
          platform: "youtube",
          source_url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
          embed_url: `https://www.youtube.com/embed/${video.id.videoId}`,
          thumbnail_url: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url,
          published_at: video.snippet.publishedAt,
          engagement_metrics: {
            views: parseInt(video.statistics?.viewCount || "0", 10),
            likes: parseInt(video.statistics?.likeCount || "0", 10),
            comments: parseInt(video.statistics?.commentCount || "0", 10)
          },
          lead_analysis: analysis,
          raw_data: video
        };
      }));

      // Filter out null results (from aborted requests)
      const validLeads = leadResults.filter((lead): lead is NonNullable<typeof lead> => lead !== null);

      // Sort by lead score
      validLeads.sort((a, b) => b.lead_analysis.lead_score - a.lead_analysis.lead_score);

      const summary = {
        total_leads: validLeads.length,
        average_lead_score: validLeads.length > 0 
          ? Math.round(validLeads.reduce((sum, lead) => sum + lead.lead_analysis.lead_score, 0) / validLeads.length)
          : 0,
        search_query: searchQuery,
        language: detectedLanguage,
        industry_focus: input.industry_focus,
        target_audience: input.target_audience,
        top_channels: [...new Set(validLeads.map(lead => lead.channel))].slice(0, 5)
      };

      return {
        result: `Found ${validLeads.length} relevant YouTube leads`,
        structuredData: {
          result_type: "youtube_leads",
          leads: validLeads,
          summary
        }
      };

    } catch (error: any) {
      logger.error(`${logPrefix} Execution error:`, error);
      return {
        error: `YouTube lead search failed: ${error.message}`,
        result: "YouTube lead search failed",
        structuredData: undefined
      };
    }
  }

  private async analyzeVideoLeadPotential(video: any, searchPrompt: string): Promise<YouTubeLeadAnalysis> {
    const analysisPrompt = `
You are an expert lead generation analyst specializing in YouTube content analysis. Analyze this YouTube video for potential business leads.

VIDEO DETAILS:
- Title: "${video.snippet.title}"
- Description: "${video.snippet.description || 'No description available'}"
- Channel: "${video.snippet.channelTitle}"
- Published: "${video.snippet.publishedAt}"

SEARCH CONTEXT:
- Search Query: "${searchPrompt}"

ANALYSIS CRITERIA:

1. LEAD SCORE (0-100):
   - 90-100: Perfect lead - clear business need, decision maker
   - 80-89: Excellent lead - strong business focus
   - 70-79: Good lead - relevant business content
   - 60-69: Moderate lead - business-related but needs qualification
   - 50-59: Low lead - general content
   - 0-49: Poor lead - not business-focused

2. URGENCY LEVEL:
   - urgent: Immediate business need or problem
   - high: Clear business challenge to solve
   - medium: Potential business opportunity
   - low: General information or entertainment

3. PAIN POINTS: Extract specific business challenges mentioned

4. DECISION MAKER INDICATORS:
   - Channel authority in business topics
   - Professional content quality
   - Business expertise demonstrated
   - Target audience engagement

5. ENGAGEMENT POTENTIAL (0-100):
   - Content quality and professionalism
   - Channel's business focus
   - Audience engagement signals
   - Call-to-action presence

6. PLATFORM INSIGHTS:
   - content_relevance (0-100): How relevant to business needs
   - channel_authority (0-100): Channel's business credibility
   - engagement_quality (0-100): Audience interaction quality
   - video_quality (0-100): Production and content quality

7. TAGS: Relevant categories (e.g., "business", "tutorial", "review")

8. REASONING: Brief explanation of the lead assessment

OUTPUT FORMAT: JSON object with the exact structure shown in the interface.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      const analysis = await generateStructuredJson<YouTubeLeadAnalysis>(
        analysisPrompt,
        `Video: ${video.snippet.title}\nDescription: ${video.snippet.description || 'No description'}`,
        {
          type: "object",
          properties: {
            lead_score: { type: "number", minimum: 0, maximum: 100 },
            urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            pain_points: { type: "array", items: { type: "string" } },
            decision_maker_indicators: { type: "array", items: { type: "string" } },
            engagement_potential: { type: "number", minimum: 0, maximum: 100 },
            platform_insights: {
              type: "object",
              properties: {
                content_relevance: { type: "number", minimum: 0, maximum: 100 },
                channel_authority: { type: "number", minimum: 0, maximum: 100 },
                engagement_quality: { type: "number", minimum: 0, maximum: 100 },
                video_quality: { type: "number", minimum: 0, maximum: 100 }
              },
              required: ["content_relevance", "channel_authority", "engagement_quality", "video_quality"],
              additionalProperties: false
            },
            tags: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" }
          },
          required: ["lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "platform_insights", "tags", "reasoning"],
          additionalProperties: false
        },
        "YouTubeLeadAnalysis",
        [],
        "gpt-4.1-mini-2025-04-14"
      );

      if (!analysis || 'error' in analysis) {
        return {
          lead_score: 30,
          urgency_level: "low",
          pain_points: [],
          decision_maker_indicators: [],
          engagement_potential: 30,
          platform_insights: {
            content_relevance: 30,
            channel_authority: 30,
            engagement_quality: 30,
            video_quality: 30
          },
          tags: ["analysis_failed"],
          reasoning: "Analysis failed - using default values"
        };
      }

      return analysis;
    } catch (error) {
      logger.error(`[LeadYouTubeTool] Analysis failed for video ${video.id.videoId}:`, error);
      return {
        lead_score: 30,
        urgency_level: "low",
        pain_points: [],
        decision_maker_indicators: [],
        engagement_potential: 30,
        platform_insights: {
          content_relevance: 30,
          channel_authority: 30,
          engagement_quality: 30,
          video_quality: 30
        },
        tags: ["error_occurred"],
        reasoning: "Analysis error - using default values"
      };
    }
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on common patterns
    const text_lower = text.toLowerCase();
    
    // French indicators
    if (text_lower.includes('le ') || text_lower.includes('la ') || text_lower.includes('les ') || 
        text_lower.includes('un ') || text_lower.includes('une ') || text_lower.includes('des ') ||
        text_lower.includes('avec') || text_lower.includes('pour') || text_lower.includes('dans')) {
      return 'fr';
    }
    
    // Spanish indicators
    if (text_lower.includes('el ') || text_lower.includes('la ') || text_lower.includes('los ') || 
        text_lower.includes('las ') || text_lower.includes('un ') || text_lower.includes('una ') ||
        text_lower.includes('con') || text_lower.includes('para') || text_lower.includes('en ')) {
      return 'es';
    }
    
    // German indicators
    if (text_lower.includes('der ') || text_lower.includes('die ') || text_lower.includes('das ') || 
        text_lower.includes('ein ') || text_lower.includes('eine ') || text_lower.includes('mit') ||
        text_lower.includes('für') || text_lower.includes('und') || text_lower.includes('ich')) {
      return 'de';
    }
    
    // Italian indicators
    if (text_lower.includes('il ') || text_lower.includes('la ') || text_lower.includes('gli ') || 
        text_lower.includes('le ') || text_lower.includes('un ') || text_lower.includes('una ') ||
        text_lower.includes('con') || text_lower.includes('per') || text_lower.includes('di ')) {
      return 'it';
    }
    
    // Portuguese indicators
    if (text_lower.includes('o ') || text_lower.includes('a ') || text_lower.includes('os ') || 
        text_lower.includes('as ') || text_lower.includes('um ') || text_lower.includes('uma ') ||
        text_lower.includes('com') || text_lower.includes('para') || text_lower.includes('de ')) {
      return 'pt';
    }
    
    // Check for non-Latin scripts
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh'; // Chinese
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'; // Japanese
    if (/[\uac00-\ud7af]/.test(text)) return 'ko'; // Korean
    if (/[\u0600-\u06ff]/.test(text)) return 'ar'; // Arabic
    if (/[\u0900-\u097f]/.test(text)) return 'hi'; // Hindi
    if (/[\u0400-\u04ff]/.test(text)) return 'ru'; // Russian
    
    // Default to English
    return 'en';
  }

  private getLocalizedKeywords(language: string): string[] {
    return LEAD_KEYWORDS_BY_LANGUAGE[language] || LEAD_KEYWORDS_BY_LANGUAGE['en'];
  }
} 