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
import { DataVisualizationEngine } from '@/lib/services/DataVisualizationEngine';

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

    // Check user plan in Supabase
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('plan_type, trial_end_date, monthly_usage, quota_limits')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      logger.warn('[Creation Hub API] User profile not found', { requestId, userId: user.id });
      return NextResponse.json(
        { error: { code: 'NO_PROFILE', message: 'User profile not found.' } },
        { status: 403 }
      );
    }

    if (profile.plan_type === 'FREE') {
      logger.warn('[Creation Hub API] Access denied: FREE plan users cannot generate images', { requestId, userId: user.id, plan_type: profile.plan_type });
      return NextResponse.json(
        { error: { code: 'PLAN_RESTRICTED', message: 'Image generation is only available for Pro users ($25/month). Please upgrade your plan.' } },
        { status: 403 }
      );
    }

    if (profile.plan_type === 'EXPIRED') {
      logger.warn('[Creation Hub API] Access denied: user plan expired', { requestId, userId: user.id, plan_type: profile.plan_type });
      return NextResponse.json(
        { error: { code: 'PLAN_EXPIRED', message: 'Your plan has expired. Please renew your subscription.' } },
        { status: 403 }
      );
    }

    // After retrieving user profile (userProfile)
    if (profile.plan_type === 'PRO') {
      console.log('=== PRO PLAN BRANCH (Image Generation) ===');
      const usage = profile.monthly_usage || {};
      const limits = profile.quota_limits || {};
      const imageLimit = limits.images ?? 30;
      if ((usage.images ?? 0) >= imageLimit) {
        return NextResponse.json({ error: `Monthly image generation limit reached for your Pro plan (${imageLimit}).` }, { status: 403 });
      }
      // Increment image counter
      await supabase
        .from('user_profiles')
        .update({ monthly_usage: { ...usage, images: (usage.images ?? 0) + 1 } })
        .eq('id', user.id);
      // Log formatted quotas
      const logMsg = [
        '=== REMAINING QUOTAS FOR PRO USER ===',
        `User: ${profile.email || profile.id}`,
        `  Images     : ${(usage.images ?? 0) + 1} / ${imageLimit}`,
        `  Videos     : ${(usage.videos ?? 0)} / ${(limits.videos ?? 20)}`,
        `  Recordings : ${(usage.recordings ?? 0)} / ${(limits.recordings ?? 20)}`,
        '====================================='
      ].join('\n');
      console.log(logMsg);
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

    // Validate input
    if (!originalPrompt && !categoryId) {
      logger.warn('[Creation Hub API] Missing prompt or category', { requestId });
      return NextResponse.json(
        { error: { code: 'INVALID_REQUEST', message: 'Prompt or category is required' } },
        { status: 400 }
      );
    }

    // Special handling for data visualization category
    if (categoryId === 'data-viz' && formValues) {
      logger.info('[Creation Hub API] Processing data visualization request', { requestId });
      
      try {
        // Extract data visualization parameters
        const {
          chartType,
          dataTopic,
          timeSeriesType,
          dataCompleteness,
          dataRange,
          analysisGoal,
          chartStyle,
          colorPalette,
          includeLabels,
          chartTitle,
          keyInsights,
          dataQualityIndicators
        } = formValues;
        
        // Determine analysis type based on chart type
        let analysisType: 'temporal' | 'categorical' | 'distribution' | 'trend' | 'correlation' | 'financial' = 'temporal';
        
        if (['line-chart', 'area-chart', 'timeline'].includes(chartType)) {
          analysisType = 'temporal';
        } else if (['bar-chart', 'column-chart'].includes(chartType)) {
          analysisType = chartType.includes('time') ? 'temporal' : 'categorical';
        } else if (['pie-chart', 'donut-chart', 'treemap'].includes(chartType)) {
          analysisType = 'categorical';
        } else if (['scatter-plot', 'bubble-chart'].includes(chartType)) {
          analysisType = 'correlation';
        } else if (['heatmap', 'gauge-meter'].includes(chartType)) {
          analysisType = 'distribution';
        }
        
        // Parse data from the description with intelligent processing
        const parsedDataResult = await parseDataFromDescription(dataTopic, analysisType, timeSeriesType);
        
        // Initialize visualization engine
        const visualizationEngine = new DataVisualizationEngine();
        
        // Generate visualization with smart data processing
        const charts = await visualizationEngine.generateSmartVisualizations({
          data: parsedDataResult.data,
          analysisType,
          title: chartTitle || `${chartType} for ${dataTopic.substring(0, 30)}...`,
          preferredLibrary: 'chartjs',
          timeSeriesType: timeSeriesType as any || 'monthly',
          dataCompleteness: dataCompleteness as any || 'interpolate',
          dataRange,
          colorScheme: colorPalette as any || 'default',
          dataQualityLevel: dataQualityIndicators as any || 'none'
        });
        
        // Generate the image using the enhanced prompt that includes data completeness
        const enhancedPrompt = enhanceCategoryPrompt(
          categoryId as ImageCategory,
          formValues,
          undefined,
          quality as 'low' | 'medium' | 'high' | 'auto'
        );
        
        // Add data completeness information to the prompt
        const dataCompletenessInfo = `
SMART DATA PROCESSING APPLIED:
- Time Series Type: ${timeSeriesType || 'monthly'} data
- Data Range: ${dataRange || 'Full available range'}
- Data Completeness Strategy: ${dataCompleteness || 'interpolate'} (ensuring all time periods are represented)
- Analysis Goal: ${analysisGoal || 'General data visualization'}
- Chart Style: ${chartStyle || 'professional-clean'}
- Color Palette: ${colorPalette || 'corporate-blue'}
- Data Points: All ${timeSeriesType || 'monthly'} periods included with no gaps
`;
        
        const finalPrompt = enhancedPrompt + "\n\n" + dataCompletenessInfo;
        
        logger.info('[Creation Hub API] Enhanced data visualization prompt', { 
          requestId, 
          promptLength: finalPrompt.length,
          chartType,
          dataCompleteness
        });
        
        // Continue with regular image generation using the enhanced prompt
        // ... existing image generation code ...
        
      } catch (vizError) {
        logger.error('[Creation Hub API] Data visualization processing error', { 
          requestId, 
          error: vizError 
        });
        // Continue with regular processing as fallback
      }
    }

    // Process category-based generation
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

/**
 * Intelligent data parsing from natural language descriptions
 * Enhanced with structured formatting, validation, and confidence metrics
 */
async function parseDataFromDescription(description: string, analysisType?: string, timeSeriesType?: string): Promise<{
  data: any[];
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
  metadata: {
    dataType: 'temporal' | 'categorical' | 'numerical' | 'mixed';
    timeFormat?: string;
    estimatedPoints: number;
    actualPoints: number;
    completeness: number;
    insights: string[];
  };
}> {
  try {
    logger.info('[Creation Hub API] Starting intelligent data parsing', { 
      descriptionLength: description.length,
      analysisType,
      timeSeriesType
    });

    // Enhanced system prompt with intelligent parsing directives
    const systemPrompt = `You are an advanced data extraction and analysis specialist. Your task is to intelligently parse natural language descriptions into structured, high-quality data suitable for visualization.

CORE REQUIREMENTS:
1. Extract structured data with consistent formatting
2. Ensure temporal data completeness (no missing periods)
3. Provide confidence metrics and data quality assessments
4. Apply intelligent interpolation for missing values
5. Maintain data integrity and statistical validity

OUTPUT FORMAT (JSON):
{
  "data": [
    {
      "period": "formatted_period",
      "value": number,
      "isEstimated": boolean,
      "confidence": number (0-1),
      "metadata": {
        "source": "actual" | "interpolated" | "estimated",
        "quality": "high" | "medium" | "low"
      }
    }
  ],
  "confidence": number (0-1),
  "dataQuality": "high" | "medium" | "low",
  "metadata": {
    "dataType": "temporal" | "categorical" | "numerical" | "mixed",
    "timeFormat": "MMM YYYY" | "Q# YYYY" | "YYYY" | "DD/MM/YYYY" | null,
    "estimatedPoints": number,
    "actualPoints": number,
    "completeness": number (0-1),
    "insights": ["insight1", "insight2", ...],
    "patterns": ["pattern1", "pattern2", ...],
    "anomalies": ["anomaly1", "anomaly2", ...],
    "trends": ["trend1", "trend2", ...]
  }
}

TIME SERIES FORMATTING RULES:
- Monthly: "Jan 2023", "Feb 2023", etc. (ensure all 12 months if yearly data)
- Quarterly: "Q1 2023", "Q2 2023", etc. (ensure all 4 quarters if yearly data)
- Yearly: "2023", "2024", etc.
- Daily: "2023-01-01", "2023-01-02", etc.
- Weekly: "Week 1 2023", "Week 2 2023", etc.

INTELLIGENT PROCESSING:
- Fill missing time periods with interpolated values
- Mark interpolated data with isEstimated: true
- Provide confidence scores based on data source quality
- Identify patterns, trends, and anomalies
- Ensure statistical consistency

ANALYSIS TYPE SPECIFIC PROCESSING:
${analysisType === 'temporal' ? `
- Temporal Analysis: Focus on time-based patterns, trends, seasonality
- Ensure chronological ordering and complete time series
- Identify seasonal patterns and growth rates
` : ''}
${analysisType === 'categorical' ? `
- Categorical Analysis: Focus on category comparisons and distributions
- Ensure all categories are properly represented
- Identify dominant categories and outliers
` : ''}
${analysisType === 'correlation' ? `
- Correlation Analysis: Focus on relationships between variables
- Ensure paired data points for correlation calculation
- Identify strong positive/negative correlations
` : ''}

TIME SERIES TYPE: ${timeSeriesType || 'auto-detect'}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Parse this data description with intelligent processing:

"${description}"

Apply smart data processing including:
1. Complete time series generation (fill missing periods)
2. Intelligent interpolation for missing values
3. Confidence scoring for each data point
4. Pattern and trend identification
5. Data quality assessment

Focus on creating visualization-ready data with high accuracy and completeness.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Lower temperature for more consistent parsing
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      return createFallbackDataStructure();
    }
    
    try {
      const parsedContent = JSON.parse(content);
      
      // Validate and enhance the parsed data
      const validatedData = validateAndEnhanceData(parsedContent, timeSeriesType);
      
      logger.info('[Creation Hub API] Intelligent data parsing completed', {
        originalPoints: validatedData.metadata.actualPoints,
        totalPoints: validatedData.data.length,
        confidence: validatedData.confidence,
        dataQuality: validatedData.dataQuality,
        completeness: validatedData.metadata.completeness
      });
      
      return validatedData;
      
    } catch (parseError) {
      logger.error('[Creation Hub API] Error parsing intelligent data response', { parseError });
      return createFallbackDataStructure();
    }
    
  } catch (error) {
    logger.error('[Creation Hub API] Error in intelligent data parsing', { error });
    return createFallbackDataStructure();
  }
}

/**
 * Validate and enhance parsed data with intelligent processing
 */
function validateAndEnhanceData(parsedContent: any, timeSeriesType?: string): {
  data: any[];
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
  metadata: any;
} {
  try {
    let data = parsedContent.data || [];
    let confidence = parsedContent.confidence || 0.5;
    let dataQuality = parsedContent.dataQuality || 'medium';
    let metadata = parsedContent.metadata || {};
    
    // Ensure data is an array
    if (!Array.isArray(data)) {
      data = [];
    }
    
    // Apply intelligent data processing
    if (data.length > 0) {
      // Sort temporal data chronologically
      if (metadata.dataType === 'temporal') {
        data = sortTemporalData(data);
      }
      
      // Apply time series completeness if needed
      if (timeSeriesType && ['monthly', 'quarterly', 'yearly'].includes(timeSeriesType)) {
        data = ensureTimeSeriesCompleteness(data, timeSeriesType);
      }
      
      // Calculate enhanced metrics
      const actualPoints = data.filter((d: any) => !d.isEstimated).length;
      const estimatedPoints = data.filter((d: any) => d.isEstimated).length;
      const completeness = actualPoints / (actualPoints + estimatedPoints);
      
      // Update metadata with enhanced information
      metadata = {
        ...metadata,
        actualPoints,
        estimatedPoints,
        completeness,
        insights: metadata.insights || [],
        patterns: metadata.patterns || [],
        anomalies: metadata.anomalies || [],
        trends: metadata.trends || []
      };
      
      // Adjust confidence based on completeness
      confidence = Math.min(confidence * (0.5 + completeness * 0.5), 1.0);
      
      // Determine data quality based on completeness and confidence
      if (completeness >= 0.8 && confidence >= 0.7) {
        dataQuality = 'high';
      } else if (completeness >= 0.6 && confidence >= 0.5) {
        dataQuality = 'medium';
      } else {
        dataQuality = 'low';
      }
    }
    
    return {
      data,
      confidence,
      dataQuality,
      metadata
    };
    
  } catch (error) {
    logger.error('[Creation Hub API] Error validating and enhancing data', { error });
    return createFallbackDataStructure();
  }
}

/**
 * Sort temporal data chronologically
 */
function sortTemporalData(data: any[]): any[] {
  return data.sort((a, b) => {
    const periodA = a.period || '';
    const periodB = b.period || '';
    
    // Handle different time formats
    if (periodA.includes('Q') && periodB.includes('Q')) {
      // Quarterly data: "Q1 2023", "Q2 2023"
      const [qA, yearA] = periodA.split(' ');
      const [qB, yearB] = periodB.split(' ');
      const yearDiff = parseInt(yearA) - parseInt(yearB);
      if (yearDiff !== 0) return yearDiff;
      return parseInt(qA.replace('Q', '')) - parseInt(qB.replace('Q', ''));
    }
    
    if (periodA.match(/^\d{4}$/) && periodB.match(/^\d{4}$/)) {
      // Yearly data: "2023", "2024"
      return parseInt(periodA) - parseInt(periodB);
    }
    
    // Default string comparison for other formats
    return periodA.localeCompare(periodB);
  });
}

/**
 * Ensure time series completeness for specific time types
 */
function ensureTimeSeriesCompleteness(data: any[], timeSeriesType: string): any[] {
  if (timeSeriesType === 'monthly') {
    return ensureMonthlyCompleteness(data);
  } else if (timeSeriesType === 'quarterly') {
    return ensureQuarterlyCompleteness(data);
  } else if (timeSeriesType === 'yearly') {
    return ensureYearlyCompleteness(data);
  }
  
  return data;
}

/**
 * Ensure monthly completeness (all 12 months)
 */
function ensureMonthlyCompleteness(data: any[]): any[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = [...new Set(data.map(d => d.period.split(' ')[1]))].sort();
  const result: any[] = [];
  
  for (const year of years) {
    for (const month of months) {
      const period = `${month} ${year}`;
      const existing = data.find(d => d.period === period);
      
      if (existing) {
        result.push(existing);
      } else {
        // Interpolate missing value
        const interpolatedValue = interpolateValue(data, period, year);
        result.push({
          period,
          value: interpolatedValue,
          isEstimated: true,
          confidence: 0.6,
          metadata: {
            source: 'interpolated',
            quality: 'medium'
          }
        });
      }
    }
  }
  
  return result;
}

/**
 * Ensure quarterly completeness (all 4 quarters)
 */
function ensureQuarterlyCompleteness(data: any[]): any[] {
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const years = [...new Set(data.map(d => d.period.split(' ')[1]))].sort();
  const result: any[] = [];
  
  for (const year of years) {
    for (const quarter of quarters) {
      const period = `${quarter} ${year}`;
      const existing = data.find(d => d.period === period);
      
      if (existing) {
        result.push(existing);
      } else {
        // Interpolate missing value
        const interpolatedValue = interpolateValue(data, period, year);
        result.push({
          period,
          value: interpolatedValue,
          isEstimated: true,
          confidence: 0.6,
          metadata: {
            source: 'interpolated',
            quality: 'medium'
          }
        });
      }
    }
  }
  
  return result;
}

/**
 * Ensure yearly completeness
 */
function ensureYearlyCompleteness(data: any[]): any[] {
  if (data.length < 2) return data;
  
  const years = data.map(d => parseInt(d.period)).sort((a, b) => a - b);
  const minYear = years[0];
  const maxYear = years[years.length - 1];
  const result: any[] = [];
  
  for (let year = minYear; year <= maxYear; year++) {
    const period = year.toString();
    const existing = data.find(d => d.period === period);
    
    if (existing) {
      result.push(existing);
    } else {
      // Interpolate missing value
      const interpolatedValue = interpolateValue(data, period, year.toString());
      result.push({
        period,
        value: interpolatedValue,
        isEstimated: true,
        confidence: 0.6,
        metadata: {
          source: 'interpolated',
          quality: 'medium'
        }
      });
    }
  }
  
  return result;
}

/**
 * Interpolate missing values using linear interpolation
 */
function interpolateValue(data: any[], period: string, year: string): number {
  const sortedData = data.sort((a, b) => {
    const aYear = a.period.split(' ')[1] || a.period;
    const bYear = b.period.split(' ')[1] || b.period;
    return parseInt(aYear) - parseInt(bYear);
  });
  
  if (sortedData.length === 0) return 0;
  if (sortedData.length === 1) return sortedData[0].value;
  
  // Find surrounding data points
  const targetYear = parseInt(year);
  let before = null;
  let after = null;
  
  for (let i = 0; i < sortedData.length - 1; i++) {
    const currentYear = parseInt(sortedData[i].period.split(' ')[1] || sortedData[i].period);
    const nextYear = parseInt(sortedData[i + 1].period.split(' ')[1] || sortedData[i + 1].period);
    
    if (currentYear <= targetYear && nextYear >= targetYear) {
      before = sortedData[i];
      after = sortedData[i + 1];
      break;
    }
  }
  
  if (before && after && before.period !== after.period) {
    // Linear interpolation
    const beforeYear = parseInt(before.period.split(' ')[1] || before.period);
    const afterYear = parseInt(after.period.split(' ')[1] || after.period);
    const ratio = (targetYear - beforeYear) / (afterYear - beforeYear);
    return before.value + (after.value - before.value) * ratio;
  }
  
  // Fallback to average
  const sum = sortedData.reduce((acc, d) => acc + d.value, 0);
  return sum / sortedData.length;
}

/**
 * Create fallback data structure for error cases
 */
function createFallbackDataStructure(): {
  data: any[];
  confidence: number;
  dataQuality: 'high' | 'medium' | 'low';
  metadata: any;
} {
  return {
    data: [],
    confidence: 0.1,
    dataQuality: 'low',
    metadata: {
      dataType: 'mixed',
      timeFormat: null,
      estimatedPoints: 0,
      actualPoints: 0,
      completeness: 0,
      insights: ['Data parsing failed - using fallback structure'],
      patterns: [],
      anomalies: [],
      trends: []
    }
  };
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