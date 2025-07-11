import { BaseTool, ToolInput, ToolOutput } from "../base-tool";
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

// Language-specific keywords for TikTok lead generation
const TIKTOK_LEAD_KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  'en': ['business', 'owner', 'entrepreneur', 'problem', 'help', 'advice', 'struggling', 'startup', 'small business'],
  'fr': ['entreprise', 'propriétaire', 'entrepreneur', 'problème', 'aide', 'conseil', 'difficulté', 'startup', 'petite entreprise'],
  'es': ['negocio', 'propietario', 'empresario', 'problema', 'ayuda', 'consejo', 'dificultad', 'startup', 'pequeña empresa'],
  'de': ['Geschäft', 'Eigentümer', 'Unternehmer', 'Problem', 'Hilfe', 'Rat', 'Schwierigkeit', 'Startup', 'kleines Unternehmen'],
  'it': ['business', 'proprietario', 'imprenditore', 'problema', 'aiuto', 'consiglio', 'difficoltà', 'startup', 'piccola impresa'],
  'pt': ['negócio', 'proprietário', 'empreendedor', 'problema', 'ajuda', 'conselho', 'dificuldade', 'startup', 'pequena empresa'],
  'ru': ['бизнес', 'владелец', 'предприниматель', 'проблема', 'помощь', 'совет', 'трудность', 'стартап', 'малый бизнес'],
  'ja': ['ビジネス', 'オーナー', '起業家', '問題', '助け', 'アドバイス', '困難', 'スタートアップ', '小企業'],
  'zh': ['生意', '老板', '企业家', '问题', '帮助', '建议', '困难', '创业', '小企业'],
  'ko': ['비즈니스', '사장', '기업가', '문제', '도움', '조언', '어려움', '스타트업', '소기업'],
  'ar': ['أعمال', 'مالك', 'رجل أعمال', 'مشكلة', 'مساعدة', 'نصيحة', 'صعوبة', 'شركة ناشئة', 'شركة صغيرة'],
  'hi': ['व्यापार', 'मालिक', 'उद्यमी', 'समस्या', 'मदद', 'सलाह', 'कठिनाई', 'स्टार्टअप', 'छोटा व्यापार']
};

export class LeadTikTokTool extends BaseTool {
  name = "LeadTikTokTool";
  description = "Finds potential leads from TikTok videos by searching for TikTok content and analyzing it for business opportunities and pain points";
  
  argsSchema = {
    type: "object" as const,
    properties: {
      search_prompt: {
        type: "string",
        description: "Search query to find relevant TikTok videos (e.g., 'small business owner struggling with social media')"
      },
      industry_focus: {
        type: "string",
        description: "Optional industry focus to narrow down results (e.g., 'retail', 'food service', 'fitness')"
      },
      target_audience: {
        type: "string", 
        description: "Optional target audience description (e.g., 'small business owners', 'content creators')"
      },
      limit: {
        type: "number",
        description: "Maximum number of TikTok videos to analyze (1-10, default 5)",
        minimum: 1,
        maximum: 10
      }
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
    return TIKTOK_LEAD_KEYWORDS_BY_LANGUAGE[language] || TIKTOK_LEAD_KEYWORDS_BY_LANGUAGE['en'];
  }

  async execute(input: LeadTikTokInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    try {
      const limit = Math.min(Math.max(1, input.limit || 5), 10);
      
      // Detect language from search prompt
      const detectedLanguage = this.detectLanguage(input.search_prompt);
      logger.info(`[LeadTikTokTool] Detected language: ${detectedLanguage}`);
      
      // Build enhanced search query for lead generation
      let searchQuery = input.search_prompt;
      
      // Add industry and audience context to search
      if (input.industry_focus) {
        searchQuery += ` ${input.industry_focus}`;
      }
      if (input.target_audience) {
        searchQuery += ` ${input.target_audience}`;
      }
      
      // Add language-specific TikTok lead keywords
      const localizedKeywords = this.getLocalizedKeywords(detectedLanguage);
      const keywordSample = localizedKeywords.slice(0, 6); // Use first 6 keywords to avoid overly long queries
      searchQuery += ` ${keywordSample.join(' ')}`;

      logger.info(`[LeadTikTokTool] Searching TikTok content for: "${searchQuery}" (Language: ${detectedLanguage})`);

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
            search_query: searchQuery,
            detected_language: detectedLanguage
          }
        };
      }

      logger.info(`[LeadTikTokTool] Analyzing ${tiktokVideos.length} TikTok videos for leads`);

      // Analyze each TikTok video for lead potential
      const leadAnalyses: TikTokLeadAnalysis[] = [];
      
      for (const video of tiktokVideos) {
        if (abortSignal?.aborted) break;
        
        try {
          const analysis = await this.analyzeTikTokForLeads(video, input, detectedLanguage);
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
          detected_language: detectedLanguage,
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

  private async analyzeTikTokForLeads(searchResult: any, input: LeadTikTokInput, detectedLanguage: string): Promise<TikTokLeadAnalysis | null> {
    // Create language-aware analysis prompt
    const getAnalysisPrompt = (language: string) => {
      const prompts: Record<string, string> = {
        'en': `You are an expert lead generation analyst specializing in TikTok content analysis. Analyze this TikTok video content for potential business leads.`,
        'fr': `Vous êtes un analyste expert en génération de leads spécialisé dans l'analyse de contenu TikTok. Analysez ce contenu vidéo TikTok pour identifier des leads commerciaux potentiels.`,
        'es': `Eres un analista experto en generación de leads especializado en análisis de contenido de TikTok. Analiza este contenido de video de TikTok para identificar leads comerciales potenciales.`,
        'de': `Sie sind ein Experte für Lead-Generierung und spezialisiert auf TikTok-Content-Analyse. Analysieren Sie diesen TikTok-Videoinhalt auf potenzielle Geschäfts-Leads.`,
        'it': `Sei un analista esperto nella generazione di lead specializzato nell'analisi dei contenuti TikTok. Analizza questo contenuto video TikTok per identificare potenziali lead commerciali.`,
        'pt': `Você é um analista especialista em geração de leads especializado em análise de conteúdo do TikTok. Analise este conteúdo de vídeo do TikTok para identificar leads comerciais potenciais.`
      };
      
      return prompts[language] || prompts['en'];
    };

    const analysisPrompt = `
${getAnalysisPrompt(detectedLanguage)}

TIKTOK VIDEO DETAILS:
- URL: "${searchResult.url}"
- Title: "${searchResult.title}"
- Description/Snippet: "${searchResult.description || searchResult.snippet || 'No description available'}"

SEARCH CONTEXT:
- Search Query: "${input.search_prompt}"
- Industry Focus: "${input.industry_focus || 'General'}"
- Target Audience: "${input.target_audience || 'General'}"
- Detected Language: "${detectedLanguage}"

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

IMPORTANT: Analyze the content in its original language context. If the content is in ${detectedLanguage}, understand cultural and linguistic nuances that might affect lead quality and business opportunities. TikTok content varies significantly by region and language.

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