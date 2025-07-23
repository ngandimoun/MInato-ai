import { BaseTool, ToolInput, ToolOutput } from "../base-tool";
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
  lead_score: number;
  urgency_level: "low" | "medium" | "high" | "urgent";
  pain_points: string[];
  decision_maker_indicators: string[];
  engagement_potential: number;
  platform_insights: {
    content_relevance: number;
    source_authority: number;
    story_impact: number;
    timeliness: number;
  };
  tags: string[];
  reasoning: string;
}

// Language-specific keywords for news lead generation
const NEWS_LEAD_KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  'en': ['funding', 'investment', 'expansion', 'acquisition', 'growth', 'challenge', 'problem', 'opportunity', 'merger'],
  'fr': ['financement', 'investissement', 'expansion', 'acquisition', 'croissance', 'défi', 'problème', 'opportunité', 'fusion'],
  'es': ['financiación', 'inversión', 'expansión', 'adquisición', 'crecimiento', 'desafío', 'problema', 'oportunidad', 'fusión'],
  'de': ['Finanzierung', 'Investition', 'Expansion', 'Übernahme', 'Wachstum', 'Herausforderung', 'Problem', 'Gelegenheit', 'Fusion'],
  'it': ['finanziamento', 'investimento', 'espansione', 'acquisizione', 'crescita', 'sfida', 'problema', 'opportunità', 'fusione'],
  'pt': ['financiamento', 'investimento', 'expansão', 'aquisição', 'crescimento', 'desafio', 'problema', 'oportunidade', 'fusão'],
  'ru': ['финансирование', 'инвестиции', 'расширение', 'приобретение', 'рост', 'вызов', 'проблема', 'возможность', 'слияние'],
  'ja': ['資金調達', '投資', '拡大', '買収', '成長', '挑戦', '問題', '機会', '合併'],
  'zh': ['融资', '投资', '扩张', '收购', '增长', '挑战', '问题', '机会', '合并'],
  'ko': ['자금조달', '투자', '확장', '인수', '성장', '도전', '문제', '기회', '합병'],
  'ar': ['تمويل', 'استثمار', 'توسع', 'استحواذ', 'نمو', 'تحدي', 'مشكلة', 'فرصة', 'اندماج'],
  'hi': ['फंडिंग', 'निवेश', 'विस्तार', 'अधिग्रहण', 'वृद्धि', 'चुनौती', 'समस्या', 'अवसर', 'विलय']
};

export class LeadNewsTool extends BaseTool {
  name = "LeadNewsTool";
  description = "Finds potential leads from news articles by analyzing business news for opportunities, funding announcements, company problems, and market signals";
  
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // News API rate limits
  private readonly USER_AGENT = `MinatoAILeads/1.0 (production; contact: ${process.env.EMAIL_FROM_ADDRESS || "support@example.com"})`;
  private lastRequestTime: number = 0;

  argsSchema = {
    type: "object" as const,
    properties: {
      search_prompt: {
        type: "string",
        description: "Search query to find relevant news articles (e.g., 'startup funding healthcare AI')"
      },
      industry_focus: {
        type: "string",
        description: "Optional industry focus to narrow down results (e.g., 'fintech', 'healthcare', 'SaaS')"
      },
      target_audience: {
        type: "string", 
        description: "Optional target audience description (e.g., 'startup founders', 'enterprise executives')"
      },
      category: {
        type: "string",
        enum: ["business", "technology", "general"],
        description: "News category to focus on (default: business)"
      },
      limit: {
        type: "number",
        description: "Maximum number of news articles to analyze (1-10, default 5)",
        minimum: 1,
        maximum: 10
      }
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
    return NEWS_LEAD_KEYWORDS_BY_LANGUAGE[language] || NEWS_LEAD_KEYWORDS_BY_LANGUAGE['en'];
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
      } else if (response.status === 403 || response.status === 401) {
        // API key issues
        throw new Error("News API access denied. Please check API key.");
      } else if (response.status === 429) {
        // Too Many Requests
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
        this.log("warn", `Rate limited by News API. Waiting ${retryAfter} seconds before retry.`);
        await this.wait(retryAfter * 1000);
        throw new Error("Rate limited");
      } else if (response.status >= 500) {
        // Server error - should retry
        throw new Error(`News API server error: ${response.status}`);
      } else {
        // Client error - should not retry
        this.log("error", `News API error: ${response.status} ${response.statusText}`);
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

  private async searchNews(query: string, language: string, category: string = "business", limit: number = 5): Promise<any[]> {
    // Try GNews first
    const gnewsApiKey = process.env.GNEWS_API_KEY;
    if (gnewsApiKey) {
      try {
        const gnewsUrl = new URL("https://gnews.io/api/v4/search");
        gnewsUrl.searchParams.append("token", gnewsApiKey);
        gnewsUrl.searchParams.append("q", query);
        gnewsUrl.searchParams.append("lang", language.split("-")[0]);
        gnewsUrl.searchParams.append("country", "any");
        gnewsUrl.searchParams.append("max", String(limit));
        gnewsUrl.searchParams.append("sortby", "relevance");

        const response = await this.fetchWithRetry(gnewsUrl.toString(), {
          signal: AbortSignal.timeout(30000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.articles?.length > 0) {
            return data.articles;
          }
        }
      } catch (error) {
        this.log("warn", "GNews API error, falling back to NewsAPI.org", { error });
      }
    }

    // Fall back to NewsAPI.org
    const newsApiKey = process.env.NEWSAPI_ORG_KEY;
    if (!newsApiKey) {
      this.log("error", "No news API keys configured");
      return [];
    }

    try {
      const newsApiUrl = new URL("https://newsapi.org/v2/everything");
      newsApiUrl.searchParams.append("apiKey", newsApiKey);
      newsApiUrl.searchParams.append("q", query);
      newsApiUrl.searchParams.append("language", language.split("-")[0]);
      newsApiUrl.searchParams.append("sortBy", "relevancy");
      newsApiUrl.searchParams.append("pageSize", String(limit));

      const response = await this.fetchWithRetry(newsApiUrl.toString(), {
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        this.log("error", `NewsAPI.org error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data?.articles || !Array.isArray(data.articles)) {
        this.log("warn", "Invalid NewsAPI.org response structure");
        return [];
      }

      return data.articles;

    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      this.log("error", `Error searching news: ${errorMessage}`);
      
      // If it's a timeout error, return empty array
      if (errorMessage.includes('timeout')) {
        return [];
      }
      
      throw error;
    }
  }

  async execute(input: LeadNewsInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    const logPrefix = "[LeadNewsTool]";
    
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
      
      // Add language-specific news lead keywords
      const localizedKeywords = this.getLocalizedKeywords(detectedLanguage);
      const keywordSample = localizedKeywords.slice(0, 6);
      searchQuery += ` ${keywordSample.join(' ')}`;

      logger.info(`${logPrefix} Searching news for: "${searchQuery}" (Language: ${detectedLanguage})`);

      // Search for news articles
      const articles = await this.searchNews(searchQuery, detectedLanguage, input.category, limit);
      
      if (!articles || articles.length === 0) {
        return {
          result: "No relevant news articles found",
          error: "No articles found matching the search criteria",
          structuredData: {
            result_type: "news_leads",
            leads: [],
            summary: {
              total_leads: 0,
              search_query: searchQuery,
              language: detectedLanguage,
              industry_focus: input.industry_focus,
              target_audience: input.target_audience,
              category: input.category
            }
          }
        };
      }

      // Analyze each article for lead potential
      const leadResults = await Promise.all(articles.map(async (article: any) => {
        if (abortSignal?.aborted) return null;

        const analysis = await this.analyzeNewsLeadPotential(article, input.search_prompt);
        
        return {
          id: article.url,
          title: article.title,
          description: article.description || article.content || "",
          source: article.source?.name || article.sourceName || "Unknown Source",
          platform: "news",
          source_url: article.url,
          published_at: article.publishedAt || article.published_date,
          image_url: article.image || article.urlToImage,
          lead_analysis: analysis,
          raw_data: article
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
        category: input.category,
        top_sources: [...new Set(validLeads.map(lead => lead.source))].slice(0, 5)
      };

      return {
        result: `Found ${validLeads.length} relevant news leads`,
        structuredData: {
          result_type: "news_leads",
          leads: validLeads,
          summary
        }
      };

    } catch (error: any) {
      logger.error(`${logPrefix} Execution error:`, error);
      return {
        error: `News lead search failed: ${error.message}`,
        result: "News lead search failed",
        structuredData: undefined
      };
    }
  }

  private async analyzeNewsLeadPotential(article: any, searchPrompt: string): Promise<NewsLeadAnalysis> {
    const analysisPrompt = `
You are an expert lead generation analyst specializing in news content analysis. Analyze this news article for potential business leads.

ARTICLE DETAILS:
- Title: "${article.title}"
- Description: "${article.description || article.content || 'No description available'}"
- Source: "${article.source?.name || article.sourceName || 'Unknown Source'}"
- Published: "${article.publishedAt || article.published_date || 'Unknown date'}"

SEARCH CONTEXT:
- Search Query: "${searchPrompt}"

ANALYSIS CRITERIA:

1. LEAD SCORE (0-100):
   - 90-100: Perfect lead - clear business opportunity, decision makers
   - 80-89: Excellent lead - strong business potential
   - 70-79: Good lead - relevant business news
   - 60-69: Moderate lead - business-related but needs qualification
   - 50-59: Low lead - general news
   - 0-49: Poor lead - not business-focused

2. URGENCY LEVEL:
   - urgent: Immediate business opportunity or challenge
   - high: Time-sensitive business development
   - medium: Emerging opportunity
   - low: General industry news

3. PAIN POINTS: Extract specific business challenges or needs

4. DECISION MAKER INDICATORS:
   - Company leadership mentions
   - Business decision context
   - Investment or strategic moves
   - Market positioning

5. ENGAGEMENT POTENTIAL (0-100):
   - Story significance
   - Business impact
   - Actionable insights
   - Follow-up potential

6. PLATFORM INSIGHTS:
   - content_relevance (0-100): Business opportunity relevance
   - source_authority (0-100): News source credibility
   - story_impact (0-100): Potential business impact
   - timeliness (0-100): News recency and urgency

7. TAGS: Relevant categories (e.g., "funding", "expansion", "partnership")

8. REASONING: Brief explanation of the lead assessment

OUTPUT FORMAT: JSON object with the exact structure shown in the interface.

RESPOND ONLY WITH THE JSON OBJECT.`;

    try {
      const analysis = await generateStructuredJson<NewsLeadAnalysis>(
        analysisPrompt,
        `Article: ${article.title}\nContent: ${article.description || article.content || 'No content'}`,
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
                source_authority: { type: "number", minimum: 0, maximum: 100 },
                story_impact: { type: "number", minimum: 0, maximum: 100 },
                timeliness: { type: "number", minimum: 0, maximum: 100 }
              },
              required: ["content_relevance", "source_authority", "story_impact", "timeliness"],
              additionalProperties: false
            },
            tags: { type: "array", items: { type: "string" } },
            reasoning: { type: "string" }
          },
          required: ["lead_score", "urgency_level", "pain_points", "decision_maker_indicators", "engagement_potential", "platform_insights", "tags", "reasoning"],
          additionalProperties: false
        },
        "NewsLeadAnalysis",
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
            source_authority: 30,
            story_impact: 30,
            timeliness: 30
          },
          tags: ["analysis_failed"],
          reasoning: "Analysis failed - using default values"
        };
      }

      return analysis;
    } catch (error) {
      logger.error(`[LeadNewsTool] Analysis failed for article ${article.url}:`, error);
      return {
        lead_score: 30,
        urgency_level: "low",
        pain_points: [],
        decision_maker_indicators: [],
        engagement_potential: 30,
        platform_insights: {
          content_relevance: 30,
          source_authority: 30,
          story_impact: 30,
          timeliness: 30
        },
        tags: ["error_occurred"],
        reasoning: "Analysis error - using default values"
      };
    }
  }
} 