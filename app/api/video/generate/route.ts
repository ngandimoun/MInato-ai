import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

interface VideoGenerationRequest {
  imageUrl?: string;
  imageFile?: string; // Base64 encoded image
  prompt: string;
  duration?: number; // Fixed to 5 seconds for now
  platform?: string;
  format?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: VideoGenerationRequest = await request.json();
    const { imageUrl, imageFile, prompt, duration = 5, platform, format } = body;

    // Validate input
    if (!imageUrl && !imageFile) {
      return NextResponse.json(
        { error: 'Either imageUrl or imageFile must be provided' },
        { status: 400 }
      );
    }

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get user authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Après avoir récupéré le profil utilisateur (userProfile)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      logger.error('[Video Generation API] User profile not found', { userId: user.id });
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 500 }
      );
    }

    // Build professional video generation prompt
    const enhancedPrompt = buildProfessionalPrompt(prompt, platform, format);

    logger.info('[Video Generation API] Starting video generation', {
      userId: user.id,
      hasImageUrl: !!imageUrl,
      hasImageFile: !!imageFile,
      originalPrompt: prompt,
      enhancedPrompt,
      duration
    });

    // Call Runway API
    const runwayResponse = await callRunwayAPI({
      imageUrl,
      imageFile,
      prompt: enhancedPrompt,
      duration
    });

    if (!runwayResponse.success) {
      logger.error('[Video Generation API] Runway API failed', {
        error: runwayResponse.error,
        userId: user.id
      });
      
      return NextResponse.json(
        { error: runwayResponse.error || 'Video generation failed' },
        { status: 500 }
      );
    }

    // Store video generation record in database
    let videoRecord: any = null;
    const { data: videoRecordData, error: dbError } = await supabase
      .from('generated_videos')
      .insert({
        user_id: user.id,
        runway_task_id: runwayResponse.taskId,
        original_image_url: imageUrl,
        prompt: prompt,
        enhanced_prompt: enhancedPrompt,
        status: 'generating',
        duration: duration,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbError) {
      logger.error('[Video Generation API] Database insert failed', {
        error: dbError,
        userId: user.id,
        errorCode: dbError.code
      });
      
      // If the table doesn't exist, create a fallback record
      if (dbError.code === '42P01' || dbError.message.includes('does not exist')) {
        logger.warn('[Video Generation API] generated_videos table does not exist, creating fallback record');
        videoRecord = {
          id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          user_id: user.id,
          runway_task_id: runwayResponse.taskId,
          original_image_url: imageUrl,
          prompt: prompt,
          enhanced_prompt: enhancedPrompt,
          status: 'generating',
          duration: duration,
          created_at: new Date().toISOString()
        };
      } else {
        return NextResponse.json(
          { error: 'Failed to save video generation record' },
          { status: 500 }
        );
      }
    } else {
      videoRecord = videoRecordData;
    }

    // Après avoir récupéré le profil utilisateur (userProfile)
    if (userProfile.plan_type === 'PRO') {
      const usage = userProfile.monthly_usage || {};
      const limits = userProfile.quota_limits || {};
      const videoLimit = limits.videos ?? 20;
      if ((usage.videos ?? 0) >= videoLimit) {
        return NextResponse.json({ error: `Monthly video generation limit reached for your Pro plan (${videoLimit}).` }, { status: 403 });
      }
      // Increment video counter
      await supabase
        .from('user_profiles')
        .update({ monthly_usage: { ...usage, videos: (usage.videos ?? 0) + 1 } })
        .eq('id', userProfile.id);
      // Log formatted quotas
      const logMsg = [
        '=== REMAINING QUOTAS FOR PRO USER ===',
        `User: ${userProfile.email || userProfile.id}`,
        `  Images     : ${(usage.images ?? 0)} / ${(limits.images ?? 30)}`,
        `  Videos     : ${(usage.videos ?? 0) + 1} / ${videoLimit}`,
        `  Recordings : ${(usage.recordings ?? 0)} / ${(limits.recordings ?? 20)}`,
        '====================================='
      ].join('\n');
      console.log(logMsg);
    }

    return NextResponse.json({
      success: true,
      videoId: videoRecord.id,
      taskId: runwayResponse.taskId,
      status: 'generating',
      message: 'Video generation started successfully'
    });

  } catch (error) {
    logger.error('[Video Generation API] Unexpected error', { error });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildProfessionalPrompt(userPrompt: string, platform?: string, format?: string): string {
  // Build a concise, social media-friendly prompt optimized for Runway
  let baseInstructions = `5-second social media video. Keep original image style. Add smooth motion: zoom, rotation, or parallax. Make vibrant and engaging for mobile.`;

  // Customize instructions based on platform and format
  if (platform && format) {
    const platformSpecificInstructions = getPlatformSpecificInstructions(platform, format);
    if (platformSpecificInstructions) {
      baseInstructions = platformSpecificInstructions;
    }
  }

  // Keep the final prompt concise for Runway
  const enhancedPrompt = `${baseInstructions} ${userPrompt}`;

  return enhancedPrompt;
}

function getPlatformSpecificInstructions(platform: string, format: string): string | null {
  const platformFormats: Record<string, Record<string, string>> = {
    'instagram': {
      'instagram-post': '5-second Instagram video. Keep original style. Add smooth zoom or rotation. Make vibrant for mobile feeds.',
      'instagram-story': '5-second Instagram Story. Keep original style. Add vertical motion: zoom or rotation. Optimize for vertical mobile.',
      'instagram-reel': '5-second Instagram Reel. Keep original style. Add dynamic motion: zoom, rotation, or effects. Make vibrant for vertical mobile.'
    },
    'tiktok': {
      'tiktok-video': '5-second TikTok video. Keep original style. Add trending motion: zoom, rotation, or effects. Make vibrant for vertical mobile.'
    },
    'youtube': {
      'youtube-short': '5-second YouTube Short. Keep original style. Add compelling motion: zoom or rotation. Optimize for vertical mobile.',
      'youtube-video': '5-second YouTube video. Keep original style. Add smooth motion: zoom or rotation. Optimize for horizontal viewing.'
    },
    'facebook': {
      'facebook-post': '5-second Facebook video. Keep original style. Add smooth motion: zoom or rotation. Make vibrant for feeds.',
      'facebook-story': '5-second Facebook Story. Keep original style. Add vertical motion: zoom or rotation. Optimize for vertical mobile.'
    },
    'twitter': {
      'twitter-post': '5-second Twitter video. Keep original style. Add smooth motion: zoom or rotation. Make vibrant for feeds.'
    },
    'linkedin': {
      'linkedin-post': '5-second LinkedIn video. Keep original style. Add professional motion: smooth zoom or rotation. Make polished.'
    }
  };

  return platformFormats[platform]?.[format] || null;
}

async function callRunwayAPI(params: {
  imageUrl?: string;
  imageFile?: string;
  prompt: string;
  duration: number;
}): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const runwayApiKey = process.env.RUNWAY_API_KEY;
    
    if (!runwayApiKey) {
      throw new Error('Runway API key not configured');
    }

    // Validate prompt
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    if (params.prompt.length > 500) {
      throw new Error('Prompt is too long (max 500 characters)');
    }

    // Prepare the image input
    let promptImage: string;
    if (params.imageUrl) {
      // Validate image URL
      if (!params.imageUrl.startsWith('http')) {
        throw new Error('Invalid image URL format');
      }
      promptImage = params.imageUrl;
    } else if (params.imageFile) {
      // Convert base64 to data URI if it's not already
      if (params.imageFile.startsWith('data:')) {
        promptImage = params.imageFile;
      } else {
        // Assume it's base64 encoded image, add data URI prefix
        promptImage = `data:image/jpeg;base64,${params.imageFile}`;
      }
      
      // Validate base64 image size (rough estimate)
      const base64Length = params.imageFile.length;
      const estimatedSize = (base64Length * 0.75) / (1024 * 1024); // Convert to MB
      if (estimatedSize > 10) {
        throw new Error('Image file too large (max 10MB)');
      }
    } else {
      throw new Error('No image provided');
    }

    // Prepare the request payload using official Runway API format
    const payload = {
      model: 'gen4_turbo',
      promptImage: promptImage,
      promptText: params.prompt.trim(),
      ratio: '1280:720',
      duration: params.duration,
      seed: Math.floor(Math.random() * 4294967295)
    };

    logger.info('[Runway API] Making request with payload', {
      model: payload.model,
      ratio: payload.ratio,
      duration: payload.duration,
      promptTextLength: payload.promptText.length,
      hasPromptImage: !!payload.promptImage,
      seed: payload.seed,
      promptText: payload.promptText // Log the actual prompt for debugging
    });

    const response = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('[Runway API] Request failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        promptText: payload.promptText
      });
      
      // Provide more specific error messages based on status code
      let errorMessage = `Runway API error: ${response.status} ${response.statusText}`;
      if (response.status === 400) {
        errorMessage = 'Invalid request parameters. Please check your image and prompt.';
      } else if (response.status === 401) {
        errorMessage = 'API authentication failed. Please contact support.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (response.status >= 500) {
        errorMessage = 'Runway service temporarily unavailable. Please try again later.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }

    const result = await response.json();
    
    logger.info('[Runway API] Generation started', {
      taskId: result.id,
      status: result.status,
      fullResult: result // Log full result for debugging
    });

    return {
      success: true,
      taskId: result.id
    };

  } catch (error) {
    logger.error('[Runway API] Unexpected error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// GET endpoint to check video generation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');
    const taskId = searchParams.get('taskId');

    if (!videoId && !taskId) {
      return NextResponse.json(
        { error: 'videoId or taskId parameter is required' },
        { status: 400 }
      );
    }

    // Get user authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    let videoRecord;
    
    if (videoId) {
      // Get video record from database
      const { data, error } = await supabase
        .from('generated_videos')
        .select('*')
        .eq('id', videoId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          logger.warn('[Video Status API] generated_videos table does not exist, skipping database lookup');
          videoRecord = null;
        } else {
          return NextResponse.json(
            { error: 'Video record not found' },
            { status: 404 }
          );
        }
      } else {
        videoRecord = data;
      }
    }

    // Check status with Runway API
    const runwayApiKey = process.env.RUNWAY_API_KEY;
    const actualTaskId = taskId || videoRecord?.runway_task_id;
    
    if (!actualTaskId) {
      return NextResponse.json(
        { error: 'No task ID available' },
        { status: 400 }
      );
    }

    const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${actualTaskId}`, {
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'X-Runway-Version': '2024-11-06'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[Video Status API] Runway status check failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        taskId: actualTaskId
      });
      
      return NextResponse.json(
        { error: 'Failed to check video status' },
        { status: 500 }
      );
    }

    const result = await response.json();
    
    logger.info('[Video Status API] Runway API response', {
      taskId: actualTaskId,
      status: result.status,
      progress: result.progress,
      hasOutput: !!result.output?.length,
      failureReason: result.failure_reason,
      fullResult: result // Log full result for debugging
    });
    
    // Update database if we have a video record
    if (videoRecord && result.status !== videoRecord.status) {
      // Map Runway API status to our internal status
      let internalStatus = 'generating';
      if (result.status === 'SUCCEEDED') {
        internalStatus = 'completed';
      } else if (result.status === 'FAILED') {
        internalStatus = 'failed';
      }

      const updateData: any = {
        status: internalStatus,
        updated_at: new Date().toISOString()
      };
      
      if (result.status === 'SUCCEEDED' && result.output?.length > 0) {
        updateData.video_url = result.output[0];
        updateData.completed_at = new Date().toISOString();
      } else if (result.status === 'FAILED') {
        // Provide more detailed error message
        let errorMessage = result.failure_reason || 'Generation failed';
        if (!result.failure_reason) {
          errorMessage = 'Runway generation failed without specific reason. This could be due to: image format issues, content policy violations, or temporary service issues.';
        }
        updateData.error_message = errorMessage;
        updateData.completed_at = new Date().toISOString();
      }

      logger.info('[Video Status API] Updating database record', {
        videoId: videoRecord.id,
        runwayStatus: result.status,
        internalStatus,
        hasVideoUrl: !!updateData.video_url,
        errorMessage: updateData.error_message
      });

      try {
        await supabase
          .from('generated_videos')
          .update(updateData)
          .eq('id', videoRecord.id);
      } catch (updateError) {
        logger.warn('[Video Status API] Failed to update database record', { updateError });
      }
    }

    // Provide more detailed error message to frontend
    let errorMessage = result.failure_reason;
    if (result.status === 'FAILED' && !result.failure_reason) {
      errorMessage = 'Video generation failed. This could be due to image format issues, content policy violations, or temporary service issues. Please try again with a different image or prompt.';
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      videoUrl: result.output?.length > 0 ? result.output[0] : null,
      progress: result.progress || 0,
      errorMessage: errorMessage
    });

  } catch (error) {
    logger.error('[Video Status API] Unexpected error', { error });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 