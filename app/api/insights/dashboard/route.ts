/**
 * Insights Dashboard API Route
 * Provides dashboard summary data for the insights feature
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { logger } from "@/memory-framework/config";
import { getInsightsService } from "@/lib/services/InsightsService";

export async function GET(req: NextRequest) {
  const logPrefix = "[API Insights Dashboard]";
  const cookieStore = cookies();

  try {
    const supabaseAuth = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    logger.info(`${logPrefix} Dashboard request from user: ${userId.substring(0, 8)}...`);

    const insightsService = getInsightsService();
    
    // Get dashboard summary
    const summary = await insightsService.getDashboardSummary(userId);

    // Get recent documents
    const recentDocuments = await insightsService.getUserDocuments({
      user_id: userId,
      limit: 5
    });

    // Get recent analyses
    const recentAnalyses = await insightsService.getUserAnalysisResults({
      user_id: userId,
      limit: 5
    });

    // Get recent transactions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTransactions = await insightsService.getUserTransactions({
      user_id: userId,
      date_from: thirtyDaysAgo.toISOString().split('T')[0],
      limit: 10
    });

    logger.info(`${logPrefix} Dashboard data retrieved for user: ${userId.substring(0, 8)}`);

    return NextResponse.json({
      success: true,
      summary,
      recent_data: {
        documents: recentDocuments.map(doc => ({
          id: doc.id,
          title: doc.title,
          file_type: doc.file_type,
          content_type: doc.content_type,
          status: doc.processing_status,
          created_at: doc.created_at
        })),
        analyses: recentAnalyses.map(analysis => ({
          id: analysis.id,
          analysis_name: analysis.analysis_name,
          analysis_type: analysis.analysis_type,
          status: analysis.status,
          created_at: analysis.created_at
        })),
        transactions: recentTransactions.map(transaction => ({
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          currency: transaction.currency,
          transaction_type: transaction.transaction_type,
          transaction_date: transaction.transaction_date
        }))
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error retrieving dashboard data:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 