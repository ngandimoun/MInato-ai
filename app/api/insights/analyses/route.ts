import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getInsightsService } from '@/lib/services/InsightsService';
import { logger } from '@/memory-framework/config';

export async function GET(req: NextRequest) {
  const logPrefix = '[API:InsightsAnalyses]';
  const cookieStore = cookies();

  try {
    // Authenticate user
    const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user?.id) {
      logger.error(`${logPrefix} Authentication failed:`, userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status')?.split(',');

    // Get analyses
    const insightsService = getInsightsService();
    const analyses = await insightsService.getUserAnalysisResults({
      user_id: userId,
      limit,
      offset,
      status
    });

    logger.info(`${logPrefix} Retrieved ${analyses.length} analyses for user: ${userId.substring(0, 8)}`);

    // Format analyses for frontend
    const formattedAnalyses = analyses.map(analysis => ({
      id: analysis.id,
      analysis_name: analysis.analysis_name,
      analysis_type: analysis.analysis_type,
      status: analysis.status,
      insights: analysis.insights,
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      key_metrics: analysis.key_metrics,
      confidence_score: analysis.confidence_score,
      processing_time_ms: analysis.processing_time_ms,
      created_at: analysis.created_at,
      completed_at: analysis.completed_at
    }));

    return NextResponse.json({
      success: true,
      analyses: formattedAnalyses,
      total: analyses.length,
      pagination: {
        limit,
        offset,
        hasMore: analyses.length === limit
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error retrieving analyses:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 