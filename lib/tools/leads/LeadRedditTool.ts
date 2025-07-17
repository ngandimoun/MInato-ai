// FILE: lib/tools/leads/LeadRedditTool.ts
import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "../base-tool";
import fetch from "node-fetch";
import { appConfig } from "../../config";
import { logger } from "../../../memory-framework/config";
import { formatDistanceToNowStrict, fromUnixTime } from 'date-fns';
import { generateStructuredJson } from "../../providers/llm_clients";

interface LeadRedditInput extends ToolInput {
  search_prompt: string;
  industry_focus?: string;
  target_audience?: string;
  urgency_filter?: "low" | "medium" | "high" | "urgent";
  limit?: number;
  subreddit_strategy?: "auto" | "specific";
  specific_subreddits?: string[];
}

interface RedditApiPostData {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  score: number;
  num_comments: number;
  permalink: string;
  url: string;
  selftext?: string;
  created_utc: number;
  is_self: boolean;
  upvote_ratio?: number;
  subreddit_name_prefixed?: string;
  author_flair_text?: string | null;
  total_awards_received?: number;
  thumbnail?: string;
  preview?: {
    images?: Array<{
      source: { url: string; width: number; height: number };
      resolutions?: Array<{ url: string; width: number; height: number }>;
    }>;
  };
}

interface RedditListingChild {
  kind: "t3";
  data: RedditApiPostData;
}

interface RedditJsonResponse {
  kind: "Listing";
  data: {
    children: RedditListingChild[];
    after: string | null;
  };
}

interface LeadAnalysis {
  lead_score: number; // 0-100
  urgency_level: "low" | "medium" | "high" | "urgent";
  pain_points: string[];
  decision_maker_indicators: string[];
  engagement_potential: number; // 0-100
  platform_insights: {
    subreddit_relevance: number;
    community_engagement: number;
    author_authority: number;
    post_quality: number;
  };
  tags: string[];
  reasoning: string;
}

interface LeadResult {
  id: string;
  title: string;
  content: string;
  author: string;
  platform: "reddit";
  source_url: string;
  subreddit: string;
  created_at: string;
  engagement_metrics: {
    score: number;
    comments: number;
    upvote_ratio?: number;
    awards?: number;
  };
  lead_analysis: LeadAnalysis;
  raw_data: RedditApiPostData;
}

export class LeadRedditTool extends BaseTool {
  name = "LeadRedditTool";
  description = "Advanced Reddit lead generation tool that finds high-quality leads with AI-powered analysis, intelligent subreddit selection, and lead scoring.";
  
  argsSchema = {
    type: "object" as const,
    properties: {
      search_prompt: {
        type: "string" as const,
        description: "Detailed description of what type of leads to find (e.g., 'small businesses struggling with website performance', 'startup founders looking for marketing tools')"
      } as OpenAIToolParameterProperties,
      industry_focus: {
        type: ["string", "null"] as const,
        description: "Target industry or domain (e.g., 'technology', 'healthcare', 'e-commerce', 'saas')"
      } as OpenAIToolParameterProperties,
      target_audience: {
        type: ["string", "null"] as const,
        description: "Specific audience characteristics (e.g., 'decision makers', 'technical founders', 'marketing managers')"
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
      subreddit_strategy: {
        type: ["string", "null"] as const,
        enum: ["auto", "specific", null],
        description: "Whether to auto-select subreddits or use specific ones (default: auto)"
      } as OpenAIToolParameterProperties,
      specific_subreddits: {
        type: ["array", "null"] as const,
        items: { type: "string" },
        description: "Specific subreddits to search (only used if subreddit_strategy is 'specific')"
      } as OpenAIToolParameterProperties,
    },
    required: ["search_prompt"],
    additionalProperties: false as false,
  };

  cacheTTLSeconds = 60 * 10; // 10 minutes cache
  categories = ["lead-generation", "reddit", "prospecting", "sales"];
  version = "1.0.0";
  metadata = {
    provider: "Reddit API + AI Analysis",
    supports: ["lead-scoring", "subreddit-intelligence", "pain-point-detection", "urgency-analysis"]
  };

  private readonly REDDIT_BASE_URL = "https://www.reddit.com";
  private readonly USER_AGENT = `MinatoAILeads/1.0 (by /u/MinatoAI contact: ${appConfig.emailFromAddress || "support@example.com"})`;

  // Industry-specific subreddit mapping
  private readonly INDUSTRY_SUBREDDITS = {
    technology: ["technology", "programming", "webdev", "MachineLearning", "artificial", "startups", "entrepreneur"],
    healthcare: ["medicine", "healthcare", "medtech", "biotech", "nursing", "pharmacy"],
    ecommerce: ["ecommerce", "shopify", "amazon", "dropship", "onlinebusiness", "retail"],
    saas: ["SaaS", "startups", "entrepreneur", "software", "programming", "webdev"],
    marketing: ["marketing", "digitalmarketing", "SEO", "socialmedia", "advertising", "growth"],
    finance: ["personalfinance", "investing", "financialindependence", "stocks", "cryptocurrency"],
    education: ["education", "teachers", "homeschool", "university", "learning", "studytips"],
    fitness: ["fitness", "gym", "bodybuilding", "running", "nutrition", "weightloss"],
    realestate: ["realestate", "realestateinvesting", "landlord", "property", "mortgages"],
    gaming: ["gaming", "gamedev", "indiegaming", "mobilegaming", "esports"],
    food: ["food", "cooking", "recipes", "restaurant", "culinary", "baking"],
    travel: ["travel", "solotravel", "backpacking", "digitalnomad", "flights", "hotels"],
    general: ["AskReddit", "smallbusiness", "entrepreneur", "advice", "needadvice", "help"]
  };

  constructor() {
    super();
    if (this.USER_AGENT.includes("support@example.com")) {
      this.log("warn", "Update LeadRedditTool USER_AGENT with specific contact info for API compliance.");
    }
  }

  private async selectOptimalSubreddits(searchPrompt: string, industryFocus?: string): Promise<string[]> {
    const selectionPrompt = `
You are an expert Reddit lead generation specialist. Your task is to select the BEST subreddits for finding leads based on the search criteria.

Search Prompt: "${searchPrompt}"
Industry Focus: "${industryFocus || 'general'}"

Available subreddit categories:
${Object.entries(this.INDUSTRY_SUBREDDITS).map(([industry, subreddits]) => 
  `${industry}: ${subreddits.join(', ')}`
).join('\n')}

SUBREDDIT SELECTION CRITERIA:
1. RELEVANCE: Choose subreddits where the target audience is most likely to be active
2. ENGAGEMENT: Prioritize subreddits with high-quality discussions
3. LEAD QUALITY: Focus on subreddits where people ask for help or express pain points
4. AUTHORITY: Include subreddits where decision-makers and experts participate

INTELLIGENT MAPPING RULES:
- For business/startup leads: prioritize "startups", "entrepreneur", "smallbusiness"
- For tech leads: include "technology", "programming", "webdev", "MachineLearning"
- For specific problems: include "AskReddit", "advice", "needadvice", "help"
- For industry-specific: prioritize relevant industry subreddits
- Always include 2-3 general business/advice subreddits for broader reach

Select 5-8 subreddits that offer the best combination of relevance and lead potential.

OUTPUT FORMAT: JSON object with subreddits array
Example: {"subreddits": ["startups", "entrepreneur", "smallbusiness", "AskReddit", "technology"]}

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      const result = await generateStructuredJson<{subreddits: string[]}>(
        selectionPrompt,
        searchPrompt,
        { 
          type: "object",
          properties: {
            subreddits: {
              type: "array",
              items: { type: "string" },
              description: "Array of subreddit names without r/ prefix"
            }
          },
          required: ["subreddits"],
          additionalProperties: false
        },
        "SubredditSelection",
        [],
        "gpt-4.1-mini-2025-04-14"
      );

      const subreddits = (result && 'subreddits' in result) ? result.subreddits : [];

      // Fallback to industry-specific subreddits if extraction fails
      if (!subreddits || subreddits.length === 0) {
        const industryKey = industryFocus?.toLowerCase() as keyof typeof this.INDUSTRY_SUBREDDITS;
        const fallbackSubreddits = this.INDUSTRY_SUBREDDITS[industryKey] || this.INDUSTRY_SUBREDDITS.general;
        logger.warn("[LeadRedditTool] Subreddit selection failed, using fallback", { industryFocus, fallbackSubreddits });
        return fallbackSubreddits.slice(0, 5);
      }

      logger.info("[LeadRedditTool] Selected subreddits", { subreddits, searchPrompt, industryFocus });
      return subreddits;
    } catch (error) {
      logger.error("[LeadRedditTool] Subreddit selection error", { error, searchPrompt, industryFocus });
      return this.INDUSTRY_SUBREDDITS.general.slice(0, 5);
    }
  }

  private async fetchRedditPosts(subreddit: string, searchTerms: string, limit: number = 10): Promise<RedditApiPostData[]> {
    const searchUrl = `${this.REDDIT_BASE_URL}/r/${subreddit}/search.json?q=${encodeURIComponent(searchTerms)}&restrict_sr=1&sort=relevance&limit=${limit}`;
    
    try {
      const response = await fetch(searchUrl, {
        headers: { "User-Agent": this.USER_AGENT },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        this.log("warn", `Reddit API error for r/${subreddit}: ${response.status}`);
        return [];
      }

      const data = await response.json() as RedditJsonResponse;
      return data.data.children.map(child => child.data).filter(post => 
        post.id && post.title && !post.title.toLowerCase().includes('[deleted]')
      );
    } catch (error: any) {
      this.log("error", `Error fetching posts from r/${subreddit}:`, error.message);
      return [];
    }
  }

  private async analyzeLeadPotential(post: RedditApiPostData, searchPrompt: string, industryFocus?: string): Promise<LeadAnalysis> {
    const analysisPrompt = `
You are an expert lead generation analyst. Analyze this Reddit post for lead potential.

SEARCH CRITERIA:
Search Prompt: "${searchPrompt}"
Industry Focus: "${industryFocus || 'general'}"

POST TO ANALYZE:
Title: "${post.title}"
Content: "${post.selftext || 'No content (link post)'}"
Subreddit: r/${post.subreddit}
Author: ${post.author}
Score: ${post.score}
Comments: ${post.num_comments}
Upvote Ratio: ${post.upvote_ratio || 'N/A'}

ANALYSIS CRITERIA:

1. LEAD SCORE (0-100):
   - 90-100: Perfect lead - explicit need, decision maker, urgent problem
   - 80-89: Excellent lead - clear pain point, likely decision maker
   - 70-79: Good lead - relevant problem, some decision-making indicators
   - 60-69: Moderate lead - related interest, needs qualification
   - 50-59: Low lead - tangential relevance
   - 0-49: Poor lead - not relevant or low quality

2. URGENCY LEVEL:
   - urgent: "need ASAP", "deadline", "emergency", "critical"
   - high: "struggling", "frustrated", "problem", "help needed"
   - medium: "looking for", "considering", "thinking about"
   - low: "curious", "general interest", "future consideration"

3. PAIN POINTS: Extract specific problems or challenges mentioned

4. DECISION MAKER INDICATORS:
   - "I'm the founder/CEO/CTO/owner"
   - "my company/business/startup"
   - "we need", "our team", "I decide"
   - Budget/purchasing authority mentions

5. ENGAGEMENT POTENTIAL (0-100):
   - Post quality and detail
   - Author's engagement in comments
   - Community response
   - Timing and relevance

6. PLATFORM INSIGHTS:
   - subreddit_relevance (0-100): How relevant is this subreddit for our target
   - community_engagement (0-100): How active/engaged is this community
   - author_authority (0-100): Author's credibility indicators
   - post_quality (0-100): Quality of the post content

7. TAGS: Relevant categories (e.g., "startup", "technical", "urgent", "budget-conscious")

8. REASONING: Brief explanation of the lead score and assessment

OUTPUT FORMAT: JSON object with the exact structure shown in the interface.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      const analysis = await generateStructuredJson<LeadAnalysis>(
        analysisPrompt,
        `${post.title}\n\n${post.selftext || ''}`,
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
                subreddit_relevance: { type: "number", minimum: 0, maximum: 100 },
                community_engagement: { type: "number", minimum: 0, maximum: 100 },
                author_authority: { type: "number", minimum: 0, maximum: 100 },
                post_quality: { type: "number", minimum: 0, maximum: 100 }
              },
              required: ["subreddit_relevance", "community_engagement", "author_authority", "post_quality"],
              additionalProperties: false
            },
            tags: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" }
          },
          required: ["lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "platform_insights", "tags", "reasoning"],
          additionalProperties: false
        },
        "LeadAnalysis",
        [],
        "gpt-4.1-mini-2025-04-14"
      );

      if (!analysis || 'error' in analysis) {
        logger.error("[LeadRedditTool] Lead analysis error", { error: analysis, postId: post.id });
        return {
          lead_score: 30,
          urgency_level: "low" as const,
          pain_points: [],
          decision_maker_indicators: [],
          engagement_potential: 30,
          platform_insights: {
            subreddit_relevance: 50,
            community_engagement: 50,
            author_authority: 30,
            post_quality: 40
          },
          tags: ["unanalyzed"],
          reasoning: "Analysis failed, using default values"
        };
      }

      return analysis;
    } catch (error) {
      logger.error("[LeadRedditTool] Lead analysis error", { error, postId: post.id });
      return {
        lead_score: 30,
        urgency_level: "low",
        pain_points: [],
        decision_maker_indicators: [],
        engagement_potential: 30,
        platform_insights: {
          subreddit_relevance: 50,
          community_engagement: 50,
          author_authority: 30,
          post_quality: 40
        },
        tags: ["analysis-failed"],
        reasoning: "Lead analysis failed due to technical error"
      };
    }
  }

  private extractSearchTerms(searchPrompt: string): string {
    // Extract meaningful keywords from search prompt
    const stopWords = ['find', 'me', 'some', 'posts', 'about', 'for', 'the', 'a', 'an', 'in', 'on', 'with', 'from', 'to', 'and', 'or', 'but'];
    return searchPrompt
      .toLowerCase()
      .split(' ')
      .filter(word => !stopWords.includes(word) && word.length > 2)
      .join(' ');
  }

  async execute(input: LeadRedditInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = "[LeadRedditTool]";
    
    try {
      const {
        search_prompt,
        industry_focus,
        target_audience,
        urgency_filter,
        limit = 10,
        subreddit_strategy = "auto",
        specific_subreddits
      } = input;

      logger.info(`${logPrefix} Starting lead search`, { search_prompt, industry_focus, target_audience });

      // Select subreddits
      let subreddits: string[];
      if (subreddit_strategy === "specific" && specific_subreddits?.length) {
        subreddits = specific_subreddits;
      } else {
        subreddits = await this.selectOptimalSubreddits(search_prompt, industry_focus);
      }

      logger.info(`${logPrefix} Selected subreddits`, { subreddits });

      // Extract search terms
      const searchTerms = this.extractSearchTerms(search_prompt);
      logger.info(`${logPrefix} Search terms`, { searchTerms });

      // Fetch posts from all subreddits
      const allPosts: RedditApiPostData[] = [];
      const postsPerSubreddit = Math.ceil(limit / subreddits.length);

      for (const subreddit of subreddits) {
        if (abortSignal?.aborted) break;
        
        const posts = await this.fetchRedditPosts(subreddit, searchTerms, postsPerSubreddit);
        allPosts.push(...posts);
        
        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      logger.info(`${logPrefix} Fetched ${allPosts.length} posts from ${subreddits.length} subreddits`);

      // Analyze each post for lead potential
      const leadResults: LeadResult[] = [];
      
      for (const post of allPosts.slice(0, limit)) {
        if (abortSignal?.aborted) break;

        const analysis = await this.analyzeLeadPotential(post, search_prompt, industry_focus);
        
        // Apply urgency filter
        if (urgency_filter && this.getUrgencyWeight(analysis.urgency_level) < this.getUrgencyWeight(urgency_filter)) {
          continue;
        }

        const leadResult: LeadResult = {
          id: post.id,
          title: post.title,
          content: post.selftext || "Link post - no text content",
          author: post.author,
          platform: "reddit",
          source_url: `${this.REDDIT_BASE_URL}${post.permalink}`,
          subreddit: post.subreddit,
          created_at: fromUnixTime(post.created_utc).toISOString(),
          engagement_metrics: {
            score: post.score,
            comments: post.num_comments,
            upvote_ratio: post.upvote_ratio,
            awards: post.total_awards_received
          },
          lead_analysis: analysis,
          raw_data: post
        };

        leadResults.push(leadResult);
      }

      // Sort by lead score
      leadResults.sort((a, b) => b.lead_analysis.lead_score - a.lead_analysis.lead_score);

      const summary = {
        total_leads: leadResults.length,
        subreddits_searched: subreddits,
        average_lead_score: leadResults.length > 0 
          ? Math.round(leadResults.reduce((sum, lead) => sum + lead.lead_analysis.lead_score, 0) / leadResults.length)
          : 0,
        urgency_distribution: this.getUrgencyDistribution(leadResults),
        top_pain_points: this.getTopPainPoints(leadResults),
        search_metadata: {
          search_prompt,
          industry_focus,
          target_audience,
          urgency_filter,
          subreddit_strategy
        }
      };

      logger.info(`${logPrefix} Lead search completed`, summary);

      return {
        success: true,
        data: {
          leads: leadResults,
          summary
        },
        metadata: {
          total_results: leadResults.length,
          search_terms: searchTerms,
          subreddits_searched: subreddits.length,
          execution_time: Date.now()
        }
      };

    } catch (error: any) {
      logger.error(`${logPrefix} Execution error`, { error: error.message, stack: error.stack });
      return {
        success: false,
        error: `Lead search failed: ${error.message}`,
        data: null
      };
    }
  }

  private getUrgencyWeight(urgency: string): number {
    const weights = { low: 1, medium: 2, high: 3, urgent: 4 };
    return weights[urgency as keyof typeof weights] || 1;
  }

  private getUrgencyDistribution(leads: LeadResult[]): Record<string, number> {
    const distribution: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    leads.forEach(lead => {
      distribution[lead.lead_analysis.urgency_level]++;
    });
    return distribution;
  }

  private getTopPainPoints(leads: LeadResult[]): string[] {
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