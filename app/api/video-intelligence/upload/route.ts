import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { VideoIntelligenceOrchestrator } from '@/lib/services/VideoIntelligenceOrchestrator';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const scenario = formData.get('scenario') as string || 'behavior_analysis';
    const description = formData.get('description') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Validate file type and size
    const allowedTypes = ['video/mp4', 'video/webm', 'video/avi', 'video/mov', 'video/quicktime'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Supported formats: MP4, WebM, AVI, MOV' 
      }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 100MB' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `video-intelligence-${user.id}-${timestamp}.${file.name.split('.').pop()}`;
    
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('video-intelligence')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('video-intelligence')
      .getPublicUrl(filename);

    // Create video intelligence stream record
    const { data: streamData, error: streamError } = await supabase
      .from('video_intelligence_streams')
      .insert({
        user_id: user.id,
        name: file.name,
        type: 'upload',
        url: publicUrl,
        status: 'processing',
        scenario: scenario,
        description: description,
        metadata: {
          filename: filename,
          file_size: file.size,
          file_type: file.type,
          uploaded_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (streamError) {
      console.error('Stream creation error:', streamError);
      return NextResponse.json({ error: 'Failed to create stream record' }, { status: 500 });
    }

    // Add video to processing queue
    try {
      const { VideoProcessingQueue } = await import('@/lib/services/VideoProcessingQueue');
      const queue = VideoProcessingQueue.getInstance();
      
      const jobId = await queue.addJob(
        streamData.id,
        publicUrl,
        user.id,
        scenario,
        'medium' // Default priority
      );

      return NextResponse.json({
        success: true,
        stream_id: streamData.id,
        job_id: jobId,
        message: 'Video uploaded successfully and added to processing queue',
        stream: streamData,
        queue_stats: queue.getQueueStats()
      });
    } catch (processingError) {
      console.error('Video processing error:', processingError);
      
      // Update stream status to error
      await supabase
        .from('video_intelligence_streams')
        .update({ status: 'error' })
        .eq('id', streamData.id);

      return NextResponse.json({ 
        error: 'Video uploaded but processing failed. Please try again.' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Upload endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get uploaded videos for the user
    const { data: uploads, error } = await supabase
      .from('video_intelligence_streams')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'upload')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching uploads:', error);
      return NextResponse.json({ error: 'Failed to fetch uploads' }, { status: 500 });
    }

    return NextResponse.json({ uploads });

  } catch (error) {
    console.error('Get uploads endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 