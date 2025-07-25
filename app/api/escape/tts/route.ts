import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { rawOpenAiClient as openai } from '@/lib/providers/llm_clients';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'User not authenticated'
      }, { status: 401 });
    }

    const { text, language = 'en', voice = 'nova', speed = 1.0 } = await request.json();

    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'Text is required'
      }, { status: 400 });
    }

    console.log(`🔊 [TTS API] Generating speech for user ${user.id} in language: ${language}`);

    try {
      // Generate speech using gpt-4o-mini-tts
      const mp3 = await openai.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice: voice as any, // nova, alloy, echo, fable, onyx, shimmer
        input: text,
        speed: speed,
        response_format: 'mp3'
      });

      // Convert to buffer
      const buffer = Buffer.from(await mp3.arrayBuffer());

      // Upload to Supabase storage
      const fileName = `tts_${user.id}_${Date.now()}.mp3`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ttsaudio')
        .upload(fileName, buffer, {
          contentType: 'audio/mpeg',
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Error uploading TTS audio:', uploadError);
        return NextResponse.json({
          success: false,
          error: 'Failed to upload audio file'
        }, { status: 500 });
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ttsaudio')
        .getPublicUrl(fileName);

      console.log(`✅ [TTS API] Successfully generated speech: ${fileName}`);

      return NextResponse.json({
        success: true,
        audioUrl: publicUrl,
        fileName: fileName,
        language: language,
        voice: voice,
        textLength: text.length
      });

    } catch (ttsError: any) {
      console.error('Error during TTS generation:', ttsError);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate speech: ' + ttsError.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[TTS API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process TTS request: ' + error.message 
      },
      { status: 500 }
    );
  }
} 