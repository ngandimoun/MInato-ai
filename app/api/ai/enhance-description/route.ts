import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { generateVisionCompletion } from '@/lib/providers/llm_clients';
import type { ChatMessage } from '@/lib/types/index';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const cookieStore = cookies();
    const supabase = await createSupabaseRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      imageUrl, 
      currentText, 
      language, 
      analysisPrompt,
      platform,
      format,
      maxCharacters,
      platformData,
      formatData
    } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Create platform-specific analysis prompt
    let prompt = analysisPrompt || `Analyze this image and create compelling marketing copy for social media. Write as if you're trying to sell or promote the product/item in the image. Focus on benefits, emotions, and persuasive language that would work great for social media posts. Make it engaging, concise, and sales-oriented. Avoid literal descriptions - instead focus on the value proposition and appeal to emotions.`;
    
    // Add platform-specific constraints and instructions
    if (formatData && maxCharacters) {
      prompt += `\n\nIMPORTANT CONSTRAINTS:
- STRICT CHARACTER LIMIT: Keep the text under ${maxCharacters} characters for ${formatData.name}
- Platform: ${platformData?.name || 'Social Media'}
- Format: ${formatData.name} (${formatData.description})
- Aspect Ratio: ${formatData.aspectRatio}
- Recommended Duration: ~${formatData.recommendedDuration} seconds
- Platform-specific guidance: ${formatData.promptModifier}

CRITICAL: The output text MUST be concise enough to fit within ${maxCharacters} characters while maintaining impact and engagement. Prioritize punchy, memorable phrases over lengthy descriptions.`;
    }

    // Add language instruction
    if (language && language !== 'en') {
      prompt += `\n\nVERY IMPORTANT: Write the entire response in ${getLanguageName(language)}. Do not use English or any other language.`;
    }

    // Prepare vision messages
    const visionMessages: ChatMessage[] = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { 
          type: 'input_image', 
          image_url: imageUrl,
          detail: 'high'
        }
      ],
    }];

    // Generate vision analysis with appropriate token limit based on character constraints
    const tokenLimit = maxCharacters ? Math.min(800, Math.max(200, maxCharacters * 2)) : 800;
    const visionResult = await generateVisionCompletion(
      visionMessages,
      'gpt-4o-2024-08-06',
      tokenLimit,
      user.id
    );

    if (visionResult.error || !visionResult.text) {
      return NextResponse.json({
        success: false,
        error: visionResult.error || 'Failed to analyze image'
      }, { status: 500 });
    }

    let enhancedText = visionResult.text.trim();
    
    // Validate character limit and truncate if necessary
    if (maxCharacters && enhancedText.length > maxCharacters) {
      console.log(`Text exceeded ${maxCharacters} characters (${enhancedText.length}), truncating...`);
      enhancedText = enhancedText.substring(0, maxCharacters - 3) + '...';
    }

    return NextResponse.json({
      success: true,
      enhancedText: enhancedText,
      originalText: currentText,
      characterCount: enhancedText.length,
      characterLimit: maxCharacters,
      platform: platform,
      format: format,
      formatInfo: formatData
    });

  } catch (error) {
    console.error('Enhancement API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to enhance description'
    }, { status: 500 });
  }
} 

// Helper function to get language name from code
function getLanguageName(code: string): string {
  const languages: {[key: string]: string} = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi'
  };
  
  return languages[code] || 'the specified language';
} 