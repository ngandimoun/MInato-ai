import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "../base-tool";
import { WebSearchTool } from "../WebSearchTool";
import { generateStructuredJson } from "../../providers/llm_clients";
import { logger } from "../../../memory-framework/config";

interface LeadTikTokInput extends ToolInput {
  search_prompt: string;
  industry_focus?: string;
  target_audience?: string;
  limit?: number;
}

interface TikTokLeadAnalysis {
  url: string;
  title: string;
  description: string;
  creator: string;
  platform: "tiktok";
  lead_score: number;
  urgency_level: "low" | "medium" | "high" | "urgent";
  pain_points: string[];
  decision_maker_indicators: string[];
  engagement_potential: number;
  business_opportunity: string;
  target_persona: string;
  content_type: "tutorial" | "review" | "problem" | "discussion" | "showcase" | "trend" | "other";
  viewer_intent: "learning" | "buying" | "comparing" | "troubleshooting" | "entertaining" | "viral" | "other";
  hashtags: string[];
}

export class LeadTikTokTool extends BaseTool {
  name = "LeadTikTokTool";
  description = "Finds potential leads from TikTok videos by searching for TikTok content and analyzing it for business opportunities and pain points";
  
  argsSchema = {
    type: "object" as const,
    properties: {
      search_prompt: {
        type: "string",
        description: "Search query to find relevant TikTok videos (e.g., 'small business owner struggling with social media')"
      } as OpenAIToolParameterProperties,
      industry_focus: {
        type: "string",
        description: "Optional industry focus to narrow down results (e.g., 'SaaS', 'e-commerce', 'healthcare')"
      } as OpenAIToolParameterProperties,
      target_audience: {
        type: "string", 
        description: "Optional target audience description (e.g., 'startup founders', 'marketing managers')"
      } as OpenAIToolParameterProperties,
      limit: {
        type: "number",
        description: "Maximum number of TikTok videos to analyze (1-10, default 5)",
        minimum: 1,
        maximum: 10
      } as OpenAIToolParameterProperties
    },
    required: ["search_prompt"],
    additionalProperties: false as false
  };

  categories = ["leads", "tiktok", "analysis"];
  version = "1.0.0";

  private webSearchTool: WebSearchTool;

  constructor() {
    super();
    this.webSearchTool = new WebSearchTool();
  }

  async execute(input: LeadTikTokInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    try {
      const limit = Math.min(Math.max(1, input.limit || 5), 10);
      
      // Build TikTok-specific search query
      let searchQuery = `site:tiktok.com ${input.search_prompt}`;
      
      // Add industry and audience context
      if (input.industry_focus) {
        searchQuery += ` ${input.industry_focus}`;
      }
      if (input.target_audience) {
        searchQuery += ` ${input.target_audience}`;
      }
      
      // Add TikTok-specific lead keywords
      searchQuery += " business owner entrepreneur problem help advice struggling";

      logger.info(`[LeadTikTokTool] Searching TikTok content for: "${searchQuery}"`);

      // Search for TikTok content using web search
      const searchResult = await this.webSearchTool.execute({
        query: searchQuery,
        mode: "tiktok_search" // Use TikTok search mode
      }, abortSignal);

      if (searchResult.error || !searchResult.structuredData) {
        return {
          error: "Failed to search TikTok content",
          result: "Could not find TikTok videos for lead analysis"
        };
      }

      // Handle TikTok video results
      let tiktokVideos: any[] = [];
      if (searchResult.structuredData.result_type === "video_list") {
        const videoData = searchResult.structuredData as any;
        tiktokVideos = videoData.videos || [];
      } else if (searchResult.structuredData.result_type === "tiktok_video") {
        tiktokVideos = [searchResult.structuredData];
      }
      
      // Limit results
      tiktokVideos = tiktokVideos.slice(0, limit);
      
      if (tiktokVideos.length === 0) {
        return {
          result: "No TikTok videos found matching the search criteria",
          structuredData: {
            result_type: "tiktok_leads",
            total_videos: 0,
            leads: [],
            search_query: searchQuery
          }
        };
      }

      logger.info(`[LeadTikTokTool] Analyzing ${tiktokVideos.length} TikTok videos for leads`);

      // Analyze each TikTok video for lead potential
      const leadAnalyses: TikTokLeadAnalysis[] = [];
      
      for (const video of tiktokVideos) {
        if (abortSignal?.aborted) break;
        
        try {
          const analysis = await this.analyzeTikTokForLeads(video, input);
          if (analysis && analysis.lead_score > 25) { // Lower threshold for TikTok due to different content style
            leadAnalyses.push(analysis);
          }
        } catch (error) {
          logger.error(`[LeadTikTokTool] Failed to analyze TikTok video ${video.url}:`, error);
          continue;
        }
      }

      // Sort by lead score (highest first)
      leadAnalyses.sort((a, b) => b.lead_score - a.lead_score);

      const totalLeads = leadAnalyses.length;
      const avgScore = totalLeads > 0 ? Math.round(leadAnalyses.reduce((sum, lead) => sum + lead.lead_score, 0) / totalLeads) : 0;

      return {
        result: `Found ${totalLeads} potential leads from TikTok videos with average lead score of ${avgScore}`,
        structuredData: {
          result_type: "tiktok_leads",
          total_videos: tiktokVideos.length,
          total_leads: totalLeads,
          avg_lead_score: avgScore,
          leads: leadAnalyses,
          search_query: searchQuery,
          industry_focus: input.industry_focus,
          target_audience: input.target_audience
        }
      };

    } catch (error) {
      logger.error("[LeadTikTokTool] Execution failed:", error);
      return {
        error: "TikTok lead analysis failed",
        result: "Failed to analyze TikTok videos for leads"
      };
    }
  }

  private async analyzeTikTokForLeads(searchResult: any, input: LeadTikTokInput): Promise<TikTokLeadAnalysis | null> {
    const analysisPrompt = `
You are an expert lead generation analyst specializing in TikTok content analysis. Analyze this TikTok video content for potential business leads.

TIKTOK VIDEO DETAILS:
- URL: "${searchResult.url}"
- Title: "${searchResult.title}"
- Description/Snippet: "${searchResult.description || searchResult.snippet || 'No description available'}"

SEARCH CONTEXT:
- Search Query: "${input.search_prompt}"
- Industry Focus: "${input.industry_focus || 'General'}"
- Target Audience: "${input.target_audience || 'General'}"

ANALYSIS REQUIREMENTS:

1. LEAD SCORING (0-100):
   - Does the content indicate someone has a business problem or need?
   - Are there signs of entrepreneurial activity or business ownership?
   - Is the content recent and relevant to business opportunities?
   - Does it match the target industry/audience?
   - Note: TikTok content is often more casual, so adjust expectations accordingly

2. URGENCY ASSESSMENT:
   - "urgent": Immediate business problem, actively seeking solutions
   - "high": Clear business challenge, likely to act soon
   - "medium": Business problem exists, may act eventually
   - "low": General business interest, no immediate need

3. PAIN POINTS IDENTIFICATION:
   - Extract specific business problems mentioned
   - Focus on entrepreneurial or business-related challenges
   - Identify operational, marketing, or growth issues

4. DECISION MAKER INDICATORS:
   - Look for signs the creator is a business owner or decision maker
   - Check for business-focused content vs. personal content
   - Look for entrepreneurial language or business terminology

5. ENGAGEMENT POTENTIAL (0-100):
   - How likely is this person to respond to business outreach?
   - Are they actively engaging with business content?
   - Do they seem open to business solutions?

6. BUSINESS OPPORTUNITY:
   - What specific product/service could solve their problem?
   - How could a business help this TikTok creator?

7. CONTENT CATEGORIZATION:
   - Type: tutorial, review, problem, discussion, showcase, trend, other
   - Intent: learning, buying, comparing, troubleshooting, entertaining, viral, other

8. HASHTAG ANALYSIS:
   - Extract relevant business or industry hashtags from the content
   - Focus on hashtags that indicate business intent or problems

Provide a detailed analysis focusing on lead generation potential, keeping in mind TikTok's unique content style and audience.`;

    try {
      const analysis = await generateStructuredJson<TikTokLeadAnalysis>(
        analysisPrompt,
        `TikTok Video: ${searchResult.title}\nDescription: ${searchResult.description || searchResult.snippet || 'No description'}`,
        {
          type: "object",
          properties: {
            url: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            creator: { type: "string" },
            platform: { type: "string", enum: ["tiktok"] },
            lead_score: { type: "number", minimum: 0, maximum: 100 },
            urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            pain_points: { type: "array", items: { type: "string" } },
            decision_maker_indicators: { type: "array", items: { type: "string" } },
            engagement_potential: { type: "number", minimum: 0, maximum: 100 },
            business_opportunity: { type: "string" },
            target_persona: { type: "string" },
            content_type: { type: "string", enum: ["tutorial", "review", "problem", "discussion", "showcase", "trend", "other"] },
            viewer_intent: { type: "string", enum: ["learning", "buying", "comparing", "troubleshooting", "entertaining", "viral", "other"] },
            hashtags: { type: "array", items: { type: "string" } }
          },
          required: ["url", "title", "description", "creator", "platform", "lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "business_opportunity", "target_persona", "content_type", "viewer_intent", "hashtags"],
          additionalProperties: false
        },
        "TikTokLeadAnalysis",
        [],
        "gpt-4o-mini"
      );

      if (analysis && 'url' in analysis) {
        // Fill in the basic video data
        analysis.url = searchResult.videoUrl || searchResult.url || "";
        analysis.title = searchResult.title || "";
        analysis.description = searchResult.description || searchResult.snippet || "";
        analysis.platform = "tiktok";
        
        // Extract creator from URL or title if possible
        const urlMatch = (searchResult.videoUrl || searchResult.url || "").match(/@([^/]+)/);
        analysis.creator = searchResult.channel || (urlMatch ? urlMatch[1] : "Unknown Creator");
        
        return analysis;
      }

      return null;
    } catch (error) {
      logger.error(`[LeadTikTokTool] Analysis failed for TikTok video ${searchResult.url}:`, error);
      return null;
    }
  }
} 