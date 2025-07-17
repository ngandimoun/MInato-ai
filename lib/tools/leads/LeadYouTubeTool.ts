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

// Language-specific keywords for lead generation
const LEAD_KEYWORDS_BY_LANGUAGE: Record<string, string[]> = {
  'en': ['problem', 'solution', 'help', 'struggling', 'need', 'advice', 'issue', 'challenge', 'difficulty'],
  'fr': ['problème', 'solution', 'aide', 'difficulté', 'besoin', 'conseil', 'problème', 'défi', 'galère'],
  'es': ['problema', 'solución', 'ayuda', 'dificultad', 'necesidad', 'consejo', 'problema', 'desafío', 'lucha'],
  'de': ['Problem', 'Lösung', 'Hilfe', 'Schwierigkeit', 'Bedarf', 'Rat', 'Problem', 'Herausforderung', 'Kampf'],
  'it': ['problema', 'soluzione', 'aiuto', 'difficoltà', 'bisogno', 'consiglio', 'problema', 'sfida', 'lotta'],
  'pt': ['problema', 'solução', 'ajuda', 'dificuldade', 'necessidade', 'conselho', 'problema', 'desafio', 'luta'],
  'ru': ['проблема', 'решение', 'помощь', 'трудность', 'нужда', 'совет', 'проблема', 'вызов', 'борьба'],
  'ja': ['問題', '解決', '助け', '困難', '必要', 'アドバイス', '問題', '挑戦', '苦労'],
  'zh': ['问题', '解决', '帮助', '困难', '需要', '建议', '问题', '挑战', '斗争'],
  'ko': ['문제', '해결', '도움', '어려움', '필요', '조언', '문제', '도전', '투쟁'],
  'ar': ['مشكلة', 'حل', 'مساعدة', 'صعوبة', 'حاجة', 'نصيحة', 'مشكلة', 'تحدي', 'كفاح'],
  'hi': ['समस्या', 'समाधान', 'मदद', 'कठिनाई', 'आवश्यकता', 'सलाह', 'समस्या', 'चुनौती', 'संघर्ष']
};

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

  async execute(input: LeadYouTubeInput, abortSignal?: AbortSignal): Promise<ToolOutput> {
    try {
      const limit = Math.min(Math.max(1, input.limit || 5), 10);
      
      // Detect language from search prompt
      const detectedLanguage = this.detectLanguage(input.search_prompt);
      logger.info(`[LeadYouTubeTool] Detected language: ${detectedLanguage}`);
      
      // Build enhanced search query for lead generation
      let searchQuery = input.search_prompt;
      
      // Add industry and audience context to search
      if (input.industry_focus) {
        searchQuery += ` ${input.industry_focus}`;
      }
      if (input.target_audience) {
        searchQuery += ` ${input.target_audience}`;
      }
      
      // Add language-specific lead keywords
      const localizedKeywords = this.getLocalizedKeywords(detectedLanguage);
      const keywordSample = localizedKeywords.slice(0, 6); // Use first 6 keywords to avoid overly long queries
      searchQuery += ` ${keywordSample.join(' ')}`;

      logger.info(`[LeadYouTubeTool] Searching YouTube for: "${searchQuery}" (Language: ${detectedLanguage})`);

      // Search YouTube for relevant videos
      const youtubeResult = await this.youtubeSearchTool.execute({
        query: searchQuery,
        limit: limit,
        category: "education", // Focus on educational/problem-solving content
        description_keywords: keywordSample.join(','), // Use localized keywords
        lang: detectedLanguage
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
            search_query: searchQuery,
            detected_language: detectedLanguage
          }
        };
      }

      logger.info(`[LeadYouTubeTool] Analyzing ${videos.length} videos for leads`);

      // Analyze each video for lead potential
      const leadAnalyses: YouTubeLeadAnalysis[] = [];
      
      for (const video of videos) {
        if (abortSignal?.aborted) break;
        
        try {
          const analysis = await this.analyzeVideoForLeads(video, input, detectedLanguage);
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
          detected_language: detectedLanguage,
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

  private async analyzeVideoForLeads(video: any, input: LeadYouTubeInput, detectedLanguage: string): Promise<YouTubeLeadAnalysis | null> {
    // Create language-aware analysis prompt
    const getAnalysisPrompt = (language: string) => {
      const prompts: Record<string, string> = {
        'en': `You are an expert lead generation analyst specializing in YouTube content analysis. Analyze this YouTube video for potential business leads.`,
        'fr': `Vous êtes un analyste expert en génération de leads spécialisé dans l'analyse de contenu YouTube. Analysez cette vidéo YouTube pour identifier des leads commerciaux potentiels.`,
        'es': `Eres un analista experto en generación de leads especializado en análisis de contenido de YouTube. Analiza este video de YouTube para identificar leads comerciales potenciales.`,
        'de': `Sie sind ein Experte für Lead-Generierung und spezialisiert auf YouTube-Content-Analyse. Analysieren Sie dieses YouTube-Video auf potenzielle Geschäfts-Leads.`,
        'it': `Sei un analista esperto nella generazione di lead specializzato nell'analisi dei contenuti YouTube. Analizza questo video YouTube per identificare potenziali lead commerciali.`,
        'pt': `Você é um analista especialista em geração de leads especializado em análise de conteúdo do YouTube. Analise este vídeo do YouTube para identificar leads comerciais potenciais.`
      };
      
      return prompts[language] || prompts['en'];
    };

    const analysisPrompt = `
${getAnalysisPrompt(detectedLanguage)}

VIDEO DETAILS:
- Title: "${video.title}"
- Description: "${video.description || 'No description available'}"
- Channel: "${video.channelTitle}"
- Published: "${video.publishedAt}"

SEARCH CONTEXT:
- Search Query: "${input.search_prompt}"
- Industry Focus: "${input.industry_focus || 'General'}"
- Target Audience: "${input.target_audience || 'General'}"
- Detected Language: "${detectedLanguage}"

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

IMPORTANT: Analyze the content in its original language context. If the content is in ${detectedLanguage}, understand cultural and linguistic nuances that might affect lead quality and business opportunities.

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
        "gpt-4.1-mini-2025-04-14"
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