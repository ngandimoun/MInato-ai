import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getInsightsService } from '@/lib/services/InsightsService';
import { logger } from '@/memory-framework/config';

export async function POST(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const logPrefix = '[API:AddDataToReport]';
  const cookieStore = cookies();

  try {
    // Authenticate user
    const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user?.id) {
      logger.error(`${logPrefix} Authentication failed:`, userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportId } = params;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { document_ids = [], transaction_ids = [], analysis_ids = [] } = body;

    if (document_ids.length === 0 && transaction_ids.length === 0 && analysis_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one document, transaction, or analysis ID is required' },
        { status: 400 }
      );
    }

    const insightsService = getInsightsService();
    
    // Check if report exists and user has access
    const report = await insightsService.getReport(reportId);
    
    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    if (report.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get current report data
    const currentReportData = report.report_data || {};
    const currentSourceDocuments = report.source_document_ids || [];
    const currentSourceTransactions = report.source_transaction_ids || [];
    const currentSourceAnalyses = report.source_analysis_ids || [];

    // Add new data IDs to existing arrays
    const updatedSourceDocuments = [...new Set([...currentSourceDocuments, ...document_ids])];
    const updatedSourceTransactions = [...new Set([...currentSourceTransactions, ...transaction_ids])];
    const updatedSourceAnalyses = [...new Set([...currentSourceAnalyses, ...analysis_ids])];

    // Update report data to track the addition
    const updatedReportData = {
      ...currentReportData,
      data_additions: [
        ...(currentReportData.data_additions || []),
        {
          added_at: new Date().toISOString(),
          added_documents: document_ids,
          added_transactions: transaction_ids,
          added_analyses: analysis_ids,
          added_by: user.id
        }
      ]
    };

    // Update the report
    const updatedReport = await insightsService.updateReport(reportId, {
      report_data: updatedReportData,
      source_document_ids: updatedSourceDocuments,
      source_transaction_ids: updatedSourceTransactions,
      source_analysis_ids: updatedSourceAnalyses,
      status: 'generating', // Mark as generating to indicate it needs re-processing
      version: report.version + 1 // Increment version
    });

    if (!updatedReport) {
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }

    logger.info(`${logPrefix} Added data to report: ${reportId}, new version: ${updatedReport.version}`);

    // TODO: Trigger report regeneration with the new data
    // This would typically involve calling the analyze endpoint or a background job
    // For now, we'll return the updated report

    return NextResponse.json({
      success: true,
      message: 'Data added to report successfully',
      report: {
        id: updatedReport.id,
        title: updatedReport.title,
        version: updatedReport.version,
        status: updatedReport.status,
        updated_at: updatedReport.updated_at
      },
      added_data: {
        documents: document_ids.length,
        transactions: transaction_ids.length,
        analyses: analysis_ids.length
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error adding data to report:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 