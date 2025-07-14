// FILE: app/api/video-intelligence/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logger } from "@/memory-framework/config";
import { VideoIntelligenceOrchestrator } from "@/lib/services/VideoIntelligenceOrchestrator";
import { checkRateLimit } from "@/lib/rate-limiter";

const videoIntelligenceOrchestrator = new VideoIntelligenceOrchestrator();

export async function POST(request: NextRequest) {
  const logPrefix = "[API VideoIntelligence Analyze]";
  
  try {
    // Authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.error(`${logPrefix} Authentication failed:`, authError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;
    logger.info(`${logPrefix} Processing request for user: ${userId.substring(0, 8)}`);

    // Rate limiting
    const { success: rateLimitSuccess } = await checkRateLimit(
      userId,
      'video_intelligence_analysis'
    );
    
    if (!rateLimitSuccess) {
      logger.warn(`${logPrefix} Rate limit exceeded for user ${userId.substring(0, 8)}`);
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Parse request
    const formData = await request.formData();
    const videoFile = formData.get('video') as File | null;
    const streamId = formData.get('streamId') as string;
    const analysisType = formData.get('analysisType') as string || 'general_surveillance';
    const frameIndex = parseInt(formData.get('frameIndex') as string || '0');

    if (!videoFile || !streamId) {
      return NextResponse.json({ 
        error: 'Missing required parameters: video file and stream ID' 
      }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(videoFile.type)) {
      return NextResponse.json({ 
        error: `Unsupported file type: ${videoFile.type}` 
      }, { status: 400 });
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (videoFile.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 50MB' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await videoFile.arrayBuffer());
    
    logger.info(`${logPrefix} Analyzing ${videoFile.type} file (${fileBuffer.length} bytes) for stream ${streamId.substring(0, 8)}`);

    // Analyze frame
    const analysisResult = await videoIntelligenceOrchestrator.analyzeFrame(
      fileBuffer,
      streamId,
      userId,
      analysisType as any
    );

    logger.info(`${logPrefix} Analysis completed. Risk level: ${analysisResult.risk_level}`);

    return NextResponse.json({
      success: true,
      analysis: analysisResult,
      message: 'Frame analysis completed successfully'
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error processing video intelligence analysis:`, error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const logPrefix = "[API VideoIntelligence Analyze GET]";
  
  try {
    // Authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get('streamId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const analysisType = searchParams.get('analysisType');

    // Get recent analysis results
    const { data: analysisResults, error } = await supabase
      .from('video_intelligence_analysis')
      .select('*')
      .eq('user_id', userId)
      .eq('stream_id', streamId || '')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error(`${logPrefix} Error fetching analysis results:`, error);
      return NextResponse.json({ error: 'Failed to fetch analysis results' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      analyses: analysisResults || [],
      count: analysisResults?.length || 0
    });

  } catch (error: any) {
    logger.error(`${logPrefix} Error fetching analysis results:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 