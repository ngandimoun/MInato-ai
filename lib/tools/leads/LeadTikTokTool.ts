import { BaseTool, ToolInput, ToolOutput } from "../base-tool";
import { WebSearchTool } from "../WebSearchTool";
import { generateStructuredJson } from "../../providers/llm_clients";
import { logger } from "../../../memory-framework/config";
import { LEAD_KEYWORDS_BY_LANGUAGE } from "./lead-prompts";

interface LeadTikTokInput extends ToolInput {
  search_prompt: string;
  industry_focus?: string;
  target_audience?: string;
  limit?: number;
}

interface TikTokLeadAnalysis {
  lead_score: number;
  urgency_level: "low" | "medium" | "high" | "urgent";
  pain_points: string[];
  decision_maker_indicators: string[];
  engagement_potential: number;
  platform_insights: {
    content_relevance: number;
    creator_authority: number;
    engagement_quality: number;
    trend_alignment: number;
  };
  tags: string[];
  reasoning: string;
}

export class LeadTikTokTool extends BaseTool {
  name = "LeadTikTokTool";
  description = "Finds potential leads from TikTok content by analyzing trending topics, comments, and business-related content";
  
  argsSchema = {
    type: "object" as const,
    properties: {
      search_prompt: {
        type: "string",
        description: "Search query to find relevant TikTok content"
      },
      industry_focus: {
        type: "string",
        description: "Optional industry focus to narrow down results"
      },
      target_audience: {
        type: "string",
        description: "Optional target audience description"
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return",
        minimum: 1,
        maximum: 20
      }
    },
    required: ["search_prompt"],
    additionalProperties: false as false
  };

  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_REQUESTS_PER_MINUTE = 30;
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

  private async fetchWithRetry(searchQuery: string, retryCount = 0): Promise<any> {
    try {
      await this.enforceRateLimit();

      // Use WebSearchTool with TikTok-specific parameters
      const searchResult = await this.webSearchTool.execute({
        query: `site:tiktok.com ${searchQuery}`,
        mode: "tiktok_search",
        limit: 10
      });

      if (!searchResult || searchResult.error) {
        throw new Error(searchResult?.error || "Invalid search result");
      }

      return searchResult.structuredData;
    } catch (error) {
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
        this.log("warn", `TikTok search failed, retrying in ${delay}ms...`);
        await this.wait(delay);
        return this.fetchWithRetry(searchQuery, retryCount + 1);
      }
      throw error;
    }
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on character patterns
    const languages = Object.keys(LEAD_KEYWORDS_BY_LANGUAGE);
    for (const lang of languages) {
      const keywords = LEAD_KEYWORDS_BY_LANGUAGE[lang];
      if (keywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()))) {
        return lang;
      }
    }
    return 'en'; // Default to English
  }

  async execute(input: LeadTikTokInput): Promise<ToolOutput> {
    try {
      const searchQuery = input.search_prompt;
      const detectedLanguage = this.detectLanguage(searchQuery);
      const searchKeywords = LEAD_KEYWORDS_BY_LANGUAGE[detectedLanguage];

      // Enhance search query with industry and audience focus
      const enhancedQuery = [
        searchQuery,
        input.industry_focus ? `${input.industry_focus} industry` : "",
        input.target_audience ? `for ${input.target_audience}` : "",
        searchKeywords.join(" OR ")
      ].filter(Boolean).join(" ");

      const searchResults = await this.fetchWithRetry(enhancedQuery);

      if (!searchResults || !Array.isArray(searchResults)) {
        return {
          error: "Invalid search results format",
          result: "Failed to fetch TikTok leads",
          structuredData: {
            result_type: "tiktok_leads",
            leads: [],
            summary: {
              total_leads: 0,
              search_query: searchQuery,
              language: detectedLanguage
            }
          }
        };
      }

      // Process each result in parallel with rate limiting
      const leadPromises = searchResults.map(async (result: any, index: number) => {
        await this.wait(index * (60000 / this.MAX_REQUESTS_PER_MINUTE)); // Stagger requests

        try {
          const leadAnalysis = await generateStructuredJson<TikTokLeadAnalysis>(
            JSON.stringify({
              content: result,
              context: {
                search_prompt: input.search_prompt,
                industry_focus: input.industry_focus,
                target_audience: input.target_audience
              }
            }),
            "Analyze this TikTok content for lead potential",
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
                    creator_authority: { type: "number", minimum: 0, maximum: 100 },
                    engagement_quality: { type: "number", minimum: 0, maximum: 100 },
                    trend_alignment: { type: "number", minimum: 0, maximum: 100 }
                  },
                  required: ["content_relevance", "creator_authority", "engagement_quality", "trend_alignment"]
                },
                tags: { type: "array", items: { type: "string" } },
                reasoning: { type: "string" }
              },
              required: ["lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "platform_insights", "tags", "reasoning"]
            },
            "TikTokLeadAnalysis",
            [],
            "gpt-4.1-mini-2025-04-14"
          );

          if (!leadAnalysis || 'error' in leadAnalysis) {
            return null;
          }

          return {
            platform: "tiktok",
            url: result.url,
            title: result.title,
            creator: result.creator || "Unknown",
            description: result.description || "",
            engagement_stats: result.engagement_stats || {},
            lead_analysis: leadAnalysis,
            raw_data: result
          };
        } catch (error) {
          this.log("error", `Failed to analyze lead: ${error}`);
          return null;
        }
      });

      const leadResults = await Promise.all(leadPromises);
      const validLeads = leadResults.filter((lead): lead is NonNullable<typeof lead> => lead !== null);

      // Sort by lead score
      validLeads.sort((a, b) => {
        const scoreA = a.lead_analysis.lead_score;
        const scoreB = b.lead_analysis.lead_score;
        return scoreB - scoreA;
      });

      const summary = {
        total_leads: validLeads.length,
        average_lead_score: validLeads.length > 0 
          ? Math.round(validLeads.reduce((sum, lead) => sum + lead.lead_analysis.lead_score, 0) / validLeads.length)
          : 0,
        search_query: searchQuery,
        language: detectedLanguage,
        industry_focus: input.industry_focus,
        target_audience: input.target_audience,
        top_creators: [...new Set(validLeads.map(lead => lead.creator))].slice(0, 5)
      };

      return {
        result: `Found ${validLeads.length} potential leads on TikTok`,
        structuredData: {
          result_type: "tiktok_leads",
          leads: validLeads,
          summary
        }
      };

    } catch (error) {
      this.log("error", `TikTok lead search failed: ${error}`);
      return {
        error: `Failed to search TikTok leads: ${error}`,
        result: "Failed to fetch TikTok leads",
        structuredData: {
          result_type: "tiktok_leads",
          leads: [],
          summary: {
            total_leads: 0,
            search_query: input.search_prompt,
            language: "unknown"
          }
        }
      };
    }
  }
} 