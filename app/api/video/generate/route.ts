import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/memory-framework/config';

interface VideoGenerationRequest {
  imageUrl?: string;
  imageFile?: string; // Base64 encoded image
  prompt: string;
  duration?: number; // Fixed to 5 seconds for now
}

export async function POST(request: NextRequest) {
  try {
    const body: VideoGenerationRequest = await request.json();
    const { imageUrl, imageFile, prompt, duration = 5 } = body;

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

    // Build professional video generation prompt
    const enhancedPrompt = buildProfessionalPrompt(prompt);

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
    const { data: videoRecord, error: dbError } = await supabase
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
        userId: user.id
      });
      
      return NextResponse.json(
        { error: 'Failed to save video generation record' },
        { status: 500 }
      );
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

function buildProfessionalPrompt(userPrompt: string): string {
  // Build a robust prompt that ensures professional, realistic video generation
  const baseInstructions = `
Create professional, realistic 5-second video with subtle motion. Preserve original image design, colors, textures, and composition exactly. Use gentle movements only: slow camera drift, soft lighting changes, natural object motion. For portraits: minimal eye/hair movement. For landscapes: gentle atmospheric effects. For products: smooth rotation/showcase. Avoid unrealistic physics, rapid motion, dramatic transformations, or quality-compromising effects. Professional cinematography with stable 24fps motion and consistent lighting.
  `.trim();

  const enhancedPrompt = `${baseInstructions}

User Request: ${userPrompt}

Generate a video that respects the original image while incorporating the user's vision in a professional, realistic manner.`;

  return enhancedPrompt;
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

    // Prepare the image input
    let promptImage: string;
    if (params.imageUrl) {
      promptImage = params.imageUrl;
    } else if (params.imageFile) {
      // Convert base64 to data URI if it's not already
      if (params.imageFile.startsWith('data:')) {
        promptImage = params.imageFile;
      } else {
        // Assume it's base64 encoded image, add data URI prefix
        promptImage = `data:image/jpeg;base64,${params.imageFile}`;
      }
    } else {
      throw new Error('No image provided');
    }

    // Prepare the request payload using official Runway API format
    const payload = {
      model: 'gen4_turbo',
      promptImage: promptImage,
      promptText: params.prompt,
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
      seed: payload.seed
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
        error: errorData
      });
      
      return {
        success: false,
        error: `Runway API error: ${response.status} ${response.statusText}`
      };
    }

    const result = await response.json();
    
    logger.info('[Runway API] Generation started', {
      taskId: result.id,
      status: result.status
    });

    return {
      success: true,
      taskId: result.id
    };

  } catch (error) {
    logger.error('[Runway API] Unexpected error', { error });
    
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

      if (error || !data) {
        return NextResponse.json(
          { error: 'Video record not found' },
          { status: 404 }
        );
      }
      
      videoRecord = data;
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
      return NextResponse.json(
        { error: 'Failed to check video status' },
        { status: 500 }
      );
    }

    const result = await response.json();
    
    // Update database if we have a video record
    if (videoRecord && result.status !== videoRecord.status) {
      const updateData: any = {
        status: result.status,
        updated_at: new Date().toISOString()
      };
      
      if (result.status === 'SUCCEEDED' && result.output?.length > 0) {
        updateData.video_url = result.output[0];
        updateData.completed_at = new Date().toISOString();
      } else if (result.status === 'FAILED') {
        updateData.error_message = result.failure_reason || 'Generation failed';
        updateData.completed_at = new Date().toISOString();
      }

      await supabase
        .from('generated_videos')
        .update(updateData)
        .eq('id', videoRecord.id);
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      videoUrl: result.output?.length > 0 ? result.output[0] : null,
      progress: result.progress || 0,
      errorMessage: result.failure_reason || null
    });

  } catch (error) {
    logger.error('[Video Status API] Unexpected error', { error });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 