/**
 * Insights Analyze API Route
 * Handles triggering analysis for documents and financial data
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { logger } from "@/memory-framework/config";
import { getInsightsService } from "@/lib/services/InsightsService";
import { getInsightsOrchestrator } from "@/lib/services/insights-orchestrator";

export async function POST(req: NextRequest) {
  const logPrefix = "[API Insights Analyze]";
  const cookieStore = cookies();

  try {
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    logger.info(`${logPrefix} Analysis request from user: ${userId.substring(0, 8)}...`);

    const body = await req.json();
    const { analysis_type, document_ids, date_range, analysis_focus, user_context } = body;

    if (!analysis_type) {
      return NextResponse.json({ error: "Analysis type is required" }, { status: 400 });
    }

    const insightsService = getInsightsService();
    const orchestrator = getInsightsOrchestrator();

    let analysisResult;

    switch (analysis_type) {
      case 'document_analysis':
        if (!document_ids || !Array.isArray(document_ids) || document_ids.length === 0) {
          return NextResponse.json({ error: "Document IDs are required" }, { status: 400 });
        }

        const document = await insightsService.getDocument(document_ids[0]);
        if (!document) {
          return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        if (document.user_id !== userId) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        analysisResult = await orchestrator.analyzeDocument({
          document,
          analysisType: 'comprehensive',
          userContext: user_context
        });

        const savedAnalysis = await insightsService.createAnalysisResult(analysisResult);

        return NextResponse.json({
          success: true,
          analysis: {
            id: savedAnalysis?.id,
            analysis_type: analysisResult.analysis_type,
            status: analysisResult.status,
            summary: analysisResult.summary,
            recommendations: analysisResult.recommendations,
            created_at: analysisResult.created_at
          }
        });

      case 'financial_analysis':
        if (!date_range || !date_range.start_date || !date_range.end_date) {
          return NextResponse.json({ error: "Date range is required" }, { status: 400 });
        }

        const transactions = await insightsService.getUserTransactions({
          user_id: userId,
          date_from: date_range.start_date,
          date_to: date_range.end_date,
          limit: 1000
        });

        if (transactions.length === 0) {
          return NextResponse.json({ error: "No transactions found" }, { status: 400 });
        }

        analysisResult = await orchestrator.analyzeFinancialData({
          transactions,
          dateRange: {
            startDate: date_range.start_date,
            endDate: date_range.end_date
          },
          analysisFocus: analysis_focus || 'comprehensive',
          userContext: user_context
        });

        const savedFinancialAnalysis = await insightsService.createAnalysisResult(analysisResult);

        return NextResponse.json({
          success: true,
          analysis: {
            id: savedFinancialAnalysis?.id,
            analysis_type: analysisResult.analysis_type,
            status: analysisResult.status,
            summary: analysisResult.summary,
            key_metrics: analysisResult.key_metrics,
            created_at: analysisResult.created_at
          }
        });

      default:
        return NextResponse.json({ error: "Unsupported analysis type" }, { status: 400 });
    }

  } catch (error: any) {
    logger.error(`${logPrefix} Error during analysis:`, error.message);
    return NextResponse.json({ 
      error: `Analysis failed: ${error.message}` 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const logPrefix = "[API Insights Analyze GET]";
  const cookieStore = cookies();

  try {
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status')?.split(',');

    const insightsService = getInsightsService();
    const analyses = await insightsService.getUserAnalysisResults({
      user_id: userId,
      limit,
      offset,
      status
    });

    return NextResponse.json({
      success: true,
      analyses: analyses.map(analysis => ({
        id: analysis.id,
        analysis_type: analysis.analysis_type,
        analysis_name: analysis.analysis_name,
        status: analysis.status,
        summary: analysis.summary,
        recommendations: analysis.recommendations,
        created_at: analysis.created_at
      })),
      total: analyses.length
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error retrieving analyses:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 