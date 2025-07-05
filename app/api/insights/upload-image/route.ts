import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { logger } from '@/memory-framework/config';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('[ImageUpload] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categories = formData.get('categories') as string;
    const tags = formData.get('tags') as string;
    const batchTitle = formData.get('batchTitle') as string;
    const batchDescription = formData.get('batchDescription') as string;
    const batchIndex = formData.get('batchIndex') as string;
    const batchTotal = formData.get('batchTotal') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload PNG, JPEG, GIF, WebP, or BMP images.' 
      }, { status: 400 });
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 50MB.' 
      }, { status: 400 });
    }

    logger.info(`[ImageUpload] Processing image: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

    // Convert file to base64 for OpenAI Vision API
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64Image}`;

    // Upload file to Supabase Storage
    const fileName = `insights/${user.id}/${Date.now()}-${file.name}`;
    const bucketName = process.env.MEDIA_IMAGE_BUCKET || 'images2';
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      logger.error('[ImageUpload] Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload image to storage' 
      }, { status: 500 });
    }

    // Get public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    // Analyze image with OpenAI Vision API
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and extract all important data, text, and insights. Focus on:

1. **Text Content**: Extract all visible text, numbers, labels, and captions
2. **Data Analysis**: If there are charts, graphs, or tables, extract the data points and explain trends
3. **Visual Elements**: Describe diagrams, workflows, layouts, and their purposes
4. **Business Context**: Identify what type of document/content this is (e.g., financial report, process diagram, dashboard, etc.)
5. **Key Insights**: Highlight the most important findings and actionable information
6. **Data Relationships**: Identify connections, patterns, and correlations in the data

Please provide a comprehensive analysis that would be useful for business decision-making. Format the response as structured JSON with these sections:
- extracted_text: All text found in the image
- data_points: Numerical data and metrics
- chart_analysis: Analysis of any charts or graphs
- document_type: Classification of the image content
- key_insights: Most important findings
- actionable_recommendations: Specific business recommendations
- visual_description: Description of the layout and visual elements`
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const analysisText = visionResponse.choices[0]?.message?.content || '';
    
    // Try to parse as JSON, fallback to plain text
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysisText);
    } catch {
      parsedAnalysis = {
        extracted_text: analysisText,
        data_points: [],
        chart_analysis: '',
        document_type: 'image',
        key_insights: analysisText.slice(0, 500),
        actionable_recommendations: [],
        visual_description: 'AI analysis of uploaded image'
      };
    }

    // Generate additional insights using text analysis
    const insightsResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert business analyst. Given the extracted content from an image, provide deep insights and find patterns that can help with business decision-making.`
        },
        {
          role: "user",
          content: `Based on this image analysis: ${analysisText}

Please provide:
1. 3-5 key business insights
2. Potential opportunities or risks identified
3. Recommended next actions
4. How this data connects to common business metrics or KPIs
5. Questions that stakeholders should ask based on this data

Format as a clear, actionable summary for business users.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    const businessInsights = insightsResponse.choices[0]?.message?.content || '';

    // Save document record directly to database
    const documentId = crypto.randomUUID();
    const documentData = {
      id: documentId,
      user_id: user.id,
      title: title || file.name,
      description: description || null,
      original_filename: file.name,
      file_type: file.type,
      content_type: 'image',
      file_size: file.size,
      processing_status: 'completed',
      categories: categories ? categories.split(',').map(c => c.trim()) : [],
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      batch_context: batchTitle || batchDescription ? {
        batch_title: batchTitle || undefined,
        batch_description: batchDescription || undefined,
        batch_index: batchIndex ? parseInt(batchIndex) : undefined,
        batch_total: batchTotal ? parseInt(batchTotal) : undefined
      } : null,
      storage_path: fileName,
      storage_bucket: bucketName,
      extracted_text: analysisText,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: document, error: dbError } = await supabase
      .from('insights_documents')
      .insert(documentData)
      .select()
      .single();

    if (dbError || !document) {
      logger.error('[ImageUpload] Failed to create document record:', dbError);
      return NextResponse.json({ 
        error: 'Failed to save document record' 
      }, { status: 500 });
    }



    // Create initial analysis record directly in database
    const analysisId = crypto.randomUUID();
    const analysisData = {
      id: analysisId,
      user_id: user.id,
      analysis_type: 'image_analysis',
      analysis_name: `Image Analysis: ${document.title}`,
      status: 'completed',
      insights: {
        vision_analysis: parsedAnalysis,
        business_insights: businessInsights,
        extracted_at: new Date().toISOString(),
        file_info: {
          name: file.name,
          type: file.type,
          size: file.size
        }
      },
      summary: businessInsights,
      key_metrics: {},
      confidence_score: 0.85,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    const { data: analysisResult, error: analysisError } = await supabase
      .from('insights_analysis_results')
      .insert(analysisData)
      .select()
      .single();

    if (analysisError) {
      logger.warn('[ImageUpload] Analysis save failed, but continuing...', analysisError);
      // Continue anyway, document is uploaded
    }

    logger.info(`[ImageUpload] Successfully processed image: ${document.id}`);

    return NextResponse.json({
      success: true,
      document,
      analysis: {
        vision_analysis: parsedAnalysis,
        business_insights: businessInsights
      }
    });

  } catch (error: any) {
    logger.error('[ImageUpload] Unexpected error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
} 