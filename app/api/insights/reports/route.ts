import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getInsightsService } from '@/lib/services/InsightsService';
import { logger } from '@/memory-framework/config';

export async function GET(req: NextRequest) {
  const logPrefix = '[API:InsightsReports]';
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
    const reportType = searchParams.get('report_type');

    // Get reports
    const insightsService = getInsightsService();
    const reports = await insightsService.getUserReports({
      user_id: userId,
      limit,
      offset,
      status
    });

    // Filter by report type if specified
    const filteredReports = reportType 
      ? reports.filter(report => report.report_type === reportType)
      : reports;

    logger.info(`${logPrefix} Retrieved ${filteredReports.length} reports for user: ${userId.substring(0, 8)}`);

    // Format reports for frontend
    const formattedReports = filteredReports.map(report => ({
      id: report.id,
      title: report.title,
      report_type: report.report_type,
      summary: report.summary,
      status: report.status,
      created_at: report.created_at,
      updated_at: report.updated_at,
      view_count: report.view_count,
      version: report.version,
      is_scheduled: report.is_scheduled
    }));

    return NextResponse.json({
      success: true,
      reports: formattedReports,
      total: filteredReports.length,
      pagination: {
        limit,
        offset,
        hasMore: filteredReports.length === limit
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error retrieving reports:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const logPrefix = '[API:InsightsReports:Create]';
  const cookieStore = cookies();

  try {
    // Authenticate user
    const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user?.id) {
      logger.error(`${logPrefix} Authentication failed:`, userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      report_type,
      report_data = {},
      summary,
      status = 'draft'
    } = body;

    if (!title || !report_type) {
      return NextResponse.json(
        { error: 'Title and report_type are required' },
        { status: 400 }
      );
    }

    const insightsService = getInsightsService();
    
    const report = await insightsService.createReport({
      user_id: user.id,
      title,
      report_type,
      report_data,
      summary,
      status,
      is_scheduled: false,
      schedule_config: {},
      version: 1,
      view_count: 0
    });

    if (!report) {
      logger.error(`${logPrefix} Failed to create report`);
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      );
    }

    logger.info(`${logPrefix} Report created successfully: ${report.id}`);

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
        version: report.version
      }
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error creating report:`, error.message);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 });
  }
} 