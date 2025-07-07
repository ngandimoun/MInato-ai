import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/memory-framework/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `edit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('[Creation Hub Edit API] Starting image editing with GPT Image 1', { requestId });

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('[Creation Hub Edit API] Unauthorized access attempt', { requestId });
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Unauthorized' } }, 
        { status: 401 }
      );
    }

    // Parse form data for image uploads
    const formData = await request.formData();
    const prompt = formData.get('prompt') as string;
    const images = formData.getAll('images') as File[];
    const mask = formData.get('mask') as File | null;
    const quality = (formData.get('quality') as string) || 'high';
    const size = (formData.get('size') as string) || '1024x1024';
    const format = (formData.get('format') as string) || 'png';
    const background = (formData.get('background') as string) || 'opaque';
    const compression = formData.get('compression') ? parseInt(formData.get('compression') as string) : undefined;

    logger.info('[Creation Hub Edit API] Request details for GPT Image 1 Edit', {
      requestId,
      userId: user.id,
      prompt: prompt?.substring(0, 100) + '...',
      imagesCount: images.length,
      hasMask: !!mask,
      quality,
      size,
      format,
      background,
      compression
    });

    // Validate inputs
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_PROMPT', message: 'Prompt is required and must be a string' } },
        { status: 400 }
      );
    }

    if (images.length === 0) {
      return NextResponse.json(
        { error: { code: 'NO_IMAGES', message: 'At least one image is required for editing' } },
        { status: 400 }
      );
    }

    if (images.length > 10) {
      return NextResponse.json(
        { error: { code: 'TOO_MANY_IMAGES', message: 'Maximum 10 images allowed for editing' } },
        { status: 400 }
      );
    }

    // Validate image files
    for (const image of images) {
      if (image.size > 20 * 1024 * 1024) { // 20MB limit for GPT Image 1
        return NextResponse.json(
          { error: { code: 'IMAGE_TOO_LARGE', message: 'Images must be less than 20MB' } },
          { status: 400 }
        );
      }
    }

    // Prepare image edit request
    const editRequest: any = {
      model: 'gpt-image-1',
      prompt: prompt,
      image: images, // GPT Image 1 supports multiple reference images
      quality: quality as 'low' | 'medium' | 'high',
      size: size as '1024x1024' | '1536x1024' | '1024x1536',
      output_format: format as 'png' | 'jpeg' | 'webp',
      background: background as 'transparent' | 'opaque',
      response_format: 'b64_json' as const,
      user: user.id
    };

    // Add mask if provided
    if (mask) {
      editRequest.mask = mask;
    }

    // Add compression for JPEG/WebP formats
    if ((format === 'jpeg' || format === 'webp') && compression !== undefined) {
      editRequest.output_compression = compression;
    }

    logger.info('[Creation Hub Edit API] Calling GPT Image 1 Edit API', { 
      requestId,
      model: editRequest.model,
      size: editRequest.size,
      quality: editRequest.quality,
      format: editRequest.output_format,
      background: editRequest.background,
      compression: editRequest.output_compression
    });

    // Call OpenAI Image Edit API (GPT Image 1)
    const response = await (openai.images.edit as any)(editRequest);

    if (!response.data || response.data.length === 0) {
      logger.error('[Creation Hub Edit API] No image generated in response', { requestId });
      return NextResponse.json(
        { error: { code: 'EDIT_FAILED', message: 'No edited image generated' } },
        { status: 500 }
      );
    }

    const imageData = response.data[0];
    const base64Image = imageData.b64_json;
    const revisedPrompt = imageData.revised_prompt || prompt;
    
    if (!base64Image) {
      logger.error('[Creation Hub Edit API] No image data in response', { requestId });
      return NextResponse.json(
        { error: { code: 'EDIT_FAILED', message: 'No image data received' } },
        { status: 500 }
      );
    }

    // Upload edited image to Supabase Storage
    let imageUrl: string;
    try {
      const imageBuffer = Buffer.from(base64Image, 'base64');
      const filename = `${requestId}.${format}`;
      const path = `edited-images/${user.id}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;

      const imageBucket = process.env.MEDIA_IMAGE_BUCKET || 'images2';
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(imageBucket)
        .upload(path, imageBuffer, {
          contentType: `image/${format}`,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(imageBucket)
        .getPublicUrl(path);

      imageUrl = publicUrl;
      logger.info('[Creation Hub Edit API] Edited image uploaded to storage', { requestId, path });

    } catch (uploadError) {
      logger.error('[Creation Hub Edit API] Failed to upload edited image', { requestId, uploadError });
      
      // Fallback to returning base64 data
      imageUrl = `data:image/${format};base64,${base64Image}`;
      logger.warn('[Creation Hub Edit API] Using base64 fallback', { requestId });
    }

    // Save edit record to database
    try {
      const editRecord = {
        id: requestId,
        user_id: user.id,
        prompt: prompt,
        revised_prompt: revisedPrompt,
        image_url: imageUrl,
        quality: quality,
        size: size,
        format: format,
        background: background,
        compression: compression,
        model: 'gpt-image-1',
        operation: 'edit',
        status: 'completed',
        images_count: images.length,
        has_mask: !!mask,
        metadata: {
          requestId,
          generation_duration_ms: Date.now() - startTime,
          images_count: images.length,
          has_mask: !!mask,
          operation_type: mask ? 'inpainting' : 'reference_editing'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('image_edits')
        .insert(editRecord);

      if (dbError) {
        logger.error('[Creation Hub Edit API] Failed to save edit to database', { requestId, dbError });
        // Continue without database save
      } else {
        logger.info('[Creation Hub Edit API] Edit saved to database', { requestId });
      }

    } catch (dbError) {
      logger.error('[Creation Hub Edit API] Database operation failed', { requestId, dbError });
      // Continue without database operations
    }

    const duration = Date.now() - startTime;
    logger.info('[Creation Hub Edit API] Image editing completed', { 
      requestId,
      duration,
      userId: user.id,
      imageUrl: imageUrl.substring(0, 100) + '...'
    });

    // Return successful response
    return NextResponse.json({
      success: true,
      data: {
        id: requestId,
        imageUrl,
        prompt: prompt,
        revisedPrompt: revisedPrompt,
        metadata: {
          quality: quality,
          size: size,
          format: format,
          background: background,
          compression: compression,
          model: 'gpt-image-1',
          operation: 'edit',
          generatedAt: new Date().toISOString(),
          duration,
          imagesCount: images.length,
          hasMask: !!mask
        },
        usage: {} // Image API doesn't return usage data
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString(),
        duration
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('[Creation Hub Edit API] Unexpected error during editing', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration
    });

    // Check for specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { 
            error: { 
              code: 'QUOTA_EXCEEDED', 
              message: 'Rate limit exceeded. Please try again later.',
              retryable: true 
            } 
          },
          { status: 429 }
        );
      }
      
      if (error.message.includes('content policy')) {
        return NextResponse.json(
          { 
            error: { 
              code: 'INVALID_CONTENT', 
              message: 'Content violates policy guidelines',
              retryable: false 
            } 
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: { 
          code: 'EDIT_FAILED', 
          message: 'An unexpected error occurred during image editing',
          retryable: true 
        } 
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy', 
    service: 'creation-hub-edit-api',
    timestamp: new Date().toISOString() 
  });
} 