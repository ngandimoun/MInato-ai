/**
 * Minato AI Insights Service
 * Handles database operations and file management for the insights feature
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/memory-framework/config';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

// Database interfaces
export interface InsightsDocument {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  original_filename: string;
  file_type: string;
  content_type: 'document' | 'image' | 'video' | 'audio' | 'other';
  file_size?: number;
  storage_path?: string;
  extracted_text?: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'archived';
  categories?: string[];
  tags?: string[];
  batch_context?: {
    batch_title?: string;
    batch_description?: string;
    batch_index?: number;
    batch_total?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface InsightsTransaction {
  id: string;
  user_id: string;
  transaction_type: 'revenue' | 'expense' | 'refund' | 'fee' | 'tax' | 'other';
  amount: number;
  currency: string;
  description: string;
  category?: string;
  transaction_date: string;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
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

export interface InsightsReport {
  id: string;
  user_id: string;
  title: string;
  report_type: string;
  report_data: Record<string, any>;
  summary?: string;
  status: 'draft' | 'generating' | 'completed' | 'failed' | 'archived' | 'published';
  html_content?: string;
  is_scheduled: boolean;
  schedule_config: Record<string, any>;
  version: number;
  view_count: number;
  source_analysis_ids?: string[];
  source_document_ids?: string[];
  source_transaction_ids?: string[];
  created_at: string;
  updated_at: string;
}

// Request interfaces
export interface CreateDocumentRequest {
  user_id: string;
  title: string;
  original_filename: string;
  file_type: string;
  content_type?: 'document' | 'image' | 'video' | 'audio' | 'other';
  file_size?: number;
  description?: string;
  categories?: string[];
  tags?: string[];
  batch_context?: {
    batch_title?: string;
    batch_description?: string;
    batch_index?: number;
    batch_total?: number;
  };
}

export interface CreateTransactionRequest {
  user_id: string;
  transaction_type: 'revenue' | 'expense' | 'refund' | 'fee' | 'tax' | 'other';
  amount: number;
  currency: string;
  description: string;
  category?: string;
  transaction_date: string;
  is_recurring?: boolean;
}

export interface SearchFilters {
  user_id: string;
  date_from?: string;
  date_to?: string;
  categories?: string[];
  tags?: string[];
  status?: string[];
  limit?: number;
  offset?: number;
}

// Singleton instance
let insightsServiceInstance: InsightsService | null = null;

export function getInsightsService(): InsightsService {
  if (!insightsServiceInstance) {
    logger.info('[Insights Service] Initializing...');
    try {
      insightsServiceInstance = new InsightsService();
    } catch (e: any) {
      logger.error('[Insights Service] Failed to initialize:', e.message);
      throw new Error(`Insights Service initialization failed: ${e.message}`);
    }
  }
  return insightsServiceInstance;
}

export class InsightsService {
  private client: SupabaseClient;
  private readonly STORAGE_BUCKET = 'insights-documents';

  constructor() {
    logger.info('[Insights Service] Initializing...');
    
    const client = getSupabaseAdminClient();
    if (!client) {
      throw new Error('Supabase admin client is not available');
    }
    this.client = client;
    
    logger.info('[Insights Service] Initialized successfully');
  }

  // Document Operations
  async createDocument(request: CreateDocumentRequest): Promise<InsightsDocument | null> {
    const logPrefix = '[Insights Service:CreateDoc]';
    const documentId = randomUUID();
    
    logger.info(`${logPrefix} Creating document: ${request.title}`);

    try {
      const documentData = {
        id: documentId,
        user_id: request.user_id,
        title: request.title,
        description: request.description || null,
        original_filename: request.original_filename,
        file_type: request.file_type,
        content_type: request.content_type || 'document',
        file_size: request.file_size || 0,
        processing_status: 'pending',
        categories: request.categories || [],
        tags: request.tags || [],
        batch_context: request.batch_context || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('insights_documents')
        .insert(documentData)
        .select()
        .single();

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return null;
      }

      logger.info(`${logPrefix} Document created successfully: ${documentId}`);
      return data as InsightsDocument;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return null;
    }
  }

  async updateDocument(
    documentId: string, 
    updates: Partial<Omit<InsightsDocument, 'id' | 'user_id' | 'created_at'>>
  ): Promise<InsightsDocument | null> {
    const logPrefix = '[Insights Service:UpdateDoc]';
    
    logger.info(`${logPrefix} Updating document: ${documentId}`);

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('insights_documents')
        .update(updateData)
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return null;
      }

      return data as InsightsDocument;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return null;
    }
  }

  async getDocument(documentId: string): Promise<InsightsDocument | null> {
    const logPrefix = '[Insights Service:GetDoc]';
    
    try {
      const { data, error } = await this.client
        .from('insights_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        logger.error(`${logPrefix} Database error:`, error);
        return null;
      }

      return data as InsightsDocument;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return null;
    }
  }

  async getUserDocuments(filters: SearchFilters): Promise<InsightsDocument[]> {
    const logPrefix = '[Insights Service:GetUserDocs]';
    
    try {
      let query = this.client
        .from('insights_documents')
        .select('*')
        .eq('user_id', filters.user_id);

      if (filters.status && filters.status.length > 0) {
        query = query.in('processing_status', filters.status);
      }
      
      if (filters.categories && filters.categories.length > 0) {
        query = query.overlaps('categories', filters.categories);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50);

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return [];
      }

      return (data || []) as InsightsDocument[];

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return [];
    }
  }

  // Transaction Operations
  async createTransaction(request: CreateTransactionRequest): Promise<InsightsTransaction | null> {
    const logPrefix = '[Insights Service:CreateTxn]';
    const transactionId = randomUUID();
    
    logger.info(`${logPrefix} Creating transaction: ${request.description.substring(0, 50)}`);

    try {
      const transactionData = {
        id: transactionId,
        user_id: request.user_id,
        transaction_type: request.transaction_type,
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        category: request.category,
        transaction_date: request.transaction_date,
        is_recurring: request.is_recurring || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('insights_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return null;
      }

      logger.info(`${logPrefix} Transaction created successfully: ${transactionId}`);
      return data as InsightsTransaction;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return null;
    }
  }

  async getUserTransactions(filters: SearchFilters): Promise<InsightsTransaction[]> {
    const logPrefix = '[Insights Service:GetUserTxns]';
    
    try {
      let query = this.client
        .from('insights_transactions')
        .select('*')
        .eq('user_id', filters.user_id);
      
      if (filters.date_from) {
        query = query.gte('transaction_date', filters.date_from);
      }
      
      if (filters.date_to) {
        query = query.lte('transaction_date', filters.date_to);
      }

      query = query
        .order('transaction_date', { ascending: false })
        .limit(filters.limit || 100);

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return [];
      }

      return (data || []) as InsightsTransaction[];

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return [];
    }
  }

  // Analysis Operations
  async createAnalysisResult(analysisResult: Omit<InsightsAnalysisResult, 'id' | 'created_at'>): Promise<InsightsAnalysisResult | null> {
    const logPrefix = '[Insights Service:CreateAnalysis]';
    const analysisId = randomUUID();
    
    logger.info(`${logPrefix} Creating analysis: ${analysisResult.analysis_name}`);

    try {
      const analysisData = {
        id: analysisId,
        ...analysisResult,
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('insights_analysis_results')
        .insert(analysisData)
        .select()
        .single();

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return null;
      }

      logger.info(`${logPrefix} Analysis created successfully: ${analysisId}`);
      return data as InsightsAnalysisResult;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return null;
    }
  }

  async getUserAnalysisResults(filters: SearchFilters): Promise<InsightsAnalysisResult[]> {
    const logPrefix = '[Insights Service:GetUserAnalyses]';
    
    try {
      let query = this.client
        .from('insights_analysis_results')
        .select('*')
        .eq('user_id', filters.user_id);
      
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 20);

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return [];
      }

      return (data || []) as InsightsAnalysisResult[];

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return [];
    }
  }

  // Report Operations
  async createReport(reportData: Omit<InsightsReport, 'id' | 'created_at' | 'updated_at'>): Promise<InsightsReport | null> {
    const logPrefix = '[Insights Service:CreateReport]';
    const reportId = randomUUID();
    
    logger.info(`${logPrefix} Creating report: ${reportData.title}`);

    try {
      const report = {
        id: reportId,
        ...reportData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('insights_reports')
        .insert(report)
        .select()
        .single();

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return null;
      }

      logger.info(`${logPrefix} Report created successfully: ${reportId}`);
      return data as InsightsReport;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return null;
    }
  }

  async getUserReports(filters: SearchFilters): Promise<InsightsReport[]> {
    const logPrefix = '[Insights Service:GetUserReports]';
    
    try {
      let query = this.client
        .from('insights_reports')
        .select('*')
        .eq('user_id', filters.user_id);
      
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      query = query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 20);

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
      }

      const { data, error } = await query;

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return [];
      }

      return (data || []) as InsightsReport[];

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return [];
    }
  }

  async getReport(reportId: string): Promise<InsightsReport | null> {
    const logPrefix = '[Insights Service:GetReport]';
    
    try {
      const { data, error } = await this.client
        .from('insights_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return null;
      }

      return data as InsightsReport;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return null;
    }
  }

  async updateReport(
    reportId: string, 
    updates: Partial<Omit<InsightsReport, 'id' | 'user_id' | 'created_at'>>
  ): Promise<InsightsReport | null> {
    const logPrefix = '[Insights Service:UpdateReport]';
    
    logger.info(`${logPrefix} Updating report: ${reportId}`);

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.client
        .from('insights_reports')
        .update(updateData)
        .eq('id', reportId)
        .select()
        .single();

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return null;
      }

      logger.info(`${logPrefix} Report updated successfully: ${reportId}`);
      return data as InsightsReport;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return null;
    }
  }

  async incrementReportViewCount(reportId: string): Promise<boolean> {
    const logPrefix = '[Insights Service:IncrementViewCount]';
    
    try {
      // First get the current view count
      const { data: currentReport, error: fetchError } = await this.client
        .from('insights_reports')
        .select('view_count')
        .eq('id', reportId)
        .single();

      if (fetchError || !currentReport) {
        logger.error(`${logPrefix} Failed to fetch current view count:`, fetchError);
        return false;
      }

      // Increment the view count
      const { error } = await this.client
        .from('insights_reports')
        .update({ view_count: currentReport.view_count + 1 })
        .eq('id', reportId);

      if (error) {
        logger.error(`${logPrefix} Database error:`, error);
        return false;
      }

      return true;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return false;
    }
  }

  // File Storage Operations
  async uploadFile(
    userId: string,
    filename: string,
    fileContent: Buffer | Uint8Array | File,
    contentType?: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    const logPrefix = '[Insights Service:Upload]';
    
    logger.info(`${logPrefix} Uploading file: ${filename} for user: ${userId.substring(0, 8)}`);

    try {
      const filePath = `${userId}/${Date.now()}-${filename}`;
      
      const { data, error } = await this.client.storage
        .from(this.STORAGE_BUCKET)
        .upload(filePath, fileContent, {
          contentType: contentType,
          upsert: false
        });

      if (error) {
        logger.error(`${logPrefix} Storage error:`, error);
        return { success: false, error: error.message };
      }

      logger.info(`${logPrefix} File uploaded successfully: ${filePath}`);
      return { success: true, path: data.path };

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async getFileUrl(filePath: string, expiresIn: number = 3600): Promise<string | null> {
    const logPrefix = '[Insights Service:GetFileUrl]';
    
    try {
      const { data, error } = await this.client.storage
        .from(this.STORAGE_BUCKET)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        logger.error(`${logPrefix} Error creating signed URL:`, error);
        return null;
      }

      return data.signedUrl;

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return null;
    }
  }

  // Dashboard Summary
  async getDashboardSummary(userId: string): Promise<{
    documents: { total: number; pending: number; completed: number };
    transactions: { total: number; revenue: number; expenses: number };
    analyses: { total: number; completed: number };
    reports: { total: number; published: number };
  }> {
    const logPrefix = '[Insights Service:Dashboard]';
    
    try {
      const [documentsResult, transactionsResult, analysesResult, reportsResult] = await Promise.all([
        this.client.from('insights_documents')
          .select('processing_status')
          .eq('user_id', userId),
        this.client.from('insights_transactions')
          .select('transaction_type, amount')
          .eq('user_id', userId),
        this.client.from('insights_analysis_results')
          .select('status')
          .eq('user_id', userId),
        this.client.from('insights_reports')
          .select('status')
          .eq('user_id', userId)
      ]);

      const documents = {
        total: documentsResult.data?.length || 0,
        pending: documentsResult.data?.filter(d => d.processing_status === 'pending').length || 0,
        completed: documentsResult.data?.filter(d => d.processing_status === 'completed').length || 0
      };

      const transactionData = transactionsResult.data || [];
      const transactions = {
        total: transactionData.length,
        revenue: transactionData.filter(t => t.transaction_type === 'revenue').reduce((sum, t) => sum + t.amount, 0),
        expenses: transactionData.filter(t => t.transaction_type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      };

      const analyses = {
        total: analysesResult.data?.length || 0,
        completed: analysesResult.data?.filter(a => a.status === 'completed').length || 0
      };

      const reports = {
        total: reportsResult.data?.length || 0,
        published: reportsResult.data?.filter(r => r.status === 'published').length || 0
      };

      return { documents, transactions, analyses, reports };

    } catch (error: any) {
      logger.error(`${logPrefix} Exception:`, error.message);
      return {
        documents: { total: 0, pending: 0, completed: 0 },
        transactions: { total: 0, revenue: 0, expenses: 0 },
        analyses: { total: 0, completed: 0 },
        reports: { total: 0, published: 0 }
      };
    }
  }
}

export default InsightsService; 