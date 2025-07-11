import { BaseTool, ToolInput, ToolOutput } from "../base-tool";
import { YouTubeSearchTool } from "../YouTubeSearchTool";
import { generateStructuredJson } from "../../providers/llm_clients";
import { logger } from "../../../memory-framework/config";

interface LeadYouTubeInput extends ToolInput {
  search_prompt: string;
  industry_focus?: string;
  target_audience?: string;
  limit?: number;
}

interface YouTubeLeadAnalysis {
  video_id: string;
  title: string;
  description: string;
  channel_title: string;
  published_at: string;
  video_url: string;
  thumbnail_url: string;
  lead_score: number;
  urgency_level: "low" | "medium" | "high" | "urgent";
  pain_points: string[];
  decision_maker_indicators: string[];
  engagement_potential: number;
  business_opportunity: string;
  target_persona: string;
  content_type: "tutorial" | "review" | "problem" | "discussion" | "showcase" | "other";
  viewer_intent: "learning" | "buying" | "comparing" | "troubleshooting" | "entertaining" | "other";
}

export class LeadYouTubeTool extends BaseTool {
  name = "LeadYouTubeTool";
  description = "Finds potential leads from YouTube videos by analyzing content, titles, and descriptions for business opportunities and pain points";
  
  argsSchema = {
    type: "object" as const,
    properties: {
      search_prompt: {
        type: "string",
        description: "Search query to find relevant YouTube videos (e.g., 'small business struggling with marketing')"
      },
      industry_focus: {
        type: "string",
        description: "Optional industry focus to narrow down results (e.g., 'SaaS', 'e-commerce', 'healthcare')"
      },
      target_audience: {
        type: "string", 
        description: "Optional target audience description (e.g., 'startup founders', 'marketing managers')"
      },
      limit: {
        type: "number",
        description: "Maximum number of lead videos to analyze (1-10, default 5)",
        minimum: 1,
        maximum: 10
      }
    },
    required: ["search_prompt"],
    additionalProperties: false as false
  };

  categories = ["leads", "youtube", "analysis"];
  version = "1.0.0";

  private youtubeSearchTool: YouTubeSearchTool;

  constructor() {
    super();
    this.youtubeSearchTool = new YouTubeSearchTool();
  }

  async execute(input: LeadYouTubeInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    try {
      const limit = Math.min(Math.max(1, input.limit || 5), 10);
      
      // Build enhanced search query for lead generation
      let searchQuery = input.search_prompt;
      
      // Add industry and audience context to search
      if (input.industry_focus) {
        searchQuery += ` ${input.industry_focus}`;
      }
      if (input.target_audience) {
        searchQuery += ` ${input.target_audience}`;
      }
      
      // Add lead-specific keywords
      searchQuery += " problem solution help struggling need advice";

      logger.info(`[LeadYouTubeTool] Searching YouTube for: "${searchQuery}"`);

      // Search YouTube for relevant videos
      const youtubeResult = await this.youtubeSearchTool.execute({
        query: searchQuery,
        limit: limit,
        category: "education", // Focus on educational/problem-solving content
        description_keywords: "problem,solution,help,struggling,need,advice,tutorial,review"
      }, abortSignal);

      if (youtubeResult.error || !youtubeResult.structuredData) {
        return {
          error: "Failed to search YouTube videos",
          result: "Could not find YouTube videos for lead analysis"
        };
      }

      // Handle YouTube video results
      let videos: any[] = [];
      if (youtubeResult.structuredData && 'videos' in youtubeResult.structuredData) {
        videos = (youtubeResult.structuredData as any).videos || [];
      }
      
      if (videos.length === 0) {
        return {
          result: "No YouTube videos found matching the search criteria",
          structuredData: {
            result_type: "youtube_leads",
            total_videos: 0,
            leads: [],
            search_query: searchQuery
          }
        };
      }

      logger.info(`[LeadYouTubeTool] Analyzing ${videos.length} videos for leads`);

      // Analyze each video for lead potential
      const leadAnalyses: YouTubeLeadAnalysis[] = [];
      
      for (const video of videos) {
        if (abortSignal?.aborted) break;
        
        try {
          const analysis = await this.analyzeVideoForLeads(video, input);
          if (analysis && analysis.lead_score > 30) { // Only include videos with decent lead score
            leadAnalyses.push(analysis);
          }
        } catch (error) {
          logger.error(`[LeadYouTubeTool] Failed to analyze video ${video.videoId}:`, error);
          continue;
        }
      }

      // Sort by lead score (highest first)
      leadAnalyses.sort((a, b) => b.lead_score - a.lead_score);

      const totalLeads = leadAnalyses.length;
      const avgScore = totalLeads > 0 ? Math.round(leadAnalyses.reduce((sum, lead) => sum + lead.lead_score, 0) / totalLeads) : 0;

      return {
        result: `Found ${totalLeads} potential leads from YouTube videos with average lead score of ${avgScore}`,
        structuredData: {
          result_type: "youtube_leads",
          total_videos: videos.length,
          total_leads: totalLeads,
          avg_lead_score: avgScore,
          leads: leadAnalyses,
          search_query: searchQuery,
          industry_focus: input.industry_focus,
          target_audience: input.target_audience
        }
      };

    } catch (error) {
      logger.error("[LeadYouTubeTool] Execution failed:", error);
      return {
        error: "YouTube lead analysis failed",
        result: "Failed to analyze YouTube videos for leads"
      };
    }
  }

  private async analyzeVideoForLeads(video: any, input: LeadYouTubeInput): Promise<YouTubeLeadAnalysis | null> {
    const analysisPrompt = `
You are an expert lead generation analyst specializing in YouTube content analysis. Analyze this YouTube video for potential business leads.

VIDEO DETAILS:
- Title: "${video.title}"
- Description: "${video.description || 'No description available'}"
- Channel: "${video.channelTitle}"
- Published: "${video.publishedAt}"

SEARCH CONTEXT:
- Search Query: "${input.search_prompt}"
- Industry Focus: "${input.industry_focus || 'General'}"
- Target Audience: "${input.target_audience || 'General'}"

ANALYSIS REQUIREMENTS:

1. LEAD SCORING (0-100):
   - Does the video indicate someone has a problem/need that could be solved by a business?
   - Are there signs of budget/decision-making capability?
   - Is the content recent and relevant?
   - Does it match the target industry/audience?

2. URGENCY ASSESSMENT:
   - "urgent": Immediate problem, actively seeking solutions
   - "high": Clear problem, likely to act soon
   - "medium": Problem exists, may act eventually
   - "low": General interest, no immediate need

3. PAIN POINTS IDENTIFICATION:
   - Extract specific problems mentioned in title/description
   - Focus on business-relevant challenges
   - Identify technical or operational issues

4. DECISION MAKER INDICATORS:
   - Look for signs the creator/audience has decision-making power
   - Channel authority, subscriber count implications
   - Business-focused content vs. personal content

5. ENGAGEMENT POTENTIAL (0-100):
   - How likely is this person to respond to outreach?
   - Are they actively engaging with their audience?
   - Do they seem open to business solutions?

6. BUSINESS OPPORTUNITY:
   - What specific product/service could solve their problem?
   - How could a business help this person?

7. CONTENT CATEGORIZATION:
   - Type: tutorial, review, problem, discussion, showcase, other
   - Intent: learning, buying, comparing, troubleshooting, entertaining, other

Provide a detailed analysis focusing on lead generation potential.`;

    try {
      const analysis = await generateStructuredJson<YouTubeLeadAnalysis>(
        analysisPrompt,
        `Video: ${video.title}\nDescription: ${video.description || 'No description'}`,
        {
          type: "object",
          properties: {
            video_id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            channel_title: { type: "string" },
            published_at: { type: "string" },
            video_url: { type: "string" },
            thumbnail_url: { type: "string" },
            lead_score: { type: "number", minimum: 0, maximum: 100 },
            urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            pain_points: { type: "array", items: { type: "string" } },
            decision_maker_indicators: { type: "array", items: { type: "string" } },
            engagement_potential: { type: "number", minimum: 0, maximum: 100 },
            business_opportunity: { type: "string" },
            target_persona: { type: "string" },
            content_type: { type: "string", enum: ["tutorial", "review", "problem", "discussion", "showcase", "other"] },
            viewer_intent: { type: "string", enum: ["learning", "buying", "comparing", "troubleshooting", "entertaining", "other"] }
          },
          required: ["video_id", "title", "description", "channel_title", "published_at", "video_url", "thumbnail_url", "lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "business_opportunity", "target_persona", "content_type", "viewer_intent"],
          additionalProperties: false
        },
        "YouTubeLeadAnalysis",
        [],
        "gpt-4o-mini"
      );

      if (analysis && 'video_id' in analysis) {
        // Fill in the basic video data
        analysis.video_id = video.videoId;
        analysis.title = video.title;
        analysis.description = video.description || "";
        analysis.channel_title = video.channelTitle || "";
        analysis.published_at = video.publishedAt || "";
        analysis.video_url = video.videoUrl;
        analysis.thumbnail_url = video.thumbnailUrl || "";
        
        return analysis;
      }

      return null;
    } catch (error) {
      logger.error(`[LeadYouTubeTool] Analysis failed for video ${video.videoId}:`, error);
      return null;
    }
  }
} 