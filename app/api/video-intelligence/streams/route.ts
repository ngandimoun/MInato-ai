import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/memory-framework/config";

export async function GET(request: NextRequest) {
  const logPrefix = "[API VideoIntelligence Streams GET]";
  
  try {
    // Authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;
    logger.info(`${logPrefix} Fetching streams for user: ${userId.substring(0, 8)}`);

    // Get user's video streams
    const { data: streams, error } = await supabase
      .from('video_intelligence_streams')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(`${logPrefix} Error fetching streams:`, error);
      return NextResponse.json({ error: 'Failed to fetch streams' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      streams: streams || [],
      count: streams?.length || 0
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error fetching streams:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const logPrefix = "[API VideoIntelligence Streams POST]";
  
  try {
    // Authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;
    const body = await request.json();
    
    const { name, description, stream_type, stream_url, location, zone_definitions } = body;

    if (!name || !stream_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: name and stream_type' 
      }, { status: 400 });
    }

    logger.info(`${logPrefix} Creating stream for user: ${userId.substring(0, 8)}`);

    // Create new stream
    const { data: newStream, error } = await supabase
      .from('video_intelligence_streams')
      .insert({
        user_id: userId,
        name,
        description,
        stream_type,
        stream_url,
        location,
        zone_definitions: zone_definitions || [],
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      logger.error(`${logPrefix} Error creating stream:`, error);
      return NextResponse.json({ error: 'Failed to create stream' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      stream: newStream,
      message: 'Stream created successfully'
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error creating stream:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 