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

  async execute(input: LeadNewsInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    try {
      const limit = Math.min(Math.max(1, input.limit || 5), 10);
      
      // Detect language from search prompt
      const detectedLanguage = this.detectLanguage(input.search_prompt);
      logger.info(`[LeadNewsTool] Detected language: ${detectedLanguage}`);
      
      // Build news-specific search query for lead generation
      let searchQuery = input.search_prompt;
      
      // Add industry context
      if (input.industry_focus) {
        searchQuery += ` ${input.industry_focus}`;
      }
      
      // Add language-specific lead keywords for news
      const localizedKeywords = this.getLocalizedKeywords(detectedLanguage);
      const keywordSample = localizedKeywords.slice(0, 6); // Use first 6 keywords to avoid overly long queries
      searchQuery += ` ${keywordSample.join(' ')}`;

      logger.info(`[LeadNewsTool] Searching news for: "${searchQuery}" (Language: ${detectedLanguage})`);

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
            search_query: searchQuery,
            detected_language: detectedLanguage
          }
        };
      }

      logger.info(`[LeadNewsTool] Analyzing ${articles.length} news articles for leads`);

      // Analyze each article for lead potential
      const leadAnalyses: NewsLeadAnalysis[] = [];
      
      for (const article of articles) {
        if (abortSignal?.aborted) break;
        
        try {
          const analysis = await this.analyzeNewsForLeads(article, input, detectedLanguage);
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
          detected_language: detectedLanguage,
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

  private async analyzeNewsForLeads(article: any, input: LeadNewsInput, detectedLanguage: string): Promise<NewsLeadAnalysis | null> {
    // Create language-aware analysis prompt
    const getAnalysisPrompt = (language: string) => {
      const prompts: Record<string, string> = {
        'en': `You are an expert lead generation analyst specializing in news analysis for business opportunities. Analyze this news article for potential business leads.`,
        'fr': `Vous êtes un analyste expert en génération de leads spécialisé dans l'analyse d'actualités pour les opportunités commerciales. Analysez cet article d'actualité pour identifier des leads commerciaux potentiels.`,
        'es': `Eres un analista experto en generación de leads especializado en análisis de noticias para oportunidades comerciales. Analiza este artículo de noticias para identificar leads comerciales potenciales.`,
        'de': `Sie sind ein Experte für Lead-Generierung und spezialisiert auf Nachrichtenanalyse für Geschäftsmöglichkeiten. Analysieren Sie diesen Nachrichtenartikel auf potenzielle Geschäfts-Leads.`,
        'it': `Sei un analista esperto nella generazione di lead specializzato nell'analisi delle notizie per opportunità commerciali. Analizza questo articolo di notizie per identificare potenziali lead commerciali.`,
        'pt': `Você é um analista especialista em geração de leads especializado em análise de notícias para oportunidades comerciais. Analise este artigo de notícias para identificar leads comerciais potenciais.`
      };
      
      return prompts[language] || prompts['en'];
    };

    const analysisPrompt = `
${getAnalysisPrompt(detectedLanguage)}

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
- Detected Language: "${detectedLanguage}"

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

IMPORTANT: Analyze the content in its original language context. If the content is in ${detectedLanguage}, understand cultural, business, and linguistic nuances that might affect lead quality and business opportunities in that market.

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
        analysis.url = article.url || "";
        analysis.title = article.title || "";
        analysis.description = article.description || "";
        analysis.source_name = article.sourceName || "";
        analysis.published_at = article.publishedAt || "";
        analysis.image_url = article.imageUrl || "";
        
        return analysis;
      }

      return null;
    } catch (error) {
      logger.error(`[LeadNewsTool] Analysis failed for article ${article.url}:`, error);
      return null;
    }
  }
} 