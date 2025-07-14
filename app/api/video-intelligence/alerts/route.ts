import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/memory-framework/config";
import { VideoIntelligenceOrchestrator } from "@/lib/services/VideoIntelligenceOrchestrator";

const videoIntelligenceOrchestrator = new VideoIntelligenceOrchestrator();

export async function GET(request: NextRequest) {
  const logPrefix = "[API VideoIntelligence Alerts GET]";
  
  try {
    // Authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const streamId = searchParams.get('streamId');

    logger.info(`${logPrefix} Fetching alerts for user: ${userId.substring(0, 8)}`);

    // Build query
    let query = supabase
      .from('video_intelligence_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    if (streamId) {
      query = query.eq('stream_id', streamId);
    }

    const { data: alerts, error } = await query;

    if (error) {
      logger.error(`${logPrefix} Error fetching alerts:`, error);
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      alerts: alerts || [],
      count: alerts?.length || 0
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error fetching alerts:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const logPrefix = "[API VideoIntelligence Alerts PATCH]";
  
  try {
    // Authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;
    const body = await request.json();
    const { alertId, status } = body;

    if (!alertId || !status) {
      return NextResponse.json({ 
        error: 'Missing required fields: alertId and status' 
      }, { status: 400 });
    }

    const validStatuses = ['acknowledged', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status. Must be one of: acknowledged, resolved, dismissed' 
      }, { status: 400 });
    }

    logger.info(`${logPrefix} Updating alert ${alertId.substring(0, 8)} status to ${status} for user: ${userId.substring(0, 8)}`);

    // Update alert status using orchestrator
    const success = await videoIntelligenceOrchestrator.updateAlertStatus(
      alertId,
      userId,
      status
    );

    if (!success) {
      return NextResponse.json({ error: 'Failed to update alert status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Alert status updated successfully'
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error updating alert status:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 