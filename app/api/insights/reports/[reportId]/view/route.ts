import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getInsightsService } from '@/lib/services/InsightsService';
import { logger } from '@/memory-framework/config';

export async function POST(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const logPrefix = '[API:ReportView]';
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

    // Increment view count
    const success = await insightsService.incrementReportViewCount(reportId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to increment view count' },
        { status: 500 }
      );
    }

    logger.info(`${logPrefix} Incremented view count for report: ${reportId}`);

    return NextResponse.json({
      success: true,
      message: 'View count incremented'
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error incrementing view count:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 