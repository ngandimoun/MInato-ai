/**
 * Minato AI Insights Orchestrator
 * Manages the complete analysis pipeline for documents, transactions, and report generation
 */

import OpenAI from 'openai';
import { logger } from '@/memory-framework/config';
import { 
  DOCUMENT_ANALYSIS_PROMPT_TEMPLATE,
  FINANCIAL_ANALYSIS_PROMPT_TEMPLATE,
  REPORT_GENERATION_PROMPT_TEMPLATE,
  INSIGHTS_CHAT_PROMPT_TEMPLATE 
} from '@/lib/prompts/insights-prompts';
import { generateStructuredJson } from '@/lib/providers/llm_clients';
import { randomUUID } from 'crypto';

// Core interfaces for insights system
export interface InsightsDocument {
  id: string;
  user_id: string;
  title: string;
  original_filename: string;
  file_type: string;
  extracted_text?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'archived';
  created_at: string;
}

export interface InsightsTransaction {
  id: string;
  user_id: string;
  transaction_type: 'revenue' | 'expense' | 'refund' | 'fee' | 'tax' | 'other';
  amount: number;
  currency: string;
  description: string;
  transaction_date: string;
  created_at: string;
}

export interface InsightsAnalysisResult {
  id: string;
  user_id: string;
  analysis_type: string;
  analysis_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  insights: Record<string, any>;
  summary?: string;
  recommendations?: string[];
  key_metrics: Record<string, any>;
  confidence_score?: number;
  processing_time_ms?: number;
  created_at: string;
  completed_at?: string;
}

// Request interfaces
export interface DocumentAnalysisRequest {
  document: InsightsDocument;
  analysisType: string;
  userContext?: string;
}

export interface FinancialAnalysisRequest {
  transactions: InsightsTransaction[];
  dateRange: { startDate: string; endDate: string };
  analysisFocus: string;
  userContext?: string;
}

// Singleton instance
let insightsOrchestratorInstance: InsightsOrchestrator | null = null;

export function getInsightsOrchestrator(): InsightsOrchestrator {
  if (!insightsOrchestratorInstance) {
    logger.info('[Insights Orchestrator] Initializing...');
    try {
      insightsOrchestratorInstance = new InsightsOrchestrator();
    } catch (e: any) {
      logger.error('[Insights Orchestrator] Failed to initialize:', e.message);
      throw new Error(`Insights Orchestrator initialization failed: ${e.message}`);
    }
  }
  return insightsOrchestratorInstance;
}

export class InsightsOrchestrator {
  private openai: OpenAI;

  constructor() {
    logger.info('[Insights Orchestrator] Initializing...');
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    logger.info('[Insights Orchestrator] Initialized successfully');
  }

  /**
   * Analyze document content and extract insights
   */
  async analyzeDocument(request: DocumentAnalysisRequest): Promise<InsightsAnalysisResult> {
    const analysisId = randomUUID();
    const startTime = Date.now();
    const turnIdentifier = `DocAnalysis-${analysisId.substring(0, 8)}`;
    
    logger.info(`[${turnIdentifier}] Starting document analysis: ${request.document.title}`);

    try {
      // Validate document
      if (!request.document.extracted_text || request.document.extracted_text.length < 10) {
        throw new Error('Document does not contain sufficient text for analysis');
      }

      // Prepare analysis prompt
      const analysisPrompt = DOCUMENT_ANALYSIS_PROMPT_TEMPLATE
        .replace('{documentContent}', request.document.extracted_text)
        .replace('{filename}', request.document.original_filename)
        .replace('{fileType}', request.document.file_type)
        .replace('{userContext}', request.userContext || '')
        .replace('{analysisType}', request.analysisType);

      // Generate structured analysis
      const analysisSchema = {
        type: "object" as const,
        properties: {
          summary: {
            type: "object" as const,
            properties: {
              executive_summary: { type: "string" as const },
              document_type: { type: "string" as const },
              key_purpose: { type: "string" as const }
            },
            required: ["executive_summary"]
          },
          insights: {
            type: "object" as const,
            properties: {
              key_insights: { type: "array" as const },
              trends_patterns: { type: "array" as const }
            }
          },
          action_items: { type: "array" as const }
        },
        required: ["summary", "insights"],
        additionalProperties: false
      };

      const analysisResult = await generateStructuredJson<any>(
        analysisPrompt,
        `Analyze document: ${request.document.title}`,
        analysisSchema,
        "document_analysis_v1",
        [],
        "gpt-4o",
        request.document.user_id
      );

      const processingTime = Date.now() - startTime;
      const result: InsightsAnalysisResult = {
        id: analysisId,
        user_id: request.document.user_id,
        analysis_type: 'document_analysis',
        analysis_name: `Analysis of ${request.document.title}`,
        status: 'completed',
        insights: analysisResult.insights || {},
        summary: analysisResult.summary?.executive_summary,
        recommendations: this.extractRecommendations(analysisResult.action_items || []),
        key_metrics: {},
        confidence_score: this.calculateConfidenceScore(analysisResult),
        processing_time_ms: processingTime,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      logger.info(`[${turnIdentifier}] Analysis completed in ${processingTime}ms`);
      return result;

    } catch (error: any) {
      logger.error(`[${turnIdentifier}] Analysis failed:`, error.message);
      
      return {
        id: analysisId,
        user_id: request.document.user_id,
        analysis_type: 'document_analysis',
        analysis_name: `Failed analysis of ${request.document.title}`,
        status: 'failed',
        insights: { error: error.message },
        key_metrics: {},
        processing_time_ms: Date.now() - startTime,
        created_at: new Date().toISOString()
      };
    }
  }

  /**
   * Analyze financial transaction data
   */
  async analyzeFinancialData(request: FinancialAnalysisRequest): Promise<InsightsAnalysisResult> {
    const analysisId = randomUUID();
    const startTime = Date.now();
    const turnIdentifier = `FinAnalysis-${analysisId.substring(0, 8)}`;
    
    logger.info(`[${turnIdentifier}] Starting financial analysis: ${request.transactions.length} transactions`);

    try {
      // Validate transactions
      const validTransactions = request.transactions.filter(t => 
        t.amount > 0 && t.description && t.transaction_date
      );

      if (validTransactions.length === 0) {
        throw new Error('No valid transactions found for analysis');
      }

      // Prepare transaction summary
      const transactionSummary = this.prepareTransactionSummary(validTransactions, request.dateRange);
      
      // Generate analysis
      const analysisPrompt = FINANCIAL_ANALYSIS_PROMPT_TEMPLATE
        .replace('{transactionData}', JSON.stringify(transactionSummary))
        .replace('{startDate}', request.dateRange.startDate)
        .replace('{endDate}', request.dateRange.endDate)
        .replace('{analysisFocus}', request.analysisFocus)
        .replace('{userContext}', request.userContext || '');

      const analysisSchema = {
        type: "object" as const,
        properties: {
          executive_summary: {
            type: "object" as const,
            properties: {
              overview: { type: "string" as const },
              overall_health: { type: "string" as const }
            }
          },
          financial_metrics: { type: "object" as const },
          insights_and_patterns: { type: "object" as const },
          recommendations: { type: "object" as const }
        },
        required: ["executive_summary", "financial_metrics"],
        additionalProperties: false
      };

      const analysisResult = await generateStructuredJson<any>(
        analysisPrompt,
        `Analyze financial data for ${request.dateRange.startDate} to ${request.dateRange.endDate}`,
        analysisSchema,
        "financial_analysis_v1",
        [],
        "gpt-4o",
        validTransactions[0]?.user_id || ''
      );

      const processingTime = Date.now() - startTime;
      const result: InsightsAnalysisResult = {
        id: analysisId,
        user_id: validTransactions[0]?.user_id || '',
        analysis_type: 'financial_analysis',
        analysis_name: `Financial Analysis ${request.dateRange.startDate} to ${request.dateRange.endDate}`,
        status: 'completed',
        insights: analysisResult.insights_and_patterns || {},
        summary: analysisResult.executive_summary?.overview,
        recommendations: this.extractFinancialRecommendations(analysisResult.recommendations || {}),
        key_metrics: analysisResult.financial_metrics || {},
        confidence_score: this.calculateFinancialConfidenceScore(validTransactions.length),
        processing_time_ms: processingTime,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      };

      logger.info(`[${turnIdentifier}] Financial analysis completed in ${processingTime}ms`);
      return result;

    } catch (error: any) {
      logger.error(`[${turnIdentifier}] Financial analysis failed:`, error.message);
      
      return {
        id: analysisId,
        user_id: request.transactions[0]?.user_id || '',
        analysis_type: 'financial_analysis',
        analysis_name: 'Failed financial analysis',
        status: 'failed',
        insights: { error: error.message },
        key_metrics: {},
        processing_time_ms: Date.now() - startTime,
        created_at: new Date().toISOString()
      };
    }
  }

  /**
   * Handle interactive chat-based analysis queries
   */
  async handleInsightsChat(
    userQuery: string,
    availableData: {
      documents?: InsightsDocument[];
      transactions?: InsightsTransaction[];
      previousAnalyses?: InsightsAnalysisResult[];
    },
    chatHistory: any[] = [],
    userContext?: string
  ): Promise<string> {
    const turnIdentifier = `InsightsChat-${randomUUID().substring(0, 8)}`;
    
    logger.info(`[${turnIdentifier}] Processing insights chat query`);

    try {
      const chatPrompt = INSIGHTS_CHAT_PROMPT_TEMPLATE
        .replace('{userQuery}', userQuery)
        .replace('{availableDocuments}', JSON.stringify(availableData.documents || []))
        .replace('{availableTransactions}', JSON.stringify(availableData.transactions || []))
        .replace('{previousAnalyses}', JSON.stringify(availableData.previousAnalyses || []))
        .replace('{chatHistory}', JSON.stringify(chatHistory))
        .replace('{userContext}', userContext || '');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: chatPrompt },
          { role: "user", content: userQuery }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const chatResponse = response.choices[0]?.message?.content || 
        'I apologize, but I was unable to process your request.';
      
      logger.info(`[${turnIdentifier}] Chat response generated successfully`);
      return chatResponse;

    } catch (error: any) {
      logger.error(`[${turnIdentifier}] Chat processing failed:`, error.message);
      return 'I apologize, but I encountered an error while processing your request. Please try again.';
    }
  }

  // Private helper methods
  private prepareTransactionSummary(
    transactions: InsightsTransaction[], 
    dateRange: { startDate: string; endDate: string }
  ) {
    const totalRevenue = transactions
      .filter(t => t.transaction_type === 'revenue')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.transaction_type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      summary: {
        total_transactions: transactions.length,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_income: totalRevenue - totalExpenses,
        date_range: dateRange
      },
      transactions: transactions.slice(0, 50) // Limit for prompt size
    };
  }

  private extractRecommendations(actionItems: any[]): string[] {
    return actionItems.map(item => 
      typeof item === 'string' ? item : item.task || item.description || 'Recommendation available'
    );
  }

  private extractFinancialRecommendations(recommendations: any): string[] {
    const strategic = recommendations.strategic_recommendations || [];
    const immediate = recommendations.immediate_actions || [];
    
    return [
      ...strategic.map((r: any) => r.description || r.title || 'Strategic recommendation'),
      ...immediate.map((a: any) => a.task || a.description || 'Immediate action')
    ];
  }

  private calculateConfidenceScore(analysisResult: any): number {
    let score = 0.5;
    
    if (analysisResult.summary) score += 0.1;
    if (analysisResult.insights?.key_insights?.length > 0) score += 0.2;
    if (analysisResult.action_items?.length > 0) score += 0.2;
    
    return Math.min(1.0, score);
  }

  private calculateFinancialConfidenceScore(transactionCount: number): number {
    let score = 0.3;
    
    if (transactionCount > 10) score += 0.3;
    if (transactionCount > 50) score += 0.4;
    
    return Math.min(1.0, score);
  }
}

export default InsightsOrchestrator; 