import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/memory-framework/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { enhancePrompt, enhanceMultiTurnPrompt, validatePrompt } from '@/components/creation-hub/hub-prompts';
import type { PromptEnhancementOptions } from '@/components/creation-hub/hub-prompts';
import { 
  enhanceCategoryPrompt, 
  getAspectRatioForCategory
} from '@/components/creation-hub/category-prompts';
import { 
  AIParameterOptimizer,
  type OptimalImageParameters,
  type ImageGenerationContext
} from '@/components/creation-hub/ai-parameter-optimizer';
import { 
  analyzeBatchImages, 
  combineVisionAnalyses,
  enhancePromptWithVision,
  CATEGORY_VISION_CONFIGS,
  initializeVisionAnalyzer
} from '@/components/creation-hub/vision-analyzer';
import type { 
  ImageCategory, 
  CategoryFormValues, 
  CategoryImageGenerationRequest 
} from '@/components/creation-hub/hub-types';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize vision analyzer
if (process.env.OPENAI_API_KEY) {
  initializeVisionAnalyzer(process.env.OPENAI_API_KEY);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info('[Creation Hub API] Starting image generation with GPT Image 1', { requestId });

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('[Creation Hub API] Unauthorized access attempt', { requestId });
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: 'Unauthorized' } }, 
        { status: 401 }
      );
    }

    // Parse request body - updated for GPT Image 1 parameters
    const body = await request.json();
    const {
      prompt: originalPrompt,
      quality = 'auto',
      size = 'auto',
      format = 'auto',
      background = 'auto',
      compression,
      streaming = false,
      conversationId,
      previousImageId,
      instructions,
      enhancementOptions = {},
      // Category-based fields
      categoryId,
      formValues,
      referenceImages = []
    } = body as CategoryImageGenerationRequest & {
      prompt: string;
      quality?: 'low' | 'medium' | 'high' | 'auto';
      size?: '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
      format?: 'png' | 'jpeg' | 'webp';
      background?: 'transparent' | 'opaque' | 'auto';
      compression?: number;
      streaming?: boolean;
      conversationId?: string;
      previousImageId?: string;
      instructions?: string;
      enhancementOptions?: PromptEnhancementOptions;
    };

    logger.info('[Creation Hub API] Request details for GPT Image 1', {
      requestId,
      userId: user.id,
      prompt: originalPrompt?.substring(0, 100) + '...',
      quality,
      size,
      format,
      background,
      compression,
      streaming,
      conversationId,
      previousImageId
    });

    // Validate prompt
    if (!originalPrompt || typeof originalPrompt !== 'string') {
      return NextResponse.json(
        { error: { code: 'INVALID_PROMPT', message: 'Prompt is required and must be a string' } },
        { status: 400 }
      );
    }

    const validation = validatePrompt(originalPrompt);
    if (!validation.isValid) {
      logger.warn('[Creation Hub API] Invalid prompt', { requestId, errors: validation.errors });
      return NextResponse.json(
        { 
          error: { 
            code: 'INVALID_PROMPT', 
            message: 'Invalid prompt', 
            details: validation.errors 
          } 
        },
        { status: 400 }
      );
    }

    // Handle multi-turn conversation context
    let enhancedPrompt = originalPrompt;
    let previousPrompts: string[] = [];

    if (conversationId) {
      try {
        // Get conversation history from database
        const { data: conversationData, error: conversationError } = await supabase
          .from('image_conversations')
          .select(`
            id,
            generated_images (
              prompt,
              created_at
            )
          `)
          .eq('id', conversationId)
          .eq('user_id', user.id)
          .single();

        if (conversationError) {
          logger.warn('[Creation Hub API] Conversation not found', { requestId, conversationId });
        } else if (conversationData?.generated_images) {
          previousPrompts = conversationData.generated_images
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((img: any) => img.prompt);
          
          enhancedPrompt = enhanceMultiTurnPrompt(originalPrompt, previousPrompts, instructions);
          logger.info('[Creation Hub API] Multi-turn context applied', { 
            requestId, 
            previousPromptsCount: previousPrompts.length 
          });
        }
      } catch (error) {
        logger.warn('[Creation Hub API] Failed to fetch conversation context', { requestId, error });
        // Continue without context
      }
    }

    // Handle category-based prompt enhancement
    let visionDescription = '';
    if (categoryId && formValues) {
      logger.info('[Creation Hub API] Processing category-based generation', { 
        requestId, 
        categoryId,
        hasReferenceImages: referenceImages.length > 0
      });

      // Process reference images if provided
      if (referenceImages.length > 0) {
        try {
          const visionConfig = CATEGORY_VISION_CONFIGS[categoryId] || {};
          
          // Convert base64 images back to File objects for vision analysis
          const imageFiles: File[] = [];
          for (let i = 0; i < referenceImages.length; i++) {
            const base64Data = referenceImages[i];
            if (typeof base64Data === 'string') {
              try {
                const response = await fetch(base64Data);
                const blob = await response.blob();
                const file = new File([blob], `reference-${i}.jpg`, { type: 'image/jpeg' });
                imageFiles.push(file);
              } catch (error) {
                logger.warn('[Creation Hub API] Failed to convert reference image', { requestId, index: i });
              }
            }
          }

          const visionAnalyses = await analyzeBatchImages(imageFiles, visionConfig);
          const combinedVision = combineVisionAnalyses(visionAnalyses);
          
          if (combinedVision.description) {
            visionDescription = `${combinedVision.description}. Color palette: ${combinedVision.colorPalette.join(', ')}. Style notes: ${combinedVision.styleNotes.join(', ')}.`;
            logger.info('[Creation Hub API] Vision analysis completed', { 
              requestId, 
              elementsCount: combinedVision.keyElements.length 
            });
          }
        } catch (visionError) {
          logger.warn('[Creation Hub API] Vision analysis failed', { requestId, visionError });
          visionDescription = 'Reference images provided for visual inspiration';
        }
      }

      // Generate category-specific enhanced prompt
      enhancedPrompt = enhanceCategoryPrompt(
        categoryId as ImageCategory,
        formValues as CategoryFormValues,
        visionDescription,
        'high' // Default to high quality for GPT Image 1
      );

      // Override size based on category if not explicitly set
      if (size === '1024x1024') {
        const categorySize = getAspectRatioForCategory(categoryId as ImageCategory, formValues as CategoryFormValues);
        if (categorySize !== '1024x1024') {
          logger.info('[Creation Hub API] Using category-optimized size', { 
            requestId, 
            originalSize: size,
            categorySize 
          });
          // Update the imageRequest size later
        }
      }

      logger.info('[Creation Hub API] Category prompt enhanced', { 
        requestId,
        originalLength: originalPrompt.length,
        enhancedLength: enhancedPrompt.length 
      });
    } else {
      // Apply traditional prompt enhancement
      if (Object.keys(enhancementOptions).length > 0) {
        enhancedPrompt = enhancePrompt(enhancedPrompt, enhancementOptions as PromptEnhancementOptions);
        logger.info('[Creation Hub API] Traditional prompt enhanced', { requestId });
      }
    }

    // AI-driven parameter optimization
    let optimalParams: OptimalImageParameters;
    let finalFormat = 'png';
    let finalBackground = 'opaque';
    let finalCompression: number | undefined;
    let finalModeration = 'auto';
    
    if (categoryId && formValues) {
      // Analyze context and optimize parameters using AI
      const context: ImageGenerationContext = AIParameterOptimizer.analyzeContext(
        categoryId as ImageCategory,
        formValues as CategoryFormValues,
        enhancedPrompt
      );
      
      optimalParams = await AIParameterOptimizer.optimizeParameters(context);
      
      // Use optimized parameters
      finalFormat = optimalParams.format;
      finalBackground = optimalParams.background;
      finalCompression = optimalParams.compression;
      finalModeration = optimalParams.moderation || 'auto';
      
      logger.info('[Creation Hub API] AI-optimized parameters', { 
        requestId,
        size: optimalParams.size,
        quality: optimalParams.quality,
        format: optimalParams.format,
        background: optimalParams.background,
        compression: optimalParams.compression,
        reasoning: optimalParams.reasoning
      });
    } else {
      // Fallback to basic optimization for non-category requests
      optimalParams = {
        size: size as any || '1024x1024',
        quality: quality as any || 'high',
        format: 'png',
        background: 'opaque',
        moderation: 'auto',
        reasoning: 'Default parameters for general image generation'
      };
    }

    // Map AI-optimized parameters to GPT Image 1 format
    const gptQuality = optimalParams.quality === 'high' ? 'high' : 
                      optimalParams.quality === 'medium' ? 'medium' : 
                      optimalParams.quality === 'low' ? 'low' : 'high';
    const gptSize = optimalParams.size === 'auto' ? '1024x1024' : optimalParams.size;
    const gptFormat = optimalParams.format; // This is already resolved to a concrete format by the optimizer
    const gptBackground = optimalParams.background;
    const gptCompression = optimalParams.compression;

    const imageRequest: any = {
      model: 'gpt-image-1',
      prompt: enhancedPrompt,
      quality: gptQuality,
      size: gptSize,
      user: user.id
    };

    // Add output format (GPT Image 1 supports output_format)
    if (gptFormat) {
      imageRequest.output_format = gptFormat;
    }

    // Add background if specified (only for PNG/WebP with transparent support)
    if (gptBackground && gptBackground !== 'auto' && (gptFormat === 'png' || gptFormat === 'webp')) {
      imageRequest.background = gptBackground;
    }

    // Add compression for JPEG/WebP formats
    if ((gptFormat === 'jpeg' || gptFormat === 'webp') && gptCompression !== undefined) {
      imageRequest.output_compression = gptCompression;
    }

    logger.info('[Creation Hub API] Calling GPT Image 1 with AI-optimized parameters', { 
      requestId,
      model: imageRequest.model,
      size: imageRequest.size,
      quality: imageRequest.quality,
      aiOptimizedParams: optimalParams,
      reasoning: optimalParams.reasoning,
      enhancedPrompt: enhancedPrompt.substring(0, 200) + '...'
    });

    // Call OpenAI Image API (GPT Image 1)
    // Using any type as the OpenAI SDK may not have updated TypeScript definitions for GPT Image 1 yet
    let response;
    try {
      response = await (openai.images.generate as any)(imageRequest);
    } catch (error: any) {
      // Handle organization verification error for GPT Image 1
      if (error?.status === 403 && error?.message?.includes('organization must be verified')) {
        logger.warn('[Creation Hub API] Organization not verified for GPT Image 1, falling back to DALL-E 3', { 
          requestId,
          error: error.message 
        });
        
        // Fallback to DALL-E 3 with compatible parameters
        const dalleRequest = {
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          quality: (gptQuality === 'high' ? 'hd' : 'standard') as 'standard' | 'hd',
          size: gptSize as '1024x1024' | '1024x1792' | '1792x1024',
          style: 'vivid' as 'vivid' | 'natural',
          response_format: 'b64_json' as const,
          user: user.id
        };
        
        // DALL-E 3 size compatibility
        if (gptSize === '1024x1536') {
          dalleRequest.size = '1024x1792';
        } else if (gptSize === '1536x1024') {
          dalleRequest.size = '1792x1024';
        } else {
          dalleRequest.size = '1024x1024';
        }
        
        logger.info('[Creation Hub API] Calling DALL-E 3 fallback', { 
          requestId,
          model: dalleRequest.model,
          size: dalleRequest.size,
          quality: dalleRequest.quality 
        });
        
        response = await openai.images.generate(dalleRequest);
        imageRequest.model = 'dall-e-3'; // Update for database record
      } else {
        throw error; // Re-throw other errors
      }
    }

    if (!response.data || response.data.length === 0) {
      logger.error('[Creation Hub API] No image generated in response', { requestId });
      return NextResponse.json(
        { error: { code: 'GENERATION_FAILED', message: 'No image generated' } },
        { status: 500 }
      );
    }

    const imageData = response.data[0];
    const base64Image = imageData.b64_json;
    const revisedPrompt = imageData.revised_prompt || enhancedPrompt;
    
    if (!base64Image) {
      logger.error('[Creation Hub API] No image data in response', { requestId });
      return NextResponse.json(
        { error: { code: 'GENERATION_FAILED', message: 'No image data received' } },
        { status: 500 }
      );
    }

    // Upload image to Supabase Storage
    let imageUrl: string;
    try {
      const imageBuffer = Buffer.from(base64Image, 'base64');
      const filename = `${requestId}.${gptFormat}`;
      const path = `images/${user.id}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${filename}`;

      // Upload to existing image bucket (using environment variable)
      const imageBucket = process.env.MEDIA_IMAGE_BUCKET || 'images2';
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(imageBucket)
        .upload(path, imageBuffer, {
          contentType: `image/${gptFormat}`,
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(imageBucket)
        .getPublicUrl(path);

      imageUrl = publicUrl;
      logger.info('[Creation Hub API] Image uploaded to storage', { requestId, path });

    } catch (uploadError) {
      logger.error('[Creation Hub API] Failed to upload image', { requestId, uploadError });
      
      // Fallback to returning base64 data
      imageUrl = `data:image/${gptFormat};base64,${base64Image}`;
      logger.warn('[Creation Hub API] Using base64 fallback', { requestId });
    }

    // Save to database
    try {
      // Map GPT Image 1 quality to database schema (standard/hd)
      const dbQuality = optimalParams.quality === 'high' ? 'hd' : 'standard';
      
      const imageRecord = {
        id: requestId,
        user_id: user.id,
        prompt: originalPrompt,
        enhanced_prompt: enhancedPrompt,
        revised_prompt: revisedPrompt,
        image_url: imageUrl,
        quality: dbQuality, // Map to schema-compatible values
        size: optimalParams.size === 'auto' ? '1024x1024' : optimalParams.size,
        style: 'vivid', // Default style (schema requires this field)
        model: imageRequest.model, // Use the actual model that was called (gpt-image-1 or dall-e-3)
        status: 'completed',
        conversation_id: conversationId || null,
        parent_image_id: previousImageId || null,
        metadata: {
          requestId,
          enhancement_options: enhancementOptions,
          previous_prompts_count: previousPrompts.length,
          generation_duration_ms: Date.now() - startTime,
          usage: {}, // Image API doesn't return usage data
          // GPT Image 1 specific parameters (stored in metadata since they don't have schema fields)
          gpt_image_1_params: {
            format: optimalParams.format,
            background: optimalParams.background,
            compression: optimalParams.compression,
            parameter_reasoning: optimalParams.reasoning,
            original_quality: optimalParams.quality // Store original before mapping
          },
          // Category-specific metadata
          category_id: categoryId || null,
          form_values: formValues || null,
          has_reference_images: referenceImages.length > 0,
          vision_description: visionDescription || null,
          category_enhanced: !!(categoryId && formValues)
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertedData, error: dbError } = await supabase
        .from('generated_images')
        .insert(imageRecord)
        .select();

      if (dbError) {
        logger.error('[Creation Hub API] Failed to save to database', { 
          requestId, 
          dbError: {
            message: dbError.message,
            details: dbError.details,
            hint: dbError.hint,
            code: dbError.code
          },
          imageRecord: {
            id: imageRecord.id,
            user_id: imageRecord.user_id,
            quality: imageRecord.quality,
            size: imageRecord.size,
            style: imageRecord.style,
            model: imageRecord.model
          }
        });
        // Continue without database save
      } else {
        logger.info('[Creation Hub API] Image saved to database', { requestId, insertedData });
      }

      // Update conversation if applicable
      if (conversationId) {
        await updateConversationLastActivity(supabase, conversationId, user.id);
      }

    } catch (dbError) {
      logger.error('[Creation Hub API] Database operation failed', { requestId, dbError });
      // Continue without database operations
    }

    const duration = Date.now() - startTime;
    logger.info('[Creation Hub API] Image generation completed', { 
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
        prompt: originalPrompt,
        enhancedPrompt,
        revisedPrompt: revisedPrompt,
        metadata: {
          quality: optimalParams.quality,
          size: optimalParams.size === 'auto' ? '1024x1024' : optimalParams.size,
          format: optimalParams.format,
          background: optimalParams.background,
          compression: optimalParams.compression,
          parameterReasoning: optimalParams.reasoning,
          style: 'vivid', // GPT Image 1 doesn't have a direct 'style' parameter, but we can infer it from prompt
          model: 'gpt-image-1',
          generatedAt: new Date().toISOString(),
          duration,
          // Category information
          categoryId: categoryId || null,
          formValues: formValues || null,
          hasReferenceImages: referenceImages.length > 0,
          visionDescription: visionDescription || null,
          categoryEnhanced: !!(categoryId && formValues)
        },
        conversationId,
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
    
    logger.error('[Creation Hub API] Unexpected error during generation', {
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
              code: 'INVALID_PROMPT', 
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
          code: 'GENERATION_FAILED', 
          message: 'An unexpected error occurred during image generation',
          retryable: true 
        } 
      },
      { status: 500 }
    );
  }
}

// Helper function to update conversation activity
async function updateConversationLastActivity(
  supabase: any, 
  conversationId: string, 
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('image_conversations')
      .update({ 
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      logger.warn('[Creation Hub API] Failed to update conversation activity', { 
        conversationId, 
        error 
      });
    }
  } catch (error) {
    logger.warn('[Creation Hub API] Error updating conversation activity', { 
      conversationId, 
      error 
    });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy', 
    service: 'creation-hub-api',
    timestamp: new Date().toISOString() 
  });
} 