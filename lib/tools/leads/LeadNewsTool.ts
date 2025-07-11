import { BaseTool, ToolInput, ToolOutput, OpenAIToolParameterProperties } from "../base-tool";
import { NewsAggregatorTool } from "../NewsAggregatorTool";
import { generateStructuredJson } from "../../providers/llm_clients";
import { logger } from "../../../memory-framework/config";

interface LeadNewsInput extends ToolInput {
  search_prompt: string;
  industry_focus?: string;
  target_audience?: string;
  category?: "business" | "technology" | "general";
  limit?: number;
}

interface NewsLeadAnalysis {
  url: string;
  title: string;
  description: string;
  source_name: string;
  published_at: string;
  image_url?: string;
  lead_score: number;
  urgency_level: "low" | "medium" | "high" | "urgent";
  pain_points: string[];
  business_opportunities: string[];
  decision_maker_indicators: string[];
  market_signals: string[];
  engagement_potential: number;
  target_persona: string;
  news_type: "funding" | "merger" | "expansion" | "problem" | "regulation" | "innovation" | "other";
  lead_type: "direct" | "indirect" | "market_intelligence";
}

export class LeadNewsTool extends BaseTool {
  name = "LeadNewsTool";
  description = "Finds potential leads from news articles by analyzing business news for opportunities, funding announcements, company problems, and market signals";
  
  argsSchema = {
    type: "object" as const,
    properties: {
      search_prompt: {
        type: "string",
        description: "Search query to find relevant news articles (e.g., 'startup funding', 'company expansion', 'business challenges')"
      } as OpenAIToolParameterProperties,
      industry_focus: {
        type: "string",
        description: "Optional industry focus to narrow down results (e.g., 'SaaS', 'fintech', 'healthcare')"
      } as OpenAIToolParameterProperties,
      target_audience: {
        type: "string", 
        description: "Optional target audience description (e.g., 'startup founders', 'enterprise executives')"
      } as OpenAIToolParameterProperties,
      category: {
        type: "string",
        enum: ["business", "technology", "general"],
        description: "News category to focus on (business, technology, or general)"
      } as OpenAIToolParameterProperties,
      limit: {
        type: "number",
        description: "Maximum number of news articles to analyze (1-10, default 5)",
        minimum: 1,
        maximum: 10
      } as OpenAIToolParameterProperties
    },
    required: ["search_prompt"],
    additionalProperties: false as false
  };

  categories = ["leads", "news", "analysis"];
  version = "1.0.0";

  private newsAggregatorTool: NewsAggregatorTool;

  constructor() {
    super();
    this.newsAggregatorTool = new NewsAggregatorTool();
  }

  async execute(input: LeadNewsInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    try {
      const limit = Math.min(Math.max(1, input.limit || 5), 10);
      
      // Build news-specific search query for lead generation
      let searchQuery = input.search_prompt;
      
      // Add industry context
      if (input.industry_focus) {
        searchQuery += ` ${input.industry_focus}`;
      }
      
      // Add lead-specific keywords for news
      searchQuery += " funding investment expansion acquisition growth challenge problem";

      logger.info(`[LeadNewsTool] Searching news for: "${searchQuery}"`);

      // Search for news articles using NewsAggregatorTool
      const newsResult = await this.newsAggregatorTool.execute({
        query: searchQuery,
        category: input.category || "business",
        limit: limit,
        sources: "all"
      }, abortSignal);

      if (newsResult.error || !newsResult.structuredData) {
        return {
          error: "Failed to search news articles",
          result: "Could not find news articles for lead analysis"
        };
      }

      // Handle news articles results
      let articles: any[] = [];
      if (newsResult.structuredData && 'articles' in newsResult.structuredData) {
        articles = (newsResult.structuredData as any).articles || [];
      }
      
      if (articles.length === 0) {
        return {
          result: "No news articles found matching the search criteria",
          structuredData: {
            result_type: "news_leads",
            total_articles: 0,
            leads: [],
            search_query: searchQuery
          }
        };
      }

      logger.info(`[LeadNewsTool] Analyzing ${articles.length} news articles for leads`);

      // Analyze each article for lead potential
      const leadAnalyses: NewsLeadAnalysis[] = [];
      
      for (const article of articles) {
        if (abortSignal?.aborted) break;
        
        try {
          const analysis = await this.analyzeNewsForLeads(article, input);
          if (analysis && analysis.lead_score > 35) { // Threshold for news leads
            leadAnalyses.push(analysis);
          }
        } catch (error) {
          logger.error(`[LeadNewsTool] Failed to analyze article ${article.url}:`, error);
          continue;
        }
      }

      // Sort by lead score (highest first)
      leadAnalyses.sort((a, b) => b.lead_score - a.lead_score);

      const totalLeads = leadAnalyses.length;
      const avgScore = totalLeads > 0 ? Math.round(leadAnalyses.reduce((sum, lead) => sum + lead.lead_score, 0) / totalLeads) : 0;

      return {
        result: `Found ${totalLeads} potential leads from news articles with average lead score of ${avgScore}`,
        structuredData: {
          result_type: "news_leads",
          total_articles: articles.length,
          total_leads: totalLeads,
          avg_lead_score: avgScore,
          leads: leadAnalyses,
          search_query: searchQuery,
          industry_focus: input.industry_focus,
          target_audience: input.target_audience,
          category: input.category
        }
      };

    } catch (error) {
      logger.error("[LeadNewsTool] Execution failed:", error);
      return {
        error: "News lead analysis failed",
        result: "Failed to analyze news articles for leads"
      };
    }
  }

  private async analyzeNewsForLeads(article: any, input: LeadNewsInput): Promise<NewsLeadAnalysis | null> {
    const analysisPrompt = `
You are an expert lead generation analyst specializing in news analysis for business opportunities. Analyze this news article for potential business leads.

NEWS ARTICLE DETAILS:
- Title: "${article.title}"
- Description: "${article.description || 'No description available'}"
- Source: "${article.sourceName}"
- Published: "${article.publishedAt}"
- URL: "${article.url}"

SEARCH CONTEXT:
- Search Query: "${input.search_prompt}"
- Industry Focus: "${input.industry_focus || 'General'}"
- Target Audience: "${input.target_audience || 'General'}"
- News Category: "${input.category || 'business'}"

ANALYSIS REQUIREMENTS:

1. LEAD SCORING (0-100):
   - Does the article indicate a company with potential business needs?
   - Are there signs of growth, funding, expansion, or challenges?
   - Is the news recent and relevant for business opportunities?
   - Does it match the target industry/audience?

2. URGENCY ASSESSMENT:
   - "urgent": Immediate business need or opportunity (funding, crisis, expansion)
   - "high": Clear business opportunity, likely to act soon
   - "medium": Potential opportunity, may act eventually
   - "low": General business interest, no immediate need

3. PAIN POINTS IDENTIFICATION:
   - Extract specific business challenges mentioned
   - Identify operational, financial, or strategic problems
   - Look for regulatory or market pressures

4. BUSINESS OPPORTUNITIES:
   - What specific products/services could help this company?
   - Are there partnership or collaboration opportunities?
   - Could this be a sales or service opportunity?

5. DECISION MAKER INDICATORS:
   - Look for mentions of executives, founders, or decision makers
   - Check for company size and decision-making structure
   - Identify if contact information or company details are available

6. MARKET SIGNALS:
   - Industry trends that create opportunities
   - Regulatory changes affecting businesses
   - Market movements or shifts

7. ENGAGEMENT POTENTIAL (0-100):
   - How likely is this company to respond to outreach?
   - Are they actively seeking solutions or partners?
   - Do they seem open to business opportunities?

8. NEWS TYPE CLASSIFICATION:
   - funding: Investment, funding rounds, capital raises
   - merger: M&A activity, acquisitions, partnerships
   - expansion: Growth, new markets, scaling
   - problem: Challenges, issues, crises
   - regulation: Regulatory changes, compliance
   - innovation: New products, tech developments
   - other: Other business news

9. LEAD TYPE:
   - direct: Company mentioned could be a direct customer
   - indirect: Company mentioned could lead to opportunities
   - market_intelligence: General market insight for strategy

Provide a detailed analysis focusing on lead generation potential from this news article.`;

    try {
      const analysis = await generateStructuredJson<NewsLeadAnalysis>(
        analysisPrompt,
        `Article: ${article.title}\nDescription: ${article.description || 'No description'}`,
        {
          type: "object",
          properties: {
            url: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            source_name: { type: "string" },
            published_at: { type: "string" },
            image_url: { type: "string" },
            lead_score: { type: "number", minimum: 0, maximum: 100 },
            urgency_level: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            pain_points: { type: "array", items: { type: "string" } },
            business_opportunities: { type: "array", items: { type: "string" } },
            decision_maker_indicators: { type: "array", items: { type: "string" } },
            market_signals: { type: "array", items: { type: "string" } },
            engagement_potential: { type: "number", minimum: 0, maximum: 100 },
            target_persona: { type: "string" },
            news_type: { type: "string", enum: ["funding", "merger", "expansion", "problem", "regulation", "innovation", "other"] },
            lead_type: { type: "string", enum: ["direct", "indirect", "market_intelligence"] }
          },
          required: ["url", "title", "description", "source_name", "published_at", "lead_score", "urgency_level", "pain_points", "business_opportunities", "decision_maker_indicators", "market_signals", "engagement_potential", "target_persona", "news_type", "lead_type"],
          additionalProperties: false
        },
        "NewsLeadAnalysis",
        [],
        "gpt-4o-mini"
      );

      if (analysis && 'url' in analysis) {
        // Fill in the basic article data
        analysis.url = article.url;
        analysis.title = article.title;
        analysis.description = article.description || "";
        analysis.source_name = article.sourceName;
        analysis.published_at = article.publishedAt || "";
        analysis.image_url = article.imageUrl || undefined;
        
        return analysis;
      }

      return null;
    } catch (error) {
      logger.error(`[LeadNewsTool] Analysis failed for article ${article.url}:`, error);
      return null;
    }
  }
} 