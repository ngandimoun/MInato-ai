// FILE: lib/tools/leads/LeadHackerNewsTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "../base-tool";
import fetch from "node-fetch";
import { appConfig } from "../../config";
import { logger } from "../../../memory-framework/config";
import { fromUnixTime } from 'date-fns';
import { generateStructuredJson } from "../../providers/llm_clients";

interface LeadHackerNewsInput extends ToolInput {
  search_prompt: string;
  target_audience?: string;
  company_stage?: "startup" | "scaleup" | "enterprise" | "any";
  urgency_filter?: "low" | "medium" | "high" | "urgent";
  limit?: number;
  focus_areas?: string[];
}

interface HNStoryApiData {
  id: number;
  objectID?: string;
  title?: string;
  url?: string;
  points?: number;
  author?: string;
  num_comments?: number;
  created_at_i?: number;
  time?: number;
  type?: string;
  text?: string;
  story_text?: string;
  by?: string;
  descendants?: number;
  score?: number;
  _tags?: string[];
}

interface HNLeadAnalysis {
  lead_score: number; // 0-100
  urgency_level: "low" | "medium" | "high" | "urgent";
  pain_points: string[];
  decision_maker_indicators: string[];
  engagement_potential: number; // 0-100
  platform_insights: {
    story_relevance: number;
    community_engagement: number;
    author_authority: number;
    technical_depth: number;
    business_impact: number;
  };
  tags: string[];
  reasoning: string;
  company_stage_indicators: string[];
  tech_stack_mentions: string[];
}

interface HNLeadResult {
  id: string;
  title: string;
  content: string;
  author: string;
  platform: "hackernews";
  source_url: string;
  hn_url: string;
  created_at: string;
  engagement_metrics: {
    points: number;
    comments: number;
  };
  lead_analysis: HNLeadAnalysis;
  raw_data: HNStoryApiData;
}

interface AlgoliaResponse {
  hits?: HNStoryApiData[];
  nbHits?: number;
}

export class LeadHackerNewsTool extends BaseTool {
  name = "LeadHackerNewsTool";
  description = "Advanced HackerNews lead generation tool specialized for finding tech startup leads, entrepreneurs, and decision-makers with AI-powered analysis and tech industry insights.";
  
  argsSchema = {
    type: "object" as const,
    properties: {
      search_prompt: {
        type: "string" as const,
        description: "Detailed description of what type of tech leads to find (e.g., 'startup founders struggling with scalability', 'CTOs looking for development tools')"
      } as OpenAIToolParameterProperties,
      target_audience: {
        type: ["string", "null"] as const,
        description: "Specific tech audience (e.g., 'founders', 'CTOs', 'tech leads', 'developers', 'product managers')"
      } as OpenAIToolParameterProperties,
      company_stage: {
        type: ["string", "null"] as const,
        enum: ["startup", "scaleup", "enterprise", "any", null],
        description: "Target company stage (default: any)"
      } as OpenAIToolParameterProperties,
      urgency_filter: {
        type: ["string", "null"] as const,
        enum: ["low", "medium", "high", "urgent", null],
        description: "Minimum urgency level for leads"
      } as OpenAIToolParameterProperties,
      limit: {
        type: ["number", "null"] as const,
        description: "Maximum number of leads to return (1-20, default: 10)"
      } as OpenAIToolParameterProperties,
      focus_areas: {
        type: ["array", "null"] as const,
        items: { type: "string" },
        description: "Specific tech areas to focus on (e.g., ['AI', 'blockchain', 'SaaS', 'mobile'])"
      } as OpenAIToolParameterProperties,
    },
    required: ["search_prompt"],
    additionalProperties: false as false,
  };

  cacheTTLSeconds = 60 * 10; // 10 minutes cache
  categories = ["lead-generation", "hackernews", "tech-leads", "startups"];
  version = "1.0.0";
  metadata = {
    provider: "HackerNews Algolia API + AI Analysis",
    supports: ["tech-lead-scoring", "startup-detection", "founder-identification", "technical-analysis"]
  };

  private readonly ALGOLIA_API_BASE = "https://hn.algolia.com/api/v1";
  private readonly HN_ITEM_URL_BASE = "https://news.ycombinator.com/item?id=";
  private readonly USER_AGENT = `MinatoAITechLeads/1.0 (${appConfig.app.url}; mailto:${appConfig.emailFromAddress || "support@example.com"})`;

  // Tech-focused search categories
  private readonly TECH_CATEGORIES = {
    startup: ["startup", "founder", "entrepreneur", "seed", "series", "funding", "YC", "accelerator"],
    development: ["programming", "coding", "software", "development", "framework", "library", "API"],
    infrastructure: ["cloud", "AWS", "kubernetes", "docker", "microservices", "database", "scaling"],
    ai_ml: ["AI", "machine learning", "ML", "neural", "GPT", "LLM", "artificial intelligence"],
    product: ["product", "PM", "product manager", "roadmap", "features", "user experience"],
    business: ["revenue", "growth", "marketing", "sales", "customer", "B2B", "SaaS"],
    hiring: ["hiring", "recruiting", "team", "developer", "engineer", "CTO", "technical lead"],
    tools: ["tool", "platform", "service", "solution", "integration", "automation"]
  };

  constructor() {
    super();
    if (this.USER_AGENT.includes("support@example.com")) {
      this.log("warn", "Update LeadHackerNewsTool USER_AGENT with specific contact info for API compliance.");
    }
  }

  private async searchHackerNews(query: string, limit: number = 10): Promise<HNStoryApiData[]> {
    const searchUrl = `${this.ALGOLIA_API_BASE}/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}&attributesToRetrieve=objectID,title,url,points,author,num_comments,created_at_i,story_text,_tags`;
    
    try {
      const response = await fetch(searchUrl, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        this.log("warn", `HackerNews Algolia API error: ${response.status}`);
        return [];
      }

      const data = await response.json() as AlgoliaResponse;
      return data.hits || [];
    } catch (error: any) {
      this.log("error", `Error searching HackerNews:`, error.message);
      return [];
    }
  }

  private async analyzeHNLeadPotential(story: HNStoryApiData, searchPrompt: string, targetAudience?: string): Promise<HNLeadAnalysis> {
    const analysisPrompt = `
You are an expert tech lead generation analyst specializing in HackerNews. Analyze this HN story for lead potential.

SEARCH CRITERIA:
Search Prompt: "${searchPrompt}"
Target Audience: "${targetAudience || 'tech professionals'}"

STORY TO ANALYZE:
Title: "${story.title}"
Content: "${story.story_text || story.text || 'No content (link post)'}"
Author: ${story.author || story.by || 'Unknown'}
Points: ${story.points || story.score || 0}
Comments: ${story.num_comments || story.descendants || 0}
URL: ${story.url || 'N/A'}
Tags: ${story._tags?.join(', ') || 'N/A'}

ANALYSIS CRITERIA FOR HACKERNEWS LEADS:

1. LEAD SCORE (0-100):
   - 90-100: Perfect tech lead - founder/CTO posting about specific technical challenges
   - 80-89: Excellent lead - decision maker with clear technical needs
   - 70-79: Good lead - technical professional with relevant problems
   - 60-69: Moderate lead - interested party, needs qualification
   - 50-59: Low lead - general interest, limited decision-making power
   - 0-49: Poor lead - not relevant or consumer-focused

2. URGENCY LEVEL (HN-specific indicators):
   - urgent: "critical bug", "production down", "urgent help needed", "deadline approaching"
   - high: "struggling with", "major issue", "need solution", "performance problems"
   - medium: "looking for", "considering", "evaluating", "planning to"
   - low: "curious about", "interesting", "might try", "future consideration"

3. PAIN POINTS: Technical and business challenges mentioned

4. DECISION MAKER INDICATORS (HN-specific):
   - "I'm the founder/CTO/CEO/tech lead"
   - "our startup/company"
   - "we built/we're building"
   - "I decided to", "we chose"
   - Technical depth indicating senior role

5. ENGAGEMENT POTENTIAL (0-100):
   - Story quality and technical detail
   - Community engagement (points, comments)
   - Author's credibility and post history
   - Relevance to HN community

6. PLATFORM INSIGHTS:
   - story_relevance (0-100): How relevant is this story to our target
   - community_engagement (0-100): HN community response quality
   - author_authority (0-100): Author's technical credibility
   - technical_depth (0-100): Technical sophistication of the content
   - business_impact (0-100): Potential business impact of the problem/solution

7. COMPANY STAGE INDICATORS:
   - startup: "just launched", "MVP", "early stage", "bootstrapped"
   - scaleup: "growing team", "scaling", "series A/B", "expanding"
   - enterprise: "large team", "enterprise", "fortune 500", "established"

8. TECH STACK MENTIONS: Technologies, frameworks, tools mentioned

9. TAGS: Relevant categories (e.g., "founder", "technical", "saas", "ai", "scaling")

10. REASONING: Brief explanation focusing on technical context and business relevance

OUTPUT FORMAT: JSON object with the exact structure shown in the interface.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      const analysis = await generateStructuredJson<HNLeadAnalysis>(
        analysisPrompt,
        `${story.title}\n\n${story.story_text || story.text || ''}`,
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
                story_relevance: { type: "number", minimum: 0, maximum: 100 },
                community_engagement: { type: "number", minimum: 0, maximum: 100 },
                author_authority: { type: "number", minimum: 0, maximum: 100 },
                technical_depth: { type: "number", minimum: 0, maximum: 100 },
                business_impact: { type: "number", minimum: 0, maximum: 100 }
              },
              required: ["story_relevance", "community_engagement", "author_authority", "technical_depth", "business_impact"],
              additionalProperties: false
            },
            tags: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" },
            company_stage_indicators: { type: "array", items: { type: "string" } },
            tech_stack_mentions: { type: "array", items: { type: "string" } }
          },
          required: ["lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "platform_insights", "tags", "reasoning", "company_stage_indicators", "tech_stack_mentions"],
          additionalProperties: false
        },
        "HNLeadAnalysis",
        [],
        "gpt-4o-mini"
      );

      if (!analysis || 'error' in analysis) {
        logger.error("[LeadHackerNewsTool] Lead analysis error", { error: analysis, storyId: story.id || story.objectID });
        return {
          lead_score: 30,
          urgency_level: "low" as const,
          pain_points: [],
          decision_maker_indicators: [],
          engagement_potential: 30,
          platform_insights: {
            story_relevance: 50,
            community_engagement: 50,
            author_authority: 30,
            technical_depth: 40,
            business_impact: 30
          },
          tags: ["unanalyzed"],
          reasoning: "Analysis failed, using default values",
          company_stage_indicators: [],
          tech_stack_mentions: []
        };
      }

      return analysis;
    } catch (error) {
      logger.error("[LeadHackerNewsTool] Lead analysis error", { error, storyId: story.id || story.objectID });
      return {
        lead_score: 30,
        urgency_level: "low",
        pain_points: [],
        decision_maker_indicators: [],
        engagement_potential: 30,
        platform_insights: {
          story_relevance: 50,
          community_engagement: 50,
          author_authority: 30,
          technical_depth: 40,
          business_impact: 30
        },
        tags: ["analysis-failed"],
        reasoning: "Lead analysis failed due to technical error",
        company_stage_indicators: [],
        tech_stack_mentions: []
      };
    }
  }

  private enhanceSearchQuery(searchPrompt: string, focusAreas?: string[]): string {
    // Extract meaningful keywords from the search prompt
    const stopWords = ['im', 'i', 'am', 'looking', 'loooking', 'for', 'the', 'best', 'a', 'an', 'in', 'on', 'with', 'from', 'to', 'and', 'or', 'but'];
    
    // Clean and extract key terms
    const searchTerms = searchPrompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Limit to top 5 terms to avoid overly complex queries
    
    // Add focus areas if provided
    if (focusAreas?.length) {
      searchTerms.push(...focusAreas.slice(0, 3)); // Limit focus areas
    }
    
    // Create a simpler, more effective query
    const cleanedTerms = [...new Set(searchTerms)];
    return cleanedTerms.join(' ');
  }

  async execute(input: LeadHackerNewsInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = "[LeadHackerNewsTool]";
    
    try {
      const {
        search_prompt,
        target_audience,
        company_stage,
        urgency_filter,
        limit = 10,
        focus_areas
      } = input;

      logger.info(`${logPrefix} Starting HN lead search`, { search_prompt, target_audience, company_stage });

      // Enhance search query with HN-specific context
      const enhancedQuery = this.enhanceSearchQuery(search_prompt, focus_areas);
      logger.info(`${logPrefix} Enhanced search query`, { original: search_prompt, enhanced: enhancedQuery });

      // Search HackerNews
      const stories = await this.searchHackerNews(enhancedQuery, limit * 2); // Get more to filter
      logger.info(`${logPrefix} Found ${stories.length} HN stories`);
      
      if (stories.length === 0) {
        logger.warn(`${logPrefix} No stories found for query: "${enhancedQuery}". Trying fallback search.`);
        // Try a broader search with just the main keywords
        const fallbackQuery = search_prompt.split(' ').filter((word: string) => 
          word.length > 3 && !['looking', 'loooking', 'best'].includes(word.toLowerCase())
        ).slice(0, 2).join(' ');
        
        if (fallbackQuery !== enhancedQuery) {
          logger.info(`${logPrefix} Trying fallback query: "${fallbackQuery}"`);
          const fallbackStories = await this.searchHackerNews(fallbackQuery, limit);
          stories.push(...fallbackStories);
          logger.info(`${logPrefix} Fallback search found ${fallbackStories.length} additional stories`);
        }
      }

      // Analyze each story for lead potential
      const leadResults: HNLeadResult[] = [];
      
      for (const story of stories) {
        if (abortSignal?.aborted) break;
        if (leadResults.length >= limit) break;

        const analysis = await this.analyzeHNLeadPotential(story, search_prompt, target_audience);
        
        // Apply urgency filter
        if (urgency_filter && this.getUrgencyWeight(analysis.urgency_level) < this.getUrgencyWeight(urgency_filter)) {
          continue;
        }

        // Apply company stage filter
        if (company_stage && company_stage !== "any") {
          const hasStageIndicator = analysis.company_stage_indicators.some(indicator => 
            indicator.toLowerCase().includes(company_stage)
          );
          if (!hasStageIndicator && analysis.lead_score < 70) {
            continue; // Skip if no stage indicator and score is not high enough
          }
        }

        const storyId = story.id || parseInt(story.objectID || "0", 10);
        const leadResult: HNLeadResult = {
          id: String(storyId),
          title: story.title || "Untitled",
          content: story.story_text || story.text || "Link post - no text content",
          author: story.author || story.by || "Unknown",
          platform: "hackernews",
          source_url: story.url || `${this.HN_ITEM_URL_BASE}${storyId}`,
          hn_url: `${this.HN_ITEM_URL_BASE}${storyId}`,
          created_at: story.created_at_i ? fromUnixTime(story.created_at_i).toISOString() : new Date().toISOString(),
          engagement_metrics: {
            points: story.points || story.score || 0,
            comments: story.num_comments || story.descendants || 0
          },
          lead_analysis: analysis,
          raw_data: story
        };

        leadResults.push(leadResult);
      }

      // Sort by lead score
      leadResults.sort((a, b) => b.lead_analysis.lead_score - a.lead_analysis.lead_score);

      const summary = {
        total_leads: leadResults.length,
        average_lead_score: leadResults.length > 0 
          ? Math.round(leadResults.reduce((sum, lead) => sum + lead.lead_analysis.lead_score, 0) / leadResults.length)
          : 0,
        urgency_distribution: this.getUrgencyDistribution(leadResults),
        company_stage_distribution: this.getCompanyStageDistribution(leadResults),
        top_tech_stacks: this.getTopTechStacks(leadResults),
        top_pain_points: this.getTopPainPoints(leadResults),
        search_metadata: {
          search_prompt,
          enhanced_query: enhancedQuery,
          target_audience,
          company_stage,
          urgency_filter,
          focus_areas
        }
      };

      logger.info(`${logPrefix} HN lead search completed`, summary);

      return {
        success: true,
        data: {
          leads: leadResults,
          summary
        },
        metadata: {
          total_results: leadResults.length,
          search_query: enhancedQuery,
          execution_time: Date.now()
        }
      };

    } catch (error: any) {
      logger.error(`${logPrefix} Execution error`, { error: error.message, stack: error.stack });
      return {
        success: false,
        error: `HN lead search failed: ${error.message}`,
        data: null
      };
    }
  }

  private getUrgencyWeight(urgency: string): number {
    const weights = { low: 1, medium: 2, high: 3, urgent: 4 };
    return weights[urgency as keyof typeof weights] || 1;
  }

  private getUrgencyDistribution(leads: HNLeadResult[]): Record<string, number> {
    const distribution: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    leads.forEach(lead => {
      distribution[lead.lead_analysis.urgency_level]++;
    });
    return distribution;
  }

  private getCompanyStageDistribution(leads: HNLeadResult[]): Record<string, number> {
    const distribution: Record<string, number> = { startup: 0, scaleup: 0, enterprise: 0, unknown: 0 };
    leads.forEach(lead => {
      const stages = lead.lead_analysis.company_stage_indicators;
      if (stages.some(s => s.toLowerCase().includes('startup'))) {
        distribution.startup++;
      } else if (stages.some(s => s.toLowerCase().includes('scaleup') || s.toLowerCase().includes('scale'))) {
        distribution.scaleup++;
      } else if (stages.some(s => s.toLowerCase().includes('enterprise'))) {
        distribution.enterprise++;
      } else {
        distribution.unknown++;
      }
    });
    return distribution;
  }

  private getTopTechStacks(leads: HNLeadResult[]): string[] {
    const techStacks: Record<string, number> = {};
    leads.forEach(lead => {
      lead.lead_analysis.tech_stack_mentions.forEach(tech => {
        techStacks[tech] = (techStacks[tech] || 0) + 1;
      });
    });
    
    return Object.entries(techStacks)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tech]) => tech);
  }

  private getTopPainPoints(leads: HNLeadResult[]): string[] {
    const painPoints: Record<string, number> = {};
    leads.forEach(lead => {
      lead.lead_analysis.pain_points.forEach(point => {
        painPoints[point] = (painPoints[point] || 0) + 1;
      });
    });
    
    return Object.entries(painPoints)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([point]) => point);
  }
} 