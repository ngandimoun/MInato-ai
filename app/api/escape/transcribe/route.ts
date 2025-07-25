import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { STTService } from '@/lib/providers/stt_service';

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

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';

    if (!audioFile) {
      return NextResponse.json({
        success: false,
        error: 'Audio file is required'
      }, { status: 400 });
    }

    // Validate audio file
    console.log(`🎤 [Transcribe API] Received audio file:`, {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size
    });

    // Check if file is actually an audio file
    if (!audioFile.type.startsWith('audio/')) {
      console.error(`🎤 [Transcribe API] Invalid file type: ${audioFile.type}`);
      return NextResponse.json({
        success: false,
        error: 'File must be an audio file'
      }, { status: 400 });
    }

    console.log(`🎤 [Transcribe API] Processing audio for user ${user.id} in language: ${language}`);

    try {
      // Use the STT service to handle audio transcription
      const sttService = new STTService();
      
      // Convert audio file to buffer
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      
      console.log(`🎤 [Transcribe API] Processing audio file:`, {
        name: audioFile.name,
        type: audioFile.type,
        size: audioFile.size
      });

      try {
        const transcriptionResult = await sttService.transcribeAudio(
          audioBuffer,
          language,
          undefined, // no prompt
          audioFile.type // pass the original mime type
        );

        // If transcription was successful
        if (transcriptionResult.text) {
          console.log(`✅ [Transcribe API] Successfully transcribed audio: "${transcriptionResult.text.substring(0, 50)}..."`);
          
          return NextResponse.json({
            success: true,
            transcript: transcriptionResult.text,
            language: transcriptionResult.language || language,
            duration: Math.round(audioFile.size / 16000) // Estimate duration in seconds (rounded)
          });
        }
      } catch (error: any) {
        console.log(`ℹ️ [Transcribe API] Transcription not available:`, error.message);
      }

      // If transcription failed or wasn't possible, return a response without transcript
      return NextResponse.json({
        success: true,
        transcript: null,
        language: language,
        duration: Math.round(audioFile.size / 16000) // Estimate duration in seconds (rounded)
      });

    } catch (transcriptionError: any) {
      console.error('Error during transcription:', transcriptionError);
      console.error('Error details:', {
        message: transcriptionError.message,
        status: transcriptionError.status,
        code: transcriptionError.code,
        type: transcriptionError.type,
        param: transcriptionError.param
      });
      
      return NextResponse.json({
        success: false,
        error: 'Failed to transcribe audio: ' + transcriptionError.message,
        details: {
          code: transcriptionError.code,
          param: transcriptionError.param,
          type: transcriptionError.type
        }
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('[Transcribe API] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process transcription: ' + error.message 
      },
      { status: 500 }
    );
  }
} 