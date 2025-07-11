import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/memory-framework/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import OpenAI, { toFile } from 'openai';

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

    // Parse form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const prompt = formData.get('prompt') as string;
    const model = formData.get('model') as string || 'gpt-image-1';
    const userId = formData.get('user') as string;

    logger.info('[Creation Hub Edit API] Request details', {
      requestId,
      userId: user.id,
      prompt: prompt?.substring(0, 100) + '...',
      model,
      hasImageFile: !!imageFile,
      imageSize: imageFile?.size || 0
    });

    // Validate inputs
    if (!imageFile || !prompt) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'Image file and prompt are required' } },
        { status: 400 }
      );
    }

    // Enhanced prompt validation
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return NextResponse.json(
        { error: { code: 'INVALID_PROMPT', message: 'Valid prompt is required (at least 3 characters)' } },
        { status: 400 }
      );
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: { code: 'PROMPT_TOO_LONG', message: 'Prompt must be 1000 characters or less' } },
        { status: 400 }
      );
    }

    // Clean the prompt to avoid potential issues
    const cleanedPrompt = prompt
      .replace(/[^\w\s\.,\-!?;:'"()]/g, '') // Remove special characters that might cause issues
      .trim();

    // Validate and process image
    if (imageFile.size > 4 * 1024 * 1024) { // 4MB limit
      return NextResponse.json(
        { error: { code: 'IMAGE_TOO_LARGE', message: 'Image must be smaller than 4MB' } },
        { status: 400 }
      );
    }

    // Additional validation for image type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      logger.warn('[Creation Hub Edit API] Invalid image type', { 
        requestId, 
        providedType: imageFile.type,
        allowedTypes 
      });
      return NextResponse.json(
        { error: { code: 'INVALID_IMAGE_TYPE', message: 'Image must be PNG, JPEG, or WebP format' } },
        { status: 400 }
      );
    }

    // Convert File to OpenAI format with proper filename and type
    const imageBuffer = await imageFile.arrayBuffer();
    const fileName = `edit-${requestId}.png`;
    
    // Ensure we create a proper File object
    const imageFileForOpenAI = await toFile(Buffer.from(imageBuffer), fileName, {
      type: 'image/png', // Force PNG for maximum compatibility
    });

    logger.info('[Creation Hub Edit API] Making edit request with gpt-image-1', { 
      requestId,
      model,
      originalImageType: imageFile.type,
      originalImageSize: imageFile.size,
      processedFileName: fileName,
      originalPromptLength: prompt.length,
      cleanedPromptLength: cleanedPrompt.length,
      promptPreview: cleanedPrompt.substring(0, 100),
      imageBufferSize: imageBuffer.byteLength
    });

    // Call OpenAI Image Edit API with gpt-image-1
    let response;
    try {
      response = await openai.images.edit({
        model: 'gpt-image-1',
        image: imageFileForOpenAI,
        prompt: cleanedPrompt,
        size: '1024x1024'
      });
    } catch (openaiError: any) {
      logger.error('[Creation Hub Edit API] OpenAI API error', { 
        requestId,
        error: openaiError.message,
        type: openaiError.type,
        code: openaiError.code,
        status: openaiError.status
      });

      // Handle specific OpenAI error types
      if (openaiError.type === 'image_generation_user_error') {
        return NextResponse.json(
          { error: { 
            code: 'IMAGE_EDIT_ERROR', 
            message: 'The image could not be edited. Please ensure the image is valid and the prompt is appropriate.' 
          }},
          { status: 400 }
        );
      }

      if (openaiError.status === 400) {
        return NextResponse.json(
          { error: { 
            code: 'INVALID_REQUEST', 
            message: 'Invalid image or prompt. Please check your inputs and try again.' 
          }},
          { status: 400 }
        );
      }

      // Re-throw other errors to be handled by outer catch
      throw openaiError;
    }

    logger.info('[Creation Hub Edit API] OpenAI response received', { 
      requestId,
      hasData: !!response.data,
      dataLength: response.data?.length || 0,
      responseStructure: response.data?.[0] ? Object.keys(response.data[0]) : 'no data'
    });

    if (!response.data || response.data.length === 0) {
      logger.error('[Creation Hub Edit API] No image generated in response', { requestId });
      return NextResponse.json(
        { error: { code: 'EDIT_FAILED', message: 'No edited image generated' } },
        { status: 500 }
      );
    }

    const imageData = response.data[0];
    logger.info('[Creation Hub Edit API] Image data structure', { 
      requestId,
      imageDataKeys: Object.keys(imageData),
      hasUrl: !!imageData.url,
      hasB64Json: !!imageData.b64_json,
      imageData: imageData
    });

    // Handle both URL and base64 response formats
    let editedImageUrl: string | undefined;
    let base64Image: string | undefined;

    if (imageData.url) {
      editedImageUrl = imageData.url;
    } else if (imageData.b64_json) {
      base64Image = imageData.b64_json;
    }

    const revisedPrompt = imageData.revised_prompt || prompt;
    
    if (!editedImageUrl && !base64Image) {
      logger.error('[Creation Hub Edit API] No image URL or base64 data in response', { 
        requestId,
        availableFields: Object.keys(imageData)
      });
      return NextResponse.json(
        { error: { code: 'EDIT_FAILED', message: 'No image data received from OpenAI' } },
        { status: 500 }
      );
    }

    // Handle image upload to our storage
    let finalImageUrl: string;
    try {
      let imageBuffer: ArrayBuffer;

      if (editedImageUrl) {
        // Download the edited image from OpenAI URL
        const editedImageResponse = await fetch(editedImageUrl);
        imageBuffer = await editedImageResponse.arrayBuffer();
      } else if (base64Image) {
        // Convert base64 to buffer
        imageBuffer = Buffer.from(base64Image, 'base64').buffer;
      } else {
        throw new Error('No image data available');
      }
      
      const filename = `${requestId}.png`;
      const path = `images/${user.id}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;

      // Upload to existing image bucket
      const imageBucket = process.env.MEDIA_IMAGE_BUCKET || 'images2';
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(imageBucket)
        .upload(path, Buffer.from(imageBuffer), {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(imageBucket)
        .getPublicUrl(path);

      finalImageUrl = publicUrl;
      logger.info('[Creation Hub Edit API] Image uploaded to storage', { requestId, path });

    } catch (uploadError) {
      logger.error('[Creation Hub Edit API] Failed to upload image', { requestId, uploadError });
      
      // Fallback options
      if (editedImageUrl) {
        finalImageUrl = editedImageUrl;
        logger.warn('[Creation Hub Edit API] Using OpenAI URL fallback', { requestId });
      } else if (base64Image) {
        finalImageUrl = `data:image/png;base64,${base64Image}`;
        logger.warn('[Creation Hub Edit API] Using base64 fallback', { requestId });
      } else {
        throw new Error('No fallback image data available');
      }
    }

    // Save to database
    try {
      const imageRecord = {
        id: requestId,
        user_id: user.id,
        prompt: prompt,
        enhanced_prompt: prompt,
        revised_prompt: revisedPrompt,
        image_url: finalImageUrl,
        quality: 'hd',
        size: '1024x1024',
        style: 'vivid',
        model: model,
        status: 'completed',
        conversation_id: null,
        parent_image_id: null,
        metadata: {
          requestId,
          generation_duration_ms: Date.now() - startTime,
          operation: 'edit',
          original_model: model
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertedData, error: dbError } = await supabase
        .from('generated_images')
        .insert(imageRecord)
        .select();

      if (dbError) {
        logger.error('[Creation Hub Edit API] Failed to save to database', { 
          requestId, 
          dbError 
        });
        // Continue without database save
      } else {
        logger.info('[Creation Hub Edit API] Image saved to database', { requestId, insertedData });
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
      imageUrl: finalImageUrl.substring(0, 100) + '...'
    });

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        id: requestId,
        imageUrl: finalImageUrl,
        prompt: prompt,
        revisedPrompt: revisedPrompt,
        metadata: {
          generatedAt: new Date().toISOString(),
          duration,
          model: model,
          operation: 'edit'
        }
      }
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error('[Creation Hub Edit API] Unexpected error during editing', {
      requestId,
      error: error.message,
      stack: error.stack,
      duration
    });

    // Handle specific error types
    if (error.message?.includes('safety system')) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'SAFETY_VIOLATION',
          message: 'The edit request was rejected by the safety system. Please try a different description.'
        }
      }, { status: 400 });
    }

    if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed'
        }
      }, { status: 401 });
    }

    if (error.message?.includes('429')) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many requests. Please wait a moment and try again.'
        }
      }, { status: 429 });
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'EDIT_FAILED',
        message: 'Failed to edit image'
      }
    }, { status: 500 });
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