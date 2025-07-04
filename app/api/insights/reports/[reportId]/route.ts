import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getInsightsService } from '@/lib/services/InsightsService';
import { logger } from '@/memory-framework/config';

export async function GET(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const logPrefix = '[API:InsightsReport]';
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
    const report = await insightsService.getReport(reportId);

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this report
    if (report.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    logger.info(`${logPrefix} Retrieved report: ${reportId} for user: ${user.id.substring(0, 8)}`);

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        report_type: report.report_type,
        summary: report.summary,
        status: report.status,
        created_at: report.created_at,
        updated_at: report.updated_at,
        view_count: report.view_count,
        version: report.version,
        report_data: report.report_data,
        html_content: report.html_content,
        is_scheduled: report.is_scheduled
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error retrieving report:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const logPrefix = '[API:InsightsReport:Update]';
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
    const existingReport = await insightsService.getReport(reportId);
    
    if (!existingReport) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    if (existingReport.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updates = body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;

    const updatedReport = await insightsService.updateReport(reportId, updates);

    if (!updatedReport) {
      return NextResponse.json(
        { error: 'Failed to update report' },
        { status: 500 }
      );
    }

    logger.info(`${logPrefix} Updated report: ${reportId}`);

    return NextResponse.json({
      success: true,
      report: {
        id: updatedReport.id,
        title: updatedReport.title,
        report_type: updatedReport.report_type,
        summary: updatedReport.summary,
        status: updatedReport.status,
        created_at: updatedReport.created_at,
        updated_at: updatedReport.updated_at,
        view_count: updatedReport.view_count,
        version: updatedReport.version
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error updating report:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 